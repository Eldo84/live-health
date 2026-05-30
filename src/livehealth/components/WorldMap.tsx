import { useMemo } from "react";
import { CONTINENTS, GREENLAND, makeProjection, polyToPath, pointInPoly } from "../lib/geometry";
import { severityColor } from "../lib/utils";

export interface WorldOutbreak {
  id: string;
  lng: number;
  lat: number;
  severity: number;
}

interface WorldMapProps {
  width?: number;
  height?: number;
  outbreaks?: WorldOutbreak[];
  regionRisk?: Record<string, number>;
  showChoropleth?: boolean;
  showMarkers?: boolean;
  pulse?: boolean;
  dotSpacing?: number;
  selected?: WorldOutbreak | null;
  onHover?: (o: WorldOutbreak | null, pos?: { x: number; y: number }) => void;
  onSelect?: (o: WorldOutbreak) => void;
}

export function WorldMap({
  width = 1000,
  height = 480,
  outbreaks = [],
  regionRisk = {},
  showChoropleth = true,
  showMarkers = true,
  pulse = true,
  dotSpacing = 9,
  selected = null,
  onHover,
  onSelect,
}: WorldMapProps) {
  const proj = useMemo(() => makeProjection(width, height), [width, height]);

  const dots = useMemo(() => {
    const out: Array<{ x: number; y: number; l: boolean }> = [];
    const polysGeo = [...Object.values(CONTINENTS), GREENLAND];
    for (let gx = 0; gx < width; gx += dotSpacing) {
      for (let gy = 0; gy < height; gy += dotSpacing) {
        const lng = (gx / width) * 360 - 180;
        const lat = 78 - (gy / height) * (78 - -56);
        let isLand = false;
        for (const poly of polysGeo) {
          if (pointInPoly(lng, lat, poly)) {
            isLand = true;
            break;
          }
        }
        if (isLand) {
          const jx = ((gx * 7 + gy * 13) % 4) - 2;
          const jy = ((gx * 11 + gy * 5) % 4) - 2;
          out.push({ x: gx + jx, y: gy + jy, l: isLand });
        }
      }
    }
    return out;
  }, [width, height, dotSpacing]);

  const regionFill = (key: string) => {
    const v = regionRisk[key] ?? 0.3;
    if (v >= 0.75) return "color-mix(in oklab, var(--ln-crit) 22%, transparent)";
    if (v >= 0.55) return "color-mix(in oklab, var(--ln-warn) 22%, transparent)";
    if (v >= 0.35) return "color-mix(in oklab, var(--ln-info) 14%, transparent)";
    return "color-mix(in oklab, var(--ln-brand) 12%, transparent)";
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ display: "block" }}>
      <g stroke="var(--ln-map-graticule)" strokeWidth="1">
        {[-60, -30, 0, 30, 60].map((lat) => {
          const [, y] = proj(0, lat);
          return <line key={`lat-${lat}`} x1="0" y1={y} x2={width} y2={y} />;
        })}
        {[-120, -60, 0, 60, 120].map((lng) => {
          const [x] = proj(lng, 0);
          return <line key={`lng-${lng}`} x1={x} y1="0" x2={x} y2={height} />;
        })}
      </g>

      {showChoropleth &&
        Object.entries(CONTINENTS).map(([k, poly]) => (
          <path
            key={k}
            d={polyToPath(poly, proj)}
            fill={regionFill(k)}
            stroke="var(--ln-map-region-stroke)"
            strokeWidth="0.6"
          />
        ))}

      <g>
        {dots.map((d, i) => (
          <circle
            key={i}
            cx={d.x}
            cy={d.y}
            r={1.2}
            fill="var(--ln-map-dot-land)"
          />
        ))}
      </g>

      {showMarkers &&
        outbreaks.map((o) => {
          const [x, y] = proj(o.lng, o.lat);
          const c = severityColor(o.severity);
          const isSel = selected && selected.id === o.id;
          return (
            <g
              key={o.id}
              transform={`translate(${x} ${y})`}
              style={{ cursor: onSelect ? "pointer" : "default" }}
              onMouseEnter={(e) => onHover && onHover(o, { x: e.clientX, y: e.clientY })}
              onMouseLeave={() => onHover && onHover(null)}
              onClick={() => onSelect && onSelect(o)}
            >
              {pulse && o.severity >= 3 && (
                <circle
                  r={5 + o.severity * 1.6}
                  fill={c}
                  opacity="0.5"
                  style={{
                    transformOrigin: "center",
                    animation: `ln-pulse ${2 + (5 - o.severity) * 0.3}s infinite ease-out`,
                  }}
                />
              )}
              <circle r={3 + o.severity * 0.4} fill={c} stroke="var(--ln-marker-stroke)" strokeWidth="1" />
              {isSel && <circle r={11} fill="none" stroke={c} strokeWidth="1.5" />}
            </g>
          );
        })}
    </svg>
  );
}
