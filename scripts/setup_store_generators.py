#!/usr/bin/env python
r"""
FleetPro: One-time generator cleanup + creation.

1. Assign 'Okitipupa 2nd Generator' (G-010) to loc 'Okitipupa CR'.
2. Rename inconsistent ALL-CAPS generators to '{Location} Generator' style.
3. Create one generator per location that currently has none.

Idempotent: renames match by id (skip if already renamed), creates skip if a
generator with the target name already exists. Safe to re-run.

Usage:
  py scripts\setup_store_generators.py            # dry run
  py scripts\setup_store_generators.py --apply     # execute

Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env / SupabaseCreds.env / env.
"""
import json
import os
import sys
import uuid
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

# G-010 'Okitipupa 2nd Generator' -> this location
OKITIPUPA_GEN_ID = "G-010"
OKITIPUPA_LOC = "Okitipupa CR"

# Renames: generator id -> new name
RENAMES = {
    "G-008": "Igbokoda CR Generator",
    "G-009": "Ikare CR Generator",
    "G-002": "Ado 2 Generator",
    "G-003": "Akungba CR Generator",
    "G-006": "Akure 5 Generator",
    "G-011": "Owo Bakery Generator",
    "G-012": "Owo CR Generator",
}

# Create one generator per location (name = '{loc} Generator')
CREATE_FOR_LOCATIONS = [
    "Ado 3", "Ado Bakery", "Akure 3", "Akure 4", "Akure Bakery",
    "Idanre CR", "Ikare Bakery", "Okitipupa Bakery", "Okitipupa CR",
    "Ondo 2 CR", "Ondo Bakery", "Ondo CR", "Oye Bakery", "Pie Express / Warehouse",
]


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

    def update(self, table, id_col, id_val, patch):
        return self._req("PATCH", table, params={id_col: f"eq.{id_val}"}, body=patch,
                         extra_headers={"Prefer": "return=representation"})


def main(apply_mode):
    load_env_file()
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required.")
        sys.exit(1)
    sb = Supabase(url, key)

    gens = sb.select("generators", columns="id,name,loc,status")
    by_id = {g["id"]: g for g in gens}
    existing_names = {(g["name"] or "").strip().lower() for g in gens}

    # --- Plan: Okitipupa assignment ---
    print("=== 1. OKITIPUPA ASSIGNMENT ===")
    okitipupa_action = None
    if OKITIPUPA_GEN_ID in by_id:
        cur = by_id[OKITIPUPA_GEN_ID]
        if (cur.get("loc") or "").strip().lower() != OKITIPUPA_LOC.lower():
            okitipupa_action = (OKITIPUPA_GEN_ID, OKITIPUPA_LOC)
            print(f"  Set loc='{OKITIPUPA_LOC}' on {cur['name']} ({OKITIPUPA_GEN_ID})")
        else:
            print(f"  {cur['name']} already at {OKITIPUPA_LOC} — skip")
    else:
        print(f"  ! {OKITIPUPA_GEN_ID} not found — skip")

    # --- Plan: renames ---
    print("\n=== 2. RENAMES ===")
    rename_actions = []
    for gid, new_name in RENAMES.items():
        if gid not in by_id:
            print(f"  ! {gid} not found — skip")
            continue
        cur_name = by_id[gid]["name"]
        if cur_name == new_name:
            print(f"  {gid} already named '{new_name}' — skip")
            continue
        rename_actions.append((gid, new_name))
        print(f"  '{cur_name}' -> '{new_name}'  ({gid})")

    # --- Plan: creates ---
    print("\n=== 3. CREATE MISSING GENERATORS ===")
    create_actions = []
    for loc in CREATE_FOR_LOCATIONS:
        new_name = f"{loc} Generator"
        if new_name.strip().lower() in existing_names:
            print(f"  '{new_name}' already exists — skip")
            continue
        create_actions.append({"id": str(uuid.uuid4()), "name": new_name, "loc": loc,
                                "status": "Active", "hrs": 0})
        print(f"  + Create '{new_name}'  (loc={loc})")

    print("\n=== PLAN SUMMARY ===")
    print(f"  Okitipupa assignment: {'1' if okitipupa_action else '0'}")
    print(f"  Renames:              {len(rename_actions)}")
    print(f"  New generators:       {len(create_actions)}")

    if not apply_mode:
        print("\nDRY RUN — no writes. Re-run with --apply to execute.")
        return

    print("\n=== APPLYING ===")
    if okitipupa_action:
        gid, loc = okitipupa_action
        sb.update("generators", "id", gid, {"loc": loc})
        print(f"  Set loc='{loc}' on {gid}")
    for gid, new_name in rename_actions:
        sb.update("generators", "id", gid, {"name": new_name})
        print(f"  Renamed {gid} -> '{new_name}'")
    if create_actions:
        inserted = sb.insert("generators", create_actions)
        print(f"  Created {len(inserted)} generators")
    print("\nDONE.")


if __name__ == "__main__":
    main("--apply" in sys.argv)
