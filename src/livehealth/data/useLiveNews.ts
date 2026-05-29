import { useEffect, useState } from "react";

export interface LiveNewsArticle {
  id: string;
  ts: number;            // published_at or scraped_at
  src: string;           // news_sources.name
  region: string;        // derived from location_extracted.country → continent bucket
  country: string;
  lang: string;          // language code (en/fr/es/pt/zh/de/…)
  diseases: string[];    // diseases_mentioned array
  title: string;
  body: string;          // summary || translated_content || content (first 600 chars)
  url?: string;
  translated: boolean;   // true when language !== 'en' (UI offers a translation toggle)
}

const REGION_BY_COUNTRY: Record<string, string> = {
  "United States": "N. Am.", USA: "N. Am.", Canada: "N. Am.", Mexico: "N. Am.",
  Brazil: "S. Am.", Argentina: "S. Am.", Chile: "S. Am.", Colombia: "S. Am.",
  Peru: "S. Am.", Venezuela: "S. Am.", Ecuador: "S. Am.",
  "United Kingdom": "Europe", France: "Europe", Germany: "Europe", Spain: "Europe",
  Italy: "Europe", Russia: "Europe", Portugal: "Europe", Netherlands: "Europe",
  Belgium: "Europe", Poland: "Europe", Sweden: "Europe", Greece: "Europe",
  China: "E. Asia", Japan: "E. Asia", "South Korea": "E. Asia", Taiwan: "E. Asia",
  India: "S. Asia", Pakistan: "S. Asia", Bangladesh: "S. Asia",
  Thailand: "SE Asia", Vietnam: "SE Asia", Philippines: "SE Asia", Indonesia: "SE Asia",
  Malaysia: "SE Asia",
  "Democratic Republic of the Congo": "Africa", "DR Congo": "Africa", Nigeria: "Africa",
  Kenya: "Africa", "South Africa": "Africa", Uganda: "Africa", Rwanda: "Africa",
  Sudan: "Africa", Ethiopia: "Africa", Egypt: "EMR", "Saudi Arabia": "EMR", Iran: "EMR",
  Australia: "Oceania", "New Zealand": "Oceania",
};

const regionFor = (country: string | undefined): string => {
  if (!country) return "Global";
  return REGION_BY_COUNTRY[country] || "Global";
};

const summaryFrom = (row: any): string => {
  const candidates = [row.summary, row.translated_content, row.content, row.translated_text, row.original_text];
  for (const c of candidates) {
    if (c && typeof c === "string" && c.trim().length > 0) {
      return c.length > 600 ? c.slice(0, 600).trim() + "…" : c;
    }
  }
  return "";
};

export function useLiveNews(limit = 50): {
  articles: LiveNewsArticle[];
  loading: boolean;
  error: string | null;
} {
  const [articles, setArticles] = useState<LiveNewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let pollId: ReturnType<typeof setInterval> | null = null;

    async function load() {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase configuration");

        const params = new URLSearchParams();
        params.set(
          "select",
          [
            "id",
            "title",
            "summary",
            "content",
            "translated_content",
            "translated_text",
            "original_text",
            "url",
            "language",
            "published_at",
            "scraped_at",
            "diseases_mentioned",
            "location_extracted",
            "news_sources!source_id(name)",
          ].join(",")
        );
        params.set("title", "not.is.null");
        params.set("order", "scraped_at.desc");
        params.set("limit", String(limit));

        const res = await fetch(`${supabaseUrl}/rest/v1/news_articles?${params.toString()}`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        });
        if (!res.ok) throw new Error(`news_articles: ${res.statusText}`);
        const rows: any[] = await res.json();

        const mapped: LiveNewsArticle[] = rows.map((r) => {
          const sourceNode = Array.isArray(r.news_sources) ? r.news_sources[0] : r.news_sources;
          const country = r.location_extracted?.country || "";
          const ts = r.published_at
            ? new Date(r.published_at).getTime()
            : r.scraped_at
            ? new Date(r.scraped_at).getTime()
            : Date.now();
          const diseases = Array.isArray(r.diseases_mentioned) ? r.diseases_mentioned.filter(Boolean) : [];
          const lang = (r.language || "en").toLowerCase();
          return {
            id: r.id,
            ts,
            src: sourceNode?.name || "Unknown",
            region: regionFor(country),
            country,
            lang,
            diseases,
            title: r.title || "",
            body: summaryFrom(r),
            url: r.url || undefined,
            translated: lang !== "en",
          };
        });

        if (!active) return;
        setArticles(mapped);
        setError(null);
      } catch (e: any) {
        if (!active) return;
        console.error("useLiveNews error:", e);
        setError(e?.message || "Failed to load news");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    pollId = setInterval(load, 60_000);
    return () => {
      active = false;
      if (pollId) clearInterval(pollId);
    };
  }, [limit]);

  return { articles, loading, error };
}
