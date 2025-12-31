import { useMemo } from 'react';
import { worldMapData } from '@/data/mockData';

interface WorldMapProps { title: string; selectedCountry?: string; onCountryClick?: (countryCode: string) => void; }

const countryPaths: Record<string, { path: string; cx: number; cy: number }> = {
  US: { path: 'M55,85 L130,85 L130,120 L55,120 Z', cx: 92, cy: 102 },
  CA: { path: 'M55,50 L130,50 L130,82 L55,82 Z', cx: 92, cy: 66 },
  BR: { path: 'M135,145 L180,145 L180,200 L135,200 Z', cx: 157, cy: 172 },
  GB: { path: 'M238,68 L248,68 L248,82 L238,82 Z', cx: 243, cy: 75 },
  DE: { path: 'M258,72 L275,72 L275,92 L258,92 Z', cx: 266, cy: 82 },
  RU: { path: 'M290,40 L450,40 L450,90 L290,90 Z', cx: 370, cy: 65 },
  CN: { path: 'M370,90 L440,90 L440,140 L370,140 Z', cx: 405, cy: 115 },
  IN: { path: 'M355,125 L395,125 L395,175 L355,175 Z', cx: 375, cy: 150 },
  JP: { path: 'M455,95 L475,95 L475,125 L455,125 Z', cx: 465, cy: 110 },
  AU: { path: 'M420,195 L485,195 L485,250 L420,250 Z', cx: 452, cy: 222 },
  NG: { path: 'M265,155 L290,155 L290,178 L265,178 Z', cx: 277, cy: 166 },
  ZA: { path: 'M285,210 L320,210 L320,245 L285,245 Z', cx: 302, cy: 227 },
};

export const WorldMap = ({ title, selectedCountry, onCountryClick }: WorldMapProps) => {
  const maxValue = useMemo(() => Math.max(...Object.values(worldMapData)), []);
  const minValue = useMemo(() => Math.min(...Object.values(worldMapData)), []);

  const getColor = (value: number) => {
    const normalized = (value - minValue) / (maxValue - minValue);
    return `hsl(199, 89%, ${60 - normalized * 35}%)`;
  };

  return (
    <div className="glass rounded-lg p-3 sm:p-4 h-full animate-slide-up" style={{ animationDelay: '400ms' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 sm:mb-4">
        <h3 className="text-xs sm:text-sm font-medium">{title}</h3>
        <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
          <span>Low</span>
          <div className="flex h-1.5 sm:h-2 w-12 sm:w-20 rounded-sm overflow-hidden">
            {[...Array(5)].map((_, i) => <div key={i} className="flex-1" style={{ backgroundColor: `hsl(199, 89%, ${60 - i * 8}%)` }} />)}
          </div>
          <span>High</span>
        </div>
      </div>
      <div className="relative w-full h-[180px] sm:h-[280px]">
        <svg viewBox="0 0 500 280" className="w-full h-full" style={{ background: 'hsl(var(--card))' }}>
          <defs><pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M 25 0 L 0 0 0 25" fill="none" stroke="hsl(var(--border))" strokeWidth="0.3" opacity="0.3" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          {Object.entries(countryPaths).map(([code, { path, cx, cy }]) => {
            const value = worldMapData[code] || 0;
            const isSelected = selectedCountry === code;
            return (
              <g key={code}>
                <path d={path} fill={value ? getColor(value) : 'hsl(var(--muted))'} stroke={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))'} strokeWidth={isSelected ? 2 : 0.5} className="cursor-pointer transition-all hover:opacity-80" onClick={() => onCountryClick?.(code)} />
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" className="text-[6px] sm:text-[8px] fill-foreground/70 pointer-events-none font-medium">{code}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex justify-between mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border/50 text-[10px] sm:text-xs text-muted-foreground">
        <span>12 countries</span>
        <span>Click to drill down</span>
      </div>
    </div>
  );
};
