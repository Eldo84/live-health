import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Cell } from "recharts";
import { topDiseases, bubbleChartData, chartColors } from "@/lib/mockData";

export const OverviewSection = () => {
  const [metricType, setMetricType] = useState<"prevalence" | "incidence" | "mortality">("prevalence");

  const chartData = topDiseases.map(disease => ({
    name: disease.name,
    value: disease[metricType],
    category: disease.category
  })).sort((a, b) => b.value - a.value);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top 10 Diseases Bar Chart */}
      <Card className="chart-container">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Top 10 Diseases by Burden</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={metricType === "prevalence" ? "default" : "outline"}
              size="sm"
              onClick={() => setMetricType("prevalence")}
            >
              Prevalence
            </Button>
            <Button
              variant={metricType === "incidence" ? "default" : "outline"}
              size="sm"
              onClick={() => setMetricType("incidence")}
            >
              Incidence
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
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={chartData}
              layout="horizontal"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                width={90}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px"
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[entry.category] || "hsl(var(--primary))"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-2">
            Per 100,000 population. Click buttons to switch between metrics.
          </p>
        </CardContent>
      </Card>

      {/* Bubble Chart */}
      <Card className="chart-container">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Disease Risk Profile</CardTitle>
          <p className="text-sm text-muted-foreground">
            Incidence vs. Mortality Rate (bubble size = prevalence)
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart
              data={bubbleChartData}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                type="number"
                dataKey="x"
                name="Incidence"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Mortality"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover p-3 rounded-lg border shadow-lg">
                        <p className="font-semibold">{data.name}</p>
                        <p className="text-sm">Incidence: {data.x}</p>
                        <p className="text-sm">Mortality: {data.y}</p>
                        <p className="text-sm">Prevalence: {data.size}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter
                dataKey="size"
                fill="hsl(var(--primary))"
                fillOpacity={0.7}
              >
                {bubbleChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[entry.category] || "hsl(var(--primary))"} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-4">
            {Object.entries(chartColors).map(([category, color]) => (
              <div key={category} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-muted-foreground">{category}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};