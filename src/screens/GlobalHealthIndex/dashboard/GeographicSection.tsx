import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHealthStatistics } from "@/lib/useHealthStatistics";

interface GeographicSectionProps {
  filters?: {
    category?: string;
    country?: string;
    yearRange?: string;
    sex?: string;
    ageGroup?: string;
    searchTerm?: string;
  };
}

export const GeographicSection = ({ filters = {} }: GeographicSectionProps) => {
  // Fetch real health statistics data
  const { data: healthStats, loading, error } = useHealthStatistics(filters);

  // Map country codes to country names
  const countryCodeMap: Record<string, string> = {
    "US": "United States",
    "GB": "United Kingdom",
    "CA": "Canada",
    "AU": "Australia",
    "DE": "Germany",
    "CN": "China",
    "IN": "India",
    "FR": "France",
    "JP": "Japan",
    "BR": "Brazil",
    "NG": "Nigeria",
    "KE": "Kenya",
    "ZA": "South Africa",
    "RU": "Russia",
    "ID": "Indonesia",
    "MX": "Mexico",
  };

  // Transform data for geographic visualization (aggregate by country)
  const geographicData = useMemo(() => {
    if (!healthStats || healthStats.length === 0) return [];
    
    const countryMap = new Map<string, {
      country: string;
      prevalence: number;
      incidence: number;
      mortality: number;
      dalys: number;
      count: number;
    }>();
    
    healthStats.forEach(stat => {
      const countryName = countryCodeMap[stat.country_code] || stat.country_code;
      const existing = countryMap.get(stat.country_code);
      
      if (existing) {
        existing.prevalence += stat.prevalence_per_100k || 0;
        existing.incidence += stat.incidence_per_100k || 0;
        existing.mortality += stat.mortality_rate || 0;
        existing.dalys += stat.dalys_per_100k || 0;
        existing.count += 1;
      } else {
        countryMap.set(stat.country_code, {
          country: countryName,
          prevalence: stat.prevalence_per_100k || 0,
          incidence: stat.incidence_per_100k || 0,
          mortality: stat.mortality_rate || 0,
          dalys: stat.dalys_per_100k || 0,
          count: 1
        });
      }
    });
    
    // Average if multiple records per country
    return Array.from(countryMap.values()).map(d => ({
      country: d.country,
      prevalence: d.count > 1 ? Math.round(d.prevalence / d.count) : Math.round(d.prevalence),
      incidence: d.count > 1 ? Math.round(d.incidence / d.count) : Math.round(d.incidence),
      mortality: d.count > 1 ? Math.round(d.mortality / d.count) : Math.round(d.mortality),
      dalys: d.count > 1 ? Math.round(d.dalys / d.count) : Math.round(d.dalys)
    })).sort((a, b) => b.prevalence - a.prevalence);
  }, [healthStats]);

  // Filter geographic data based on country
  const filteredGeographicData = useMemo(() => {
    let filtered = [...geographicData];
    
    // Filter by country
    if (filters.country && filters.country !== "Global") {
      filtered = filtered.filter(d => d.country === filters.country);
    }
    
    return filtered;
  }, [geographicData, filters.country]);

  const maxPrevalence = useMemo(() => {
    return Math.max(...filteredGeographicData.map(d => d.prevalence), 1);
  }, [filteredGeographicData]);

  const getIntensity = (value: number) => {
    return (value / maxPrevalence) * 100;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#ffffff14] border-[#eaebf024]">
          <CardContent className="flex items-center justify-center h-[400px]">
            <p className="text-[#ebebeb]">Loading geographic data...</p>
          </CardContent>
        </Card>
        <Card className="bg-[#ffffff14] border-[#eaebf024]">
          <CardContent className="flex items-center justify-center h-[400px]">
            <p className="text-[#ebebeb]">Loading geographic data...</p>
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

  if (filteredGeographicData.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#ffffff14] border-[#eaebf024]">
          <CardContent className="flex items-center justify-center h-[400px]">
            <p className="text-[#ebebeb]">No geographic data available. Please run data collection first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* World Map Placeholder */}
      <Card className="bg-[#ffffff14] border-[#eaebf024] hover:bg-[#ffffff1a] transition-colors">
        <CardHeader>
          <CardTitle className="[font-family:'Roboto',Helvetica] text-lg font-semibold text-[#ebebeb]">
            {filters.country && filters.country !== "Global" ? `${filters.country} Disease Prevalence` : "Global Disease Prevalence"}
          </CardTitle>
          <p className="[font-family:'Roboto',Helvetica] text-sm text-[#ebebeb99]">
            {filters.country && filters.country !== "Global" 
              ? `Showing data for ${filters.country} only`
              : "Country-level disease burden visualization"}
          </p>
        </CardHeader>
        <CardContent>
          <div className="relative h-80 bg-gradient-to-b from-[#ffffff0a] to-[#ffffff05] rounded-lg overflow-hidden border border-[#eaebf024]">
            {/* Simplified world map representation */}
            <div className="absolute inset-0 p-4">
              <div className="grid grid-cols-3 gap-2 h-full">
                {filteredGeographicData.slice(0, 9).map((country) => (
                  <div
                    key={country.country}
                    className="rounded p-3 text-center transition-all hover:scale-105 cursor-pointer"
                    style={{
                      backgroundColor: `hsl(195, 85%, ${90 - getIntensity(country.prevalence) * 0.4}%)`,
                      color: getIntensity(country.prevalence) > 50 ? 'white' : '#ebebeb'
                    }}
                    title={`${country.country}: ${country.prevalence} cases per 100k`}
                  >
                    <div className="[font-family:'Roboto',Helvetica] text-xs font-medium mb-1">{country.country}</div>
                    <div className="[font-family:'Roboto',Helvetica] text-xs">{country.prevalence}</div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-[#ffffff14] backdrop-blur-sm p-2 rounded border border-[#eaebf024]">
              <div className="flex items-center gap-2 text-xs">
                <span className="[font-family:'Roboto',Helvetica] text-[#ebebeb]">Low</span>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map(intensity => (
                    <div
                      key={intensity}
                      className="w-3 h-3 rounded"
                      style={{
                        backgroundColor: `hsl(195, 85%, ${90 - intensity * 10}%)`
                      }}
                    />
                  ))}
                </div>
                <span className="[font-family:'Roboto',Helvetica] text-[#ebebeb]">High</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional Comparison */}
      <Card className="bg-[#ffffff14] border-[#eaebf024] hover:bg-[#ffffff1a] transition-colors">
        <CardHeader>
          <CardTitle className="[font-family:'Roboto',Helvetica] text-lg font-semibold text-[#ebebeb]">Regional Health Metrics</CardTitle>
          <p className="[font-family:'Roboto',Helvetica] text-sm text-[#ebebeb99]">
            {filters.country && filters.country !== "Global"
              ? `Showing data for ${filters.country}`
              : "Comparative analysis across countries"}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredGeographicData.map((country) => (
              <div key={country.country} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="[font-family:'Roboto',Helvetica] text-sm font-medium text-[#ebebeb]">{country.country}</span>
                  <span className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99]">
                    {country.prevalence} per 100k
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-[#66dbe133] p-2 rounded text-center border border-[#66dbe150]">
                    <div className="[font-family:'Roboto',Helvetica] font-medium text-[#66dbe1]">Incidence</div>
                    <div className="[font-family:'Roboto',Helvetica] text-[#ebebeb]">{country.incidence}</div>
                  </div>
                  <div className="bg-[#f8717133] p-2 rounded text-center border border-[#f8717150]">
                    <div className="[font-family:'Roboto',Helvetica] font-medium text-[#f87171]">Mortality</div>
                    <div className="[font-family:'Roboto',Helvetica] text-[#ebebeb]">{country.mortality}</div>
                  </div>
                  <div className="bg-[#fbbf2433] p-2 rounded text-center border border-[#fbbf2450]">
                    <div className="[font-family:'Roboto',Helvetica] font-medium text-[#fbbf24]">DALYs</div>
                    <div className="[font-family:'Roboto',Helvetica] text-[#ebebeb]">{country.dalys}</div>
                  </div>
                </div>
                
                {/* Progress bar for relative comparison */}
                <div className="w-full bg-[#ffffff0a] h-1 rounded overflow-hidden">
                  <div
                    className="h-full bg-[#66dbe1] transition-all duration-300"
                    style={{ width: `${getIntensity(country.prevalence)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};