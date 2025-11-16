import React, { useMemo } from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { Clock, AlertCircle, CheckCircle, TrendingUp, Loader2 } from "lucide-react";
import { useRecentAlerts } from "../../../lib/useRecentAlerts";

interface TimelineEvent {
  id: string;
  disease: string;
  location: string;
  eventType: "detected" | "escalated" | "contained" | "resolved";
  description: string;
  affectedPopulation: number;
  timestamp: string;
  color: string;
}

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

const severityColors: Record<string, string> = {
  critical: "#f87171",
  high: "#fbbf24",
  medium: "#66dbe1",
  low: "#4ade80",
};

interface AlertTimelineProps {
  countryId?: string | null;
}

export const AlertTimeline = ({ countryId }: AlertTimelineProps): JSX.Element => {
  const { alerts, loading, error } = useRecentAlerts(20, countryId);

  // Transform alerts to timeline events
  const events = useMemo(() => {
    return alerts.map((alert, index) => {
      // Determine event type based on alert type
      let eventType: "detected" | "escalated" | "contained" | "resolved";
      if (alert.type === "critical") {
        eventType = "detected";
      } else if (alert.type === "warning") {
        eventType = "escalated";
      } else {
        // For info, determine if it's contained or resolved based on description
        if (alert.description.toLowerCase().includes("contained") || 
            alert.description.toLowerCase().includes("resolved")) {
          eventType = "resolved";
        } else {
          eventType = "contained";
        }
      }

      // Extract population/case count from description if available
      const caseMatch = alert.description.match(/(\d+)\s*(case|cases|people|population)/i);
      const affectedPopulation = caseMatch ? parseInt(caseMatch[1]) : 0;

      // Get color based on alert type
      const color = severityColors[alert.type] || "#66dbe1";

      return {
        id: alert.id,
        disease: alert.disease,
        location: alert.location,
        eventType,
        description: alert.description,
        affectedPopulation,
        timestamp: alert.time,
        color,
      };
    });
  }, [alerts]);

  // Count events by type
  const eventCounts = useMemo(() => {
    const counts = {
      detected: 0,
      escalated: 0,
      contained: 0,
      resolved: 0,
    };
    events.forEach(event => {
      counts[event.eventType]++;
    });
    return counts;
  }, [events]);

  if (error) {
    return (
      <Card className="bg-[#ffffff14] border-[#eaebf024]">
        <CardContent className="p-6">
          <p className="[font-family:'Roboto',Helvetica] font-medium text-[#f87171] text-sm">
            Error loading timeline: {error}
          </p>
        </CardContent>
      </Card>
    );
  }
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
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#66dbe1] animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm">
              No timeline events available
            </p>
          </div>
        ) : (
          <>
            <div className="relative">
              <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-[#ffffff1a]" />

              <div className="space-y-6">
                {events.slice(0, 10).map((event) => {
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
                          {event.affectedPopulation > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs">
                                Affected:
                              </span>
                              <span className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-xs">
                                {event.affectedPopulation.toLocaleString()}
                              </span>
                            </div>
                          )}
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
                  {eventCounts.detected}
                </div>
                <div className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs mt-1">
                  Detected
                </div>
              </div>
              <div className="bg-[#fbbf2433] rounded-lg p-3 text-center">
                <div className="[font-family:'Roboto',Helvetica] font-bold text-[#fbbf24] text-2xl">
                  {eventCounts.escalated}
                </div>
                <div className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs mt-1">
                  Escalated
                </div>
              </div>
              <div className="bg-[#66dbe133] rounded-lg p-3 text-center">
                <div className="[font-family:'Roboto',Helvetica] font-bold text-[#66dbe1] text-2xl">
                  {eventCounts.contained}
                </div>
                <div className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs mt-1">
                  Contained
                </div>
              </div>
              <div className="bg-[#4ade8033] rounded-lg p-3 text-center">
                <div className="[font-family:'Roboto',Helvetica] font-bold text-[#4ade80] text-2xl">
                  {eventCounts.resolved}
                </div>
                <div className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs mt-1">
                  Resolved
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
