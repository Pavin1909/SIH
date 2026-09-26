import { useEffect, useMemo, useState, Component, type ReactNode, type ErrorInfo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { InfrastructureObservation } from "../types";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════ */

export interface GeoMapProps {
  /** Infrastructure observations from fused_evidence.infrastructure */
  observations: InfrastructureObservation[];
  /** Optional CSS class name for the outer wrapper */
  className?: string;
}

/** Internal representation of a map-plottable point */
interface MapPoint {
  lat: number;
  lng: number;
  observation: InfrastructureObservation;
  index: number;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CUSTOM MARKER ICON — Archival Cartographic Pin (Solid Brass + Crimson Core)
   ═══════════════════════════════════════════════════════════════════════ */

const markerIcon = new L.DivIcon({
  className: "soc-geo-marker",
  html: `<div class="cartographic-pin-container">
    <div class="cartographic-pin-outer"></div>
    <div class="cartographic-pin-core"></div>
  </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -12],
});

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER: auto-fit bounds and resize map after mount
   ═══════════════════════════════════════════════════════════════════════ */

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    map.invalidateSize();
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 6);
    } else {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
    }
  }, [map, points]);

  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER: Format a value for popup display
   ═══════════════════════════════════════════════════════════════════════ */

function val(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

/* ═══════════════════════════════════════════════════════════════════════════
   GeoMap COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

function GeoMapInner({ observations, className }: GeoMapProps) {
  /* ── Extract only observations with valid numeric coordinates ────── */
  const points = useMemo<MapPoint[]>(() => {
    const result: MapPoint[] = [];
    for (let i = 0; i < observations.length; i++) {
      const obs = observations[i];
      const lat = obs.latitude;
      const lng = obs.longitude;
      if (
        typeof lat === "number" &&
        typeof lng === "number" &&
        isFinite(lat) &&
        isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      ) {
        result.push({ lat, lng, observation: obs, index: i });
      }
    }
    return result;
  }, [observations]);

  /* ── Chronological polyline coordinates ─────────────────────────── */
  const polylineCoords = useMemo(() => {
    if (points.length < 2) return [];
    /* The observations array is already ordered by the backend
       (typically by observed_at). We preserve that order for the
       infrastructure-movement polyline. */
    return points.map((p) => [p.lat, p.lng] as [number, number]);
  }, [points]);

  /* ── Empty state ────────────────────────────────────────────────── */
  if (points.length === 0) {
    return (
      <div
        className={`panel flex items-center justify-center ${className ?? ""}`}
        style={{ minHeight: 280 }}
      >
        <div className="text-center space-y-2">
          <p className="text-sm text-slate-400">
            No geolocation data available for this analysis.
          </p>
          <p className="text-[11px] text-slate-500">
            GeoIP coordinates are populated when the infrastructure enrichment provider is configured.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`panel overflow-hidden p-0 ${className ?? ""}`}>
      {/* Map header */}
      <div className="flex items-center justify-between border-b border-[#c8a96e]/20 px-5 py-3 bg-[#140e1e]/90">
        <div>
          <h3 className="font-serif text-sm font-bold tracking-wide text-[#f5ebd9]">
            Threat Atlas • Observed Infrastructure Locations
          </h3>
          <p className="mt-0.5 text-[11px] text-[#a498b2]">
            Cartographic GeoIP records approximate topological server locations.
          </p>
        </div>
        <span className="rounded border border-[#c8a96e]/30 bg-[#251b33] px-2.5 py-0.5 font-serif text-[11px] font-bold text-[#dfc28d]">
          {points.length} {points.length === 1 ? "location" : "locations"}
        </span>
      </div>

      {/* Leaflet map */}
      <div style={{ height: 480 }} className="relative z-0">
        <MapContainer
          center={[20, 0]}
          zoom={2}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%", background: "#0e0b14" }}
          attributionControl={false}
        >
          {/* Vivid Satellite Imagery Layer with Cartographic Filter */}
          <TileLayer
            url="https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics'
            className="threat-atlas-tiles"
            maxZoom={18}
          />
          {/* High-Resolution Boundaries & Place Names Layer */}
          <TileLayer
            url="https://services.arcgisonline.com/arcgis/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution=""
            maxZoom={18}
          />

          {/* Auto-fit viewport */}
          <FitBounds points={points} />

          {/* Chronological infrastructure-movement polyline (Archival Crimson Thread) */}
          {polylineCoords.length >= 2 && (
            <Polyline
              positions={polylineCoords}
              pathOptions={{
                color: "#8c2535",
                weight: 2,
                dashArray: "4 4",
                opacity: 0.85,
              }}
            />
          )}

          {/* Markers */}
          {points.map((point) => {
            const obs = point.observation;
            const location = [obs.city, obs.region, obs.country]
              .filter(Boolean)
              .join(", ");
            return (
              <Marker
                key={`${obs.ip || obs.domain}-${point.index}`}
                position={[point.lat, point.lng]}
                icon={markerIcon}
              >
                <Popup>
                  <div
                    style={{
                      minWidth: 220,
                      fontFamily: "Cinzel, Georgia, serif",
                      color: "#e8e1d5",
                      fontSize: 12,
                      lineHeight: 1.6,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        marginBottom: 6,
                        color: "#dfc28d",
                        fontFamily: "Cinzel, Georgia, serif",
                      }}
                    >
                      {val(obs.domain || obs.ip)}
                    </div>
                    <table
                      style={{
                        width: "100%",
                        borderSpacing: "0 2px",
                        fontFamily: "Inter, system-ui, sans-serif",
                        fontSize: 11,
                      }}
                    >
                      <tbody>
                        <PopupRow label="IP" value={val(obs.ip)} />
                        <PopupRow
                          label="Location"
                          value={location || "—"}
                        />
                        <PopupRow label="ASN" value={val(obs.asn)} />
                        <PopupRow
                          label="ISP / Org"
                          value={val(obs.isp || obs.asn_org)}
                        />
                        <PopupRow label="VPN" value={val(obs.vpn)} />
                        <PopupRow label="TOR" value={val(obs.tor)} />
                        <PopupRow label="Proxy" value={val(obs.proxy)} />
                        <PopupRow label="Observed" value={val(obs.observed_at || "Live Capture")} />
                        <PopupRow
                          label="Coords"
                          value={`${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`}
                        />
                      </tbody>
                    </table>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-5 border-t border-[#c8a96e]/20 bg-[#140e1e]/90 px-5 py-2.5 font-serif text-[11px] text-[#a498b2]">
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{
              background: "#8c2535",
              border: "1.5px solid #dfc28d",
              boxShadow: "0 0 6px rgba(140, 37, 53, 0.7)",
            }}
          />
          Observed Infrastructure Pin
        </span>
        {polylineCoords.length >= 2 && (
          <span className="flex items-center gap-2">
            <span
              className="inline-block h-0 w-6"
              style={{
                borderTop: "2px dashed #8c2535",
              }}
            />
            Observed Trajectory Thread
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Popup table row helper ───────────────────────────────────────────── */
function PopupRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td
        style={{
          color: "#94a3b8",
          paddingRight: 8,
          whiteSpace: "nowrap",
          verticalAlign: "top",
        }}
      >
        {label}
      </td>
      <td style={{ color: "#e2e8f0", wordBreak: "break-all" }}>{value}</td>
    </tr>
  );
}

/* ── Error boundary to safeguard the page against Leaflet rendering glitches ─ */
interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
}

class GeoMapErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("GeoMap encountered an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="panel flex items-center justify-center p-6 text-center" style={{ minHeight: 200 }}>
          <div className="space-y-1">
            <p className="text-sm text-slate-300 font-semibold">Map unavailable</p>
            <p className="text-xs text-slate-500">The interactive geolocation map could not be initialized.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function GeoMap(props: GeoMapProps) {
  return (
    <GeoMapErrorBoundary>
      <GeoMapInner {...props} />
    </GeoMapErrorBoundary>
  );
}
