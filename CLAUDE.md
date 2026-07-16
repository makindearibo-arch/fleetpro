# FleetPro - Project Context for Claude Code

## What is FleetPro?

FleetPro is a React-based fleet management web application built by **MicMakin** (Makinde Aribo). It manages a fleet of ~29 older vehicles and 20+ store locations across southwestern Nigeria (Akure, Ondo, Ado, Owo, Ikare, etc.). The app covers vehicle tracking, fuel logging, diesel management, inspections, work orders, and GPS live tracking.

## Tech Stack

- **Frontend**: React 18 with react-router-dom v6, inline styles (no CSS framework), Vite build tool
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
  - URL: `https://bddmsrbfygbuyfdpieyl.supabase.co`
  - Anon key in `src/supabase.js`
- **Deployment**: Vercel with GitHub auto-deploy from `makindearibo-arch/fleetpro` (branch: `main`)
  - `vercel.json` has a rewrite rule for SPA routing
- **GPS Server**: Traccar (self-hosted) on DigitalOcean VPS
  - IP: `178.62.48.233`
  - Domain: `tracker.micmakin.com` (SSL via Let's Encrypt + nginx reverse proxy)
  - Traccar web UI: `https://tracker.micmakin.com` (port 8082 proxied through nginx)
  - Tracker data port: `5013` (GT06/H02 protocol, direct TCP — NOT proxied)
  - Traccar admin credentials: stored in Vercel env vars + 1Password (NOT in this file)
- **GPS Hardware**: SinoTrack ST-906L (4G) with Nigerian MTN SIM cards
  - SMS command password: SinoTrack factory default (changeable via `7770000 newpass`)
  - APN: `web.gprs.mtnnigeria.net,web,web`
  - Currently 1 tracker installed, plan is ~30 units

## Vercel Environment Variables

Names only — actual values live in Vercel → Project → Settings → Environment Variables. **Never commit real values to this file.**

```
VITE_TRACCAR_URL=https://tracker.micmakin.com
VITE_TRACCAR_EMAIL=<set in Vercel>
VITE_TRACCAR_PASSWORD=<set in Vercel>
VITE_GOOGLE_MAPS_KEY=<set in Vercel>
```

## File Structure

```
src/
  App.jsx          (~1284 lines) - Monolithic main app, ALL page components live here
  LiveMapPage.jsx  (~566 lines)  - GPS Live Map page (separate file, Google Maps)
  db.js            (~210 lines)  - Supabase database helpers
  traccar.js       (~141 lines)  - Traccar GPS API helper
  supabase.js      - Supabase client init
  main.jsx         - React entry point
  index.css        - Minimal global styles
setup-stores.js    - One-time script to create store locations + staff accounts
.npmrc             - Contains `legacy-peer-deps=true` (needed for react-leaflet peer dep)
```

## CRITICAL: Editing App.jsx

**App.jsx is ~1284 lines and monolithic.** The Edit tool in Cowork mode sometimes truncates large files. **ALWAYS use bash/python for App.jsx edits** — read the file, make targeted replacements with sed or python, and verify the result. Never try to rewrite it entirely.

## Architecture

### Roles
- **Super Admin**: Full access to everything
- **Fleet Manager**: Can edit vehicles, fuel, work orders, etc.
- **Store Staff**: Limited access — sees only their assigned store's diesel log, generators, staff dashboard, and settings (profile only)
- **Viewer**: Read-only access

### Navigation (defined in NAV array, line ~1024 of App.jsx)
Dashboard, Staff Dashboard (My Dashboard), Diesel Log, Diesel Management, Vehicles, Generators, Drivers, Fuel & Energy, Work Orders, Vehicle Papers, Service Reminders, Inspections, Vendors, Reports, **Live Map**, Settings

Store Staff only sees: Staff Dashboard, Diesel Log, Generators, Settings

### Key Variables in App.jsx
- `user` — current authenticated user profile from Supabase
- `isStoreStaff` — `user?.role === "Store Staff"` (defined at line ~1197)
- `userStore` — **only available inside DieselLogPage**, NOT in App scope. Use `user?.store_location` in App scope instead.
- `isMob()` — global function checking `window.innerWidth < 768`
- `P` — primary blue color `"#0F62FE"`

### Data Mappers (lines 11-45 of App.jsx)
All DB columns use snake_case. The app uses camelCase internally. Mapper functions convert between them:
- `toV/fromV` — vehicles
- `toG/fromG` — generators
- `toFL/fromFL` — fuel logs
- `toWO/fromWO` — work orders
- `toP/fromP` — vehicle papers
- `toSR/fromSR` — service reminders
- `toDR/fromDR` — diesel readings
- `toDP/fromDP` — diesel purchases
- `toDD/fromDD2` — diesel distributions

### Shared Components (defined in App.jsx)
- `Badge` — status badge with color
- `Kpi` — KPI card with icon
- `Modal` — slide-up modal (mobile) or centered (desktop)
- `Field` — form field wrapper
- `SearchSelect` — searchable dropdown

## Database Schema (Supabase)

### Key Tables
- `profiles` — id, name, email, role, store_location, avatar
- `vehicles` — id, name, type, year, status, km, driver, loc, plate, etc.
- `generators` — id (NOT auto-generated, use `gen_random_uuid()`), name, brand, cap, status, hrs, loc (location NAME string, not ID), etc.
- `locations` — id, name
- `fuel_logs` — asset, date, litres, cost, reading, station, is_gen, fuel_type
- `work_orders` — asset, type, priority, status, descr, assignee, due, cost, is_gen
- `vehicle_papers` — vehicle, doc_type, issue_date, expiry_date, status, note
- `service_reminders` — vehicle, type, interval_km, interval_days, etc.
- `inspections` — vehicle-related inspections with odometer
- `drivers`, `vendors`, `vendor_types`, `doc_types`

### Diesel Module Tables
- `diesel_readings` — generator_id, store_location, date, gen_hours_opening, gen_hours_closing, hours_run (GENERATED column — do NOT INSERT), diesel_level_actual, diesel_level_theoretical, diesel_added, consumption_litres, consumption_rate, discrepancy_litres, discrepancy_flag, submitted_by (UUID type — use NULL for non-user entries), notes, gen_photo_url, nepa_hours, nepa_meter_opening, nepa_meter_closing
- `diesel_purchases` — date, supplier, litres (PAID/invoice, drives cost), litres_received (ACTUAL out of tanker, drives stock; NULL=same as paid), price_per_litre, total_cost (generated), purchased_by. Rows with supplier `STOCK RECONCILIATION` are opening-balance adjustments from a physical stock take (Super-Admin-only "Reconcile Stock" button in Diesel Management): excluded from Total Purchased / avg price / excess, but their litres count toward Stock in Hand. relink_purchase_ids.py skips them. Excess = received − paid = free measurement gain (migration `20260612_purchase_received_litres.sql`). App add/edit purchase has Paid + Received fields; table shows Paid/Received/Excess; Stock in Hand = Σreceived − Σdistributed; FIFO relink allocates against received capacity. `scripts/reconcile_excess.py` reads the sheet's "X litres excess from bulk of Y" notes (15 notes = 10,094 L) and sets litres_received on the matching tanker purchases by size+nearest date.
- `diesel_distributions` — purchase_id, date, store_location, litres, received_confirmed, received_by, distributed_by. **Diesel-received is ACCEPTANCE-GATED in the Diesel Log (2026-06-28)**: DieselLogPage shows a "Diesel Received Today" section listing admin deliveries to this store for the entry date with an **Accept** button (sets received_confirmed/received_date/received_by); a reading's `diesel_added` counts ONLY accepted (`confirmed`) deliveries for that store+date — staff do NOT type diesel added. Saving with an unaccepted same-day delivery prompts a warning. **Accepting BACK-PROPAGATES (2026-07-06)**: `applyAcceptToReading()` (App.jsx, called from all 3 Accept paths) folds the accepted litres into the same-day saved reading — added += litres, stored discrepancy −= litres, flag re-evaluated (20% + 25 L floor) — because a delivery recorded/accepted AFTER the reading was saved otherwise reads as a phantom +litres discrepancy (Okitipupa CR Jun 13: reading saved day 1, 3,000 L dist recorded+accepted day 3 → 3003% flag; data-fixed). Related gotchas fixed same day: `toDR` mapped discrepancy 0 → null (`Number(x)||null`), and `fetchAll` pages now tiebreak `.order('id')` — paging on non-unique `date` duplicated rows across page boundaries (phantom duplicate readings in UI lists). **Save guards (2026-07-06)**: (a) MISSED-DAY warning — saving a new reading whose previous reading is >1 day back warns that days will lump and that deliveries on the skipped day(s) will never be counted (log the missed days first via the date picker); (b) closing gen-hours below opening is BLOCKED (Akure 4 typed 500 after 520 → −300 L consumption, data-nulled); (c) at oven+generator stores, deliveries count ONLY on the generator's reading — the oven shows/stores 0 added (Ondo Bakery Jul 4 double-counted 2,000 L on both; data-fixed). All three verified live in the local preview (confirm() hooked, no data written). No local-purchase entry (per user: all diesel comes through admin distribution). The Staff Dashboard → Supply tab still has its own "Accept Delivery" list (same flag), and the Staff Dashboard now shows a **top-of-page alert banner** listing un-accepted deliveries from the last 30 days (per-store, independent of the tab/date filter) with per-row Accept + "Accept all" — so staff proactively see new diesel without hunting. Scoped to 30d so old un-accepted imported distributions don't spam it. Historical/imported readings keep their sheet-derived `diesel_added` (unaffected; only new app saves use the accepted-only rule).
- `store_diesel_stock` — store stock tracking
- `generator_baselines` — generator_id, avg_litres_per_hour, baseline_readings_count, last_calculated, min_rate, max_rate (NO threshold_pct column — hardcode 20%)

### Important Schema Notes
- `generators.id` does NOT auto-generate — must use `gen_random_uuid()` in INSERTs
- `generators.loc` stores location NAME (string), not location ID
- `diesel_readings.hours_run` is a GENERATED column (auto-calc from gen_hours_closing - gen_hours_opening) — do NOT include in INSERTs
- `diesel_readings.submitted_by` is UUID type — use NULL for imports, not text strings
- `generator_baselines` has NO `threshold_pct` column — use hardcoded 20% for discrepancy detection

## Store Locations (24 stores + Warehouse)

### Bakery (7)
Akure Bakery, Ondo Bakery, Owo Bakery, Ado Bakery, Oye Bakery, Ikare Bakery, Okitipupa Bakery

### Chicken Republic (17)
Akure 1-6, Owo CR, Ondo CR, Ado 1-3, Ikare CR, Akungba CR, Okitipupa CR, Igbokoda CR, Idanre CR, Ondo 2 CR

### Store Staff Accounts
Created via `setup-stores.js`. Each store has an email like `Akure1.CR@Micmakin.com` with role "Store Staff" and `store_location` matching the location name. Passwords are in `setup-stores.js`.

## Diesel Tracking Module — Status

### Completed (Phases 1-3)
- **Phase 1**: Supabase tables, Store Staff role, DieselLogPage (photo-first + manual fallback, NEPA tracking), 24 store accounts
- **Phase 2**: DieselMgmtPage (admin-only, 6 tabs: Overview, Purchases, Distributions, Stores, Baselines, Discrepancies), purchase-to-distribution tracking, vendor types in Settings
- **Phase 3**: StaffDashboardPage at `/staff-dashboard`, date filters (7d/30d/This Month/Last Month/This Year/Last Year + custom), KPI cards, daily consumption bar chart, 3 tabs (Supply, History, Generators), Reports with CSV/PDF export, calculation engine (auto-learn baselines, discrepancy detection at 20% threshold)

### Historical Import (Partially Done)
- Test import completed for 4 stores:
  - Akure 6: 467 readings (Jan 2025 – Apr 2026), generator_id = `308ca49f-c94a-42b6-a32a-65e7be1dba3a`. Baseline flagged 45.6%
  - Ado 1: 121 readings (Jan 2026 – Apr 2026), generator_id = `cc9b62f3-eb66-4f08-ac8d-ec51b0c2175e`. Baseline flagged 33.9%
  - **Akure 1 — REFRESHED 2026-07-13**: 498 readings Mar 1 2025–Jul 12 2026 from `AKURE 1 DIESEL REPORT (3).xlsx` via `scripts/import_akure1.py` (`--replace`; deleted all 456 old rows incl. 1 app entry). WIDE layout (RECEIVED BY col 7 shifts cols right of TRANSFER OUT by one): closing col 10, cons 11, gen hours 13/14, NEPA 17/18; tabs "APRIL"/"MAY" have no year (=2026), "JULY2026" no space. 79,029 L purchases; transfer col 6 is bare litres (no vehicle names in this version) → +49 new `diesel_transfers` (dedup by date+litres vs the 316 reconstructed ones; now 365 = 41,952 L). Store-level balance coherent: added 79,029 ≈ consumed 38,092 + transferred 41,952. Hour-meter discipline remains poor (~51 backwards rows, 39 negative-consumption sheet typos imported as-sheet; e.g. 610 L in "0.2 h") → baseline stays on the positive-rate-mean fallback (33.32), 62% flagged = meter discipline, not necessarily theft. Hours synced to 8,744.
  - **Owo CR**: 181 readings (Jan – Jun 2026), generator_id = `G-012`. Baseline 6.60 L/hr (range 3.33–13.33); flagged only 15.0% — cleanest baseline so far because OWO CR has NO vehicle transfers. Confirms the high flag rates elsewhere are driven by transfer-out, not bad data.
  - **Okitipupa CR**: 153 readings across TWO generators (the hour meter reset ~25,277→~145 in May = a second unit took over). Jan–Apr (120 readings) → `Okitipupa 2nd Generator` (G-010, old unit, baseline 10.17 L/hr); May–Jun (33 readings) → `Okitipupa CR Generator` (new unit, baseline 10.00 L/hr). NOTE: Okitipupa's baselines are self-referential — the sheet derives closing tank stock from an assumed flat 10 L/hr rather than measured levels, so consumption ≈ hours×10 by construction. Real variance will only appear once staff log actual tank levels in-app. Script: `scripts/import_okitipupa_cr.py`.
- Admin diesel supply imported (Jan–Apr 2026):
  - 14 `diesel_purchases` (incl. the pre-existing test row)
  - 118 `diesel_distributions` to 19 stores; 2 flagged `is_overage`
- **IMPORTANT — column layouts differ per store template.** Akure 1 has a `DIESEL RECEIVED BY` column; OWO CR does NOT, so OWO's columns from G(7) rightward shift left by one. Each store may need its own column map. Verify with header rows + arithmetic (opening − closing = consumption; close − open = hours run) before importing.
- Import scripts (canonical, in repo, stdlib-only REST, dedup by key, `--apply` + `--recalc-baseline`, read creds from `.env`/`SupabaseCreds.env`):
  - `scripts/import_akure1_and_supply.py` — Akure 1 readings + admin purchases/distributions (Akure 1 column map, has RECEIVED BY)
  - `scripts/import_owo_cr.py` — OWO CR readings (OWO column map, no RECEIVED BY)
  - `scripts/import_okitipupa_cr.py` — Okitipupa CR readings, splits across 2 generators by month, re-dates a mislabeled tab
  - `scripts/consolidate_generators.py` — one-time dedup of imported duplicate generators + location inference
  - `scripts/setup_store_generators.py` — assign/rename generators + create one per location that lacks one
  - `scripts/audit_generators.py` — read-only: lists generators vs locations, flags stores with no generator
- Generators table now has ~26 rows (one+ per store). `generators.id` is TEXT (mix of `G-NNN`, UUIDs); new ones created via `crypto.randomUUID()` (app) or `uuid4` (scripts).
- **Bakery ovens (2026-06-10)**: ovens are rows in `generators` with `asset_type='oven'` (migration `20260610_ovens_and_batches.sql` adds `generators.asset_type` + `diesel_readings.batches_produced`). Oven-only stores: Akure/Ado/Ikare/Okitipupa Bakery (their placeholder "X Generator" rows get converted by `scripts/setup_bakery_assets.py`). Oven+gen stores: Ondo/Owo/Oye Bakery. Oven template columns: BATCHES=12, rate=L/batch=13, no hour meter/NEPA. `scripts/import_bakeries.py` imports all 10 bakery files (~1,827 readings, Ado+Okitipupa back to Jul 2025); it auto-detects shifted date columns (Ikare JUNE) and Oye's minutes-based gen meter (÷60; Oye switched to an hours meter in June 2026 — values stay continuous). DieselLogPage hides meter/NEPA sections for ovens and asks "Batches Produced" instead (live L/batch preview); Readings tab has a Batches column + L/batch KPI.
  - **Oven consumption fix (2026-07-13)**: `handleSave` was generator-shaped — it set `consumption_litres = hours_run × rate`, which is NULL for ovens (no hour meter), and stored a bogus 15 L/hr fallback rate. Every app-entered oven reading showed "-" for consumption (188 rows across all 7 bakeries). Fixed: for `asset_type==='oven'`, consumption = the measured tank drop (`prev_level + added − transfers − current_level`, clamped ≥0) and rate = **L/batch** (`consumption / batches`); ovens are also excluded from the discrepancy-flag block (they use the L/batch model, not level-vs-hours). Backfilled the 188 existing rows with `scripts/backfill_oven_consumption.py` (fills any NULL-consumption oven row from the prior reading's level; ~3.5 L/batch across bakeries). Only the very first reading of each oven stays NULL (no prior level).
  - **Akure Bakery oven re-imported from updated file (2026-06-24)**: `scripts/import_akure_bakery_oven.py` (targeted, `--replace`) re-loaded the oven from `Daily Diesel Tracker Bakery Oven AKURE BAKERY 2026 (1).xlsx` — 174 readings Jan 1–Jun 24 (was 164), replacing 6 sparse app entries (Jun 19–24). Overall 3.68 L/batch, 4,197 batches, 16,000 L added. Per-tab date-col detection + oven col map (level col 8/9, BATCHES 12, L/batch 13). GOTCHA: a trailing template row (blank closing → 0, no batches) leaves a bogus consumption = opening − 0; the importer requires closing>0 OR batches>0 (consumption alone is NOT enough) to skip it. Use this same standalone-`--replace` pattern to refresh any single bakery from a newer file instead of re-running the all-bakeries `import_bakeries.py`.
- Historical discrepancy flags back-filled, now TRANSFER-AWARE (last run 2026-06-11): 1,606 evaluated, 696 flagged (43.3%). Per store: Ondo Bakery 6%, Oye Bakery 10%, Owo CR 16%, Owo Bakery 28%, Akure 6 49%, Okitipupa ~0–1% (self-referential), **Ado 1 90%** (original import kept no transfer columns — re-import its sheet to fix), **Akure 1 89%** (transfers now subtracted, baseline fell 46.53→32.25, but its hour-meter data is unreliable — e.g. 338 L in "0.3 h" — so flags reflect meter discipline, not just theft). 381 historical transfers reconstructed (65 from notes at the bakeries + 316 from the Akure 1 sheet = 36,491 L to vehicles). Re-run order after any import/transfer change: `backfill_transfers_from_notes.py` / `import_akure1_transfers.py` → `recalc_baselines.py --apply` → `backfill_discrepancy_flags.py --apply`.

### Pending Diesel Tasks
1. **Fix Staff Dashboard data display** — user said "There is lot to discuss on that"
2. **Vehicle diesel transfer feature — BUILT (2026-06-10)**. `diesel_transfers` table (migration `20260610_diesel_transfers.sql`: date, store, source_generator_id, dest_type vehicle/oven/other, dest_id, dest_label, litres). Staff UI: Diesel Log → "Transfer Diesel" tab (date-locked like readings; vehicle picker with free-text fallback, oven picker at bakeries). Admin: Diesel Management → "transfers" tab. Save-time discrepancy + baseline learning subtract same-day transfers; Watchtower overnight-gap math credits transfers. Scripts: `backfill_transfers_from_notes.py` (parses "Transfer-out:" notes into transfer rows — vehicle "NAME (litres)" pairs matched to vehicles by plate/name, bare numbers at bakeries → oven), `recalc_baselines.py` (transfer-aware, ALL generators, replaces per-import recalcs), `backfill_discrepancy_flags.py` (now transfer-aware). Run order after any transfer data change: backfill_transfers → recalc_baselines --apply → backfill_discrepancy_flags --apply.
3. **Admin supply log — DONE (2026-06-11)**: `scripts/import_admin_supply.py` imported DIESEL REPORT TEMPLATE (3): +37 purchases (4 priced bulk May 2026 + 33 outsourced from Akinola/Sharfa/Kenny Betty at price 0 — schema requires NOT NULL; app averages exclude zero-priced litres) and +306 distributions (full Jan 2025–Jun 2026, incl. Ado 1/2/3 + Ado Bakery ~46,500 L). Dedup: purchases by (date, litres) — survives supplier renames like BOVAS→BOVAS (AKURE); dists by (date, store, litres). Name variants: ALAGBAKA*→Akure 1, bare OKITIPUPA→Okitipupa CR (assumption, 1 row). Date cells repaired via chronology-aware day/month swap capped at 60-day jumps. 8 purchases May–Jun 2025 have supplier literally "SUPPLIER" (sheet placeholder). NOTE: stores with supply but no imported readings (e.g. Akungba CR 81,300 L) now spike Watchtower's supply-gap component — signal = "needs readings import / app adoption", not theft.
3b. **Re-import Akure 6 readings WITH transfer columns** — its original Cowork-era import kept no transfer data (49% flagged; hour/level data also partly unreliable). Needs its source Excel file. **Ado 1 DONE (2026-07-02)** — see the Ado 1 bullet under item 4; its old phantom Apr-23 row (blank closing → 464 L bogus consumption) was deleted first.
4. **Roll out import to remaining stores** (Akure 3/5, Idanre, Igbokoda, Pie Express/Warehouse). Done so far: Akure 1, Akure 2, Akure 4, Akure 6, Ado 1, Owo CR, Okitipupa CR, Ikare CR, Akungba CR, Ondo CR, Ondo 2 CR, all 7 bakeries.
   - **Akure 4 (2026-07-08)**: 188 readings Jan 1–Jul 7 2026, generator `Akure 4 Generator` (47b70ec7-…), script `scripts/import_akure4.py` (`--replace`). Source `AKURE 4 Daily Diesel TEMPLATE YEAR 2026.xlsx`, narrow layout. **METER IS IN KILO-HOURS**: the DCP-10 panel reads e.g. "15.62 Kh" (photo confirmed) and the sheet records it verbatim (14.67 Jan → 15.62 Jul = ~950 real hours). Stored AS-SHEET in Kh so the app's locked opening matches what staff see/type on the panel (converting to hours would make the backwards-meter guard reject their typed closing). Consequences: hours_run ≈ 0.00–0.02/day (0.01 Kh = 10 h resolution) → consumption_rate stored NULL, NO baseline learned, store never flags via rates (min-burn floor); its tracking rides on the clean daily LEVEL data (10–200 L/day, balance-verified; 11,430 L consumed vs 11,200 added). Deleted the manager's 7 app entries (Jun 30–Jul 6) which had typed TANK LEVELS into the hours fields (550→550 → negative consumption). gen.hrs = 15.62 (panel-consistent). If Watchtower signal is ever wanted here, the store needs an hours-resolution meter.
   - **Ondo CR (2026-07-06)**: 489 readings **Mar 2025–Jul 2 2026** (longest history yet), generator `Ondo CR Generator` (cd6ee5d4-…, loc "Ondo CR"), replaced 1 app entry. Source `ONDO CR1 Daily Diesel Tracker New.xlsx`, location cell "ONDO 1", 17 monthly tabs — **tab `JUNE 2026 ` has a TRAILING SPACE**, MARCH 2025 has ~254 junk columns (harmless). Script `scripts/import_ondo_cr.py` — narrow layout (same as Ado 1/Ondo 2), MONTH_TABS maps tab→(year,month) since it spans 2 years. Real measured data: baseline **6.81 L/hr**, 14% flagged. 10,450 L purchases; one 300 L transfer (Dec 3 2025) → diesel_transfers. Hours synced to 5,746. 2 one-off sheet typos (5–14 L) imported as-sheet.
   - **Ondo Bakery generator phantom-January fix (2026-07-06)**: the store's balance sweep showed an impossible 71,673 L consumed vs 12,737 added. Root cause: in `Generator Daily Diesel Tracker ondo bakery  (1).xlsx` the **JAN 2026 tab's closing-stock cols (8/9) were never filled (col 9 = 0)**, so sheet consumption = opening − 0 (+purchases) = the whole tank daily → 62,218 phantom litres imported for January alone (Feb+ closings are filled and sane; the JUNE tab is May-dated — June data came from the earlier force-redate import). Fix: `scripts/fix_ondo_bakery_gen_jan.py` derives each Jan day's closing from the NEXT day's opening (Jan 31 ← Feb 1's opening), real January = 2,316 L. Store now: 11,872 consumed vs 12,737 added ✓; gen baseline 4.59, 11% flagged. **Watch for this blank-closing pattern in future imports: if col 9 is 0 on every row of a month, consumption is garbage — derive closings from next-day openings.**
   - **Ado 1 re-import (2026-07-02)**: 182 readings Jan 1–Jul 1 2026, generator `Ado 1 Generator` (cc9b62f3-…), script `scripts/import_ado1.py` (`--replace`). Source `ADO 1 DIESEL TRACKER (2).xlsx` — clean workbook, narrow layout (same col map as Ondo 2), location "ADO 1 CR", real NEPA kWh meter (cols 16/17), TRANSFER OUT col 6 (only 2 rows: May 9–10, 180 L → inserted as `diesel_transfers` dest 'other'). 5,680 L local purchases in col 5 → diesel_added. Replaced 119 old rows (112 Cowork-era + 7 app entries). **DATE-SHIFT GOTCHA**: the store's app entries carried *yesterday's* meters under *today's* date (sheet Jun 22 == app "Jun 23" … sheet Jul 1 == app "Jul 2"); the importer's `DUPLICATE_APP_DATES` deletes the app row that duplicates the sheet's last interval, else meters run backwards. **Store profile**: mostly on NEPA (~650 kWh/day), gen runs median 1.25 h/day; dipstick resolves only ~35–42 L steps so 99/182 days read "0 consumed" then several days' burn lands on one day — this quantization is why its old mean-of-rates baseline was 16.18 while the TRUE aggregate is **9.99 L/hr** (5,065 L / 516 h). After pooled recalc + min-burn flag floor: **18% flagged (was 90%)**.
   - **Ondo 2 CR (2026-06-28)**: 179 readings Jan 1–Jun 28 2026, generator `Ondo 2 CR Generator` (534d134d-…, loc "Ondo 2 CR"), 0 prior readings (clean insert). Source `2026 ONDO2 DIESEL TRACKER.xlsx`, monthly tabs JANUARY..JUNE (no year in tab name). Script `scripts/import_ondo2_cr.py` — narrow layout (date col 1, gen hours 12/13, hour run 14, rate 15, NEPA 16/17), same col map as Akungba JAN/FEB; MARCH has extra blank cols (maxcol 23) but same data cols. Real measured data with decimal dip readings (kept as floats, not int-truncated): baseline **8.65 L/hr**, 11.6% flagged — gen runs a steady ~9 L/hr. No NEPA meter / no transfers. 19,240 L added; hours synced to 6,639.4.
   - **Akungba CR (2026-06-24)**: 167 readings Jan 1–Jun 22 2026, generator `Akungba CR Generator` (G-003, loc "Akungba CR"). Source `AKUNGBA CR diesel usage daily report 2026.xlsx`. Script `scripts/import_akungba_cr.py`. **Two layouts in one workbook**: JAN 26/FEB 26 have DATE in col 1; MAR 26 onward inserted a weekday column so DATE→col 2 and everything shifts +1. Script DETECTS the date column per tab and anchors all columns off `base = date_col-1`. JULY–DEC tabs are empty future templates (0 rows). March data stops on the 25th (6-day gap). Ran with `--replace`: DELETED 3 unreliable first-time app entries (Jun 17–19) — one had a bad opening (1607) giving a phantom 227 L/15 L-hr drop; the sheet shows those days are normal ~90/80 L at ~5–6 L/hr. **This import diagnosed the user's "Akungba flag" question**: the gen genuinely runs **~5–7 L/hr all year** (baseline 6.77), but with NO baseline the app fell back to a default 15 L/hr and falsely flagged honest readings at 60%+. Now baseline 6.77, ~20% flagged (real variance; late-June days run ~5 L/hr = ~20–28% below the yearly mean, legitimately flagged as below-trend). 13,750 L added; hours synced to 11,631.8.
   - **recalc_baselines.py is now gap-aware (2026-06-24) + pooled-aggregate (2026-07-02)**: (a) only counts a level-delta when the previous reading is the calendar day before (a logging gap lumps days of consumption onto one day's hours → 50 L/hr phantoms); (b) baseline = **Σactual/Σhours pooled over pairs**, NOT mean of per-day rates — quantized dipsticks (Ado 1's ~40 L steps) make daily rates read 0-or-huge while the pool stays true (Ado 1 16.18→9.99). Two-pass: r0 = mean of positive rates, then a zero-drop day's hours join the pool only if hrs×r0 ≤ 40 L (could plausibly hide below stick resolution) — without that test, broken-meter stores (Akure 1/6 log real drops against impossible 0.3 h) pool to ~0. Final sanity: if pooled < 1 L/hr or < 0.5×r0, fall back to r0 (Akure 1/6 keep 32.27/7.24). **Discrepancy flags have a MIN-GAP FLOOR (25 L) — keyed off the DISCREPANCY, not the expected burn (revised 2026-07-14)** in BOTH `backfill_discrepancy_flags.py` (`MIN_DISCREPANCY_L`, `flag = pct>threshold and abs(disc)>=25`) and App.jsx handleSave (`pctDiff>thresholdPct && Math.abs(discrepancy)>=25`): a reading flags only when the gap itself exceeds dipstick resolution. The earlier version floored on `theoretical` (expected burn), which wrongly SUPPRESSED a short run with a large actual drop while flagging a smaller gap — Ado 1 Jul 6 (used 41 vs expected 22, gap 20 L) was hidden because expected<25, yet Jul 4 (gap 9 L, expected 33) flagged. Now both those small-gap days are unflagged and Jul 8/9 (gaps 52/31 L) stay flagged. Keep the two floors in sync. Re-run order unchanged: recalc_baselines --apply → backfill_discrepancy_flags --apply.
   - **Staff balance KPIs = "Diesel in Tank" (2026-07-02)**: the Staff Dashboard's Overall Balance and the staff-scoped Diesel Management Balance now show the **latest recorded diesel_level_actual per asset, summed** ("Latest reading <date>") — what's physically in the tank (Ado 1: 1,248 L), per the user. Ledger balances (distributions − consumed, added − consumed) drift from the tank and read falsely negative for locally-buying stores (Ado 1 showed −906 then −2,523). The staff Reports sub-view's period Balance became "Net Stock Change" = Σadded − Σconsumed in period.
   - **Ikare CR (2026-06-24)**: 174 readings Jan 1–Jun 23 2026, generator `Ikare CR Generator` (G-009, loc "Ikare CR"), 0 prior readings (clean insert). Source `IKARE CR DIESEL TEMPLATE YEAR 2026.xlsx` — workbook has many unrelated trackers; diesel data is in monthly tabs JAN..JUNE 2026. Script `scripts/import_ikare_cr.py`. Column map shifted +1 vs Akure 2: DIESEL COST col **12**, GEN RUNNING HOUR cols **13/14**, HOUR RUN 15, rate 16, NEPA 17/18; closing level filled in both col 8 and col 9 (use 9). Real measured data (NOT self-referential): baseline **11.43 L/hr** (min 4, max 60), **25.4% flagged** — genuine variance, meaningful Watchtower signal. Captures real NEPA meter readings + supplier names (MICMAKIN/AKURE/BAKERY/OKA FILL STATION) into notes; 23,400 L total added. Hours synced to 18,192. **NOTE — temporary 2nd-gen swap May 15–18**: gen meter drops 17,747→~4,014 for 4 days then returns to 17,726 on May 19 (backup unit while main serviced). Per-day hours_run/consumption and tank levels stay continuous and correct, so baseline/flags are valid; only the absolute meter jumps. Not split into a separate generator (too short); the current/latest meter is the main unit (18,192).
   - **Akure 2 (2026-06-24)**: 174 readings Jan 1–Jun 23 2026, generator `Akure 2 Generator` (G-96236640885102180, loc "Akure 2"). Source `DIESEL REPORT 2026.xlsx` — ONE SHEET PER MONTH (JAN..JUNE 2026), location cell "AKURE 2 CR". Script `scripts/import_akure2.py` (`--replace` mode: the sheet is authoritative for any date it covers, so it DELETED 5 sparse/lumpy app-entered readings — incl. a bogus Jun-21 row that lumped 84 h/1260 L because staff hadn't logged since May 26 — and inserted clean daily rows). Column map differs from OWO CR: explicit HOUR RUN col 15 pushes rate→16, NEPA→17/18; closing tank level is TOTAL CLOSING **col 9** (col 8 blank); purchases/transfer-in col 5 (7,500 L total). No transfer-out column. Baseline 15.00 L/hr, 0% flagged — but like other sheet imports it's **self-referential** (sheet consumption = hours×15 by construction); real variance only appears once staff log measured tank levels in-app. Hours synced to 10,658.
5. **Build admin Import page in FleetPro UI** (replace the standalone Python script with an in-app upload+preview flow)
6. **Back-fill historical discrepancy flags** — script ready: `scripts/backfill_discrepancy_flags.py` (dry-run default, `--apply` to write). Replays the app's save-time check against current baselines, paginated fetch (avoids the 1000-row REST cap). Run it after any new store import or re-baseline. NOTE: Akure 1 flags heavily until the vehicle-transfer feature lands.
7. **Watchtower tab** (admin-only, in Diesel Management) — per-store theft-risk scoring added: flag rate (30), supply-sent-vs-tanked gap (25), pencil-whipping (round numbers + rate CV < 0.05, 20), overnight losses (15), low photo rate last 30d (10). Click a store row for its event log (discrepancies + overnight losses). Overnight loss = prev day's closing level minus today's implied opening (close − added + consumption). Sheet-imported data shows ~0 overnight gaps by construction (sheets carry closing→opening forward); the signal matters for app-entered readings going forward.
8. **Reports + visual pass (2026-06-03)** — Reports page now receives diesel data and has two new tabs: "Diesel Cost" (₦ per store via weighted avg purchase price, monthly trend) and "Store Comparison" (L/hr efficiency, received/balance, flags, photo %). Sidebar nav is grouped (Overview/Diesel/Fleet/Operations/Admin via NAV `group` field). Dashboard has a "Needs Attention" feed (flags last 7d, stores that missed yesterday's log, unconfirmed deliveries >3d, expiring papers, overdue service/WOs) and a pro-rated cost delta vs last month on the Cost KPI (Kpi component now takes `delta` + `deltaGoodWhenDown`). Diesel Management has a "compliance" calendar tab (per-store day grid, green=logged/red=missed, month nav) and flagged readings rows are tinted red with a camera icon linking to the meter photo.

### Deferred Features
- Full activity/audit trail (log every action, who/what/when)
- Role-based module access control (Super Admin toggles which modules each role sees)

## GPS Live Map Module — Status

### Infrastructure (DONE)
- DigitalOcean VPS: Ubuntu 24.04, 1GB RAM, London region
- Traccar 6.12.2 installed and running (`systemctl` managed)
- SSL via Let's Encrypt + nginx reverse proxy on `tracker.micmakin.com`
- Firewall (UFW): ports 22, 80, 443, 5013, 8082 open
- One ST-906L tracker configured and verified (sent valid position: lat 7.27043, lon 5.19364 near Akure)

### Traccar Server Details
- Config file: `/opt/traccar/conf/traccar.xml`
- Logs: `/opt/traccar/logs/tracker-server.log`
- Database: H2 (embedded, at `/opt/traccar/data/database`)
- CORS enabled: `<entry key="web.origin">*</entry>` in traccar.xml
- nginx config: `/etc/nginx/sites-available/traccar`
- SSL cert auto-renews via certbot

### SinoTrack ST-906L SMS Commands (password: factory default; change with `7770000 newpass`)
- Check settings: `RCONF`
- Set APN: `8030000 apn_name` (e.g., `8030000 web.gprs.mtnnigeria.net web web`)
- Set server IP/port: `8040000 IP PORT` (e.g., `8040000 178.62.48.233 5013`)
- Set upload interval: `8050000 seconds` (e.g., `8050000 10`)
- Reboot: `8880000`
- Location query: `6690000`

### FleetPro Integration (IN PROGRESS — has a build issue)

**Files created:**
- `src/traccar.js` — API helper using Basic Auth via Vite env vars. Functions: `getDevices()`, `getPositions()`, `getRoute()`, `getTrips()`, `getSummary()`, `getGeofences()`, plus helpers `toKmh()`, `toKm()`, `formatDuration()`, `statusColor()`, `timeAgo()`, `isConfigured()`
- `src/LiveMapPage.jsx` — Full GPS tracking page using `@react-google-maps/api`. Features: real-time vehicle positions (auto-refresh 15s), route playback with animation, trip logs, speed history chart. Side panel with vehicle list, search, online/moving/offline KPIs.

**Wired into App.jsx:**
- Import added: `import LiveMapPage from "./LiveMapPage.jsx"` (line 7)
- `MapPin` added to lucide-react imports (line 4)
- NAV item: `{id:"live-map",path:"/live-map",label:"Live Map",icon:MapPin}` (line 1024)
- Route: `<Route path="/live-map" element={isStoreStaff?<Navigate to="/staff-dashboard" replace/>:<LiveMapPage/>}/>` (line 1276)

**CURRENT ISSUE — must fix before deploy:**
The LiveMapPage.jsx file had a duplicate `InfoCard` function fragment that was cleaned up in the sandbox but the fix commit (`a3d1214`) was never successfully pushed to GitHub. The local git has it committed but `git push` failed from the sandbox. On the user's Windows machine, `git push` says "Everything up-to-date" because it doesn't see the sandbox commit. **Resolution: verify LiveMapPage.jsx ends cleanly with a single `InfoCard` function, no duplicate `Card({...})` fragment, no null bytes. Commit and push.**

**CURRENT TRACKER ISSUE:**
The first tracker (device ID `7026233272`) went offline due to a power cut — the vehicle's power supply to the tracker was interrupted. The internal backup battery drained. When calling the tracker's SIM, it says "switched off." Someone needs to physically check the wiring and reconnect to constant 12V power. Once power is restored, the tracker should auto-reconnect to Traccar.

There is also a second tracker that has never been online — it needs SIM card + wiring verification and the same SMS configuration commands as above.

### Planned GPS Features (not yet built)
- Send commands to trackers via GPRS through Traccar API (free, no SMS needed) — with SMS fallback for offline devices
- Geofencing
- Speed alerts
- Daily route recording

## Known Issues & Gotchas

0. **"Store staff see 0 readings" — TWO root causes, both FIXED 2026-06-24:**
   - **(a) Auth-lock contention** (`src/supabase.js` + `loadAllData`): supabase-js guards auth-token access with the browser Web Locks API (`navigator.locks`). On a slow connection the one token refresh holds the lock past the **5s default steal-timeout**; the app's ~23 concurrent startup fetches then time out and force-steal it, aborting the losers with `AbortError: Lock broken by another request with the 'steal' option` — those fetches returned empty (`Data loaded {... dr:0}`). A first attempt used a custom in-memory per-tab lock, which stopped the aborts but REMOVED cross-tab coordination → two tabs/reloads fired competing refreshes that rotated each other's refresh token and hit the auth **429 Too Many Requests** rate limit, signing staff out. FINAL FIX: keep the DEFAULT cross-tab lock (coordinates refresh, no 429) but set `auth.lockAcquireTimeout: 30000` (5s→30s, so a slow refresh isn't stolen), AND `loadAllData` calls `supabase.auth.getSession()` once before the `Promise.all` so any refresh happens alone before the herd. Do NOT reintroduce a per-tab lock. If a user is stuck after a bad auth state, have them clear site data / log in fresh (rotated tokens in localStorage) and wait a few min for the 429 window to reset.
   - **(b) 1000-row fetch cap** (`db.js fetchAll()`): PostgREST caps a single `select` at 1000 rows; `diesel_readings` passed 3,841, so the old single-select loaded only the 1000 most-recent-by-date — older history vanished for everyone. FIX: `fetchAll` now PAGES in 1000-row chunks (`.range()` loop). Any table can grow past 1000 (fuel_logs already at 3,508) — always use `fetchAll`, never a bare `.select()` for a growing table.
   - Note: the app loads data ONCE on mount, so users with a stale tab must refresh to see newly imported rows.
   - **(c) System clock skew (the actual culprit on 2026-06-24)**: if auth fails on EVERY browser of ONE machine but works on other devices, suspect the PC's **system clock/date/timezone**. JWTs are validated against the local clock; a skewed clock makes the token look perpetually expired → endless refresh loop → the 5000ms lock-not-released churn + 429. Fix is on the user's PC (enable "Set time automatically" + Sync, clear site data, re-login), NOT in code. Also possible: local AV/VPN/proxy doing TLS inspection on `*.supabase.co` — check the Network tab for a hanging/blocked `token?grant_type=refresh_token`. Gotcha: supabase-js's `_initSupabaseAuthClient` does NOT forward `auth.lockAcquireTimeout` (silently dropped); to change the steal-timeout, pass a custom `auth.lock` that wraps `navigatorLock(name, ms, fn)` (see `src/supabase.js`, set to 25s).
1. **git index.lock**: The file `.git/index.lock` keeps appearing. Delete it before git operations: `del .git\index.lock` (Windows)
2. **App.jsx edits**: MUST use bash/python — the Edit tool truncates this large file
3. **Leaflet still in package.json**: `leaflet` and `react-leaflet` are still listed as dependencies but no longer used (switched to Google Maps). Can be removed.
4. **`.npmrc`**: Contains `legacy-peer-deps=true` — needed because react-leaflet@4.2.1 was installed with legacy peer deps. May be removable once leaflet deps are cleaned up.
5. **CORS on Traccar**: Set to `*` (allow all origins). Should be restricted to the FleetPro domain in production.
6. **Google Maps API key**: Currently unrestricted. Should be restricted to FleetPro domain(s) in Google Cloud Console.
7. **Traccar credentials in env vars**: `VITE_` prefix means they get baked into the JS bundle at build time. Not ideal for security but acceptable for an internal business app.

## Development Workflow

1. Edit files in `C:\Users\MakindeAribo\Documents\fleetpro\`
2. Test locally: `npm run dev`
3. Commit and push: `git add -A && git commit -m "message" && git push`
4. Vercel auto-deploys from GitHub on push to `main`
5. If `git index.lock` blocks: `del .git\index.lock`
