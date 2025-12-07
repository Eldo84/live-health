import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { sexPatternData, heatmapData } from "@/lib/mockData";

export const DemographicsSection = () => {
  const [selectedDisease, setSelectedDisease] = useState("Ischemic Heart Disease");

  const diseaseOptions = sexPatternData.map(d => d.disease);
  const selectedDiseaseData = sexPatternData.find(d => d.disease === selectedDisease);

  const sexChartData = selectedDiseaseData ? [
    { sex: "Female", value: selectedDiseaseData.female },
    { sex: "Male", value: selectedDiseaseData.male }
  ] : [];

  const getHeatmapColor = (value: number) => {
    const intensity = Math.min(value / 400, 1);
    return `hsl(195, 85%, ${90 - intensity * 40}%)`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Sex Pattern Analysis */}
      <Card className="chart-container">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Disease Burden by Sex</CardTitle>
          <Select
            value={selectedDisease}
            onChange={(e) => setSelectedDisease(e.target.value)}
            className="w-[250px]"
          >
            {diseaseOptions.map((disease) => (
              <option key={disease} value={disease}>
                {disease}
              </option>
            ))}
          </Select>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={sexChartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="sex"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
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
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                <Cell fill="hsl(var(--chart-4))" />
                <Cell fill="hsl(var(--chart-1))" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-2">
            Cases per 100,000 population by sex for {selectedDisease.toLowerCase()}
          </p>
        </CardContent>
      </Card>

      {/* Age Group Heatmap */}
      <Card className="chart-container">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Disease Burden by Age Group</CardTitle>
          <p className="text-sm text-muted-foreground">
            Heatmap showing DALYs across age groups and diseases
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {heatmapData.map((disease, diseaseIndex) => (
              <div key={disease.disease} className="flex items-center gap-2">
                <div className="w-24 text-sm font-medium text-right">
                  {disease.disease}
                </div>
                <div className="flex gap-1 flex-1">
                  {Object.entries(disease).filter(([key]) => key !== 'disease').map(([ageGroup, value]) => (
                    <div
                      key={ageGroup}
                      className="flex-1 h-8 flex items-center justify-center text-xs font-medium rounded"
                      style={{
                        backgroundColor: getHeatmapColor(value as number),
                        color: (value as number) > 200 ? 'white' : 'hsl(var(--foreground))'
                      }}
                      title={`${disease.disease} - ${ageGroup}: ${value} DALYs`}
                    >
                      {value}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Age group labels */}
          <div className="flex items-center gap-2 mt-4">
            <div className="w-24"></div>
            <div className="flex gap-1 flex-1">
              {["0-4", "5-14", "15-49", "50-69", "70+"].map(ageGroup => (
                <div key={ageGroup} className="flex-1 text-center text-xs font-medium text-muted-foreground">
                  {ageGroup}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-xs text-muted-foreground">Low</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map(intensity => (
                <div
                  key={intensity}
                  className="w-4 h-4 rounded"
                  style={{
                    backgroundColor: `hsl(195, 85%, ${90 - intensity * 10}%)`
                  }}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">High</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};