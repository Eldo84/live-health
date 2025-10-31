import React from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { AlertTriangle, Info, AlertCircle } from "lucide-react";

interface Alert {
  id: number;
  type: "critical" | "warning" | "info";
  disease: string;
  location: string;
  description: string;
  time: string;
}

const alerts: Alert[] = [
  {
    id: 1,
    type: "critical",
    disease: "Ebola",
    location: "Democratic Republic of Congo",
    description: "New outbreak detected in urban area with 45 confirmed cases",
    time: "2 hours ago",
  },
  {
    id: 2,
    type: "warning",
    disease: "Malaria",
    location: "Nigeria",
    description: "Significant increase in cases reported in Lagos region",
    time: "5 hours ago",
  },
  {
    id: 3,
    type: "info",
    disease: "COVID-19",
    location: "Brazil",
    description: "New variant detected, monitoring situation closely",
    time: "8 hours ago",
  },
  {
    id: 4,
    type: "warning",
    disease: "Cholera",
    location: "Yemen",
    description: "Water contamination leading to rapid spread",
    time: "12 hours ago",
  },
  {
    id: 5,
    type: "info",
    disease: "Dengue",
    location: "Singapore",
    description: "Seasonal outbreak in progress, preventive measures active",
    time: "1 day ago",
  },
];

const alertConfig = {
  critical: {
    icon: <AlertTriangle className="w-5 h-5" />,
    bg: "bg-[#f8717133]",
    border: "border-[#f87171]",
    text: "text-[#f87171]",
    badgeBg: "bg-[#f87171]",
    label: "Critical",
  },
  warning: {
    icon: <AlertCircle className="w-5 h-5" />,
    bg: "bg-[#fbbf2433]",
    border: "border-[#fbbf24]",
    text: "text-[#fbbf24]",
    badgeBg: "bg-[#fbbf24]",
    label: "Warning",
  },
  info: {
    icon: <Info className="w-5 h-5" />,
    bg: "bg-[#66dbe133]",
    border: "border-[#66dbe1]",
    text: "text-[#66dbe1]",
    badgeBg: "bg-[#66dbe1]",
    label: "Info",
  },
};

export const RecentAlerts = (): JSX.Element => {
  return (
    <Card className="bg-[#ffffff14] border-[#eaebf024]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-lg">
              Recent Alerts
            </h3>
            <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mt-1">
              Latest outbreak notifications and updates
            </p>
          </div>
          <button className="[font-family:'Roboto',Helvetica] font-medium text-[#66dbe1] text-sm hover:underline">
            View all
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.map((alert) => {
          const config = alertConfig[alert.type];
          return (
            <div
              key={alert.id}
              className={`flex gap-4 p-4 rounded-lg border ${config.bg} ${config.border} hover:opacity-90 transition-opacity cursor-pointer`}
            >
              <div className={`${config.text} mt-1`}>
                {config.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={`${config.badgeBg} text-white border-0 text-xs`}>
                    {config.label}
                  </Badge>
                  <span className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-sm">
                    {alert.disease}
                  </span>
                  <span className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs">
                    •
                  </span>
                  <span className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs">
                    {alert.location}
                  </span>
                </div>
                <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb] text-sm mb-2">
                  {alert.description}
                </p>
                <span className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs">
                  {alert.time}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
