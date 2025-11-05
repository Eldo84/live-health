import React, { useMemo } from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Loader2 } from "lucide-react";
import { useDashboardChart } from "../../../lib/useDashboardChart";

interface DiseaseOutbreakChartProps {
  timeRange: string;
  searchQuery?: string;
}

const colorPalette = [
  { color: "#f87171", gradientId: "color1" },
  { color: "#fbbf24", gradientId: "color2" },
  { color: "#66dbe1", gradientId: "color3" },
  { color: "#a78bfa", gradientId: "color4" },
  { color: "#fb923c", gradientId: "color5" },
  { color: "#60a5fa", gradientId: "color6" },
];

export const DiseaseOutbreakChart = ({ timeRange, searchQuery = "" }: DiseaseOutbreakChartProps): JSX.Element => {
  const { chartData, loading, error } = useDashboardChart(timeRange);

  // Extract unique diseases from data and filter by search query
  const diseases = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    const diseaseSet = new Set<string>();
    chartData.forEach(point => {
      Object.keys(point).forEach(key => {
        if (key !== "date") {
          diseaseSet.add(key);
        }
      });
    });
    
    let filtered = Array.from(diseaseSet);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(disease => disease.toLowerCase().includes(query));
    }
    
    return filtered.slice(0, 6); // Top 6 diseases
  }, [chartData, searchQuery]);

  // Filter chart data to only show diseases matching search
  const filteredChartData = useMemo(() => {
    if (!searchQuery.trim() || diseases.length === 0) {
      // Return original data if no search or no matching diseases
      return chartData;
    }
    
    return chartData.map(point => {
      const filtered: any = { date: point.date };
      diseases.forEach(disease => {
        const normalizedValue = point[disease] as number;
        const actualValue = point[`${disease}_actual`] as number;
        filtered[disease] = normalizedValue || 0;
        filtered[`${disease}_actual`] = actualValue !== undefined ? actualValue : (point[disease] as number) || 0;
      });
      return filtered;
    });
  }, [chartData, diseases, searchQuery]);

  if (error) {
    return (
      <Card className="bg-[#ffffff14] border-[#eaebf024]">
        <CardContent className="p-6">
          <p className="[font-family:'Roboto',Helvetica] font-medium text-[#f87171] text-sm">
            Error loading chart data: {error}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#ffffff14] border-[#eaebf024]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-lg">
              Disease Outbreak Trends
            </h3>
            <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mt-1">
              Cases reported over time by disease type
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[350px]">
            <Loader2 className="w-8 h-8 text-[#66dbe1] animate-spin" />
          </div>
        ) : filteredChartData.length === 0 || diseases.length === 0 ? (
          <div className="flex items-center justify-center h-[350px]">
            <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm">
              {searchQuery ? `No data found for "${searchQuery}"` : "No data available for the selected time range"}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={filteredChartData}>
              <defs>
                {diseases.map((disease, index) => {
                  const palette = colorPalette[index % colorPalette.length];
                  return (
                    <linearGradient key={disease} id={`color${disease.replace(/\s+/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={palette.color} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={palette.color} stopOpacity={0}/>
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
              <XAxis
                dataKey="date"
                stroke="#ebebeb99"
                style={{ fontFamily: 'Roboto', fontSize: '12px' }}
              />
              <YAxis
                stroke="#ebebeb99"
                style={{ fontFamily: 'Roboto', fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  fontFamily: 'Roboto',
                }}
                labelStyle={{ color: '#ffffff' }}
              />
              <Legend
                wrapperStyle={{ fontFamily: 'Roboto', fontSize: '12px' }}
                iconType="circle"
              />
              {diseases.map((disease, index) => {
                const palette = colorPalette[index % colorPalette.length];
                return (
                  <Area
                    key={disease}
                    type="monotone"
                    dataKey={disease}
                    stroke={palette.color}
                    strokeWidth={2}
                    fill={`url(#color${disease.replace(/\s+/g, "")})`}
                    name={disease}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
