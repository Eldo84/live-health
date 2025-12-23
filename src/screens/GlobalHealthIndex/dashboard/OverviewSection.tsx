import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Cell } from "recharts";
import { chartColors } from "@/lib/diseaseSeedData";
import { useHealthStatistics } from "@/lib/useHealthStatistics";

// Type assertions to fix Recharts TypeScript compatibility with React 18
const ResponsiveContainerTyped = ResponsiveContainer as any;
const BarChartTyped = BarChart as any;
const ScatterChartTyped = ScatterChart as any;
const XAxisTyped = XAxis as any;
const YAxisTyped = YAxis as any;
const BarTyped = Bar as any;
const ScatterTyped = Scatter as any;
const CellTyped = Cell as any;

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
  
  // Fetch real health statistics data
  const { data: healthStats, loading, error } = useHealthStatistics(filters);

  // Analyze data sources for credibility indicator
  const dataSourceAnalysis = useMemo(() => {
    if (!healthStats || healthStats.length === 0) {
      return { hasOfficial: false, hasAI: false, sources: [] };
    }
    
    const sources = new Set(healthStats.map(s => s.data_source).filter(Boolean));
    const hasOfficial = Array.from(sources).some(s => 
      s && (s.includes("IHME") || s.includes("WHO") || s.includes("CDC") || s.includes("GBD"))
    );
    const hasAI = Array.from(sources).some(s => 
      s && (s.includes("AI") || s.includes("DeepSeek") || s.includes("Fallback"))
    );
    
    return { hasOfficial, hasAI, sources: Array.from(sources) };
  }, [healthStats]);

  // Transform health statistics to match the expected format
  const filteredDiseaseData = useMemo(() => {
    if (!healthStats || healthStats.length === 0) return [];
    
    return healthStats.map(stat => ({
      condition: stat.condition,
      category: stat.category,
      ageGroup: stat.age_group || "All ages",
      prevalence: stat.prevalence_per_100k || 0,
      incidence: stat.incidence_per_100k || 0,
      mortalityRate: stat.mortality_rate || 0,
      dataSource: stat.data_source,
    }));
  }, [healthStats]);

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
    const diseases = Array.from(diseaseMap.values())
      .map(d => ({
        name: d.name,
        prevalence: d.count > 1 ? d.prevalence / d.count : d.prevalence,
        incidence: d.count > 1 ? d.incidence / d.count : d.incidence,
        mortality: d.count > 1 ? d.mortality / d.count : d.mortality,
        category: d.category
      }))
      // Filter out diseases with very low values (noise)
      .filter(d => d.prevalence > 1 || d.incidence > 0.1 || d.mortality > 0.1)
      // Sort by prevalence
      .sort((a, b) => b.prevalence - a.prevalence)
      .slice(0, 10); // Top 10
    
    // If no diseases passed the filter, return top 10 by prevalence regardless
    if (diseases.length === 0) {
      return Array.from(diseaseMap.values())
        .map(d => ({
          name: d.name,
          prevalence: d.count > 1 ? d.prevalence / d.count : d.prevalence,
          incidence: d.count > 1 ? d.incidence / d.count : d.incidence,
          mortality: d.count > 1 ? d.mortality / d.count : d.mortality,
          category: d.category
        }))
        .sort((a, b) => b.prevalence - a.prevalence)
        .slice(0, 10);
    }
    
    return diseases;
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
    const data = filteredTopDiseases.map(disease => ({
      name: disease.name.length > 25 ? disease.name.substring(0, 25) + '...' : disease.name,
      value: Math.max(0.01, disease[metricType]), // Ensure minimum value for visibility
      category: disease.category,
      fullName: disease.name
    })).sort((a, b) => b.value - a.value);
    
    // Debug logging
    console.log('Chart Data:', data);
    console.log('Metric Type:', metricType);
    console.log('Filtered Top Diseases:', filteredTopDiseases.length);
    
    return data;
  }, [filteredTopDiseases, metricType]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#ffffff14] border-[#eaebf024]">
          <CardContent className="flex items-center justify-center h-[350px]">
            <p className="text-[#ebebeb]">Loading health statistics...</p>
          </CardContent>
        </Card>
        <Card className="bg-[#ffffff14] border-[#eaebf024]">
          <CardContent className="flex items-center justify-center h-[350px]">
            <p className="text-[#ebebeb]">Loading health statistics...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#ffffff14] border-[#eaebf024]">
          <CardContent className="flex items-center justify-center h-[350px]">
            <p className="text-red-400">Error loading data: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (filteredDiseaseData.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#ffffff14] border-[#eaebf024]">
          <CardContent className="flex items-center justify-center h-[350px]">
            <p className="text-[#ebebeb]">No health statistics data available. Please run data collection first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Data Source Disclaimer (always shown) */}
      <Card className="bg-[#fbbf2414] border-[#fbbf2440]">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-[#fbbf24] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="[font-family:'Roboto',Helvetica] text-sm font-semibold text-[#fbbf24]">
                  Data Disclaimer
                </h4>
                <Badge variant="outline" className="border-[#fbbf24] text-[#fbbf24] text-[10px]">
                  AI-researched (demo)
                </Badge>
              </div>
              <p className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99] leading-relaxed">
                The data displayed here is AI-researched and provided for demonstration purposes only. It is not official and should not be used for clinical or policy decisions. Official data sources (e.g., IHME/GBD, WHO, CDC) will be integrated when available.
              </p>
              {dataSourceAnalysis.sources.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {dataSourceAnalysis.sources.map((source, idx) => (
                    <Badge key={idx} variant="outline" className="border-[#eaebf024] text-[#ebebeb99] text-[10px]">
                      {source}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
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
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-[350px]">
              <p className="text-[#ebebeb99] text-sm">
                No diseases found with the current filters. Try adjusting your search criteria.
              </p>
            </div>
          ) : (
            <>
              <ResponsiveContainerTyped width="100%" height={350}>
                <BarChartTyped
                  data={chartData}
                  layout="horizontal"
                  margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                  barSize={20}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eaebf024" opacity={0.3} vertical={false} />
                  <XAxisTyped
                    type="number"
                    domain={[0, 'dataMax']}
                    axisLine={{ stroke: '#eaebf024' }}
                    tickLine={{ stroke: '#eaebf024' }}
                    tick={{ fontSize: 12, fill: "#ebebeb" }}
                  />
                  <YAxisTyped
                    type="category"
                    dataKey="name"
                    axisLine={{ stroke: '#eaebf024' }}
                    tickLine={{ stroke: '#eaebf024' }}
                    tick={{ fontSize: 11, fill: "#ebebeb" }}
                    width={110}
                  />
                  <Tooltip
                    cursor={{ fill: '#66dbe1', fillOpacity: 0.1 }}
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
                  />
                  <BarTyped 
                    dataKey="value" 
                    fill="#66dbe1"
                    radius={[0, 8, 8, 0]}
                    minPointSize={5}
                    isAnimationActive={true}
                  >
                    {chartData.map((entry, index) => {
                      const color = chartColors[entry.category] || "#66dbe1";
                      return (
                        <CellTyped 
                          key={`cell-${index}`} 
                          fill={color}
                          stroke={color}
                          strokeWidth={0}
                        />
                      );
                    })}
                  </BarTyped>
                </BarChartTyped>
              </ResponsiveContainerTyped>
              <p className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99] mt-2">
                Per 100,000 population. Click buttons to switch between metrics.
              </p>
            </>
          )}
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
          <ResponsiveContainerTyped width="100%" height={350}>
            <ScatterChartTyped
              data={filteredBubbleData}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eaebf024" opacity={0.3} />
              <XAxisTyped
                type="number"
                dataKey="x"
                name="Incidence"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#ebebeb" }}
              />
              <YAxisTyped
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
              <ScatterTyped
                dataKey="size"
                fill="#66dbe1"
                fillOpacity={0.7}
              >
                {filteredBubbleData.map((entry, index) => (
                  <CellTyped key={`cell-${index}`} fill={chartColors[entry.category] || "#66dbe1"} />
                ))}
              </ScatterTyped>
            </ScatterChartTyped>
          </ResponsiveContainerTyped>
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
    </div>
  );
};