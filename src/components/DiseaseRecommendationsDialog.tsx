import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "./ui/dialog";
import { Loader2, Users, Stethoscope, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface DiseaseRecommendation {
  disease_name: string;
  user_recommendations: string[];
  medical_personnel_recommendations: string[];
  summary: string;
  generated_at: string;
  updated_at: string;
}

interface DiseaseRecommendationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diseaseName: string;
}

export const DiseaseRecommendationsDialog: React.FC<DiseaseRecommendationsDialogProps> = ({
  open,
  onOpenChange,
  diseaseName,
}) => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<DiseaseRecommendation | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const fetchRecommendations = async (forceRegenerate = false) => {
    if (!session || !diseaseName) return;

    try {
      if (forceRegenerate) {
        setRegenerating(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error("Missing Supabase configuration");
      }

      // First try to get from database
      if (!forceRegenerate) {
        const { data: stored, error: fetchError } = await supabase
          .from("disease_recommendations")
          .select("*")
          .eq("disease_name", diseaseName)
          .eq("is_active", true)
          .single();

        if (!fetchError && stored) {
          setRecommendations(stored);
          if (forceRegenerate) setRegenerating(false);
          else setLoading(false);
          return;
        }
      }

      // If not found or force regenerate, call the generation function
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-disease-recommendations`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          disease_name: diseaseName,
          force_regenerate: forceRegenerate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch recommendations: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success && data.data) {
        setRecommendations(data.data);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err: any) {
      console.error("Error fetching recommendations:", err);
      setError(err.message || "Failed to load recommendations");
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  useEffect(() => {
    if (open && diseaseName) {
      fetchRecommendations();
    }
  }, [open, diseaseName, session]);

  const handleRegenerate = () => {
    fetchRecommendations(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0 pb-4 border-b border-[#eaebf024]">
          <div className="flex items-center justify-between">
            <DialogTitle className="[font-family:'Roboto',Helvetica] text-2xl font-bold text-[#66dbe1]">
              Recommendations for {diseaseName}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="p-2 rounded-lg bg-[#66dbe1]/10 hover:bg-[#66dbe1]/20 transition-colors disabled:opacity-50"
                title="Regenerate recommendations"
              >
                <RefreshCw
                  className={`w-4 h-4 text-[#66dbe1] ${regenerating ? "animate-spin" : ""}`}
                />
              </button>
              <DialogClose />
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-10 h-10 text-[#66dbe1] animate-spin" />
              <p className="[font-family:'Roboto',Helvetica] text-[#ebebeb99] text-sm">
                Loading recommendations...
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-[#f87171]/10 border border-[#f87171]/20">
              <AlertCircle className="w-5 h-5 text-[#f87171] flex-shrink-0" />
              <div className="flex-1">
                <p className="[font-family:'Roboto',Helvetica] font-medium text-[#f87171] mb-1">
                  Error loading recommendations
                </p>
                <p className="[font-family:'Roboto',Helvetica] text-sm text-[#ebebeb99]">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && recommendations && (
            <>
              {/* Summary */}
              {recommendations.summary && (
                <div className="p-4 rounded-lg bg-gradient-to-br from-[#66dbe1]/10 to-[#66dbe1]/5 border border-[#66dbe1]/20">
                  <p className="[font-family:'Roboto',Helvetica] text-[#ebebeb] leading-relaxed">
                    {recommendations.summary}
                  </p>
                </div>
              )}

              {/* Recommendations Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* User Recommendations */}
                {recommendations.user_recommendations && recommendations.user_recommendations.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 pb-2 border-b border-[#4285F4]/20">
                      <div className="w-10 h-10 rounded-lg bg-[#4285F4]/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-[#4285F4]" />
                      </div>
                      <h3 className="[font-family:'Roboto',Helvetica] text-lg font-semibold text-[#4285F4]">
                        For the General Public
                      </h3>
                    </div>
                    <ul className="space-y-3">
                      {recommendations.user_recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-lg bg-[#4285F4]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="[font-family:'Roboto',Helvetica] text-[#4285F4] text-xs font-bold">
                              {index + 1}
                            </span>
                          </div>
                          <p className="[font-family:'Roboto',Helvetica] text-[#ebebeb] leading-relaxed flex-1">
                            {rec}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Medical Personnel Recommendations */}
                {recommendations.medical_personnel_recommendations &&
                  recommendations.medical_personnel_recommendations.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 pb-2 border-b border-[#9333ea]/20">
                        <div className="w-10 h-10 rounded-lg bg-[#9333ea]/20 flex items-center justify-center">
                          <Stethoscope className="w-5 h-5 text-[#9333ea]" />
                        </div>
                        <h3 className="[font-family:'Roboto',Helvetica] text-lg font-semibold text-[#9333ea]">
                          For Medical Personnel
                        </h3>
                      </div>
                      <ul className="space-y-3">
                        {recommendations.medical_personnel_recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-lg bg-[#9333ea]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="[font-family:'Roboto',Helvetica] text-[#9333ea] text-xs font-bold">
                                {index + 1}
                              </span>
                            </div>
                            <p className="[font-family:'Roboto',Helvetica] text-[#ebebeb] leading-relaxed flex-1">
                              {rec}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>

              {/* Metadata */}
              {recommendations.generated_at && (
                <div className="pt-4 border-t border-[#eaebf024]">
                  <p className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99]">
                    Generated: {new Date(recommendations.generated_at).toLocaleString()}
                    {recommendations.updated_at !== recommendations.generated_at && (
                      <span className="ml-2">
                        • Updated: {new Date(recommendations.updated_at).toLocaleString()}
                      </span>
                    )}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};










































