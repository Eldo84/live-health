import { useEffect } from "react";
import { CircleMarker, GeoJSON, MapContainer, Tooltip, useMap } from "react-leaflet";
import L, { type LatLngBoundsExpression, type Layer, type PathOptions } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./GeoMap.css";
import type { PlaceCount } from "../data/types";
import { ZAMBIA_PROVINCES_GEOJSON } from "../data/zambiaProvinces";

// ──────────────────────────────────────────────────────────────────────────
// Zambia-only geo map. No global tile basemap (so the rest of Africa never
// shows) — instead the country's real province boundaries are drawn as polygons
// on the app background.
//
//  • National: choropleth — each province shaded by case load; hover highlights
//    its border + shows name/cases; click drills in.
//  • Province / district: provinces become faint context outlines (active one
//    highlighted) and district / locality circles are layered on top.
// ──────────────────────────────────────────────────────────────────────────

const ACCENT = "#4ee0c4";

// Locks panning/zoom to Zambia's bounding box so you can't wander into Africa.
const ZAMBIA_BOUNDS: LatLngBoundsExpression = [
  [-18.6, 21.5],
  [-7.9, 34.0],
];

// Province choropleth ramp (low → high case load).
function choro(t: number): string {
  if (t >= 0.75) return "#b3122a";
  if (t >= 0.5) return "#ff4a5c";
  if (t >= 0.3) return "#ffb547";
  if (t >= 0.12) return "#4eb7bd";
  return "#3a6b74";
}

// Circle ramp for districts / localities.
function heatColor(cases: number, max: number): string {
  const t = max > 0 ? cases / max : 0;
  if (t >= 0.66) return "#ff4a5c";
  if (t >= 0.33) return "#ffb547";
  if (t >= 0.12) return "#4eb7bd";
  return "#6ab7ff";
}

type Level = "national" | "province" | "district";

interface GeoMapProps {
  level: Level;
  /** Province name → case count (drives the choropleth). */
  provinceCounts: Record<string, number>;
  /** Highlighted province when drilled in. */
  activeProvince?: string | null;
  /** District / locality circles for non-national scopes. */
  circlePlaces: PlaceCount[];
  center: [number, number];
  zoom: number;
  onSelectProvince?: (name: string) => void;
  onSelectCircle?: (p: PlaceCount) => void;
}

// Frames the view: national → whole country; province → the active province;
// district → fly to the city center/zoom. Also keeps the canvas sized.
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
        features: (ZAMBIA_PROVINCES_GEOJSON as any).features.filter(
          (f: any) => f.properties.name === activeProvince,
        ),
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

export function GeoMap({
  level,
  provinceCounts,
  activeProvince,
  circlePlaces,
  center,
  zoom,
  onSelectProvince,
  onSelectCircle,
}: GeoMapProps) {
  const maxProv = Math.max(1, ...Object.values(provinceCounts));
  const maxCircle = Math.max(1, ...circlePlaces.map((p) => p.cases));
  // Show permanent name labels on the circles unless there are too many (e.g.
  // Lusaka's 65 neighborhoods) — then fall back to hover detail to avoid a wall
  // of overlapping text.
  const showCircleLabels = circlePlaces.length > 0 && circlePlaces.length <= 28;

  // Base style for a province polygon at the current scope.
  const baseStyle = (name: string): PathOptions => {
    if (level === "national") {
      const t = (provinceCounts[name] ?? 0) / maxProv;
      return { color: "rgba(255,255,255,0.35)", weight: 1, fillColor: choro(t), fillOpacity: 0.78 };
    }
    const isActive = name === activeProvince;
    return {
      color: isActive ? ACCENT : "rgba(255,255,255,0.16)",
      weight: isActive ? 2.4 : 0.8,
      fillColor: "#33505a",
      fillOpacity: isActive ? 0.12 : 0.32,
    };
  };

  const onEachProvince = (feature: any, layer: Layer) => {
    const name: string = feature.properties.name;
    const path = layer as L.Path;
    path.setStyle(baseStyle(name));

    if (level === "national") {
      const cases = provinceCounts[name] ?? 0;
      // Permanent province name label, centered on the polygon — provides the
      // labels the (removed) tile basemap would have shown. Only at national
      // level; when drilled in, the city/locality labels carry the names.
      layer.bindTooltip(
        `<div class="zm-pl-name">${name}</div><div class="zm-pl-num">${cases.toLocaleString()} cases</div>`,
        { permanent: true, direction: "center", className: "zm-label zm-prov-label", interactive: false, opacity: 1 },
      );
      layer.on({
        mouseover: () => path.setStyle({ weight: 2.6, color: "#ffffff", fillOpacity: 0.92 }),
        mouseout: () => path.setStyle(baseStyle(name)),
        click: () => onSelectProvince?.(name),
      });
    }
  };

  // Key forces the GeoJSON layer to rebuild when scope / counts change so styles
  // and handlers refresh (react-leaflet caches the layer otherwise).
  const geoKey = `${level}:${activeProvince ?? ""}:${maxProv}`;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      minZoom={5}
      maxZoom={15}
      maxBounds={ZAMBIA_BOUNDS}
      maxBoundsViscosity={0.9}
      scrollWheelZoom
      zoomControl={false}
      attributionControl={false}
      style={{ width: "100%", height: "100%", background: "var(--ln-map-bg)" }}
    >
      <GeoJSON key={geoKey} data={ZAMBIA_PROVINCES_GEOJSON as any} onEachFeature={onEachProvince} />

      {circlePlaces.map((p) => {
        const color = heatColor(p.cases, maxCircle);
        const radius = 5 + Math.sqrt(p.cases / maxCircle) * 24;
        return (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={radius}
            pathOptions={{ color, weight: 1.5, fillColor: color, fillOpacity: 0.4, opacity: 0.95 }}
            eventHandlers={onSelectCircle ? { click: () => onSelectCircle(p) } : undefined}
          >
            {showCircleLabels ? (
              <Tooltip permanent direction="right" offset={[6, 0]} opacity={1} className="zm-label zm-city-label">
                {p.name}
              </Tooltip>
            ) : (
              <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                <div style={{ fontSize: 12 }}>
                  <strong>{p.name}</strong>
                  <span style={{ opacity: 0.7 }}> · {p.sublabel}</span>
                  <br />
                  {p.cases.toLocaleString()} cases
                  {p.level === "district" && <span style={{ opacity: 0.6 }}> · click to drill in</span>}
                </div>
              </Tooltip>
            )}
          </CircleMarker>
        );
      })}

      <FitController level={level} activeProvince={activeProvince} center={center} zoom={zoom} />
    </MapContainer>
  );
}
