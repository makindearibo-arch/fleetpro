// /api/imprest-zoho -- posts the fleet (admin) imprest to Zoho BOOKS, like the DRS
// branch imprest (netlify/functions/imprest-zoho.js in micmakin-drs). Accounts' rules:
//   j1  each time HQ Accounts gives the fleet office cash (one journal per handover)
//         Dr Petty cash imprest admin      Cr Operational imprest
//   j2  each week, once the voucher has its final approval -- what was spent
//         Dr each line's expense account   Cr Petty cash imprest admin
//       The "owed from last week" line is left out: that spending already went through
//       Zoho in last week's Journal 2 (the petty cash account simply went below zero).
// Amounts are read from Supabase, never taken from the browser. The Zoho journal id is
// kept on the row (imprest_cash.zoho / imprest_vouchers.zoho), so sending again UPDATES
// the same journal instead of making a second one. Only the Super Admin and HQ Accounts
// may post. The Zoho accounts to use are picked once in Settings -> Zoho Books
// (app_settings 'zoho_imprest').
//
// GET                 -> { configured, settings, accounts, categoryDefaults }   (any imprest role)
// GET  ?list=1        -> the live Zoho chart of accounts + locations            (Super Admin)
// POST { doc:'j1', cashId,    date, notes, inputtedBy }
// POST { doc:'j2', voucherId, date, notes, inputtedBy, accounts:{lineId:accountId} }
// POST { ..., manual:true, reference }   already entered in Zoho by hand: records it, sends nothing
//
// Server environment (Vercel; the same values as the DRS site on Netlify):
//   ZOHO_BOOKS_CLIENT_ID, ZOHO_BOOKS_CLIENT_SECRET, ZOHO_BOOKS_REFRESH_TOKEN, ZOHO_BOOKS_ORG_ID,
//   SUPABASE_SERVICE_ROLE_KEY (already there for Set password)
const SUPABASE_URL_DEFAULT = "https://bddmsrbfygbuyfdpieyl.supabase.co";
const ZOHO_ACCOUNTS_URL = "https://accounts.zoho.com/oauth/v2/token";
const ZOHO_BOOKS_API = "https://www.zohoapis.com/books/v3";
const POSTERS = ["Super Admin", "HQ Accounts"];
const VIEWERS = ["Super Admin", "Fleet Manager", "Audit", "HQ Accounts", "Senior Manager"];
const DOC_LABEL = { j1: "Journal 1 (cash given)", j2: "Journal 2 (spent)" };
const LOCK_MS = 90 * 1000;

// Expense accounts an imprest line may go to -- the same Zoho Books list the DRS imprest uses.
export const ACCOUNTS = [
  ["5142632000000117890", "0ther Allowances:Staff Benefits:0ther Allowances"],
  ["5142632000000117914", "0ther Allowances:Staff Benefits:Staff Meals"],
  ["5142632000000117932", "0ther Allowances:Staff Benefits:Staff Welfare"],
  ["5142632000000117944", "Administrative Cost"],
  ["5142632000000000403", "Advertising And Marketing"],
  ["5142632000000117950", "Advertising and Promotion"],
  ["5142632000000000424", "Automobile Expense"],
  ["5142632000000118166", "Carriage of Goods"],
  ["5142632000000118172", "CHRISTMAS EXPENSES"],
  ["5142632000000118178", "Cleaning/ Fumigation"],
  ["5142632000000118184", "Computer and Internet Expenses"],
  ["5142632000000000412", "Credit Card Charges"],
  ["5142632000000118388", "Dues and Subscriptions"],
  ["5142632000000118394", "Electrical & Plumbing"],
  ["5142632000000118400", "Farm/factory expenses"],
  ["5142632000000117842", "Freight and Shipping Costs"],
  ["5142632000000118580", "Fuel"],
  ["5142632000006150157", "Fuel/Mileage Expenses"],
  ["5142632000000118586", "Fuel:Diesel"],
  ["5142632000000118592", "Fuel:Diesel ( Micmakain Property)"],
  ["5142632000000118598", "Fuel:Petrol"],
  ["5142632000000118604", "General Expenses"],
  ["5142632000000118610", "Gift & Donation"],
  ["5142632000000118616", "Gloves & Nylon"],
  ["5142632000000118622", "Govt Fines, Reg. & Licences"],
  ["5142632000000118628", "Hotel Expenses"],
  ["5142632000000000427", "IT and Internet Expenses"],
  ["5142632000000000433", "Janitorial Expense"],
  ["5142632000000032023", "Lodging"],
  ["5142632000000000448", "Meals and Entertainment"],
  ["5142632000000118862", "Medical"],
  ["5142632000000000400", "Office Expenses"],
  ["5142632000000000460", "Other Expenses"],
  ["5142632000000090050", "Parking"],
  ["5142632000000000436", "Postage"],
  ["5142632000000118934", "Postage and Delivery"],
  ["5142632000000118940", "Printing & Stationeries"],
  ["5142632000000000442", "Printing and Stationery"],
  ["5142632000000117854", "Product Samples Expense"],
  ["5142632000000118952", "Public Relations"],
  ["5142632000000000457", "Repairs and Maintenance"],
  ["5142632000000118976", "Repairs and Maintenance:Building"],
  ["5142632000000118982", "Repairs and Maintenance:Computer"],
  ["5142632000000118988", "Repairs and Maintenance:Equipment"],
  ["5142632000000118994", "Repairs and Maintenance:General"],
  ["5142632000000119000", "Repairs and Maintenance:Generator"],
  ["5142632000000119006", "Repairs and Maintenance:Motor Vehicle( GENERAL)"],
  ["5142632000000119012", "Repairs and Maintenance:Motor Vehicle(Operation)"],
  ["5142632000000119018", "Repairs and Maintenance:R & A"],
  ["5142632000000119024", "Security"],
  ["5142632000000119048", "Staff Uniform"],
  ["5142632000000119054", "Subscriptions"],
  ["5142632000000119060", "Subscriptions:DSTV"],
  ["5142632000000119066", "Subscriptions:GOTV"],
  ["5142632000000119072", "Subscriptions:INTERNET"],
  ["5142632000000000421", "Telephone Expense"],
  ["5142632000000119120", "Telephone Expense(New Purchase)"],
  ["5142632000000119126", "Telephones & Recharges Cards"],
  ["5142632000000119132", "Transport & Travel Expenses"],
  ["5142632000000000418", "Travel Expense"],
  ["5142632000000119138", "Utilities"],
  ["5142632000000119144", "Utilities:Cooking Gas"],
  ["5142632000000119150", "Utilities:Electricity"],
  ["5142632000000119156", "Utilities:Waste Disposal"],
  ["5142632000000119384", "Water Maintenance"],
  ["5142632000000119390", "Water Maintenance:Borehole Repair"],
  ["5142632000000119396", "Water Maintenance:Water Supply"],
  ["5142632000000119402", "Water Maintenance:Water Treatment"],
  ["5142632000000119408", "Welding"],
];
// FleetPro's imprest categories -> the expense account a line goes to unless HQ Accounts picks another
export const CATEGORY_DEFAULTS = {
  "Transport": "5142632000000119132",            // Transport & Travel Expenses
  "Repairs & parts": "5142632000000119012",      // Repairs and Maintenance:Motor Vehicle(Operation)
  "Tyres & vulcanizer": "5142632000000119012",   // Repairs and Maintenance:Motor Vehicle(Operation)
  "Police & levies": "5142632000000118622",      // Govt Fines, Reg. & Licences
  "Cards & airtime": "5142632000000119126",      // Telephones & Recharges Cards
  "Drivers' meal": "5142632000000117914",        // 0ther Allowances:Staff Benefits:Staff Meals
  "Others": "5142632000000000460",               // Other Expenses
};
const ACCOUNT_NAME = Object.fromEntries(ACCOUNTS);

const num = v => { const n = parseFloat(String(v == null ? "" : v).replace(/,/g, "")); return isNaN(n) ? 0 : n; };
const round2 = n => Math.round(n * 100) / 100;
const clip = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
const ymd = s => (/^\d{4}-\d{2}-\d{2}$/.test(String(s || "")) ? s : null);
const lineAmt = l => num(l.qty) * num(l.unitPrice);
const lineAllowed = l => (l.allowed != null && l.allowed !== "" ? num(l.allowed) : lineAmt(l));
export function lineAccount(l, overrides) {
  const o = overrides && overrides[l.id];
  if (o && ACCOUNT_NAME[o]) return o;
  if (l.zohoAccountId && ACCOUNT_NAME[l.zohoAccountId]) return l.zohoAccountId;
  return CATEGORY_DEFAULTS[l.category] || CATEGORY_DEFAULTS.Others;
}
// Journal 2's debit lines: what was approved on each line, grouped by expense account (owed line left out)
export function spentByAccount(lines, overrides) {
  const groups = {};
  (lines || []).forEach(l => {
    if (l.type === "owed") return;
    const amt = round2(lineAllowed(l));
    if (!(amt > 0)) return;
    const acc = lineAccount(l, overrides);
    const g = groups[acc] || (groups[acc] = { account_id: acc, amount: 0, descs: [] });
    g.amount = round2(g.amount + amt);
    g.descs.push(l.desc);
  });
  return Object.values(groups);
}

// ---- Zoho Books (token cached while the function stays warm) ----------------------------
let _token = null, _tokenExp = 0;
function zohoEnv() {
  const e = { clientId: process.env.ZOHO_BOOKS_CLIENT_ID, clientSecret: process.env.ZOHO_BOOKS_CLIENT_SECRET,
              refreshToken: process.env.ZOHO_BOOKS_REFRESH_TOKEN, orgId: process.env.ZOHO_BOOKS_ORG_ID };
  return e.clientId && e.clientSecret && e.refreshToken && e.orgId ? e : null;
}
async function zohoToken(env) {
  if (_token && _tokenExp > Date.now() + 5 * 60 * 1000) return _token;
  const r = await fetch(ZOHO_ACCOUNTS_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ refresh_token: env.refreshToken, client_id: env.clientId, client_secret: env.clientSecret, grant_type: "refresh_token" }).toString() });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw Object.assign(new Error("Could not log in to Zoho Books" + (j.error ? ": " + j.error : ".")), { code: 502 });
  _token = j.access_token; _tokenExp = Date.now() + (j.expires_in || 3600) * 1000;
  return _token;
}
async function books(env, method, path, body, retried) {
  const token = await zohoToken(env);
  const r = await fetch(ZOHO_BOOKS_API + path + (path.includes("?") ? "&" : "?") + "organization_id=" + encodeURIComponent(env.orgId), {
    method, headers: { Authorization: "Zoho-oauthtoken " + token, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  if (r.status === 401 && !retried) { _token = null; return books(env, method, path, body, true); }
  const text = await r.text();
  let j; try { j = text ? JSON.parse(text) : {}; } catch { j = { message: text.slice(0, 300) }; }
  if (r.status === 429) throw Object.assign(new Error("Zoho Books is busy - wait a minute and try again."), { code: 503 });
  if (!r.ok) throw Object.assign(new Error("Zoho Books refused it: " + clip(j.message || text, 300)), { code: 502 });
  return j;
}

// ---- Supabase (service key; server side only) ------------------------------------------
function sb(url, key) {
  const h = { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };
  return {
    get: async p => { const r = await fetch(url + "/rest/v1/" + p, { headers: h }); if (!r.ok) throw new Error("Supabase read failed (" + r.status + ")"); return r.json(); },
    patch: async (p, body) => { const r = await fetch(url + "/rest/v1/" + p, { method: "PATCH", headers: { ...h, Prefer: "return=representation" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error("Supabase write failed (" + r.status + "): " + clip(await r.text(), 200)); return r.json(); },
  };
}
async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return null; } }
  const chunks = [];
  for await (const c of req) chunks.push(typeof c === "string" ? Buffer.from(c) : c);
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "null"); } catch { return null; }
}
function fail(msg, code) { throw Object.assign(new Error(msg), { code: code || 400 }); }

export default async function handler(req, res) {
  const send = (code, body) => {
    res.statusCode = code;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(body));
  };
  const url = process.env.SUPABASE_URL || SUPABASE_URL_DEFAULT;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return send(503, { error: "Zoho posting is not switched on yet: SUPABASE_SERVICE_ROLE_KEY is missing from Vercel's environment variables." });
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return send(401, { error: "Please log in again." });
  const db = sb(url, key);
  let me;
  try {
    const who = await fetch(url + "/auth/v1/user", { headers: { apikey: key, Authorization: "Bearer " + token } });
    if (!who.ok) return send(401, { error: "Your login has expired - please log in again." });
    const caller = await who.json();
    me = (await db.get("profiles?select=id,name,email,role&id=eq." + encodeURIComponent(caller.id || "")))[0];
  } catch (e) { return send(502, { error: "Could not reach Supabase - try again." }); }
  if (!me || !VIEWERS.includes(me.role)) return send(403, { error: "Only the imprest roles can use this." });
  const env = zohoEnv();

  try {
    const st = (await db.get("app_settings?select=value&key=eq.zoho_imprest"))[0];
    const settings = (st && st.value && typeof st.value === "object") ? st.value : {};

    if (req.method === "GET") {
      if (String(req.query?.list || new URL(req.url, "http://x").searchParams.get("list") || "") === "1") {
        if (me.role !== "Super Admin") return send(403, { error: "Only the Super Admin chooses the Zoho accounts." });
        if (!env) return send(503, { error: "Zoho Books is not connected yet: add ZOHO_BOOKS_CLIENT_ID, ZOHO_BOOKS_CLIENT_SECRET, ZOHO_BOOKS_REFRESH_TOKEN and ZOHO_BOOKS_ORG_ID to Vercel's environment variables (the same values as the DRS site)." });
        const all = [];
        for (let page = 1; page <= 10; page++) {   // Zoho sends 200 accounts a page
          const ca = await books(env, "GET", "/chartofaccounts?filter_by=AccountType.Active&per_page=200&page=" + page);
          all.push(...(ca.chartofaccounts || []));
          if (!(ca.page_context && ca.page_context.has_more_page)) break;
        }
        const lo = await books(env, "GET", "/locations").catch(() => ({ locations: [] }));
        return send(200, { ok: true,
          accounts: all.map(a => ({ id: a.account_id, name: a.account_name, type: a.account_type })),
          locations: (lo.locations || []).filter(l => l.status !== "inactive").map(l => ({ id: l.location_id, name: l.location_name })) });
      }
      return send(200, { ok: true, configured: !!env, settings: { pettyCash: settings.petty_cash_name || null, operational: settings.operational_name || null, location: settings.location_name || null },
                         accounts: ACCOUNTS, categoryDefaults: CATEGORY_DEFAULTS });
    }
    if (req.method !== "POST") return send(405, { error: "Use GET or POST." });
    if (!POSTERS.includes(me.role)) return send(403, { error: "Only HQ Accounts or the Super Admin can post imprest to Zoho." });
    const body = await readJson(req) || {};
    if (body.manual !== true) {
      if (!env) return send(503, { error: "Zoho Books is not connected yet - ask the developer to add the Zoho Books login to Vercel." });
      if (!settings.petty_cash_id || !settings.operational_id) return send(400, { error: "The Super Admin has to pick the Zoho accounts first (Settings -> Zoho Books)." });
    }
    const doc = body.doc;
    if (!DOC_LABEL[doc]) return send(400, { error: "doc must be j1 or j2" });
    const table = doc === "j1" ? "imprest_cash" : "imprest_vouchers";
    const id = String(doc === "j1" ? body.cashId || "" : body.voucherId || "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return send(400, { error: "Which " + (doc === "j1" ? "cash" : "voucher") + "?" });
    const date = ymd(body.date); if (!date) return send(400, { error: "Pick the date for the Zoho entry." });
    const notes = clip(body.notes, 500); if (!notes) return send(400, { error: "Write the narration (Zoho needs notes)." });
    const inputtedBy = clip(body.inputtedBy, 100); if (!inputtedBy) return send(400, { error: 'Fill in "Inputted by" (a required Zoho field).' });

    // claim the row so two clicks cannot make two Zoho journals
    const cutoff = new Date(Date.now() - LOCK_MS).toISOString();
    const claimed = await db.patch(`${table}?id=eq.${id}&or=(zoho_lock.is.null,zoho_lock.lt.${encodeURIComponent('"' + cutoff + '"')})`, { zoho_lock: new Date().toISOString() });
    if (!claimed.length) {
      const exists = (await db.get(`${table}?select=id&id=eq.${id}`)).length;
      return send(exists ? 409 : 404, { error: exists ? "This is already being sent to Zoho - wait a minute and reload." : "Not found." });
    }
    const row = claimed[0];
    let result, lines;
    try {
      const prev = row.zoho || null;
      let items, amount, ref;
      if (doc === "j1") {
        amount = round2(num(row.amount));
        if (!(amount > 0)) fail("There is no amount to post.");
        const what = row.kind === "extra" ? "extra imprest cash" : "imprest cash for the week";
        items = [
          { account_id: settings.petty_cash_id, debit_or_credit: "debit", amount, description: clip("Fleet " + what + " of " + row.week_start, 250) },
          { account_id: settings.operational_id, debit_or_credit: "credit", amount, description: clip("Fleet " + what + " of " + row.week_start, 250) },
        ];
        ref = clip("FLEET IMP CASH " + row.date, 50);
      } else {
        if (row.kind !== "weekly" || row.status !== "approved") fail("Journal 2 is posted once the week's voucher has its final approval.");
        const groups = spentByAccount(row.lines, body.accounts);
        if (!groups.length) fail("Nothing was spent this week (apart from what was owed from last week), so there is no Journal 2.");
        amount = round2(groups.reduce((t, g) => t + g.amount, 0));
        items = groups.map(g => ({ account_id: g.account_id, debit_or_credit: "debit", amount: g.amount, description: clip(g.descs.join(", "), 250) }));
        items.push({ account_id: settings.petty_cash_id, debit_or_credit: "credit", amount, description: clip("Fleet imprest spent, week of " + row.week_start, 250) });
        ref = clip("FLEET IMP " + row.week_start, 50);
        lines = (row.lines || []).map(l => { if (l.type === "owed") return l; const acc = lineAccount(l, body.accounts); return { ...l, zohoAccountId: acc, zohoAccountName: ACCOUNT_NAME[acc] }; });
      }
      if (body.manual === true) {
        // accounts entered this one in Zoho by hand before FleetPro could: record it, send nothing
        if (prev && prev.id) fail("This is already in Zoho from FleetPro (journal " + (prev.number || prev.id) + ") - use Update instead.");
        result = { id: null, manual: true, number: clip(body.reference, 50) || null, amount, date, notes, inputtedBy, at: new Date().toISOString(), by: me.name || me.email, updates: 0 };
      } else {
        if (prev && prev.manual) fail("This was already entered in Zoho by hand" + (prev.number ? " (" + prev.number + ")" : "") + " - sending it from FleetPro would make a second journal.");
        const payload = { journal_date: date, reference_number: ref, notes, line_items: items, custom_fields: [{ api_name: "cf_inputted_by", value: inputtedBy }] };
        if (settings.location_id) payload.location_id = settings.location_id;
        const r = prev && prev.id ? await books(env, "PUT", "/journals/" + prev.id, payload) : await books(env, "POST", "/journals", payload);
        const j = r.journal || {};
        if (!j.journal_id) fail("Zoho did not return a journal: " + clip(r.message || JSON.stringify(r), 300), 502);
        result = { id: j.journal_id, number: j.entry_number || null, amount, date, notes, inputtedBy, at: new Date().toISOString(), by: me.name || me.email, updates: prev ? (prev.updates || 0) + 1 : 0 };
      }
    } catch (e) {
      await db.patch(`${table}?id=eq.${id}`, { zoho_lock: null }).catch(() => {});
      return send(e.code || 502, { error: e.message });
    }
    const upd = { zoho: result, zoho_lock: null };
    if (lines && body.manual !== true) upd.lines = lines;
    const saved = await db.patch(`${table}?id=eq.${id}`, upd);
    return send(200, { ok: true, doc, zoho: result, row: saved[0] || null, updated: result.updates > 0 });
  } catch (e) {
    return send(e.code || 500, { error: e.message || String(e) });
  }
}
