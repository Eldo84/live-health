import React from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DiseaseOutbreakChartProps {
  timeRange: string;
}

const data = [
  { date: "Jan", ebola: 120, malaria: 450, covid: 890, cholera: 230 },
  { date: "Feb", ebola: 145, malaria: 420, covid: 780, cholera: 245 },
  { date: "Mar", ebola: 180, malaria: 480, covid: 650, cholera: 280 },
  { date: "Apr", ebola: 210, malaria: 510, covid: 590, cholera: 310 },
  { date: "May", ebola: 195, malaria: 490, covid: 520, cholera: 295 },
  { date: "Jun", ebola: 230, malaria: 530, covid: 480, cholera: 330 },
  { date: "Jul", ebola: 265, malaria: 560, covid: 450, cholera: 360 },
];

export const DiseaseOutbreakChart = ({ timeRange }: DiseaseOutbreakChartProps): JSX.Element => {
  return (
    <Card className="bg-[#ffffff14] border-[#eaebf024]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-lg">
              Disease Outbreak Trends
            </h3>
            <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mt-1">
              Cases reported over time by disease type
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorEbola" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f87171" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorMalaria" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorCovid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#66dbe1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#66dbe1" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorCholera" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
            <XAxis
              dataKey="date"
              stroke="#ebebeb99"
              style={{ fontFamily: 'Roboto', fontSize: '12px' }}
            />
            <YAxis
              stroke="#ebebeb99"
              style={{ fontFamily: 'Roboto', fontSize: '12px' }}
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
              iconType="circle"
            />
            <Area
              type="monotone"
              dataKey="ebola"
              stroke="#f87171"
              strokeWidth={2}
              fill="url(#colorEbola)"
              name="Ebola"
            />
            <Area
              type="monotone"
              dataKey="malaria"
              stroke="#fbbf24"
              strokeWidth={2}
              fill="url(#colorMalaria)"
              name="Malaria"
            />
            <Area
              type="monotone"
              dataKey="covid"
              stroke="#66dbe1"
              strokeWidth={2}
              fill="url(#colorCovid)"
              name="COVID-19"
            />
            <Area
              type="monotone"
              dataKey="cholera"
              stroke="#a78bfa"
              strokeWidth={2}
              fill="url(#colorCholera)"
              name="Cholera"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
