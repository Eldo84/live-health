import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface DiseaseData {
  name: string;
  value: number;
  color: string;
}

export const DiseaseDistributionPie = (): JSX.Element => {
  const [data, setData] = useState<DiseaseData[]>([
    { name: "Ebola", value: 156, color: "#f87171" },
    { name: "Malaria", value: 234, color: "#fbbf24" },
    { name: "COVID-19", value: 189, color: "#66dbe1" },
    { name: "Cholera", value: 145, color: "#a78bfa" },
    { name: "Dengue", value: 98, color: "#fb923c" },
    { name: "Measles", value: 67, color: "#60a5fa" },
  ]);

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
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={true}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
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
          {data.map((disease, index) => (
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
      </CardContent>
    </Card>
  );
};
