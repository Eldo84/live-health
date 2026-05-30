import { useEffect, useState } from "react";
import { rangeToIso, type TimeRange } from "../lib/timeRange";

export interface LiveAlert {
  id: string;
  ts: number;
  level: "critical" | "high" | "medium" | "low" | "info";
  region: string;
  country: string;
  text: string;
  src: string; // source name (e.g. "Reuters", "Google News")
  disease: string;
  url?: string;
}

const REGION_BY_COUNTRY: Record<string, string> = {
  // Americas (uses WHO region codes: AMR/EUR/AFR/EMR/SEAR/WPR)
  "United States": "AMR", USA: "AMR", Canada: "AMR", Mexico: "AMR", Brazil: "AMR",
  Argentina: "AMR", Colombia: "AMR", Peru: "AMR", Chile: "AMR", Cuba: "AMR",
  Venezuela: "AMR", Ecuador: "AMR", Bolivia: "AMR", Paraguay: "AMR", Uruguay: "AMR",
  Guyana: "AMR", Suriname: "AMR", "French Guiana": "AMR", Haiti: "AMR",
  "Dominican Republic": "AMR", Jamaica: "AMR", Bahamas: "AMR", Belize: "AMR",
  "El Salvador": "AMR", Guatemala: "AMR", Honduras: "AMR", Nicaragua: "AMR",
  Panama: "AMR", "Puerto Rico": "AMR", "Trinidad and Tobago": "AMR",
  // Europe
  France: "EUR", Germany: "EUR", "United Kingdom": "EUR", Spain: "EUR", Italy: "EUR",
  Poland: "EUR", Russia: "EUR", Sweden: "EUR", Ukraine: "EUR", Portugal: "EUR",
  Netherlands: "EUR", Belgium: "EUR", Greece: "EUR", Austria: "EUR", Norway: "EUR",
  Denmark: "EUR", Finland: "EUR", Switzerland: "EUR", Hungary: "EUR", Romania: "EUR",
  Ireland: "EUR", "Czech Republic": "EUR", Luxembourg: "EUR", Belarus: "EUR",
  Armenia: "EUR", Georgia: "EUR",
  // Western Pacific
  China: "WPR", Japan: "WPR", "South Korea": "WPR", "North Korea": "WPR",
  Vietnam: "WPR", Philippines: "WPR", Indonesia: "WPR", Thailand: "WPR",
  Singapore: "WPR", Malaysia: "WPR", Cambodia: "WPR", Myanmar: "WPR",
  Laos: "WPR", Australia: "WPR", "New Zealand": "WPR", Fiji: "WPR",
  Vanuatu: "WPR", Tonga: "WPR", Guam: "WPR", Taiwan: "WPR", "Hong Kong": "WPR",
  Macau: "WPR", Mongolia: "WPR",
  // South-East Asia (WHO)
  India: "SEAR", Bangladesh: "SEAR", "Sri Lanka": "SEAR", Nepal: "SEAR",
  Maldives: "SEAR",
  // Africa
  Nigeria: "AFR", Kenya: "AFR", "South Africa": "AFR", Ethiopia: "AFR",
  "DR Congo": "AFR", "Democratic Republic of Congo": "AFR",
  "Democratic Republic of the Congo": "AFR", Uganda: "AFR", Rwanda: "AFR",
  Sudan: "AFR", "South Sudan": "AFR", Senegal: "AFR", Ghana: "AFR",
  Tanzania: "AFR", Cameroon: "AFR", Mali: "AFR", Niger: "AFR",
  "Burkina Faso": "AFR", Angola: "AFR", Mozambique: "AFR", Zimbabwe: "AFR",
  Madagascar: "AFR", Burundi: "AFR", "Central African Republic": "AFR",
  Congo: "AFR", Zambia: "AFR", "Cape Verde": "AFR", Seychelles: "AFR",
  Mauritius: "AFR", Mayotte: "AFR", "Saint Helena": "AFR",
  // Eastern Mediterranean (WHO)
  Egypt: "EMR", "Saudi Arabia": "EMR", Iran: "EMR", Iraq: "EMR",
  Pakistan: "EMR", Yemen: "EMR", Syria: "EMR", Lebanon: "EMR",
  Jordan: "EMR", Morocco: "EMR", Tunisia: "EMR", Libya: "EMR",
  Algeria: "EMR", "United Arab Emirates": "EMR", Qatar: "EMR",
  Kuwait: "EMR", Oman: "EMR", Bahrain: "EMR", Afghanistan: "EMR",
  Palestine: "EMR", Israel: "EMR", Turkey: "EMR",
};

const levelFromSeverity = (s: string | null | undefined): LiveAlert["level"] => {
  switch ((s || "").toLowerCase()) {
    case "critical": return "critical";
    case "high":     return "high";
    case "medium":   return "medium";
    case "low":      return "low";
    default:         return "info";
  }
};

const regionCode = (country: string) => REGION_BY_COUNTRY[country] ?? "GLOB";

// Fetches real outbreak signals + their underlying news article + source. This
// gives the alert ticker real headlines and attribution. Polls every 30s.
export function useLiveAlerts(
  limit = 12,
  range: TimeRange = "30d"
): { alerts: LiveAlert[]; loading: boolean; error: string | null } {
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let pollId: ReturnType<typeof setInterval> | null = null;

    async function load() {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) throw new Error("Missing LiveHealth+ database configuration");

        const params = new URLSearchParams();
        params.set(
          "select",
          [
            "id",
            "detected_at",
            "severity_assessment",
            "case_count_mentioned",
            "detected_disease_name",
            "diseases!disease_id(name)",
            "countries!country_id(name,code)",
            "news_articles!article_id(title,url,source_id,news_sources!source_id(name))",
          ].join(",")
        );
        params.set("order", "detected_at.desc");
        params.set("limit", String(limit));
        params.set("detected_at", `gte.${rangeToIso(range)}`);

        const res = await fetch(`${supabaseUrl}/rest/v1/outbreak_signals?${params.toString()}`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        });
        if (!res.ok) throw new Error(`Failed to fetch alerts: ${res.statusText}`);
        const rows: any[] = await res.json();

        const mapped: LiveAlert[] = rows.map((r: any) => {
          const country = Array.isArray(r.countries) ? r.countries[0] : r.countries;
          const disease = Array.isArray(r.diseases) ? r.diseases[0] : r.diseases;
          const article = Array.isArray(r.news_articles) ? r.news_articles[0] : r.news_articles;
          const sourceNode = article?.news_sources
            ? Array.isArray(article.news_sources) ? article.news_sources[0] : article.news_sources
            : null;

          const diseaseName =
            disease?.name && disease.name.toUpperCase() !== "OTHER"
              ? disease.name
              : r.detected_disease_name || disease?.name || "Outbreak";

          // Prefer the real headline; fall back to a synthesized "<disease> in <country>".
          let text = article?.title?.trim();
          if (!text) {
            const cases = r.case_count_mentioned;
            text = cases
              ? `${diseaseName} — ${cases.toLocaleString()} case${cases === 1 ? "" : "s"} reported`
              : `${diseaseName} signal detected`;
            if (country?.name) text += ` in ${country.name}`;
          }

          return {
            id: r.id,
            ts: r.detected_at ? new Date(r.detected_at).getTime() : Date.now(),
            level: levelFromSeverity(r.severity_assessment),
            region: regionCode(country?.name || ""),
            country: country?.name || "Global",
            text,
            src: sourceNode?.name || "—",
            disease: diseaseName,
            url: article?.url,
          };
        });

        if (!active) return;
        setAlerts(mapped);
        setError(null);
      } catch (e: any) {
        if (!active) return;
        console.error("useLiveAlerts error:", e);
        setError(e?.message || "Failed to load alerts");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    pollId = setInterval(load, 30_000);
    return () => {
      active = false;
      if (pollId) clearInterval(pollId);
    };
  }, [limit, range]);

  return { alerts, loading, error };
}
