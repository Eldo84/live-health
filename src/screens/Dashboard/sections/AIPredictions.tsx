import React from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { TrendingUp, MapPin, AlertTriangle } from "lucide-react";

interface Prediction {
  disease: string;
  location: string;
  type: string;
  prediction: string;
  confidence: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  targetDate: string;
  color: string;
}

const predictions: Prediction[] = [
  {
    disease: "Ebola",
    location: "Democratic Republic of Congo",
    type: "Case Forecast",
    prediction: "580 predicted cases in next 7 days",
    confidence: 87,
    riskLevel: "critical",
    targetDate: "Nov 5, 2024",
    color: "#f87171",
  },
  {
    disease: "Ebola",
    location: "Kinshasa & Goma",
    type: "Geographic Spread",
    prediction: "72% probability of spread to neighboring regions",
    confidence: 82,
    riskLevel: "high",
    targetDate: "Nov 12, 2024",
    color: "#f87171",
  },
  {
    disease: "Malaria",
    location: "Nigeria",
    type: "Risk Assessment",
    prediction: "High risk level (0.78) due to climate and mosquito density",
    confidence: 84,
    riskLevel: "high",
    targetDate: "Nov 28, 2024",
    color: "#fbbf24",
  },
  {
    disease: "COVID-19",
    location: "Brazil",
    type: "Case Forecast",
    prediction: "210 predicted cases with 8% growth rate",
    confidence: 91,
    riskLevel: "medium",
    targetDate: "Nov 5, 2024",
    color: "#66dbe1",
  },
  {
    disease: "Cholera",
    location: "Yemen",
    type: "Geographic Spread",
    prediction: "68% probability of spread to Hodeidah region",
    confidence: 80,
    riskLevel: "high",
    targetDate: "Nov 5, 2024",
    color: "#a78bfa",
  },
];

const riskConfig = {
  critical: { bg: "bg-[#f8717133]", text: "text-[#f87171]", label: "Critical" },
  high: { bg: "bg-[#fbbf2433]", text: "text-[#fbbf24]", label: "High Risk" },
  medium: { bg: "bg-[#66dbe133]", text: "text-[#66dbe1]", label: "Medium" },
  low: { bg: "bg-[#4ade8033]", text: "text-[#4ade80]", label: "Low Risk" },
};

export const AIPredictions = (): JSX.Element => {
  return (
    <Card className="bg-[#ffffff14] border-[#eaebf024]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#66dbe1]" />
              AI-Powered Predictions
            </h3>
            <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mt-1">
              Machine learning forecasts for outbreak patterns and spread
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#66dbe133] px-3 py-2 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-[#66dbe1] animate-pulse" />
            <span className="[font-family:'Roboto',Helvetica] font-medium text-[#66dbe1] text-xs">
              Models Active
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {predictions.map((pred, index) => {
          const config = riskConfig[pred.riskLevel];
          return (
            <div
              key={index}
              className={`p-4 rounded-lg border ${config.bg} border-[#ffffff1a] hover:bg-opacity-60 transition-all cursor-pointer`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pred.color }} />
                    <span className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-sm">
                      {pred.disease}
                    </span>
                    <Badge className={`${config.bg} ${config.text} border-0 text-xs`}>
                      {config.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-[#ebebeb99]" />
                    <span className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs">
                      {pred.location}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="[font-family:'Roboto',Helvetica] font-semibold text-[#66dbe1] text-lg">
                    {pred.confidence}%
                  </div>
                  <div className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs">
                    Confidence
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <div className="[font-family:'Roboto',Helvetica] font-medium text-[#ebebeb] text-xs mb-1">
                  {pred.type}
                </div>
                <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ffffff] text-sm">
                  {pred.prediction}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#ffffff1a]">
                <div className="flex items-center gap-2">
                  <span className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs">
                    Model: LSTM-v2.1 / GeoSpatial-v1.5
                  </span>
                </div>
                <div className="[font-family:'Roboto',Helvetica] font-medium text-[#66dbe1] text-xs">
                  Target: {pred.targetDate}
                </div>
              </div>
            </div>
          );
        })}

        <div className="mt-6 p-4 bg-[#66dbe11a] border border-[#66dbe133] rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#66dbe1] mt-0.5" />
            <div>
              <h4 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-sm mb-1">
                About AI Predictions
              </h4>
              <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb] text-xs leading-relaxed">
                Our AI models analyze structured and unstructured data from news sources, health reports,
                and historical outbreak patterns to forecast geographic spread, risk levels, and potential impact.
                These predictions enable proactive response and preparedness planning.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
