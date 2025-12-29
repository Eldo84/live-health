import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Cell, LabelList, Legend } from "recharts";
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
const LabelListTyped = LabelList as any;
const LegendTyped = Legend as any;

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
    return Array.from(diseaseMap.values())
      .map(d => ({
        name: d.name,
        prevalence: d.count > 1 ? d.prevalence / d.count : d.prevalence,
        incidence: d.count > 1 ? d.incidence / d.count : d.incidence,
        mortality: d.count > 1 ? d.mortality / d.count : d.mortality,
        category: d.category
      }));
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
    if (filteredTopDiseases.length === 0) return [];
    
    // Sort by the selected metric type
    const sorted = [...filteredTopDiseases].sort((a, b) => {
      let aValue = 0;
      let bValue = 0;
      if (metricType === "prevalence") {
        aValue = a.prevalence || 0;
        bValue = b.prevalence || 0;
      } else if (metricType === "incidence") {
        aValue = a.incidence || 0;
        bValue = b.incidence || 0;
      } else if (metricType === "mortality") {
        aValue = a.mortality || 0;
        bValue = b.mortality || 0;
      }
      return bValue - aValue;
    }).slice(0, 10); // Top 10 by selected metric
    
    const data = sorted.map(disease => {
      // Get the correct metric value
      let value = 0;
      if (metricType === "prevalence") {
        value = disease.prevalence || 0;
      } else if (metricType === "incidence") {
        value = disease.incidence || 0;
      } else if (metricType === "mortality") {
        value = disease.mortality || 0;
      }
      
      return {
        name: disease.name.length > 20 ? disease.name.substring(0, 20) + '...' : disease.name,
        value: Math.max(0.01, value), // Ensure minimum value for visibility
        category: disease.category || "Other",
        fullName: disease.name,
        prevalence: disease.prevalence || 0,
        incidence: disease.incidence || 0,
        mortality: disease.mortality || 0
      };
    });
    
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
                  margin={{ top: 5, right: 60, left: 120, bottom: 25 }}
                  barSize={20}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eaebf024" opacity={0.3} vertical={false} />
                  <XAxisTyped
                    type="number"
                    domain={[0, 'dataMax']}
                    axisLine={{ stroke: '#eaebf024' }}
                    tickLine={{ stroke: '#eaebf024' }}
                    tick={{ fontSize: 12, fill: "#ebebeb", fontFamily: "Roboto" }}
                    tickFormatter={(value) => {
                      if (value >= 1000) {
                        return `${(value / 1000).toFixed(1)}k`;
                      }
                      return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
                    }}
                    label={{ 
                      value: metricType === "prevalence" ? "Prevalence per 100k" : 
                             metricType === "incidence" ? "Incidence per 100k" : 
                             "Mortality per 100k",
                      position: "insideBottom",
                      offset: -5,
                      style: { textAnchor: "middle", fill: "#ebebeb99", fontSize: 12, fontFamily: "Roboto" }
                    }}
                  />
                  <YAxisTyped
                    type="category"
                    dataKey="name"
                    axisLine={{ stroke: '#eaebf024' }}
                    tickLine={{ stroke: '#eaebf024' }}
                    tick={{ fontSize: 11, fill: "#ebebeb", fontFamily: "Roboto" }}
                    width={120}
                  />
                  <Tooltip
                    cursor={{ fill: '#66dbe1', fillOpacity: 0.1 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#2a4149] border border-[#66dbe1] p-3 rounded-lg shadow-lg" style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)' }}>
                            <p className="[font-family:'Roboto',Helvetica] font-semibold text-[#66dbe1] mb-2 text-sm">
                              {data.fullName}
                            </p>
                            <div className="space-y-1">
                              <p className="[font-family:'Roboto',Helvetica] text-xs">
                                <span className="text-[#ebebeb99]">Prevalence:</span>{' '}
                                <span className={`font-medium ${metricType === "prevalence" ? "text-[#66dbe1]" : "text-[#ebebeb]"}`}>
                                  {data.prevalence.toLocaleString('en-US', { maximumFractionDigits: 1 })} per 100k
                                </span>
                              </p>
                              <p className="[font-family:'Roboto',Helvetica] text-xs">
                                <span className="text-[#ebebeb99]">Incidence:</span>{' '}
                                <span className={`font-medium ${metricType === "incidence" ? "text-[#66dbe1]" : "text-[#ebebeb]"}`}>
                                  {data.incidence.toLocaleString('en-US', { maximumFractionDigits: 1 })} per 100k
                                </span>
                              </p>
                              <p className="[font-family:'Roboto',Helvetica] text-xs">
                                <span className="text-[#ebebeb99]">Mortality:</span>{' '}
                                <span className={`font-medium ${metricType === "mortality" ? "text-[#66dbe1]" : "text-[#ebebeb]"}`}>
                                  {data.mortality.toLocaleString('en-US', { maximumFractionDigits: 1 })} per 100k
                                </span>
                              </p>
                              <p className="[font-family:'Roboto',Helvetica] text-xs mt-2 pt-2 border-t border-[#eaebf024]">
                                <span className="text-[#ebebeb99]">Category:</span>{' '}
                                <span className="text-[#ebebeb]">{data.category}</span>
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
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
                    <LabelListTyped
                      dataKey="value"
                      position="right"
                      style={{ fill: "#ebebeb", fontSize: 11, fontFamily: "Roboto" }}
                      formatter={(value: number) => {
                        if (value >= 1000) {
                          return `${(value / 1000).toFixed(1)}k`;
                        }
                        return value.toFixed(1);
                      }}
                    />
                  </BarTyped>
                </BarChartTyped>
              </ResponsiveContainerTyped>
              <div className="mt-3 space-y-2">
                <p className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99]">
                  Values shown per 100,000 population. Click buttons above to switch between metrics.
                </p>
                {chartData.length > 0 && (
                  <p className="[font-family:'Roboto',Helvetica] text-xs text-[#66dbe1]">
                    Showing {chartData.length} {chartData.length === 1 ? 'disease' : 'diseases'} ranked by {metricType === "prevalence" ? "prevalence" : metricType === "incidence" ? "incidence" : "mortality"}.
                  </p>
                )}
              </div>
              
              {/* Detailed Table View */}
              {chartData.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-[#eaebf024]">
                        <th className="[font-family:'Roboto',Helvetica] text-left text-xs font-semibold text-[#66dbe1] py-2 px-2">Rank</th>
                        <th className="[font-family:'Roboto',Helvetica] text-left text-xs font-semibold text-[#66dbe1] py-2 px-2">Disease</th>
                        <th className="[font-family:'Roboto',Helvetica] text-right text-xs font-semibold text-[#66dbe1] py-2 px-2">Prevalence</th>
                        <th className="[font-family:'Roboto',Helvetica] text-right text-xs font-semibold text-[#66dbe1] py-2 px-2">Incidence</th>
                        <th className="[font-family:'Roboto',Helvetica] text-right text-xs font-semibold text-[#66dbe1] py-2 px-2">Mortality</th>
                        <th className="[font-family:'Roboto',Helvetica] text-left text-xs font-semibold text-[#66dbe1] py-2 px-2">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map((entry, index) => {
                        const color = chartColors[entry.category] || "#66dbe1";
                        const isSelectedMetric = metricType === "prevalence" ? entry.prevalence :
                                               metricType === "incidence" ? entry.incidence :
                                               entry.mortality;
                        return (
                          <tr 
                            key={index} 
                            className="border-b border-[#eaebf024] hover:bg-[#ffffff08] transition-colors"
                          >
                            <td className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99] py-2 px-2">#{index + 1}</td>
                            <td className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb] py-2 px-2 font-medium">{entry.fullName}</td>
                            <td className={`[font-family:'Roboto',Helvetica] text-xs py-2 px-2 text-right ${
                              metricType === "prevalence" ? "text-[#66dbe1] font-semibold" : "text-[#ebebeb99]"
                            }`}>
                              {entry.prevalence.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                            </td>
                            <td className={`[font-family:'Roboto',Helvetica] text-xs py-2 px-2 text-right ${
                              metricType === "incidence" ? "text-[#66dbe1] font-semibold" : "text-[#ebebeb99]"
                            }`}>
                              {entry.incidence.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                            </td>
                            <td className={`[font-family:'Roboto',Helvetica] text-xs py-2 px-2 text-right ${
                              metricType === "mortality" ? "text-[#66dbe1] font-semibold" : "text-[#ebebeb99]"
                            }`}>
                              {entry.mortality.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                            </td>
                            <td className="py-2 px-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99]">
                                  {entry.category}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
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

      {/* Multi-Metric Comparison Chart */}
      {chartData.length > 0 && (
        <Card className="bg-[#ffffff14] border-[#eaebf024] hover:bg-[#ffffff1a] transition-colors">
          <CardHeader>
            <CardTitle className="[font-family:'Roboto',Helvetica] text-lg font-semibold text-[#ebebeb]">Multi-Metric Comparison</CardTitle>
            <p className="[font-family:'Roboto',Helvetica] text-sm text-[#ebebeb99]">
              Compare Prevalence, Incidence, and Mortality rates side by side
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainerTyped width="100%" height={400}>
              <BarChartTyped
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eaebf024" opacity={0.3} />
                <XAxisTyped
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 11, fill: "#ebebeb", fontFamily: "Roboto" }}
                  interval={0}
                />
                <YAxisTyped
                  tick={{ fontSize: 12, fill: "#ebebeb", fontFamily: "Roboto" }}
                  axisLine={{ stroke: '#eaebf024' }}
                  tickLine={{ stroke: '#eaebf024' }}
                  label={{ 
                    value: "Rate per 100,000 population",
                    angle: -90,
                    position: "insideLeft",
                    style: { textAnchor: "middle", fill: "#ebebeb99", fontSize: 12, fontFamily: "Roboto" }
                  }}
                  tickFormatter={(value) => {
                    if (value >= 1000) {
                      return `${(value / 1000).toFixed(1)}k`;
                    }
                    return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
                  }}
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
                    marginBottom: "4px",
                    fontFamily: "Roboto"
                  }}
                  formatter={(value: any) => {
                    const formattedValue = typeof value === 'number' 
                      ? value.toLocaleString('en-US', { maximumFractionDigits: 1 })
                      : value;
                    return [`${formattedValue} per 100k`, ''];
                  }}
                  labelFormatter={(label) => {
                    const entry = chartData.find(d => d.name === label);
                    return entry?.fullName || label;
                  }}
                />
                <LegendTyped
                  wrapperStyle={{ fontFamily: "Roboto", fontSize: 12, paddingTop: "20px" }}
                  iconType="square"
                />
                <BarTyped 
                  dataKey="prevalence" 
                  name="Prevalence"
                  fill="#66dbe1"
                  radius={[4, 4, 0, 0]}
                />
                <BarTyped 
                  dataKey="incidence" 
                  name="Incidence"
                  fill="#fbbf24"
                  radius={[4, 4, 0, 0]}
                />
                <BarTyped 
                  dataKey="mortality" 
                  name="Mortality"
                  fill="#f87171"
                  radius={[4, 4, 0, 0]}
                />
              </BarChartTyped>
            </ResponsiveContainerTyped>
            <div className="mt-4 flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[#66dbe1]"></div>
                <span className="[font-family:'Roboto',Helvetica] text-[#ebebeb]">Prevalence - Total cases per 100k</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[#fbbf24]"></div>
                <span className="[font-family:'Roboto',Helvetica] text-[#ebebeb]">Incidence - New cases per 100k</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[#f87171]"></div>
                <span className="[font-family:'Roboto',Helvetica] text-[#ebebeb]">Mortality - Deaths per 100k</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};