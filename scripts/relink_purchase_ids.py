#!/usr/bin/env python
r"""
FleetPro: Re-link diesel_distributions.purchase_id with FIFO allocation.

The original imports linked each distribution to "the latest purchase from
the carried supplier", which dumped weeks of deliveries onto single
purchases and produced negative "Remaining" in the Purchases tab.

This reallocates every distribution oldest-first:
  - Distributions tagged 'Outsourced: <supplier>' allocate FIFO against
    purchases from that supplier only (direct deliveries).
  - All other distributions allocate FIFO against any purchase dated on or
    before the delivery (the warehouse pool), preferring the oldest purchase
    that still has enough remaining capacity.
  - If nothing has capacity, purchase_id is set NULL (shown as em-dash in
    the app) instead of forcing a wrong link.

Safe to re-run any time (it recomputes from scratch).

Usage:
  py scripts\relink_purchase_ids.py            # dry run
  py scripts\relink_purchase_ids.py --apply     # write links
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

    purchases = sorted(sb.select_all("diesel_purchases", "id,date,supplier,litres,litres_received"),
                       key=lambda p: p["date"])
    dists = sorted(sb.select_all("diesel_distributions", "id,date,store_location,litres,notes,purchase_id"),
                   key=lambda d: d["date"])
    print(f"Purchases: {len(purchases)} | Distributions: {len(dists)}")

    # Physical capacity available to distribute = RECEIVED litres (paid + excess)
    cap = {p["id"]: float(p["litres_received"]) if p.get("litres_received") is not None else float(p["litres"]) for p in purchases}
    used = {p["id"]: 0.0 for p in purchases}

    def alloc(d, pool):
        litres = float(d["litres"])
        eligible = [p for p in pool if p["date"] <= d["date"] and used[p["id"]] < cap[p["id"]]]
        if not eligible:
            return None
        fit = [p for p in eligible if cap[p["id"]] - used[p["id"]] >= litres]
        chosen = fit[0] if fit else max(eligible, key=lambda p: cap[p["id"]] - used[p["id"]])
        used[chosen["id"]] += litres
        return chosen["id"]

    changes = []
    unallocated = 0
    for d in dists:
        notes = d.get("notes") or ""
        if notes.startswith("Outsourced:"):
            sup = notes.split("Outsourced:", 1)[1].strip().upper()[:5]
            pool = [p for p in purchases if (p.get("supplier") or "").upper().startswith(sup)] if sup else []
        else:
            pool = purchases
        new_id = alloc(d, pool)
        if new_id is None:
            unallocated += 1
        if new_id != d.get("purchase_id"):
            changes.append((d["id"], new_id))

    over = [(p, used[p["id"]] - cap[p["id"]]) for p in purchases if used[p["id"]] > cap[p["id"]]]
    print(f"\n=== PLAN ===")
    print(f"  Links to update: {len(changes)} of {len(dists)}")
    print(f"  Unallocated (purchase_id -> NULL): {unallocated} (deliveries with no recorded purchase capacity before them)")
    if over:
        print(f"  Purchases slightly over-allocated (last delivery overflowed remaining capacity):")
        for p, o in over:
            print(f"    {p['date']} {p['supplier']:<18} +{o:.0f} L over")
    print(f"\n  Utilization (top 12 by litres):")
    for p in sorted(purchases, key=lambda x: -cap[x["id"]])[:12]:
        print(f"    {p['date']} {p['supplier']:<18} {used[p['id']]:>8.0f} / {cap[p['id']]:>8.0f} L")

    if not apply_mode:
        print("\nDRY RUN — no writes. Re-run with --apply to write links.")
        return

    print(f"\n=== WRITING {len(changes)} updates ===")
    done = 0
    for did, pid in changes:
        sb.patch("diesel_distributions", did, {"purchase_id": pid})
        done += 1
        if done % 100 == 0:
            print(f"  ...{done}/{len(changes)}")
    print(f"  Updated {done} distributions.")
    print("\nDONE. The Purchases tab Remaining column should now be sane.")


if __name__ == "__main__":
    main("--apply" in sys.argv)
