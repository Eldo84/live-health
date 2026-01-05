import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { diseaseData, normalizeCountryCode } from '@/data/mockData';
import { filterByCategory, deduplicateAndAggregate } from '../utils/filterHelpers';

interface YLDsDALYsComparisonProps { 
  title: string; 
  selectedCategory?: string;
  selectedYear?: number;
  selectedCountry?: string;
  selectedDiseaseId?: string;
}

export const YLDsDALYsComparison = ({ title, selectedCategory, selectedYear, selectedCountry, selectedDiseaseId }: YLDsDALYsComparisonProps) => {
  const chartData = useMemo(() => {
    let filteredData = diseaseData;
    
    // Filter by disease if provided (highest priority - bypass category filter)
    if (selectedDiseaseId) {
      filteredData = filteredData.filter(d => d.baseId === selectedDiseaseId);
    } else {
      // Only apply category filter if no disease is selected
      filteredData = filterByCategory(filteredData, selectedCategory);
    }
    
    // Filter by year if provided
    if (selectedYear) {
      filteredData = filteredData.filter(d => d.year === selectedYear);
    }
    
    // Filter by country if provided
    if (selectedCountry && selectedCountry !== 'all') {
      const normalizedCode = normalizeCountryCode(selectedCountry);
      filteredData = filteredData.filter(d => d.location.toUpperCase() === normalizedCode.toUpperCase());
    }
    
    const deduplicated = deduplicateAndAggregate(filteredData);
    return deduplicated.filter(d => d.ylds > 0 || d.dalys > 0).sort((a, b) => b.dalys - a.dalys).slice(0, 12).map(d => ({ name: d.condition.length > 10 ? d.condition.slice(0, 8) + '...' : d.condition, fullName: d.condition, YLDs: d.ylds, DALYs: d.dalys, YLLs: d.dalys - d.ylds }));
  }, [selectedCategory, selectedYear, selectedCountry, selectedDiseaseId]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const item = payload[0].payload;
    return (
      <div className="bg-background/95 backdrop-blur-none rounded-lg p-2 sm:p-3 shadow-2xl border-2 border-primary/30 max-w-[180px]">
        <p className="text-[10px] sm:text-sm font-bold text-foreground mb-1 line-clamp-2">{item.fullName}</p>
        <div className="space-y-0.5 text-[10px] sm:text-xs">
          <div className="flex justify-between gap-2"><span className="text-foreground/80 font-medium">YLDs</span><span className="font-mono font-bold text-foreground">{item.YLDs.toLocaleString()}</span></div>
          <div className="flex justify-between gap-2"><span className="text-foreground/80 font-medium">YLLs</span><span className="font-mono font-bold text-foreground">{item.YLLs.toLocaleString()}</span></div>
        </div>
      </div>
    );
  };

  return (
    <div className="glass rounded-lg p-3 sm:p-4 h-full animate-slide-up" style={{ animationDelay: '700ms' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-3 sm:mb-4">
        <h3 className="text-xs sm:text-sm font-medium">{title}</h3>
        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs">
          <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" style={{ backgroundColor: 'hsl(199, 89%, 48%)' }} /><span className="text-muted-foreground">YLDs</span></div>
          <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" style={{ backgroundColor: 'hsl(0, 84%, 60%)' }} /><span className="text-muted-foreground">YLLs</span></div>
        </div>
      </div>
      <div className="h-[200px] sm:h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} angle={-45} textAnchor="end" height={50} />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} width={35} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="YLDs" stackId="1" stroke="hsl(199, 89%, 48%)" fill="hsl(199, 89%, 48%)" fillOpacity={0.6} />
            <Area type="monotone" dataKey="YLLs" stackId="1" stroke="hsl(0, 84%, 60%)" fill="hsl(0, 84%, 60%)" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
