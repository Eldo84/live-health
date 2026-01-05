import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { diseaseData, DiseaseData, normalizeCountryCode } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { filterByCategory, deduplicateAndAggregate } from '../utils/filterHelpers';

interface TopConditionsChartProps {
  title: string;
  selectedCategory?: string;
  selectedYear?: number;
  selectedCountry?: string;
  selectedDiseaseId?: string;
}

type MetricKey = 'prevalence' | 'dalys' | 'incidence' | 'mortalityRate';

const barColors = [
  'hsl(0, 84%, 60%)', 'hsl(25, 95%, 53%)', 'hsl(38, 92%, 50%)', 'hsl(142, 76%, 36%)',
  'hsl(199, 89%, 48%)', 'hsl(220, 70%, 50%)', 'hsl(280, 65%, 60%)', 'hsl(320, 70%, 55%)',
  'hsl(170, 70%, 45%)', 'hsl(45, 93%, 47%)',
];

export const TopConditionsChart = ({ title, selectedCategory, selectedYear, selectedCountry, selectedDiseaseId }: TopConditionsChartProps) => {
  const [metric, setMetric] = useState<MetricKey>('dalys');

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
    
    // Group by baseId only (not location/year) to get unique conditions
    // Aggregate across all countries and years for each disease
    const groupedByBaseId = new Map<string, DiseaseData[]>();
    
    filteredData.forEach(d => {
      const existing = groupedByBaseId.get(d.baseId) || [];
      existing.push(d);
      groupedByBaseId.set(d.baseId, existing);
    });
    
    // Aggregate each disease across all countries and years
    const uniqueConditions = Array.from(groupedByBaseId.values()).map(group => {
      if (group.length === 1) {
        return group[0];
      }
      
      // Aggregate: average rates, sum counts
      const first = group[0];
      const aggregated = group.slice(1).reduce((acc, curr) => {
        return {
          ...acc,
          prevalence: acc.prevalence + curr.prevalence, // Sum for averaging
          incidence: acc.incidence + curr.incidence, // Sum for averaging
          mortalityRate: acc.mortalityRate + curr.mortalityRate, // Sum for averaging
          dalys: acc.dalys + curr.dalys, // Sum (correct)
          ylds: acc.ylds + curr.ylds, // Sum (correct)
          female: acc.female + curr.female, // Sum (correct)
          male: acc.male + curr.male, // Sum (correct)
          allSexes: acc.allSexes + curr.allSexes, // Sum (correct)
          count: acc.count + 1,
        };
      }, {
        ...first,
        count: 1,
      } as DiseaseData & { count: number });
      
      // Average rate-based metrics
      const { count, ...result } = {
        ...aggregated,
        prevalence: aggregated.count > 0 ? aggregated.prevalence / aggregated.count : 0,
        incidence: aggregated.count > 0 ? aggregated.incidence / aggregated.count : 0,
        mortalityRate: aggregated.count > 0 ? aggregated.mortalityRate / aggregated.count : 0,
      };
      return result as DiseaseData;
    });

    return uniqueConditions
      .filter(d => d[metric] > 0)
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, 10)
      .map(d => ({
        name: d.condition.length > 20 ? d.condition.slice(0, 17) + '...' : d.condition,
        fullName: d.condition,
        category: d.category,
        value: d[metric],
        prevalence: d.prevalence,
        incidence: d.incidence,
        mortality: d.mortalityRate,
        dalys: d.dalys,
      }));
  }, [selectedCategory, selectedYear, selectedCountry, selectedDiseaseId, metric]);

  const metrics = [
    { key: 'dalys', label: 'DALYs' },
    { key: 'prevalence', label: 'Prev' },
    { key: 'incidence', label: 'Inc' },
    { key: 'mortalityRate', label: 'Mort' },
  ] as const;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const item = payload[0].payload;

    return (
      <div className="bg-background/95 backdrop-blur-none rounded-lg p-2 sm:p-3 shadow-2xl border-2 border-primary/30 max-w-[200px]">
        <p className="text-[10px] sm:text-sm font-bold text-foreground mb-1 sm:mb-2 line-clamp-2">{item.fullName}</p>
        <div className="space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs">
          <div className="flex justify-between gap-2"><span className="text-foreground/80 font-medium">Prevalence</span><span className="font-mono font-bold text-foreground">{item.prevalence.toLocaleString()}</span></div>
          <div className="flex justify-between gap-2"><span className="text-foreground/80 font-medium">DALYs</span><span className="font-mono font-bold text-foreground">{item.dalys.toLocaleString()}</span></div>
        </div>
      </div>
    );
  };

  return (
    <div className="glass rounded-lg p-3 sm:p-4 h-full animate-slide-up" style={{ animationDelay: '600ms' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 sm:mb-4">
        <h3 className="text-xs sm:text-sm font-medium">{title}</h3>
        <div className="flex items-center gap-1 sm:gap-2">
          {metrics.map((m) => (
            <button key={m.key} onClick={() => setMetric(m.key)} className={cn('px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-md transition-all', metric === m.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary')}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[240px] sm:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={false} />
            <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
            <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }} axisLine={false} tickLine={false} width={90} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>{chartData.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
