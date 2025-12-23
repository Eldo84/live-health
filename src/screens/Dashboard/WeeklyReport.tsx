import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Loader2, AlertCircle, Sparkles, TrendingUp, Calendar, Activity, CheckCircle2, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { DiseaseRecommendationsDialog } from "../../components/DiseaseRecommendationsDialog";

interface Disease {
  disease_name: string;
  total_cases: number;
  new_cases: number;
}

interface DiseaseSpecificRecommendations {
  disease_name: string;
  userRecommendations: string[];
  medicalPersonnelRecommendations: string[];
}

interface Recommendations {
  userRecommendations: string[];
  medicalPersonnelRecommendations: string[];
  summary: string;
  diseaseSpecific?: DiseaseSpecificRecommendations[];
}

interface WeeklyReportData {
  diseases: Disease[];
  recommendations: Recommendations;
}

export const WeeklyReport = (): JSX.Element => {
  const { t } = useLanguage();
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<WeeklyReportData | null>(null);
  const [showAllDiseases, setShowAllDiseases] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const fetchWeeklyReport = async () => {
      try {
        setLoading(true);
        setError(null);

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        if (!supabaseUrl) {
          throw new Error("Missing Supabase configuration");
        }

        // Get the current session token
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!currentSession) {
          throw new Error("Not authenticated. Please log in to view the weekly report.");
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/generate-weekly-report`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${currentSession.access_token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch weekly report: ${response.statusText}`);
        }

        const data = await response.json();
        setReportData(data);
      } catch (err: any) {
        console.error("Error fetching weekly report:", err);
        setError(err.message || "Failed to load weekly report");
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyReport();
  }, [session]);

  if (!session && !loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="bg-[#ffffff14] border-[#eaebf024]">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-[#f87171]">
              <AlertCircle className="w-5 h-5" />
              <p className="[font-family:'Roboto',Helvetica] font-medium">Please log in to view the weekly report.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center h-[400px] gap-4">
          <Loader2 className="w-10 h-10 text-[#66dbe1] animate-spin" />
          <p className="[font-family:'Roboto',Helvetica] text-[#ebebeb99] text-sm">Loading weekly health report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="bg-[#ffffff14] border-[#eaebf024]">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-[#f87171]">
              <AlertCircle className="w-5 h-5" />
              <p className="[font-family:'Roboto',Helvetica] font-medium">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="bg-[#ffffff14] border-[#eaebf024]">
          <CardContent className="p-6">
            <p className="[font-family:'Roboto',Helvetica] text-[#ebebeb99]">No weekly report data available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { diseases, recommendations } = reportData;

  // Get current week date range
  const getWeekRange = () => {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    return {
      start: lastWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      end: today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
  };

  const weekRange = getWeekRange();

  return (
    <div className="container mx-auto px-4 py-6 lg:py-8 space-y-6 max-w-7xl">
      {/* Header with gradient */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#66dbe1]/20 via-[#2a4149] to-[#1a2a32] border border-[#66dbe1]/20 p-8">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-[#66dbe1]/20 flex items-center justify-center">
              <Activity className="w-6 h-6 text-[#66dbe1]" />
            </div>
            <div>
              <h1 className="[font-family:'Roboto',Helvetica] text-3xl lg:text-4xl font-bold text-[#ffffff]">
                Weekly Health Report
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4 text-[#66dbe1]" />
                <p className="[font-family:'Roboto',Helvetica] text-sm text-[#ebebeb99]">
                  {weekRange.start} - {weekRange.end}
                </p>
              </div>
            </div>
          </div>
          <p className="[font-family:'Roboto',Helvetica] text-[#ebebeb99] text-base mt-2 max-w-2xl">
            Comprehensive analysis of top diseases detected in the past 7 days with AI-generated insights and recommendations
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#66dbe1]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      </div>

      {/* Summary */}
      {recommendations.summary && (
        <Card className="bg-gradient-to-br from-[#ffffff14] to-[#ffffff0a] border-[#66dbe1]/20 hover:border-[#66dbe1]/30 transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#66dbe1]/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#66dbe1]" />
              </div>
              <CardTitle className="[font-family:'Roboto',Helvetica] text-xl font-semibold text-[#66dbe1]">
                Executive Summary
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="[font-family:'Roboto',Helvetica] text-[#ebebeb] leading-relaxed text-base">
              {recommendations.summary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Top 10 Diseases */}
      <Card className="bg-[#ffffff14] border-[#eaebf024] hover:bg-[#ffffff1a] transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#f8717133] flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#f87171]" />
              </div>
              <CardTitle className="[font-family:'Roboto',Helvetica] text-xl font-semibold text-[#66dbe1]">
                Top Diseases This Week
              </CardTitle>
            </div>
            <Badge className="bg-[#66dbe1]/20 text-[#66dbe1] border-[#66dbe1]/30 [font-family:'Roboto',Helvetica]">
              {diseases.length} {diseases.length === 1 ? 'Disease' : 'Diseases'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {diseases.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-[#66dbe1]/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-[#66dbe1]" />
              </div>
              <p className="[font-family:'Roboto',Helvetica] text-[#ebebeb99] text-sm">
                No disease activity recorded in the last 7 days.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {diseases.slice(0, showAllDiseases ? diseases.length : 5).map((disease, displayIndex) => {
                  const originalIndex = displayIndex; // Since we're slicing from the start, index matches
                  const isTopThree = originalIndex < 3;
                  return (
                    <div
                      key={originalIndex}
                      className={`group flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ${
                        isTopThree
                          ? 'bg-gradient-to-r from-[#66dbe1]/10 to-[#66dbe1]/5 border-[#66dbe1]/30 hover:border-[#66dbe1]/50'
                          : 'bg-[#ffffff0d] border-[#eaebf024] hover:border-[#66dbe1]/20 hover:bg-[#ffffff14]'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm flex-shrink-0 ${
                          originalIndex === 0 ? 'bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] text-[#1a1a1a]' :
                          originalIndex === 1 ? 'bg-gradient-to-br from-[#94a3b8] to-[#64748b] text-white' :
                          originalIndex === 2 ? 'bg-gradient-to-br from-[#cd7f32] to-[#a0522d] text-white' :
                          'bg-[#66dbe1]/20 text-[#66dbe1]'
                        }`}>
                          {originalIndex + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`[font-family:'Roboto',Helvetica] font-semibold text-base mb-1 truncate ${
                            isTopThree ? 'text-[#ffffff]' : 'text-[#ebebeb]'
                          }`}>
                            {disease.disease_name}
                          </h3>
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80]"></div>
                              <span className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99]">
                                New: <strong className="text-[#4ade80] font-semibold">{disease.new_cases.toLocaleString()}</strong>
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#66dbe1]"></div>
                              <span className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99]">
                                Total: <strong className="text-[#66dbe1] font-semibold">{disease.total_cases.toLocaleString()}</strong>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDisease(disease.disease_name);
                          setIsDialogOpen(true);
                        }}
                        className="ml-3 px-3 py-1.5 rounded-lg bg-[#66dbe1]/10 hover:bg-[#66dbe1]/20 border border-[#66dbe1]/30 hover:border-[#66dbe1]/50 transition-all duration-200 flex items-center gap-2 group/btn"
                      >
                        <FileText className="w-4 h-4 text-[#66dbe1] group-hover/btn:scale-110 transition-transform" />
                        <span className="[font-family:'Roboto',Helvetica] text-sm font-medium text-[#66dbe1]">
                          Recommendations
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
              {diseases.length > 5 && (
                <button
                  onClick={() => setShowAllDiseases(!showAllDiseases)}
                  className="w-full mt-3 py-2 px-4 rounded-lg border border-[#66dbe1]/30 bg-[#66dbe1]/10 hover:bg-[#66dbe1]/20 transition-colors flex items-center justify-center gap-2 group"
                >
                  <span className="[font-family:'Roboto',Helvetica] text-sm font-medium text-[#66dbe1]">
                    {showAllDiseases ? 'Show Less' : `Show All ${diseases.length} Diseases`}
                  </span>
                  {showAllDiseases ? (
                    <ChevronUp className="w-4 h-4 text-[#66dbe1] group-hover:translate-y-[-2px] transition-transform" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#66dbe1] group-hover:translate-y-[2px] transition-transform" />
                  )}
                </button>
              )}
            </>
          )}
        </CardContent>
      </Card>


      {/* Disease Recommendations Dialog */}
      {selectedDisease && (
        <DiseaseRecommendationsDialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setSelectedDisease(null);
            }
          }}
          diseaseName={selectedDisease}
        />
      )}
    </div>
  );
};

