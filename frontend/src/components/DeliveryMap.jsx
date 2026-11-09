import React, { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Fix Leaflet default marker icons bundled with Webpack ────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl:       require('leaflet/dist/images/marker-icon.png'),
  shadowUrl:     require('leaflet/dist/images/marker-shadow.png'),
});

// ─── Custom map icons ─────────────────────────────────────────────────────────
const makeIcon = (emoji, bg) =>
  new L.DivIcon({
    className: '',
    html: `<div style="
      background:${bg};color:white;border-radius:50%;
      width:38px;height:38px;display:flex;align-items:center;
      justify-content:center;font-size:19px;
      box-shadow:0 2px 10px rgba(0,0,0,0.30);border:2.5px solid white;">
      ${emoji}
    </div>`,
    iconSize:    [38, 38],
    iconAnchor:  [19, 19],
    popupAnchor: [0, -22],
  });

const warehouseIcon   = makeIcon('🏭', '#1e3a8a');
const destinationIcon = makeIcon('🏠', '#16a34a');
const driverIcon      = new L.DivIcon({
  className: '',
  html: `<div style="
    background:#2563eb;color:white;border-radius:50%;
    width:44px;height:44px;display:flex;align-items:center;
    justify-content:center;font-size:23px;
    box-shadow:0 2px 14px rgba(37,99,235,0.55);border:3px solid white;
    animation:driverPulse 1.5s infinite;">
    🚚
  </div>
  <style>
    @keyframes driverPulse {
      0%,100%{box-shadow:0 0 0 0 rgba(37,99,235,0.45);}
      50%{box-shadow:0 0 0 10px rgba(37,99,235,0);}
    }
  </style>`,
  iconSize:    [44, 44],
  iconAnchor:  [22, 22],
  popupAnchor: [0, -25],
});

// ─── OSRM Routing ─────────────────────────────────────────────────────────────
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

/**
 * Fetch a road-following route from OSRM between all waypoints.
 * Returns an array of [lat, lng] pairs.
 */
async function fetchRoadRoute(waypoints) {
  // OSRM expects: lng,lat;lng,lat;...
  const coords = waypoints
    .map((w) => `${parseFloat(w.lng).toFixed(6)},${parseFloat(w.lat).toFixed(6)}`)
    .join(';');

  const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);

  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error(`OSRM error: ${data.code}`);
  }

  // GeoJSON coordinates are [lng, lat] — flip to [lat, lng] for Leaflet
  return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
}

// ─── Fit map to full route on initial load ────────────────────────────────────
function FitBounds({ positions }) {
  const map    = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || positions.length < 2) return;
    fitted.current = true;
    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding: [40, 40], animate: false });
  }, [positions, map]);

  return null;
}

// ─── Progress bar overlay ─────────────────────────────────────────────────────
function RouteStatusOverlay({ status, routeLoading, routeError }) {
  if (!routeLoading && !routeError) return null;

  return (
    <div
      style={{
        position:     'absolute',
        top:          10,
        left:         '50%',
        transform:    'translateX(-50%)',
        zIndex:       1000,
        background:   routeError ? '#fef2f2' : 'white',
        border:       `1px solid ${routeError ? '#fca5a5' : '#e2e8f0'}`,
        borderRadius: 8,
        padding:      '8px 16px',
        fontSize:     '0.82rem',
        fontWeight:   600,
        color:        routeError ? '#dc2626' : '#475569',
        boxShadow:    '0 2px 8px rgba(0,0,0,0.12)',
        whiteSpace:   'nowrap',
      }}
    >
      {routeLoading && '🛣️  Fetching road route…'}
      {routeError   && `⚠️  Road route unavailable — showing straight-line path`}
    </div>
  );
}

// ─── DeliveryMap ──────────────────────────────────────────────────────────────
export default function DeliveryMap({ waypoints = [], driverPos, status }) {
  const [roadPoints,   setRoadPoints]   = useState([]); // full road geometry
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError,   setRouteError]   = useState(false);

  // Fetch OSRM road geometry whenever waypoints change
  const waypointKey = waypoints.map((w) => `${w.lat},${w.lng}`).join('|');

  useEffect(() => {
    if (waypoints.length < 2) return;

    setRouteLoading(true);
    setRouteError(false);

    fetchRoadRoute(waypoints)
      .then((pts) => {
        setRoadPoints(pts);
        setRouteLoading(false);
      })
      .catch((err) => {
        console.warn('OSRM fetch failed, falling back to straight lines:', err.message);
        // Fallback: use straight-line waypoints
        setRoadPoints(waypoints.map((w) => [parseFloat(w.lat), parseFloat(w.lng)]));
        setRouteError(true);
        setRouteLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypointKey]);

  if (!waypoints.length) return null;

  const first = waypoints[0];
  const last  = waypoints[waypoints.length - 1];

  // ── Driver position on the road ──────────────────────────────────────────
  // Map the WebSocket step index → index in the road geometry array
  let driverRoadPos = null;
  let driverRoadIndex = 0;

  if (roadPoints.length > 0) {
    const step  = driverPos?.step  ?? 0;
    const total = driverPos?.total ?? Math.max(waypoints.length, 1);
    const pct   = Math.min(step / Math.max(total - 1, 1), 1);
    driverRoadIndex = Math.floor(pct * (roadPoints.length - 1));
    driverRoadPos   = roadPoints[driverRoadIndex];
  }

  const isDelivered  = status === 'delivered';
  const isStationary = status === 'pending' || status === 'in_warehouse';

  // Completed portion of the road (solid blue)
  const completedRoad = isDelivered
    ? roadPoints                           // whole route done
    : roadPoints.slice(0, driverRoadIndex + 1);

  // Remaining portion (dashed grey)
  const remainingRoad = isDelivered
    ? []
    : roadPoints.slice(driverRoadIndex);

  const mapCenter = [parseFloat(first.lat), parseFloat(first.lng)];

  return (
    <div style={{ position: 'relative' }}>
      <RouteStatusOverlay
        routeLoading={routeLoading}
        routeError={routeError}
      />

      <MapContainer
        center={mapCenter}
        zoom={13}
        scrollWheelZoom
        style={{ height: '440px', width: '100%', borderRadius: 8 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* ── Road lines ──────────────────────────────────────────────── */}

        {/* Remaining road — dashed grey */}
        {remainingRoad.length > 1 && (
          <Polyline
            positions={remainingRoad}
            pathOptions={{ color: '#94a3b8', weight: 4, dashArray: '8 6' }}
          />
        )}

        {/* Completed road — solid blue */}
        {completedRoad.length > 1 && (
          <Polyline
            positions={completedRoad}
            pathOptions={{ color: '#2563eb', weight: 5 }}
          />
        )}

        {/* ── Markers ─────────────────────────────────────────────────── */}

        {/* Origin / Warehouse */}
        <Marker
          position={[parseFloat(first.lat), parseFloat(first.lng)]}
          icon={warehouseIcon}
        >
          <Popup>
            <strong>📦 Origin</strong>
            <br />
            {first.label}
          </Popup>
        </Marker>

        {/* Destination */}
        <Marker
          position={[parseFloat(last.lat), parseFloat(last.lng)]}
          icon={destinationIcon}
        >
          <Popup>
            <strong>🏠 Destination</strong>
            <br />
            {last.label}
          </Popup>
        </Marker>

        {/* Driver truck — only visible when moving */}
        {!isDelivered && !isStationary && driverRoadPos && (
          <Marker position={driverRoadPos} icon={driverIcon}>
            <Popup>
              <strong>🚚 Driver</strong>
              <br />
              {driverPos?.label || 'En route…'}
            </Popup>
          </Marker>
        )}

        {/* Fit map to full route on first load — no more jitter */}
        {roadPoints.length > 1 && <FitBounds positions={roadPoints} />}
      </MapContainer>
    </div>
  );
}
