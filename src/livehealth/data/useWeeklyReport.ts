import { useEffect, useState } from "react";

export interface WeeklyDisease {
  disease_name: string;
  total_cases: number;
  new_cases: number;
}

export interface DiseaseRecommendation {
  disease_name: string;
  userRecommendations: string[];
  medicalPersonnelRecommendations: string[];
}

export interface WeeklyRecommendations {
  summary?: string;
  userRecommendations?: string[];
  medicalPersonnelRecommendations?: string[];
  diseaseSpecific?: DiseaseRecommendation[];
}

export interface WeeklyReport {
  id: string;
  report_date: string;
  week_start_date: string;
  week_end_date: string;
  generated_at: string;
  diseases: WeeklyDisease[];
  recommendations: WeeklyRecommendations;
}

interface UseWeeklyReportResult {
  reports: WeeklyReport[];
  loading: boolean;
  error: string | null;
}

// Fetches the most-recent N active weekly reports. The dashboard's
// "Weekly Report →" tab opens the latest one with prev/next nav across
// the rest.
export function useWeeklyReports(limit = 8): UseWeeklyReportResult {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase configuration");

        const params = new URLSearchParams();
        params.set("select", "id,report_date,week_start_date,week_end_date,generated_at,diseases,recommendations");
        params.set("is_active", "eq.true");
        params.set("order", "week_start_date.desc");
        params.set("limit", String(limit));

        const res = await fetch(`${supabaseUrl}/rest/v1/weekly_reports?${params.toString()}`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        });
        if (!res.ok) throw new Error(`weekly_reports: ${res.statusText}`);
        const rows: any[] = await res.json();

        const mapped: WeeklyReport[] = rows.map((r) => ({
          id: r.id,
          report_date: r.report_date,
          week_start_date: r.week_start_date,
          week_end_date: r.week_end_date,
          generated_at: r.generated_at,
          diseases: Array.isArray(r.diseases) ? r.diseases : [],
          recommendations: r.recommendations || {},
        }));

        if (!active) return;
        setReports(mapped);
        setError(null);
      } catch (e: any) {
        if (!active) return;
        console.error("useWeeklyReports error:", e);
        setError(e?.message || "Failed to load weekly reports");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [limit]);

  return { reports, loading, error };
}
