import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TimeSeriesData } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface TrendChartProps {
  data: TimeSeriesData[];
  title: string;
}

type MetricKey = 'prevalence' | 'incidence' | 'mortality' | 'dalys';

const metrics: { key: MetricKey; label: string; shortLabel: string; color: string }[] = [
  { key: 'prevalence', label: 'Prevalence', shortLabel: 'Prev', color: 'hsl(199, 89%, 48%)' },
  { key: 'incidence', label: 'Incidence', shortLabel: 'Inc', color: 'hsl(142, 76%, 36%)' },
  { key: 'mortality', label: 'Mortality', shortLabel: 'Mort', color: 'hsl(0, 84%, 60%)' },
  { key: 'dalys', label: 'DALYs', shortLabel: 'DALYs', color: 'hsl(38, 92%, 50%)' },
];

export const TrendChart = ({ data, title }: TrendChartProps) => {
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>(['prevalence', 'incidence']);

  const toggleMetric = (key: MetricKey) => {
    setActiveMetrics((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key]
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;

    return (
      <div className="glass rounded-lg p-2 sm:p-3 shadow-xl border border-border/50">
        <p className="text-xs sm:text-sm font-medium mb-1 sm:mb-2">{label}</p>
        <div className="space-y-0.5 sm:space-y-1">
          {payload.map((entry: any) => (
            <div key={entry.dataKey} className="flex items-center justify-between gap-3 sm:gap-4 text-[10px] sm:text-xs">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span
                  className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground capitalize">{entry.dataKey}</span>
              </div>
              <span className="font-mono font-medium">{entry.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="glass rounded-lg p-3 sm:p-4 h-full animate-slide-up" style={{ animationDelay: '200ms' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
        <h3 className="text-xs sm:text-sm font-medium">{title}</h3>
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          {metrics.map((metric) => (
            <button
              key={metric.key}
              onClick={() => toggleMetric(metric.key)}
              className={cn(
                'px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-md transition-all duration-200',
                activeMetrics.includes(metric.key)
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span
                className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mr-1 sm:mr-1.5"
                style={{
                  backgroundColor: activeMetrics.includes(metric.key)
                    ? metric.color
                    : 'hsl(var(--muted))',
                }}
              />
              <span className="hidden sm:inline">{metric.label}</span>
              <span className="sm:hidden">{metric.shortLabel}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="h-[200px] sm:h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis
              dataKey="year"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
            />
            <Tooltip content={<CustomTooltip />} />
            {metrics.map((metric) =>
              activeMetrics.includes(metric.key) ? (
                <Line
                  key={metric.key}
                  type="monotone"
                  dataKey={metric.key}
                  stroke={metric.color}
                  strokeWidth={2}
                  dot={{ fill: metric.color, strokeWidth: 0, r: 2 }}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
