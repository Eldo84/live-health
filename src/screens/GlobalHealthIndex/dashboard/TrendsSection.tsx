import { useState, useMemo } from "react";
import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { timeTrendsData, topDiseases } from "@/lib/mockData";

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

  // Map disease names to match timeTrendsData keys
  const diseaseNameMap: Record<string, string> = {
    "Heart Disease": "Ischemic Heart Disease",
    "Stroke": "Stroke",
    "Cancer": "Lung Cancer",
    "COPD": "COPD",
    "Diabetes": "Diabetes"
  };

  // Filter diseases based on category and search term
  const filteredDiseases = useMemo(() => {
    let diseases = ["Heart Disease", "Stroke", "Cancer", "COPD", "Diabetes"];
    
    // Filter by category
    if (filters.category && filters.category !== "All Categories") {
      const categoryDiseases = topDiseases
        .filter(d => d.category === filters.category)
        .map(d => {
          // Map back to display names
          for (const [display, dataName] of Object.entries(diseaseNameMap)) {
            if (d.name.includes(dataName) || dataName.includes(d.name.split(" ")[0])) {
              return display;
            }
          }
          return null;
        })
        .filter((d): d is string => d !== null);
      
      if (categoryDiseases.length > 0) {
        diseases = diseases.filter(d => categoryDiseases.includes(d));
      }
    }
    
    // Filter by search term
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase().trim();
      diseases = diseases.filter(d => 
        d.toLowerCase().includes(searchLower) ||
        diseaseNameMap[d]?.toLowerCase().includes(searchLower)
      );
    }
    
    return diseases;
  }, [filters.category, filters.searchTerm]);

  // Filter timeTrendsData based on yearRange
  const filteredTimeTrendsData = useMemo(() => {
    if (!filters.yearRange) {
      return timeTrendsData;
    }
    
    // Handle different year range formats
    if (filters.yearRange === "2019") {
      // Single year - show only that year
      return timeTrendsData.filter(d => d.year === 2019);
    }
    
    if (filters.yearRange.includes("-")) {
      // Range format like "2015-2019"
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
  }, [filters.yearRange]);

  const colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  return (
    <Card className="bg-[#ffffff14] border-[#eaebf024] hover:bg-[#ffffff1a] transition-colors">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="[font-family:'Roboto',Helvetica] text-lg font-semibold text-[#ebebeb]">Time Trends Analysis</CardTitle>
          <p className="[font-family:'Roboto',Helvetica] text-sm text-[#ebebeb99]">
            {filters.yearRange && filters.yearRange !== "2015-2019"
              ? `Showing trends for: ${filters.yearRange}`
              : "Disease burden trends over time (1990-2019)"}
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
        {/* Fix for Recharts v2+ compatibility issues by dynamically importing Recharts and guarding render */}
        {typeof window !== "undefined" && (
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
                const dataKey = diseaseNameMap[disease] || disease;
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
            const dataKey = diseaseNameMap[disease] || disease;
            const latestData = filteredTimeTrendsData[filteredTimeTrendsData.length - 1];
            const earliestData = filteredTimeTrendsData[0];
            const latestValue = latestData[dataKey as keyof typeof latestData] as number;
            const earliestValue = earliestData[dataKey as keyof typeof earliestData] as number;
            const change = ((latestValue - earliestValue) / earliestValue * 100).toFixed(1);
            
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
                  {parseFloat(change) > 0 ? '+' : ''}{change}% since 2020
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