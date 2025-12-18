import React from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Loader2 } from "lucide-react";
import { useDiseaseDistribution } from "../../../lib/useDiseaseDistribution";
import { useLanguage } from "../../../contexts/LanguageContext";

interface DiseaseDistributionPieProps {
  timeRange: string;
  searchQuery?: string;
  countryId?: string | null;
}

// Color palette with distinct colors for pie chart slices
const colorPalette = [
  '#f87171', // red
  '#66dbe1', // cyan
  '#fbbf24', // amber
  '#a78bfa', // purple
  '#fb923c', // orange
  '#ef4444', // red-500
  '#10b981', // green
  '#ec4899', // pink
  '#3b82f6', // blue
  '#f59e0b', // amber-500
  '#8b5cf6', // violet
  '#06b6d4', // cyan-500
  '#14b8a6', // teal
  '#f97316', // orange-500
  '#6366f1', // indigo
  '#22c55e', // green-500
  '#eab308', // yellow
  '#84cc16', // lime
  '#0ea5e9', // sky-500
  '#a855f7', // purple-500
];

export const DiseaseDistributionPie = ({ timeRange, searchQuery = "", countryId }: DiseaseDistributionPieProps): JSX.Element => {
  const { data, loading, error } = useDiseaseDistribution(timeRange, countryId);
  const { t } = useLanguage();

  // Filter data based on search query and assign unique colors
  const filteredData = React.useMemo(() => {
    let filtered = data;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = data.filter(disease => 
        disease.name.toLowerCase().includes(query)
      );
    }
    
    // Deduplicate by disease name to ensure each disease appears only once
    const uniqueDiseases = new Map<string, typeof data[0]>();
    filtered.forEach(disease => {
      if (!uniqueDiseases.has(disease.name)) {
        uniqueDiseases.set(disease.name, disease);
      }
    });
    
    const uniqueData = Array.from(uniqueDiseases.values());
    
    // Assign unique colors sequentially by index
    // Since we have 20 colors and data is limited to top 10 diseases,
    // each disease is guaranteed a unique color
    return uniqueData.map((disease, index) => ({
      ...disease,
      color: colorPalette[index % colorPalette.length],
    }));
  }, [data, searchQuery]);

  if (error) {
    return (
      <Card className="bg-[#ffffff14] border-[#eaebf024]">
        <CardContent className="p-6">
          <p className="[font-family:'Roboto',Helvetica] font-medium text-[#f87171] text-sm">
            {t("dashboard.errorLoadingDistribution", { error })}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#ffffff14] border-[#eaebf024]">
      <CardHeader className="pb-4">
        <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-lg">
          {t("dashboard.diseaseDistribution")}
        </h3>
        <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mt-1">
          {t("dashboard.numberOfOutbreakReportsByDiseaseType")}
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[350px]">
            <Loader2 className="w-8 h-8 text-[#66dbe1] animate-spin" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex items-center justify-center h-[350px]">
            <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm">
              {searchQuery ? t("dashboard.noDataFound", { query: searchQuery }) : t("dashboard.noDataAvailable")}
            </p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={filteredData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {filteredData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    fontFamily: 'Roboto',
                  }}
                  labelStyle={{ color: '#ffffff' }}
                  formatter={(value: number) => [`${value} ${t("dashboard.reports")}`, t("dashboard.cases")]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-6 space-y-3">
              {filteredData.map((disease, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: disease.color }} />
                    <span className="[font-family:'Roboto',Helvetica] font-medium text-[#ebebeb] text-sm">
                      {disease.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-sm">
                      {disease.value}
                    </span>
                    <span className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs">
                      {t("dashboard.reports")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
