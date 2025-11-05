import { useEffect, useState } from "react";

export interface RecentAlert {
  id: string;
  type: "critical" | "warning" | "info";
  disease: string;
  location: string;
  countryCode?: string;
  description: string;
  time: string;
  url?: string;
}

export function useRecentAlerts(limit: number = 10) {
  const [alerts, setAlerts] = useState<RecentAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchAlerts() {
      try {
        setLoading(true);
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          throw new Error("Missing Supabase configuration");
        }

        // Fetch recent outbreak signals with related data
        const params = new URLSearchParams();
        params.set('select', 'id,detected_at,severity_assessment,case_count_mentioned,diseases!disease_id(name),countries!country_id(name,code),news_articles!article_id(title,url)');
        params.set('order', 'detected_at.desc');
        params.set('limit', String(Math.max(limit, 50))); // Fetch more to allow better filtering
        
        const url = `${supabaseUrl}/rest/v1/outbreak_signals?${params.toString()}`;
        const response = await fetch(url, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch alerts: ${response.statusText}`);
        }

        const data: any[] = await response.json();

        // Transform to alert format
        const transformed: RecentAlert[] = data.map((signal: any) => {
          const disease = Array.isArray(signal.diseases) ? signal.diseases[0] : signal.diseases;
          const country = Array.isArray(signal.countries) ? signal.countries[0] : signal.countries;
          const article = Array.isArray(signal.news_articles) ? signal.news_articles[0] : signal.news_articles;

          const diseaseName = disease?.name || "Unknown Disease";
          const location = country?.name || "Unknown Location";
          const countryCode = country?.code || "";
          const cases = signal.case_count_mentioned || 0;
          
          // Determine alert type based on severity
          let type: "critical" | "warning" | "info" = "info";
          if (signal.severity_assessment === "critical") {
            type = "critical";
          } else if (signal.severity_assessment === "high") {
            type = "warning";
          } else {
            type = "info";
          }

          // Generate description
          let description = article?.title || "";
          if (!description && cases > 0) {
            description = `${cases} case${cases > 1 ? "s" : ""} reported`;
          } else if (!description) {
            description = "New outbreak signal detected";
          }

          // Format time
          const detectedAt = new Date(signal.detected_at);
          const now = new Date();
          const diffMs = now.getTime() - detectedAt.getTime();
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffDays = Math.floor(diffHours / 24);
          
          let time: string;
          if (diffHours < 1) {
            const diffMins = Math.floor(diffMs / (1000 * 60));
            time = `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
          } else if (diffHours < 24) {
            time = `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
          } else if (diffDays < 7) {
            time = `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
          } else {
            time = detectedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }

          return {
            id: signal.id,
            type,
            disease: diseaseName,
            location,
            countryCode,
            description,
            time,
            url: article?.url,
          };
        });

        if (!active) return;

        setAlerts(transformed);
        setError(null);
      } catch (err: any) {
        if (!active) return;
        console.error("Error fetching alerts:", err);
        setError(err.message || "Failed to load alerts");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchAlerts();

    // Poll for new alerts every 30 seconds
    const intervalId = setInterval(() => {
      if (!active) return;
      fetchAlerts();
    }, 30000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [limit]);

  return { alerts, loading, error };
}

