import React from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Loader2 } from "lucide-react";
import { useDashboardDiseases } from "../../../lib/useDashboardDiseases";

interface TopDiseasesProps {
  timeRange: string;
  searchQuery?: string;
  countryId?: string | null;
}

const severityConfig = {
  critical: { label: "Critical", bg: "bg-[#f8717133]", text: "text-[#f87171]" },
  high: { label: "High", bg: "bg-[#fbbf2433]", text: "text-[#fbbf24]" },
  medium: { label: "Medium", bg: "bg-[#66dbe133]", text: "text-[#66dbe1]" },
  low: { label: "Low", bg: "bg-[#4ade8033]", text: "text-[#4ade80]" },
};

export const TopDiseases = ({ timeRange, searchQuery = "", countryId }: TopDiseasesProps): JSX.Element => {
  const { diseases, loading, error } = useDashboardDiseases(timeRange, countryId);

  // Filter diseases based on search query
  const filteredDiseases = React.useMemo(() => {
    if (!searchQuery.trim()) return diseases;
    
    const query = searchQuery.toLowerCase().trim();
    return diseases.filter(disease => 
      disease.name.toLowerCase().includes(query)
    );
  }, [diseases, searchQuery]);

  if (error) {
    return (
      <Card className="bg-[#ffffff14] border-[#eaebf024]">
        <CardContent className="p-6">
          <p className="[font-family:'Roboto',Helvetica] font-medium text-[#f87171] text-sm">
            Error loading diseases: {error}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#ffffff14] border-[#eaebf024]">
      <CardHeader className="pb-4">
        <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-lg">
          Top Active Diseases
        </h3>
        <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mt-1">
          Ranked by number of outbreak reports
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[350px]">
            <Loader2 className="w-6 h-6 text-[#66dbe1] animate-spin" />
          </div>
        ) : filteredDiseases.length === 0 ? (
          <div className="flex items-center justify-center h-[350px]">
            <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm">
              {searchQuery ? `No diseases found for "${searchQuery}"` : "No disease data available"}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[350px] overflow-y-auto">
            {filteredDiseases.slice(0, 6).map((disease, index) => (
              <div key={index} className="flex items-center justify-between pb-3 border-b border-[#ffffff1a] last:border-0 last:pb-0">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-2 h-10 rounded-full" style={{ backgroundColor: disease.color }} />
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
                        {(disease.reports || disease.cases).toLocaleString()} reports
                      </span>
                      <span className={`[font-family:'Roboto',Helvetica] font-medium text-xs ${disease.growth.startsWith('+') || disease.growth === 'New' ? 'text-[#f87171]' : 'text-[#4ade80]'}`}>
                        {disease.growth}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
