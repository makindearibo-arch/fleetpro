// POST /api/admin-set-password  { userId, password }
//
// The Super Admin sets another user's password (Settings -> Users -> Set password).
// Changing someone else's password needs Supabase's service-role key, which must
// never reach the browser, so it lives only in Vercel's SERVER environment as
// SUPABASE_SERVICE_ROLE_KEY (no VITE_ prefix -> never bundled into the app).
//
// Every call is checked here, not in the browser: the caller's own login token
// must be valid AND belong to a profile whose role is Super Admin. The change is
// written to the change history (who, whose password, when) -- the password
// itself is never logged or stored anywhere but in Supabase Auth.
const SUPABASE_URL_DEFAULT = "https://bddmsrbfygbuyfdpieyl.supabase.co";
const MIN_LEN = 8;
const MAX_LEN = 72;   // bcrypt ignores anything longer

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return null; } }
  const chunks = [];
  for await (const c of req) chunks.push(typeof c === "string" ? Buffer.from(c) : c);
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "null"); } catch { return null; }
}

export default async function handler(req, res) {
  const send = (code, body) => {
    res.statusCode = code;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(body));
  };
  if (req.method !== "POST") return send(405, { error: "Use POST." });

  const url = process.env.SUPABASE_URL || SUPABASE_URL_DEFAULT;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return send(500, { error: "Setting passwords is not switched on yet: SUPABASE_SERVICE_ROLE_KEY is missing from Vercel's environment variables." });

  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return send(401, { error: "Please log in again." });

  try {
    // 1. Who is asking? (their own login token, checked by Supabase)
    const who = await fetch(url + "/auth/v1/user", { headers: { apikey: key, Authorization: "Bearer " + token } });
    if (!who.ok) return send(401, { error: "Your login has expired - please log in again." });
    const caller = await who.json();
    const admin = { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };
    const pr = await fetch(url + "/rest/v1/profiles?select=id,name,role&id=eq." + encodeURIComponent(caller.id || ""), { headers: admin });
    const me = pr.ok ? (await pr.json())[0] : null;
    if (!me || me.role !== "Super Admin") return send(403, { error: "Only the Super Admin can set passwords." });

    // 2. Whose password, and is it acceptable?
    const body = await readJson(req);
    const userId = body && typeof body.userId === "string" ? body.userId.trim() : "";
    const password = body && typeof body.password === "string" ? body.password : "";
    if (!/^[0-9a-f-]{36}$/i.test(userId)) return send(400, { error: "Choose the user." });
    if (password.length < MIN_LEN) return send(400, { error: `The password must be at least ${MIN_LEN} characters.` });
    if (password.length > MAX_LEN) return send(400, { error: `The password must be at most ${MAX_LEN} characters.` });
    const tp = await fetch(url + "/rest/v1/profiles?select=id,name,email,role&id=eq." + encodeURIComponent(userId), { headers: admin });
    const target = tp.ok ? (await tp.json())[0] : null;
    if (!target) return send(404, { error: "That user was not found." });

    // 3. Set it (Supabase Auth admin API)
    const up = await fetch(url + "/auth/v1/admin/users/" + encodeURIComponent(userId), {
      method: "PUT", headers: admin, body: JSON.stringify({ password }),
    });
    if (!up.ok) {
      let why = "";
      try { const j = await up.json(); why = j.msg || j.message || j.error_description || j.error || ""; } catch { /* not JSON */ }
      return send(400, { error: "Supabase did not accept the new password" + (why ? ": " + why : ".") });
    }

    // 4. Change history (never the password)
    await fetch(url + "/rest/v1/audit_log", {
      method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify({
        table_name: "auth_users", row_id: userId, action: "UPDATE",
        user_id: me.id, user_name: me.name, user_role: me.role,
        old_data: null, new_data: { name: target.name, email: target.email, what: "password set by the Super Admin" },
        changed: ["password"],
      }),
    }).catch(() => {});

    return send(200, { ok: true, name: target.name, email: target.email });
  } catch (e) {
    return send(502, { error: "Could not reach Supabase - try again." });
  }
}
