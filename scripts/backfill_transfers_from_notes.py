#!/usr/bin/env python
r"""
FleetPro: Reconstruct historical diesel transfers from imported reading notes.

The store imports preserved each sheet's transfer info as text in
diesel_readings.notes:
  Akure 1 style:  "Supplier: X | Transfer-out: LSD 80XA (45), Water Tanter (40)"
                  -> one VEHICLE transfer per "NAME (litres)" pair, matched to
                     the vehicles table by plate/name when possible
  Bakery style:   "Transfer-out: 500.0"
                  -> one transfer of that size; if the store has an oven the
                     destination is the OVEN (gen tank -> oven tank), else 'other'

Each created row gets notes='backfilled:<reading_id>' so re-runs skip
already-processed readings (idempotent).

Usage:
  py scripts\backfill_transfers_from_notes.py            # dry run
  py scripts\backfill_transfers_from_notes.py --apply     # write transfers

Run AFTER the 20260610_diesel_transfers.sql migration.
"""
import json
import os
import re
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

    def insert(self, table, rows):
        return self._req("POST", table, body=rows, extra_headers={"Prefer": "return=representation"})


def norm(s):
    return re.sub(r"[^A-Z0-9]", "", (s or "").upper())


def main(apply_mode):
    load_env_file()
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required.")
        sys.exit(1)
    sb = Supabase(url, key)

    vehicles = sb.select_all("vehicles", "id,name,plate")
    gens = sb.select_all("generators", "id,name,loc,asset_type")
    ovens_by_loc = {}
    for g in gens:
        if g.get("asset_type") == "oven" and g.get("loc"):
            ovens_by_loc[g["loc"].strip().lower()] = g

    # Readings that mention a transfer in their notes
    rows = sb.select_all("diesel_readings", "id,date,store_location,generator_id,notes",
                         filters={"notes": "ilike.*Transfer-out*"}, order="date.asc")
    print(f"Readings with transfer notes: {len(rows)}")

    # Already-backfilled reading ids (idempotency)
    existing = sb.select_all("diesel_transfers", "notes", filters={"notes": "like.backfilled:*"})
    done_ids = {e["notes"].split("backfilled:", 1)[1] for e in existing if e.get("notes")}
    print(f"Already backfilled: {len(done_ids)} readings\n")

    pair_re = re.compile(r"([^,()]+?)\s*\(\s*(\d+(?:\.\d+)?)\s*\)")
    new_transfers = []
    unmatched_labels = {}
    by_store = {}

    for r in rows:
        if str(r["id"]) in done_ids:
            continue
        seg = r["notes"].split("Transfer-out:", 1)[1].strip()
        store = r["store_location"]
        pairs = pair_re.findall(seg)
        items = []
        if pairs:
            for label, litres in pairs:
                label = label.strip(" ,;|")
                if not label or float(litres) <= 0:
                    continue
                nl = norm(label)
                veh = next((v for v in vehicles if nl and (nl in norm(v.get("plate")) or nl in norm(v.get("name")) or norm(v.get("plate")) and norm(v.get("plate")) in nl)), None)
                if not veh:
                    unmatched_labels[label] = unmatched_labels.get(label, 0) + 1
                items.append({"dest_type": "vehicle", "dest_id": veh["id"] if veh else None,
                              "dest_label": veh["name"] if veh else label, "litres": float(litres)})
        else:
            try:
                total = float(seg.replace(",", "").strip())
            except ValueError:
                total = None
            if total and total > 0:
                oven = ovens_by_loc.get((store or "").strip().lower())
                # gen -> oven only when the source ISN'T the oven itself
                # (oven-only stores transferring out go somewhere unknown)
                if oven and oven["id"] != r["generator_id"]:
                    items.append({"dest_type": "oven", "dest_id": oven["id"], "dest_label": oven["name"], "litres": total})
                else:
                    items.append({"dest_type": "other", "dest_id": None, "dest_label": "Unspecified (from sheet)", "litres": total})
        for it in items:
            new_transfers.append({
                "date": r["date"], "store_location": store,
                "source_generator_id": r["generator_id"],
                "dest_type": it["dest_type"], "dest_id": it["dest_id"], "dest_label": it["dest_label"],
                "litres": it["litres"], "recorded_by": None,
                "notes": f"backfilled:{r['id']}",
            })
            s = by_store.setdefault(store, {"n": 0, "litres": 0.0})
            s["n"] += 1
            s["litres"] += it["litres"]

    print("=== PLAN ===")
    for store, s in sorted(by_store.items()):
        print(f"  {store:<26} {s['n']:>4} transfers   {s['litres']:>9.0f} L")
    print(f"  TOTAL: {len(new_transfers)} transfers, {sum(t['litres'] for t in new_transfers):.0f} L")
    if unmatched_labels:
        print(f"\n  Vehicle labels NOT matched to the vehicles table (kept as label-only):")
        for lbl, cnt in sorted(unmatched_labels.items(), key=lambda x: -x[1]):
            print(f"    {lbl!r} x{cnt}")

    if not apply_mode:
        print("\nDRY RUN — no writes. Re-run with --apply to write.")
        return

    print("\n=== WRITING ===")
    BATCH = 100
    total = 0
    for i in range(0, len(new_transfers), BATCH):
        total += len(sb.insert("diesel_transfers", new_transfers[i:i + BATCH]))
    print(f"  + Inserted {total} transfers")
    print("\nDONE. Now run recalc_baselines.py --apply then backfill_discrepancy_flags.py --apply.")


if __name__ == "__main__":
    main("--apply" in sys.argv)
