import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { diseaseData } from '@/data/mockData';
import { filterByCategory, deduplicateAndAggregate } from '../utils/filterHelpers';

interface GenderComparisonChartProps { title: string; selectedCategory?: string; }

export const GenderComparisonChart = ({ title, selectedCategory }: GenderComparisonChartProps) => {
  const chartData = useMemo(() => {
    const filteredData = filterByCategory(diseaseData, selectedCategory);
    const deduplicated = deduplicateAndAggregate(filteredData);
    return deduplicated.filter(d => d.female > 0 || d.male > 0).sort((a, b) => (b.female + b.male) - (a.female + a.male)).slice(0, 10).map(d => {
      const total = d.female + d.male;
      return { name: d.condition.length > 12 ? d.condition.slice(0, 9) + '...' : d.condition, fullName: d.condition, female: d.female, male: d.male, femalePercent: total > 0 ? Math.round((d.female / total) * 100) : 0, malePercent: total > 0 ? Math.round((d.male / total) * 100) : 0, };
    });
  }, [selectedCategory]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const item = payload[0].payload;
    return (
      <div className="bg-background/95 backdrop-blur-none rounded-lg p-2 sm:p-3 shadow-2xl border-2 border-primary/30 max-w-[180px]">
        <p className="text-[10px] sm:text-sm font-bold text-foreground mb-1 line-clamp-2">{item.fullName}</p>
        <div className="space-y-0.5 text-[10px] sm:text-xs">
          <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'hsl(320, 70%, 55%)' }} /><span className="text-foreground/90 font-medium">Female: {item.femalePercent}%</span></div>
          <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'hsl(199, 89%, 48%)' }} /><span className="text-foreground/90 font-medium">Male: {item.malePercent}%</span></div>
        </div>
      </div>
    );
  };

  return (
    <div className="glass rounded-lg p-3 sm:p-4 h-full animate-slide-up" style={{ animationDelay: '650ms' }}>
      <h3 className="text-xs sm:text-sm font-medium mb-3 sm:mb-4">{title}</h3>
      <div className="h-[220px] sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} angle={-45} textAnchor="end" height={60} />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} width={35} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} />
            <Bar dataKey="female" name="Female" fill="hsl(320, 70%, 55%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="male" name="Male" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
