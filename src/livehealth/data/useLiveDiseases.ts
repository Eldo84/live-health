import { useMemo } from "react";
import { useDashboardDiseases } from "../../lib/useDashboardDiseases";
import { colorForDisease } from "./diseaseColors";

export interface TopDisease {
  id: string;
  label: string;
  color: string;
  cases: number;
  delta: number;
  countries: number;
  spark: number[];
}

// Deterministic-ish little spark from a seed, so each disease has a non-flat line in the bar.
function fakeSpark(seed: string, base: number): number[] {
  const r = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < 14; i++) {
    const wave = Math.sin(i * 0.4 + h * 0.001) * 0.3 + 0.55;
    const noise = (r(h + i) - 0.5) * 0.2;
    out.push(Math.max(0, Math.round(base * Math.max(0.05, wave + noise))));
  }
  return out;
}

export function useLiveDiseases(timeRange: string = "7d"): {
  diseases: TopDisease[];
  loading: boolean;
  error: string | null;
} {
  const { diseases, loading, error } = useDashboardDiseases(timeRange);

  const top = useMemo<TopDisease[]>(() => {
    return diseases.slice(0, 12).map((d, idx) => {
      const parsed = parseInt(d.growth.replace(/[^-\d]/g, ""), 10);
      const delta = Number.isFinite(parsed) ? parsed : 0;
      const color = d.color && d.color.startsWith("#") ? d.color : colorForDisease(d.name, idx);
      return {
        id: d.name,
        label: d.name,
        color,
        cases: d.reports,
        delta,
        countries: 0,
        spark: fakeSpark(d.name, Math.max(1, Math.round(d.reports / 6))),
      };
    });
  }, [diseases]);

  return { diseases: top, loading, error };
}
