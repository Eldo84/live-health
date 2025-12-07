import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { riskFactorData } from "@/lib/mockData";

export const RiskFactorsSection = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Simplified Sankey-style Visualization */}
      <Card className="chart-container">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Risk Factor → Disease Connections</CardTitle>
          <p className="text-sm text-muted-foreground">
            Major risk factors and their associated diseases
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {riskFactorData.map((factor, index) => (
              <div key={factor.factor} className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium min-w-[140px]">
                    {factor.factor}
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`h-1 bg-primary rounded flex-1`} style={{ width: `${factor.strength * 8}px` }} />
                    <span className="text-xs text-muted-foreground">({factor.strength}/10)</span>
                  </div>
                </div>
                <div className="ml-4 flex flex-wrap gap-2">
                  {factor.diseases.map((disease, diseaseIndex) => (
                    <div
                      key={disease}
                      className="bg-accent/20 text-accent-foreground px-2 py-1 rounded text-xs border border-accent/30"
                    >
                      {disease}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Network Graph Simplified */}
      <Card className="chart-container">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Shared Risk Factor Network</CardTitle>
          <p className="text-sm text-muted-foreground">
            Interconnected health risks and disease patterns
          </p>
        </CardHeader>
        <CardContent>
          <div className="relative h-80 bg-card-subtle rounded-lg p-4">
            {/* Central nodes */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="bg-primary text-primary-foreground px-3 py-2 rounded-full text-sm font-medium">
                Cardiovascular
              </div>
            </div>

            {/* Risk factor nodes positioned around the center */}
            {[
              { factor: "Smoking", x: "20%", y: "20%" },
              { factor: "Hypertension", x: "80%", y: "25%" },
              { factor: "Obesity", x: "15%", y: "70%" },
              { factor: "Diabetes", x: "85%", y: "75%" },
              { factor: "Diet", x: "50%", y: "10%" },
              { factor: "Exercise", x: "50%", y: "85%" }
            ].map((item, index) => (
              <div
                key={item.factor}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: item.x, top: item.y }}
              >
                <div className="bg-accent text-accent-foreground px-2 py-1 rounded text-xs font-medium">
                  {item.factor}
                </div>
                {/* Connection lines */}
                <svg className="absolute top-1/2 left-1/2 w-32 h-32 pointer-events-none">
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="0"
                    stroke="hsl(var(--primary))"
                    strokeWidth="1"
                    strokeOpacity="0.3"
                    strokeDasharray="2,2"
                  />
                </svg>
              </div>
            ))}

            {/* Disease outcome nodes */}
            {[
              { disease: "Stroke", x: "30%", y: "40%" },
              { disease: "Heart Attack", x: "70%", y: "50%" },
              { disease: "COPD", x: "40%", y: "75%" }
            ].map((item, index) => (
              <div
                key={item.disease}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: item.x, top: item.y }}
              >
                <div className="bg-destructive/20 text-destructive border border-destructive/30 px-2 py-1 rounded text-xs">
                  {item.disease}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span>Disease Categories</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent"></div>
              <span>Risk Factors</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border border-destructive/30 bg-destructive/20"></div>
              <span>Specific Diseases</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};