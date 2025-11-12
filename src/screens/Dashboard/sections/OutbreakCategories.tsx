import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface CategoryData {
  id: string;
  name: string;
  description: string;
  color: string;
  diseaseCount: number;
}

export const OutbreakCategories = (): JSX.Element => {
  const [categories, setCategories] = useState<CategoryData[]>([
    { id: '1', name: 'Foodborne Outbreaks', description: 'Diseases transmitted through contaminated food', color: '#f87171', diseaseCount: 45 },
    { id: '2', name: 'Waterborne Outbreaks', description: 'Diseases transmitted through contaminated water', color: '#66dbe1', diseaseCount: 32 },
    { id: '3', name: 'Vector-Borne Outbreaks', description: 'Diseases transmitted by vectors like mosquitoes', color: '#fbbf24', diseaseCount: 67 },
    { id: '4', name: 'Airborne Outbreaks', description: 'Diseases transmitted through air', color: '#a78bfa', diseaseCount: 28 },
    { id: '5', name: 'Contact Transmission', description: 'Diseases transmitted through direct contact', color: '#fb923c', diseaseCount: 41 },
    { id: '6', name: 'Healthcare-Associated Infections', description: 'Infections acquired in healthcare settings', color: '#ef4444', diseaseCount: 38 },
    { id: '7', name: 'Zoonotic Outbreaks', description: 'Diseases transmitted from animals to humans', color: '#10b981', diseaseCount: 54 },
    { id: '8', name: 'Sexually Transmitted Infections', description: 'Diseases transmitted through sexual contact', color: '#ec4899', diseaseCount: 23 },
    { id: '9', name: 'Vaccine-Preventable Diseases', description: 'Diseases that can be prevented by vaccination', color: '#3b82f6', diseaseCount: 19 },
    { id: '10', name: 'Emerging Infectious Diseases', description: 'Newly identified diseases or re-emerging threats', color: '#f59e0b', diseaseCount: 31 },
  ]);

  // Transform categories data for pie chart
  const pieChartData = categories.map(category => ({
    name: category.name,
    value: category.diseaseCount,
    color: category.color,
  }));

  return (
    <div className="space-y-6">
      <Card className="bg-[#ffffff14] border-[#eaebf024]">
        <CardHeader className="pb-4">
          <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-lg">
            Outbreak Categories Distribution
          </h3>
          <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mt-1">
            Visual breakdown of diseases by transmission method and outbreak type
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={140}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
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
                formatter={(value: number) => [`${value} diseases`, 'Count']}
              />
              <Legend
                wrapperStyle={{ fontFamily: 'Roboto', color: '#ebebeb' }}
                iconType="circle"
                formatter={(value) => <span style={{ color: '#ebebeb' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-[#ffffff14] border-[#eaebf024]">
        <CardHeader className="pb-4">
          <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-lg">
            Category Details
          </h3>
          <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mt-1">
            Detailed information about each outbreak category
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className="p-4 rounded-lg border border-[#ffffff1a] hover:bg-[#ffffff0d] transition-all cursor-pointer"
                style={{ borderLeftWidth: '4px', borderLeftColor: category.color }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-sm flex-1">
                    {category.name}
                  </h4>
                  <Badge
                    className="border-0 text-xs"
                    style={{ backgroundColor: `${category.color}33`, color: category.color }}
                  >
                    {category.diseaseCount}
                  </Badge>
                </div>
                <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs leading-relaxed">
                  {category.description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
