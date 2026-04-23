import { supabase } from './supabase.js';

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
  const { data, error } = await supabase.auth.signUp({
    email,
    password: password || Math.random().toString(36).slice(-12) + 'A1!',
    options: { data: { name, role } }
  });
  if (error) throw error;
  // Manually create profile since trigger is removed
  if (data.user) {
    const avatar = (name || email.split('@')[0]).split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    await supabase.from('profiles').upsert({
      id: data.user.id, name: name || email.split('@')[0], email, role: role || 'Viewer', avatar
    });
  }
  return data;
}

// ============================================
// GENERIC CRUD
// ============================================
async function fetchAll(table, orderBy = 'created_at', ascending = true) {
  const { data, error } = await supabase.from(table).select('*').order(orderBy, { ascending });
  if (error) { console.error(`Error fetching ${table}:`, error); return []; }
  return data || [];
}

async function insertRow(table, row) {
  const { data, error } = await supabase.from(table).insert(row).select().maybeSingle();
  if (error) { console.error(`Error inserting ${table}:`, error); throw error; }
  return data;
}

async function updateRow(table, id, updates, idCol = 'id') {
  const { data, error } = await supabase.from(table).update(updates).eq(idCol, id).select().maybeSingle();
  if (error) { console.error(`Error updating ${table}:`, error); throw error; }
  return data;
}

async function deleteRow(table, id, idCol = 'id') {
  const { error } = await supabase.from(table).delete().eq(idCol, id);
  if (error) { console.error(`Error deleting ${table}:`, error); throw error; }
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
    if (error) { console.error('Error upserting baseline:', error); throw error; }
    return data;
  },
};
