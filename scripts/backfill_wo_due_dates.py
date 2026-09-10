#!/usr/bin/env python
r"""
FleetPro: Back-fill `due` dates on the 432 imported work orders that have none.

WHY
433 of 614 work_orders rows have a blank `due`. `work_orders.due` is a TEXT
column and the app writes `due: w.due||""`, so "no due date" is stored as an
EMPTY STRING, not NULL (a `due=is.null` query returns 0 -- the blanks only show
up as falsy in JS). Because ReportsPage.inRange used to return true for a falsy
date, those rows passed every date filter and the Maintenance & WO tab showed
the same 432 Completed / N33.3M for any range. inRange is fixed, but the rows
still carry no date, so they now fall out of every dated report. This script
gives them their real dates back.

SOURCE
"service_entries (1).csv" -- a Fleetio service-entries export, 433 rows, with a
`Completed At` column (real dates 2022-01-25 .. 2026-02-18). This is the file
the original import was built from.

MATCHING
Not by content: the importer TRUNCATED `descr` (~60 chars) and re-joined
multi-task entries with "|", so ~24 rows do not match on description. Instead
the rows are aligned POSITIONALLY -- the WO ids are sequential (WO-0001 ..
WO-0433) and follow the CSV's file order exactly -- with a two-pointer walk
keyed on (vehicle name, total cost) that tolerates CSV rows the original import
skipped. Exactly one such row exists (AKR891ZN MAN DIESEL TRUCK, N31,000,
04 Jul 2024) whose vehicle is not in the fleet; from that point on a naive
positional match is off by one, which is why the walk is needed. Result:
432/432 aligned, 0 unmatched, and the description independently corroborates
95% of the pairs.

SAFETY
- Only touches rows whose `due` is currently blank AND whose id matches WO-NNNN.
  WO-MOSSEEPB (a hand-entered "test" work order, also undated) is left alone.
- Dry run by default; --apply writes. Idempotent: a second run finds nothing.
- --limit N to write only the first N (for a cautious first pass).

Usage:
  py scripts\backfill_wo_due_dates.py                     # dry run + full report
  py scripts\backfill_wo_due_dates.py --verbose           # also list every pair
  py scripts\backfill_wo_due_dates.py --apply
"""
import csv
import datetime
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

DEFAULT_CSV = Path.home() / "Documents" / "service_entries (1).csv"
WO_ID_RE = re.compile(r"WO-[0-9]+$")


def load_env_file():
    here = Path(__file__).resolve().parent.parent
    for base in (Path("."), here, here.parent, Path.home() / "Documents" / "fleetpro"):
        for name in (".env", "SupabaseCreds.env", "supabase.env"):
            p = base / name
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
        self.headers = {"apikey": key, "Authorization": "Bearer " + key,
                        "Content-Type": "application/json"}

    def _req(self, method, path, params=None, body=None, extra_headers=None):
        full = self.url + "/rest/v1/" + path
        if params:
            full += "?" + urllib.parse.urlencode(params, doseq=True)
        data = json.dumps(body).encode("utf-8") if body is not None else None
        headers = dict(self.headers)
        if extra_headers:
            headers.update(extra_headers)
        req = urllib.request.Request(full, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                raw = resp.read()
                return json.loads(raw) if raw else []
        except urllib.error.HTTPError as e:
            raise RuntimeError("HTTP %s %s %s: %s" % (
                e.code, method, path, e.read().decode("utf-8", "replace"))) from e

    def select_all(self, table, columns, page=1000):
        out, offset = [], 0
        while True:
            chunk = self._req("GET", table, params={
                "select": columns, "limit": str(page), "offset": str(offset)})
            out.extend(chunk)
            if len(chunk) < page:
                return out
            offset += page

    def patch(self, table, id_val, body):
        return self._req("PATCH", table, params={"id": "eq." + id_val}, body=body,
                         extra_headers={"Prefer": "return=minimal"})


def norm(x):
    return " ".join((x or "").strip().lower().split())


def money(x):
    try:
        return round(float(x or 0))
    except (TypeError, ValueError):
        return 0


def to_iso(s):
    """Fleetio exports MM/DD/YYYY hh:mm:ss AM/PM."""
    return datetime.datetime.strptime(s.strip().split()[0], "%m/%d/%Y").date().isoformat()


def align(wos, rows):
    """Two-pointer walk in file order, keyed on (vehicle, cost).

    Advances the CSV pointer past rows the original import skipped (looking a few
    ahead so one dropped row does not desynchronise everything after it).
    """
    def wkey(w):
        return (norm(w["asset"]), money(w["cost"]))

    def rkey(r):
        return (norm(r["Vehicle Name"]), money(r["Total Cost (NGN)"]))

    pairs, csv_only, wo_only = [], [], []
    i = j = 0
    while i < len(wos) and j < len(rows):
        if wkey(wos[i]) == rkey(rows[j]):
            pairs.append((wos[i], rows[j]))
            i += 1
            j += 1
            continue
        hit = next((k for k in range(j + 1, min(j + 6, len(rows)))
                    if rkey(rows[k]) == wkey(wos[i])), None)
        if hit is not None:
            csv_only.extend(rows[j:hit])
            j = hit
            continue
        wo_only.append(wos[i])
        i += 1
    wo_only.extend(wos[i:])
    csv_only.extend(rows[j:])
    return pairs, csv_only, wo_only


def main(argv):
    apply_mode = "--apply" in argv
    verbose = "--verbose" in argv
    limit = None
    for a in argv:
        if a.startswith("--limit="):
            limit = int(a.split("=", 1)[1])
    csv_path = next((Path(a) for a in argv[1:] if a.lower().endswith(".csv")), DEFAULT_CSV)

    if not csv_path.exists():
        print("ERROR: CSV not found: %s" % csv_path)
        sys.exit(1)

    load_env_file()
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required.")
        sys.exit(1)
    sb = Supabase(url, key)

    print("=== SOURCE ===")
    rows = list(csv.DictReader(open(csv_path, encoding="utf-8-sig")))
    rows = [r for r in rows if (r.get("Completed At") or "").strip()]
    print("  %s" % csv_path)
    print("  %d service entries with a Completed At date" % len(rows))

    print("\n=== TARGET ===")
    wo = sb.select_all("work_orders", "id,asset,descr,cost,due,status")
    undated = [w for w in wo if not (w.get("due") or "").strip()]
    seq = sorted([w for w in undated if WO_ID_RE.fullmatch(w["id"])],
                 key=lambda w: int(w["id"].split("-")[1]))
    skipped_ids = [w for w in undated if not WO_ID_RE.fullmatch(w["id"])]
    print("  %d work_orders total, %d with a blank due date" % (len(wo), len(undated)))
    print("  %d of those are sequential imports (%s .. %s) -- the backfill target"
          % (len(seq), seq[0]["id"] if seq else "-", seq[-1]["id"] if seq else "-"))
    for w in skipped_ids:
        print("  leaving alone (not an import): %s | %s | %s"
              % (w["id"], w["asset"], (w["descr"] or "")[:40]))
    if not seq:
        print("\nNothing to do -- every imported work order already has a due date.")
        return

    pairs, csv_only, wo_only = align(seq, rows)
    print("\n=== ALIGNMENT ===")
    print("  matched     : %d / %d" % (len(pairs), len(seq)))
    print("  unmatched WO: %d" % len(wo_only))
    print("  CSV-only    : %d" % len(csv_only))
    for r in csv_only:
        print("     CSV row with no work order: %s | N%s | %s | %s"
              % (r["Vehicle Name"], r["Total Cost (NGN)"],
                 r["Service Tasks"][:40], r["Completed At"].split()[0]))
    for w in wo_only:
        print("     work order with no CSV row: %s | %s | N%s"
              % (w["id"], w["asset"], w["cost"]))

    corrob = sum(1 for w, r in pairs
                 if norm(w["descr"])[:40] == norm(r["Service Tasks"])[:40])
    print("  description independently corroborates %d/%d pairs (%.1f%%)"
          % (corrob, len(pairs), corrob / len(pairs) * 100 if pairs else 0))

    updates = [(w["id"], to_iso(r["Completed At"])) for w, r in pairs]
    if limit:
        updates = updates[:limit]
    years = Counter(d[:4] for _, d in updates)
    print("\n=== PLAN ===")
    print("  set `due` on %d work orders" % len(updates))
    print("  date range: %s .. %s" % (min(d for _, d in updates), max(d for _, d in updates)))
    print("  by year: %s" % dict(sorted(years.items())))

    if verbose:
        print("\n  every pair:")
        for w, r in pairs:
            print("     %-12s %-42s N%-10s -> %s | %s"
                  % (w["id"], w["asset"][:42], w["cost"],
                     to_iso(r["Completed At"]), r["Service Tasks"][:38]))
    else:
        print("\n  first 10:")
        for w, r in pairs[:10]:
            print("     %-12s %-42s N%-10s -> %s"
                  % (w["id"], w["asset"][:42], w["cost"], to_iso(r["Completed At"])))
        print("     ... (--verbose for all)")

    if wo_only:
        print("\n  NOTE: %d work order(s) could not be matched and will keep a blank"
              " due date." % len(wo_only))

    if not apply_mode:
        print("\nDRY RUN -- no writes. Re-run with --apply.")
        return

    print("\n=== WRITING %d updates ===" % len(updates))
    done = 0
    for wid, due in updates:
        sb.patch("work_orders", wid, {"due": due})
        done += 1
        if done % 50 == 0:
            print("  ...%d/%d" % (done, len(updates)))
    print("  Updated %d work orders." % done)
    print("\nDONE. Reload FleetPro (the app fetches once on mount) and the"
          " Maintenance & WO report will now respond to the date range.")


if __name__ == "__main__":
    main(sys.argv)
