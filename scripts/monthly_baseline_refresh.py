#!/usr/bin/env python
r"""
FleetPro: monthly baseline refresh -- recalc_baselines + backfill_discrepancy_flags,
safe to run unattended (it is scheduled to run on the 1st of every month).

Since the 2026-10-05 access rules, a store's own saves no longer nudge its
generator's baseline, so baselines only move when this (or recalc_baselines.py)
runs. Each run:

  1. Works out every generator's new litres-per-hour baseline and HOLDS BACK
     (does not write) any that look wrong:
       - an existing baseline moving more than 25% in one go
       - a value outside 1-60 L/hr
       - a first-ever baseline built from fewer than 10 day-pairs
  2. Re-scores the LAST 90 DAYS of readings against the baselines it is about
     to write (older readings keep the judgement made in their own time -- a
     recent baseline must not re-judge last year), and keeps only the changes
     that matter: a flag turning on or off, or the stored gap moving by 5 L or more. 1-4 L rounding drift is skipped so that
     Settings -> Change history is not flooded with thousands of script edits.
  3. STOPS, writing nothing at all, if more than 400 flags would turn on or off.
  4. Backs up everything it is about to overwrite, then writes.

Baselines are learned from the last 90 days (see recalc_baselines.py).

Usage (run from the folder that holds SupabaseCreds.env):
  py scripts\monthly_baseline_refresh.py                 # preview, writes nothing
  py scripts\monthly_baseline_refresh.py --apply         # back up, then write
  py scripts\monthly_baseline_refresh.py --apply --accept "Ondo CR Generator"
        # also write a baseline that the 25% check held back, once a person
        # has looked at it (repeat --accept for several; names as printed)
  py scripts\monthly_baseline_refresh.py --restore DIR   # put a backup back

Backups go to ..\fleetpro-backups\baseline-refresh\<date-time>\ beside the
repo folder (override with FLEETPRO_BACKUP_DIR). Exit code 2 = stopped by a
safety check, nothing written.
"""
import contextlib
import datetime
import io
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import recalc_baselines as rb  # noqa: E402
import backfill_discrepancy_flags as bf  # noqa: E402

MAX_MOVE = 0.25          # hold back a baseline that moves more than this in one run
RATE_RANGE = (1.0, 60.0)  # L/hr; anything outside is a data problem, not a generator
MIN_PAIRS_NEW = 10       # day-pairs needed before a generator gets its FIRST baseline
MIN_GAP_CHANGE_L = 5     # smaller changes to a stored gap are rounding drift
MAX_FLIPS = 400          # more flags than this turning on/off = something is wrong


def vet(updates, old, names=None, accept=()):
    keep, held = [], []
    accept = {a.strip().lower() for a in accept}
    for u in updates:
        new, pairs = u["avg_litres_per_hour"], u["baseline_readings_count"]
        prev = (old.get(u["generator_id"]) or {}).get("avg_litres_per_hour")
        why = None
        if not RATE_RANGE[0] <= new <= RATE_RANGE[1]:
            why = f"{new} L/hr is outside {RATE_RANGE[0]:g}-{RATE_RANGE[1]:g} L/hr"
        elif prev and abs(new - prev) / prev > MAX_MOVE:
            why = f"would move {prev} -> {new} L/hr ({(new - prev) / prev:+.0%})"
            if (names or {}).get(u["generator_id"], "").strip().lower() in accept:
                print(f"  ACCEPTED   {names[u['generator_id']]}: {why} -- written because of --accept")
                why = None
        elif not prev and pairs < MIN_PAIRS_NEW:
            why = f"first baseline from only {pairs} day-pairs"
        (held if why else keep).append((u, prev, why))
    return keep, held


def matters(f):
    _, litres, flag, old_litres, old_flag = f[:5]
    return (bool(flag) != bool(old_flag) or old_litres is None
            or abs(litres - old_litres) >= MIN_GAP_CHANGE_L)


def backup_root():
    return Path(os.environ.get("FLEETPRO_BACKUP_DIR") or Path.cwd().parent / "fleetpro-backups" / "baseline-refresh")


def restore(folder):
    data = json.loads((folder / "backup.json").read_text(encoding="utf-8"))
    sb, sbf = rb.connect(), bf.connect()
    for row in data["baselines_before"]:
        row = {k: row.get(k) for k in ("generator_id", "avg_litres_per_hour", "baseline_readings_count",
                                       "last_calculated", "min_rate", "max_rate")}
        sb._req("POST", "generator_baselines", params={"on_conflict": "generator_id"}, body=[row],
                extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
    for gid in data["new_baseline_ids"]:
        sb._req("DELETE", "generator_baselines", params={"generator_id": f"eq.{gid}"})
    for rid, litres, flag in data["readings_before"]:
        sbf.patch("diesel_readings", rid, {"discrepancy_litres": litres, "discrepancy_flag": flag})
    print(f"Restored {len(data['baselines_before'])} baselines, removed {len(data['new_baseline_ids'])} new ones, "
          f"restored {len(data['readings_before'])} readings from {folder}")


def main():
    with contextlib.suppress(Exception):
        sys.stdout.reconfigure(encoding="utf-8")
    args = sys.argv[1:]
    if "--restore" in args:
        return restore(Path(args[args.index("--restore") + 1]))
    apply_mode = "--apply" in args
    sb, sbf = rb.connect(), bf.connect()
    names = {g["id"]: g["name"] for g in sb.select_all("generators", "id,name")}

    print("=== 1. BASELINES (litres per hour) ===")
    updates, old = rb.compute(sb)
    accept = [args[i + 1] for i, a in enumerate(args) if a == "--accept" and i + 1 < len(args)]
    keep, held = vet(updates, old, names, accept)
    moved = [(u, prev) for u, prev, _ in keep if prev is None or round(prev, 2) != u["avg_litres_per_hour"]]
    print(f"\n  {len(keep)} to write ({len(moved)} change), {len(held)} held back")
    for u, prev, why in held:
        print(f"  HELD BACK  {names.get(u['generator_id'], u['generator_id'])}: {why}. Left at {prev or 'no baseline'} -- needs a person to look.")
    if any("would move" in why for *_, why in held):
        print('  To accept one after checking it: add  --accept "<generator name>"  to the --apply run.')

    print("\n=== 2. DISCREPANCY FLAGS (re-scored against the baselines above) ===")
    with contextlib.redirect_stdout(io.StringIO()):
        scored = bf.compute(sbf, rates={u["generator_id"]: u["avg_litres_per_hour"] for u, *_ in keep})
    cutoff = (datetime.date.today() - datetime.timedelta(days=rb.RECENT_DAYS)).isoformat()
    older = sum(1 for f in scored if matters(f) and f[6] < cutoff)
    writes = [f for f in scored if matters(f) and f[6] >= cutoff]
    on = [f for f in writes if f[2] and not f[4]]
    off = [f for f in writes if f[4] and not f[2]]
    print(f"  {len(writes)} readings to update: {len(on)} newly flagged, {len(off)} no longer flagged, "
          f"{len(writes) - len(on) - len(off)} gap figure moved >= {MIN_GAP_CHANGE_L} L "
          f"({len(scored) - len(writes) - older} smaller rounding changes skipped; "
          f"{older} readings older than {rb.RECENT_DAYS} days keep their existing flags)")
    for label, rows in (("Newly flagged", on), ("No longer flagged", off)):
        per = {}
        for f in rows:
            per[f[5] or "?"] = per.get(f[5] or "?", 0) + 1
        if per:
            print(f"  {label}: " + ", ".join(f"{s} {n}" for s, n in sorted(per.items(), key=lambda x: -x[1])))
    for f in sorted(on, key=lambda f: f[6], reverse=True)[:15]:
        print(f"    flagged  {f[5]} {f[6]}  gap {f[1]:+} L")

    if len(on) + len(off) > MAX_FLIPS:
        print(f"\nSTOPPED: {len(on) + len(off)} flags would turn on/off (limit {MAX_FLIPS}). "
              "Nothing was written. A baseline or a recent import probably needs checking first.")
        return 2
    if not apply_mode:
        print("\nPREVIEW ONLY -- nothing written. Re-run with --apply.")
        return 0

    stamp = datetime.datetime.now().strftime("%Y-%m-%d_%H%M")
    folder = backup_root() / stamp
    folder.mkdir(parents=True, exist_ok=True)
    before = sb.select_all("generator_baselines", "*")
    had = {b["generator_id"] for b in before}
    (folder / "backup.json").write_text(json.dumps({
        "baselines_before": before,
        "new_baseline_ids": [u["generator_id"] for u, *_ in keep if u["generator_id"] not in had],
        "readings_before": [[f[0], f[3], bool(f[4])] for f in writes],
    }, indent=1, default=str), encoding="utf-8")
    print(f"\nBackup: {folder}")

    rb.write(sb, [u for u, *_ in keep])
    bf.write(sbf, writes)
    print(f"\nDONE. To undo this run: py scripts\\monthly_baseline_refresh.py --restore \"{folder}\"")
    return 0


if __name__ == "__main__":
    sys.exit(main())
