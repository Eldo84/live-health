import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import L, { DivIcon, type Map as LMap } from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import "./LiveMap.css";
import { severityColor, timeAgo } from "../lib/utils";
import { useHealthMinistry } from "../../lib/useHealthMinistry";
import type { LiveOutbreak } from "../data/useLiveOutbreaks";

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

function clusterIconFactory(cluster: any) {
  const children = cluster.getAllChildMarkers();
  let maxSev = 1;
  for (const child of children) {
    const s = (child.options as any)?.lnSeverity ?? 1;
    if (s > maxSev) maxSev = s;
  }
  const color = severityColor(maxSev);
  const count = cluster.getChildCount();
  return L.divIcon({
    html: `<div class="ln-cluster" style="--c:${color}"><span class="ln-cluster-pulse"></span><span class="ln-cluster-inner">${count}</span></div>`,
    className: "ln-cluster-wrap",
    iconSize: [36, 36],
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
}: LiveMapProps) {
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

  const markerNodes = outbreaks.map((o) => (
    <Marker
      key={o.id}
      position={[o.lat, o.lng]}
      icon={iconFor(o)}
      // Stash severity onto the Leaflet marker so the cluster icon can read it.
      ref={(instance: any) => {
        if (instance) instance.options.lnSeverity = o.severity;
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
            {o.cases > 0 ? ` · ${o.cases.toLocaleString()} cases` : ""}
            {` · ${timeAgo(o.updated)} ago`}
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
  ));

  return (
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
        <strong>Location:</strong> {o.city ? `${o.city}, ` : ""}
        {o.country}
      </div>
      {o.source && o.source !== "—" && (
        <div className="ln-pop-row">
          <strong>Source:</strong> {o.source}
        </div>
      )}
      <div className="ln-pop-row">
        <strong>Date:</strong> {new Date(o.updated).toLocaleDateString()}
      </div>
      {(o.cases > 0 || o.deaths > 0) && (
        <div className="ln-pop-row">
          {o.cases > 0 ? `${o.cases.toLocaleString()} cases` : ""}
          {o.deaths > 0 ? `${o.cases > 0 ? " · " : ""}${o.deaths.toLocaleString()} deaths` : ""}
        </div>
      )}
      {o.url && (
        <a href={o.url} target="_blank" rel="noopener noreferrer" className="ln-pop-link ln-pop-article">
          Read article →
        </a>
      )}
      {active && ministry && (
        <div className="ln-pop-ministry">
          <div className="ln-pop-ministry-head">Health Ministry Contact</div>
          <div className="ln-pop-ministry-name">{ministry.ministry_name}</div>
          {ministry.phone_number && (
            <div className="ln-pop-row">
              <strong>Phone:</strong>{" "}
              <a href={`tel:${ministry.phone_number}`} className="ln-pop-link">
                {ministry.phone_number}
              </a>
            </div>
          )}
          {ministry.email_address && (
            <div className="ln-pop-row">
              <strong>Email:</strong>{" "}
              <a href={`mailto:${ministry.email_address}`} className="ln-pop-link">
                {ministry.email_address}
              </a>
            </div>
          )}
        </div>
      )}
      {active && loading && !ministry && (
        <div className="ln-pop-row ln-pop-muted">Loading contact…</div>
      )}
    </div>
  );
}
