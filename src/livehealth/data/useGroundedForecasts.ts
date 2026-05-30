import { useEffect, useState } from "react";

// Grounded forecasts: descriptive like an LLM, but every number is computed
// from real outbreak signals and shown. No invented figures.
//
// For each disease × country with momentum we compute, from the last 30 days:
//   • cases  = Σ case_count_mentioned (capped against single-signal background stats)
//   • deaths = Σ mortality_count_mentioned → CFR
//   • r7 / p7 = signals in last 7d vs prior 7d → weekly growth rate
//   • highShare = share of high/critical signals
// Then a deterministic projection: cases × (1+growth)^weeks → a low–high band,
// and a narrative sentence built only from those real values.

export interface GroundedForecast {
  id: string;
  disease: string;
  location: string;
  type: "Case Forecast" | "Geographic Spread" | "Risk Assessment" | "Timeline Projection";
  prediction: string; // descriptive narrative built from the real figures below
  confidence: number; // 0..100
  riskLevel: "low" | "medium" | "high" | "critical";
  targetDate: string;
  horizonDays: number;
  color: string;
  // ── traceable working ──
  cases: number;
  deaths: number;
  cfr: number | null; // %
  signals: number;
  r7: number;
  p7: number;
  growthPct: number; // weekly % change in signal volume
  highShare: number; // 0..1
  projLow: number | null;
  projHigh: number | null;
}

export interface GroundedForecastsResult {
  forecasts: GroundedForecast[];
  meta: { signalsAnalyzed: number; pairsConsidered: number; generatedAt: number };
  loading: boolean;
  error: string | null;
}

interface Row {
  case_count_mentioned: number | null;
  mortality_count_mentioned: number | null;
  detected_at: string;
  severity_assessment: string | null;
  diseases?: { name: string } | { name: string }[] | null;
  countries?: { name: string; code: string } | { name: string; code: string }[] | null;
}

const RISK_COLOR: Record<string, string> = {
  critical: "#f87171",
  high: "#fbbf24",
  medium: "#66dbe1",
  low: "#4ade80",
};

const fmt = (n: number) => Math.round(n).toLocaleString();
const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function useGroundedForecasts(limit = 8): GroundedForecastsResult {
  const [forecasts, setForecasts] = useState<GroundedForecast[]>([]);
  const [meta, setMeta] = useState({ signalsAnalyzed: 0, pairsConsidered: 0, generatedAt: Date.now() });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) throw new Error("Missing LiveHealth+ database configuration");

        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const params = new URLSearchParams();
        params.set(
          "select",
          "case_count_mentioned,mortality_count_mentioned,detected_at,severity_assessment,diseases!disease_id(name),countries!country_id(name,code)"
        );
        params.set("detected_at", `gte.${since}`);
        params.set("order", "detected_at.desc");
        params.set("limit", "1000");

        const res = await fetch(`${supabaseUrl}/rest/v1/outbreak_signals?${params.toString()}`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        });
        if (!res.ok) throw new Error(`outbreak_signals: ${res.statusText}`);
        const rows: Row[] = await res.json();

        const now = Date.now();
        const weekMs = 7 * 24 * 60 * 60 * 1000;

        interface Agg {
          disease: string;
          location: string;
          color?: string;
          caseVals: number[];
          deaths: number;
          r7: number;
          p7: number;
          total: number;
          high: number;
        }
        const groups = new Map<string, Agg>();

        for (const r of rows) {
          const disease = (Array.isArray(r.diseases) ? r.diseases[0] : r.diseases)?.name;
          const country = Array.isArray(r.countries) ? r.countries[0] : r.countries;
          if (!disease || disease.toUpperCase() === "OTHER") continue;
          const location = country?.name || "Global";
          const key = `${disease}|${location}`;
          const g =
            groups.get(key) ||
            ({ disease, location, caseVals: [], deaths: 0, r7: 0, p7: 0, total: 0, high: 0 } as Agg);
          const age = now - Date.parse(r.detected_at);
          if (age <= weekMs) g.r7 += 1;
          else if (age <= 2 * weekMs) g.p7 += 1;
          g.total += 1;
          if (r.case_count_mentioned && r.case_count_mentioned > 0) g.caseVals.push(r.case_count_mentioned);
          if (r.mortality_count_mentioned && r.mortality_count_mentioned > 0) g.deaths += r.mortality_count_mentioned;
          if (r.severity_assessment === "critical" || r.severity_assessment === "high") g.high += 1;
          groups.set(key, g);
        }

        const out: GroundedForecast[] = [];
        for (const g of groups.values()) {
          if (g.r7 < 2) continue; // need a minimum momentum to forecast

          // Cases: sum, but drop a lone giant value that dwarfs the rest 20× — that's
          // almost always a national background/prevalence stat, not an outbreak count.
          let caseVals = g.caseVals.slice().sort((a, b) => b - a);
          if (caseVals.length >= 2 && caseVals[0] > caseVals[1] * 20) caseVals = caseVals.slice(1);
          const cases = caseVals.reduce((a, b) => a + b, 0);
          const deaths = g.deaths;
          const cfr = cases > 0 ? +((deaths / cases) * 100).toFixed(1) : null;
          const highShare = g.total ? g.high / g.total : 0;

          // Weekly growth from signal momentum, clamped to a sane band.
          const rawGrowth = g.r7 / Math.max(1, g.p7) - 1;
          const weeklyG = Math.max(-0.4, Math.min(1.0, rawGrowth));
          const growthPct = Math.round(weeklyG * 100);

          // Horizon: faster + more severe → shorter, more urgent.
          const horizonDays = weeklyG >= 0.5 && highShare >= 0.6 ? 14 : weeklyG >= 0.3 ? 21 : highShare >= 0.5 ? 21 : 30;
          const weeks = horizonDays / 7;

          // Projection (only when we have a real case base). Signal-volume growth
          // is a noisy proxy for case growth, so damp it by half before compounding
          // to keep the range defensible.
          let projLow: number | null = null;
          let projHigh: number | null = null;
          if (cases >= 20) {
            const effectiveGrowth = weeklyG * 0.5;
            const factor = Math.pow(1 + effectiveGrowth, weeks);
            const mid = cases * factor;
            projLow = Math.max(cases, Math.round(mid * 0.9));
            projHigh = Math.round(mid * 1.18);
          }

          // Risk score → level.
          const momentum = Math.min(1, Math.log2(1 + Math.max(0, rawGrowth) + 1) / 1.6);
          const volume = Math.min(1, g.r7 / 12);
          const lethality = cfr ? Math.min(1, cfr / 20) : 0;
          const riskScore = momentum * 0.32 + highShare * 0.34 + volume * 0.18 + lethality * 0.16;
          const riskLevel: GroundedForecast["riskLevel"] =
            riskScore >= 0.7 ? "critical" : riskScore >= 0.5 ? "high" : riskScore >= 0.3 ? "medium" : "low";

          // Confidence: more signals + a real case base → higher.
          const confidence = Math.round(
            Math.max(35, Math.min(92, 38 + g.total * 2 + (cases > 0 ? 12 : 0) + caseVals.length * 1.5))
          );

          const type: GroundedForecast["type"] = cases >= 20 ? "Case Forecast" : weeklyG >= 0.3 ? "Timeline Projection" : "Risk Assessment";

          out.push({
            id: `${g.disease}|${g.location}`,
            disease: g.disease,
            location: g.location,
            type,
            prediction: buildNarrative({
              disease: g.disease,
              location: g.location,
              cases,
              deaths,
              cfr,
              signals: g.total,
              r7: g.r7,
              p7: g.p7,
              weeklyG,
              highShare,
              horizonDays,
              projLow,
              projHigh,
            }),
            confidence,
            riskLevel,
            targetDate: fmtDate(new Date(now + horizonDays * 24 * 60 * 60 * 1000)),
            horizonDays,
            color: RISK_COLOR[riskLevel],
            cases,
            deaths,
            cfr,
            signals: g.total,
            r7: g.r7,
            p7: g.p7,
            growthPct,
            highShare,
            projLow,
            projHigh,
          });
        }

        // Rank by a blend of risk and recent volume.
        out.sort((a, b) => {
          const sa = (a.riskLevel === "critical" ? 3 : a.riskLevel === "high" ? 2 : a.riskLevel === "medium" ? 1 : 0) * 10 + a.r7;
          const sb = (b.riskLevel === "critical" ? 3 : b.riskLevel === "high" ? 2 : b.riskLevel === "medium" ? 1 : 0) * 10 + b.r7;
          return sb - sa;
        });

        if (!active) return;
        setForecasts(out.slice(0, limit));
        setMeta({ signalsAnalyzed: rows.length, pairsConsidered: groups.size, generatedAt: Date.now() });
        setError(null);
      } catch (e: any) {
        if (!active) return;
        console.error("useGroundedForecasts error:", e);
        setError(e?.message || "Failed to compute forecasts");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [limit]);

  return { forecasts, meta, loading, error };
}

function buildNarrative(d: {
  disease: string;
  location: string;
  cases: number;
  deaths: number;
  cfr: number | null;
  signals: number;
  r7: number;
  p7: number;
  weeklyG: number;
  highShare: number;
  horizonDays: number;
  projLow: number | null;
  projHigh: number | null;
}): string {
  const parts: string[] = [];

  // Momentum phrase.
  const momentum =
    d.weeklyG >= 0.5
      ? `signal volume surging (${d.r7} reports this week vs ${d.p7} last)`
      : d.weeklyG > 0.1
      ? `signal volume rising (${d.r7} vs ${d.p7} last week)`
      : d.weeklyG < -0.1
      ? `signal volume easing (${d.r7} vs ${d.p7} last week)`
      : `signal volume steady (${d.r7} reports this week)`;

  // Base clause.
  if (d.cases >= 20) {
    parts.push(
      `${fmt(d.cases)} reported cases across ${d.signals} signals in 30 days, with ${momentum} and ${Math.round(
        d.highShare * 100
      )}% rated high or critical`
    );
  } else {
    parts.push(
      `${d.signals} detection signals in 30 days with ${momentum}; ${Math.round(
        d.highShare * 100
      )}% high/critical, no firm case counts reported yet`
    );
  }

  // Projection clause.
  if (d.projLow !== null && d.projHigh !== null && d.weeklyG > 0.02) {
    parts.push(
      `at the current trajectory, projecting ${fmt(d.projLow)}–${fmt(d.projHigh)} cumulative cases over the next ${d.horizonDays} days`
    );
  } else if (d.cases >= 20 && d.weeklyG <= 0.02) {
    parts.push(`activity holding near current levels — expect roughly ${fmt(d.cases)} cases to persist through ${d.horizonDays} days absent a new driver`);
  } else {
    parts.push(`flagged as an early watch signal pending confirmed case data`);
  }

  // Lethality clause when present.
  if (d.cfr !== null && d.deaths > 0) {
    parts.push(`CFR ~${d.cfr}% (${fmt(d.deaths)} death${d.deaths === 1 ? "" : "s"})`);
  }

  const sentence = parts.join(", ") + ".";
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
