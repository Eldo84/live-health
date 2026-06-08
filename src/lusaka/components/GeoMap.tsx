import { useEffect, useMemo } from "react";
import { CircleMarker, GeoJSON, MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L, { type LatLngBoundsExpression, type Layer, type PathOptions } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./GeoMap.css";
import type { PlaceCount } from "../data/types";
import type { CaseMarker, PieSlice } from "../data/mapData";
import { ZAMBIA_PROVINCES_GEOJSON } from "../data/zambiaProvinces";

// ──────────────────────────────────────────────────────────────────────────
// Zambia-only command-center map.
//   • National: province choropleth + a disease-breakdown PIE over each province.
//   • Province: province outline + a PIE over each district (size ∝ cases).
//   • District: individual color-coded case MARKERS (clustered) — zoom-in mode.
//   • Optional SATELLITE basemap toggle (off at national to keep Africa hidden).
// ──────────────────────────────────────────────────────────────────────────

const ACCENT = "#4ee0c4";

const ZAMBIA_BOUNDS: LatLngBoundsExpression = [
  [-18.6, 21.5],
  [-7.9, 34.0],
];

function choro(t: number): string {
  if (t >= 0.75) return "#b3122a";
  if (t >= 0.5) return "#ff4a5c";
  if (t >= 0.3) return "#ffb547";
  if (t >= 0.12) return "#4eb7bd";
  return "#3a6b74";
}

type Level = "national" | "province" | "district";
export type Basemap = "none" | "satellite";

// SVG pie as a Leaflet divIcon — wedges per disease, white separators, count in
// the center. Size scales with the place's case load.
function pieIcon(slices: PieSlice[], size: number): L.DivIcon {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const cx = size / 2;
  const r = size / 2 - 1;
  let a0 = -Math.PI / 2;
  const wedges = slices
    .map((s) => {
      const frac = s.value / total;
      const a1 = a0 + frac * Math.PI * 2;
      let shape: string;
      if (frac >= 0.999) {
        shape = `<circle cx="${cx}" cy="${cx}" r="${r}" fill="${s.color}"/>`;
      } else {
        const x0 = (cx + r * Math.cos(a0)).toFixed(2);
        const y0 = (cx + r * Math.sin(a0)).toFixed(2);
        const x1 = (cx + r * Math.cos(a1)).toFixed(2);
        const y1 = (cx + r * Math.sin(a1)).toFixed(2);
        const large = a1 - a0 > Math.PI ? 1 : 0;
        shape = `<path d="M ${cx} ${cx} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z" fill="${s.color}"/>`;
      }
      a0 = a1;
      return shape;
    })
    .join("");
  const hole = Math.round(size * 0.3);
  const fs = total >= 100 ? Math.round(size * 0.22) : Math.round(size * 0.26);
  const html = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow:visible">
    <g stroke="rgba(10,15,18,0.8)" stroke-width="1">${wedges}</g>
    <circle cx="${cx}" cy="${cx}" r="${hole}" fill="rgba(7,10,13,0.9)" stroke="rgba(255,255,255,0.18)"/>
    <text x="${cx}" y="${cx}" text-anchor="middle" dominant-baseline="central" fill="#fff" font-family="ui-monospace,monospace" font-weight="600" font-size="${fs}">${total}</text>
  </svg>`;
  return L.divIcon({ html, className: "zm-pie", iconSize: [size, size], iconAnchor: [cx, cx] });
}

function FitController({
  level,
  activeProvince,
  center,
  zoom,
}: {
  level: Level;
  activeProvince?: string | null;
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (level === "national") {
      map.fitBounds(L.geoJSON(ZAMBIA_PROVINCES_GEOJSON as any).getBounds(), { padding: [16, 16] });
    } else if (level === "province" && activeProvince) {
      const feat = {
        type: "FeatureCollection",
        features: (ZAMBIA_PROVINCES_GEOJSON as any).features.filter((f: any) => f.properties.name === activeProvince),
      };
      const b = L.geoJSON(feat as any).getBounds();
      if (b.isValid()) map.fitBounds(b, { padding: [28, 28] });
    } else {
      map.flyTo(center, zoom, { duration: 0.5 });
    }
  }, [map, level, activeProvince, center[0], center[1], zoom]);
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 80);
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, [map]);
  return null;
}

interface GeoMapProps {
  level: Level;
  provinceCounts: Record<string, number>;
  activeProvince?: string | null;
  /** Child places (provinces / districts) with coords + cases — pie anchors. */
  placePoints: PlaceCount[];
  /** place name → disease pie slices. */
  pies: Record<string, PieSlice[]>;
  /** Individual case markers (district zoom-in). */
  caseMarkers: CaseMarker[];
  basemap: Basemap;
  center: [number, number];
  zoom: number;
  onSelectPlace?: (p: PlaceCount) => void;
  onSelectProvinceName?: (name: string) => void;
}

export function GeoMap({
  level,
  provinceCounts,
  activeProvince,
  placePoints,
  pies,
  caseMarkers,
  basemap,
  center,
  zoom,
  onSelectPlace,
  onSelectProvinceName,
}: GeoMapProps) {
  const maxProv = Math.max(1, ...Object.values(provinceCounts));
  const maxPlace = Math.max(1, ...placePoints.map((p) => p.cases));

  // Polygon centroids so national pies + labels sit nicely centered on each
  // province (rather than at the province's stored capital-ish point).
  const provinceCenters = useMemo(() => {
    const m: Record<string, [number, number]> = {};
    for (const f of (ZAMBIA_PROVINCES_GEOJSON as any).features) {
      const c = L.geoJSON(f).getBounds().getCenter();
      m[f.properties.name] = [c.lat, c.lng];
    }
    return m;
  }, []);

  const baseStyle = (name: string): PathOptions => {
    if (level === "national") {
      const t = (provinceCounts[name] ?? 0) / maxProv;
      // Slightly translucent so satellite (if ever on) and labels read; opaque on dark.
      return { color: "rgba(255,255,255,0.35)", weight: 1, fillColor: choro(t), fillOpacity: 0.66 };
    }
    const isActive = name === activeProvince;
    return {
      color: isActive ? ACCENT : "rgba(255,255,255,0.16)",
      weight: isActive ? 2.4 : 0.8,
      fillColor: "#33505a",
      fillOpacity: isActive ? 0.1 : 0.28,
    };
  };

  const onEachProvince = (feature: any, layer: Layer) => {
    const name: string = feature.properties.name;
    const path = layer as L.Path;
    path.setStyle(baseStyle(name));
    if (level === "national") {
      // The province name is carried by the pie marker's label (below), so the
      // polygon only needs hover-highlight + click-to-drill here.
      layer.on({
        mouseover: () => path.setStyle({ weight: 2.6, color: "#ffffff", fillOpacity: 0.82 }),
        mouseout: () => path.setStyle(baseStyle(name)),
        click: () => onSelectProvinceName?.(name),
      });
    }
  };

  const geoKey = `${level}:${activeProvince ?? ""}:${maxProv}`;
  const showPies = level !== "district";
  const showLabels = level !== "district"; // label province + district pies with their names

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      minZoom={5}
      maxZoom={16}
      maxBounds={ZAMBIA_BOUNDS}
      maxBoundsViscosity={0.9}
      scrollWheelZoom
      zoomControl={false}
      attributionControl={false}
      style={{ width: "100%", height: "100%", background: "var(--ln-map-bg)" }}
    >
      {basemap === "satellite" && (
        <>
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="&copy; Esri"
          />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
            subdomains={["a", "b", "c", "d"]}
            opacity={0.6}
          />
        </>
      )}

      <GeoJSON key={geoKey} data={ZAMBIA_PROVINCES_GEOJSON as any} onEachFeature={onEachProvince} />

      {/* Pie markers (zoom-out): disease breakdown per place. */}
      {showPies &&
        placePoints
          .filter((p) => p.cases > 0 && pies[p.name]?.length)
          .map((p) => {
            const size = 22 + Math.sqrt(p.cases / maxPlace) * 26;
            const pos: [number, number] =
              level === "national" ? provinceCenters[p.name] ?? [p.lat, p.lng] : [p.lat, p.lng];
            return (
              <Marker
                key={p.id}
                position={pos}
                icon={pieIcon(pies[p.name], size)}
                eventHandlers={onSelectPlace ? { click: () => onSelectPlace(p) } : undefined}
              >
                {showLabels && (
                  <Tooltip permanent direction="bottom" offset={[0, size / 2 - 2]} opacity={1} className="zm-label zm-city-label">
                    {p.name}
                  </Tooltip>
                )}
                <Tooltip direction="top" offset={[0, -size / 2]} opacity={1}>
                  <div style={{ fontSize: 12 }}>
                    <strong>{p.name}</strong> · {p.cases.toLocaleString()} cases
                    <br />
                    {pies[p.name].slice(0, 4).map((s) => (
                      <span key={s.label} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginRight: 8 }}>
                        <span style={{ width: 8, height: 8, background: s.color, borderRadius: 2, display: "inline-block" }} />
                        {s.label} {Math.round((s.value / p.cases) * 100)}%
                      </span>
                    ))}
                    {p.level !== "locality" && <div style={{ opacity: 0.6, marginTop: 2 }}>click to drill in</div>}
                  </div>
                </Tooltip>
              </Marker>
            );
          })}

      {/* Individual case markers (zoom-in), clustered. */}
      {level === "district" && caseMarkers.length > 0 && (
        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          maxClusterRadius={40}
          iconCreateFunction={(cluster: any) =>
            L.divIcon({
              html: `<div class="zm-cluster">${cluster.getChildCount()}</div>`,
              className: "zm-cluster-wrap",
              iconSize: [34, 34],
            })
          }
        >
          {caseMarkers.map((m) => (
            <CircleMarker
              key={m.id}
              center={[m.lat, m.lng]}
              radius={5}
              pathOptions={{ color: "rgba(0,0,0,0.5)", weight: 1, fillColor: m.color, fillOpacity: 0.95 }}
            >
              <Tooltip direction="top" offset={[0, -3]} opacity={1}>
                <div style={{ fontSize: 12 }}>
                  <strong>{m.disease}</strong>
                  <br />
                  {m.age}y · {m.sex} · {m.date}
                </div>
              </Tooltip>
            </CircleMarker>
          ))}
        </MarkerClusterGroup>
      )}

      <FitController level={level} activeProvince={activeProvince} center={center} zoom={zoom} />
    </MapContainer>
  );
}
