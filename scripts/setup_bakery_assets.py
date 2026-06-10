#!/usr/bin/env python
r"""
FleetPro: One-time bakery asset setup (ovens + generators).

Per the ground truth from the user:
  - Akure / Ado / Ikare / Okitipupa Bakery have ONLY ovens (no generator).
    The earlier setup run created placeholder '{Loc} Generator' rows for
    them — those are CONVERTED to '{Loc} Oven' (asset_type='oven') as long
    as they have zero readings.
  - Ondo / Owo / Oye Bakery have BOTH a generator and an oven. Their
    generator rows stay; a new '{Loc} Oven' row is created.

Idempotent: skips conversions/creates that already happened. Dry-run default.

Usage:
  py scripts\setup_bakery_assets.py            # dry run
  py scripts\setup_bakery_assets.py --apply     # execute

Requires the 20260610_ovens_and_batches.sql migration to be run first
(adds generators.asset_type + diesel_readings.batches_produced).
"""
import json
import os
import sys
import uuid
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

OVEN_ONLY_STORES = ["Akure Bakery", "Ado Bakery", "Ikare Bakery", "Okitipupa Bakery"]
OVEN_PLUS_GEN_STORES = ["Ondo Bakery", "Owo Bakery", "Oye Bakery"]


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

    def select(self, table, columns="*", filters=None):
        params = {"select": columns}
        if filters:
            params.update(filters)
        return self._req("GET", table, params=params)

    def insert(self, table, rows):
        return self._req("POST", table, body=rows, extra_headers={"Prefer": "return=representation"})

    def update(self, table, id_val, patch):
        return self._req("PATCH", table, params={"id": f"eq.{id_val}"}, body=patch,
                         extra_headers={"Prefer": "return=representation"})


def main(apply_mode):
    load_env_file()
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required.")
        sys.exit(1)
    sb = Supabase(url, key)

    gens = sb.select("generators", columns="id,name,loc,asset_type")
    readings = sb.select("diesel_readings", columns="generator_id")
    rcount = {}
    for r in readings:
        rcount[r["generator_id"]] = rcount.get(r["generator_id"], 0) + 1

    def at_loc(loc):
        return [g for g in gens if (g.get("loc") or "").strip().lower() == loc.lower()]

    conversions, creations, skips = [], [], []

    # 1. Oven-only stores: convert placeholder generator -> oven
    for loc in OVEN_ONLY_STORES:
        rows = at_loc(loc)
        oven = next((g for g in rows if g.get("asset_type") == "oven" or "oven" in (g["name"] or "").lower()), None)
        if oven:
            skips.append(f"{loc}: oven already exists ({oven['name']})")
            continue
        cand = next((g for g in rows if rcount.get(g["id"], 0) == 0), None)
        if cand:
            conversions.append((cand["id"], cand["name"], f"{loc} Oven", loc))
        else:
            creations.append({"id": str(uuid.uuid4()), "name": f"{loc} Oven", "loc": loc,
                              "status": "Active", "hrs": 0, "asset_type": "oven"})

    # 2. Oven+gen stores: keep generator, create oven
    for loc in OVEN_PLUS_GEN_STORES:
        rows = at_loc(loc)
        oven = next((g for g in rows if g.get("asset_type") == "oven" or "oven" in (g["name"] or "").lower()), None)
        gen = next((g for g in rows if g.get("asset_type") != "oven" and "oven" not in (g["name"] or "").lower()), None)
        if not gen:
            creations.append({"id": str(uuid.uuid4()), "name": f"{loc} Generator", "loc": loc,
                              "status": "Active", "hrs": 0, "asset_type": "generator"})
        if oven:
            skips.append(f"{loc}: oven already exists ({oven['name']})")
        else:
            creations.append({"id": str(uuid.uuid4()), "name": f"{loc} Oven", "loc": loc,
                              "status": "Active", "hrs": 0, "asset_type": "oven"})

    print("=== PLAN ===")
    print("Conversions (placeholder generator -> oven):")
    for gid, old, new, loc in conversions:
        print(f"  {old!r} ({gid}) -> {new!r}  asset_type=oven")
    if not conversions:
        print("  (none)")
    print("Creations:")
    for c in creations:
        print(f"  + {c['name']!r}  loc={c['loc']}  type={c['asset_type']}")
    if not creations:
        print("  (none)")
    print("Skipped (already done):")
    for s in skips:
        print(f"  = {s}")

    if not apply_mode:
        print("\nDRY RUN — no writes. Re-run with --apply to execute.")
        return

    print("\n=== APPLYING ===")
    for gid, old, new, loc in conversions:
        sb.update("generators", gid, {"name": new, "asset_type": "oven"})
        print(f"  Converted {old!r} -> {new!r}")
    if creations:
        sb.insert("generators", creations)
        print(f"  Created {len(creations)} assets")
    print("\nDONE.")


if __name__ == "__main__":
    main("--apply" in sys.argv)
