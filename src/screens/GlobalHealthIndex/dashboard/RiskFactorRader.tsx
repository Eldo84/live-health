import { useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { diseaseData } from '@/data/mockData';

interface RiskFactorRadarProps {
  title: string;
  diseaseId?: string;
}

export const RiskFactorRadar = ({ title, diseaseId }: RiskFactorRadarProps) => {
  const chartData = useMemo(() => {
    // Aggregate risk factors across all diseases or for selected disease
    const riskFactorCounts: Record<string, number> = {};
    
    // Use baseId matching instead of full id
    const dataToUse = diseaseId 
      ? diseaseData.filter(d => d.baseId === diseaseId)
      : diseaseData;

    if (dataToUse.length === 0) {
      return [];
    }

    dataToUse.forEach(d => {
      d.riskFactors.forEach(rf => {
        const normalizedRf = rf.toLowerCase().trim();
        riskFactorCounts[normalizedRf] = (riskFactorCounts[normalizedRf] || 0) + 1;
      });
    });

    // Get top 6 risk factors for mobile, 8 for desktop
    const topFactors = Object.entries(riskFactorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([factor, count]) => ({
        factor: factor.charAt(0).toUpperCase() + factor.slice(1),
        shortFactor: factor.length > 12 ? factor.charAt(0).toUpperCase() + factor.slice(1, 10) + '...' : factor.charAt(0).toUpperCase() + factor.slice(1),
        count,
        fullMark: Math.max(...Object.values(riskFactorCounts)),
      }));

    return topFactors;
  }, [diseaseId]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const item = payload[0].payload;

    return (
      <div className="bg-background/95 backdrop-blur-none rounded-lg p-2 shadow-2xl border-2 border-primary/30 text-[10px] sm:text-xs">
        <p className="font-bold text-foreground">{item.factor}</p>
        <p className="text-foreground/90 font-medium">Count: {item.count}</p>
      </div>
    );
  };

  return (
    <div className="glass rounded-lg p-3 sm:p-4 h-full animate-slide-up" style={{ animationDelay: '550ms' }}>
      <h3 className="text-xs sm:text-sm font-medium mb-2 sm:mb-4">{title}</h3>

      <div className="h-[200px] sm:h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="shortFactor"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }}
              tickLine={false}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 'auto']}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }}
              tickCount={4}
            />
            <Tooltip content={<CustomTooltip />} />
            <Radar
              name="Risk Factors"
              dataKey="count"
              stroke="hsl(199, 89%, 48%)"
              fill="hsl(199, 89%, 48%)"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
