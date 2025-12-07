import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import { geocodeLocation } from "./geocode";

/**
 * Region popularity data for a single disease
 */
export interface RegionPopularityData {
  disease: string;
  regions: Array<{
    region: string;
    region_code: string | null;
    popularity_score: number;
    date: string;
    coordinates?: [number, number]; // Optional, for map display
  }>;
}

/**
 * Hook return type
 */
interface UseGoogleTrendsRegionsReturn {
  regionData: RegionPopularityData[];
  loading: boolean;
  error: string | null;
}

/**
 * Time range to days mapping
 */
const TIME_RANGE_DAYS: Record<string, number> = {
  "4h": 1, // Use 1 day for very recent data
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "6m": 180,
  "1y": 365,
};

/**
 * Custom hook to fetch Google Trends region popularity data from Supabase.
 * 
 * @param selectedDiseases - Array of disease names to fetch region data for
 * @param timeRange - Time range string (e.g., "7d", "30d")
 * @returns Object containing region data, loading state, and error
 * 
 * @example
 * ```tsx
 * const { regionData, loading, error } = useGoogleTrendsRegions(["covid", "influenza"], "30d");
 * ```
 */
export function useGoogleTrendsRegions(
  selectedDiseases: string[],
  timeRange: string = "30d"
): UseGoogleTrendsRegionsReturn {
  const [regionData, setRegionData] = useState<RegionPopularityData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate date range
  const dateRange = useMemo(() => {
    const days = TIME_RANGE_DAYS[timeRange] || 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
    };
  }, [timeRange]);

  useEffect(() => {
    // Reset if no diseases selected
    if (selectedDiseases.length === 0) {
      setRegionData([]);
      setError(null);
      return;
    }

    let cancelled = false;

    async function fetchRegionData() {
      setLoading(true);
      setError(null);

      try {
        // Call the RPC function to get latest region data for selected diseases
        // Using get_latest_disease_trends_regions for map visualization
        const { data, error: rpcError } = await supabase.rpc(
          "get_latest_disease_trends_regions",
          {
            disease_names: selectedDiseases,
            days_back: TIME_RANGE_DAYS[timeRange] || 90,
          }
        );

        if (cancelled) return;

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        // Group data by disease and add coordinates
        const groupedData: Record<string, Array<{
          region: string;
          region_code: string | null;
          popularity_score: number;
          date: string;
          coordinates?: [number, number];
        }>> = {};

        (data || []).forEach(
          (row: {
            disease: string;
            region: string;
            region_code: string | null;
            popularity_score: number;
            date: string;
          }) => {
            if (!groupedData[row.disease]) {
              groupedData[row.disease] = [];
            }

            // Try to get coordinates for the region
            const coordinates = geocodeLocation(row.region);

            groupedData[row.disease].push({
              region: row.region,
              region_code: row.region_code,
              popularity_score: row.popularity_score,
              date: row.date,
              coordinates: coordinates || undefined,
            });
          }
        );

        // Convert to array format and sort by popularity
        const regionDataArray: RegionPopularityData[] = Object.entries(
          groupedData
        ).map(([disease, regions]) => ({
          disease,
          regions: regions.sort((a, b) => b.popularity_score - a.popularity_score), // Sort by popularity descending
        }));

        setRegionData(regionDataArray);
        setError(null);
      } catch (err) {
        if (cancelled) return;

        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch region data";
        setError(errorMessage);
        setRegionData([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchRegionData();

    return () => {
      cancelled = true;
    };
  }, [selectedDiseases.join(","), timeRange]); // Re-fetch when selection or time range changes

  return { regionData, loading, error };
}

