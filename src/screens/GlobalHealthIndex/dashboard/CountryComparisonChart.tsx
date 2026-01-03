import { useState } from 'react';
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
import { CountryData } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface CountryComparisonChartProps {
  data: CountryData[];
  title: string;
}

type MetricKey = 'prevalence' | 'incidence' | 'mortality' | 'dalys';

const metrics: { key: MetricKey; label: string; shortLabel: string }[] = [
  { key: 'prevalence', label: 'Prevalence', shortLabel: 'Prev' },
  { key: 'incidence', label: 'Incidence', shortLabel: 'Inc' },
  { key: 'mortality', label: 'Mortality', shortLabel: 'Mort' },
  { key: 'dalys', label: 'DALYs', shortLabel: 'DALYs' },
];

const regionColors: Record<string, string> = {
  'North America': 'hsl(199, 89%, 48%)',
  'South America': 'hsl(142, 76%, 36%)',
  'Europe': 'hsl(280, 65%, 60%)',
  'Asia': 'hsl(38, 92%, 50%)',
  'Africa': 'hsl(0, 84%, 60%)',
  'Oceania': 'hsl(170, 70%, 45%)',
};

export const CountryComparisonChart = ({ data, title }: CountryComparisonChartProps) => {
  const [activeMetric, setActiveMetric] = useState<MetricKey>('prevalence');

  const sortedData = [...data].sort((a, b) => b[activeMetric] - a[activeMetric]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const item = payload[0].payload as CountryData;

    return (
      <div className="bg-background/95 backdrop-blur-none rounded-lg p-2 sm:p-3 shadow-2xl border-2 border-primary/30">
        <p className="text-xs sm:text-sm font-bold text-foreground mb-1 sm:mb-2">{item.country}</p>
        <div className="space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs">
          <div className="flex justify-between gap-3 sm:gap-4">
            <span className="text-foreground/80 font-medium">Region</span>
            <span className="font-bold text-foreground">{item.region}</span>
          </div>
          <div className="flex justify-between gap-3 sm:gap-4">
            <span className="text-foreground/80 font-medium">Prevalence</span>
            <span className="font-mono font-bold text-foreground">{item.prevalence.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-3 sm:gap-4">
            <span className="text-foreground/80 font-medium">Incidence</span>
            <span className="font-mono font-bold text-foreground">{item.incidence.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-3 sm:gap-4">
            <span className="text-foreground/80 font-medium">Mortality</span>
            <span className="font-mono font-bold text-foreground">{item.mortality}%</span>
          </div>
          <div className="flex justify-between gap-3 sm:gap-4">
            <span className="text-foreground/80 font-medium">DALYs</span>
            <span className="font-mono font-bold text-foreground">{item.dalys.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="glass rounded-lg p-3 sm:p-4 h-full animate-slide-up" style={{ animationDelay: '300ms' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
        <h3 className="text-xs sm:text-sm font-medium">{title}</h3>
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          {metrics.map((metric) => (
            <button
              key={metric.key}
              onClick={() => setActiveMetric(metric.key)}
              className={cn(
                'px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-md transition-all duration-200',
                activeMetric === metric.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <span className="hidden sm:inline">{metric.label}</span>
              <span className="sm:hidden">{metric.shortLabel}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="h-[220px] sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
              tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
            />
            <YAxis
              type="category"
              dataKey="countryCode"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={35}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
            <Bar dataKey={activeMetric} radius={[0, 4, 4, 0]}>
              {sortedData.map((entry) => (
                <Cell
                  key={entry.countryCode}
                  fill={regionColors[entry.region] || 'hsl(var(--primary))'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend - Hidden on very small screens */}
      <div className="hidden sm:flex flex-wrap gap-2 sm:gap-3 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border/50">
        {Object.entries(regionColors).map(([region, color]) => (
          <div key={region} className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="truncate">{region}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
