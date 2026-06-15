#!/usr/bin/env python
r"""
FleetPro: Reset per-tanker REMAINING stock to a clean baseline.

"Reconcile Stock" fixes the TOTAL; this fixes the per-purchase Remaining column.
It closes out every purchase (Remaining -> 0) and parks the live stock on the
single most-recent purchase (the active tanker), so:
   active tanker Remaining = TARGET_REMAINING
   every other purchase   Remaining = 0
   Stock in Hand          = TARGET_REMAINING

How: Remaining = Received - Distributed. For each purchase it sets
   litres_received = (its distributed)            -> remaining 0
and for the active tanker
   litres_received = (its distributed) + TARGET    -> remaining = TARGET
Cost (paid x price) and all distributions are untouched. Any prior
"STOCK RECONCILIATION" adjustment rows are deleted (this supersedes them).

Usage:
  py scripts\reset_remaining.py            # dry run
  py scripts\reset_remaining.py --apply     # write

Edit TARGET_REMAINING / ACTIVE_MATCH below if needed.
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

TARGET_REMAINING = 12500          # litres to leave on the active tanker
ACTIVE_MATCH = None               # None = most-recent real purchase; or {"date","litres"} to pick one
ADJ_SUPPLIER = "STOCK RECONCILIATION"


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

    def select_all(self, table, columns, page=1000):
        out = []
        offset = 0
        while True:
            chunk = self._req("GET", table, params={"select": columns, "limit": str(page), "offset": str(offset)})
            out.extend(chunk)
            if len(chunk) < page:
                return out
            offset += page

    def patch(self, table, id_val, body):
        return self._req("PATCH", table, params={"id": f"eq.{id_val}"}, body=body,
                         extra_headers={"Prefer": "return=minimal"})

    def delete(self, table, id_val):
        return self._req("DELETE", table, params={"id": f"eq.{id_val}"})


def main(apply_mode):
    load_env_file()
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required.")
        sys.exit(1)
    sb = Supabase(url, key)

    purchases = sb.select_all("diesel_purchases", "id,date,supplier,litres,litres_received")
    dists = sb.select_all("diesel_distributions", "purchase_id,litres")
    distributed = {}
    for d in dists:
        if d.get("purchase_id"):
            distributed[d["purchase_id"]] = distributed.get(d["purchase_id"], 0) + float(d["litres"])

    adjustments = [p for p in purchases if (p.get("supplier") or "") == ADJ_SUPPLIER]
    real = [p for p in purchases if (p.get("supplier") or "") != ADJ_SUPPLIER]
    if not real:
        print("No purchases found.")
        return

    # Pick the active tanker
    if ACTIVE_MATCH:
        active = next((p for p in real if p["date"] == ACTIVE_MATCH["date"] and abs(float(p["litres"]) - ACTIVE_MATCH["litres"]) < 1), None)
    else:
        active = sorted(real, key=lambda p: p["date"])[-1]
    if not active:
        print("Could not identify the active tanker.")
        return

    print(f"Active tanker (keeps {TARGET_REMAINING:,} L): {active['date']} {active['supplier']} {float(active['litres']):.0f} L")
    if adjustments:
        print(f"Will DELETE {len(adjustments)} prior STOCK RECONCILIATION adjustment(s).")
    print(f"\n{'date':<12} {'supplier':<16} {'distributed':>11} {'new received':>12} {'-> remaining':>12}")
    plan = []
    for p in sorted(real, key=lambda p: p["date"]):
        dist = distributed.get(p["id"], 0)
        new_recv = dist + (TARGET_REMAINING if p["id"] == active["id"] else 0)
        rem = new_recv - dist
        cur_recv = p["litres_received"] if p["litres_received"] is not None else p["litres"]
        if abs(float(cur_recv) - new_recv) > 0.5:
            plan.append((p["id"], new_recv))
        flag = "  <== ACTIVE" if p["id"] == active["id"] else ""
        print(f"{p['date']:<12} {(p['supplier'] or '')[:16]:<16} {dist:>11,.0f} {new_recv:>12,.0f} {rem:>12,.0f}{flag}")

    print(f"\n  Purchases to update: {len(plan)}   Resulting Stock in Hand: {TARGET_REMAINING:,} L")

    if not apply_mode:
        print("\nDRY RUN — no writes. Re-run with --apply.")
        return

    print("\n=== WRITING ===")
    for p in adjustments:
        sb.delete("diesel_purchases", p["id"])
    if adjustments:
        print(f"  Deleted {len(adjustments)} adjustment row(s).")
    for pid, recv in plan:
        sb.patch("diesel_purchases", pid, {"litres_received": recv})
    print(f"  Updated {len(plan)} purchases. Stock in Hand = {TARGET_REMAINING:,} L; only the active tanker shows remaining.")
    print("\nDONE.")


if __name__ == "__main__":
    main("--apply" in sys.argv)
