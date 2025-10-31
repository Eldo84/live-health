import React from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { Clock, AlertCircle, CheckCircle, TrendingUp } from "lucide-react";

interface TimelineEvent {
  id: number;
  disease: string;
  location: string;
  eventType: "detected" | "escalated" | "contained" | "resolved";
  description: string;
  affectedPopulation: number;
  timestamp: string;
  color: string;
}

const events: TimelineEvent[] = [
  {
    id: 1,
    disease: "Ebola",
    location: "DRC - Kinshasa",
    eventType: "detected",
    description: "New outbreak detected in urban area",
    affectedPopulation: 452,
    timestamp: "2 hours ago",
    color: "#f87171",
  },
  {
    id: 2,
    disease: "Malaria",
    location: "Nigeria - Lagos",
    eventType: "escalated",
    description: "Cases increased by 35% requiring enhanced response",
    affectedPopulation: 1250,
    timestamp: "5 hours ago",
    color: "#fbbf24",
  },
  {
    id: 3,
    disease: "COVID-19",
    location: "Brazil - São Paulo",
    eventType: "contained",
    description: "New variant contained through vaccination efforts",
    affectedPopulation: 890,
    timestamp: "8 hours ago",
    color: "#66dbe1",
  },
  {
    id: 4,
    disease: "Cholera",
    location: "Yemen - Sanaa",
    eventType: "escalated",
    description: "Water contamination spreading to adjacent regions",
    affectedPopulation: 1540,
    timestamp: "12 hours ago",
    color: "#a78bfa",
  },
  {
    id: 5,
    disease: "Dengue",
    location: "Singapore - Central",
    eventType: "contained",
    description: "Mosquito control operations showing effectiveness",
    affectedPopulation: 245,
    timestamp: "1 day ago",
    color: "#fb923c",
  },
  {
    id: 6,
    disease: "Measles",
    location: "Kenya - Nairobi",
    eventType: "resolved",
    description: "Outbreak fully resolved through vaccination campaign",
    affectedPopulation: 180,
    timestamp: "2 days ago",
    color: "#60a5fa",
  },
];

const eventConfig = {
  detected: {
    icon: <AlertCircle className="w-5 h-5" />,
    label: "Detected",
    bg: "bg-[#f8717133]",
  },
  escalated: {
    icon: <TrendingUp className="w-5 h-5" />,
    label: "Escalated",
    bg: "bg-[#fbbf2433]",
  },
  contained: {
    icon: <CheckCircle className="w-5 h-5" />,
    label: "Contained",
    bg: "bg-[#66dbe133]",
  },
  resolved: {
    icon: <CheckCircle className="w-5 h-5" />,
    label: "Resolved",
    bg: "bg-[#4ade8033]",
  },
};

export const AlertTimeline = (): JSX.Element => {
  return (
    <Card className="bg-[#ffffff14] border-[#eaebf024]">
      <CardHeader className="pb-4">
        <div>
          <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#66dbe1]" />
            Alert Timeline
          </h3>
          <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mt-1">
            Chronological tracking of outbreak events and response actions
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-[#ffffff1a]" />

          <div className="space-y-6">
            {events.map((event, index) => {
              const config = eventConfig[event.eventType];
              return (
                <div key={event.id} className="relative flex gap-4">
                  <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ${config.bg} border-2 border-[#2a4149] flex items-center justify-center`} style={{ color: event.color }}>
                    {config.icon}
                  </div>

                  <div className="flex-1 pb-6">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: event.color }} />
                          <span className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-sm">
                            {event.disease}
                          </span>
                          <span className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs">
                            •
                          </span>
                          <span className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs">
                            {event.location}
                          </span>
                        </div>
                        <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb] text-sm">
                          {event.description}
                        </p>
                      </div>
                      <span className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs whitespace-nowrap ml-4">
                        {event.timestamp}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-3">
                      <div className={`px-3 py-1 rounded-full ${config.bg}`}>
                        <span className="[font-family:'Roboto',Helvetica] font-medium text-xs" style={{ color: event.color }}>
                          {config.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs">
                          Affected:
                        </span>
                        <span className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-xs">
                          {event.affectedPopulation.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-3">
          <div className="bg-[#f8717133] rounded-lg p-3 text-center">
            <div className="[font-family:'Roboto',Helvetica] font-bold text-[#f87171] text-2xl">
              2
            </div>
            <div className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs mt-1">
              Detected
            </div>
          </div>
          <div className="bg-[#fbbf2433] rounded-lg p-3 text-center">
            <div className="[font-family:'Roboto',Helvetica] font-bold text-[#fbbf24] text-2xl">
              2
            </div>
            <div className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs mt-1">
              Escalated
            </div>
          </div>
          <div className="bg-[#66dbe133] rounded-lg p-3 text-center">
            <div className="[font-family:'Roboto',Helvetica] font-bold text-[#66dbe1] text-2xl">
              2
            </div>
            <div className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs mt-1">
              Contained
            </div>
          </div>
          <div className="bg-[#4ade8033] rounded-lg p-3 text-center">
            <div className="[font-family:'Roboto',Helvetica] font-bold text-[#4ade80] text-2xl">
              1
            </div>
            <div className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs mt-1">
              Resolved
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
