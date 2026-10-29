"""Fix four store-days where one delivery was counted twice (2026-10-29).

  A. Akure 2, 23/24 Sep: the 1 Oct fix set the 24 Sep reading to 500 L received but
     the delivery's own date stayed 23 Sep, so the late-logged 23 Sep reading counted
     it again. -> delivery moved to 24 Sep, 23 Sep reading received 500 -> 0.
  B. Ikare CR, 16 Jul: logged on BOTH generators (one tank); the 2,000 L counted on each.
     -> kept on Ikare Generator 2's reading (the tank rose there), main generator 2,000 -> 0,
     its gap re-judged from Generator 2's same-day level.
  C. Owo Bakery, 30 Jun: 1,500 L counted on the generator AND the oven (the gen+oven bug
     fixed in the app on 6 Jul). -> oven 1,500 -> 0, its consumption + L/batch recomputed.
  D. Ondo Bakery, 8 Jun: the 200 L moved generator -> oven is stored on the oven as
     received AND exists as a transfer. -> oven received 200 -> 0 (consumption unchanged).

Default is a PREVIEW (no writes). --apply backs up the rows first, then writes.
"""
import json, os, sys, urllib.request, datetime, copy

for line in open(r"C:\Users\MakindeAribo\Documents\fleetpro\SupabaseCreds.env", encoding="utf-8"):
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1); os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
URL, KEY = os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"]
APPLY = "--apply" in sys.argv
TODAY = "2026-10-29"
BACKUP_DIR = r"C:\Users\MakindeAribo\Documents\fleetpro-backups\2026-10-29\double-counted-deliveries"

def req(method, path, body=None):
    h = {"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json", "Prefer": "return=representation"}
    r = urllib.request.Request(URL + "/rest/v1/" + path, data=json.dumps(body).encode() if body is not None else None, headers=h, method=method)
    return json.load(urllib.request.urlopen(r))
def get(path): return req("GET", path)
def one(rows, what):
    assert len(rows) == 1, f"expected exactly one {what}, got {len(rows)}"
    return rows[0]

AKURE2_GEN, IKARE_MAIN, IKARE_GEN2 = "G-96236640885102180", "G-009", "c7ae1857-1833-4c53-95de-e837f4a0c3a4"
gens = {g["id"]: g for g in get("generators?select=id,name,loc,asset_type")}
owo_oven = one([g for g in gens.values() if g["loc"] == "Owo Bakery" and g.get("asset_type") == "oven"], "Owo Bakery oven")["id"]
ondo_oven = one([g for g in gens.values() if g["loc"] == "Ondo Bakery" and g.get("asset_type") == "oven"], "Ondo Bakery oven")["id"]
TANKS = [AKURE2_GEN, IKARE_MAIN, IKARE_GEN2, owo_oven, ondo_oven]

readings = []
for g in TANKS:
    readings += get(f"diesel_readings?generator_id=eq.{g}&order=date,id&limit=5000")
transfers = get("diesel_transfers?or=(" + ",".join([f"source_generator_id.eq.{g}" for g in TANKS] + [f"dest_id.eq.{g}" for g in TANKS]) + ")&limit=5000")
def rd(gen, date):
    return one([r for r in readings if r["generator_id"] == gen and r["date"] == date], f"reading {gens[gen]['name']} {date}")
def note(old, add): return ((old or "").rstrip() + " " if (old or "").strip() else "") + add

# ---- the planned changes: (table, id, {column: new value}) --------------------------------
plan, why = [], []

# A. Akure 2
dl = one(get("diesel_distributions?store_location=eq.Akure%202&date=eq.2026-09-23&litres=eq.500"), "Akure 2 23 Sep delivery")
assert dl["id"] == "c8c3dcd7-f608-40e0-9cc5-415212a5ad41"
r23, r24 = rd(AKURE2_GEN, "2026-09-23"), rd(AKURE2_GEN, "2026-09-24")
assert float(r23["diesel_added"] or 0) == 500 and float(r24["diesel_added"] or 0) == 500
plan.append(("diesel_distributions", dl["id"], {"date": "2026-09-24", "notes": note(dl.get("notes"),
    f"[{TODAY} admin fix: date moved 2026-09-23 -> 2026-09-24; the tank rose on 2026-09-24 (205 -> 675 L). The 1 Oct move of this delivery had not saved, so it was counted on both days]")}))
plan.append(("diesel_readings", r23["id"], {"diesel_added": 0, "notes": note(r23.get("notes"),
    f"[{TODAY} admin fix: received 500 -> 0; the 500 L delivery reached the tank on 2026-09-24 and is counted on that day's reading]")}))
why.append(("A", "Akure 2", "delivery 23 Sep -> 24 Sep; 23 Sep reading received 500 -> 0"))

# B. Ikare CR
m16, g16 = rd(IKARE_MAIN, "2026-07-16"), rd(IKARE_GEN2, "2026-07-16")
assert float(m16["diesel_added"] or 0) == 2000 and float(g16["diesel_added"] or 0) == 2000
out16 = sum(float(t["litres"] or 0) for t in transfers if t["source_generator_id"] == IKARE_MAIN and t["date"] == "2026-07-16")
cons = float(m16["consumption_litres"] or 0)
theo_level = float(g16["diesel_level_actual"]) + 0 - out16 - cons          # handleSave: prev level + added - transfers - burn
gap = round(float(m16["diesel_level_actual"]) - theo_level)
flag = cons > 0 and abs(gap) / cons * 100 > 20 and abs(gap) >= 25           # handleSave's rule (20% and >= 25 L)
plan.append(("diesel_readings", m16["id"], {"diesel_added": 0, "discrepancy_litres": gap, "discrepancy_flag": flag, "notes": note(m16.get("notes"),
    f"[{TODAY} admin fix: received 2,000 -> 0; this day was logged on both generators (one tank) and the 2,000 L delivery counted on each - "
    f"it stays on Ikare Generator 2's reading, where the tank rose (380 -> 2,276 L). Gap re-judged from that reading's 2,276 L: "
    f"{float(m16['discrepancy_litres']):,.0f} -> {gap:,} L]")}))
why.append(("B", "Ikare CR", f"main generator 16 Jul received 2,000 -> 0; gap {float(m16['discrepancy_litres']):,.0f} -> {gap:,} L ({'still flagged' if flag else 'not flagged'})"))

# C. Owo Bakery oven
o30 = rd(owo_oven, "2026-06-30"); o29 = rd(owo_oven, "2026-06-29")
assert float(o30["diesel_added"] or 0) == 1500
tin = sum(float(t["litres"] or 0) for t in transfers if t.get("dest_type") == "oven" and t.get("dest_id") == owo_oven and t["date"] == "2026-06-30")
tout = sum(float(t["litres"] or 0) for t in transfers if t["source_generator_id"] == owo_oven and t["date"] == "2026-06-30")
ocons = max(0, round(float(o29["diesel_level_actual"]) + 0 + tin - tout - float(o30["diesel_level_actual"])))
units = float(o30.get("batches_produced") or 0) + float(o30.get("pans_fired") or 0)
orate = round(ocons / units, 2) if units > 0 else None
plan.append(("diesel_readings", o30["id"], {"diesel_added": 0, "consumption_litres": ocons, "consumption_rate": orate, "notes": note(o30.get("notes"),
    f"[{TODAY} admin fix: received 1,500 -> 0; the 1,500 L delivery went into the generator's tank and is counted on the generator's reading. "
    f"Used {float(o30['consumption_litres']):,.0f} -> {ocons} L ({o29['diesel_level_actual']} -> {o30['diesel_level_actual']} L)]")}))
why.append(("C", "Owo Bakery", f"oven 30 Jun received 1,500 -> 0; used {float(o30['consumption_litres']):,.0f} -> {ocons} L; L/batch {o30['consumption_rate']} -> {orate} ({units:g} batches)"))

# D. Ondo Bakery oven
d8 = rd(ondo_oven, "2026-06-08")
assert float(d8["diesel_added"] or 0) == 200
assert any(t.get("dest_type") == "oven" and t.get("dest_id") == ondo_oven and t["date"] == "2026-06-08" and float(t["litres"]) == 200 for t in transfers)
plan.append(("diesel_readings", d8["id"], {"diesel_added": 0, "notes": note(d8.get("notes"),
    f"[{TODAY} admin fix: received 200 -> 0; the 200 L came from the store's own generator and is already counted as a transfer into the oven]")}))
why.append(("D", "Ondo Bakery", "oven 8 Jun received 200 -> 0 (stored usage 31 L unchanged)"))

# ---- 'Used' as the app shows it (same maths as App.jsx withTankUsed) -------------------------
def num(x):
    try: return float(x) or None        # Number(x)||null, as toDR
    except (TypeError, ValueError): return None
def tank_used(rows):
    ev = {}
    for t in transfers:
        L = float(t["litres"] or 0)
        if t.get("source_generator_id"): ev.setdefault(t["source_generator_id"], []).append((t["date"], -L))
        if t.get("dest_type") == "oven" and t.get("dest_id"): ev.setdefault(t["dest_id"], []).append((t["date"], L))
    res = {}
    for g in TANKS:
        arr = sorted([r for r in rows if r["generator_id"] == g], key=lambda r: (r["date"], str(r["id"])))
        evs = sorted(ev.get(g, [])); i = 0; est = None; prev = None
        for r in arr:
            tf = 0
            while i < len(evs) and evs[i][0] <= r["date"]:
                if prev is not None or evs[i][0] == r["date"]: tf += evs[i][1]
                i += 1
            flow = (num(r["diesel_added"]) or 0) + tf; lvl = num(r["diesel_level_actual"])
            used = round(est + flow - lvl) if (est is not None and lvl is not None) else num(r["consumption_litres"])
            est = lvl if lvl is not None else (est + flow - (used or 0) if est is not None else None)
            prev = r["date"]; res[r["id"]] = used
    return res
after = copy.deepcopy(readings)
for table, rid, ch in plan:
    if table == "diesel_readings":
        for r in after:
            if r["id"] == rid: r.update(ch)
ub, ua = tank_used(readings), tank_used(after)
def show(gen, dates):
    for d in dates:
        for r, a in [(r, next(x for x in after if x["id"] == r["id"])) for r in readings if r["generator_id"] == gen and r["date"] == d]:
            print(f"    {d}  {gens[gen]['name']:<20} level {num(r['diesel_level_actual']) or '-':>6}  received {num(r['diesel_added']) or 0:>6,.0f} -> {num(a['diesel_added']) or 0:>5,.0f}"
                  f"   used {ub[r['id']] if ub[r['id']] is not None else '-':>6} -> {ua[r['id']] if ua[r['id']] is not None else '-':>5}")
def month_total(gen, ym):
    rs = [r for r in readings if r["generator_id"] == gen and r["date"].startswith(ym)]
    return (sum(num(r["diesel_added"]) or 0 for r in rs), sum(num(r["diesel_added"]) or 0 for r in after if r["generator_id"] == gen and r["date"].startswith(ym)),
            sum(ub[r["id"]] or 0 for r in rs), sum(ua[r["id"]] or 0 for r in rs))

print("PREVIEW - nothing is written" if not APPLY else "APPLYING")
print()
for k, store, what in why: print(f"{k}. {store}: {what}")
print("\nWhat the readings will show (received and used, before -> after):")
print("  A. Akure 2"); show(AKURE2_GEN, ["2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25"])
a = month_total(AKURE2_GEN, "2026-09"); print(f"    September total: received {a[0]:,.0f} -> {a[1]:,.0f} L, used {a[2]:,.0f} -> {a[3]:,.0f} L")
print("  B. Ikare CR"); show(IKARE_GEN2, ["2026-07-15", "2026-07-16"]); show(IKARE_MAIN, ["2026-07-16", "2026-07-17"])
prev_main = [r for r in readings if r["generator_id"] == IKARE_MAIN and r["date"] < "2026-07-16"][-1]
print(f"    (main generator's reading before 16 Jul: {prev_main['date']}, level {prev_main['diesel_level_actual']})")
print("  C. Owo Bakery"); show(owo_oven, ["2026-06-29", "2026-06-30", "2026-07-01"])
print("  D. Ondo Bakery"); show(ondo_oven, ["2026-06-07", "2026-06-08", "2026-06-09"])
print("\nExact changes:")
for table, rid, ch in plan:
    print(f"  {table} {rid[:8]}: " + ", ".join(f"{k} = {v!r}" for k, v in ch.items() if k != "notes"))
    print(f"      note added: {ch['notes'].split('[' + TODAY)[-1][:-1].strip() if '[' + TODAY in ch['notes'] else ''}")

if not APPLY:
    print("\nRun again with --apply to write (backs up first).")
    sys.exit(0)

os.makedirs(BACKUP_DIR, exist_ok=True)
bk = {"taken": datetime.datetime.now().isoformat(), "rows": {}}
for table, rid, _ in plan: bk["rows"][rid] = {"table": table, "row": one(get(f"{table}?id=eq.{rid}"), rid)}
path = os.path.join(BACKUP_DIR, "backup.json"); json.dump(bk, open(path, "w", encoding="utf-8"), indent=1, default=str)
print("\nbacked up to", path)
for table, rid, ch in plan:
    out = req("PATCH", f"{table}?id=eq.{rid}", ch)
    assert len(out) == 1, f"{table} {rid}: {len(out)} rows changed"
    bad = [k for k, v in ch.items() if (float(out[0][k]) if isinstance(v, (int, float)) and not isinstance(v, bool) and out[0][k] is not None else out[0][k]) != v]
    print(f"  wrote {table} {rid[:8]}" + (f"  MISMATCH {bad}" if bad else "  ok"))
