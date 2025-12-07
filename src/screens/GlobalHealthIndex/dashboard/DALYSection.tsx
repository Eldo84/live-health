import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Treemap, Cell, ScatterChart, Scatter } from "recharts";
import { dalyAnalysisData, treemapData, equityData, chartColors } from "@/lib/mockData";

export const DALYSection = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* YLDs vs Deaths */}
      <Card className="chart-container">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">YLDs vs Deaths</CardTitle>
          <p className="text-sm text-muted-foreground">
            Disability vs mortality burden comparison
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={dalyAnalysisData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="disease"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px"
                }}
              />
              <Bar dataKey="ylds" stackId="a" fill="hsl(var(--chart-2))" name="Years Lived with Disability" />
              <Bar dataKey="deaths" stackId="a" fill="hsl(var(--chart-4))" name="Deaths" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Treemap */}
      <Card className="chart-container">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">DALY Distribution</CardTitle>
          <p className="text-sm text-muted-foreground">
            Share of disability-adjusted life years by category
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 h-80">
            {treemapData.map((item, index) => {
              const size = (item.value / Math.max(...treemapData.map(d => d.value))) * 100;
              return (
                <div
                  key={item.name}
                  className="rounded p-3 text-center transition-all hover:scale-105 cursor-pointer flex flex-col justify-center"
                  style={{
                    backgroundColor: chartColors[item.category] || "hsl(var(--primary))",
                    color: "white",
                    height: `${Math.max(size * 0.8, 30)}%`,
                    minHeight: "60px"
                  }}
                  title={`${item.name}: ${item.value} DALYs`}
                >
                  <div className="text-xs font-semibold mb-1">{item.name}</div>
                  <div className="text-xs opacity-90">{item.value}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Equity vs Intervention */}
      <Card className="chart-container">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Intervention Analysis</CardTitle>
          <p className="text-sm text-muted-foreground">
            Equity vs intervention readiness (bubble size = prevalence)
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart
              data={equityData}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                type="number"
                dataKey="equity"
                name="Equity Score"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                domain={[0, 100]}
              />
              <YAxis
                type="number"
                dataKey="intervention"
                name="Intervention Readiness"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                domain={[0, 100]}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover p-3 rounded-lg border shadow-lg">
                        <p className="font-semibold">{data.disease}</p>
                        <p className="text-sm">Equity: {data.equity}%</p>
                        <p className="text-sm">Intervention: {data.intervention}%</p>
                        <p className="text-sm">Prevalence: {data.prevalence}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter dataKey="prevalence" fill="hsl(var(--primary))" fillOpacity={0.7}>
                {equityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 6) + 1}))`} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};