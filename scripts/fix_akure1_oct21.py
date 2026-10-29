"""Akure 1, October 2026: Generator 2's rate + its 21 Oct tank level (2026-10-29).

1. RATE. Akure 1 Generator 2 (in the app since 12 Oct) had no baseline, so it was
   judged at the 15 L/hr fallback while it really burns ~27 L/hr (recalc_baselines:
   27.5 from 5 day-pairs) -- every real running day flagged "used more" (19 Oct -383 L).
   The monthly refresh holds back a first baseline from < 10 day-pairs, so Makinde set
   it to 27 L/hr by hand.
2. 21 OCT LEVEL. Both generators draw from ONE tank. On 21 Oct (saved 22 Oct) the
   store logged Generator 1 at 13:30 with 1,520 L and Generator 2 at 13:32 with
   2,100 L -- exactly the previous day's level after the 2,000 L delivery. A tank
   cannot stay at 2,100 L while Generator 2 ran 28 h and 78 L went to a vehicle, and
   the next day both readings say ~1,515 L. So 2,100 -> 1,520, and the day is
   re-judged the way the app judges a day with two generators (App.jsx handleSave).
3. RE-SCORE. Akure 1's readings since 1 Oct are re-judged against the new rate with
   backfill_discrepancy_flags (the same thing the 1 Nov refresh would do), writing
   only rows whose flag flips or whose gap moves >= 5 L.

Default is a PREVIEW (no writes). --apply backs everything up first.
Run from Documents\\fleetpro (backfill_discrepancy_flags reads SupabaseCreds.env there).
"""
import json, os, sys, io, contextlib, urllib.request, datetime

for line in open(r"C:\Users\MakindeAribo\Documents\fleetpro\SupabaseCreds.env", encoding="utf-8"):
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1); os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
URL, KEY = os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"]
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import backfill_discrepancy_flags as bf

APPLY = "--apply" in sys.argv
TODAY = "2026-10-29"
BACKUP_DIR = r"C:\Users\MakindeAribo\Documents\fleetpro-backups\2026-10-29\akure1-oct21-level"
G1, G2 = "G-004", "3d15932c-32d2-419e-b346-5a1a590308da"
NEW_RATE = 27.0
RESCORE_FROM = "2026-10-01"

def req(method, path, body=None, prefer="return=representation"):
    h = {"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json", "Prefer": prefer}
    r = urllib.request.Request(URL + "/rest/v1/" + path, data=json.dumps(body).encode() if body is not None else None, headers=h, method=method)
    return json.load(urllib.request.urlopen(r))
def get(path): return req("GET", path)

# ---- 1. the rate ---------------------------------------------------------------
old_bl = get(f"generator_baselines?generator_id=eq.{G2}")
assert not old_bl or float(old_bl[0]["avg_litres_per_hour"]) == NEW_RATE, f"Generator 2 already has a baseline: {old_bl}"
baseline_row = {"generator_id": G2, "avg_litres_per_hour": NEW_RATE, "baseline_readings_count": 5,
                "last_calculated": datetime.datetime.now(datetime.timezone.utc).isoformat(), "min_rate": 13.27, "max_rate": 42.59}

# ---- 2. the 21 Oct level ---------------------------------------------------------
day = get("diesel_readings?store_location=eq.Akure%201&date=eq.2026-10-21&order=created_at")
g1 = next(r for r in day if r["generator_id"] == G1)
g2 = next(r for r in day if r["generator_id"] == G2)
assert float(g1["diesel_level_actual"]) == 1520 and float(g2["diesel_level_actual"]) in (2100, 1520), "readings changed since this was written"
done2 = float(g2["diesel_level_actual"]) == 1520
prev = get("diesel_readings?store_location=eq.Akure%201&date=lt.2026-10-21&diesel_level_actual=not.is.null&order=date.desc,created_at.desc&limit=1")[0]
prev2 = get("diesel_readings?store_location=eq.Akure%201&date=lt.2026-10-20&diesel_level_actual=not.is.null&order=date.desc,created_at.desc&limit=1")[0]
gens = {g["id"]: g for g in get("generators?select=id,name,tank&loc=eq.Akure%201")}
bl = {b["generator_id"]: float(b["avg_litres_per_hour"]) for b in get("generator_baselines?select=generator_id,avg_litres_per_hour") if b.get("avg_litres_per_hour")}
bl[G2] = NEW_RATE
rate = lambda gid: bl.get(gid) or ((gens[gid].get("tank") or 0) / 10) or 15.0   # handleSave's rateOf
tr = lambda d: sum(float(t["litres"]) for t in get(f"diesel_transfers?store_location=eq.Akure%201&date=eq.{d}"))
moved, moved20 = tr("2026-10-21"), tr("2026-10-20")
added = sum(float(r["diesel_added"] or 0) for r in day)
added20 = sum(float(r["diesel_added"] or 0) for r in get("diesel_readings?store_location=eq.Akure%201&date=eq.2026-10-20"))
hrs = lambda r: float(r["gen_hours_closing"]) - float(r["gen_hours_opening"])
th = {r["id"]: max(0.0, hrs(r)) * rate(r["generator_id"]) for r in (g1, g2)}
day_theo = sum(th.values())
new_level = 1520
gap = new_level - (float(prev["diesel_level_actual"]) + added - moved - day_theo)
pct = abs(gap) / day_theo * 100
day_flag = pct > 20 and abs(gap) >= 25
# Generator 2 was not logged on 20 Oct, so its 28 h cover 20-21 Oct: the two days together
gap2 = new_level - (float(prev2["diesel_level_actual"]) + added20 + added - moved20 - moved - day_theo)
lead = max((g2, g1), key=lambda r: th[r["id"]])   # the last saved wins a tie, as in the app
share = lambda r: round(gap * th[r["id"]] / day_theo)
note = lambda old, add: ((old or "").rstrip() + " " if (old or "").strip() else "") + add
plan = [
    (g2, {"diesel_level_actual": new_level, "discrepancy_litres": share(g2), "discrepancy_flag": day_flag and lead is g2,
          "notes": note(g2.get("notes"), f"[{TODAY} admin fix: tank level 2,100 -> 1,520 L. Both generators use one tank; Generator 1 was logged 2 minutes earlier at 1,520 L, and 2,100 L is the day before's level after the 2,000 L delivery - the tank cannot stay there while this generator ran 28 h. Gap re-judged for the whole day at this generator's new rate of {NEW_RATE:g} L/hr: +2,121 -> {share(g2):+,} L. This generator was not logged on 20 Oct, so its 28 h include 20 Oct, when the tank dropped {float(prev2['diesel_level_actual']) + added20 - moved20 - float(prev['diesel_level_actual']):,.0f} L on Generator 1's 0 h reading; over 20-21 Oct together the tank matches {NEW_RATE:g} L/hr ({gap2:+,.0f} L)]")}),
    (g1, {"discrepancy_litres": share(g1), "discrepancy_flag": day_flag and lead is g1,
          "notes": note(g1.get("notes"), f"[{TODAY} admin fix: gap re-judged for the whole day with Generator 2 (one tank; its level corrected 2,100 -> 1,520 L, its rate set to {NEW_RATE:g} L/hr): -577 -> {share(g1):+,} L]")}),
]

print("PREVIEW - nothing is written" if not APPLY else "APPLYING")
print(f"\n1. Akure 1 Generator 2 rate: {'none' if not old_bl else old_bl[0]['avg_litres_per_hour']} -> {NEW_RATE:g} L/hr (until now judged at the 15 L/hr fallback)")
print(f"\n2. 21 Oct. Tank before the day: {prev['date']} {float(prev['diesel_level_actual']):,.0f} L | received {added:,.0f} | moved out {moved:,.0f} L")
for r in (g1, g2):
    print(f"  {gens[r['generator_id']]['name']:<20} ran {hrs(r):5.2f} h x {rate(r['generator_id']):5.2f} L/hr = expected {th[r['id']]:6.1f} L")
print(f"  Day: expected {float(prev['diesel_level_actual']) + added - moved - day_theo:,.0f} L left, tank {new_level:,} L -> gap {gap:+,.0f} L ({pct:.0f}% of expected burn) -> {'FLAGGED' if day_flag else 'not flagged'}")
print(f"  20-21 Oct together (Generator 2's 28 h span both): from {prev2['date']} {float(prev2['diesel_level_actual']):,.0f} L + {added20 + added:,.0f} received - {moved20 + moved:,.0f} moved out -> gap {gap2:+,.0f} L")
if done2:
    print("  (level already corrected - skipping)")
else:
    for r, ch in plan:
        print(f"  {gens[r['generator_id']]['name']:<20} level {float(r['diesel_level_actual']):,.0f} -> {ch.get('diesel_level_actual', float(r['diesel_level_actual'])):,.0f}"
              f" | gap {r['discrepancy_litres']} -> {ch['discrepancy_litres']} | flag {r['discrepancy_flag']} -> {ch['discrepancy_flag']}")

# ---- 3. re-score Akure 1 since 1 Oct --------------------------------------------
sb = bf.connect()
def rescore(patch_level):
    if patch_level:   # preview: judge as if steps 1-2 were written (in memory only)
        orig = sb.select_all
        def patched(table, *a, **k):
            rows = orig(table, *a, **k)
            if table == "diesel_readings":
                for r in rows:
                    if r["id"] == g2["id"]: r["diesel_level_actual"] = new_level
                    for row, ch in plan:
                        if r["id"] == row["id"]: r["discrepancy_litres"], r["discrepancy_flag"] = ch["discrepancy_litres"], ch["discrepancy_flag"]
            return rows
        sb.select_all = patched
    with contextlib.redirect_stdout(io.StringIO()):
        ups = bf.compute(sb, rates={G2: NEW_RATE})
    if patch_level: sb.select_all = orig
    sig = lambda u: u[2] != u[4] or (u[1] is None) != (u[3] is None) or abs((u[1] or 0) - (u[3] or 0)) >= 5   # as the monthly refresh
    return sorted([u for u in ups if u[5] == "Akure 1" and u[6] >= RESCORE_FROM and sig(u)], key=lambda u: u[6])
gname = lambda rid: next((gens[r["generator_id"]]["name"] for r in get(f"diesel_readings?id=eq.{rid}&select=generator_id")), rid)
def show(ups):
    print(f"\n3. Akure 1 readings since {RESCORE_FROM} re-judged at {NEW_RATE:g} L/hr: {len(ups)} to update")
    for u in ups:
        print(f"  {u[6]} {gname(u[0]):<20} gap {u[3]} -> {u[1]} | flag {u[4]} -> {u[2]}")

if not APPLY:
    show(rescore(patch_level=not done2))
    print("\nRun again with --apply to write (backs up first).")
    sys.exit(0)

os.makedirs(BACKUP_DIR, exist_ok=True)
ups = None
backup = {"taken": datetime.datetime.now().isoformat(), "gen2_baseline_before": old_bl, "rows_21oct": [g1, g2],
          "rescore_rows_before": get(f"diesel_readings?store_location=eq.Akure%201&date=gte.{RESCORE_FROM}&select=id,date,generator_id,discrepancy_litres,discrepancy_flag")}
json.dump(backup, open(os.path.join(BACKUP_DIR, "backup.json"), "w", encoding="utf-8"), indent=1, default=str)
print("\nbacked up to", BACKUP_DIR)
if not old_bl:
    out = req("POST", "generator_baselines?on_conflict=generator_id", [baseline_row], prefer="resolution=merge-duplicates,return=representation")
    assert len(out) == 1 and float(out[0]["avg_litres_per_hour"]) == NEW_RATE
    print("  wrote Generator 2 rate", NEW_RATE)
if not done2:
    for r, ch in plan:
        out = req("PATCH", f"diesel_readings?id=eq.{r['id']}", ch)
        assert len(out) == 1
        print("  wrote 21 Oct", gens[r["generator_id"]]["name"], "ok" if all((float(out[0][k]) if isinstance(v, (int, float)) and not isinstance(v, bool) else out[0][k]) == v for k, v in ch.items()) else "MISMATCH")
ups = rescore(patch_level=False)
assert not any(u[0] in (g1["id"], g2["id"]) for u in ups), "21 Oct does not match the re-score"
show(ups)
with contextlib.redirect_stdout(io.StringIO()):
    bf.write(sb, ups)
print(f"  wrote {len(ups)} re-scored readings")
left = rescore(patch_level=False)
print("  check: still to update after writing:", len(left))
