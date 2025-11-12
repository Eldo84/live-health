import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { TrendingUp, MapPin, AlertTriangle, Loader2, RefreshCw } from "lucide-react";

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

const riskConfig = {
  critical: { bg: "bg-[#f8717133]", text: "text-[#f87171]", label: "Critical" },
  high: { bg: "bg-[#fbbf2433]", text: "text-[#fbbf24]", label: "High Risk" },
  medium: { bg: "bg-[#66dbe133]", text: "text-[#66dbe1]", label: "Medium" },
  low: { bg: "bg-[#4ade8033]", text: "text-[#4ade80]", label: "Low Risk" },
};

export const AIPredictions = (): JSX.Element => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isCached, setIsCached] = useState(false);

  const fetchPredictions = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase configuration");
      }

      const url = `${supabaseUrl}/functions/v1/generate-ai-predictions${forceRefresh ? '?refresh=true' : ''}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch predictions: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error && data.predictions?.length === 0) {
        // API key not configured - show helpful message
        setError("AI predictions are not configured. Please set DEEPSEEK_API_KEY in Edge Function secrets.");
        setPredictions([]);
        setIsCached(false);
      } else if (data.predictions && Array.isArray(data.predictions)) {
        setPredictions(data.predictions);
        setLastUpdated(new Date());
        setIsCached(data.cached === true);
      } else {
        setPredictions([]);
        setIsCached(false);
      }
    } catch (err) {
      console.error("Error fetching AI predictions:", err);
      setError(err instanceof Error ? err.message : "Failed to load predictions");
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, []);

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
              AI-generated predictions updated automatically when new outbreak data is received
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
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#66dbe1] animate-spin mb-4" />
            <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mb-2">
              {isCached ? "Loading predictions..." : "Generating new predictions with DeepSeek..."}
            </p>
            {!isCached && (
              <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb66] text-xs">
                This may take 15-20 seconds. Predictions are usually pre-generated and load instantly.
              </p>
            )}
          </div>
        ) : error ? (
          <div className="p-4 bg-[#f871711a] border border-[#f8717133] rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#f87171] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-sm mb-1">
                  Unable to Load Predictions
                </h4>
                <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb] text-xs leading-relaxed mb-3">
                  {error}
                </p>
                <button
                  onClick={() => fetchPredictions(false)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#66dbe1] hover:bg-[#4eb7bd] text-white rounded-md text-xs font-medium transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : predictions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="w-8 h-8 text-[#ebebeb99] mb-4" />
            <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mb-3">
              No predictions available. This may be due to insufficient outbreak data.
            </p>
            <button
              onClick={() => fetchPredictions(false)}
              className="flex items-center gap-2 px-4 py-2 bg-[#66dbe1] hover:bg-[#4eb7bd] text-white rounded-md text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        ) : (
          <>
            {lastUpdated && (
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#ffffff1a]">
                <div className="flex items-center gap-2">
                  <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </p>
                </div>
                <button
                  onClick={() => fetchPredictions(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#ffffff14] hover:bg-[#ffffff24] border border-[#ffffff1a] rounded-md text-xs font-medium text-[#ebebeb] transition-colors"
                  disabled={loading}
                  title="Force refresh (bypass cache)"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  {isCached ? 'Refresh' : 'Regenerate'}
                </button>
              </div>
            )}
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
                    Model: DeepSeek Chat
                  </span>
                </div>
                <div className="[font-family:'Roboto',Helvetica] font-medium text-[#66dbe1] text-xs">
                  Target: {pred.targetDate}
                </div>
              </div>
            </div>
          );
        })}
          </>
        )}

        <div className="mt-6 p-4 bg-[#66dbe11a] border border-[#66dbe133] rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#66dbe1] mt-0.5" />
            <div>
              <h4 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-sm mb-1">
                About AI Predictions
              </h4>
              <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb] text-xs leading-relaxed">
                Our AI models powered by DeepSeek automatically analyze recent outbreak signals, disease patterns, and geographic data
                to generate predictions about case forecasts, geographic spread, and risk assessments. Predictions are automatically
                regenerated when new outbreak data is collected (every 6 hours) and stored for instant access. This enables proactive
                response and preparedness planning based on the latest data from the past 30 days.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
