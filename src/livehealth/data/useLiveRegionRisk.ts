import { useMemo } from "react";
import { useRegionalRiskLevels } from "../../lib/useRegionalRiskLevels";
import { continentForCountry } from "../lib/geometry";

const RISK_BY_LEVEL: Record<string, number> = {
  critical: 0.88,
  high: 0.7,
  medium: 0.5,
  low: 0.3,
};

// Returns a record { "Africa": 0.81, "Europe": 0.34, ... } matching the
// design's regionRisk shape (continent → 0..1 risk index).
export function useLiveRegionRisk(timeRange: string = "30d") {
  const { data, loading, error } = useRegionalRiskLevels(timeRange);

  const regionRisk = useMemo(() => {
    const out: Record<string, number> = {};
    for (const region of data) {
      // Re-map countries into our continent buckets.
      const grouped = new Map<string, { outbreaks: number; severity: number }>();
      for (const c of region.countries) {
        const cont = continentForCountry(c.name, region.region);
        const cur = grouped.get(cont) || { outbreaks: 0, severity: 0 };
        cur.outbreaks += c.outbreakCount;
        cur.severity = Math.max(cur.severity, RISK_BY_LEVEL[c.riskLevel] || 0.3);
        grouped.set(cont, cur);
      }
      for (const [cont, stats] of grouped) {
        const fromOutbreak = Math.min(0.9, 0.2 + stats.outbreaks / 60);
        out[cont] = Math.max(out[cont] || 0, (stats.severity + fromOutbreak) / 2);
      }
    }
    // Ensure all design buckets exist (even at low risk) so the choropleth renders consistently.
    const buckets = ["N. America", "S. America", "Europe", "Africa", "M. East", "Asia", "S. Asia", "SE Asia", "Oceania"];
    for (const b of buckets) {
      if (out[b] === undefined) out[b] = 0.25;
    }
    return out;
  }, [data]);

  return { regionRisk, loading, error };
}
