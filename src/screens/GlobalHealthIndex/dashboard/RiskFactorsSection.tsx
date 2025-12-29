import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHealthStatistics } from "@/lib/useHealthStatistics";
import { diseaseData as seedDiseaseData } from "@/lib/diseaseSeedData";

interface RiskFactorsSectionProps {
  filters?: {
    category?: string;
    country?: string;
    yearRange?: string;
    sex?: string;
    ageGroup?: string;
    searchTerm?: string;
  };
}

export const RiskFactorsSection = ({ filters }: RiskFactorsSectionProps = {}) => {
  // Fetch real health statistics data (includes risk_factors from ai_health_enrichment)
  const { data: healthStats, loading, error } = useHealthStatistics(filters);

  const riskFactorData = useMemo(() => {
    const buildFactorMap = (records: { condition: string; risk_factors: string | null }[]) => {
      const factorMap = new Map<string, { factor: string; diseases: Set<string>; strength: number }>();
      records.forEach(stat => {
        if (stat.risk_factors) {
          const factors = stat.risk_factors
            .split(/[,;]|and|&/)
            .map(f => f.trim())
            .filter(f => f.length > 0);
          factors.forEach(factor => {
            if (!factorMap.has(factor)) {
              factorMap.set(factor, { factor, diseases: new Set(), strength: 0 });
            }
            const entry = factorMap.get(factor)!;
            entry.diseases.add(stat.condition);
            entry.strength = Math.min(entry.diseases.size, 10);
          });
        }
      });
      return Array.from(factorMap.values())
        .map(f => ({
          factor: f.factor,
          strength: f.strength,
          diseases: Array.from(f.diseases)
        }))
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 10);
    };

    // Primary: use fetched data
    const primary = buildFactorMap(healthStats || []);
    if (primary.length > 0) return primary;

    // Fallback: derive from seed dataset with same filters
    const seedFiltered = seedDiseaseData.filter(record => {
      if (filters?.category && filters.category !== "All Categories" && record.category !== filters.category) {
        return false;
      }
      if (
        filters?.country &&
        filters.country !== "Global" &&
        filters.country !== "All Countries" &&
        filters.country !== "All" &&
        record.country !== filters.country
      ) {
        return false;
      }
      if (filters?.yearRange) {
        const parts = filters.yearRange.split("-").map(Number);
        if (parts.length === 2 && !(record.year >= parts[0] && record.year <= parts[1])) return false;
        if (parts.length === 1 && parts[0] && record.year !== parts[0]) return false;
      } else if (filters?.year !== undefined) {
        const yr = Number(filters.year);
        if (Number.isFinite(yr) && record.year !== yr) return false;
      }
      if (filters?.ageGroup && filters.ageGroup !== "All Ages" && record.ageGroup !== filters.ageGroup) {
        return false;
      }
      if (filters?.searchTerm && filters.searchTerm.trim()) {
        const s = filters.searchTerm.toLowerCase().trim();
        if (
          !record.condition.toLowerCase().includes(s) &&
          !record.category.toLowerCase().includes(s) &&
          !record.country.toLowerCase().includes(s)
        ) {
          return false;
        }
      }
      return true;
    });

    const seedMapped = seedFiltered.map(record => ({
      condition: record.condition,
      risk_factors: record.riskFactors.join(", ")
    }));

    return buildFactorMap(seedMapped);
  }, [healthStats, filters]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#ffffff14] border-[#eaebf024]">
          <CardContent className="flex items-center justify-center h-[400px]">
            <p className="text-[#ebebeb]">Loading risk factors data...</p>
          </CardContent>
        </Card>
        <Card className="bg-[#ffffff14] border-[#eaebf024]">
          <CardContent className="flex items-center justify-center h-[400px]">
            <p className="text-[#ebebeb]">Loading risk factors data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#ffffff14] border-[#eaebf024]">
          <CardContent className="flex items-center justify-center h-[400px]">
            <p className="text-red-400">Error loading data: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (riskFactorData.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#ffffff14] border-[#eaebf024]">
          <CardContent className="flex items-center justify-center h-[400px]">
            <p className="text-[#ebebeb]">No risk factors data available. Please run data collection first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Simplified Sankey-style Visualization */}
      {/* <Card className="bg-[#ffffff14] border-[#eaebf024] hover:bg-[#ffffff1a] transition-colors">
        <CardHeader>
          <CardTitle className="[font-family:'Roboto',Helvetica] text-lg font-semibold text-[#ebebeb]">Risk Factor → Disease Connections</CardTitle>
          <p className="[font-family:'Roboto',Helvetica] text-sm text-[#ebebeb99]">
            Major risk factors and their associated diseases
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {riskFactorData.map((factor) => (
              <div key={factor.factor} className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="[font-family:'Roboto',Helvetica] bg-[#66dbe1] text-[#2a4149] px-3 py-2 rounded-lg text-sm font-medium min-w-[140px]">
                    {factor.factor}
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`h-1 bg-[#66dbe1] rounded flex-1`} style={{ width: `${factor.strength * 8}px` }} />
                    <span className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99]">({factor.strength}/10)</span>
                  </div>
                </div>
                <div className="ml-4 flex flex-wrap gap-2">
                  {factor.diseases.map((disease) => (
                    <div
                      key={disease}
                      className="[font-family:'Roboto',Helvetica] bg-[#66dbe133] text-[#66dbe1] px-2 py-1 rounded text-xs border border-[#66dbe150]"
                    >
                      {disease}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card> */}

      {/* Network Graph Simplified */}
      {/* <Card className="bg-[#ffffff14] border-[#eaebf024] hover:bg-[#ffffff1a] transition-colors">
        <CardHeader>
          <CardTitle className="[font-family:'Roboto',Helvetica] text-lg font-semibold text-[#ebebeb]">Shared Risk Factor Network</CardTitle>
          <p className="[font-family:'Roboto',Helvetica] text-sm text-[#ebebeb99]">
            Interconnected health risks and disease patterns
          </p>
        </CardHeader>
        <CardContent>
          <div className="relative h-80 bg-[#ffffff0a] rounded-lg p-4 border border-[#eaebf024]">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="[font-family:'Roboto',Helvetica] bg-[#66dbe1] text-[#2a4149] px-3 py-2 rounded-full text-sm font-medium">
                Cardiovascular
              </div>
            </div>

            {[
              { factor: "Smoking", x: "20%", y: "20%" },
              { factor: "Hypertension", x: "80%", y: "25%" },
              { factor: "Obesity", x: "15%", y: "70%" },
              { factor: "Diabetes", x: "85%", y: "75%" },
              { factor: "Diet", x: "50%", y: "10%" },
              { factor: "Exercise", x: "50%", y: "85%" }
            ].map((item) => (
              <div
                key={item.factor}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: item.x, top: item.y }}
              >
                <div className="[font-family:'Roboto',Helvetica] bg-[#66dbe133] text-[#66dbe1] px-2 py-1 rounded text-xs font-medium border border-[#66dbe150]">
                  {item.factor}
                </div>
                <svg className="absolute top-1/2 left-1/2 w-32 h-32 pointer-events-none">
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="0"
                    stroke="#66dbe1"
                    strokeWidth="1"
                    strokeOpacity="0.3"
                    strokeDasharray="2,2"
                  />
                </svg>
              </div>
            ))}

            {[
              { disease: "Stroke", x: "30%", y: "40%" },
              { disease: "Heart Attack", x: "70%", y: "50%" },
              { disease: "COPD", x: "40%", y: "75%" }
            ].map((item) => (
              <div
                key={item.disease}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: item.x, top: item.y }}
              >
                <div className="[font-family:'Roboto',Helvetica] bg-[#f8717133] text-[#f87171] border border-[#f8717150] px-2 py-1 rounded text-xs">
                  {item.disease}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#66dbe1]"></div>
              <span className="[font-family:'Roboto',Helvetica] text-[#ebebeb]">Disease Categories</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#66dbe133] border border-[#66dbe150]"></div>
              <span className="[font-family:'Roboto',Helvetica] text-[#ebebeb]">Risk Factors</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border border-[#f8717150] bg-[#f8717133]"></div>
              <span className="[font-family:'Roboto',Helvetica] text-[#ebebeb]">Specific Diseases</span>
            </div>
          </div>
        </CardContent>
      </Card> */}
    </div>
  );
};