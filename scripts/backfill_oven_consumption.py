#!/usr/bin/env python
r"""
FleetPro: Back-fill consumption_litres / consumption_rate on OVEN readings.

App-entered oven readings never got a consumption figure: the save code
modelled consumption as hours x rate (a generator concept), but ovens have no
hour meter, so consumption_litres came out NULL and consumption_rate stored a
bogus 15 L/hr fallback. The Diesel Management "Readings" table then showed "-"
for consumption on every recent bakery oven row (e.g. Okitipupa Bakery July).

An oven's consumption is the measured tank drop:
    consumption = prev_level + diesel_added - current_level   (clamped >= 0)
and its rate is L/BATCH:
    rate = consumption / batches_produced

This walks each oven's readings in date order and fills any row whose
consumption_litres is NULL (only those — imported rows already have it), using
the previous reading's level as the opening. Rows with no usable previous
level (the very first reading) are left NULL. Idempotent.

Usage:
  py scripts\backfill_oven_consumption.py            # dry run
  py scripts\backfill_oven_consumption.py --apply
"""
import json
import os
import sys
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

    def select_all(self, table, columns, filters=None):
        out = []
        offset = 0
        while True:
            params = {"select": columns, "limit": "1000", "offset": str(offset)}
            if filters:
                params.update(filters)
            chunk = self._req("GET", table, params=params)
            out.extend(chunk)
            if len(chunk) < 1000:
                return out
            offset += 1000

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

    ovens = [g for g in sb.select_all("generators", "id,name") if True
             and g["id"] in {x["id"] for x in sb.select_all("generators", "id,asset_type",
                                                             filters={"asset_type": "eq.oven"})}]
    print(f"Ovens: {len(ovens)}")
    updates = []
    for g in sorted(ovens, key=lambda x: x["name"]):
        rows = sb.select_all("diesel_readings",
                             "id,date,diesel_level_actual,diesel_added,consumption_litres,consumption_rate,batches_produced",
                             filters={"generator_id": f"eq.{g['id']}", "order": "date.asc,id.asc"})
        prev_level = None
        fixed = 0
        for r in rows:
            lvl = r.get("diesel_level_actual")
            added = r.get("diesel_added") or 0
            if r.get("consumption_litres") is None and lvl is not None and prev_level is not None:
                cons = max(0, round(prev_level + added - lvl))
                batches = r.get("batches_produced")
                rate = round(cons / batches, 2) if (batches and batches > 0) else None
                updates.append((r["id"], cons, rate))
                fixed += 1
            if lvl is not None:
                prev_level = lvl
        if fixed:
            print(f"  {g['name']:<26} fill {fixed} rows")

    print(f"\nTotal rows to fill: {len(updates)}")
    if not apply_mode:
        for rid, cons, rate in updates[:8]:
            print(f"  {rid[:8]}  cons={cons}  L/batch={rate}")
        print("\nDRY RUN — no writes. Re-run with --apply.")
        return

    for i, (rid, cons, rate) in enumerate(updates, 1):
        sb.patch("diesel_readings", rid, {"consumption_litres": cons, "consumption_rate": rate})
        if i % 50 == 0:
            print(f"  ...{i}/{len(updates)}")
    print(f"Updated {len(updates)} oven readings.")


if __name__ == "__main__":
    main("--apply" in sys.argv)
