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
  - Traccar admin: `makindearibo@gmail.com` / `Balzman007!`
- **GPS Hardware**: SinoTrack ST-906L (4G) with Nigerian MTN SIM cards
  - SMS command password: `0000`
  - APN: `web.gprs.mtnnigeria.net,web,web`
  - Currently 1 tracker installed (device ID: `7026233272`), plan is ~30 units

## Vercel Environment Variables

```
VITE_TRACCAR_URL=https://tracker.micmakin.com
VITE_TRACCAR_EMAIL=makindearibo@gmail.com
VITE_TRACCAR_PASSWORD=Balzman007!
VITE_GOOGLE_MAPS_KEY=AIzaSyAb2XhYwQa0EZxeH-vo97gTBD60exGmts8
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
- `diesel_purchases` — date, supplier, litres, price_per_litre, total_cost, purchased_by
- `diesel_distributions` — purchase_id, date, store_location, litres, received_confirmed, received_by, distributed_by
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
- Test import completed for 2 stores:
  - Akure 6: 467 readings (Jan 2025 – Apr 2026), generator_id = `308ca49f-c94a-42b6-a32a-65e7be1dba3a`
  - Ado 1: 121 readings (Jan 2026 – Apr 2026), generator_id = `cc9b62f3-eb66-4f08-ac8d-ec51b0c2175e`
- Baselines recalculated from imported data (Akure 6: 45.6% flagged, Ado 1: 33.9% flagged)
- Import script: `import_test_stores_v2.py` (in Cowork outputs folder, not in repo)
- Mapping file: `FleetPro_Import_Mapping_FINAL.xlsx` (in FLEET MANAGEMENT folder)

### Pending Diesel Tasks
1. **Fix Staff Dashboard data display** — user said "There is lot to discuss on that"
2. **Import admin purchases + distributions** from DIESEL REPORT TEMPLATE.xlsx
3. **Roll out import to remaining stores** after test verification
4. **Build admin Import page in FleetPro UI**

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

### SinoTrack ST-906L SMS Commands (password: 0000)
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
