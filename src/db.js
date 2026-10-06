import { supabase, signupClient } from './supabase.js';

// Since the 20261005 access rules the DATABASE refuses actions a role may not
// take. The guards' own messages are already plain English ("Store staff can
// accept a delivery but not change it."); the generic row-level-security
// wording is not, so translate that one.
function friendlyError(error, verb) {
  const msg = (error && error.message) || '';
  if (/row-level security|permission denied/i.test(msg)) {
    const e = new Error(`You don't have permission to ${verb} this.`);
    e.code = '42501'; e.cause = error;
    return e;
  }
  return error;
}

// ============================================
// AUTH
// ============================================
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

// Admin: create user via Supabase Auth admin (requires service role, so we use invite)
export async function inviteUser(email, name, role, password) {
  // signupClient, not supabase: see src/supabase.js. The profile is then written
  // by the admin's own session, which the access rules allow for a Super Admin.
  const { data, error } = await signupClient.auth.signUp({
    email,
    password: password || Math.random().toString(36).slice(-12) + 'A1!',
    options: { data: { name, role } }
  });
  if (error) throw error;
  // Manually create profile since trigger is removed
  if (data.user) {
    const avatar = (name || email.split('@')[0]).split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    const { error: pErr } = await supabase.from('profiles').upsert({
      id: data.user.id, name: name || email.split('@')[0], email, role: role || 'Viewer', avatar
    });
    if (pErr) throw friendlyError(pErr, 'create users');   // was silently ignored
  }
  return data;
}

// ============================================
// GENERIC CRUD
// ============================================
async function fetchAll(table, orderBy = 'created_at', ascending = true) {
  // Supabase/PostgREST caps a single select at 1000 rows. Tables like
  // diesel_readings have grown past that (thousands of rows), so a plain
  // select silently drops the rest — which made whole stores' history vanish
  // and store-staff see "0 readings". Page through in 1000-row chunks until
  // a short page signals the end.
  const PAGE = 1000;
  let from = 0;
  const all = [];
  for (;;) {
    // Secondary order on id: paging on a non-unique column (e.g. date, with
    // thousands of ties) is non-deterministic at page boundaries — the same
    // row can appear on two pages (phantom duplicates in the UI) or be
    // skipped. A unique tiebreaker makes the page windows stable.
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderBy, { ascending })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) { console.error(`Error fetching ${table}:`, error); break; }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function insertRow(table, row) {
  const { data, error } = await supabase.from(table).insert(row).select().maybeSingle();
  if (error) { console.error(`Error inserting ${table}:`, error); throw friendlyError(error, 'save'); }
  return data;
}

async function updateRow(table, id, updates, idCol = 'id') {
  const { data, error } = await supabase.from(table).update(updates).eq(idCol, id).select().maybeSingle();
  if (error) { console.error(`Error updating ${table}:`, error); throw friendlyError(error, 'change'); }
  // A row the access rules don't let this user change updates NOTHING and returns
  // no error. Without this check the app would show the change as saved.
  if (!data) throw new Error("Not saved: you don't have permission to change this, or it no longer exists.");
  return data;
}

async function deleteRow(table, id, idCol = 'id') {
  const { data, error } = await supabase.from(table).delete().eq(idCol, id).select();
  if (error) { console.error(`Error deleting ${table}:`, error); throw friendlyError(error, 'delete'); }
  // Same as updateRow: a refused delete removes nothing and returns no error.
  if (!data || data.length === 0) throw new Error("Not deleted: you don't have permission to delete this, or it was already deleted.");
}

// ============================================
// VEHICLES
// ============================================
export const db = {
  // Vehicles
  async getVehicles() { return fetchAll('vehicles', 'name'); },
  async addVehicle(v) { return insertRow('vehicles', v); },
  async updateVehicle(id, v) { return updateRow('vehicles', id, v); },
  async deleteVehicle(id) { return deleteRow('vehicles', id); },

  // Generators
  async getGenerators() { return fetchAll('generators', 'name'); },
  async addGenerator(g) { return insertRow('generators', g); },
  async updateGenerator(id, g) { return updateRow('generators', id, g); },
  async deleteGenerator(id) { return deleteRow('generators', id); },

  // Drivers
  async getDrivers() { return fetchAll('drivers', 'name'); },
  async addDriver(d) { return insertRow('drivers', d); },
  async updateDriver(id, d) { return updateRow('drivers', id, d); },
  async deleteDriver(id) { return deleteRow('drivers', id); },

  // Work Orders
  async getWorkOrders() { return fetchAll('work_orders', 'created_at', false); },
  async addWorkOrder(w) { return insertRow('work_orders', w); },
  async updateWorkOrder(id, w) { return updateRow('work_orders', id, w); },
  async deleteWorkOrder(id) { return deleteRow('work_orders', id); },

  // Fuel Logs
  async getFuelLogs() { return fetchAll('fuel_logs', 'date', false); },
  async addFuelLog(f) { return insertRow('fuel_logs', f); },
  async updateFuelLog(id, f) { return updateRow('fuel_logs', id, f); },
  async deleteFuelLog(id) { return deleteRow('fuel_logs', id); },

  // Odo Log
  async getOdoLog() { return fetchAll('odo_log', 'date', false); },
  async addOdoLog(o) { return insertRow('odo_log', o); },

  // Vendors
  async getVendors() { return fetchAll('vendors', 'name'); },
  async addVendor(v) { return insertRow('vendors', v); },
  async updateVendor(id, v) { return updateRow('vendors', id, v); },
  async deleteVendor(id) { return deleteRow('vendors', id); },

  // Papers
  async getPapers() { return fetchAll('papers', 'expiry_date'); },
  async addPaper(p) { return insertRow('papers', p); },
  async updatePaper(id, p) { return updateRow('papers', id, p); },
  async deletePaper(id) { return deleteRow('papers', id); },

  // Service Reminders
  async getSvcReminders() { return fetchAll('svc_reminders', 'next_due_date'); },
  async addSvcReminder(s) { return insertRow('svc_reminders', s); },
  async updateSvcReminder(id, s) { return updateRow('svc_reminders', id, s); },
  async deleteSvcReminder(id) { return deleteRow('svc_reminders', id); },

  // Inspections
  async getInspections() { return fetchAll('inspections', 'date', false); },
  async addInspection(i) { return insertRow('inspections', i); },
  async deleteInspection(id) { return deleteRow('inspections', id); },

  // Locations
  async getLocations() { return fetchAll('locations', 'name'); },
  async addLocation(name) { return insertRow('locations', { name }); },
  async deleteLocation(id) { return deleteRow('locations', id); },

  // Doc Types
  async getDocTypes() { return fetchAll('doc_types', 'name'); },
  async addDocType(name) { return insertRow('doc_types', { name }); },
  async deleteDocType(id) { return deleteRow('doc_types', id); },


  // Vendor Types
  async getVendorTypes() { return fetchAll('vendor_types', 'name'); },
  async addVendorType(name) { return insertRow('vendor_types', { name }); },
  async deleteVendorType(id) { return deleteRow('vendor_types', id); },
  // Inspection Items
  async getInspItems() { return fetchAll('insp_items', 'id'); },
  async addInspItem(name) { return insertRow('insp_items', { name }); },
  async deleteInspItem(id) { return deleteRow('insp_items', id); },

  // Profiles
  async getProfiles() { return fetchAll('profiles', 'name'); },
  async updateProfile(id, updates) { return updateRow('profiles', id, updates); },

  // ============================================
  // DIESEL TRACKING MODULE
  // ============================================

  // Diesel Readings (daily staff entries)
  async getDieselReadings() { return fetchAll('diesel_readings', 'date', false); },
  async getDieselReadingsByStore(storeLoc) {
    const { data, error } = await supabase.from('diesel_readings').select('*').eq('store_location', storeLoc).order('date', { ascending: false });
    if (error) { console.error('Error fetching diesel readings:', error); return []; }
    return data || [];
  },
  async addDieselReading(r) { return insertRow('diesel_readings', r); },
  async updateDieselReading(id, r) { return updateRow('diesel_readings', id, r); },
  async deleteDieselReading(id) { return deleteRow('diesel_readings', id); },

  // Diesel Purchases (admin)
  async getDieselPurchases() { return fetchAll('diesel_purchases', 'date', false); },
  async addDieselPurchase(p) { return insertRow('diesel_purchases', p); },
  async updateDieselPurchase(id, p) { return updateRow('diesel_purchases', id, p); },
  async deleteDieselPurchase(id) { return deleteRow('diesel_purchases', id); },

  // Diesel Distributions (admin to stores)
  async getDieselDistributions() { return fetchAll('diesel_distributions', 'date', false); },
  async getDieselDistributionsByStore(storeLoc) {
    const { data, error } = await supabase.from('diesel_distributions').select('*').eq('store_location', storeLoc).order('date', { ascending: false });
    if (error) { console.error('Error fetching distributions:', error); return []; }
    return data || [];
  },
  async addDieselDistribution(d) { return insertRow('diesel_distributions', d); },
  async updateDieselDistribution(id, d) { return updateRow('diesel_distributions', id, d); },
  async deleteDieselDistribution(id) { return deleteRow('diesel_distributions', id); },

  // Store Diesel Stock (ledger)
  async getStoreDieselStock() { return fetchAll('store_diesel_stock', 'date', false); },
  async getStoreDieselStockByStore(storeLoc) {
    const { data, error } = await supabase.from('store_diesel_stock').select('*').eq('store_location', storeLoc).order('date', { ascending: false });
    if (error) { console.error('Error fetching store stock:', error); return []; }
    return data || [];
  },
  async addStoreDieselStock(s) { return insertRow('store_diesel_stock', s); },

  // Generator Baselines
  async getGeneratorBaselines() { return fetchAll('generator_baselines', 'generator_id'); },
  async upsertGeneratorBaseline(b) {
    const { data, error } = await supabase.from('generator_baselines').upsert(b, { onConflict: 'generator_id' }).select().maybeSingle();
    if (error) { console.error('Error upserting baseline:', error); throw friendlyError(error, 'change'); }
    return data;
  },

  // App Settings (key/value)
  async getAppSettings() {
    const { data, error } = await supabase.from('app_settings').select('*');
    if (error) { console.error('Error fetching app_settings:', error); return []; }
    return data || [];
  },
  async setAppSetting(key, value, userId) {
    const { data, error } = await supabase.from('app_settings').upsert(
      { key, value, updated_at: new Date().toISOString(), updated_by: userId || null },
      { onConflict: 'key' }
    ).select().maybeSingle();
    if (error) { console.error('Error upserting app_setting:', error); throw friendlyError(error, 'change'); }
    return data;
  },

  // Change history (20261005_change_history.sql). Super Admin only; newest first.
  async getAuditLog({ from = 0, limit = 100, table = null } = {}) {
    let q = supabase.from('audit_log').select('*').order('id', { ascending: false }).range(from, from + limit - 1);
    if (table) q = q.eq('table_name', table);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  // Diesel Locks (manual admin locks on date ranges)
  async getDieselLocks() { return fetchAll('diesel_locks', 'from_date', false); },
  async addDieselLock(l) { return insertRow('diesel_locks', l); },
  async deleteDieselLock(id) { return deleteRow('diesel_locks', id); },

  // Diesel Transfers (store tank/generator -> vehicle or oven)
  async getDieselTransfers() { return fetchAll('diesel_transfers', 'date', false); },
  async addDieselTransfer(t) { return insertRow('diesel_transfers', t); },
  async updateDieselTransfer(id, t) { return updateRow('diesel_transfers', id, t); },
  async deleteDieselTransfer(id) { return deleteRow('diesel_transfers', id); },

  // NEPA Period Logs (custom date-range NEPA tracking)
  async getNepaPeriodLogs() { return fetchAll('nepa_period_logs', 'from_date', false); },
  async addNepaPeriodLog(n) { return insertRow('nepa_period_logs', n); },
  async updateNepaPeriodLog(id, n) { return updateRow('nepa_period_logs', id, n); },
  async deleteNepaPeriodLog(id) { return deleteRow('nepa_period_logs', id); },

  // Power on/off log (grid / NEPA). Periods that started since `sinceDate`
  // (YYYY-MM-DD), plus any still-open one however old. Paged like fetchAll.
  async getPowerPeriods(sinceDate) {
    const PAGE = 1000; const all = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase.from('power_periods').select('*')
        .or(`on_at.gte.${sinceDate},off_at.is.null`)
        .order('on_at', { ascending: false }).order('id').range(from, from + PAGE - 1);
      if (error) throw error;
      all.push(...(data || []));
      if (!data || data.length < PAGE) return all;
    }
  },
  async addPowerPeriod(p) { return insertRow('power_periods', p); },
  async updatePowerPeriod(id, p) { return updateRow('power_periods', id, p); },
  async deletePowerPeriod(id) { return deleteRow('power_periods', id); },

  // Daily stock: main tank / tanker gauge readings and tanker loadings.
  async getStockChecks() { return fetchAll('diesel_stock_checks', 'date', true); },
  async addStockCheck(c) { return insertRow('diesel_stock_checks', c); },
  async updateStockCheck(id, c) { return updateRow('diesel_stock_checks', id, c); },
  async deleteStockCheck(id) { return deleteRow('diesel_stock_checks', id); },
  async getTankerLoads() { return fetchAll('tanker_loads', 'date', true); },
  async addTankerLoad(l) { return insertRow('tanker_loads', l); },
  async deleteTankerLoad(id) { return deleteRow('tanker_loads', id); },
};
