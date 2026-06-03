#!/usr/bin/env python
r"""
FleetPro: Delete junk/empty diesel_readings.

Some imports pulled in blank template rows (gen-open = 0, no closing
tank, no closing gen hours) that only carried a stale NEPA meter value.
A real completed reading always has EITHER a closing tank level OR a
closing generator-hours value. This deletes readings that have neither
(diesel_level_actual IS NULL AND gen_hours_closing IS NULL).

Usage:
  py scripts\cleanup_empty_readings.py            # dry run (lists what would delete)
  py scripts\cleanup_empty_readings.py --apply     # delete them

Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env / SupabaseCreds.env / env.
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


def main(apply_mode):
    load_env_file()
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required.")
        sys.exit(1)
    sb = Supabase(url, key)

    # Readings with NO closing tank AND NO closing gen hours = not a real completed day
    rows = sb._req("GET", "diesel_readings", params={
        "select": "id,date,store_location,generator_id,diesel_level_actual,gen_hours_closing,diesel_added,consumption_litres",
        "diesel_level_actual": "is.null",
        "gen_hours_closing": "is.null",
        "order": "store_location.asc,date.asc",
        "limit": "5000",
    })
    # Extra safety: also require no diesel added and no real consumption recorded
    junk = [r for r in rows if not r.get("diesel_added") and not r.get("consumption_litres")]

    if not junk:
        print("No empty/junk readings found. Nothing to clean up.")
        return

    print(f"=== EMPTY READINGS TO DELETE ({len(junk)}) ===")
    by_store = {}
    for r in junk:
        by_store.setdefault(r["store_location"], []).append(r["date"])
    for store, dates in sorted(by_store.items()):
        dates.sort()
        print(f"  {store:<26} {len(dates):>3} rows   {dates[0]} .. {dates[-1]}")

    if not apply_mode:
        print("\nDRY RUN — no deletes. Re-run with --apply to delete these rows.")
        return

    print("\n=== DELETING ===")
    ids = [r["id"] for r in junk]
    BATCH = 50
    deleted = 0
    for i in range(0, len(ids), BATCH):
        chunk = ids[i:i + BATCH]
        # PostgREST in.() filter
        inlist = "(" + ",".join(str(x) for x in chunk) + ")"
        sb._req("DELETE", "diesel_readings", params={"id": f"in.{inlist}"})
        deleted += len(chunk)
    print(f"  Deleted {deleted} empty readings.")
    print("\nDONE. Re-run generator-hours sync if needed.")


if __name__ == "__main__":
    main("--apply" in sys.argv)
