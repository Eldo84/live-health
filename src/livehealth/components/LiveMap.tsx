import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import L, { DivIcon, type Map as LMap } from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import "./LiveMap.css";
import { severityColor, timeAgo } from "../lib/utils";
import { useHealthMinistry } from "../../lib/useHealthMinistry";
import type { LiveOutbreak } from "../data/useLiveOutbreaks";
import { T } from "./T";

/** Basemap styles ported from the legacy InteractiveMap "Map Settings" control. */
export type MapType = "dark" | "light" | "street" | "topographic" | "imagery";

export const MAP_TYPES: { id: MapType; label: string }[] = [
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
  { id: "street", label: "Street" },
  { id: "topographic", label: "Topographic" },
  { id: "imagery", label: "Imagery" },
];

interface LiveMapProps {
  outbreaks: LiveOutbreak[];
  selectedId?: string | null;
  pulse?: boolean;
  cluster?: boolean;
  /** Basemap style. Defaults to satellite imagery. */
  mapType?: MapType;
  /** Show a click-to-open detail popup (source, article link, ministry contact)
      anchored to each point. Off where a separate detail panel/sheet is used. */
  popup?: boolean;
  onHover?: (o: LiveOutbreak | null) => void;
  onSelect?: (o: LiveOutbreak) => void;
  /** Fly to this point on mount / when changed. */
  focusOn?: [number, number] | null;
  focusRadiusKm?: number;
  /** Receives the Leaflet map instance once it's mounted. */
  onReady?: (map: LMap) => void;
  /** When provided, clusters render a pie of their points' disease categories
      (curated palette) with the count in the center; hovering a slice shows its
      category + diseases. Individual markers stay severity-colored. Without it,
      clusters fall back to a single severity-colored count bubble. */
  clusterCategoryFor?: (o: LiveOutbreak) => ClusterCategory | undefined;
}

const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Tile configs for each basemap. `labels` is an optional overlay layer drawn on
// top of label-free base tiles so place names stay crisp on dark/light/imagery.
const TILE_CONFIGS: Record<
  MapType,
  { url: string; attribution: string; subdomains: string[]; labels?: string; labelsOpacity?: number }
> = {
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
    labels: "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
    labelsOpacity: 0.6,
    attribution: CARTO_ATTRIBUTION,
    subdomains: ["a", "b", "c", "d"],
  },
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
    labels: "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
    labelsOpacity: 0.7,
    attribution: CARTO_ATTRIBUTION,
    subdomains: ["a", "b", "c", "d"],
  },
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: ["a", "b", "c"],
  },
  topographic: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri",
    subdomains: [],
  },
  imagery: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    labels: "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
    labelsOpacity: 0.6,
    attribution: "&copy; Esri",
    subdomains: [],
  },
};

function buildMarkerIcon(o: LiveOutbreak, isSelected: boolean, pulse: boolean): DivIcon {
  const color = severityColor(o.severity);
  const r = 6 + o.severity * 1.2;
  const showPulse = pulse && o.severity >= 3;
  const html = `
    <div class="ln-marker" style="--c:${color};--r:${r}px">
      ${showPulse ? '<span class="ln-marker-pulse"></span>' : ""}
      <span class="ln-marker-dot"></span>
      ${isSelected ? '<span class="ln-marker-ring"></span>' : ""}
    </div>`;
  const size = Math.ceil(r * 4 + 8);
  return L.divIcon({
    html,
    className: "ln-marker-wrap",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// One category's share of a cluster, for the pie + hover tooltip.
type PieSlice = { label: string; color: string; count: number; diseases: string[] };

// Category color + label stashed on each marker so the cluster can read them.
type ClusterCategory = { label: string; color: string };

const escAttr = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// "Cholera, Measles +3 more" — the first few diseases in a slice.
function diseasesText(diseases: string[]): string {
  const shown = diseases.slice(0, 3).join(", ");
  const more = diseases.length - 3;
  return more > 0 ? `${shown} +${more} more` : shown || "Multiple outbreaks";
}

// Pie icon for a cluster: one wedge per disease-category (curated colors), each
// individually hoverable (carries its category + disease list in data-* attrs
// read by SliceHover), with the total count in a center hole. Mirrors the
// legacy map's pie clusters but built on the curated category palette.
function buildClusterPie(slices: PieSlice[], total: number, size: number): string {
  const cx = size / 2;
  const r = size / 2 - 1;
  const pt = (a: number): [number, number] => [cx + r * Math.sin(a), cx - r * Math.cos(a)];
  let a0 = 0;
  const wedges = slices
    .map((s) => {
      const frac = total > 0 ? s.count / total : 0;
      const a1 = a0 + frac * 2 * Math.PI;
      const data =
        `class="ln-pie-slice" data-cat-label="${escAttr(s.label)}" data-cat-color="${s.color}" ` +
        `data-cat-diseases="${escAttr(diseasesText(s.diseases))}"`;
      const title = `<title>${escAttr(s.label)} — ${escAttr(diseasesText(s.diseases))}</title>`;
      let shape: string;
      if (frac >= 1) {
        shape = `<circle cx="${cx}" cy="${cx}" r="${r}" fill="${s.color}" ${data}>${title}</circle>`;
      } else {
        const [x1, y1] = pt(a0);
        const [x2, y2] = pt(a1);
        const large = a1 - a0 > Math.PI ? 1 : 0;
        const d = `M ${cx} ${cx} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
        shape = `<path d="${d}" fill="${s.color}" ${data}>${title}</path>`;
      }
      a0 = a1;
      return shape;
    })
    .join("");
  const hole = Math.round(size * 0.32);
  const fontSize = total >= 100 ? Math.round(size * 0.26) : Math.round(size * 0.32);
  return `
    <div class="ln-cluster-pie" style="width:${size}px;height:${size}px">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        ${wedges}
        <circle cx="${cx}" cy="${cx}" r="${hole}" fill="rgba(7,10,13,0.92)" stroke="rgba(255,255,255,0.14)" stroke-width="1"/>
        <text x="${cx}" y="${cx}" text-anchor="middle" dominant-baseline="central" fill="#ffffff" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-weight="600" font-size="${fontSize}" style="pointer-events:none">${total}</text>
      </svg>
    </div>`;
}

function clusterIconFactory(cluster: any) {
  const children = cluster.getAllChildMarkers();
  const count = cluster.getChildCount();
  // Aggregate points by disease category for the pie; track max severity for the
  // single-color fallback when no category info is supplied.
  const byCat = new Map<string, PieSlice>();
  let maxSev = 1;
  for (const child of children) {
    const opts = (child.options as any) || {};
    const s = opts.lnSeverity ?? 1;
    if (s > maxSev) maxSev = s;
    const cat = opts.lnCat as ClusterCategory | undefined;
    if (cat) {
      const e = byCat.get(cat.label) || { label: cat.label, color: cat.color, count: 0, diseases: [] };
      e.count += 1;
      const d = opts.lnDisease;
      if (d && !e.diseases.includes(d)) e.diseases.push(d);
      byCat.set(cat.label, e);
    }
  }

  if (byCat.size === 0) {
    const color = severityColor(maxSev);
    return L.divIcon({
      html: `<div class="ln-cluster" style="--c:${color}"><span class="ln-cluster-pulse"></span><span class="ln-cluster-inner">${count}</span></div>`,
      className: "ln-cluster-wrap",
      iconSize: [36, 36],
    });
  }

  const size = count > 99 ? 48 : count > 20 ? 44 : 40;
  const slices = [...byCat.values()].sort((a, b) => b.count - a.count);
  return L.divIcon({
    html: buildClusterPie(slices, count, size),
    className: "ln-cluster-wrap",
    iconSize: [size, size],
  });
}

function MapTouches({ onMap }: { onMap: (map: LMap) => void }) {
  const map = useMap();
  useEffect(() => {
    onMap(map);
    setTimeout(() => map.invalidateSize(), 80);
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map, onMap]);
  return null;
}

function FocusOn({ point, radiusKm }: { point: [number, number] | null; radiusKm: number }) {
  const map = useMap();
  useEffect(() => {
    if (!point) return;
    const zoom = radiusKm > 3000 ? 3 : radiusKm > 1500 ? 4 : radiusKm > 600 ? 5 : 6;
    map.flyTo(point, zoom, { duration: 0.8 });
  }, [map, point?.[0], point?.[1], radiusKm]);
  return null;
}

// Hovered pie-slice tooltip data (cursor position relative to the map container).
type SliceTip = { x: number; y: number; label: string; color: string; diseases: string };

// Watches the map container for the cursor entering a cluster pie slice (which
// carry data-cat-* attrs) and reports the slice's category + diseases so the
// parent can show a styled tooltip — the clean equivalent of the legacy map's
// permanent per-slice tooltip, without its global handlers/MutationObserver.
function SliceHover({ onTip }: { onTip: (t: SliceTip | null) => void }) {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const onMove = (e: MouseEvent) => {
      const slice = (e.target as Element | null)?.closest?.("[data-cat-label]");
      if (slice) {
        const rect = el.getBoundingClientRect();
        onTip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          label: slice.getAttribute("data-cat-label") || "",
          color: slice.getAttribute("data-cat-color") || "#fff",
          diseases: slice.getAttribute("data-cat-diseases") || "",
        });
      } else {
        onTip(null);
      }
    };
    const onLeave = () => onTip(null);
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [map, onTip]);
  return null;
}

export function LiveMap({
  outbreaks,
  selectedId,
  pulse = true,
  cluster = true,
  mapType = "imagery",
  popup = true,
  onHover,
  onSelect,
  focusOn,
  focusRadiusKm = 2000,
  onReady,
  clusterCategoryFor,
}: LiveMapProps) {
  const [sliceTip, setSliceTip] = useState<SliceTip | null>(null);
  const handleTip = useCallback((t: SliceTip | null) => setSliceTip(t), []);
  const tiles = TILE_CONFIGS[mapType];
  // Which marker's popup is open — used to fetch ministry data only for the
  // open point instead of all markers at once.
  const [openId, setOpenId] = useState<string | null>(null);
  const mapRef = useRef<LMap | null>(null);
  const handleMap = (m: LMap) => {
    mapRef.current = m;
    onReady?.(m);
  };

  // Stable icon list — re-uses icons across renders when nothing has changed.
  const iconFor = useMemo(() => {
    const cache = new Map<string, DivIcon>();
    return (o: LiveOutbreak) => {
      const key = `${o.id}:${o.severity}:${selectedId === o.id ? 1 : 0}:${pulse ? 1 : 0}`;
      let icon = cache.get(key);
      if (!icon) {
        icon = buildMarkerIcon(o, selectedId === o.id, pulse);
        cache.set(key, icon);
      }
      return icon;
    };
  }, [selectedId, pulse]);

  const markerNodes = outbreaks.map((o) => {
    const cat = clusterCategoryFor?.(o);
    return (
    <Marker
      // Key includes the category so markers re-mount (and re-stash their
      // options) once categories load asynchronously — otherwise the cluster
      // pie would keep the stale category captured at first mount.
      key={`${o.id}:${cat?.label || ""}`}
      position={[o.lat, o.lng]}
      icon={iconFor(o)}
      // Stash severity + category + disease onto the Leaflet marker so the
      // cluster pie can read them (severity drives the fallback, category the
      // slices, disease the per-slice hover list).
      ref={(instance: any) => {
        if (instance) {
          instance.options.lnSeverity = o.severity;
          instance.options.lnCat = cat;
          instance.options.lnDisease = o.disease;
        }
      }}
      eventHandlers={{
        mouseover: () => onHover && onHover(o),
        mouseout: () => onHover && onHover(null),
        click: () => onSelect && onSelect(o),
        popupopen: () => setOpenId(o.id),
        popupclose: () => setOpenId((cur) => (cur === o.id ? null : cur)),
      }}
    >
      {/* Per-point hover tooltip, ported from the legacy map. */}
      <Tooltip direction="top" offset={[0, -6]} opacity={1} className="ln-tip">
        <div className="ln-tip-inner">
          <div className="ln-tip-title">
            <span className="ln-tip-dot" style={{ background: o.diseaseColor }} />
            {o.disease}
          </div>
          <div className="ln-tip-loc">
            {o.city ? `${o.city}, ` : ""}
            {o.country}
          </div>
          <div className="ln-tip-meta">
            <span style={{ color: severityColor(o.severity) }}>● {o.severityLabel}</span>
            {o.cases > 0 ? <> · {o.cases.toLocaleString()} <T>cases</T></> : ""}
            {<> · {timeAgo(o.updated)} <T>ago</T></>}
          </div>
        </div>
      </Tooltip>
      {/* Click popup with source, article link and ministry contact — restores
          the legacy map's OutbreakPopupContent. */}
      {popup && (
        <Popup className="ln-pop-wrap" minWidth={200} maxWidth={260} autoPan={false}>
          <OutbreakDetails outbreak={o} active={openId === o.id} />
        </Popup>
      )}
    </Marker>
    );
  });

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
    <MapContainer
      center={[15, 5]}
      zoom={2}
      minZoom={2}
      maxZoom={10}
      worldCopyJump
      scrollWheelZoom
      zoomControl={false}
      attributionControl={false}
      style={{ width: "100%", height: "100%", background: "var(--ln-map-bg)" }}
    >
      {/* key forces a clean remount when the basemap changes so tile
          subdomains/URL templates swap without stale tiles lingering. */}
      <TileLayer
        key={mapType}
        url={tiles.url}
        attribution={tiles.attribution}
        subdomains={tiles.subdomains}
      />
      {tiles.labels && (
        <TileLayer
          key={`${mapType}-labels`}
          url={tiles.labels}
          subdomains={["a", "b", "c", "d"]}
          opacity={tiles.labelsOpacity ?? 0.6}
        />
      )}
      <MapTouches onMap={handleMap} />
      <FocusOn point={focusOn ?? null} radiusKm={focusRadiusKm} />
      <SliceHover onTip={handleTip} />

      {cluster ? (
        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          spiderfyOnMaxZoom={true}
          disableClusteringAtZoom={5}
          maxClusterRadius={42}
          iconCreateFunction={clusterIconFactory}
        >
          {markerNodes}
        </MarkerClusterGroup>
      ) : (
        markerNodes
      )}
    </MapContainer>
      {sliceTip && (
        <div className="ln-slice-tip" style={{ left: sliceTip.x, top: sliceTip.y }}>
          <div className="ln-slice-tip-cat" style={{ color: sliceTip.color }}>
            {sliceTip.label}
          </div>
          {sliceTip.diseases && <div className="ln-slice-tip-dis">{sliceTip.diseases}</div>}
        </div>
      )}
    </div>
  );
}

// Popup body for a single point. Mirrors the legacy map's OutbreakPopupContent:
// location, source, date, an article link and the country's health-ministry
// contact. Ministry data is only fetched when `active` (this popup is open).
function OutbreakDetails({ outbreak: o, active }: { outbreak: LiveOutbreak; active: boolean }) {
  const { ministry, loading } = useHealthMinistry(active ? o.country : null);
  return (
    <div className="ln-pop">
      <div className="ln-pop-title">
        <span className="ln-tip-dot" style={{ background: o.diseaseColor }} />
        {o.disease}
      </div>
      <div className="ln-pop-row">
        <strong><T>Location:</T></strong> {o.city ? `${o.city}, ` : ""}
        {o.country}
      </div>
      {o.source && o.source !== "—" && (
        <div className="ln-pop-row">
          <strong><T>Source:</T></strong> {o.source}
        </div>
      )}
      <div className="ln-pop-row">
        <strong><T>Date:</T></strong> {new Date(o.updated).toLocaleDateString()}
      </div>
      {(o.cases > 0 || o.deaths > 0) && (
        <div className="ln-pop-row">
          {o.cases > 0 ? <>{o.cases.toLocaleString()} <T>cases</T></> : ""}
          {o.deaths > 0 ? <>{o.cases > 0 ? " · " : ""}{o.deaths.toLocaleString()} <T>deaths</T></> : ""}
        </div>
      )}
      {o.url && (
        <a href={o.url} target="_blank" rel="noopener noreferrer" className="ln-pop-link ln-pop-article">
          <T>Read article →</T>
        </a>
      )}
      {active && ministry && (
        <div className="ln-pop-ministry">
          <div className="ln-pop-ministry-head"><T>Health Ministry Contact</T></div>
          <div className="ln-pop-ministry-name">{ministry.ministry_name}</div>
          {ministry.phone_number && (
            <div className="ln-pop-row">
              <strong><T>Phone:</T></strong>{" "}
              <a href={`tel:${ministry.phone_number}`} className="ln-pop-link">
                {ministry.phone_number}
              </a>
            </div>
          )}
          {ministry.email_address && (
            <div className="ln-pop-row">
              <strong><T>Email:</T></strong>{" "}
              <a href={`mailto:${ministry.email_address}`} className="ln-pop-link">
                {ministry.email_address}
              </a>
            </div>
          )}
        </div>
      )}
      {active && loading && !ministry && (
        <div className="ln-pop-row ln-pop-muted"><T>Loading contact…</T></div>
      )}
    </div>
  );
}
