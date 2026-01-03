import { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { diseaseData } from '@/data/mockData';
import { filterByCategory } from '../utils/filterHelpers';

interface BurdenBubbleChartProps {
  title: string;
  selectedCategory?: string;
}

const categoryColors: Record<string, string> = {
  'Cardiovascular and Metabolic Disorders': 'hsl(0, 84%, 60%)',
  'Cancers': 'hsl(280, 65%, 60%)',
  'Respiratory Diseases': 'hsl(199, 89%, 48%)',
  'Neurological Disorders': 'hsl(38, 92%, 50%)',
  'Musculoskeletal Disorders': 'hsl(142, 76%, 36%)',
  'Mental and Behavioral Disorders': 'hsl(320, 70%, 55%)',
  'Endocrine and Hematologic Disorders': 'hsl(170, 70%, 45%)',
  'High-Burden Infectious Diseases': 'hsl(25, 95%, 53%)',
  'Injuries & Trauma': 'hsl(45, 93%, 47%)',
  'Violence & Self-Harm': 'hsl(350, 89%, 60%)',
  'Maternal, Neonatal, and Child Health': 'hsl(200, 98%, 39%)',
  'Environmental & Occupational Health': 'hsl(160, 60%, 45%)',
  'Sensory Disorders': 'hsl(220, 70%, 50%)',
};

export const BurdenBubbleChart = ({ title, selectedCategory }: BurdenBubbleChartProps) => {
  const chartData = useMemo(() => {
    const filteredData = filterByCategory(diseaseData, selectedCategory);

    return filteredData
      .filter(d => d.prevalence > 0 && d.dalys > 0)
      .map(d => ({
        name: d.condition,
        category: d.category,
        prevalence: d.prevalence,
        mortality: d.mortalityRate,
        dalys: d.dalys,
        incidence: d.incidence,
        color: categoryColors[d.category] || 'hsl(var(--primary))',
      }));
  }, [selectedCategory]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const item = payload[0].payload;

    return (
      <div className="bg-background/95 backdrop-blur-none rounded-lg p-2 sm:p-3 shadow-2xl border-2 border-primary/30 max-w-[180px] sm:max-w-xs">
        <p className="text-[10px] sm:text-sm font-bold text-foreground mb-1 sm:mb-2 line-clamp-2">{item.name}</p>
        <p className="text-[10px] sm:text-xs text-foreground/80 font-medium mb-1 sm:mb-2 truncate">{item.category}</p>
        <div className="space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs">
          <div className="flex justify-between gap-2 sm:gap-4">
            <span className="text-foreground/80 font-medium">Prevalence</span>
            <span className="font-mono font-bold text-foreground">{item.prevalence.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-2 sm:gap-4">
            <span className="text-foreground/80 font-medium">Mortality</span>
            <span className="font-mono font-bold text-foreground">{item.mortality}%</span>
          </div>
          <div className="flex justify-between gap-2 sm:gap-4">
            <span className="text-foreground/80 font-medium">DALYs</span>
            <span className="font-mono font-bold text-foreground">{item.dalys.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="glass rounded-lg p-3 sm:p-4 h-full animate-slide-up" style={{ animationDelay: '450ms' }}>
      <div className="flex flex-col gap-1 sm:gap-2 mb-3 sm:mb-4">
        <h3 className="text-xs sm:text-sm font-medium">{title}</h3>
        <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-xs text-muted-foreground flex-wrap">
          <span>X: Prevalence</span>
          <span className="hidden sm:inline">•</span>
          <span>Y: Mortality</span>
          <span className="hidden sm:inline">•</span>
          <span>Size: DALYs</span>
        </div>
      </div>

      <div className="h-[220px] sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 5, left: -10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis
              type="number"
              dataKey="prevalence"
              name="Prevalence"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
              tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
            />
            <YAxis
              type="number"
              dataKey="mortality"
              name="Mortality"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              width={35}
              tickFormatter={(value) => `${value}%`}
            />
            <ZAxis type="number" dataKey="dalys" range={[30, 400]} name="DALYs" />
            <Tooltip content={<CustomTooltip />} />
            <Scatter data={chartData} fill="hsl(var(--primary))">
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} fillOpacity={0.7} stroke={entry.color} strokeWidth={1} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Legend - Simplified on mobile */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border/50 max-h-16 sm:max-h-20 overflow-y-auto">
        {Object.entries(categoryColors).slice(0, 6).map(([category, color]) => (
          <div key={category} className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="truncate max-w-16 sm:max-w-24">{category.split(' ')[0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
