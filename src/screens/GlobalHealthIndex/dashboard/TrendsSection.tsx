import { useState, useMemo } from "react";
import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { timeTrendsData, topDiseases } from "@/lib/diseaseSeedData";
import { useHealthStatistics } from "@/lib/useHealthStatistics";

// Type assertions to fix Recharts TypeScript compatibility with React 18
const ResponsiveContainerTyped = ResponsiveContainer as any;
const LineChartTyped = LineChart as any;
const XAxisTyped = XAxis as any;
const YAxisTyped = YAxis as any;
const LegendTyped = Legend as any;
const LineTyped = Line as any;

interface TrendsSectionProps {
  filters?: {
    category?: string;
    country?: string;
    yearRange?: string;
    sex?: string;
    ageGroup?: string;
    searchTerm?: string;
  };
}

export const TrendsSection = ({ filters = {} }: TrendsSectionProps) => {
  const [metricType, setMetricType] = useState<"prevalence" | "dalys" | "mortality">("prevalence");
  
  // Fetch real health statistics data - ignore year filter to get full trend history
  const trendFilters = useMemo(() => ({
    ...filters,
    year: undefined,
    yearRange: undefined
  }), [filters]);
  
  const { data: healthStats, loading, error } = useHealthStatistics(trendFilters);

  // Map disease names to match timeTrendsData keys
  const diseaseNameMap: Record<string, string> = {
    "Heart Disease": "Ischemic Heart Disease",
    "Stroke": "Stroke",
    "Cancer": "Lung Cancer",
    "COPD": "COPD",
    "Diabetes": "Diabetes"
  };

  // Get top conditions from real data or use default mock disease names
  const availableConditions = useMemo(() => {
    if (healthStats && healthStats.length > 0) {
      // Get unique conditions from real data, sorted by prevalence
      const conditionMap = new Map<string, number>();
      healthStats.forEach(stat => {
        const current = conditionMap.get(stat.condition) || 0;
        const prevalence = stat.prevalence_per_100k || 0;
        conditionMap.set(stat.condition, Math.max(current, prevalence));
      });
      
      // Return top 5 conditions by prevalence
      return Array.from(conditionMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([condition]) => condition);
    }
    
    // Fallback to default mock disease names
    return ["Heart Disease", "Stroke", "Cancer", "COPD", "Diabetes"];
  }, [healthStats]);

  // Filter diseases based on category and search term
  const filteredDiseases = useMemo(() => {
    let diseases = availableConditions;
    
    // Filter by category
    if (filters.category && filters.category !== "All Categories") {
      diseases = diseases.filter(disease => {
        // Check if disease matches category in real data
        if (healthStats) {
          return healthStats.some(stat => 
            stat.condition === disease && stat.category === filters.category
          );
        }
        // For mock data, use topDiseases mapping
        const categoryDiseases = topDiseases
          .filter(d => d.category === filters.category)
          .map(d => d.name);
        return categoryDiseases.some(catDisease => 
          disease.includes(catDisease) || catDisease.includes(disease)
        );
      });
    }
    
    // Filter by search term
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase().trim();
      diseases = diseases.filter(d => 
        d.toLowerCase().includes(searchLower)
      );
    }
    
    return diseases;
  }, [filters.category, filters.searchTerm, availableConditions, healthStats]);

  // Build time trends data from real health statistics or fallback to mock data
  const filteredTimeTrendsData = useMemo(() => {
    // If we have real data and it's for recent years (2020+), use real data
    if (healthStats && healthStats.length > 0) {
      // Group by year and condition
      const yearDataMap = new Map<number, Record<string, number>>();
      
      healthStats.forEach(stat => {
        if (!yearDataMap.has(stat.year)) {
          yearDataMap.set(stat.year, { year: stat.year });
        }
        const yearData = yearDataMap.get(stat.year)!;
        
        // Use the appropriate metric
        let value: number | null = null;
        if (metricType === "prevalence") {
          value = stat.prevalence_per_100k;
        } else if (metricType === "mortality") {
          value = stat.mortality_rate;
        } else if (metricType === "dalys") {
          value = stat.dalys_per_100k;
        }
        
        if (value !== null) {
          // Use condition name as key
          yearData[stat.condition] = value;
        }
      });
      
      // Convert to array and sort by year
      const realData = Array.from(yearDataMap.values()).sort((a, b) => a.year - b.year);
      
      // If we have real data, use it; otherwise fall back to mock data
      if (realData.length > 0) {
        return realData;
      }
    }
    
    // Fallback to mock data for historical years
    if (!filters.yearRange) {
      return timeTrendsData;
    }
    
    // Handle different year range formats
    if (filters.yearRange === "2019" || filters.yearRange === "2024") {
      // Single year - show only that year
      const year = parseInt(filters.yearRange);
      return timeTrendsData.filter(d => d.year === year);
    }
    
    if (filters.yearRange.includes("-")) {
      // Range format like "2015-2019" or "2020-2024"
      const [startYearStr, endYearStr] = filters.yearRange.split("-");
      const startYear = parseInt(startYearStr);
      const endYear = parseInt(endYearStr);
      
      if (!isNaN(startYear) && !isNaN(endYear)) {
        return timeTrendsData.filter(d => d.year >= startYear && d.year <= endYear);
      } else if (!isNaN(startYear)) {
        // Only start year provided
        return timeTrendsData.filter(d => d.year >= startYear);
      }
    }
    
    // Default: show all data
    return timeTrendsData;
  }, [filters.yearRange, healthStats, metricType]);

  const colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  return (
    <Card className="bg-[#ffffff14] border-[#eaebf024] hover:bg-[#ffffff1a] transition-colors">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="[font-family:'Roboto',Helvetica] text-lg font-semibold text-[#ebebeb]">Time Trends Analysis</CardTitle>
          <p className="[font-family:'Roboto',Helvetica] text-sm text-[#ebebeb99]">
            {filters.yearRange && filters.yearRange !== "2015-2019"
              ? `Showing trends for: ${filters.yearRange}`
              : `Disease burden trends over time (2020-${new Date().getFullYear()})`}
          </p>
        </div>
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
            variant={metricType === "dalys" ? "default" : "outline"}
            size="sm"
            onClick={() => setMetricType("dalys")}
            className={metricType === "dalys" ? "[font-family:'Roboto',Helvetica] bg-[#66dbe1] text-[#2a4149] hover:bg-[#66dbe1]/90" : "[font-family:'Roboto',Helvetica] border-[#eaebf024] text-[#ebebeb] hover:bg-[#ffffff1a]"}
          >
            DALYs
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
        {loading && (
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-[#ebebeb]">Loading trends data...</p>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-red-400">Error loading data: {error}</p>
          </div>
        )}
        {!loading && !error && filteredTimeTrendsData.length === 0 && (
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-[#ebebeb]">No trends data available for the selected filters.</p>
          </div>
        )}
        {/* Fix for Recharts v2+ compatibility issues by dynamically importing Recharts and guarding render */}
        {!loading && !error && filteredTimeTrendsData.length > 0 && typeof window !== "undefined" && (
          <ResponsiveContainerTyped width="100%" height={400}>
            <LineChartTyped
              data={filteredTimeTrendsData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eaebf024" opacity={0.3} />
              <XAxisTyped
                dataKey="year"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#ebebeb" }}
              />
              <YAxisTyped
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#ebebeb" }}
              />
              <Tooltip
                cursor={{ stroke: '#66dbe1', strokeWidth: 2, strokeOpacity: 0.6, strokeDasharray: '3 3' }}
                contentStyle={{
                  backgroundColor: "#2a4149",
                  border: "1px solid #66dbe1",
                  borderRadius: "6px",
                  color: "#ebebeb",
                  padding: "8px 12px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)"
                } as React.CSSProperties}
                labelStyle={{
                  color: "#66dbe1",
                  fontWeight: "600",
                  marginBottom: "4px"
                }}
                itemStyle={{
                  color: "#ebebeb"
                }}
              />
              <LegendTyped />
              {filteredDiseases.map((disease, index) => {
                // For real data, use condition name directly; for mock data, use mapped name
                const dataKey = healthStats && healthStats.length > 0 
                  ? disease 
                  : (diseaseNameMap[disease] || disease);
                
                // Check if this dataKey exists in the data
                const hasData = filteredTimeTrendsData.some(d => 
                  d[dataKey as keyof typeof d] !== undefined && 
                  d[dataKey as keyof typeof d] !== null
                );
                if (!hasData) return null;
                return (
                  <LineTyped
                    key={disease}
                    type="monotone"
                    dataKey={dataKey}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                );
              })}
            </LineChartTyped>
          </ResponsiveContainerTyped>
        )}
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-4">
          {filteredDiseases.map((disease, index) => {
            // For real data, use condition name directly; for mock data, use mapped name
            const dataKey = healthStats && healthStats.length > 0 
              ? disease 
              : (diseaseNameMap[disease] || disease);
            
            const latestData = filteredTimeTrendsData[filteredTimeTrendsData.length - 1];
            const earliestData = filteredTimeTrendsData[0];
            
            // Safety check: ensure data exists
            if (!latestData || !earliestData) {
              return (
                <div key={disease} className="text-center p-3 bg-[#ffffff0a] rounded-lg border border-[#eaebf024]">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    <span className="[font-family:'Roboto',Helvetica] text-sm font-medium text-[#ebebeb]">{disease}</span>
                  </div>
                  <div className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99]">
                    No data available
                  </div>
                </div>
              );
            }
            
            const latestValue = (latestData[dataKey as keyof typeof latestData] as number) || 0;
            const earliestValue = (earliestData[dataKey as keyof typeof earliestData] as number) || 0;
            
            // Safety check: avoid division by zero
            const change = earliestValue !== 0 
              ? ((latestValue - earliestValue) / earliestValue * 100).toFixed(1)
              : latestValue !== 0 ? "100.0" : "0.0";
            
            return (
              <div key={disease} className="text-center p-3 bg-[#ffffff0a] rounded-lg border border-[#eaebf024]">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <span className="[font-family:'Roboto',Helvetica] text-sm font-medium text-[#ebebeb]">{disease}</span>
                </div>
                <div className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99]">
                  {parseFloat(change) > 0 ? '+' : ''}{change}% since {earliestData.year || 'start'}
                </div>
              </div>
            );
          })}
        </div>
        <p className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99] mt-4">
          Per 100,000 population. Hover over lines for detailed values.
        </p>
      </CardContent>
    </Card>
  );
};