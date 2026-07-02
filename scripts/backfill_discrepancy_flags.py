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
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

DEFAULT_THRESHOLD_PCT = 20.0
# Don't flag days whose expected burn is below dipstick resolution (~25 L):
# a tank stick can't show a 12 L change, so tiny-run days always look "off".
# Must match the same floor in App.jsx handleSave.
MIN_THEORETICAL_L = 25.0


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


def main(apply_mode):
    load_env_file()
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required.")
        sys.exit(1)
    sb = Supabase(url, key)

    gens = {g["id"]: g for g in sb.select_all("generators", "id,name,loc")}
    baselines = {b["generator_id"]: b for b in sb.select_all("generator_baselines", "*")}
    with_baseline = [gid for gid in gens if baselines.get(gid, {}).get("avg_litres_per_hour")]
    # Transfers out per (generator, date) — moved diesel is not generator consumption
    transfers = sb.select_all("diesel_transfers", "date,source_generator_id,litres")
    tr_map = {}
    for t in transfers:
        if t.get("source_generator_id"):
            k = (t["source_generator_id"], t["date"])
            tr_map[k] = tr_map.get(k, 0) + (t.get("litres") or 0)
    print(f"=== SETUP ===")
    print(f"  Generators: {len(gens)}, with learned baseline: {len(with_baseline)}, transfers loaded: {len(transfers)}")

    total_eval = total_flag = total_change = 0
    updates = []  # (id, litres, flag)
    per_store = {}

    for gid in with_baseline:
        bl = baselines[gid]
        rate = float(bl["avg_litres_per_hour"])
        threshold = float(bl.get("threshold_pct") or DEFAULT_THRESHOLD_PCT)
        rows = sb.select_all(
            "diesel_readings",
            "id,date,store_location,gen_hours_opening,gen_hours_closing,diesel_level_actual,diesel_added,discrepancy_litres,discrepancy_flag",
            filters={"generator_id": f"eq.{gid}"},
            order="date.asc",
        )
        prev_level = None
        g_eval = g_flag = 0
        for r in rows:
            actual = r.get("diesel_level_actual")
            ho, hc = r.get("gen_hours_opening"), r.get("gen_hours_closing")
            hrs = (hc - ho) if (ho is not None and hc is not None) else None
            added = r.get("diesel_added") or 0
            if hrs and hrs > 0 and actual is not None and prev_level is not None:
                theoretical = hrs * rate
                if theoretical > 0:
                    tr = tr_map.get((gid, r["date"]), 0)
                    expected = prev_level + added - tr - theoretical
                    disc = actual - expected
                    pct = abs(disc) / theoretical * 100
                    # Min-burn floor: when the expected burn is below what a
                    # dipstick can resolve (~a few cm), a "discrepancy" is
                    # measurement noise, not signal — e.g. Ado 1 runs <1.5 h/day
                    # (expected ~12 L) on a stick that reads in ~40 L steps, so
                    # every short-run day flagged. Only flag meaningful burns.
                    flag = pct > threshold and theoretical >= MIN_THEORETICAL_L
                    g_eval += 1
                    if flag:
                        g_flag += 1
                    new_litres = round(disc)
                    old_litres = r.get("discrepancy_litres")
                    old_flag = bool(r.get("discrepancy_flag"))
                    if old_flag != flag or old_litres != new_litres:
                        updates.append((r["id"], new_litres, flag))
            if actual is not None:
                prev_level = actual
        total_eval += g_eval
        total_flag += g_flag
        store = gens[gid].get("loc") or "?"
        s = per_store.setdefault(store, {"eval": 0, "flag": 0})
        s["eval"] += g_eval
        s["flag"] += g_flag
        print(f"  {gens[gid]['name']:<30} rate={rate:>6.2f} thr={threshold:.0f}%  evaluated={g_eval:>4}  flagged={g_flag:>4}")

    total_change = len(updates)
    print(f"\n=== SUMMARY ===")
    print(f"  Evaluated: {total_eval}   Flagged: {total_flag} ({(total_flag/total_eval*100) if total_eval else 0:.1f}%)   Rows to update: {total_change}")
    print(f"\n  Per store:")
    for store, s in sorted(per_store.items()):
        pct = (s["flag"] / s["eval"] * 100) if s["eval"] else 0
        print(f"    {store:<26} evaluated={s['eval']:>4}  flagged={s['flag']:>4}  ({pct:.0f}%)")

    if not apply_mode:
        print("\nDRY RUN — no writes. Re-run with --apply to write flags.")
        return

    print(f"\n=== WRITING {total_change} updates ===")
    done = 0
    for rid, litres, flag in updates:
        sb.patch("diesel_readings", rid, {"discrepancy_litres": litres, "discrepancy_flag": flag})
        done += 1
        if done % 100 == 0:
            print(f"  ...{done}/{total_change}")
    print(f"  Updated {done} readings.")
    print("\nDONE. The Discrepancies tab and Watchtower will now reflect history.")


if __name__ == "__main__":
    main("--apply" in sys.argv)
