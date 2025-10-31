import React from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingDown, TrendingUp, Activity } from "lucide-react";

const healthData = [
  {
    country: "Singapore",
    dalys: 21,
    mortality: 13,
    healthAccess: 92,
    lifeExpectancy: 84,
  },
  {
    country: "USA",
    dalys: 125,
    mortality: 36,
    healthAccess: 85,
    lifeExpectancy: 79,
  },
  {
    country: "Brazil",
    dalys: 189,
    mortality: 52,
    healthAccess: 68,
    lifeExpectancy: 76,
  },
  {
    country: "India",
    dalys: 1560,
    mortality: 63,
    healthAccess: 64,
    lifeExpectancy: 70,
  },
  {
    country: "Kenya",
    dalys: 324,
    mortality: 68,
    healthAccess: 58,
    lifeExpectancy: 68,
  },
  {
    country: "Nigeria",
    dalys: 452,
    mortality: 72,
    healthAccess: 52,
    lifeExpectancy: 55,
  },
  {
    country: "DRC",
    dalys: 585,
    mortality: 79,
    healthAccess: 45,
    lifeExpectancy: 62,
  },
  {
    country: "Yemen",
    dalys: 287,
    mortality: 82,
    healthAccess: 38,
    lifeExpectancy: 67,
  },
];

export const GlobalHealthIndex = (): JSX.Element => {
  return (
    <Card className="bg-[#ffffff14] border-[#eaebf024]">
      <CardHeader className="pb-4">
        <div>
          <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#66dbe1]" />
            Global Population Health Index
          </h3>
          <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mt-1">
            Comparative health burden and equity indicators across regions
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={healthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
              <XAxis
                dataKey="country"
                stroke="#ebebeb99"
                style={{ fontFamily: 'Roboto', fontSize: '11px' }}
              />
              <YAxis
                stroke="#ebebeb99"
                style={{ fontFamily: 'Roboto', fontSize: '11px' }}
                label={{ value: 'DALYs (per 100k)', angle: -90, position: 'insideLeft', fill: '#ebebeb99', style: { fontSize: '11px' } }}
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
              <Bar dataKey="dalys" fill="#66dbe1" name="DALYs" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#ffffff0d] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="[font-family:'Roboto',Helvetica] font-medium text-[#ebebeb] text-sm">
                Healthcare Access
              </span>
              <TrendingUp className="w-4 h-4 text-[#4ade80]" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs">
                  Highest:
                </span>
                <span className="[font-family:'Roboto',Helvetica] font-semibold text-[#4ade80] text-sm">
                  Singapore 92%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs">
                  Lowest:
                </span>
                <span className="[font-family:'Roboto',Helvetica] font-semibold text-[#f87171] text-sm">
                  Yemen 38%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#ffffff0d] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="[font-family:'Roboto',Helvetica] font-medium text-[#ebebeb] text-sm">
                Life Expectancy
              </span>
              <Activity className="w-4 h-4 text-[#66dbe1]" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs">
                  Highest:
                </span>
                <span className="[font-family:'Roboto',Helvetica] font-semibold text-[#4ade80] text-sm">
                  Singapore 84y
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs">
                  Lowest:
                </span>
                <span className="[font-family:'Roboto',Helvetica] font-semibold text-[#f87171] text-sm">
                  Nigeria 55y
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#ffffff0d] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="[font-family:'Roboto',Helvetica] font-medium text-[#ebebeb] text-sm">
                Disease Burden
              </span>
              <TrendingDown className="w-4 h-4 text-[#f87171]" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs">
                  Lowest:
                </span>
                <span className="[font-family:'Roboto',Helvetica] font-semibold text-[#4ade80] text-sm">
                  Singapore 21
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs">
                  Highest:
                </span>
                <span className="[font-family:'Roboto',Helvetica] font-semibold text-[#f87171] text-sm">
                  India 1560
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#66dbe11a] border border-[#66dbe133] rounded-lg p-4">
          <h4 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-sm mb-2">
            Understanding Health Metrics
          </h4>
          <div className="space-y-2">
            <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb] text-xs">
              <strong>DALYs (Disability-Adjusted Life Years):</strong> Measures overall disease burden,
              representing years lost due to ill-health, disability or early death.
            </p>
            <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb] text-xs">
              <strong>Healthcare Access Index:</strong> Composite score reflecting availability and quality
              of health services, based on infrastructure and coverage data.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
