#!/usr/bin/env python
r"""
FleetPro: Audit generators vs locations.

Read-only. Lists every generator (id, name, loc, status), every location,
and which locations have NO generator assigned. Helps spot stores that are
missing a generator row.

Usage:
  py scripts\audit_generators.py

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


def get(url, key, table, params):
    full = f"{url.rstrip('/')}/rest/v1/{table}?" + urllib.parse.urlencode(params, doseq=True)
    req = urllib.request.Request(full, headers={"apikey": key, "Authorization": f"Bearer {key}"})
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else []
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code} {table}: {e.read().decode('utf-8','replace')}") from e


def main():
    load_env_file()
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required.")
        sys.exit(1)

    gens = get(url, key, "generators", {"select": "id,name,loc,status", "order": "name.asc"})
    locs = get(url, key, "locations", {"select": "name", "order": "name.asc"})

    # readings count per generator
    readings = get(url, key, "diesel_readings", {"select": "generator_id"})
    rcount = {}
    for r in readings:
        rcount[r["generator_id"]] = rcount.get(r["generator_id"], 0) + 1

    print(f"=== GENERATORS ({len(gens)}) ===")
    for g in gens:
        loc = g.get("loc") or "(none)"
        print(f"  {g['name']:<28} id={g['id']:<38} loc={loc:<24} status={g.get('status') or '-':<14} readings={rcount.get(g['id'],0)}")

    gen_locs = {(g.get("loc") or "").strip().lower() for g in gens if g.get("loc")}
    loc_names = [l["name"] for l in locs]

    print(f"\n=== LOCATIONS ({len(loc_names)}) ===")
    missing = []
    for ln in loc_names:
        has = ln.strip().lower() in gen_locs
        mark = "OK " if has else "-- NO GENERATOR"
        if not has:
            missing.append(ln)
        print(f"  [{mark}] {ln}")

    print(f"\n=== SUMMARY ===")
    print(f"  Generators: {len(gens)}")
    print(f"  Locations:  {len(loc_names)}")
    print(f"  Locations WITHOUT a generator ({len(missing)}):")
    for m in missing:
        print(f"     - {m}")


if __name__ == "__main__":
    main()
