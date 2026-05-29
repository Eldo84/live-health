import { useEffect, useState } from "react";
import { rangeToIso, type TimeRange } from "../lib/timeRange";

export interface LiveOutbreak {
  id: string;
  city: string;       // best-effort: outbreak_signals.city → country.name → "Unknown"
  country: string;
  iso?: string;
  lng: number;
  lat: number;
  disease: string;
  diseaseType: "human" | "zoonotic" | "veterinary" | "unknown";
  diseaseColor: string;
  diseaseId: string | null;
  severity: number; // 1..5
  severityLabel: "low" | "medium" | "high" | "critical";
  cases: number;       // case_count_mentioned (0 when null)
  deaths: number;      // mortality_count_mentioned (0 when null)
  confidence: number;  // 0..1
  isNew: boolean;      // is_new_outbreak
  updated: number;
  source: string;     // news_sources.name
  title: string;      // news_articles.title (real headline)
  url?: string;
}

export interface LiveOutbreaksResult {
  outbreaks: LiveOutbreak[];
  loading: boolean;
  error: string | null;
}

const severityFromAssessment = (a: string | null | undefined): number => {
  switch ((a || "").toLowerCase()) {
    case "critical": return 5;
    case "high":     return 4;
    case "medium":   return 3;
    case "moderate": return 3;
    case "low":      return 2;
    default:         return 1;
  }
};

const severityToLabel = (n: number): LiveOutbreak["severityLabel"] => {
  if (n >= 5) return "critical";
  if (n >= 4) return "high";
  if (n >= 3) return "medium";
  return "low";
};

export function useLiveOutbreaks(
  range: TimeRange = "30d",
  limit: number = 600
): LiveOutbreaksResult {
  const [outbreaks, setOutbreaks] = useState<LiveOutbreak[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchData() {
      try {
        setLoading(true);
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase configuration");

        const params = new URLSearchParams();
        params.set(
          "select",
          [
            "id",
            "detected_at",
            "severity_assessment",
            "case_count_mentioned",
            "mortality_count_mentioned",
            "confidence_score",
            "is_new_outbreak",
            "latitude",
            "longitude",
            "city",
            "detected_disease_name",
            "disease_id",
            "diseases!disease_id(id,name,color_code,disease_type,severity_level)",
            "countries!country_id(name,code)",
            "news_articles!article_id(title,url,source_id,news_sources!source_id(name))",
          ].join(",")
        );
        params.set("order", "detected_at.desc");
        params.set("limit", String(limit));
        params.set("latitude", "not.is.null");
        params.set("longitude", "not.is.null");
        params.set("detected_at", `gte.${rangeToIso(range)}`);

        const url = `${supabaseUrl}/rest/v1/outbreak_signals?${params.toString()}`;
        const response = await fetch(url, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        });
        if (!response.ok) throw new Error(`Failed to fetch outbreak signals: ${response.statusText}`);

        const rows: any[] = await response.json();
        const mapped: LiveOutbreak[] = rows
          .map((r: any): LiveOutbreak | null => {
            const country = Array.isArray(r.countries) ? r.countries[0] : r.countries;
            const disease = Array.isArray(r.diseases) ? r.diseases[0] : r.diseases;
            const article = Array.isArray(r.news_articles) ? r.news_articles[0] : r.news_articles;
            const sourceNode = article?.news_sources
              ? Array.isArray(article.news_sources) ? article.news_sources[0] : article.news_sources
              : null;

            const lat = parseFloat(r.latitude);
            const lng = parseFloat(r.longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

            const rawDiseaseName = disease?.name;
            const diseaseName =
              rawDiseaseName && rawDiseaseName.toUpperCase() !== "OTHER"
                ? rawDiseaseName
                : r.detected_disease_name || rawDiseaseName || "Unknown signal";

            const severity = severityFromAssessment(r.severity_assessment);
            const cases = r.case_count_mentioned ?? 0;
            const deaths = r.mortality_count_mentioned ?? 0;
            const city = (r.city && String(r.city).trim()) || country?.name || "—";

            const dt = (disease?.disease_type || "").toLowerCase();
            const diseaseType: LiveOutbreak["diseaseType"] =
              dt === "human" || dt === "zoonotic" || dt === "veterinary" ? dt : "unknown";

            return {
              id: r.id,
              city,
              country: country?.name || "Unknown",
              iso: country?.code || "",
              lat,
              lng,
              disease: diseaseName,
              diseaseType,
              diseaseColor: disease?.color_code || "#66dbe1",
              diseaseId: r.disease_id || disease?.id || null,
              severity,
              severityLabel: severityToLabel(severity),
              cases,
              deaths,
              confidence: r.confidence_score != null ? Number(r.confidence_score) : 0.5,
              isNew: !!r.is_new_outbreak,
              updated: r.detected_at ? new Date(r.detected_at).getTime() : Date.now(),
              source: sourceNode?.name || "—",
              title: article?.title || "",
              url: article?.url || undefined,
            };
          })
          .filter((x: LiveOutbreak | null): x is LiveOutbreak => x !== null);

        if (!active) return;
        setOutbreaks(mapped);
        setError(null);
      } catch (e: any) {
        if (!active) return;
        console.error("useLiveOutbreaks error:", e);
        setError(e?.message || "Failed to load outbreak signals");
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchData();
    return () => {
      active = false;
    };
  }, [range, limit]);

  return { outbreaks, loading, error };
}
