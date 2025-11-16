import React from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Loader2 } from "lucide-react";
import { useDiseaseDistribution } from "../../../lib/useDiseaseDistribution";

interface DiseaseDistributionPieProps {
  timeRange: string;
  searchQuery?: string;
  countryId?: string | null;
}

export const DiseaseDistributionPie = ({ timeRange, searchQuery = "", countryId }: DiseaseDistributionPieProps): JSX.Element => {
  const { data, loading, error } = useDiseaseDistribution(timeRange, countryId);

  // Filter data based on search query
  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) return data;
    
    const query = searchQuery.toLowerCase().trim();
    return data.filter(disease => 
      disease.name.toLowerCase().includes(query)
    );
  }, [data, searchQuery]);

  if (error) {
    return (
      <Card className="bg-[#ffffff14] border-[#eaebf024]">
        <CardContent className="p-6">
          <p className="[font-family:'Roboto',Helvetica] font-medium text-[#f87171] text-sm">
            Error loading distribution: {error}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#ffffff14] border-[#eaebf024]">
      <CardHeader className="pb-4">
        <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-lg">
          Disease Distribution
        </h3>
        <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mt-1">
          Number of outbreak reports by disease type
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
              {searchQuery ? `No data found for "${searchQuery}"` : "No data available"}
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
                  formatter={(value: number) => [`${value} reports`, 'Count']}
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
                      reports
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
