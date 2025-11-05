import { useEffect, useState } from "react";
import { DashboardStats } from "./useDashboardStats";

interface TimeRange {
  days: number;
  label: string;
}

export function useDashboardStatsWithFilter(timeRange: string, searchQuery?: string) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchStats() {
      try {
        setLoading(true);
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          throw new Error("Missing Supabase configuration");
        }

        // Calculate date range
        const now = new Date();
        const timeRanges: Record<string, TimeRange> = {
          "24h": { days: 1, label: "24 hours" },
          "7d": { days: 7, label: "7 days" },
          "30d": { days: 30, label: "30 days" },
          "1y": { days: 365, label: "1 year" },
        };

        const range = timeRanges[timeRange] || timeRanges["7d"];
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - range.days);

        // Calculate previous period for comparison
        const previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - range.days);
        const previousEndDate = new Date(startDate);

        // Build country filter if search query matches a country
        let countryFilter = "";
        if (searchQuery && searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          // Check if query matches common country variations
          if (query.includes('united states') || query === 'us' || query === 'usa' || query === 'america') {
            countryFilter = "United States";
          } else if (query.includes('nigeria')) {
            countryFilter = "Nigeria";
          } else if (query.includes('china')) {
            countryFilter = "China";
          } else if (query.includes('india')) {
            countryFilter = "India";
          }
          // Add more country mappings as needed
        }

        // Fetch current period signals
        const currentParams = new URLSearchParams();
        currentParams.set('select', 'id,case_count_mentioned,detected_at,country_id,severity_assessment,countries!country_id(name)');
        currentParams.set('detected_at', `gte.${startDate.toISOString()}`);
        currentParams.set('order', 'detected_at.desc');
        
        // If country filter, we'll filter client-side after fetching
        const currentUrl = `${supabaseUrl}/rest/v1/outbreak_signals?${currentParams.toString()}`;
        const currentResponse = await fetch(currentUrl, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });

        if (!currentResponse.ok) {
          throw new Error(`Failed to fetch stats: ${currentResponse.statusText}`);
        }

        const currentDataRaw: any[] = await currentResponse.json();
        
        // Filter by country if search query matches
        let currentData = currentDataRaw;
        if (countryFilter) {
          currentData = currentDataRaw.filter((signal: any) => {
            const country = Array.isArray(signal.countries) ? signal.countries[0] : signal.countries;
            return country?.name === countryFilter;
          });
        }

        // Fetch previous period for comparison
        const previousParams = new URLSearchParams();
        previousParams.set('select', 'id,case_count_mentioned,detected_at,country_id,severity_assessment,countries!country_id(name)');
        previousParams.set('detected_at', `gte.${previousStartDate.toISOString()}`);
        previousParams.set('order', 'detected_at.desc');
        
        const previousUrl = `${supabaseUrl}/rest/v1/outbreak_signals?${previousParams.toString()}`;
        const previousResponse = await fetch(previousUrl, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });

        const previousDataRaw: any[] = previousResponse.ok ? await previousResponse.json() : [];
        // Filter to previous period only and by country if needed
        let previousData = previousDataRaw.filter((s: any) => {
          const detectedAt = new Date(s.detected_at);
          return detectedAt >= previousStartDate && detectedAt < previousEndDate;
        });
        
        if (countryFilter) {
          previousData = previousData.filter((signal: any) => {
            const country = Array.isArray(signal.countries) ? signal.countries[0] : signal.countries;
            return country?.name === countryFilter;
          });
        }

        // Calculate statistics (same as before)
        const activeOutbreaks = currentData.length;
        const previousOutbreaks = previousData.length;
        let activeOutbreaksChange = "0%";
        if (previousOutbreaks > 0) {
          const changePercent = ((activeOutbreaks - previousOutbreaks) / previousOutbreaks * 100);
          activeOutbreaksChange = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`;
        } else if (activeOutbreaks > 0) {
          activeOutbreaksChange = "+100%";
        }

        const totalCases = currentData.reduce((sum, signal) => sum + (signal.case_count_mentioned || 0), 0);
        const previousCases = previousData.reduce((sum, signal) => sum + (signal.case_count_mentioned || 0), 0);
        let totalCasesChange = "0%";
        if (previousCases > 0) {
          const changePercent = ((totalCases - previousCases) / previousCases * 100);
          totalCasesChange = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`;
        } else if (totalCases > 0) {
          totalCasesChange = "+100%";
        }

        const uniqueCountries = new Set(currentData.map((s: any) => s.country_id).filter(Boolean));
        const countriesAffected = uniqueCountries.size;
        const previousCountries = new Set(previousData.map((s: any) => s.country_id).filter(Boolean)).size;
        const countriesAffectedChange = previousCountries > 0
          ? `+${countriesAffected - previousCountries}`
          : countriesAffected > 0 ? `+${countriesAffected}` : "0";

        // Recovery rate: calculate based on resolved/contained outbreaks (simplified)
        const resolvedSignals = currentData.filter((s: any) => s.severity_assessment === 'low').length;
        const recoveryRate = activeOutbreaks > 0
          ? (resolvedSignals / activeOutbreaks * 100)
          : 0;
        
        const previousResolved = previousData.filter((s: any) => s.severity_assessment === 'low').length;
        const previousRecoveryRate = previousOutbreaks > 0
          ? (previousResolved / previousOutbreaks * 100)
          : 0;
        let recoveryRateChange = "0%";
        if (previousRecoveryRate > 0) {
          const changePercent = ((recoveryRate - previousRecoveryRate) / previousRecoveryRate * 100);
          recoveryRateChange = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`;
        } else if (recoveryRate > 0) {
          recoveryRateChange = "+100%";
        }

        if (!active) return;

        setStats({
          activeOutbreaks,
          totalCases,
          countriesAffected,
          recoveryRate: parseFloat(recoveryRate.toFixed(1)),
          activeOutbreaksChange,
          totalCasesChange,
          countriesAffectedChange,
          recoveryRateChange,
        });
        setError(null);
      } catch (err: any) {
        if (!active) return;
        console.error("Error fetching dashboard stats:", err);
        setError(err.message || "Failed to load statistics");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchStats();

    return () => {
      active = false;
    };
  }, [timeRange, searchQuery]);

  return { stats, loading, error };
}

