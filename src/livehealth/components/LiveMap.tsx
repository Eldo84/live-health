import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L, { DivIcon, type Map as LMap } from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import "./LiveMap.css";
import { severityColor } from "../lib/utils";
import type { LiveOutbreak } from "../data/useLiveOutbreaks";

interface LiveMapProps {
  outbreaks: LiveOutbreak[];
  selectedId?: string | null;
  pulse?: boolean;
  cluster?: boolean;
  onHover?: (o: LiveOutbreak | null) => void;
  onSelect?: (o: LiveOutbreak) => void;
  /** Fly to this point on mount / when changed. */
  focusOn?: [number, number] | null;
  focusRadiusKm?: number;
  /** Receives the Leaflet map instance once it's mounted. */
  onReady?: (map: LMap) => void;
}

const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png";
const LABEL_TILES = "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>';

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
  onHover,
  onSelect,
  focusOn,
  focusRadiusKm = 2000,
  onReady,
}: LiveMapProps) {
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
      }}
    />
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
      <TileLayer url={DARK_TILES} attribution={ATTRIBUTION} subdomains={["a", "b", "c", "d"]} />
      <TileLayer url={LABEL_TILES} subdomains={["a", "b", "c", "d"]} opacity={0.6} />
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
