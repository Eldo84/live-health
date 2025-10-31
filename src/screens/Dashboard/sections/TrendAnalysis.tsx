import React from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const trendData = [
  { date: "Oct 1", ebola: 12, malaria: 34, covid: 45, cholera: 18, dengue: 22 },
  { date: "Oct 5", ebola: 15, malaria: 38, covid: 42, cholera: 21, dengue: 25 },
  { date: "Oct 10", ebola: 18, malaria: 42, covid: 38, cholera: 24, dengue: 28 },
  { date: "Oct 15", ebola: 23, malaria: 45, covid: 35, cholera: 28, dengue: 31 },
  { date: "Oct 20", ebola: 28, malaria: 48, covid: 32, cholera: 32, dengue: 34 },
  { date: "Oct 25", ebola: 34, malaria: 52, covid: 28, cholera: 36, dengue: 38 },
  { date: "Oct 29", ebola: 39, malaria: 56, covid: 25, cholera: 41, dengue: 42 },
];

export const TrendAnalysis = (): JSX.Element => {
  return (
    <Card className="bg-[#ffffff14] border-[#eaebf024]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-lg">
              Trend Analysis
            </h3>
            <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mt-1">
              Disease reporting frequency over time (similar to Google Trends)
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
            <XAxis
              dataKey="date"
              stroke="#ebebeb99"
              style={{ fontFamily: 'Roboto', fontSize: '12px' }}
            />
            <YAxis
              stroke="#ebebeb99"
              style={{ fontFamily: 'Roboto', fontSize: '12px' }}
              label={{ value: 'Reports', angle: -90, position: 'insideLeft', fill: '#ebebeb99' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                fontFamily: 'Roboto',
              }}
              labelStyle={{ color: '#ffffff' }}
            />
            <Legend
              wrapperStyle={{ fontFamily: 'Roboto', fontSize: '12px' }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="ebola"
              stroke="#f87171"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="Ebola"
            />
            <Line
              type="monotone"
              dataKey="malaria"
              stroke="#fbbf24"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="Malaria"
            />
            <Line
              type="monotone"
              dataKey="covid"
              stroke="#66dbe1"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="COVID-19"
            />
            <Line
              type="monotone"
              dataKey="cholera"
              stroke="#a78bfa"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="Cholera"
            />
            <Line
              type="monotone"
              dataKey="dengue"
              stroke="#fb923c"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="Dengue"
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-[#ffffff0d] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-[#f87171]" />
              <span className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-sm">
                Highest Trend
              </span>
            </div>
            <p className="[font-family:'Roboto',Helvetica] font-medium text-[#66dbe1] text-lg">
              Ebola
            </p>
            <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs mt-1">
              +225% increase this month
            </p>
          </div>

          <div className="bg-[#ffffff0d] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-[#66dbe1]" />
              <span className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-sm">
                Declining
              </span>
            </div>
            <p className="[font-family:'Roboto',Helvetica] font-medium text-[#4ade80] text-lg">
              COVID-19
            </p>
            <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs mt-1">
              -44% decrease this month
            </p>
          </div>

          <div className="bg-[#ffffff0d] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-[#fbbf24]" />
              <span className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-sm">
                Most Reports
              </span>
            </div>
            <p className="[font-family:'Roboto',Helvetica] font-medium text-[#66dbe1] text-lg">
              Malaria
            </p>
            <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs mt-1">
              315 total reports
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
