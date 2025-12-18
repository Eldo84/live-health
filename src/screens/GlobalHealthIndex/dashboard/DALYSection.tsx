import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter } from "recharts";
import { dalyAnalysisData, treemapData, equityData, chartColors, topDiseases } from "@/lib/mockData";

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
  }, [filters.searchTerm]);

  // Filter treemap data by category
  const filteredTreemapData = useMemo(() => {
    let filtered = [...treemapData];
    
    // Filter by category
    if (filters.category && filters.category !== "All Categories") {
      // Map category names
      const categoryMap: Record<string, string> = {
        "Cardiovascular Diseases": "Cardiovascular",
        "Neoplasms": "Cancers",
        "Chronic Respiratory Diseases": "Respiratory",
        "Diabetes & Kidney Diseases": "Metabolic",
        "Mental Disorders": "Mental Health",
        "Neurological Disorders": "Neurological",
        "Transport Injuries": "Injuries",
        "HIV/AIDS & Tuberculosis": "Infectious",
        "Maternal & Neonatal Disorders": "Maternal"
      };
      
      const mappedCategory = categoryMap[filters.category] || filters.category;
      filtered = filtered.filter(d => d.category === mappedCategory || d.name.includes(filters.category!));
    }
    
    return filtered;
  }, [filters.category]);

  // Filter equity data
  const filteredEquityData = useMemo(() => {
    let filtered = [...equityData];
    
    // Filter by category
    if (filters.category && filters.category !== "All Categories") {
      const categoryDiseases = topDiseases
        .filter(d => d.category === filters.category)
        .map(d => d.name);
      filtered = filtered.filter(d => 
        categoryDiseases.some(cd => d.disease.includes(cd.split(" ")[0]))
      );
    }
    
    // Filter by search term
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(d => 
        d.disease.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [filters.category, filters.searchTerm]);
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
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={filteredDalyData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eaebf024" opacity={0.3} />
              <XAxis
                dataKey="disease"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#ebebeb" }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
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
              <Bar dataKey="ylds" stackId="a" fill="#66dbe1" name="Years Lived with Disability" />
              <Bar dataKey="deaths" stackId="a" fill="#f87171" name="Deaths" />
            </BarChart>
          </ResponsiveContainer>
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
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart
              data={filteredEquityData}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eaebf024" opacity={0.3} />
              <XAxis
                type="number"
                dataKey="equity"
                name="Equity Score"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#ebebeb" }}
                domain={[0, 100]}
              />
              <YAxis
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
              <Scatter dataKey="prevalence" fill="#66dbe1" fillOpacity={0.7}>
                {filteredEquityData.map((_entry, index) => {
                  const colors = ["#66dbe1", "#f87171", "#fbbf24", "#4ade80", "#60a5fa", "#a78bfa"];
                  return (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  );
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};