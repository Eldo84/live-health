import { useMemo } from 'react';
import { diseaseData, normalizeCountryCode } from '@/data/mockData';
import { filterByCategory } from '../utils/filterHelpers';

interface WorldMapProps { 
  title: string; 
  selectedCountry?: string; 
  onCountryClick?: (countryCode: string) => void;
  selectedYear?: number;
  selectedCategory?: string;
}

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

export const WorldMap = ({ title, selectedCountry, onCountryClick, selectedYear, selectedCategory }: WorldMapProps) => {
  // Calculate map data based on filters
  const mapData = useMemo(() => {
    let filteredData = filterByCategory(diseaseData, selectedCategory);
    
    // Filter by year if provided
    if (selectedYear) {
      filteredData = filteredData.filter(d => d.year === selectedYear);
    }
    
    // Group by country and sum prevalence (only for countries with data)
    const countryTotals: Record<string, number> = {};
    filteredData.forEach(d => {
      // Normalize country codes - handle "China" -> "CHN", etc.
      let countryCode = d.location.toUpperCase();
      if (countryCode === 'CHINA') {
        countryCode = 'CHN';
      }
      // Normalize using the same function used elsewhere
      const normalized = normalizeCountryCode(countryCode);
      countryTotals[normalized] = (countryTotals[normalized] || 0) + d.prevalence;
    });
    
    return countryTotals;
  }, [selectedYear, selectedCategory]);
  
  // Only calculate min/max from countries that actually have data
  const maxValue = useMemo(() => {
    const values = Object.values(mapData).filter(v => v > 0);
    return values.length > 0 ? Math.max(...values) : 0;
  }, [mapData]);
  
  const minValue = useMemo(() => {
    const values = Object.values(mapData).filter(v => v > 0);
    return values.length > 0 ? Math.min(...values) : 0;
  }, [mapData]);

  const getColor = (value: number) => {
    if (maxValue === minValue || value === 0) return 'hsl(var(--muted))';
    const normalized = (value - minValue) / (maxValue - minValue);
    return `hsl(199, 89%, ${60 - normalized * 35}%)`;
  };
  
  // Map country codes to display codes (e.g., USA -> US, CHN -> CN)
  // Also maps display codes back to data codes
  const getDisplayCode = (code: string): string => {
    const codeMap: Record<string, string> = {
      'USA': 'US',
      'CHN': 'CN',
      'IND': 'IN',
      'BRA': 'BR',
      'GBR': 'GB',
      'DEU': 'DE',
      'RUS': 'RU',
      'JPN': 'JP',
      'AUS': 'AU',
      'NGA': 'NG',
      'ZAF': 'ZA',
      'CAN': 'CA',
    };
    return codeMap[code] || code;
  };
  
  // Reverse mapping: display code -> data code
  const getDataCode = (displayCode: string): string => {
    const reverseMap: Record<string, string> = {
      'US': 'USA',
      'CN': 'CHN',
      'IN': 'IND',
      'BR': 'BRA',
      'GB': 'GBR',
      'DE': 'DEU',
      'RU': 'RUS',
      'JP': 'JPN',
      'AU': 'AUS',
      'NG': 'NGA',
      'ZA': 'ZAF',
      'CA': 'CAN',
    };
    return reverseMap[displayCode] || displayCode;
  };

  const formatValue = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
    return val.toFixed(0);
  };

  return (
    <div className="glass rounded-lg p-3 sm:p-4 h-full animate-slide-up" style={{ animationDelay: '400ms' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 sm:mb-4">
        <h3 className="text-xs sm:text-sm font-medium">{title}</h3>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Low</span>
            <div className="flex h-2 sm:h-2.5 w-16 sm:w-24 rounded-sm overflow-hidden border border-border/30">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i} 
                  className="flex-1" 
                  style={{ backgroundColor: `hsl(199, 89%, ${60 - i * 8}%)` }}
                  title={`${formatValue(minValue + (maxValue - minValue) * (i / 4))}`}
                />
              ))}
            </div>
            <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">High</span>
          </div>
          {maxValue > 0 && (
            <div className="text-[9px] sm:text-[10px] text-muted-foreground/80 hidden sm:block">
              {formatValue(minValue)} - {formatValue(maxValue)}
            </div>
          )}
        </div>
      </div>
      <div className="relative w-full h-[180px] sm:h-[280px]">
        <svg viewBox="0 0 500 280" className="w-full h-full" style={{ background: 'hsl(var(--card))' }}>
          <defs><pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M 25 0 L 0 0 0 25" fill="none" stroke="hsl(var(--border))" strokeWidth="0.3" opacity="0.3" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          {Object.entries(countryPaths).map(([displayCode, { path, cx, cy }]) => {
            // Find matching data - check both display code and full country codes
            const dataCode = getDataCode(displayCode);
            const matchingKey = Object.keys(mapData).find(key => {
              const keyDisplayCode = getDisplayCode(key);
              return keyDisplayCode === displayCode || key === displayCode || key === dataCode;
            });
            const value = matchingKey ? mapData[matchingKey] : 0;
            
            // Only render countries that have data
            if (value === 0 || !matchingKey) {
              return null;
            }
            
            const isSelected = selectedCountry === displayCode || selectedCountry === matchingKey || selectedCountry === dataCode;
            return (
              <g key={displayCode}>
                <path 
                  d={path} 
                  fill={getColor(value)} 
                  stroke={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))'} 
                  strokeWidth={isSelected ? 2 : 0.5} 
                  className="cursor-pointer transition-all hover:opacity-80" 
                  onClick={() => onCountryClick?.(displayCode)}
                  title={`${displayCode}: ${formatValue(value)}`}
                />
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" className="text-[6px] sm:text-[8px] fill-foreground/70 pointer-events-none font-medium">{displayCode}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex justify-between mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border/50 text-[10px] sm:text-xs text-muted-foreground">
        <span>{Object.values(mapData).filter(v => v > 0).length} countries with data</span>
        <span>Click to drill down</span>
      </div>
    </div>
  );
};
