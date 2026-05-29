import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

// Real public-data hooks for the Global Health Index page.
// Backed by gbd_countries / gbd_causes / gbd_estimates / gbd_country_indicators
// populated from:
//   - World Bank Open Data API   (population, life expectancy, vaccination, mortality)
//   - WHO Global Health Observatory (malaria incidence)
//   - IHME GBD 2023 (Deaths/DALYs/YLDs/YLLs/Prevalence/Incidence for 10 causes,
//                    204 countries, 2017-2023, age-standardized rate, both sexes,
//                    with 95% CI lower/upper bounds)

export interface GbdCountry {
  iso3: string;
  name: string;
  who_region: string | null;
  income_group: string | null;
  population: number | null;
}

export interface GbdCause {
  id: string;
  name: string;
  category: string;
  owid_slug: string | null;
  risk_factors: string[];
}

export interface GbdCountryIndicator {
  iso3: string;
  year: number;
  indicator: string;
  value: number;
  source: string;
}

export interface GbdEstimate {
  iso3: string;
  cause_id: string;
  year: number;
  measure: string;
  rate: number | null;
  lower: number | null;
  upper: number | null;
  source: string;
}

// Canonical measure strings used in gbd_estimates.
export const MEASURES = ["Deaths", "DALYs", "YLLs", "YLDs", "Incidence", "Prevalence"] as const;
export type Measure = (typeof MEASURES)[number];

export function useGbdCountries() {
  const [countries, setCountries] = useState<GbdCountry[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("gbd_countries")
      .select("iso3, name, who_region, income_group, population")
      .order("name")
      .then(({ data }) => {
        if (!cancelled) {
          setCountries(data || []);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { countries, loading };
}

export function useGbdCauses() {
  const [causes, setCauses] = useState<GbdCause[]>([]);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("gbd_causes")
      .select("id, name, category, owid_slug, risk_factors")
      .order("name")
      .then(({ data }) => {
        if (!cancelled) setCauses(data || []);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return causes;
}

// Fetch all country-level rows for one indicator (across years), so a chart
// can pick the right year-slice in render.
export function useGbdCountryIndicator(indicator: string) {
  const [rows, setRows] = useState<GbdCountryIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!indicator) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("gbd_country_indicators")
      .select("iso3, year, indicator, value, source")
      .eq("indicator", indicator)
      .order("year")
      .then(({ data }) => {
        if (!cancelled) {
          setRows(data || []);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [indicator]);
  return { rows, loading };
}

// Fetch all per-disease estimates for a single cause + measure across years.
// Returns IHME data (with CI bounds) plus any WHO fallback. Canonical Measure
// strings use title case ("Deaths", "Incidence", ...).
export function useGbdDiseaseEstimates(
  causeId: string | null,
  measure: Measure | string
) {
  const [rows, setRows] = useState<GbdEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!causeId) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("gbd_estimates")
      .select("iso3, cause_id, year, measure, rate, lower, upper, source")
      .eq("cause_id", causeId)
      .eq("measure", measure)
      .order("year")
      .then(({ data }) => {
        if (!cancelled) {
          setRows(data || []);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [causeId, measure]);
  return { rows, loading };
}

// All cause-level rows for ONE country at ONE measure — powers the
// "burden ranking across all causes" chart.
export function useGbdCountryAllCauses(
  iso3: string | null,
  measure: Measure | string
) {
  const [rows, setRows] = useState<GbdEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!iso3 || iso3 === "global") {
      // Global average: pull all rows for the measure, average per cause+year.
      let cancelled = false;
      setLoading(true);
      supabase
        .from("gbd_estimates")
        .select("iso3, cause_id, year, measure, rate, lower, upper, source")
        .eq("measure", measure)
        .order("year")
        .then(({ data }) => {
          if (!cancelled) {
            setRows(data || []);
            setLoading(false);
          }
        });
      return () => {
        cancelled = true;
      };
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("gbd_estimates")
      .select("iso3, cause_id, year, measure, rate, lower, upper, source")
      .eq("iso3", iso3)
      .eq("measure", measure)
      .order("year")
      .then(({ data }) => {
        if (!cancelled) {
          setRows(data || []);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [iso3, measure]);
  return { rows, loading };
}

// Both YLLs and YLDs for one country + cause across years, so a chart can
// stack mortality-burden vs disability-burden over time.
export function useGbdCountryBurdenSplit(
  iso3: string | null,
  causeId: string | null
) {
  const [rows, setRows] = useState<GbdEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!iso3 || !causeId) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    let query = supabase
      .from("gbd_estimates")
      .select("iso3, cause_id, year, measure, rate, lower, upper, source")
      .eq("cause_id", causeId)
      .in("measure", ["YLLs", "YLDs"])
      .order("year");
    if (iso3 !== "global") query = query.eq("iso3", iso3);
    query.then(({ data }) => {
      if (!cancelled) {
        setRows(data || []);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [iso3, causeId]);
  return { rows, loading };
}

// How many cause+measure combinations have actual data? Used for honest
// "data coverage" labels next to chart titles.
export function useGbdDataCoverage() {
  const [coverage, setCoverage] = useState<{
    causes: number;
    rows: number;
    minYear: number | null;
    maxYear: number | null;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase
      .rpc("gbd_estimates_coverage")
      .then(({ data, error }) => {
        if (error) {
          // Fall back to a basic query if the RPC doesn't exist.
          supabase
            .from("gbd_estimates")
            .select("cause_id, year")
            .then(({ data: rows }) => {
              if (cancelled) return;
              const causes = new Set((rows || []).map((r) => r.cause_id));
              const years = (rows || []).map((r) => r.year);
              setCoverage({
                causes: causes.size,
                rows: rows?.length || 0,
                minYear: years.length ? Math.min(...years) : null,
                maxYear: years.length ? Math.max(...years) : null,
              });
            });
        } else if (!cancelled) {
          setCoverage(data?.[0] || null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return coverage;
}
