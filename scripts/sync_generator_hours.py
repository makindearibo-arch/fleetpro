#!/usr/bin/env python
r"""
FleetPro: Sync generators.hrs from imported diesel_readings.

The bulk import scripts wrote daily gen_hours_opening/closing into
diesel_readings, but did NOT update the generators.hrs field (the
"Run Hours" number shown on the Generators page). This syncs it.

For each generator it finds the most recent reading (by date) with a
valid gen_hours_closing, and OVERWRITES generators.hrs with it. The
imported daily readings are the source of truth, so this corrects bad
manual/test values (e.g. a 111,111 placeholder). Generators with no
readings are left untouched. Decreases are flagged in the dry run so
you can veto a specific generator via SKIP_IDS.

Usage:
  py scripts\sync_generator_hours.py            # dry run
  py scripts\sync_generator_hours.py --apply     # write

Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env / SupabaseCreds.env / env.
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

# Generator IDs to leave untouched (e.g. if a decrease would be wrong). Empty by default.
SKIP_IDS = set()


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

    def update(self, table, id_col, id_val, patch):
        return self._req("PATCH", table, params={id_col: f"eq.{id_val}"}, body=patch,
                         extra_headers={"Prefer": "return=representation"})


def latest_closing(sb, gen_id):
    """Most recent reading (by date desc) with a valid gen_hours_closing > 0."""
    rows = sb._req("GET", "diesel_readings", params={
        "select": "date,gen_hours_closing",
        "generator_id": f"eq.{gen_id}",
        "order": "date.desc",
        "limit": "60",
    })
    for r in rows:
        v = r.get("gen_hours_closing")
        if v not in (None, 0):
            return float(v), r["date"]
    return None, None


def main(apply_mode):
    load_env_file()
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required.")
        sys.exit(1)
    sb = Supabase(url, key)

    gens = sb.select("generators", columns="id,name,hrs", filters={"order": "name.asc"})
    print(f"=== SYNC PLAN ({len(gens)} generators) ===")
    print(f"  {'Generator':<28} {'current':>10} {'-> new':>10}  {'date':<12}")
    updates = []
    for g in gens:
        cur = float(g.get("hrs") or 0)
        close, date = latest_closing(sb, g["id"])
        if close is None:
            print(f"  {g['name']:<28} {cur:>10.1f} {'(skip)':>10}  no readings")
            continue
        if g["id"] in SKIP_IDS:
            print(f"  {g['name']:<28} {cur:>10.1f} {'(SKIP)':>10}  excluded via SKIP_IDS")
            continue
        new = close  # readings win — overwrite
        if new == cur:
            flag = "  (no change)"
        elif new < cur:
            flag = "  <-- DECREASE (verify!)"
        else:
            flag = "  <-- update"
        print(f"  {g['name']:<28} {cur:>10.1f} {new:>10.1f}  {date}{flag}")
        if new != cur:
            updates.append((g["id"], g["name"], new))

    print(f"\n  {len(updates)} generator(s) to update.")
    if not apply_mode:
        print("\nDRY RUN — no writes. Re-run with --apply to write.")
        return

    print("\n=== APPLYING ===")
    for gid, name, new in updates:
        sb.update("generators", "id", gid, {"hrs": new})
        print(f"  + {name}: hrs -> {new:.1f}")
    print("\nDONE.")


if __name__ == "__main__":
    main("--apply" in sys.argv)
