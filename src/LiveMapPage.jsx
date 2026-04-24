import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer } from "recharts";
import { Truck, Clock, Gauge, AlertTriangle, Search, Filter, ChevronRight, ChevronLeft, Calendar, X, MapPin, Navigation, Play, Pause, RotateCcw } from "lucide-react";
import { getDevices, getPositions, getRoute, getTrips, getSummary, isConfigured, toKmh, toKm, formatDuration, statusColor, timeAgo } from "./traccar.js";

const P = "#0F62FE";
const isMob = () => typeof window !== "undefined" && window.innerWidth < 768;

// Custom vehicle marker icon
function vehicleIcon(color, heading) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
    <circle cx="20" cy="20" r="16" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="2"/>
    <circle cx="20" cy="20" r="6" fill="${color}"/>
    ${heading !== undefined ? `<line x1="20" y1="20" x2="${20 + 12 * Math.sin(heading * Math.PI / 180)}" y2="${20 - 12 * Math.cos(heading * Math.PI / 180)}" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>` : ''}
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
}

// Route point icon (small dot)
function routeDot(color) {
  return L.divIcon({
    html: `<div style="width:8px;height:8px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
    className: '',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
}

// Fit map bounds to markers
function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [positions, map]);
  return null;
}

// Pan to a specific position
function PanTo({ lat, lng, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.flyTo([lat, lng], zoom || 15, { duration: 1 });
  }, [lat, lng, zoom, map]);
  return null;
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function LiveMapPage() {
  const [devices, setDevices] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("live"); // live | route | trips | speed
  const [panTo, setPanTo] = useState(null);
  const mob = isMob();

  // Route playback state
  const [routeDate, setRouteDate] = useState(new Date().toISOString().slice(0, 10));
  const [routeData, setRouteData] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [playIdx, setPlayIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const playRef = useRef(null);

  // Trip state
  const [trips, setTrips] = useState([]);
  const [tripLoading, setTripLoading] = useState(false);
  const [tripDate, setTripDate] = useState(new Date().toISOString().slice(0, 10));

  // Speed state
  const [speedData, setSpeedData] = useState([]);
  const [speedDate, setSpeedDate] = useState(new Date().toISOString().slice(0, 10));
  const [speedLoading, setSpeedLoading] = useState(false);

  // Panel state
  const [showPanel, setShowPanel] = useState(!mob);

  // ============================================
  // LIVE DATA - auto refresh
  // ============================================
  const fetchLive = useCallback(async () => {
    try {
      const [devs, pos] = await Promise.all([getDevices(), getPositions()]);
      setDevices(devs);
      setPositions(pos);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isConfigured()) {
      setError("Traccar not configured. Add VITE_TRACCAR_URL, VITE_TRACCAR_EMAIL, VITE_TRACCAR_PASSWORD to your environment.");
      setLoading(false);
      return;
    }
    fetchLive();
    const interval = setInterval(fetchLive, 15000);
    return () => clearInterval(interval);
  }, [fetchLive]);

  // ============================================
  // ROUTE PLAYBACK
  // ============================================
  const loadRoute = async () => {
    if (!selected) return;
    setRouteLoading(true);
    try {
      const from = new Date(routeDate + "T00:00:00Z");
      const to = new Date(routeDate + "T23:59:59Z");
      const data = await getRoute(selected.id, from, to);
      setRouteData(data);
      setPlayIdx(0);
      setPlaying(false);
    } catch (e) {
      console.error("Route load error:", e);
    } finally {
      setRouteLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "route" && selected) loadRoute();
  }, [tab, selected?.id, routeDate]);

  // Playback animation
  useEffect(() => {
    if (playing && routeData.length > 0) {
      playRef.current = setInterval(() => {
        setPlayIdx(prev => {
          if (prev >= routeData.length - 1) { setPlaying(false); return prev; }
          return prev + 1;
        });
      }, 200);
    }
    return () => clearInterval(playRef.current);
  }, [playing, routeData.length]);

  // ============================================
  // TRIPS
  // ============================================
  const loadTrips = async () => {
    if (!selected) return;
    setTripLoading(true);
    try {
      const from = new Date(tripDate + "T00:00:00Z");
      const to = new Date(tripDate + "T23:59:59Z");
      const data = await getTrips(selected.id, from, to);
      setTrips(data);
    } catch (e) {
      console.error("Trip load error:", e);
    } finally {
      setTripLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "trips" && selected) loadTrips();
  }, [tab, selected?.id, tripDate]);

  // ============================================
  // SPEED HISTORY
  // ============================================
  const loadSpeed = async () => {
    if (!selected) return;
    setSpeedLoading(true);
    try {
      const from = new Date(speedDate + "T00:00:00Z");
      const to = new Date(speedDate + "T23:59:59Z");
      const data = await getRoute(selected.id, from, to);
      // Sample every Nth point to keep chart readable
      const step = Math.max(1, Math.floor(data.length / 100));
      const sampled = data.filter((_, i) => i % step === 0).map(p => ({
        time: new Date(p.fixTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        speed: toKmh(p.speed)
      }));
      setSpeedData(sampled);
    } catch (e) {
      console.error("Speed load error:", e);
    } finally {
      setSpeedLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "speed" && selected) loadSpeed();
  }, [tab, selected?.id, speedDate]);

  // ============================================
  // HELPERS
  // ============================================
  const getPos = (deviceId) => positions.find(p => p.deviceId === deviceId);
  const deviceList = devices.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  const onlineCount = devices.filter(d => d.status === "online").length;
  const movingCount = positions.filter(p => toKmh(p.speed) > 3).length;
  const offlineCount = devices.length - onlineCount;

  // Map center (Nigeria default)
  const defaultCenter = [7.25, 5.2];

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "70vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid #E0E0E0", borderTopColor: P, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14, color: "#6F6F6F" }}>Loading GPS data...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    );
  }

  if (error && !devices.length) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "70vh" }}>
        <div style={{ textAlign: "center", maxWidth: 400, padding: 20 }}>
          <AlertTriangle size={40} color="#DA1E28" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>GPS Connection Error</div>
          <div style={{ fontSize: 13, color: "#6F6F6F", marginBottom: 16 }}>{error}</div>
          <button onClick={fetchLive} style={{ padding: "8px 20px", background: P, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 60px)", position: "relative", overflow: "hidden" }}>
      {/* ============================================ */}
      {/* SIDE PANEL */}
      {/* ============================================ */}
      {showPanel && (
        <div style={{
          width: mob ? "100%" : 340,
          background: "#fff",
          borderRight: "1px solid #E8ECF1",
          display: "flex",
          flexDirection: "column",
          position: mob ? "absolute" : "relative",
          zIndex: mob ? 1000 : 1,
          height: "100%"
        }}>
          {/* Header */}
          <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #E8ECF1" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Live Tracking</h2>
              {mob && <button onClick={() => setShowPanel(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>}
            </div>

            {/* KPI row */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1, background: "#F0FFF4", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#24A148" }}>{onlineCount}</div>
                <div style={{ fontSize: 10, color: "#6F6F6F" }}>Online</div>
              </div>
              <div style={{ flex: 1, background: "#EBF0FF", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: P }}>{movingCount}</div>
                <div style={{ fontSize: 10, color: "#6F6F6F" }}>Moving</div>
              </div>
              <div style={{ flex: 1, background: "#F4F4F4", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#8D8D8D" }}>{offlineCount}</div>
                <div style={{ fontSize: 10, color: "#6F6F6F" }}>Offline</div>
              </div>
            </div>

            {/* Search */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F4F4F4", borderRadius: 8, padding: "8px 12px" }}>
              <Search size={14} color="#8D8D8D" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vehicles..."
                style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, width: "100%", fontFamily: "inherit" }} />
            </div>
          </div>

          {/* Device list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {deviceList.map(d => {
              const pos = getPos(d.id);
              const speed = pos ? toKmh(pos.speed) : 0;
              const isActive = selected?.id === d.id;
              const color = statusColor(d.status);
              return (
                <div key={d.id} onClick={() => {
                  setSelected(d);
                  if (pos) setPanTo({ lat: pos.latitude, lng: pos.longitude });
                  if (mob) setShowPanel(false);
                }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                    background: isActive ? "#EBF0FF" : "transparent", border: isActive ? `1.5px solid ${P}` : "1.5px solid transparent",
                    marginBottom: 4, transition: "all 0.15s"
                  }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Truck size={18} color={color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: "#8D8D8D" }}>
                      {speed > 0 ? `${speed} km/h` : d.status === "online" ? "Parked" : "Offline"}
                      {pos && ` · ${timeAgo(pos.fixTime)}`}
                    </div>
                  </div>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                </div>
              );
            })}
            {deviceList.length === 0 && (
              <div style={{ textAlign: "center", padding: 30, color: "#8D8D8D", fontSize: 13 }}>No vehicles found</div>
            )}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MAP + DETAILS */}
      {/* ============================================ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
        {/* Toggle panel button (when hidden) */}
        {!showPanel && (
          <button onClick={() => setShowPanel(true)}
            style={{ position: "absolute", top: 12, left: 12, zIndex: 1000, width: 36, height: 36, borderRadius: 8, background: "#fff", border: "1px solid #E0E0E0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <ChevronRight size={16} />
          </button>
        )}

        {/* Hide panel button */}
        {showPanel && !mob && (
          <button onClick={() => setShowPanel(false)}
            style={{ position: "absolute", top: 12, left: 352, zIndex: 1000, width: 28, height: 28, borderRadius: 6, background: "#fff", border: "1px solid #E0E0E0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <ChevronLeft size={14} />
          </button>
        )}

        {/* Mobile panel trigger */}
        {mob && !showPanel && (
          <button onClick={() => setShowPanel(true)}
            style={{ position: "absolute", bottom: selected ? 260 : 16, left: 12, zIndex: 1000, padding: "8px 14px", borderRadius: 8, background: "#fff", border: "1px solid #E0E0E0", cursor: "pointer", fontSize: 12, fontWeight: 600, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: 6 }}>
            <Truck size={14} /> {devices.length} Vehicles
          </button>
        )}

        {/* MAP */}
        <div style={{ flex: 1 }}>
          <MapContainer center={defaultCenter} zoom={8} style={{ height: "100%", width: "100%" }} zoomControl={!mob}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Fit bounds on initial load */}
            {positions.length > 0 && !panTo && <FitBounds positions={positions} />}

            {/* Pan to selected vehicle */}
            {panTo && <PanTo lat={panTo.lat} lng={panTo.lng} />}

            {/* Live vehicle markers */}
            {tab === "live" && positions.map(pos => {
              const dev = devices.find(d => d.id === pos.deviceId);
              if (!dev) return null;
              const speed = toKmh(pos.speed);
              const color = speed > 3 ? "#0F62FE" : dev.status === "online" ? "#24A148" : "#8D8D8D";
              return (
                <Marker key={pos.id} position={[pos.latitude, pos.longitude]} icon={vehicleIcon(color, pos.course)}
                  eventHandlers={{ click: () => { setSelected(dev); setPanTo(null); } }}>
                  <Popup>
                    <div style={{ fontSize: 13, minWidth: 160 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{dev.name}</div>
                      <div>Speed: {speed} km/h</div>
                      <div>Updated: {timeAgo(pos.fixTime)}</div>
                      {pos.attributes?.batteryLevel !== undefined && <div>Battery: {Math.round(pos.attributes.batteryLevel)}%</div>}
                      {pos.attributes?.ignition !== undefined && <div>Ignition: {pos.attributes.ignition ? "ON" : "OFF"}</div>}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Route playback polyline + marker */}
            {tab === "route" && routeData.length > 0 && (
              <>
                <Polyline positions={routeData.map(p => [p.latitude, p.longitude])} color={P} weight={3} opacity={0.7} />
                {/* Start marker */}
                <Marker position={[routeData[0].latitude, routeData[0].longitude]} icon={routeDot("#24A148")} />
                {/* End marker */}
                <Marker position={[routeData[routeData.length - 1].latitude, routeData[routeData.length - 1].longitude]} icon={routeDot("#DA1E28")} />
                {/* Current playback position */}
                {routeData[playIdx] && (
                  <Marker position={[routeData[playIdx].latitude, routeData[playIdx].longitude]}
                    icon={vehicleIcon(P, routeData[playIdx].course)}>
                    <Popup>
                      <div style={{ fontSize: 13 }}>
                        <div style={{ fontWeight: 600 }}>{new Date(routeData[playIdx].fixTime).toLocaleTimeString()}</div>
                        <div>Speed: {toKmh(routeData[playIdx].speed)} km/h</div>
                      </div>
                    </Popup>
                  </Marker>
                )}
                <FitBounds positions={routeData} />
              </>
            )}
          </MapContainer>
        </div>

        {/* ============================================ */}
        {/* BOTTOM DETAIL PANEL (when vehicle selected) */}
        {/* ============================================ */}
        {selected && (
          <div style={{
            background: "#fff",
            borderTop: "1px solid #E8ECF1",
            padding: mob ? "12px 14px" : "14px 20px",
          }}>
            {/* Vehicle header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: statusColor(selected.status) + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Truck size={16} color={statusColor(selected.status)} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{selected.name}</div>
                  <div style={{ fontSize: 11, color: "#8D8D8D" }}>
                    {(() => { const p = getPos(selected.id); return p ? `${toKmh(p.speed)} km/h · ${timeAgo(p.fixTime)}` : "No data"; })()}
                  </div>
                </div>
              </div>
              <button onClick={() => { setSelected(null); setPanTo(null); setRouteData([]); setTrips([]); setSpeedData([]); setTab("live"); }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={16} color="#8D8D8D" />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #E8ECF1", marginBottom: 12 }}>
              {[
                { id: "live", label: "Live", icon: Navigation },
                { id: "route", label: "Route", icon: MapPin },
                { id: "trips", label: "Trips", icon: Clock },
                { id: "speed", label: "Speed", icon: Gauge }
              ].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: tab === t.id ? 600 : 400,
                    color: tab === t.id ? P : "#8D8D8D", background: "none", borderBottom: tab === t.id ? `2px solid ${P}` : "2px solid transparent"
                  }}>
                  <t.icon size={13} /> {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ maxHeight: mob ? 150 : 180, overflowY: "auto" }}>
              {/* LIVE TAB */}
              {tab === "live" && (() => {
                const pos = getPos(selected.id);
                if (!pos) return <div style={{ fontSize: 13, color: "#8D8D8D" }}>No position data available</div>;
                return (
                  <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 10 }}>
                    <InfoCard label="Speed" value={`${toKmh(pos.speed)} km/h`} />
                    <InfoCard label="Heading" value={`${Math.round(pos.course || 0)}°`} />
                    <InfoCard label="Altitude" value={`${Math.round(pos.altitude || 0)}m`} />
                    <InfoCard label="Satellites" value={pos.attributes?.sat || "—"} />
                    {pos.attributes?.ignition !== undefined && <InfoCard label="Ignition" value={pos.attributes.ignition ? "ON" : "OFF"} />}
                    {pos.attributes?.batteryLevel !== undefined && <InfoCard label="Battery" value={`${Math.round(pos.attributes.batteryLevel)}%`} />}
                    <InfoCard label="Latitude" value={pos.latitude.toFixed(5)} />
                    <InfoCard label="Longitude" value={pos.longitude.toFixed(5)} />
                  </div>
                );
              })()}

              {/* ROUTE TAB */}
              {tab === "route" && (
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                    <input type="date" value={routeDate} onChange={e => setRouteDate(e.target.value)}
                      style={{ padding: "6px 10px", borderRadius: 6, border: "1.5px solid #E0E0E0", fontSize: 12, fontFamily: "inherit" }} />
                    <button onClick={loadRoute} style={{ padding: "6px 14px", background: P, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Load</button>
                  </div>
                  {routeLoading ? (
                    <div style={{ fontSize: 13, color: "#8D8D8D" }}>Loading route...</div>
                  ) : routeData.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#8D8D8D" }}>No route data for this date</div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <button onClick={() => { setPlayIdx(0); setPlaying(false); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><RotateCcw size={14} /></button>
                        <button onClick={() => setPlaying(!playing)} style={{ width: 30, height: 30, borderRadius: "50%", background: P, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {playing ? <Pause size={13} color="#fff" /> : <Play size={13} color="#fff" style={{ marginLeft: 2 }} />}
                        </button>
                        <input type="range" min={0} max={routeData.length - 1} value={playIdx} onChange={e => { setPlayIdx(parseInt(e.target.value)); setPlaying(false); }}
                          style={{ flex: 1 }} />
                        <span style={{ fontSize: 11, color: "#6F6F6F", minWidth: 50 }}>
                          {routeData[playIdx] ? new Date(routeData[playIdx].fixTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "#6F6F6F" }}>
                        {routeData.length} points · {new Date(routeData[0].fixTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(routeData[routeData.length - 1].fixTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {routeData[playIdx] && ` · ${toKmh(routeData[playIdx].speed)} km/h`}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TRIPS TAB */}
              {tab === "trips" && (
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                    <input type="date" value={tripDate} onChange={e => setTripDate(e.target.value)}
                      style={{ padding: "6px 10px", borderRadius: 6, border: "1.5px solid #E0E0E0", fontSize: 12, fontFamily: "inherit" }} />
                    <button onClick={loadTrips} style={{ padding: "6px 14px", background: P, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Load</button>
                  </div>
                  {tripLoading ? (
                    <div style={{ fontSize: 13, color: "#8D8D8D" }}>Loading trips...</div>
                  ) : trips.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#8D8D8D" }}>No trips for this date</div>
                  ) : (
                    <div>
                      {trips.map((trip, i) => (
                        <div key={i} style={{ padding: "8px 10px", borderRadius: 8, background: "#F8FAFF", marginBottom: 6, fontSize: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontWeight: 600 }}>Trip {i + 1}</span>
                            <span style={{ color: "#6F6F6F" }}>{toKm(trip.distance)} km · {formatDuration(trip.duration)}</span>
                          </div>
                          <div style={{ color: "#6F6F6F" }}>
                            {new Date(trip.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} → {new Date(trip.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          {trip.maxSpeed > 0 && <div style={{ color: "#6F6F6F" }}>Max speed: {toKmh(trip.maxSpeed)} km/h · Avg: {toKmh(trip.averageSpeed)} km/h</div>}
                        </div>
                      ))}
                      <div style={{ fontSize: 12, color: "#6F6F6F", marginTop: 6 }}>
                        Total: {trips.length} trips · {toKm(trips.reduce((s, t) => s + (t.distance || 0), 0))} km · {formatDuration(trips.reduce((s, t) => s + (t.duration || 0), 0))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SPEED TAB */}
              {tab === "speed" && (
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                    <input type="date" value={speedDate} onChange={e => setSpeedDate(e.target.value)}
                      style={{ padding: "6px 10px", borderRadius: 6, border: "1.5px solid #E0E0E0", fontSize: 12, fontFamily: "inherit" }} />
                    <button onClick={loadSpeed} style={{ padding: "6px 14px", background: P, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Load</button>
                  </div>
                  {speedLoading ? (
                    <div style={{ fontSize: 13, color: "#8D8D8D" }}>Loading speed data...</div>
                  ) : speedData.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#8D8D8D" }}>No speed data for this date</div>
                  ) : (
                    <div style={{ height: 120 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={speedData}>
                          <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 10 }} width={35} />
                          <RTooltip formatter={(v) => [`${v} km/h`, "Speed"]} labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 12 }} />
                          <Bar dataKey="speed" fill={P} radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Small info card for live data
function InfoCard({ label, value }) {
  return (
    <div style={{ background: "#F4F4F4", borderRadius: 8, padding: "8px 10px" }}>
      <div style={{ fontSize: 10, color: "#6F6F6F", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
