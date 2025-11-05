import React, { useMemo } from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";
import { useDashboardChart } from "../../../lib/useDashboardChart";

interface TrendAnalysisProps {
  timeRange: string;
}

const colorPalette = [
  { color: "#f87171", name: "Disease 1" },
  { color: "#fbbf24", name: "Disease 2" },
  { color: "#66dbe1", name: "Disease 3" },
  { color: "#a78bfa", name: "Disease 4" },
  { color: "#fb923c", name: "Disease 5" },
];

export const TrendAnalysis = ({ timeRange }: TrendAnalysisProps): JSX.Element => {
  const { chartData, loading, error } = useDashboardChart(timeRange);

  // Normalize data to 0-100 scale (Google Trends style)
  const normalizedData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];

    // Extract all diseases
    const diseases = new Set<string>();
    chartData.forEach(point => {
      Object.keys(point).forEach(key => {
        if (key !== "date") {
          diseases.add(key);
        }
      });
    });

    // Find max value for each disease across all time points
    const maxValues = new Map<string, number>();
    diseases.forEach(disease => {
      const max = Math.max(...chartData.map(d => (d[disease] as number) || 0));
      maxValues.set(disease, max > 0 ? max : 1); // Avoid division by zero
    });

    // Normalize each data point to 0-100 scale, preserving original values
    return chartData.map(point => {
      const normalized: any = { date: point.date };
      diseases.forEach(disease => {
        const value = (point[disease] as number) || 0;
        const max = maxValues.get(disease)!;
        // Normalize: peak value = 100, others proportional
        normalized[disease] = max > 0 ? Math.round((value / max) * 100) : 0;
        // Store original value for tooltip
        normalized[`${disease}_actual`] = value;
      });
      return normalized;
    });
  }, [chartData]);

  // Calculate trends and statistics
  const trendStats = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;

    const diseases = new Set<string>();
    chartData.forEach(point => {
      Object.keys(point).forEach(key => {
        if (key !== "date") {
          diseases.add(key);
        }
      });
    });

    const diseaseArray = Array.from(diseases);
    if (diseaseArray.length === 0) return null;

    // Calculate trends for each disease (using actual values, not normalized)
    const trends = diseaseArray.map(disease => {
      const values = chartData.map(d => (d[disease] as number) || 0);
      const first = values[0] || 0;
      const last = values[values.length - 1] || 0;
      const total = values.reduce((sum, val) => sum + val, 0);
      
      let change = 0;
      if (first > 0) {
        change = ((last - first) / first) * 100;
      } else if (last > 0) {
        change = 100;
      }

      return {
        name: disease,
        total,
        change,
        isIncreasing: change > 0,
        isDecreasing: change < 0,
      };
    });

    // Find highest trend (most increasing)
    const highestTrend = trends.reduce((max, trend) => 
      trend.change > (max?.change || -Infinity) ? trend : max, trends[0]);

    // Find declining trend
    const decliningTrend = trends.filter(t => t.isDecreasing)
      .reduce((min, trend) => 
        trend.change < (min?.change || Infinity) ? trend : min, trends[0]);

    // Find most reports
    const mostReports = trends.reduce((max, trend) => 
      trend.total > (max?.total || -Infinity) ? trend : max, trends[0]);

    return {
      highestTrend,
      decliningTrend: decliningTrend || null,
      mostReports,
    };
  }, [chartData]);

  // Extract unique diseases from data
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
    return Array.from(diseaseSet).slice(0, 5); // Top 5 for trend chart
  }, [chartData]);

  if (error) {
    return (
      <Card className="bg-[#ffffff14] border-[#eaebf024]">
        <CardContent className="p-6">
          <p className="[font-family:'Roboto',Helvetica] font-medium text-[#f87171] text-sm">
            Error loading trend data: {error}
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
              Trend Analysis
            </h3>
            <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mt-1">
              Disease reporting frequency over time (similar to Google Trends)
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="w-8 h-8 text-[#66dbe1] animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[400px]">
            <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm">
              No trend data available
            </p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={normalizedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
                <XAxis
                  dataKey="date"
                  stroke="#ebebeb99"
                  style={{ fontFamily: 'Roboto', fontSize: '12px' }}
                />
                <YAxis
                  stroke="#ebebeb99"
                  style={{ fontFamily: 'Roboto', fontSize: '12px' }}
                  domain={[0, 100]}
                  label={{ value: 'Interest (Normalized)', angle: -90, position: 'insideLeft', fill: '#ebebeb99' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    fontFamily: 'Roboto',
                  }}
                  labelStyle={{ color: '#ffffff' }}
                  formatter={(value: number, name: string, props: any) => {
                    // Get actual value from stored _actual field
                    const actualValue = props.payload[`${name}_actual`] || 0;
                    return [
                      `${value} (${actualValue} reports)`,
                      name
                    ];
                  }}
                />
                <Legend
                  wrapperStyle={{ fontFamily: 'Roboto', fontSize: '12px' }}
                  iconType="line"
                />
                {diseases.map((disease, index) => {
                  const palette = colorPalette[index % colorPalette.length];
                  return (
                    <Line
                      key={disease}
                      type="monotone"
                      dataKey={disease}
                      stroke={palette.color}
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      name={disease}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 px-2">
              <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs">
                <span className="font-semibold text-[#66dbe1]">Note:</span> Values are normalized to 0-100 scale where the peak represents 100. 
                This allows easy comparison of trends regardless of absolute numbers.
              </p>
            </div>

            {trendStats && (
              <div className="mt-6 grid grid-cols-3 gap-4">
                {trendStats.highestTrend && (
                  <div className="bg-[#ffffff0d] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full bg-[#f87171]" />
                      <span className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-sm">
                        Highest Trend
                      </span>
                    </div>
                    <p className="[font-family:'Roboto',Helvetica] font-medium text-[#66dbe1] text-lg">
                      {trendStats.highestTrend.name}
                    </p>
                    <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs mt-1">
                      {trendStats.highestTrend.change > 0 ? '+' : ''}{trendStats.highestTrend.change.toFixed(1)}% change
                    </p>
                  </div>
                )}

                {trendStats.decliningTrend && (
                  <div className="bg-[#ffffff0d] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full bg-[#66dbe1]" />
                      <span className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-sm">
                        Declining
                      </span>
                    </div>
                    <p className="[font-family:'Roboto',Helvetica] font-medium text-[#4ade80] text-lg">
                      {trendStats.decliningTrend.name}
                    </p>
                    <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs mt-1">
                      {trendStats.decliningTrend.change.toFixed(1)}% decrease
                    </p>
                  </div>
                )}

                {trendStats.mostReports && (
                  <div className="bg-[#ffffff0d] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full bg-[#fbbf24]" />
                      <span className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-sm">
                        Most Reports
                      </span>
                    </div>
                    <p className="[font-family:'Roboto',Helvetica] font-medium text-[#66dbe1] text-lg">
                      {trendStats.mostReports.name}
                    </p>
                    <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs mt-1">
                      {trendStats.mostReports.total} total reports
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
