import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { riskFactorData } from "@/lib/mockData";

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
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Simplified Sankey-style Visualization */}
      <Card className="bg-[#ffffff14] border-[#eaebf024] hover:bg-[#ffffff1a] transition-colors">
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
      </Card>

      {/* Network Graph Simplified */}
      <Card className="bg-[#ffffff14] border-[#eaebf024] hover:bg-[#ffffff1a] transition-colors">
        <CardHeader>
          <CardTitle className="[font-family:'Roboto',Helvetica] text-lg font-semibold text-[#ebebeb]">Shared Risk Factor Network</CardTitle>
          <p className="[font-family:'Roboto',Helvetica] text-sm text-[#ebebeb99]">
            Interconnected health risks and disease patterns
          </p>
        </CardHeader>
        <CardContent>
          <div className="relative h-80 bg-[#ffffff0a] rounded-lg p-4 border border-[#eaebf024]">
            {/* Central nodes */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="[font-family:'Roboto',Helvetica] bg-[#66dbe1] text-[#2a4149] px-3 py-2 rounded-full text-sm font-medium">
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
            ].map((item) => (
              <div
                key={item.factor}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: item.x, top: item.y }}
              >
                <div className="[font-family:'Roboto',Helvetica] bg-[#66dbe133] text-[#66dbe1] px-2 py-1 rounded text-xs font-medium border border-[#66dbe150]">
                  {item.factor}
                </div>
                {/* Connection lines */}
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

            {/* Disease outcome nodes */}
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
      </Card>
    </div>
  );
};