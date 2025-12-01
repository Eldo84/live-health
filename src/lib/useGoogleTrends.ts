import { useState, useEffect } from "react";
import { supabase } from "./supabase";

/**
 * The 20 diseases we track with Google Trends.
 * These are pre-fetched weekly and stored in Supabase.
 */
export const TRACKED_DISEASES = [
  "influenza",
  "covid",
  "measles",
  "cholera",
  "ebola",
  "marburg virus",
  "dengue fever",
  "yellow fever",
  "zika virus",
  "plague",
  "mpox",
  "meningitis",
  "norovirus",
  "RSV virus",
  "SARS",
  "MERS",
  "bird flu",
  "hand foot mouth disease",
  "polio",
  "hepatitis A",
] as const;

export type TrackedDisease = (typeof TRACKED_DISEASES)[number];

/**
 * A single data point from Google Trends
 */
export interface TrendDataPoint {
  date: string;
  interest_value: number;
}

/**
 * Trend data for a single disease
 */
export interface DiseaseTrendData {
  disease: string;
  data: TrendDataPoint[];
}

/**
 * Hook return type
 */
interface UseGoogleTrendsReturn {
  trends: DiseaseTrendData[];
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook to fetch Google Trends data from Supabase.
 * 
 * @param selectedDiseases - Array of disease names to fetch trends for
 * @returns Object containing trends data, loading state, and error
 * 
 * @example
 * ```tsx
 * const { trends, loading, error } = useGoogleTrends(["covid", "influenza"]);
 * ```
 */
export function useGoogleTrends(selectedDiseases: string[]): UseGoogleTrendsReturn {
  const [trends, setTrends] = useState<DiseaseTrendData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset if no diseases selected
    if (selectedDiseases.length === 0) {
      setTrends([]);
      setError(null);
      return;
    }

    let cancelled = false;

    async function fetchTrends() {
      setLoading(true);
      setError(null);

      try {
        // Call the RPC function to get trends for selected diseases
        const { data, error: rpcError } = await supabase.rpc("get_disease_trends", {
          disease_names: selectedDiseases,
        });

        if (cancelled) return;

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        // Group data by disease
        const groupedData: Record<string, TrendDataPoint[]> = {};
        
        (data || []).forEach((row: { disease: string; date: string; interest_value: number }) => {
          if (!groupedData[row.disease]) {
            groupedData[row.disease] = [];
          }
          groupedData[row.disease].push({
            date: row.date,
            interest_value: row.interest_value,
          });
        });

        // Convert to array format
        const trendsArray: DiseaseTrendData[] = Object.entries(groupedData).map(
          ([disease, dataPoints]) => ({
            disease,
            data: dataPoints,
          })
        );

        setTrends(trendsArray);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch trends data";
        setError(errorMessage);
        setTrends([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTrends();

    return () => {
      cancelled = true;
    };
  }, [selectedDiseases.join(",")]); // Re-fetch when selection changes

  return { trends, loading, error };
}

