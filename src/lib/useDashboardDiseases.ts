import { useEffect, useState } from "react";

export interface DiseaseStats {
  name: string;
  cases: number;
  growth: string;
  severity: "critical" | "high" | "medium" | "low";
  color: string;
}

export function useDashboardDiseases(timeRange: string) {
  const [diseases, setDiseases] = useState<DiseaseStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchDiseases() {
      try {
        setLoading(true);
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          throw new Error("Missing Supabase configuration");
        }

        // Calculate date range
        const now = new Date();
        const timeRanges: Record<string, number> = {
          "24h": 1,
          "7d": 7,
          "30d": 30,
          "1y": 365,
        };

        const days = timeRanges[timeRange] || 7;
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - days);
        const previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - days);
        const previousEndDate = new Date(startDate);

        // Fetch current period signals grouped by disease
        const currentParams = new URLSearchParams();
        currentParams.set('select', 'disease_id,case_count_mentioned,diseases!disease_id(name,severity_level,color_code)');
        currentParams.set('detected_at', `gte.${startDate.toISOString()}`);
        
        const currentUrl = `${supabaseUrl}/rest/v1/outbreak_signals?${currentParams.toString()}`;
        const currentResponse = await fetch(currentUrl, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });

        if (!currentResponse.ok) {
          throw new Error(`Failed to fetch diseases: ${currentResponse.statusText}`);
        }

        const currentData: any[] = await currentResponse.json();

        // Fetch previous period for comparison (fetch wider range and filter client-side)
        const previousParams = new URLSearchParams();
        previousParams.set('select', 'disease_id,case_count_mentioned,detected_at');
        previousParams.set('detected_at', `gte.${previousStartDate.toISOString()}`);
        
        const previousUrl = `${supabaseUrl}/rest/v1/outbreak_signals?${previousParams.toString()}`;
        const previousResponse = await fetch(previousUrl, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });

        const previousDataRaw: any[] = previousResponse.ok ? await previousResponse.json() : [];
        // Filter to previous period only
        const previousData = previousDataRaw.filter((s: any) => {
          const detectedAt = new Date(s.detected_at);
          return detectedAt >= previousStartDate && detectedAt < previousEndDate;
        });

        // Group by disease and calculate stats
        const diseaseMap = new Map<string, { current: number; previous: number; disease: any }>();

        currentData.forEach((signal: any) => {
          const disease = Array.isArray(signal.diseases) ? signal.diseases[0] : signal.diseases;
          if (!disease || !signal.disease_id || !disease.name) return;
          
          const diseaseId = signal.disease_id;
          const cases = signal.case_count_mentioned || 0;
          
          if (!diseaseMap.has(diseaseId)) {
            diseaseMap.set(diseaseId, {
              current: 0,
              previous: 0,
              disease: disease,
            });
          }
          
          const entry = diseaseMap.get(diseaseId)!;
          entry.current += cases;
        });

        previousData.forEach((signal: any) => {
          const diseaseId = signal.disease_id;
          if (!diseaseMap.has(diseaseId)) return;
          
          const cases = signal.case_count_mentioned || 0;
          const entry = diseaseMap.get(diseaseId)!;
          entry.previous += cases;
        });

        // Convert to array and calculate growth
        const diseaseStats: DiseaseStats[] = Array.from(diseaseMap.entries())
          .map(([diseaseId, data]) => {
            const growth = data.previous > 0
              ? `${((data.current - data.previous) / data.previous * 100).toFixed(1)}%`
              : data.current > 0 ? "+100%" : "0%";

            const severityMap: Record<string, "critical" | "high" | "medium" | "low"> = {
              critical: "critical",
              high: "high",
              medium: "medium",
              low: "low",
            };

            return {
              name: data.disease.name || "Unknown",
              cases: data.current || 0,
              growth: data.current >= data.previous ? `+${growth}` : growth,
              severity: severityMap[data.disease.severity_level] || "medium",
              color: data.disease.color_code || "#66dbe1",
            };
          })
          .sort((a, b) => b.cases - a.cases)
          .slice(0, 10); // Top 10

        if (!active) return;

        setDiseases(diseaseStats);
        setError(null);
      } catch (err: any) {
        if (!active) return;
        console.error("Error fetching diseases:", err);
        setError(err.message || "Failed to load diseases");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchDiseases();

    return () => {
      active = false;
    };
  }, [timeRange]);

  return { diseases, loading, error };
}

