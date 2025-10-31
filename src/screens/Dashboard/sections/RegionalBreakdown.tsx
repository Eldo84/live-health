import React from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const data = [
  { name: "Africa", value: 42, color: "#f87171" },
  { name: "Asia", value: 28, color: "#fbbf24" },
  { name: "Europe", value: 15, color: "#66dbe1" },
  { name: "Americas", value: 10, color: "#a78bfa" },
  { name: "Oceania", value: 5, color: "#4ade80" },
];

export const RegionalBreakdown = (): JSX.Element => {
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
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
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
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {data.map((region, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: region.color }} />
              <span className="[font-family:'Roboto',Helvetica] font-medium text-[#ebebeb] text-sm">
                {region.name}
              </span>
              <span className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-sm ml-auto">
                {region.value}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
