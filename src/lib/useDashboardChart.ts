import { useEffect, useState } from "react";

export interface ChartDataPoint {
  date: string;
  [diseaseName: string]: string | number;
}

export function useDashboardChart(timeRange: string) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchChartData() {
      try {
        setLoading(true);
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          throw new Error("Missing Supabase configuration");
        }

        // Calculate date range and bucket size
        const now = new Date();
        const config: Record<string, { days: number; bucketSize: number }> = {
          "24h": { days: 1, bucketSize: 1 }, // hourly buckets
          "7d": { days: 7, bucketSize: 1 }, // daily buckets
          "30d": { days: 30, bucketSize: 7 }, // weekly buckets
          "1y": { days: 365, bucketSize: 30 }, // monthly buckets
        };

        const { days, bucketSize } = config[timeRange] || config["7d"];
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - days);

        // Fetch signals with disease information
        const params = new URLSearchParams();
        params.set('select', 'detected_at,case_count_mentioned,diseases!disease_id(name)');
        params.set('detected_at', `gte.${startDate.toISOString()}`);
        params.set('order', 'detected_at.asc');
        
        const url = `${supabaseUrl}/rest/v1/outbreak_signals?${params.toString()}`;
        const response = await fetch(url, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch chart data: ${response.statusText}`);
        }

        const data: any[] = await response.json();

        // Group data by time buckets and disease
        const bucketMap = new Map<string, Map<string, number>>();
        const diseaseSet = new Set<string>();

        data.forEach((signal: any) => {
          const disease = Array.isArray(signal.diseases) ? signal.diseases[0] : signal.diseases;
          const diseaseName = disease?.name || "Unknown";
          diseaseSet.add(diseaseName);

          const detectedAt = new Date(signal.detected_at);
          let bucketKey: string;

          if (timeRange === "24h") {
            // Hourly buckets
            bucketKey = `${detectedAt.getFullYear()}-${String(detectedAt.getMonth() + 1).padStart(2, '0')}-${String(detectedAt.getDate()).padStart(2, '0')} ${String(detectedAt.getHours()).padStart(2, '0')}:00`;
          } else if (timeRange === "7d") {
            // Daily buckets
            bucketKey = `${detectedAt.getFullYear()}-${String(detectedAt.getMonth() + 1).padStart(2, '0')}-${String(detectedAt.getDate()).padStart(2, '0')}`;
          } else if (timeRange === "30d") {
            // Weekly buckets
            const weekStart = new Date(detectedAt);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            bucketKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
          } else {
            // Monthly buckets
            bucketKey = `${detectedAt.getFullYear()}-${String(detectedAt.getMonth() + 1).padStart(2, '0')}`;
          }

          if (!bucketMap.has(bucketKey)) {
            bucketMap.set(bucketKey, new Map());
          }

          const diseaseMap = bucketMap.get(bucketKey)!;
          const cases = signal.case_count_mentioned || 0;
          diseaseMap.set(diseaseName, (diseaseMap.get(diseaseName) || 0) + cases);
        });

        // Convert to chart format
        const sortedBuckets = Array.from(bucketMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        const topDiseases = Array.from(diseaseSet).slice(0, 6); // Top 6 diseases for chart

        const chartDataPoints: ChartDataPoint[] = sortedBuckets.map(([date, diseaseMap]) => {
          const point: ChartDataPoint = { date };
          topDiseases.forEach(disease => {
            point[disease] = diseaseMap.get(disease) || 0;
          });
          return point;
        });

        // Format dates for display
        const formattedData = chartDataPoints.map(point => {
          const date = new Date(point.date);
          let formattedDate: string;

          if (timeRange === "24h") {
            formattedDate = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          } else if (timeRange === "7d") {
            formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          } else if (timeRange === "30d") {
            formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          } else {
            formattedDate = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          }

          return {
            ...point,
            date: formattedDate,
          };
        });

        if (!active) return;

        setChartData(formattedData);
        setError(null);
      } catch (err: any) {
        if (!active) return;
        console.error("Error fetching chart data:", err);
        setError(err.message || "Failed to load chart data");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchChartData();

    return () => {
      active = false;
    };
  }, [timeRange]);

  return { chartData, loading, error };
}

