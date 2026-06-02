#!/usr/bin/env python
r"""
FleetPro: Consolidate duplicate generators + assign locations to unassigned ones.

What it does:
  1. Groups generators by a fuzzy name key (lowercase, alphanumeric only, with
     "generator" stripped). e.g. "Akure 6 Generator" and "AKURE 6 GENERATOR"
     hash to the same key -> duplicate group.
  2. For each duplicate group: picks the member with the most diesel_readings
     as the "winner". Re-points all readings from losers -> winner.
     Backfills `loc` on the winner from any group member that has it set.
     Deletes the losers.
  3. For generators that are NOT in a duplicate group AND have no `loc`,
     tries to infer location from the name and update — but only if the
     inferred name exactly matches a row in the `locations` table.

Usage:
  py scripts\consolidate_generators.py                # dry run (default)
  py scripts\consolidate_generators.py --apply        # write changes

Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env, SupabaseCreds.env,
or env vars (same as the Akure 1 import script).
"""
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from collections import defaultdict


# ---------- .env loader ----------
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
            v = v.strip().strip('"').strip("'")
            os.environ.setdefault(k.strip(), v)
        return


# ---------- Supabase REST client ----------
class Supabase:
    def __init__(self, url, key):
        self.url = url.rstrip("/")
        self.key = key
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    def _req(self, method, path, params=None, body=None, extra_headers=None):
        url = f"{self.url}/rest/v1/{path}"
        if params:
            url += "?" + urllib.parse.urlencode(params, doseq=True)
        data = None
        if body is not None:
            data = json.dumps(body).encode("utf-8")
        headers = dict(self.headers)
        if extra_headers:
            headers.update(extra_headers)
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req) as resp:
                raw = resp.read()
                if not raw:
                    return []
                return json.loads(raw)
        except urllib.error.HTTPError as e:
            msg = e.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"HTTP {e.code} {method} {path}: {msg}") from e

    def select(self, table, columns="*", filters=None):
        params = {"select": columns}
        if filters:
            params.update(filters)
        return self._req("GET", table, params=params)

    def update(self, table, filter_eq, body):
        params = {f"{filter_eq[0]}": f"eq.{filter_eq[1]}"}
        return self._req("PATCH", table, params=params, body=body)

    def delete(self, table, filter_eq):
        params = {f"{filter_eq[0]}": f"eq.{filter_eq[1]}"}
        return self._req("DELETE", table, params=params)


# ---------- Name normalization ----------
def normalize_name(name):
    """'Akure 6 Generator' -> 'akure6'. Drops 'generator' so case/spacing variants collapse."""
    if not name:
        return ""
    s = name.lower()
    s = re.sub(r"\bgenerator\b", "", s)
    s = re.sub(r"\bgen\b", "", s)
    s = re.sub(r"[^a-z0-9]", "", s)
    return s


def infer_location(gen_name, locations_set):
    """Try to find a location row matching the generator's name (minus 'generator')."""
    if not gen_name:
        return None
    base = re.sub(r"\b[Gg]enerator\b", "", gen_name).strip()
    # Try exact case-insensitive match against locations
    for loc in locations_set:
        if loc.lower() == base.lower():
            return loc
    # Try with " CR" appended (e.g. "Akungba" -> "Akungba CR")
    for loc in locations_set:
        if loc.lower() == (base + " cr").lower():
            return loc
    return None


# ---------- Main ----------
def main(apply_mode):
    load_env_file()
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in env / .env.")
        sys.exit(1)
    sb = Supabase(url, key)

    print("=== FETCHING ===")
    gens = sb.select("generators", columns="id,name,loc,hrs,brand,cap,status")
    print(f"  {len(gens)} generators total")
    readings = sb.select("diesel_readings", columns="generator_id")
    counts = defaultdict(int)
    for r in readings:
        counts[r["generator_id"]] += 1
    print(f"  {len(readings)} diesel_readings (linked to {len(counts)} distinct gens)")
    locations = sb.select("locations", columns="name")
    loc_set = {l["name"] for l in locations}
    print(f"  {len(loc_set)} locations\n")

    # Group by normalized name
    groups = defaultdict(list)
    for g in gens:
        groups[normalize_name(g["name"])].append(g)

    dup_groups = {k: v for k, v in groups.items() if len(v) > 1}
    singletons = {k: v[0] for k, v in groups.items() if len(v) == 1}

    print(f"=== DUPLICATE GROUPS ({len(dup_groups)}) ===")
    plan_reading_moves = []   # (loser_id, winner_id, count)
    plan_loc_updates = []     # (gen_id, new_loc, reason)
    plan_deletes = []         # (gen_id, name, reason)

    for key, members in dup_groups.items():
        print(f"\nGroup key: {key!r}")
        # Annotate each with reading count
        for m in members:
            m["_readings"] = counts.get(m["id"], 0)
        # Winner = most readings (tiebreak: has loc set, then highest hrs)
        members_sorted = sorted(
            members,
            key=lambda m: (m["_readings"], 1 if m.get("loc") else 0, m.get("hrs") or 0),
            reverse=True,
        )
        winner = members_sorted[0]
        losers = members_sorted[1:]
        print(f"  WINNER -> {winner['name']!r} id={winner['id']} loc={winner.get('loc')!r} hrs={winner.get('hrs')} readings={winner['_readings']}")
        for L in losers:
            print(f"  LOSER  -> {L['name']!r} id={L['id']} loc={L.get('loc')!r} hrs={L.get('hrs')} readings={L['_readings']}")
            if L["_readings"] > 0:
                plan_reading_moves.append((L["id"], winner["id"], L["_readings"]))
            plan_deletes.append((L["id"], L["name"], f"merged into {winner['id']}"))
        # If winner has no loc but a loser does, copy it across
        if not winner.get("loc"):
            for m in members:
                if m.get("loc"):
                    plan_loc_updates.append((winner["id"], m["loc"], f"copied from duplicate {m['id']}"))
                    winner["loc"] = m["loc"]  # mark so we don't re-suggest below
                    break

    # Standalone unassigned generators
    print(f"\n=== UNASSIGNED SINGLETONS ===")
    unassigned_singletons = [g for g in singletons.values() if not (g.get("loc") and g["loc"].strip())]
    print(f"  {len(unassigned_singletons)} singleton(s) with no loc set")
    for g in unassigned_singletons:
        guess = infer_location(g["name"], loc_set)
        rcount = counts.get(g["id"], 0)
        if guess:
            print(f"  {g['name']!r} id={g['id']} (readings={rcount}) -> infer loc={guess!r}")
            plan_loc_updates.append((g["id"], guess, f"inferred from name {g['name']!r}"))
        else:
            print(f"  {g['name']!r} id={g['id']} (readings={rcount}) -> NO MATCH in locations, skip (use UI Edit)")

    print(f"\n=== PLAN SUMMARY ===")
    print(f"  diesel_readings to re-point: {sum(c for _,_,c in plan_reading_moves)} (across {len(plan_reading_moves)} losers)")
    print(f"  generators to update loc:    {len(plan_loc_updates)}")
    print(f"  generators to delete:        {len(plan_deletes)}")

    if not apply_mode:
        print("\nDRY RUN — no changes written. Re-run with --apply to execute.")
        return

    print("\n=== APPLYING ===")
    # 1. Re-point readings (do this BEFORE deleting losers)
    for loser_id, winner_id, n in plan_reading_moves:
        sb.update("diesel_readings", ("generator_id", loser_id), {"generator_id": winner_id})
        print(f"  + Re-pointed {n} readings from {loser_id} -> {winner_id}")
    # 2. Update locations
    for gen_id, new_loc, reason in plan_loc_updates:
        sb.update("generators", ("id", gen_id), {"loc": new_loc})
        print(f"  + Set loc={new_loc!r} on {gen_id} ({reason})")
    # 3. Delete losers
    for gen_id, name, reason in plan_deletes:
        sb.delete("generators", ("id", gen_id))
        print(f"  - Deleted generator {name!r} ({gen_id}) — {reason}")

    print("\nDONE.")


if __name__ == "__main__":
    apply_mode = "--apply" in sys.argv
    main(apply_mode)
