import React from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { AlertTriangle, Info, AlertCircle, Loader2 } from "lucide-react";
import { useRecentAlerts } from "../../../lib/useRecentAlerts";

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

interface RecentAlertsProps {
  searchQuery?: string;
  limit?: number;
}

export const RecentAlerts = ({ searchQuery = "", limit = 10 }: RecentAlertsProps): JSX.Element => {
  const { alerts, loading, error } = useRecentAlerts(limit);

  // Normalize country name variations for search
  const normalizeCountryName = (countryName: string): string[] => {
    const normalized = countryName.toLowerCase();
    const variations: string[] = [normalized];
    
    // Handle multi-word country names by also checking individual words
    const words = normalized.split(/\s+/);
    variations.push(...words.filter(w => w.length > 2)); // Add individual words (skip short ones)
    
    if (normalized.includes('united states') || normalized === 'united states') {
      variations.push('usa', 'us', 'united states of america', 'america', 'united', 'states');
    } else if (normalized.includes('democratic republic') && normalized.includes('congo')) {
      variations.push('drc', 'dr congo', 'congo', 'democratic', 'republic');
    } else if (normalized.includes('united kingdom')) {
      variations.push('uk', 'britain', 'great britain', 'england', 'united', 'kingdom');
    } else if (normalized.includes('russian federation')) {
      variations.push('russia', 'russian', 'federation');
    }
    
    return [...new Set(variations)]; // Remove duplicates
  };

  // Filter alerts based on search query
  const filteredAlerts = React.useMemo(() => {
    if (!searchQuery.trim()) return alerts;
    
    const query = searchQuery.toLowerCase().trim();
    const queryWords = query.split(/\s+/).filter(w => w.length > 0);
    
    return alerts.filter(alert => {
      // Check disease name - match if all words are found
      const diseaseLower = alert.disease.toLowerCase();
      const diseaseMatch = diseaseLower.includes(query) || 
        queryWords.every(word => diseaseLower.includes(word));
      
      // Check location - handle country name variations
      const locationLower = alert.location.toLowerCase();
      const locationVariations = normalizeCountryName(alert.location);
      
      // Check if query matches location directly or through variations
      const locationMatch = 
        locationLower === query || // Exact match
        locationLower.includes(query) || // Contains query
        queryWords.every(word => locationLower.includes(word)) || // All query words found
        locationVariations.some(variation => 
          variation === query || variation.includes(query) || query.includes(variation)
        ) ||
        (alert.countryCode && (
          alert.countryCode.toLowerCase() === query ||
          query === 'us' && alert.countryCode.toLowerCase() === 'us' ||
          query === 'usa' && alert.countryCode.toLowerCase() === 'us'
        ));
      
      // Check description
      const descriptionLower = alert.description.toLowerCase();
      const descriptionMatch = descriptionLower.includes(query) || 
        queryWords.every(word => descriptionLower.includes(word));
      
      return diseaseMatch || locationMatch || descriptionMatch;
    });
  }, [alerts, searchQuery]);

  if (error) {
    return (
      <Card className="bg-[#ffffff14] border-[#eaebf024]">
        <CardContent className="p-6">
          <p className="[font-family:'Roboto',Helvetica] font-medium text-[#f87171] text-sm">
            Error loading alerts: {error}
          </p>
        </CardContent>
      </Card>
    );
  }

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
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-[#66dbe1] animate-spin" />
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm">
              {searchQuery ? `No alerts found for "${searchQuery}"` : "No recent alerts"}
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const config = alertConfig[alert.type];
            return (
              <div
                key={alert.id}
                className={`flex gap-4 p-4 rounded-lg border ${config.bg} ${config.border} hover:opacity-90 transition-opacity cursor-pointer`}
                onClick={() => {
                  if (alert.url) {
                    window.open(alert.url, '_blank');
                  }
                }}
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
          })
        )}
      </CardContent>
    </Card>
  );
};
