import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useHealthStatistics } from "@/lib/useHealthStatistics";

// Type assertions to fix Recharts TypeScript compatibility with React 18
const ResponsiveContainerTyped = ResponsiveContainer as any;
const BarChartTyped = BarChart as any;
const XAxisTyped = XAxis as any;
const YAxisTyped = YAxis as any;
const BarTyped = Bar as any;
const CellTyped = Cell as any;

interface DemographicsSectionProps {
  filters?: {
    category?: string;
    country?: string;
    yearRange?: string;
    sex?: string;
    ageGroup?: string;
    searchTerm?: string;
  };
}

export const DemographicsSection = ({ filters = {} }: DemographicsSectionProps) => {
  // Fetch real health statistics data
  const { data: healthStats, loading, error } = useHealthStatistics(filters);

  // Transform data for sex patterns (aggregate by condition)
  const sexPatternData = useMemo(() => {
    if (!healthStats || healthStats.length === 0) return [];
    
    const conditionMap = new Map<string, { disease: string; female: number; male: number; count: number }>();
    
    healthStats.forEach(stat => {
      const existing = conditionMap.get(stat.condition);
      if (existing) {
        existing.female += stat.female_value || 0;
        existing.male += stat.male_value || 0;
        existing.count += 1;
      } else {
        conditionMap.set(stat.condition, {
          disease: stat.condition,
          female: stat.female_value || 0,
          male: stat.male_value || 0,
          count: 1
        });
      }
    });
    
    // Average if multiple records
    const result = Array.from(conditionMap.values()).map(d => ({
      disease: d.disease,
      female: d.count > 1 ? d.female / d.count : d.female,
      male: d.count > 1 ? d.male / d.count : d.male
    })).sort((a, b) => (b.female + b.male) - (a.female + a.male));
    
    console.log('Sex Pattern Data:', result.length, 'diseases');
    console.log('Sample:', result[0]);
    console.log('Filters:', filters);
    
    return result;
  }, [healthStats]);

  // Transform data for heatmap (by condition and age group)
  const heatmapData = useMemo(() => {
    if (!healthStats || healthStats.length === 0) return [];
    
    const conditionMap = new Map<string, Record<string, number>>();
    
    healthStats.forEach(stat => {
      if (!conditionMap.has(stat.condition)) {
        conditionMap.set(stat.condition, { disease: stat.condition });
      }
      const conditionData = conditionMap.get(stat.condition)!;
      
      // Map age_group to heatmap keys
      const ageGroupKey = stat.age_group || "All ages";
      const mappedKey = ageGroupKey
        .replace("0-9 years", "0-9")
        .replace("10-24 years", "10-24")
        .replace("25-49 years", "25-49")
        .replace("50-74 years", "50-74")
        .replace("75+ years", "75+")
        .replace("All ages", "All");
      
      const dalys = stat.dalys_per_100k || 0;
      if (conditionData[mappedKey] !== undefined) {
        conditionData[mappedKey] += dalys;
      } else {
        conditionData[mappedKey] = dalys;
      }
    });
    
    return Array.from(conditionMap.values()).filter(d => {
      const keys = Object.keys(d).filter(k => k !== 'disease');
      return keys.length > 0;
    });
  }, [healthStats]);

  const [selectedDisease, setSelectedDisease] = useState<string>("");

  // Set default selected disease when data loads
  useEffect(() => {
    if (sexPatternData.length > 0 && !selectedDisease) {
      setSelectedDisease(sexPatternData[0].disease);
    }
  }, [sexPatternData, selectedDisease]);

  // Filter sexPatternData based on filters
  const filteredSexPatternData = useMemo(() => {
    let filtered = [...sexPatternData];
    
    // Filter by search term
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(d => 
        d.disease.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [sexPatternData, filters.searchTerm]);

  // Filter heatmapData based on filters
  const filteredHeatmapData = useMemo(() => {
    let filtered = [...heatmapData];
    
    // Filter by search term
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(d => 
        d.disease.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [heatmapData, filters.searchTerm]);

  // Map age group filter to heatmap keys
  const selectedAgeGroupKey = useMemo(() => {
    if (!filters.ageGroup || filters.ageGroup === "All Ages") {
      return null;
    }
    // Map filter values to heatmap data keys
    const ageGroupMap: Record<string, string> = {
      "0-9 years": "0-9",
      "10-24 years": "10-24",
      "25-49 years": "25-49",
      "50-74 years": "50-74",
      "75+ years": "75+"
    };
    return ageGroupMap[filters.ageGroup] || null;
  }, [filters.ageGroup]);

  const diseaseOptions = useMemo(() => {
    return filteredSexPatternData.map(d => d.disease);
  }, [filteredSexPatternData]);

  // Update selectedDisease if it's not in filtered list
  const selectedDiseaseData = useMemo(() => {
    const found = filteredSexPatternData.find(d => d.disease === selectedDisease);
    if (found) return found;
    if (filteredSexPatternData.length > 0) {
      return filteredSexPatternData[0];
    }
    return null;
  }, [filteredSexPatternData, selectedDisease]);

  const sexChartData = useMemo(() => {
    if (!selectedDiseaseData) return [];
    
    // Filter by sex if specified
    if (filters.sex && filters.sex !== "All") {
      const value = filters.sex === "Female" ? selectedDiseaseData.female : selectedDiseaseData.male;
      return [
        { 
          sex: filters.sex, 
          value: value,
          isFiltered: true
        }
      ];
    }
    
    return [
      { sex: "Female", value: selectedDiseaseData.female, isFiltered: false },
      { sex: "Male", value: selectedDiseaseData.male, isFiltered: false }
    ];
  }, [selectedDiseaseData, filters.sex]);

  const getHeatmapColor = (value: number) => {
    const maxValue = Math.max(...filteredHeatmapData.flatMap(d => 
      Object.entries(d).filter(([key]) => key !== 'disease').map(([, val]) => val as number)
    ), 1);
    const intensity = Math.min(value / maxValue, 1);
    return `hsl(195, 85%, ${90 - intensity * 40}%)`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#ffffff14] border-[#eaebf024]">
          <CardContent className="flex items-center justify-center h-[350px]">
            <p className="text-[#ebebeb]">Loading demographics data...</p>
          </CardContent>
        </Card>
        <Card className="bg-[#ffffff14] border-[#eaebf024]">
          <CardContent className="flex items-center justify-center h-[350px]">
            <p className="text-[#ebebeb]">Loading demographics data...</p>
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

  if (filteredSexPatternData.length === 0 && filteredHeatmapData.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#ffffff14] border-[#eaebf024]">
          <CardContent className="flex items-center justify-center h-[350px]">
            <p className="text-[#ebebeb]">No demographics data available. Please run data collection first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Sex Pattern Analysis */}
      <Card className="bg-[#ffffff14] border-[#eaebf024] hover:bg-[#ffffff1a] transition-colors">
        <CardHeader>
          <CardTitle className="[font-family:'Roboto',Helvetica] text-lg font-semibold text-[#ebebeb]">Disease Burden by Sex</CardTitle>
          {filters.sex && filters.sex !== "All" && (
            <p className="[font-family:'Roboto',Helvetica] text-xs text-[#66dbe1] mb-2">
              Filtered to show: {filters.sex} only
            </p>
          )}
          <Select
            value={selectedDiseaseData?.disease || selectedDisease}
            onChange={(e) => setSelectedDisease(e.target.value)}
            className="w-[250px] bg-[#2a4149] border-[#66dbe1] text-white hover:bg-[#3a5159] focus:ring-2 focus:ring-[#66dbe1] cursor-pointer"
            style={{ color: '#ffffff' }}
          >
            {diseaseOptions.map((disease) => (
              <option key={disease} value={disease} style={{ backgroundColor: '#2a4149', color: '#ffffff' }}>
                {disease}
              </option>
            ))}
          </Select>
        </CardHeader>
        <CardContent>
          {sexChartData.length > 0 ? (
            <ResponsiveContainerTyped width="100%" height={300}>
              <BarChartTyped
                data={sexChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                barSize={40}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eaebf024" opacity={0.3} vertical={false} />
                <XAxisTyped
                  dataKey="sex"
                  axisLine={{ stroke: '#eaebf024' }}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#ebebeb" }}
                />
                <YAxisTyped
                  axisLine={{ stroke: '#eaebf024' }}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#ebebeb" }}
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
                  itemStyle={{
                    color: "#ebebeb"
                  }}
                />
                <BarTyped 
                  dataKey="value" 
                  radius={[4, 4, 0, 0]}
                  minPointSize={5}
                >
                  {sexChartData.map((entry, index) => (
                    <CellTyped 
                      key={`cell-${index}`} 
                      fill={entry.sex === "Female" ? "#66dbe1" : "#f87171"}
                      opacity={entry.isFiltered ? 1 : 0.8}
                    />
                  ))}
                </BarTyped>
              </BarChartTyped>
            </ResponsiveContainerTyped>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-[#ebebeb99] text-sm">No data available for the selected criteria.</p>
            </div>
          )}
          <p className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99] mt-2">
            Cases per 100,000 population by sex for {selectedDiseaseData?.disease.toLowerCase() || selectedDisease.toLowerCase()}
          </p>
        </CardContent>
      </Card>

      {/* Age Group Heatmap */}
      <Card className="bg-[#ffffff14] border-[#eaebf024] hover:bg-[#ffffff1a] transition-colors">
        <CardHeader>
          <CardTitle className="[font-family:'Roboto',Helvetica] text-lg font-semibold text-[#ebebeb]">Disease Burden by Age Group</CardTitle>
          <p className="[font-family:'Roboto',Helvetica] text-sm text-[#ebebeb99]">
            {filters.ageGroup && filters.ageGroup !== "All Ages"
              ? `Highlighting age group: ${filters.ageGroup}`
              : "Heatmap showing DALYs across age groups and diseases"}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredHeatmapData.map((disease) => (
              <div key={disease.disease} className="flex items-center gap-2">
                <div className="[font-family:'Roboto',Helvetica] w-24 text-sm font-medium text-right text-[#ebebeb]">
                  {disease.disease}
                </div>
                <div className="flex gap-1 flex-1">
                  {Object.entries(disease).filter(([key]) => key !== 'disease').map(([ageGroup, value]) => {
                    const isSelected = selectedAgeGroupKey === ageGroup;
                    return (
                      <div
                        key={ageGroup}
                        className={`flex-1 h-8 flex items-center justify-center text-xs font-medium rounded transition-all ${
                          isSelected ? 'ring-2 ring-[#66dbe1] ring-offset-1 ring-offset-[#2a4149] scale-105' : ''
                        }`}
                        style={{
                          backgroundColor: getHeatmapColor(value as number),
                          // If value is high (darker bg), use white text. If low (lighter bg), use dark text.
                          // Assuming getHeatmapColor uses opacity of cyan/blue.
                          // Actually, let's just use a text shadow or a smarter color.
                          color: (value as number) > 1000 ? '#ffffff' : '#1e293b', // Dark slate for light backgrounds
                          fontWeight: (value as number) > 1000 ? 600 : 500,
                          opacity: selectedAgeGroupKey && !isSelected ? 0.3 : 1
                        }}
                        title={`${disease.disease} - ${ageGroup}: ${value} DALYs`}
                      >
                        {Math.round(value as number).toLocaleString()}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          
          {/* Age group labels */}
          {filteredHeatmapData.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <div className="w-24"></div>
              <div className="flex gap-1 flex-1">
                {Object.keys(filteredHeatmapData[0] || {}).filter(key => key !== 'disease').map(ageGroup => {
                  const isSelected = selectedAgeGroupKey === ageGroup;
                  return (
                    <div 
                      key={ageGroup} 
                      className={`[font-family:'Roboto',Helvetica] flex-1 text-center text-xs font-medium transition-all ${
                        isSelected ? 'text-[#66dbe1] font-bold' : 'text-[#ebebeb99]'
                      }`}
                    >
                      {ageGroup}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-2 mt-4">
            <span className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99]">Low</span>
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
            <span className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99]">High</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};