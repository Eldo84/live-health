import { useEffect, useState } from "react";

export interface DiseaseDistributionData {
  name: string;
  value: number;
  color: string;
}

export function useDiseaseDistribution(timeRange: string = "30d", countryId?: string | null) {
  const [data, setData] = useState<DiseaseDistributionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchDistribution() {
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

        const days = timeRanges[timeRange] || 30;
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - days);

        // Fetch outbreak signals grouped by disease
        const params = new URLSearchParams();
        params.set('select', 'disease_id,diseases!disease_id(name,color_code)');
        params.set('detected_at', `gte.${startDate.toISOString()}`);
        
        // Add country filter if provided
        if (countryId) {
          params.set('country_id', `eq.${countryId}`);
        }
        
        const url = `${supabaseUrl}/rest/v1/outbreak_signals?${params.toString()}`;
        const response = await fetch(url, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch distribution: ${response.statusText}`);
        }

        const signals: any[] = await response.json();

        // Count occurrences by disease
        const diseaseCount = new Map<string, { count: number; color: string }>();

        signals.forEach((signal: any) => {
          const disease = Array.isArray(signal.diseases) ? signal.diseases[0] : signal.diseases;
          if (!disease) return;

          const diseaseName = disease.name || "Unknown";
          const color = disease.color_code || "#66dbe1";

          if (!diseaseCount.has(diseaseName)) {
            diseaseCount.set(diseaseName, { count: 0, color });
          }

          const entry = diseaseCount.get(diseaseName)!;
          entry.count++;
        });

        // Convert to array and sort by count
        const distributionData: DiseaseDistributionData[] = Array.from(diseaseCount.entries())
          .map(([name, { count, color }]) => ({
            name,
            value: count,
            color,
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10); // Top 10 diseases

        if (!active) return;

        setData(distributionData);
        setError(null);
      } catch (err: any) {
        if (!active) return;
        console.error("Error fetching disease distribution:", err);
        setError(err.message || "Failed to load distribution data");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchDistribution();

    return () => {
      active = false;
    };
  }, [timeRange, countryId]);

  return { data, loading, error };
}

