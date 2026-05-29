import { useEffect, useState } from "react";
import { type TimeRange, startDateFor } from "../lib/timeRange";

export interface DashboardKpis {
  // Counts in the current window.
  activeOutbreaks: number;
  countries: number;
  cases: number;
  deaths: number;
  critical: number;
  // Deltas vs the equally-sized prior window (formatted "+12.4%" / "+4" / etc.).
  activeOutbreaksDelta: string;
  countriesDelta: string;
  casesDelta: string;
  criticalDelta: string;
  // Sparkline arrays bucketed across the selected window.
  outbreaksSpark: number[];
  countriesSpark: number[];
  casesSpark: number[];
  criticalSpark: number[];
  // AI Risk Index (0-10) and a small spark of its rolling value.
  aiRiskIndex: number;
  aiRiskSpark: number[];
  aiRiskDelta: string;
}

interface KpiRow {
  detected_at: string;
  severity_assessment: string | null;
  case_count_mentioned: number | null;
  mortality_count_mentioned: number | null;
  country_id: string | null;
  is_new_outbreak: boolean | null;
}

const RANGE_HOURS: Record<TimeRange, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "14d": 24 * 14,
  "30d": 24 * 30,
  "6m": 24 * 30 * 6,
  "1y": 24 * 365,
};

// Decide how many buckets fit nicely in each window.
function bucketCount(range: TimeRange): number {
  switch (range) {
    case "24h": return 12;   // 2h buckets
    case "7d":  return 7;    // daily
    case "14d": return 14;   // daily
    case "30d": return 15;   // ~2-day buckets
    case "6m":  return 12;   // ~15-day buckets
    case "1y":  return 12;   // monthly
  }
}

function formatPct(curr: number, prev: number): string {
  if (prev === 0) {
    return curr > 0 ? "+100%" : "0%";
  }
  const v = ((curr - prev) / prev) * 100;
  if (v > 999) return "+999%";
  if (v < -99) return "-99%";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

function formatDiff(curr: number, prev: number): string {
  const diff = curr - prev;
  const sign = diff >= 0 ? "+" : "";
  return `${sign}${diff}`;
}

// AI Risk Index — 0..10 derived from the current-window mix.
//   weight on share of critical/high signals (0..4)
//   weight on cases / 5000 capped at 3
//   weight on share of newly-detected outbreaks (0..3)
function computeAiRisk(rows: KpiRow[]): number {
  if (!rows.length) return 0;
  const total = rows.length;
  const critHigh = rows.filter(
    (r) => r.severity_assessment === "critical" || r.severity_assessment === "high"
  ).length;
  const cases = rows.reduce((s, r) => s + (r.case_count_mentioned || 0), 0);
  const isNew = rows.filter((r) => r.is_new_outbreak).length;

  const severityScore = (critHigh / total) * 4;            // up to 4
  const caseScore = Math.min(3, cases / 5000);             // up to 3
  const noveltyScore = (isNew / total) * 3;                // up to 3
  return Math.min(10, severityScore + caseScore + noveltyScore);
}

export function useDashboardKpis(range: TimeRange = "7d"): {
  kpis: DashboardKpis | null;
  loading: boolean;
  error: string | null;
} {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase configuration");

        const now = new Date();
        const start = startDateFor(range, now);
        const prevStart = new Date(start.getTime() - (now.getTime() - start.getTime()));

        const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
        // PostgREST cap: 1000 rows / req. For the 6m / 1y windows we let it cap and
        // the resulting KPIs are still representative (we're computing rates).
        const select =
          "detected_at,severity_assessment,case_count_mentioned,mortality_count_mentioned,country_id,is_new_outbreak";

        const [currRes, prevRes] = await Promise.all([
          fetch(
            `${supabaseUrl}/rest/v1/outbreak_signals?select=${select}&detected_at=gte.${start.toISOString()}&order=detected_at.asc&limit=1000`,
            { headers }
          ),
          fetch(
            `${supabaseUrl}/rest/v1/outbreak_signals?select=${select}&detected_at=gte.${prevStart.toISOString()}&detected_at=lt.${start.toISOString()}&order=detected_at.asc&limit=1000`,
            { headers }
          ),
        ]);

        if (!currRes.ok) throw new Error(`current period: ${currRes.statusText}`);
        const currRows: KpiRow[] = await currRes.json();
        const prevRows: KpiRow[] = prevRes.ok ? await prevRes.json() : [];

        const activeOutbreaks = currRows.length;
        const cases = currRows.reduce((s, r) => s + (r.case_count_mentioned || 0), 0);
        const deaths = currRows.reduce((s, r) => s + (r.mortality_count_mentioned || 0), 0);
        const countries = new Set(currRows.map((r) => r.country_id).filter(Boolean)).size;
        const critical = currRows.filter(
          (r) => r.severity_assessment === "critical" || r.severity_assessment === "high"
        ).length;

        const prevOutbreaks = prevRows.length;
        const prevCases = prevRows.reduce((s, r) => s + (r.case_count_mentioned || 0), 0);
        const prevCountries = new Set(prevRows.map((r) => r.country_id).filter(Boolean)).size;
        const prevCritical = prevRows.filter(
          (r) => r.severity_assessment === "critical" || r.severity_assessment === "high"
        ).length;

        // Bucket the current window into N intervals for the sparklines.
        const buckets = bucketCount(range);
        const windowMs = now.getTime() - start.getTime();
        const bucketMs = windowMs / buckets;
        const outbreaksSpark = new Array(buckets).fill(0);
        const casesSpark = new Array(buckets).fill(0);
        const criticalSpark = new Array(buckets).fill(0);
        const countrySetsByBucket: Set<string>[] = Array.from({ length: buckets }, () => new Set<string>());

        for (const r of currRows) {
          const t = Date.parse(r.detected_at);
          if (!Number.isFinite(t)) continue;
          let i = Math.floor((t - start.getTime()) / bucketMs);
          if (i < 0) i = 0;
          if (i >= buckets) i = buckets - 1;
          outbreaksSpark[i] += 1;
          if (r.country_id) countrySetsByBucket[i].add(r.country_id);
          casesSpark[i] += r.case_count_mentioned || 0;
          if (r.severity_assessment === "critical" || r.severity_assessment === "high") {
            criticalSpark[i] += 1;
          }
        }
        // Cumulative countries — sparkline shows running country count, not per-bucket
        const countriesSpark: number[] = [];
        const seen = new Set<string>();
        for (const bucketSet of countrySetsByBucket) {
          for (const c of bucketSet) seen.add(c);
          countriesSpark.push(seen.size);
        }

        // Rolling AI risk per bucket — use a running window of rows up to that bucket.
        const aiRiskSpark: number[] = [];
        const rolling: KpiRow[] = [];
        let cursor = 0;
        for (let i = 0; i < buckets; i++) {
          const limit = start.getTime() + (i + 1) * bucketMs;
          while (cursor < currRows.length) {
            const t = Date.parse(currRows[cursor].detected_at);
            if (t <= limit) {
              rolling.push(currRows[cursor]);
              cursor++;
            } else {
              break;
            }
          }
          aiRiskSpark.push(computeAiRisk(rolling));
        }
        const aiRiskIndex = computeAiRisk(currRows);
        const prevAiRisk = computeAiRisk(prevRows);
        const aiRiskDelta = `${aiRiskIndex - prevAiRisk >= 0 ? "+" : ""}${(aiRiskIndex - prevAiRisk).toFixed(1)}`;

        const out: DashboardKpis = {
          activeOutbreaks,
          countries,
          cases,
          deaths,
          critical,
          activeOutbreaksDelta: formatPct(activeOutbreaks, prevOutbreaks),
          countriesDelta: formatDiff(countries, prevCountries),
          casesDelta: formatPct(cases, prevCases),
          criticalDelta: formatDiff(critical, prevCritical),
          outbreaksSpark,
          countriesSpark,
          casesSpark,
          criticalSpark,
          aiRiskIndex,
          aiRiskSpark,
          aiRiskDelta,
        };

        if (!active) return;
        setKpis(out);
        setError(null);
      } catch (e: any) {
        if (!active) return;
        console.error("useDashboardKpis error:", e);
        setError(e?.message || "Failed to load KPIs");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [range]);

  return { kpis, loading, error };
}
