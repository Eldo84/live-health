import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { diseaseData } from '@/data/mockData';
import { filterByCategory } from '../utils/filterHelpers';

interface YLDsDALYsComparisonProps { title: string; selectedCategory?: string; }

export const YLDsDALYsComparison = ({ title, selectedCategory }: YLDsDALYsComparisonProps) => {
  const chartData = useMemo(() => {
    const filteredData = filterByCategory(diseaseData, selectedCategory);
    return filteredData.filter(d => d.ylds > 0 || d.dalys > 0).sort((a, b) => b.dalys - a.dalys).slice(0, 12).map(d => ({ name: d.condition.length > 10 ? d.condition.slice(0, 8) + '...' : d.condition, fullName: d.condition, YLDs: d.ylds, DALYs: d.dalys, YLLs: d.dalys - d.ylds }));
  }, [selectedCategory]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const item = payload[0].payload;
    return (
      <div className="glass rounded-lg p-2 sm:p-3 shadow-xl border border-border/50 max-w-[180px]">
        <p className="text-[10px] sm:text-sm font-medium mb-1 line-clamp-2">{item.fullName}</p>
        <div className="space-y-0.5 text-[10px] sm:text-xs">
          <div className="flex justify-between gap-2"><span>YLDs</span><span className="font-mono">{item.YLDs.toLocaleString()}</span></div>
          <div className="flex justify-between gap-2"><span>YLLs</span><span className="font-mono">{item.YLLs.toLocaleString()}</span></div>
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
