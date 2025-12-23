import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter } from "recharts";
import { chartColors } from "@/lib/diseaseSeedData";
import { useHealthStatistics } from "@/lib/useHealthStatistics";

// Type assertions to fix Recharts TypeScript compatibility with React 18
const ResponsiveContainerTyped = ResponsiveContainer as any;
const BarChartTyped = BarChart as any;
const XAxisTyped = XAxis as any;
const YAxisTyped = YAxis as any;
const BarTyped = Bar as any;
const ScatterChartTyped = ScatterChart as any;
const ScatterTyped = Scatter as any;
const CellTyped = Cell as any;

interface DALYSectionProps {
  filters?: {
    category?: string;
    country?: string;
    yearRange?: string;
    sex?: string;
    ageGroup?: string;
    searchTerm?: string;
  };
}

export const DALYSection = ({ filters = {} }: DALYSectionProps) => {
  // Fetch real health statistics data
  const { data: healthStats, loading, error } = useHealthStatistics(filters);

  // Transform data for DALY analysis (YLDs vs Deaths)
  const dalyAnalysisData = useMemo(() => {
    if (!healthStats || healthStats.length === 0) return [];
    
    const conditionMap = new Map<string, {
      disease: string;
      ylds: number;
      deaths: number;
      total: number;
      count: number;
    }>();
    
    healthStats.forEach(stat => {
      const existing = conditionMap.get(stat.condition);
      const ylds = stat.ylds_per_100k || 0;
      const dalys = stat.dalys_per_100k || 0;
      const deaths = dalys - ylds; // Approximate deaths from DALYs - YLDs
      
      if (existing) {
        existing.ylds += ylds;
        existing.deaths += deaths;
        existing.total += dalys;
        existing.count += 1;
      } else {
        conditionMap.set(stat.condition, {
          disease: stat.condition,
          ylds: ylds,
          deaths: deaths,
          total: dalys,
          count: 1
        });
      }
    });
    
    // Average if multiple records
    return Array.from(conditionMap.values())
      .map(d => ({
        disease: d.disease,
        ylds: d.count > 1 ? Math.round(d.ylds / d.count) : Math.round(d.ylds),
        deaths: d.count > 1 ? Math.round(d.deaths / d.count) : Math.round(d.deaths),
        total: d.count > 1 ? Math.round(d.total / d.count) : Math.round(d.total)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Top 10
  }, [healthStats]);

  // Transform data for treemap (by category)
  const treemapData = useMemo(() => {
    if (!healthStats || healthStats.length === 0) return [];
    
    const categoryMap = new Map<string, {
      name: string;
      category: string;
      value: number;
      count: number;
    }>();
    
    healthStats.forEach(stat => {
      const existing = categoryMap.get(stat.category);
      const dalys = stat.dalys_per_100k || 0;
      
      if (existing) {
        existing.value += dalys;
        existing.count += 1;
      } else {
        // Map category names to shorter versions
        const categoryMapNames: Record<string, string> = {
          "Cardiovascular and Metabolic Disorders": "Cardiovascular",
          "Cancers": "Cancers",
          "Respiratory Diseases": "Respiratory",
          "Neurological Disorders": "Neurological",
          "Mental and Behavioral Disorders": "Mental Health",
          "High-Burden Infectious Diseases": "Infectious",
          "Injuries & Trauma": "Injuries",
          "Maternal, Neonatal, and Child Health": "Maternal"
        };
        
        categoryMap.set(stat.category, {
          name: categoryMapNames[stat.category] || stat.category,
          category: categoryMapNames[stat.category] || stat.category,
          value: dalys,
          count: 1
        });
      }
    });
    
    // Average if multiple records
    return Array.from(categoryMap.values())
      .map(d => ({
        name: d.name,
        category: d.category,
        value: d.count > 1 ? Math.round(d.value / d.count) : Math.round(d.value)
      }))
      .sort((a, b) => b.value - a.value);
  }, [healthStats]);

  // Transform data for equity vs intervention scatter chart
  const equityData = useMemo(() => {
    if (!healthStats || healthStats.length === 0) return [];
    
    return healthStats
      .filter(stat => stat.equity_notes && stat.interventions && stat.prevalence_per_100k)
      .map(stat => {
        // Extract numeric scores from text fields (simplified - assumes format like "Score: 72" or "72%")
        const equityMatch = stat.equity_notes?.match(/(\d+)/);
        const interventionMatch = stat.interventions?.match(/(\d+)/);
        
        return {
          disease: stat.condition,
          equity: equityMatch ? parseInt(equityMatch[1]) : 50,
          intervention: interventionMatch ? parseInt(interventionMatch[1]) : 50,
          prevalence: Math.round(stat.prevalence_per_100k || 0)
        };
      })
      .filter(d => d.equity > 0 && d.intervention > 0)
      .slice(0, 20); // Limit to 20 points for readability
  }, [healthStats]);

  // Filter DALY analysis data
  const filteredDalyData = useMemo(() => {
    let filtered = [...dalyAnalysisData];
    
    // Filter by search term
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(d => 
        d.disease.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [dalyAnalysisData, filters.searchTerm]);

  // Filter treemap data by category
  const filteredTreemapData = useMemo(() => {
    let filtered = [...treemapData];
    
    // Filter by category
    if (filters.category && filters.category !== "All Categories") {
      filtered = filtered.filter(d => 
        d.category === filters.category || d.name.includes(filters.category!)
      );
    }
    
    return filtered;
  }, [treemapData, filters.category]);

  // Filter equity data
  const filteredEquityData = useMemo(() => {
    let filtered = [...equityData];
    
    // Filter by search term
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(d => 
        d.disease.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [equityData, filters.searchTerm]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Card key={i} className="bg-[#ffffff14] border-[#eaebf024]">
            <CardContent className="flex items-center justify-center h-[350px]">
              <p className="text-[#ebebeb]">Loading DALY data...</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-[#ffffff14] border-[#eaebf024]">
          <CardContent className="flex items-center justify-center h-[350px]">
            <p className="text-red-400">Error loading data: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (filteredDalyData.length === 0 && filteredTreemapData.length === 0 && filteredEquityData.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-[#ffffff14] border-[#eaebf024]">
          <CardContent className="flex items-center justify-center h-[350px]">
            <p className="text-[#ebebeb]">No DALY data available. Please run data collection first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* YLDs vs Deaths */}
      <Card className="bg-[#ffffff14] border-[#eaebf024] hover:bg-[#ffffff1a] transition-colors">
        <CardHeader>
          <CardTitle className="[font-family:'Roboto',Helvetica] text-lg font-semibold text-[#ebebeb]">YLDs vs Deaths</CardTitle>
          <p className="[font-family:'Roboto',Helvetica] text-sm text-[#ebebeb99]">
            Disability vs mortality burden comparison
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainerTyped width="100%" height={300}>
            <BarChartTyped
              data={filteredDalyData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eaebf024" opacity={0.3} />
              <XAxisTyped
                dataKey="disease"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#ebebeb" }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxisTyped
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#ebebeb" }}
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
              <BarTyped dataKey="ylds" stackId="a" fill="#66dbe1" name="Years Lived with Disability" />
              <BarTyped dataKey="deaths" stackId="a" fill="#f87171" name="Deaths" />
            </BarChartTyped>
          </ResponsiveContainerTyped>
        </CardContent>
      </Card>

      {/* Treemap */}
      <Card className="bg-[#ffffff14] border-[#eaebf024] hover:bg-[#ffffff1a] transition-colors">
        <CardHeader>
          <CardTitle className="[font-family:'Roboto',Helvetica] text-lg font-semibold text-[#ebebeb]">DALY Distribution</CardTitle>
          <p className="[font-family:'Roboto',Helvetica] text-sm text-[#ebebeb99]">
            Share of disability-adjusted life years by category
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 h-80">
            {filteredTreemapData.map((item) => {
              const maxValue = Math.max(...filteredTreemapData.map(d => d.value), 1);
              const size = (item.value / maxValue) * 100;
              return (
                <div
                  key={item.name}
                  className="rounded p-3 text-center transition-all hover:scale-105 cursor-pointer flex flex-col justify-center"
                  style={{
                    backgroundColor: chartColors[item.category] || "#66dbe1",
                    color: "white",
                    height: `${Math.max(size * 0.8, 30)}%`,
                    minHeight: "60px"
                  }}
                  title={`${item.name}: ${item.value} DALYs`}
                >
                  <div className="[font-family:'Roboto',Helvetica] text-xs font-semibold mb-1">{item.name}</div>
                  <div className="[font-family:'Roboto',Helvetica] text-xs opacity-90">{item.value}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Equity vs Intervention */}
      <Card className="bg-[#ffffff14] border-[#eaebf024] hover:bg-[#ffffff1a] transition-colors">
        <CardHeader>
          <CardTitle className="[font-family:'Roboto',Helvetica] text-lg font-semibold text-[#ebebeb]">Intervention Analysis</CardTitle>
          <p className="[font-family:'Roboto',Helvetica] text-sm text-[#ebebeb99]">
            Equity vs intervention readiness (bubble size = prevalence)
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainerTyped width="100%" height={300}>
            <ScatterChartTyped
              data={filteredEquityData}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eaebf024" opacity={0.3} />
              <XAxisTyped
                type="number"
                dataKey="equity"
                name="Equity Score"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#ebebeb" }}
                domain={[0, 100]}
              />
              <YAxisTyped
                type="number"
                dataKey="intervention"
                name="Intervention Readiness"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#ebebeb" }}
                domain={[0, 100]}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3', stroke: '#66dbe1', strokeWidth: 2, strokeOpacity: 0.6 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#2a4149] border border-[#66dbe1] p-3 rounded-lg shadow-lg text-[#ebebeb]" style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)' }}>
                        <p className="[font-family:'Roboto',Helvetica] font-semibold text-[#66dbe1] mb-2">{data.disease}</p>
                        <p className="[font-family:'Roboto',Helvetica] text-sm mb-1">Equity: <span className="font-medium">{data.equity}%</span></p>
                        <p className="[font-family:'Roboto',Helvetica] text-sm mb-1">Intervention: <span className="font-medium">{data.intervention}%</span></p>
                        <p className="[font-family:'Roboto',Helvetica] text-sm">Prevalence: <span className="font-medium">{data.prevalence}</span></p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ScatterTyped dataKey="prevalence" fill="#66dbe1" fillOpacity={0.7}>
                {filteredEquityData.map((_entry, index) => {
                  const colors = ["#66dbe1", "#f87171", "#fbbf24", "#4ade80", "#60a5fa", "#a78bfa"];
                  return (
                    <CellTyped key={`cell-${index}`} fill={colors[index % colors.length]} />
                  );
                })}
              </ScatterTyped>
            </ScatterChartTyped>
          </ResponsiveContainerTyped>
        </CardContent>
      </Card>
    </div>
  );
};