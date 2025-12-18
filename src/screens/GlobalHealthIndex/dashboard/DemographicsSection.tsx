import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { sexPatternData, heatmapData } from "@/lib/mockData";

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
  const [selectedDisease, setSelectedDisease] = useState("Ischemic Heart Disease");

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
  }, [filters.searchTerm]);

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
  }, [filters.searchTerm]);

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
    const intensity = Math.min(value / 400, 1);
    return `hsl(195, 85%, ${90 - intensity * 40}%)`;
  };

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
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={sexChartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eaebf024" opacity={0.3} />
              <XAxis
                dataKey="sex"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#ebebeb" }}
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
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {sexChartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.sex === "Female" ? "#66dbe1" : "#f87171"}
                    opacity={entry.isFiltered ? 1 : 0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
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
                          color: (value as number) > 200 ? 'white' : '#ebebeb',
                          opacity: selectedAgeGroupKey && !isSelected ? 0.3 : 1
                        }}
                        title={`${disease.disease} - ${ageGroup}: ${value} DALYs`}
                      >
                        {value}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          
          {/* Age group labels */}
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