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
import { diseaseData, normalizeCountryCode } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { filterByCategory } from '../utils/filterHelpers';

interface PrevalenceHistogramProps {
  title: string;
  selectedCategory?: string;
  selectedYear?: number;
  selectedCountry?: string;
  selectedDiseaseId?: string;
}

type BinRange = {
  range: string;
  min: number;
  max: number;
  count: number;
  conditions: string[];
};

const binColors = [
  'hsl(199, 89%, 48%)',
  'hsl(199, 89%, 55%)',
  'hsl(199, 89%, 62%)',
  'hsl(199, 89%, 69%)',
  'hsl(142, 76%, 36%)',
  'hsl(142, 76%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(38, 92%, 60%)',
  'hsl(0, 84%, 60%)',
  'hsl(0, 84%, 70%)',
];

const formatValue = (val: number) => {
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  return val.toFixed(0);
};

export const PrevalenceHistogram = ({ title, selectedCategory, selectedYear, selectedCountry, selectedDiseaseId }: PrevalenceHistogramProps) => {
  const [metric, setMetric] = useState<'prevalence' | 'dalys' | 'incidence'>('prevalence');

  const histogramData = useMemo(() => {
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

    const values = filteredData.map(d => d[metric]).filter(v => v > 0);
    
    if (values.length === 0) return [];

    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);
    const range = maxVal - minVal;
    const binCount = Math.min(8, Math.ceil(Math.sqrt(values.length)));
    const binSize = range / binCount;

    const bins: BinRange[] = [];
    
    for (let i = 0; i < binCount; i++) {
      const min = minVal + i * binSize;
      const max = min + binSize;
      const conditionsInBin = filteredData.filter(d => 
        d[metric] >= min && (i === binCount - 1 ? d[metric] <= max : d[metric] < max)
      );
      
      bins.push({
        range: `${formatValue(min)}-${formatValue(max)}`,
        min,
        max,
        count: conditionsInBin.length,
        conditions: conditionsInBin.map(c => c.condition),
      });
    }

    return bins;
  }, [selectedCategory, selectedYear, selectedCountry, selectedDiseaseId, metric]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const item = payload[0].payload as BinRange;

    return (
      <div className="bg-background/95 backdrop-blur-none rounded-lg p-2 sm:p-3 shadow-2xl border-2 border-primary/30 max-w-[200px] sm:max-w-xs">
        <p className="text-[10px] sm:text-sm font-bold text-foreground mb-1 sm:mb-2">Range: {item.range}</p>
        <p className="text-[10px] sm:text-xs text-foreground/90 font-medium mb-1 sm:mb-2">{item.count} conditions</p>
        {item.conditions.length > 0 && (
          <div className="space-y-0.5 max-h-24 sm:max-h-32 overflow-y-auto">
            {item.conditions.slice(0, 4).map((c, i) => (
              <p key={i} className="text-[10px] sm:text-xs text-foreground/80 truncate">• {c}</p>
            ))}
            {item.conditions.length > 4 && (
              <p className="text-[10px] sm:text-xs text-foreground/80">...+{item.conditions.length - 4} more</p>
            )}
          </div>
        )}
      </div>
    );
  };

  const metrics = [
    { key: 'prevalence', label: 'Prevalence', shortLabel: 'Prev' },
    { key: 'dalys', label: 'DALYs', shortLabel: 'DALYs' },
    { key: 'incidence', label: 'Incidence', shortLabel: 'Inc' },
  ] as const;

  return (
    <div className="glass rounded-lg p-3 sm:p-4 h-full animate-slide-up" style={{ animationDelay: '400ms' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 sm:mb-4">
        <h3 className="text-xs sm:text-sm font-medium">{title}</h3>
        <div className="flex items-center gap-1 sm:gap-2">
          {metrics.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={cn(
                'px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-md transition-all duration-200',
                metric === m.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <span className="hidden sm:inline">{m.label}</span>
              <span className="sm:hidden">{m.shortLabel}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="h-[200px] sm:h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={histogramData} margin={{ top: 5, right: 5, left: -10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis
              dataKey="range"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
              angle={-45}
              textAnchor="end"
              height={50}
              interval={0}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {histogramData.map((entry, index) => (
                <Cell key={index} fill={binColors[index % binColors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
