import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { Icon, DivIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useOutbreakPoints } from "../../../../lib/useOutbreakPoints";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../../../../components/ui/collapsible";

const ZoomHandler = ({ onZoomChange }: { onZoomChange: (zoom: number) => void }) => {
  const map = useMap();
  React.useEffect(() => {
    const handleZoom = () => { onZoomChange(map.getZoom()); };
    map.on("zoomend", handleZoom);
    handleZoom();
    return () => { map.off("zoomend", handleZoom); };
  }, [map, onZoomChange]);
  return null;
};

interface InteractiveMapProps {
  selectedCategory?: string | null;
}

export const InteractiveMap = ({ selectedCategory: externalCategory }: InteractiveMapProps): JSX.Element => {
  const { points, loading, error } = useOutbreakPoints();
  const [zoom, setZoom] = useState(2);
  const [isLegendOpen, setIsLegendOpen] = useState(true);
  
  // Use external category if provided, otherwise use internal state
  const selectedCategory = externalCategory !== undefined ? externalCategory : null;

  const CATEGORY_COLORS: Record<string, string> = {
    "Foodborne Outbreaks": "#f87171",
    "Waterborne Outbreaks": "#66dbe1",
    "Vector-Borne Outbreaks": "#fbbf24",
    "Airborne Outbreaks": "#a78bfa",
    "Contact Transmission": "#fb923c",
    "Healthcare-Associated Infections": "#ef4444",
    "Zoonotic Outbreaks": "#10b981",
    "Sexually Transmitted Infections": "#ec4899",
    "Vaccine-Preventable Diseases": "#3b82f6",
    "Emerging Infectious Diseases": "#f59e0b",
    "Other": "#4eb7bd"
  };
  
  const filteredPoints = selectedCategory ? points.filter(o => o.category === selectedCategory) : points;

  const createCustomIcon = (color: string, size: number) => new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(
      `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2-2}"
          fill="${color}" stroke="white" stroke-width="2" opacity="0.8"/>
      </svg>`
    )}`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -size/2],
  });

  // Compute simple grid aggregation for pies at low zoom
  const getCellKey = (lat: number, lng: number, step: number) => {
    const latKey = Math.floor(lat / step) * step;
    const lngKey = Math.floor(lng / step) * step;
    return `${latKey.toFixed(2)}:${lngKey.toFixed(2)}`;
  };

  // Larger grid cells at low zoom to aggregate more points into each pie
  const aggregationStep = zoom <= 2 ? 60 : zoom <= 3 ? 30 : zoom <= 4 ? 15 : 8; // degrees per cell
  const aggregated = React.useMemo(() => {
    const cells: Record<string, {
      latSum: number;
      lngSum: number;
      count: number;
      byCategory: Record<string, number>;
    }> = {};
    for (const p of filteredPoints) {
      const key = getCellKey(p.position[0], p.position[1], aggregationStep);
      if (!cells[key]) {
        cells[key] = { latSum: 0, lngSum: 0, count: 0, byCategory: {} };
      }
      cells[key].latSum += p.position[0];
      cells[key].lngSum += p.position[1];
      cells[key].count += 1;
      cells[key].byCategory[p.category] = (cells[key].byCategory[p.category] || 0) + 1;
    }
    return Object.entries(cells).map(([key, v]) => {
      const [latKey, lngKey] = key.split(":");
      const lat = v.latSum / v.count || parseFloat(latKey);
      const lng = v.lngSum / v.count || parseFloat(lngKey);
      return { position: [lat, lng] as [number, number], totals: v.byCategory, totalCount: v.count };
    });
  }, [filteredPoints, aggregationStep]);

  const createPieDivIcon = (counts: Record<string, number>, size: number) => {
    const entries = Object.entries(counts).filter(([, n]) => n > 0);
    const total = entries.reduce((s, [, n]) => s + n, 0) || 1;
    let cumulative = 0;
    const radius = size / 2;
    const cx = radius;
    const cy = radius;
    const slices = entries.map(([category, count]) => {
      const value = count / total;
      const startAngle = cumulative * 2 * Math.PI;
      cumulative += value;
      const endAngle = cumulative * 2 * Math.PI;
      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);
      const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
      const color = CATEGORY_COLORS[category] || "#4eb7bd";
      return `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z" fill="${color}" opacity="0.9" />`;
    }).join("");
    const html = `
      <div style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
          <circle cx="${cx}" cy="${cy}" r="${radius}" fill="white" opacity="0.12" />
          ${slices}
          <circle cx="${cx}" cy="${cy}" r="${Math.max(10, radius * 0.45)}" fill="#0f172a" opacity="0.7" />
          <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="${Math.max(10, radius * 0.6)}" fill="#ffffff">${total}</text>
        </svg>
      </div>`;
    return new DivIcon({ html, className: "", iconSize: [size, size], iconAnchor: [radius, radius], popupAnchor: [0, -radius] });
  };

  return (
    <div className="relative w-full h-full">
      {(loading || error) && (
        <div className="absolute top-1/2 left-1/2 z-[2000] bg-[#2a4149cc] text-white p-4 rounded shadow-lg">
          {loading ? "Loading map..." : error}
        </div>
      )}
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: "100%", width: "100%", background: "#1a2332" }}
        zoomControl={true}
      >
        {/* Point count badge */}
        <div className="absolute top-4 left-4 z-[1200] bg-[#0f172acc] text-white text-xs px-2 py-1 rounded">
          {filteredPoints.length} points
        </div>
        
        {/* Category Legend */}
        <Collapsible open={isLegendOpen} onOpenChange={setIsLegendOpen} className="absolute top-4 right-4 z-[1200] bg-[#315C64B2] rounded-tr-[10px] rounded-bl-[10px] shadow-[0px_1px_2px_0px_#1018280A] border border-[#EAEBF024] overflow-hidden">
          <CollapsibleTrigger className="w-full">
            <div className="w-full h-9 flex items-center gap-4 px-2.5 py-4 bg-[#305961] border-b border-[#eaebf033]">
              <div className="flex flex-col items-start flex-1">
                <h3 className="[font-family:'Roboto',Helvetica] font-medium text-white text-sm tracking-[-0.10px] leading-6">
                  Legend
                </h3>
              </div>
              <button className="w-[18px] h-[18px] p-0 hover:bg-transparent flex-shrink-0">
                <img
                  className="w-[18px] h-[18px] transition-transform duration-200"
                  alt="Dropdown"
                  src="/group-938.svg"
                  style={{ transform: isLegendOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-0 py-1.5 max-h-[340px] overflow-y-auto">
              {Object.entries(CATEGORY_COLORS).map(([category, color], index, arr) => (
                <div
                  key={category}
                  className={`flex w-[106px] items-center justify-between px-0 py-1.5 mx-[9px] border-b border-[#eaebf02e] ${
                    index === arr.length - 1 ? 'last:border-0 last:w-[104px] last:mx-2.5' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="[font-family:'Roboto',Helvetica] font-medium text-white text-xs tracking-[-0.10px] leading-[22px] whitespace-nowrap">
                      {category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-[3px]" style={{ backgroundColor: color }} />
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; Esri'
        />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap'
        />
        <ZoomHandler onZoomChange={setZoom} />
        {
          // Low zoom: show aggregated pies grouped by category
          zoom <= 4 ? (
            aggregated.map((cell, idx) => (
              <Marker
                key={`pie-${idx}`}
                position={cell.position}
                icon={createPieDivIcon(cell.totals, 56)}
              >
                <Popup>
                  <div className="p-2 min-w-[220px]">
                    <div className="mb-1 font-semibold">Outbreak categories</div>
                    {Object.entries(cell.totals).sort((a,b)=>b[1]-a[1]).map(([cat, n]) => (
                      <div key={cat} className="text-xs flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded" style={{ background: CATEGORY_COLORS[cat] || "#4eb7bd" }} />
                        <span>{cat}</span>
                        <span className="ml-auto font-semibold">{n}</span>
                      </div>
                    ))}
                  </div>
                </Popup>
              </Marker>
            ))
          ) : (
            // High zoom: clustered disease-specific markers
            <MarkerClusterGroup chunkedLoading disableClusteringAtZoom={8}>
              {filteredPoints.map((outbreak) => {
                const color = CATEGORY_COLORS[outbreak.category] || "#4eb7bd";
                const markerSize = zoom > 7 ? 34 : 24;
                return (
                  <Marker
                    key={outbreak.id}
                    position={outbreak.position}
                    icon={createCustomIcon(color, markerSize)}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px]">
                        <div className="mb-1 font-semibold">{outbreak.disease}</div>
                        <div className="text-xs"><strong>Location:</strong> {outbreak.location}</div>
                        <div className="text-xs"><strong>Category:</strong> {outbreak.category}</div>
                        <div className="text-xs"><strong>Keywords:</strong> {outbreak.keywords}</div>
                        <div className="text-xs"><strong>Pathogen:</strong> {outbreak.pathogen}</div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MarkerClusterGroup>
          )
        }
      </MapContainer>
    </div>
  );
};
