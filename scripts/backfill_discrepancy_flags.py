#!/usr/bin/env python
r"""
FleetPro: Back-fill discrepancy flags on historical diesel_readings.

The app only evaluates discrepancies at save time, so the ~1,200 imported
historical readings all have discrepancy_flag=false and discrepancy_litres
null. This script replays the app's exact save-time check against each
generator's CURRENT learned baseline:

    theoretical    = hours_run x baseline_rate
    expected_level = prev_level + diesel_added - theoretical
    discrepancy    = actual_level - expected_level
    flag           = |discrepancy| / theoretical > threshold (default 20%)

Only rows that CAN be evaluated are touched (needs: a learned baseline,
hours_run > 0, an actual level, and a previous reading with a level).
Rows that can't be evaluated keep flag=false / litres=null.

NOTE: Akure 1 will flag heavily — its baseline is inflated by untracked
vehicle transfers (see CLAUDE.md). Those flags are "true to the data" and
will calm down once the vehicle-transfer feature lands and it re-baselines.

Usage:
  py scripts\backfill_discrepancy_flags.py            # dry run (summary only)
  py scripts\backfill_discrepancy_flags.py --apply     # write flags

Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env / SupabaseCreds.env / env.
"""
import json
import os
import itertools
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

DEFAULT_THRESHOLD_PCT = 20.0
# Min-GAP floor: only flag when the discrepancy ITSELF exceeds ~25 L. Below a
# dipstick's resolution a gap is measurement noise. Keying off the gap (not the
# expected burn) fixes the case where a short run with a large actual drop was
# wrongly suppressed while a smaller gap flagged. Must match App.jsx handleSave.
MIN_DISCREPANCY_L = 25.0


def load_env_file():
    for name in (".env", "SupabaseCreds.env", "supabase.env"):
        p = Path(name)
        if not p.exists():
            continue
        for line in p.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
        return


class Supabase:
    def __init__(self, url, key):
        self.url = url.rstrip("/")
        self.headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}

    def _req(self, method, path, params=None, body=None, extra_headers=None):
        full = f"{self.url}/rest/v1/{path}"
        if params:
            full += "?" + urllib.parse.urlencode(params, doseq=True)
        data = json.dumps(body).encode("utf-8") if body is not None else None
        headers = dict(self.headers)
        if extra_headers:
            headers.update(extra_headers)
        req = urllib.request.Request(full, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req) as resp:
                raw = resp.read()
                return json.loads(raw) if raw else []
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"HTTP {e.code} {method} {path}: {e.read().decode('utf-8','replace')}") from e

    def select_all(self, table, columns, filters=None, order=None, page=1000):
        """Paginated fetch — PostgREST caps responses (default 1000 rows)."""
        out = []
        offset = 0
        while True:
            params = {"select": columns, "limit": str(page), "offset": str(offset)}
            if filters:
                params.update(filters)
            if order:
                params["order"] = order
            chunk = self._req("GET", table, params=params)
            out.extend(chunk)
            if len(chunk) < page:
                return out
            offset += page

    def patch(self, table, id_val, body):
        return self._req("PATCH", table, params={"id": f"eq.{id_val}"}, body=body,
                         extra_headers={"Prefer": "return=minimal"})


def tank_key_fn(gens):
    """ONE TANK PER STORE FOR ITS GENERATORS -- the same rule as App.jsx
    tankKeyFn (2026-10-29): all the generators at a store draw from one tank
    (Ikare CR switches between two; Akure 1 runs two and logs both daily), an
    oven has its own, and a transfer saved without a source came out of the
    store's generator tank (at an oven-only store, its oven)."""
    by_id = {g["id"]: g for g in gens}

    def tank_of(gid, store):
        g = by_id.get(gid) if gid else None
        if g:
            return gid if g.get("asset_type") == "oven" else "gens:" + (store or g.get("loc") or "")
        if gid:
            return gid   # an asset no longer on file keeps its own tank
        at = [x for x in gens if x.get("loc") == store]
        return at[0]["id"] if len(at) == 1 and at[0].get("asset_type") == "oven" else "gens:" + (store or "")
    return tank_of


def connect():
    load_env_file()
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required.")
        sys.exit(1)
    return Supabase(url, key)


def compute(sb, rates=None):
    """Re-score every reading WITHOUT writing anything. Returns a list of
    (reading_id, new_litres, new_flag, old_litres, old_flag, store, date) for the rows whose
    stored values differ. `rates` ({generator_id: L/hr}) scores against
    PROPOSED baselines instead of the stored ones, so a baseline change can be
    previewed before it is written (monthly_baseline_refresh.py does this)."""
    gen_list = sb.select_all("generators", "id,name,loc,asset_type")
    gens = {g["id"]: g for g in gen_list}
    baselines = {b["generator_id"]: b for b in sb.select_all("generator_baselines", "*")}
    for gid, rate in (rates or {}).items():
        baselines[gid] = {**baselines.get(gid, {}), "generator_id": gid, "avg_litres_per_hour": rate}
    with_baseline = [gid for gid in gens if baselines.get(gid, {}).get("avg_litres_per_hour")]
    tank_of = tank_key_fn(gen_list)
    # Transfers out per (TANK, date) — moved diesel is not generator consumption
    transfers = sb.select_all("diesel_transfers", "date,store_location,source_generator_id,litres")
    tr_map = {}
    for t in transfers:
        k = (tank_of(t.get("source_generator_id"), t.get("store_location")), t["date"])
        tr_map[k] = tr_map.get(k, 0) + (t.get("litres") or 0)
    print(f"=== SETUP ===")
    print(f"  Generators: {len(gens)}, with learned baseline: {len(with_baseline)}, transfers loaded: {len(transfers)}")

    total_eval = total_flag = total_change = 0
    updates = []  # (id, litres, flag)
    per_store = {}

    def rate_of(gid):
        b = baselines.get(gid, {}).get("avg_litres_per_hour")
        return float(b) if b else None

    # Walk each TANK a day at a time (a store's generators share one, see
    # tank_key_fn). One reading that day: the app's save-time check. Two of the
    # store's generators logged that day: judge the DAY -- the tank before it +
    # everything received - everything moved out - both generators' expected
    # burn -- share the gap between the readings by expected burn, and flag the
    # day ONCE, on the generator that should have burned most (App.jsx handleSave).
    rows = sb.select_all(
        "diesel_readings",
        "id,generator_id,date,created_at,store_location,gen_hours_opening,gen_hours_closing,diesel_level_actual,diesel_added,discrepancy_litres,discrepancy_flag",
        order="date.asc,created_at.asc,id.asc",
    )
    tanks = {}
    for r in rows:
        if (gens.get(r["generator_id"]) or {}).get("asset_type") == "oven" or not r.get("date"):
            continue   # ovens are judged per batch, not flagged here
        tanks.setdefault(tank_of(r["generator_id"], r.get("store_location")), []).append(r)
    for key, arr in tanks.items():
        prev_level = None
        g_eval = g_flag = 0
        store = arr[0].get("store_location") or "?"
        for date, rs in itertools.groupby(arr, key=lambda r: r["date"]):
            rs = list(rs)
            levels = [r["diesel_level_actual"] for r in rs if r.get("diesel_level_actual") is not None]
            close = levels[-1] if levels else None
            parts = []   # (reading, expected burn)
            known = True
            for r in rs:
                ho, hc = r.get("gen_hours_opening"), r.get("gen_hours_closing")
                hrs = (hc - ho) if (ho is not None and hc is not None) else None
                rate = rate_of(r["generator_id"])
                if hrs and hrs > 0 and not rate:
                    known = False   # ran, but no learned baseline: can't be judged
                parts.append((r, hrs * rate if (hrs and hrs > 0 and rate) else 0.0))
            day_theo = sum(th for _, th in parts)
            if known and close is not None and prev_level is not None and day_theo > 0:
                added = sum(r.get("diesel_added") or 0 for r in rs)
                tr = tr_map.get((key, date), 0)
                disc = close - (prev_level + added - tr - day_theo)
                pct = abs(disc) / day_theo * 100
                # Min-GAP floor: only flag when the discrepancy itself is
                # above dipstick resolution (~25 L). Keying off the gap (not
                # the expected burn) means a short run with a large actual
                # drop is no longer suppressed while a smaller gap flags
                # (Ado 1 Jul 6: used 41 vs expected 22, gap 20 L, was hidden
                # because expected < 25 while Jul 4's gap of 9 L flagged).
                day_flag = pct > DEFAULT_THRESHOLD_PCT and abs(disc) >= MIN_DISCREPANCY_L
                lead = max(reversed(parts), key=lambda x: x[1])[0]   # ties: the last saved, as the app
                g_eval += 1
                if day_flag:
                    g_flag += 1
                for r, th in parts:
                    new_litres = round(disc * th / day_theo) if th > 0 else None
                    flag = day_flag and r is lead
                    old_litres = r.get("discrepancy_litres")
                    old_flag = bool(r.get("discrepancy_flag"))
                    if old_flag != flag or old_litres != new_litres:
                        updates.append((r["id"], new_litres, flag, old_litres, old_flag, r.get("store_location"), r["date"]))
            if close is not None:
                prev_level = close
        total_eval += g_eval
        total_flag += g_flag
        s = per_store.setdefault(store, {"eval": 0, "flag": 0})
        s["eval"] += g_eval
        s["flag"] += g_flag
        names = sorted({(gens.get(r["generator_id"]) or {}).get("name") or r["generator_id"] for r in arr})
        if g_eval:
            print(f"  {' + '.join(names)[:48]:<48} evaluated={g_eval:>4}  flagged={g_flag:>4}")

    total_change = len(updates)
    print(f"\n=== SUMMARY ===")
    print(f"  Evaluated: {total_eval}   Flagged: {total_flag} ({(total_flag/total_eval*100) if total_eval else 0:.1f}%)   Rows to update: {total_change}")
    print(f"\n  Per store:")
    for store, s in sorted(per_store.items()):
        pct = (s["flag"] / s["eval"] * 100) if s["eval"] else 0
        print(f"    {store:<26} evaluated={s['eval']:>4}  flagged={s['flag']:>4}  ({pct:.0f}%)")

    return updates


def write(sb, updates):
    total_change = len(updates)
    print(f"\n=== WRITING {total_change} updates ===")
    done = 0
    for rid, litres, flag, *_ in updates:
        sb.patch("diesel_readings", rid, {"discrepancy_litres": litres, "discrepancy_flag": flag})
        done += 1
        if done % 100 == 0:
            print(f"  ...{done}/{total_change}")
    print(f"  Updated {done} readings.")


def main(apply_mode):
    sb = connect()
    updates = compute(sb)
    if not apply_mode:
        print("\nDRY RUN — no writes. Re-run with --apply to write flags.")
        return
    write(sb, updates)
    print("\nDONE. The Discrepancies tab and Watchtower will now reflect history.")


if __name__ == "__main__":
    main("--apply" in sys.argv)
