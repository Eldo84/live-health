import React from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";

interface Disease {
  name: string;
  cases: number;
  growth: string;
  severity: "critical" | "high" | "medium" | "low";
  color: string;
}

const diseases: Disease[] = [
  { name: "Ebola", cases: 15420, growth: "+18.2%", severity: "critical", color: "#f87171" },
  { name: "Malaria", cases: 12350, growth: "+12.4%", severity: "high", color: "#fbbf24" },
  { name: "COVID-19", cases: 8970, growth: "-8.1%", severity: "medium", color: "#66dbe1" },
  { name: "Cholera", cases: 6540, growth: "+9.7%", severity: "high", color: "#a78bfa" },
  { name: "Dengue", cases: 4230, growth: "+15.3%", severity: "medium", color: "#fb923c" },
  { name: "Measles", cases: 2180, growth: "+5.6%", severity: "low", color: "#60a5fa" },
];

const severityConfig = {
  critical: { label: "Critical", bg: "bg-[#f8717133]", text: "text-[#f87171]" },
  high: { label: "High", bg: "bg-[#fbbf2433]", text: "text-[#fbbf24]" },
  medium: { label: "Medium", bg: "bg-[#66dbe133]", text: "text-[#66dbe1]" },
  low: { label: "Low", bg: "bg-[#4ade8033]", text: "text-[#4ade80]" },
};

export const TopDiseases = (): JSX.Element => {
  return (
    <Card className="bg-[#ffffff14] border-[#eaebf024]">
      <CardHeader className="pb-4">
        <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-lg">
          Top Active Diseases
        </h3>
        <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mt-1">
          Ranked by current case count
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {diseases.map((disease, index) => (
          <div key={index} className="flex items-center justify-between pb-4 border-b border-[#ffffff1a] last:border-0 last:pb-0">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-2 h-12 rounded-full" style={{ backgroundColor: disease.color }} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-sm">
                    {disease.name}
                  </span>
                  <Badge className={`${severityConfig[disease.severity].bg} ${severityConfig[disease.severity].text} border-0 text-xs`}>
                    {severityConfig[disease.severity].label}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="[font-family:'Roboto',Helvetica] font-medium text-[#ebebeb99] text-xs">
                    {disease.cases.toLocaleString()} cases
                  </span>
                  <span className={`[font-family:'Roboto',Helvetica] font-medium text-xs ${disease.growth.startsWith('+') ? 'text-[#f87171]' : 'text-[#4ade80]'}`}>
                    {disease.growth}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
