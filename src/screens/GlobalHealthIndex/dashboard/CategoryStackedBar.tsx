import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getCategorySummaries } from '@/data/mockData';

interface CategoryStackedBarProps { title: string; }

export const CategoryStackedBar = ({ title }: CategoryStackedBarProps) => {
  const chartData = useMemo(() => {
    const summaries = getCategorySummaries();
    return summaries.sort((a, b) => b.totalDalys - a.totalDalys).slice(0, 8).map(s => ({
      category: s.category.split(' ').slice(0, 2).join(' ').slice(0, 12),
      fullCategory: s.category,
      prevalence: Math.round(s.totalPrevalence / 1000),
      dalys: Math.round(s.totalDalys / 100),
      conditions: s.conditionCount,
      mortality: s.avgMortality,
    }));
  }, []);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload) return null;
    const data = payload[0]?.payload;
    return (
      <div className="glass rounded-lg p-2 sm:p-3 shadow-xl border border-border/50 max-w-[180px]">
        <p className="text-[10px] sm:text-sm font-medium mb-1 line-clamp-2">{data?.fullCategory}</p>
        <div className="space-y-0.5 text-[10px] sm:text-xs">
          <div className="flex justify-between gap-2"><span className="text-muted-foreground">Prevalence</span><span className="font-mono">{(data?.prevalence * 1000).toLocaleString()}</span></div>
          <div className="flex justify-between gap-2"><span className="text-muted-foreground">DALYs</span><span className="font-mono">{(data?.dalys * 100).toLocaleString()}</span></div>
        </div>
      </div>
    );
  };

  return (
    <div className="glass rounded-lg p-3 sm:p-4 h-full animate-slide-up" style={{ animationDelay: '500ms' }}>
      <h3 className="text-xs sm:text-sm font-medium mb-3 sm:mb-4">{title}</h3>
      <div className="h-[240px] sm:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={false} />
            <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
            <YAxis type="category" dataKey="category" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }} axisLine={false} tickLine={false} width={70} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} />
            <Bar dataKey="prevalence" name="Prev (k)" fill="hsl(199, 89%, 48%)" stackId="a" />
            <Bar dataKey="dalys" name="DALYs" fill="hsl(38, 92%, 50%)" stackId="a" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
