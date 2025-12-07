import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { geographicData } from "@/lib/mockData";

export const GeographicSection = () => {
  const maxPrevalence = Math.max(...geographicData.map(d => d.prevalence));

  const getIntensity = (value: number) => {
    return (value / maxPrevalence) * 100;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* World Map Placeholder */}
      <Card className="chart-container">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Global Disease Prevalence</CardTitle>
          <p className="text-sm text-muted-foreground">
            Country-level disease burden visualization
          </p>
        </CardHeader>
        <CardContent>
          <div className="relative h-80 bg-gradient-to-b from-card-subtle to-muted/30 rounded-lg overflow-hidden">
            {/* Simplified world map representation */}
            <div className="absolute inset-0 p-4">
              <div className="grid grid-cols-3 gap-2 h-full">
                {geographicData.slice(0, 9).map((country, index) => (
                  <div
                    key={country.country}
                    className="rounded p-3 text-center transition-all hover:scale-105 cursor-pointer"
                    style={{
                      backgroundColor: `hsl(195, 85%, ${90 - getIntensity(country.prevalence) * 0.4}%)`,
                      color: getIntensity(country.prevalence) > 50 ? 'white' : 'hsl(var(--foreground))'
                    }}
                    title={`${country.country}: ${country.prevalence} cases per 100k`}
                  >
                    <div className="text-xs font-medium mb-1">{country.country}</div>
                    <div className="text-xs">{country.prevalence}</div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm p-2 rounded">
              <div className="flex items-center gap-2 text-xs">
                <span>Low</span>
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
                <span>High</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional Comparison */}
      <Card className="chart-container">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Regional Health Metrics</CardTitle>
          <p className="text-sm text-muted-foreground">
            Comparative analysis across countries
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {geographicData.map((country, index) => (
              <div key={country.country} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{country.country}</span>
                  <span className="text-xs text-muted-foreground">
                    {country.prevalence} per 100k
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-chart-1/20 p-2 rounded text-center">
                    <div className="font-medium text-chart-1">Incidence</div>
                    <div>{country.incidence}</div>
                  </div>
                  <div className="bg-chart-4/20 p-2 rounded text-center">
                    <div className="font-medium text-chart-4">Mortality</div>
                    <div>{country.mortality}</div>
                  </div>
                  <div className="bg-chart-3/20 p-2 rounded text-center">
                    <div className="font-medium text-chart-3">DALYs</div>
                    <div>{country.dalys}</div>
                  </div>
                </div>
                
                {/* Progress bar for relative comparison */}
                <div className="w-full bg-muted h-1 rounded overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
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