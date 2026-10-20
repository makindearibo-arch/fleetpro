"""Gas main office stock: the 'opening stock' rows of 15 and 19 Oct were copied from the fleet
manager's book (not new cylinders). Remove them, relink the cylinders that were sent 'from' them to
the DEPNA purchase of the same day (same price per cylinder), and record the 20 Oct check
(2 x 50 kg + 1 x 25 kg at the main office) as a stock count.
Default PREVIEW; --apply writes (backup first; needs 20261020_gas_stock_counts.sql)."""
import json, os, sys, urllib.request, datetime

for line in open(r"C:\Users\MakindeAribo\Documents\fleetpro\SupabaseCreds.env", encoding="utf-8"):
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1); os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
URL, KEY = os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"]


def req(method, path, body=None):
    r = urllib.request.Request(URL + "/rest/v1/" + path, method=method, data=None if body is None else json.dumps(body).encode(),
                               headers={"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json", "Prefer": "return=representation"})
    raw = urllib.request.urlopen(r).read()
    return json.loads(raw) if raw else None


pur = req("GET", "gas_purchases?select=*")
cyl = req("GET", "gas_cylinders?select=*&purchase_id=not.is.null")
OS = [p for p in pur if p["supplier"] == "OPENING STOCK" and p["date"] in ("2026-10-15", "2026-10-19")]
assert len(OS) == 4, f"expected 4 later opening-stock rows, found {len(OS)}"
depna = {p["date"]: p for p in pur if p["supplier"] == "DEPNA GAS"}
plan_relink = []
for p in OS:
    for c in [c for c in cyl if c["purchase_id"] == p["id"]]:
        d = depna[p["date"]]
        room = d["cylinders"] - len([x for x in cyl if x["purchase_id"] == d["id"]]) - len([x for x in plan_relink if x[1]["id"] == d["id"]])
        assert room > 0 and float(c["kg"]) == float(d["kg_each"]), "no room / size mismatch"
        plan_relink.append((c, d))
COUNTS = [("2026-10-20", 50, 2), ("2026-10-20", 25, 1)]
print("PLAN")
for c, d in plan_relink:
    print(f"  relink: {c['store_location']} {float(c['kg']):g} kg sent {c['purchase_date']} -> DEPNA GAS {d['date']} (cost stays {c['cost']})")
for p in OS:
    print(f"  remove opening-stock line {p['date']} {p['cylinders']} x {float(p['kg_each']):g} kg (copied from the book)")
for d, kg, n in COUNTS:
    print(f"  stock count {d}: {n} x {kg} kg at the main office")
if "--apply" not in sys.argv:
    print("\nPREVIEW ONLY - nothing written."); sys.exit(0)

bdir = r"C:\Users\MakindeAribo\Documents\fleetpro-backups\2026-10-20\gas-opening-stock"
os.makedirs(bdir, exist_ok=True)
json.dump({"opening_rows": OS, "cylinders": [c for c, _ in plan_relink]}, open(os.path.join(bdir, "backup-" + datetime.datetime.now().strftime("%H%M%S") + ".json"), "w", encoding="utf-8"), indent=2)
note = " [2026-10-20 admin fix: was linked to an 'opening stock' line copied from the fleet manager's book; now linked to DEPNA GAS {d}]"
for c, d in plan_relink:
    req("PATCH", f"gas_cylinders?id=eq.{c['id']}", {"purchase_id": d["id"], "notes": ((c.get("notes") or "") + note.format(d=d["date"])).strip()})
for p in OS:
    req("DELETE", f"gas_purchases?id=eq.{p['id']}")
for d, kg, n in COUNTS:
    req("POST", "gas_stock_counts", {"date": d, "kg_each": kg, "cylinders": n, "notes": "Checked at the main office by the fleet manager"})
print("\nWRITTEN. Backup in", bdir)
