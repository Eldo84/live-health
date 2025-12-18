import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Cell } from "recharts";
import { chartColors, diseaseData } from "@/lib/mockData";

interface OverviewSectionProps {
  filters?: {
    category?: string;
    country?: string;
    yearRange?: string;
    sex?: string;
    ageGroup?: string;
    searchTerm?: string;
  };
}

export const OverviewSection = ({ filters = {} }: OverviewSectionProps) => {
  const [metricType, setMetricType] = useState<"prevalence" | "incidence" | "mortality">("prevalence");

  // Filter diseaseData based on all filters, then aggregate
  const filteredDiseaseData = useMemo(() => {
    let filtered = [...diseaseData];
    
    // Filter by category
    if (filters.category && filters.category !== "All Categories") {
      filtered = filtered.filter(d => d.category === filters.category);
    }
    
    // Filter by age group
    if (filters.ageGroup && filters.ageGroup !== "All Ages") {
      const ageKey = filters.ageGroup.replace(" years", "");
      // Map age group filter to diseaseData ageGroup format
      const ageGroupMap: Record<string, string> = {
        "0-9": "0-9",
        "10-24": "10-24",
        "25-49": "25-49",
        "50-74": "50-74",
        "75+": "75+"
      };
      const mappedAge = ageGroupMap[ageKey] || ageKey;
      filtered = filtered.filter(d => d.ageGroup === mappedAge);
    }
    
    // Filter by search term
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(d => 
        d.condition.toLowerCase().includes(searchLower) ||
        d.category.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [filters.category, filters.ageGroup, filters.searchTerm]);

  // Aggregate filtered diseaseData into topDiseases format
  const filteredTopDiseases = useMemo(() => {
    if (filteredDiseaseData.length === 0) return [];
    
    // Group by condition and aggregate
    const diseaseMap = new Map<string, {
      name: string;
      prevalence: number;
      incidence: number;
      mortality: number;
      category: string;
      count: number;
    }>();
    
    filteredDiseaseData.forEach(d => {
      const existing = diseaseMap.get(d.condition);
      if (existing) {
        existing.prevalence += d.prevalence;
        existing.incidence += d.incidence;
        existing.mortality += d.mortalityRate;
        existing.count += 1;
      } else {
        diseaseMap.set(d.condition, {
          name: d.condition,
          prevalence: d.prevalence,
          incidence: d.incidence,
          mortality: d.mortalityRate,
          category: d.category,
          count: 1
        });
      }
    });
    
    // Convert to array and average if multiple records
    return Array.from(diseaseMap.values())
      .map(d => ({
        name: d.name,
        prevalence: d.count > 1 ? d.prevalence / d.count : d.prevalence,
        incidence: d.count > 1 ? d.incidence / d.count : d.incidence,
        mortality: d.count > 1 ? d.mortality / d.count : d.mortality,
        category: d.category
      }))
      .sort((a, b) => b.prevalence - a.prevalence)
      .slice(0, 10); // Top 10
  }, [filteredDiseaseData]);

  // Aggregate filtered diseaseData into bubbleChartData format
  const filteredBubbleData = useMemo(() => {
    if (filteredDiseaseData.length === 0) return [];
    
    // Group by condition and aggregate
    const diseaseMap = new Map<string, {
      name: string;
      x: number;
      y: number;
      size: number;
      category: string;
      count: number;
    }>();
    
    filteredDiseaseData.forEach(d => {
      const existing = diseaseMap.get(d.condition);
      if (existing) {
        existing.x += d.incidence;
        existing.y += d.mortalityRate;
        existing.size += d.prevalence;
        existing.count += 1;
      } else {
        diseaseMap.set(d.condition, {
          name: d.condition,
          x: d.incidence,
          y: d.mortalityRate,
          size: d.prevalence,
          category: d.category,
          count: 1
        });
      }
    });
    
    // Convert to array and average if multiple records
    return Array.from(diseaseMap.values())
      .map(d => ({
        name: d.name,
        x: d.count > 1 ? d.x / d.count : d.x,
        y: d.count > 1 ? d.y / d.count : d.y,
        size: d.count > 1 ? d.size / d.count : d.size,
        category: d.category
      }));
  }, [filteredDiseaseData]);

  const chartData = useMemo(() => {
    return filteredTopDiseases.map(disease => ({
      name: disease.name,
      value: disease[metricType],
      category: disease.category
    })).sort((a, b) => b.value - a.value);
  }, [filteredTopDiseases, metricType]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top 10 Diseases Bar Chart */}
      <Card className="bg-[#ffffff14] border-[#eaebf024] hover:bg-[#ffffff1a] transition-colors">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="[font-family:'Roboto',Helvetica] text-lg font-semibold text-[#ebebeb]">Top 10 Diseases by Burden</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={metricType === "prevalence" ? "default" : "outline"}
              size="sm"
              onClick={() => setMetricType("prevalence")}
              className={metricType === "prevalence" ? "[font-family:'Roboto',Helvetica] bg-[#66dbe1] text-[#2a4149] hover:bg-[#66dbe1]/90" : "[font-family:'Roboto',Helvetica] border-[#eaebf024] text-[#ebebeb] hover:bg-[#ffffff1a]"}
            >
              Prevalence
            </Button>
            <Button
              variant={metricType === "incidence" ? "default" : "outline"}
              size="sm"
              onClick={() => setMetricType("incidence")}
              className={metricType === "incidence" ? "[font-family:'Roboto',Helvetica] bg-[#66dbe1] text-[#2a4149] hover:bg-[#66dbe1]/90" : "[font-family:'Roboto',Helvetica] border-[#eaebf024] text-[#ebebeb] hover:bg-[#ffffff1a]"}
            >
              Incidence
            </Button>
            <Button
              variant={metricType === "mortality" ? "default" : "outline"}
              size="sm"
              onClick={() => setMetricType("mortality")}
              className={metricType === "mortality" ? "[font-family:'Roboto',Helvetica] bg-[#66dbe1] text-[#2a4149] hover:bg-[#66dbe1]/90" : "[font-family:'Roboto',Helvetica] border-[#eaebf024] text-[#ebebeb] hover:bg-[#ffffff1a]"}
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
              <CartesianGrid strokeDasharray="3 3" stroke="#eaebf024" opacity={0.3} />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#ebebeb" }}
              />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#ebebeb" }}
                width={90}
              />
              <Tooltip
                cursor={{ fill: 'transparent', stroke: '#66dbe1', strokeWidth: 2, strokeOpacity: 0.6 }}
                contentStyle={{
                  backgroundColor: "#2a4149",
                  border: "1px solid #66dbe1",
                  borderRadius: "6px",
                  color: "#ebebeb",
                  padding: "8px 12px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)"
                }}
                labelStyle={{
                  color: "#66dbe1",
                  fontWeight: "600",
                  marginBottom: "4px"
                }}
                itemStyle={{
                  color: "#ebebeb"
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[entry.category] || "#66dbe1"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99] mt-2">
            Per 100,000 population. Click buttons to switch between metrics.
          </p>
        </CardContent>
      </Card>

      {/* Bubble Chart */}
      <Card className="bg-[#ffffff14] border-[#eaebf024] hover:bg-[#ffffff1a] transition-colors">
        <CardHeader>
          <CardTitle className="[font-family:'Roboto',Helvetica] text-lg font-semibold text-[#ebebeb]">Disease Risk Profile</CardTitle>
          <p className="[font-family:'Roboto',Helvetica] text-sm text-[#ebebeb99]">
            Incidence vs. Mortality Rate (bubble size = prevalence)
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart
              data={filteredBubbleData}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eaebf024" opacity={0.3} />
              <XAxis
                type="number"
                dataKey="x"
                name="Incidence"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#ebebeb" }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Mortality"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#ebebeb" }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3', stroke: '#66dbe1', strokeOpacity: 0.5 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#2a4149] border border-[#66dbe1] p-3 rounded-lg shadow-lg text-[#ebebeb]" style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)' }}>
                        <p className="[font-family:'Roboto',Helvetica] font-semibold text-[#66dbe1] mb-2">{data.name}</p>
                        <p className="[font-family:'Roboto',Helvetica] text-sm mb-1">Incidence: <span className="font-medium">{data.x}</span></p>
                        <p className="[font-family:'Roboto',Helvetica] text-sm mb-1">Mortality: <span className="font-medium">{data.y}</span></p>
                        <p className="[font-family:'Roboto',Helvetica] text-sm">Prevalence: <span className="font-medium">{data.size}</span></p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter
                dataKey="size"
                fill="#66dbe1"
                fillOpacity={0.7}
              >
                {filteredBubbleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[entry.category] || "#66dbe1"} />
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
                <span className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99]">{category}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};