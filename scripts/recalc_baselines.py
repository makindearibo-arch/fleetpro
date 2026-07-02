#!/usr/bin/env python
r"""
FleetPro: Transfer-aware baseline recalculation for ALL generators.

Replaces the per-import --recalc-baseline runs. For every generator
(asset_type != 'oven') it walks readings chronologically and computes
litres-per-hour pairs as:

    actual_consumption = prev_level + diesel_added - transfers_out - level
    rate = actual_consumption / hours_run        (kept when 1..100 L/hr)

Transfers out (recorded in diesel_transfers, including the back-filled
historical ones) are no longer counted as generator consumption — this is
what fixes the inflated baselines at Akure 1, Ado 1 and the bakeries.

Usage:
  py scripts\recalc_baselines.py            # dry run (shows old vs new)
  py scripts\recalc_baselines.py --apply     # upsert new baselines

After applying, run backfill_discrepancy_flags.py --apply to re-score
history against the corrected baselines.
"""
import json
import os
import sys
import datetime
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


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


def main(apply_mode):
    load_env_file()
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required.")
        sys.exit(1)
    sb = Supabase(url, key)

    gens = sb.select_all("generators", "id,name,loc,asset_type")
    baselines = {b["generator_id"]: b for b in sb.select_all("generator_baselines", "*")}
    transfers = sb.select_all("diesel_transfers", "date,source_generator_id,litres")
    tr_map = {}
    for t in transfers:
        if t.get("source_generator_id"):
            k = (t["source_generator_id"], t["date"])
            tr_map[k] = tr_map.get(k, 0) + (t.get("litres") or 0)
    print(f"Generators: {len(gens)} | transfers loaded: {len(transfers)}\n")

    updates = []
    print(f"  {'Generator':<30} {'old L/hr':>9} {'new L/hr':>9}  pairs  ~flag%")
    for g in gens:
        if g.get("asset_type") == "oven":
            continue
        rows = sb.select_all("diesel_readings",
                             "date,gen_hours_opening,gen_hours_closing,diesel_level_actual,diesel_added",
                             filters={"generator_id": f"eq.{g['id']}"}, order="date.asc")
        # POOLED AGGREGATE estimator: avg = sum(actual litres) / sum(hours) over
        # consecutive-day pairs — NOT the mean of per-day rates. Stores whose
        # dipstick only resolves ~35-40 L steps (e.g. Ado 1) read "0 consumed"
        # for days, then several days' burn lands on one short-hours day; the
        # mean of those daily rates is inflated (Ado 1: 16.2 vs true 9.8), while
        # pooling litres and hours is immune to that quantization.
        #
        # Two passes. Pass 1: provisional rate r0 = mean of positive per-pair
        # rates (the old estimator). Pass 2: pool litres+hours, where a ZERO-
        # drop day's hours only join the denominator if its expected burn
        # (hrs x r0) could plausibly hide below stick resolution (~40 L).
        # Without that test, stores with unreliable meters (Akure 1/6: 10+ h
        # logged with zero level change — physically impossible) pool huge
        # hours against no litres and collapse to ~0 L/hr.
        RESOLUTION_L = 40.0
        pairs = []   # (actual, hrs) for valid consecutive pairs
        prev = None
        prev_date = None
        for r in rows:
            ho, hc, lvl = r.get("gen_hours_opening"), r.get("gen_hours_closing"), r.get("diesel_level_actual")
            added = r.get("diesel_added") or 0
            tr = tr_map.get((g["id"], r["date"]), 0)
            hrs = (hc - ho) if (ho is not None and hc is not None) else None
            cur_date = datetime.date.fromisoformat(r["date"]) if r.get("date") else None
            # Only trust a level-delta when the previous reading is the day
            # before: a multi-day logging gap lumps several days' consumption
            # against one day's hours (a 50 L/hr phantom). Skip those pairs.
            consecutive = (prev_date is not None and cur_date is not None
                           and (cur_date - prev_date).days == 1)
            if hrs is not None and hrs > 0 and lvl is not None and prev is not None and consecutive:
                actual = prev + added - tr - lvl
                # Guards: negative actual = an unlogged refill; >100 L/hr = a
                # data error. Both excluded entirely.
                if actual >= 0 and actual / hrs <= 100:
                    pairs.append((actual, hrs))
            if lvl is not None:
                prev = lvl
                prev_date = cur_date
        rates = [a / h for a, h in pairs if a > 0 and 1 <= a / h <= 100]
        if not rates:
            continue
        r0 = sum(rates) / len(rates)
        sum_a = sum_h = 0.0
        npairs = 0
        for a, h in pairs:
            if a > 0 or (h * r0) <= RESOLUTION_L:
                sum_a += a
                sum_h += h
                npairs += 1
        if sum_h <= 0 or sum_a <= 0:
            continue
        avg = sum_a / sum_h
        # Sanity bound: when the pooled rate contradicts the positive-pair mean
        # by more than half (or is sub-1 L/hr), the store's level-vs-hours data
        # is internally inconsistent (Akure 1/6: real drops logged against
        # impossible 0.3 h, so they're excluded as errors and only phantom
        # zero-days pool — collapsing to ~0). Fall back to the mean of the
        # plausible positive rates rather than publishing a nonsense baseline.
        if avg < 1.0 or avg < 0.5 * r0:
            avg = r0
            npairs = len(rates)
        flagged = (sum(1 for x in rates if abs(x - avg) / avg > 0.20) / len(rates) * 100) if rates else 0.0
        old = baselines.get(g["id"], {}).get("avg_litres_per_hour")
        print(f"  {g['name']:<30} {old if old is not None else '-':>9} {avg:>9.2f}  {npairs:>5}  {flagged:>5.1f}%")
        updates.append({"generator_id": g["id"], "avg_litres_per_hour": round(avg, 2),
                        "baseline_readings_count": npairs,
                        "last_calculated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                        "min_rate": round(min(rates), 2) if rates else None,
                        "max_rate": round(max(rates), 2) if rates else None})

    if not apply_mode:
        print(f"\nDRY RUN — {len(updates)} baselines would be upserted. Re-run with --apply.")
        return

    for u in updates:
        sb._req("POST", "generator_baselines", params={"on_conflict": "generator_id"}, body=[u],
                extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"})
    print(f"\nUpserted {len(updates)} baselines.")
    print("Now run: py scripts\\backfill_discrepancy_flags.py --apply")


if __name__ == "__main__":
    main("--apply" in sys.argv)
