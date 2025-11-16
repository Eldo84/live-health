import React, { useMemo } from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useRegionalRiskLevels } from "../../../lib/useRegionalRiskLevels";
import { Loader2, AlertCircle } from "lucide-react";

const REGION_COLORS: Record<string, string> = {
  "Africa": "#f87171",
  "Asia": "#fbbf24",
  "Europe": "#66dbe1",
  "Americas": "#a78bfa",
  "Oceania": "#4ade80",
  "Other": "#94a3b8",
};

const getRegionColor = (region: string): string => {
  return REGION_COLORS[region] || REGION_COLORS["Other"];
};

interface RegionalBreakdownProps {
  timeRange?: string;
  countryId?: string | null;
}

export const RegionalBreakdown = ({ timeRange = "30d", countryId }: RegionalBreakdownProps): JSX.Element => {
  const { data, loading, error } = useRegionalRiskLevels(timeRange, countryId);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const totalOutbreaks = data.reduce((sum, region) => sum + region.outbreakCount, 0);
    
    return data.map((region) => ({
      name: region.region,
      value: region.outbreakCount,
      percentage: totalOutbreaks > 0 
        ? Math.round((region.outbreakCount / totalOutbreaks) * 100) 
        : 0,
      color: getRegionColor(region.region),
      totalCases: region.totalCases,
    }));
  }, [data]);

  if (loading) {
    return (
      <Card className="bg-[#ffffff14] border-[#eaebf024]">
        <CardHeader className="pb-4">
          <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-lg">
            Regional Distribution
          </h3>
          <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mt-1">
            Outbreak cases by continent
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="w-6 h-6 text-[#66dbe1] animate-spin" />
            <span className="ml-2 [font-family:'Roboto',Helvetica] font-normal text-[#ebebeb] text-sm">
              Loading data...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-[#ffffff14] border-[#eaebf024]">
        <CardHeader className="pb-4">
          <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-lg">
            Regional Distribution
          </h3>
          <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mt-1">
            Outbreak cases by continent
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-[#f87171]">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span className="[font-family:'Roboto',Helvetica] font-normal text-sm">
              {error}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="bg-[#ffffff14] border-[#eaebf024]">
        <CardHeader className="pb-4">
          <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-lg">
            Regional Distribution
          </h3>
          <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mt-1">
            Outbreak cases by continent
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-[#ebebeb99]">
            <span className="[font-family:'Roboto',Helvetica] font-normal text-sm">
              No data available
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#ffffff14] border-[#eaebf024]">
      <CardHeader className="pb-4">
        <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-lg">
          Regional Distribution
        </h3>
        <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mt-1">
          Outbreak cases by continent
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name} ${percentage}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
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
              formatter={(value: number, name: string, props: any) => {
                return [
                  `${value} outbreaks${props.payload.totalCases > 0 ? ` (${props.payload.totalCases.toLocaleString()} cases)` : ''}`,
                  name
                ];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {chartData.map((region, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: region.color }} />
              <span className="[font-family:'Roboto',Helvetica] font-medium text-[#ebebeb] text-sm">
                {region.name}
              </span>
              <span className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-sm ml-auto">
                {region.percentage}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
