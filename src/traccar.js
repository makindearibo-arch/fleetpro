// ============================================
// Traccar GPS API Helper
// Uses Basic Auth via Vite env vars
// Set VITE_TRACCAR_URL, VITE_TRACCAR_EMAIL, VITE_TRACCAR_PASSWORD in Vercel
// ============================================

const TRACCAR_URL = import.meta.env.VITE_TRACCAR_URL || '';
const TRACCAR_EMAIL = import.meta.env.VITE_TRACCAR_EMAIL || '';
const TRACCAR_PASS = import.meta.env.VITE_TRACCAR_PASSWORD || '';

const headers = () => ({
  'Authorization': 'Basic ' + btoa(TRACCAR_EMAIL + ':' + TRACCAR_PASS),
  'Content-Type': 'application/json',
  'Accept': 'application/json'
});

async function api(endpoint, params = {}) {
  const url = new URL(TRACCAR_URL + '/api' + endpoint);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.append(k, v);
  });
  const res = await fetch(url.toString(), { headers: headers() });
  if (!res.ok) throw new Error(`Traccar API error: ${res.status} ${res.statusText}`);
  return res.json();
}

// ============================================
// DEVICES
// ============================================
export async function getDevices() {
  return api('/devices');
}

export async function getDevice(id) {
  const devices = await api('/devices', { id });
  return devices[0] || null;
}

// ============================================
// POSITIONS
// ============================================

// Get latest position for all devices (or specific device)
export async function getPositions(deviceId) {
  const params = {};
  if (deviceId) params.deviceId = deviceId;
  return api('/positions', params);
}

// Get historical positions for a device in a time range
export async function getRoutePositions(deviceId, from, to) {
  return api('/positions', {
    deviceId,
    from: from.toISOString(),
    to: to.toISOString()
  });
}

// ============================================
// REPORTS
// ============================================

// Trip report: start/end location, distance, duration
export async function getTrips(deviceId, from, to) {
  return api('/reports/trips', {
    deviceId,
    from: from.toISOString(),
    to: to.toISOString()
  });
}

// Route report (detailed positions along route)
export async function getRoute(deviceId, from, to) {
  return api('/reports/route', {
    deviceId,
    from: from.toISOString(),
    to: to.toISOString()
  });
}

// Summary report (distance, engine hours, etc.)
export async function getSummary(deviceId, from, to) {
  return api('/reports/summary', {
    deviceId,
    from: from.toISOString(),
    to: to.toISOString()
  });
}

// ============================================
// GEOFENCES
// ============================================
export async function getGeofences() {
  return api('/geofences');
}

// ============================================
// HELPERS
// ============================================
export function isConfigured() {
  return !!(TRACCAR_URL && TRACCAR_EMAIL && TRACCAR_PASS);
}

// Format speed from knots to km/h
export function toKmh(knots) {
  return Math.round((knots || 0) * 1.852);
}

// Format distance from meters to km
export function toKm(meters) {
  return Math.round((meters || 0) / 1000 * 10) / 10;
}

// Format duration from milliseconds to readable string
export function formatDuration(ms) {
  if (!ms) return '0m';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// Get device status color
export function statusColor(status) {
  if (status === 'online') return '#24A148';
  if (status === 'moving') return '#0F62FE';
  return '#8D8D8D';
}

// Time ago string
export function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
