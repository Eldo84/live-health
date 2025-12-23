import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  diseaseData as seedDiseaseData,
  DiseaseRecord
} from "@/lib/diseaseSeedData";

export interface HealthStatistics {
  id?: string;
  country_code: string;
  year: number;
  category: string;
  condition: string;
  age_group: string | null;

  // Numeric fields (for calculations)
  prevalence_per_100k: number | null;
  incidence_per_100k: number | null;
  mortality_rate: number | null;
  female_value: number | null;
  male_value: number | null;
  all_sexes_value: number | null;
  ylds_per_100k: number | null;
  dalys_per_100k: number | null;
  data_source: string | null;

  // Text fields (for display if needed)
  prevalence_text?: string | null;
  incidence_text?: string | null;
  mortality_rate_text?: string | null;
  female_text?: string | null;
  male_text?: string | null;
  all_sexes_text?: string | null;
  location_name?: string | null;

  // AI enrichment fields
  risk_factors: string | null;
  equity_notes: string | null;
  interventions: string | null;
}

export interface HealthStatisticsFilters {
  category?: string;
  country?: string;
  yearRange?: string;
  year?: number | string;
  sex?: string;
  ageGroup?: string;
  searchTerm?: string;
}

function filterSeedData(records: DiseaseRecord[], filters?: HealthStatisticsFilters) {
  if (!filters) return records;

  const countryMap: Record<string, string> = {
    "United States": "United States",
    "US": "United States",
    "U.S.": "United States",
    "U.S.A.": "United States",
    "USA": "United States",
    "UK": "United Kingdom",
    "Great Britain": "United Kingdom",
    "England": "United Kingdom",
    "Global": "Global",
  };

  const mapCountry = (c: string) => countryMap[c] || c;

  let filtered = records;

  if (filters.category && filters.category !== "All Categories") {
    filtered = filtered.filter((r) => r.category === filters.category);
  }

  if (
    filters.country &&
    filters.country !== "Global" &&
    filters.country !== "All Countries" &&
    filters.country !== "All"
  ) {
    const target = mapCountry(filters.country);
    filtered = filtered.filter((r) => r.country === target);
  }

  if (filters.yearRange) {
    const parts = filters.yearRange.split("-").map((p) => Number(p));
    if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
      filtered = filtered.filter((r) => r.year >= parts[0] && r.year <= parts[1]);
    } else if (parts.length === 1 && Number.isFinite(parts[0])) {
      filtered = filtered.filter((r) => r.year === parts[0]);
    }
  } else if (filters.year !== undefined) {
    const yr = Number(filters.year);
    if (Number.isFinite(yr)) {
      filtered = filtered.filter((r) => r.year === yr);
    }
  }

  if (filters.ageGroup && filters.ageGroup !== "All Ages") {
    filtered = filtered.filter((r) => r.ageGroup === filters.ageGroup);
  }

  if (filters.searchTerm && filters.searchTerm.trim()) {
    const search = filters.searchTerm.trim().toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.condition.toLowerCase().includes(search) ||
        r.category.toLowerCase().includes(search) ||
        r.country.toLowerCase().includes(search)
    );
  }

  console.log(`[useHealthStatistics] Filtered ${records.length} -> ${filtered.length} records. Filters:`, filters);
  return filtered;
}

function mapSeedToHealthStats(records: DiseaseRecord[]): HealthStatistics[] {
  return records.map((r) => ({
    id: r.id,
    country_code: r.country,
    year: r.year,
    category: r.category,
    condition: r.condition,
    age_group: r.ageGroup,
    prevalence_per_100k: r.prevalence,
    incidence_per_100k: r.incidence,
    mortality_rate: r.mortalityRate,
    female_value: r.female,
    male_value: r.male,
    all_sexes_value: r.allSexes,
    ylds_per_100k: r.ylds,
    dalys_per_100k: r.dalys,
    data_source: r.dataSource || "Static seed dataset",
    prevalence_text: String(r.prevalence),
    incidence_text: String(r.incidence),
    mortality_rate_text: String(r.mortalityRate),
    female_text: String(r.female),
    male_text: String(r.male),
    all_sexes_text: String(r.allSexes),
    location_name: r.country,
    risk_factors: r.riskFactors.join(", "),
    equity_notes: r.equity || null,
    interventions: r.interventions || null,
  }));
}

export function useHealthStatistics(filters?: HealthStatisticsFilters) {
  const [data, setData] = useState<HealthStatistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const useSeedFallback = () => {
      const filteredSeeds = filterSeedData(seedDiseaseData, filters);
      const mappedSeeds = mapSeedToHealthStats(filteredSeeds);
      if (active) {
        setData(mappedSeeds);
        setError(null);
      }
    };

    async function fetchHealthStatistics() {
      try {
        setLoading(true);
        setError(null);

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          // Fallback to static dataset if env is missing (local/demo use)
          useSeedFallback();
          return;
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Build query from health_data_public (only complete seeds are exposed)
        let query = supabase.from("health_data_public").select("*");

        // Apply filters
        if (filters?.category && filters.category !== "All Categories") {
          query = query.eq("category", filters.category);
        }

        if (
          filters?.country &&
          filters.country !== "Global" &&
          filters.country !== "All Countries" &&
          filters.country !== "All"
        ) {
          // Map common display names to stored codes/names
          const countryMap: Record<string, string> = {
            "United States": "USA",
            "US": "USA",
            "U.S.": "USA",
            "U.S.A.": "USA",
            "USA": "USA",
            "Nigeria": "Nigeria",
            "India": "India",
            "United Kingdom": "UK",
            "UK": "UK",
            "Great Britain": "UK",
            "Brazil": "Brazil"
          };
          const mapped = countryMap[filters.country] || filters.country;
          const candidates = Array.from(new Set([filters.country, mapped])).filter(Boolean);
          if (candidates.length > 1) {
            query = query.in("country", candidates);
          } else {
            query = query.eq("country", mapped);
          }
        }

        if (filters?.yearRange) {
          // Parse year range (e.g., "2015-2019" or "2020-2024" or single year "2024")
          const parts = filters.yearRange.split("-").map(Number);
          if (parts.length === 2 && parts[0] && parts[1]) {
            // Range format: "2015-2019"
            query = query.gte("year", parts[0]).lte("year", parts[1]);
          } else if (parts.length === 1 && parts[0]) {
            // Single year format: "2024"
            query = query.eq("year", parts[0]);
          }
        } else if (filters?.year) {
          const yr = Number(filters.year);
          if (Number.isFinite(yr)) {
            query = query.eq("year", yr);
          }
        }

        if (filters?.ageGroup && filters.ageGroup !== "All Ages") {
          query = query.eq("age_group_affected", filters.ageGroup);
        }

        if (filters?.searchTerm && filters.searchTerm.trim()) {
          const searchLower = filters.searchTerm.toLowerCase().trim();
          query = query.or(
            `condition.ilike.%${searchLower}%,category.ilike.%${searchLower}%`
          );
        }

        const { data: healthData, error: queryError } = await query.order(
          "prevalence_per_100k",
          { ascending: false }
        );

        if (queryError) {
          throw queryError;
        }

        const parseNum = (v: any): number | null => {
          if (v === null || v === undefined) return null;
          const n = Number(v);
          return Number.isFinite(n) ? n : null;
        };

        if (active && healthData && healthData.length > 0) {
          const mapped = healthData.map((item: any) => {
            const femaleRaw = parseNum(item.female_percentage);
            const maleRaw = parseNum(item.male_percentage);
            const allSexesRaw = parseNum(item.all_sexes_est_total);

            // Fallback: if sex-specific values are missing, split all_sexes value; default to 0
            const femaleValue =
              femaleRaw ?? (allSexesRaw !== null ? allSexesRaw / 2 : 0);
            const maleValue =
              maleRaw ?? (allSexesRaw !== null ? allSexesRaw / 2 : 0);

            return {
              id: item.id,
              country_code: item.country, // reuse country field
              year: item.year,
              category: item.category,
              condition: item.condition,
              age_group: item.age_group_affected ?? null,
              prevalence_per_100k: parseNum(item.prevalence_per_100k),
              incidence_per_100k: parseNum(item.incidence_per_100k),
              mortality_rate: parseNum(item.mortality_rate),
              female_value: femaleValue,
              male_value: maleValue,
              all_sexes_value: allSexesRaw ?? 0,
              ylds_per_100k: parseNum(item.ylds_per_100k),
              dalys_per_100k: parseNum(item.dalys_per_100k),
              data_source: item.data_source ?? null,
              prevalence_text: item.prevalence_per_100k ?? null,
              incidence_text: item.incidence_per_100k ?? null,
              mortality_rate_text: item.mortality_rate ?? null,
              female_text: item.female_percentage ?? null,
              male_text: item.male_percentage ?? null,
              all_sexes_text: item.all_sexes_est_total ?? null,
              location_name: item.country ?? null,
              risk_factors: item.risk_factors ?? null,
              equity_notes: item.equity ?? null,
              interventions: item.interventions ?? null,
            };
          });

          // If the remote data exists but all key metrics are missing/zero, fall back to seeds
          const hasNonZeroAny = mapped.some((m) =>
            (m.prevalence_per_100k ?? 0) > 0 ||
            (m.incidence_per_100k ?? 0) > 0 ||
            (m.mortality_rate ?? 0) > 0 ||
            (m.dalys_per_100k ?? 0) > 0
          );

          const hasNonZeroMortality = mapped.some((m) => (m.mortality_rate ?? 0) > 0);

          if (hasNonZeroAny && hasNonZeroMortality) {
            setData(mapped);
          } else {
            useSeedFallback();
          }
        } else if (active) {
          // No remote data—fallback to static seeds
          useSeedFallback();
        }
      } catch (err) {
        if (active) {
          console.error("Error fetching health statistics, using seed fallback:", err);
          useSeedFallback();
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchHealthStatistics();

    return () => {
      active = false;
    };
  }, [
    filters?.category,
    filters?.country,
    filters?.yearRange,
    filters?.year,
    filters?.ageGroup,
    filters?.searchTerm,
  ]);

  return { data, loading, error };
}

