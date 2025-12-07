import { useState } from "react";
import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { timeTrendsData } from "@/lib/mockData";

// Type assertions to fix Recharts TypeScript compatibility with React 18
const ResponsiveContainerTyped = ResponsiveContainer as any;
const LineChartTyped = LineChart as any;
const XAxisTyped = XAxis as any;
const YAxisTyped = YAxis as any;
const LegendTyped = Legend as any;
const LineTyped = Line as any;

export const TrendsSection = () => {
  const [metricType, setMetricType] = useState<"prevalence" | "dalys" | "mortality">("prevalence");

  const diseases = ["Heart Disease", "Stroke", "Cancer", "COPD", "Diabetes"];
  const colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  return (
    <Card className="chart-container">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">Time Trends Analysis</CardTitle>
          <p className="text-sm text-muted-foreground">
            Disease burden trends over time (2020-2024)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={metricType === "prevalence" ? "default" : "outline"}
            size="sm"
            onClick={() => setMetricType("prevalence")}
          >
            Prevalence
          </Button>
          <Button
            variant={metricType === "dalys" ? "default" : "outline"}
            size="sm"
            onClick={() => setMetricType("dalys")}
          >
            DALYs
          </Button>
          <Button
            variant={metricType === "mortality" ? "default" : "outline"}
            size="sm"
            onClick={() => setMetricType("mortality")}
          >
            Mortality
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Fix for Recharts v2+ compatibility issues by dynamically importing Recharts and guarding render */}
        {typeof window !== "undefined" && (
          <ResponsiveContainerTyped width="100%" height={400}>
            <LineChartTyped
              data={timeTrendsData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxisTyped
                dataKey="year"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxisTyped
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px"
                } as React.CSSProperties}
              />
              <LegendTyped />
              {diseases.map((disease, index) => (
                <LineTyped
                  key={disease}
                  type="monotone"
                  dataKey={disease}
                  stroke={colors[index]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChartTyped>
          </ResponsiveContainerTyped>
        )}
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-4">
          {diseases.map((disease, index) => {
            const latestData = timeTrendsData[timeTrendsData.length - 1];
            const earliestData = timeTrendsData[0];
            const latestValue = latestData[disease as keyof typeof latestData] as number;
            const earliestValue = earliestData[disease as keyof typeof earliestData] as number;
            const change = ((latestValue - earliestValue) / earliestValue * 100).toFixed(1);
            
            return (
              <div key={disease} className="text-center p-3 bg-card-subtle rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: colors[index] }}
                  />
                  <span className="text-sm font-medium">{disease}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {parseFloat(change) > 0 ? '+' : ''}{change}% since 2020
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Per 100,000 population. Hover over lines for detailed values.
        </p>
      </CardContent>
    </Card>
  );
};