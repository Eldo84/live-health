import type { ScopeView } from "./types";
import type { PieSlice } from "./mapData";

// ──────────────────────────────────────────────────────────────────────────
// ILLUSTRATIVE forecasts for the demo. These are simple heuristics over the
// scoped case history (trend extrapolation + deterministic risk scores) — NOT
// a trained model. The UI labels this section "illustrative" so it is never
// mistaken for live ML. Swap this function for a real model output later.
// ──────────────────────────────────────────────────────────────────────────

export interface ForecastPoint {
  label: string;
  value: number;
  lower: number;
  upper: number;
  forecast: boolean;
}

export interface HotspotPrediction {
  name: string;
  probability: number; // 0..1
  disease: string;
}

export interface ResourceForecast {
  label: string;
  detail: string;
  severity: "high" | "medium" | "low";
}

export interface ZambiaPredictions {
  series: ForecastPoint[];
  expectedNext7: number;
  changeVsCurrentPct: number;
  hotspots: HotspotPrediction[];
  resources: ResourceForecast[];
  insights: string[];
  confidence: number; // 0..1
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

// Deterministic [0,1) from a string.
function unit(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

export function computeZambiaPredictions(
  view: ScopeView,
  placePies: Record<string, PieSlice[]>,
): ZambiaPredictions {
  const hist = view.byDay;
  const vals = hist.map((d) => d.cases);
  const last = vals[vals.length - 1] ?? 0;
  const early = mean(vals.slice(0, 3));
  const late = mean(vals.slice(-3));
  // Per-day trend, gently damped so the forecast doesn't run away.
  const trend = vals.length >= 4 ? (late - early) / 3 : 0;

  const series: ForecastPoint[] = hist.map((d) => ({
    label: d.label,
    value: d.cases,
    lower: d.cases,
    upper: d.cases,
    forecast: false,
  }));
  let running = last;
  let expectedNext7 = 0;
  for (let i = 1; i <= 7; i++) {
    running = Math.max(0, running + trend * 0.8);
    const v = Math.round(running);
    expectedNext7 += v;
    series.push({ label: `+${i}`, value: v, lower: Math.round(v * 0.82), upper: Math.round(v * 1.18), forecast: true });
  }
  const currentWeek = vals.reduce((a, b) => a + b, 0) || 1;
  const changeVsCurrentPct = (expectedNext7 - currentWeek) / currentWeek;

  // Hotspots: top child places, probability scaled by share + deterministic noise.
  const maxPlace = view.places[0]?.cases || 1;
  const topDisease = view.byDisease[0]?.disease ?? "Malaria";
  const hotspots: HotspotPrediction[] = view.places
    .filter((p) => p.cases > 0)
    .slice(0, 5)
    .map((p) => {
      const placeTop = placePies[p.name]?.[0]?.label ?? topDisease;
      const prob = Math.min(0.97, 0.5 + (p.cases / maxPlace) * 0.42 + (unit(p.name) - 0.5) * 0.06);
      return { name: p.name, probability: prob, disease: placeTop };
    });

  // Resource forecast scaled off the scope's case load.
  const total = view.kpis.totalCases;
  const beds = Math.round(total * 0.012);
  const resources: ResourceForecast[] = [
    { label: "Hospital beds", detail: `~${beds} bed shortfall projected by Fri (mostly pediatric)`, severity: beds > 15 ? "high" : "medium" },
    { label: "Malaria RDTs", detail: "72-hour supply remaining at current usage", severity: "high" },
    { label: "Oral rehydration salts", detail: `48-hour supply in ${view.places[0]?.name ?? "top area"}`, severity: "medium" },
    { label: "Pediatric staff", detail: "~30% below projected demand this week", severity: "medium" },
  ];

  const a = view.places[0]?.name ?? "the top area";
  const b = view.places[1]?.name ?? "a neighboring area";
  const insights = [
    `${topDisease} is expected to keep rising in ${a} over the next 5–7 days.`,
    `Based on the current trend, ${topDisease.toLowerCase()} may spread from ${a} toward ${b}.`,
    `Lab-confirmation is running at ${Math.round(view.kpis.labConfirmedPct * 100)}% — prioritize RDT resupply where it is lowest.`,
  ];

  return {
    series,
    expectedNext7,
    changeVsCurrentPct,
    hotspots,
    resources,
    insights,
    confidence: 0.87,
  };
}
