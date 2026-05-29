import { useMemo } from "react";
import { PaneHead } from "../../components/PaneHead";
import { WorldMap } from "../../components/WorldMap";
import { useLiveRegionRisk } from "../../data/useLiveRegionRisk";
import { useLiveOutbreaks } from "../../data/useLiveOutbreaks";
import { useRegionalRiskLevels } from "../../../lib/useRegionalRiskLevels";

const ACCENT = "#4ee0c4";

interface Props {
  isMobile: boolean;
  isTabletDown: boolean;
}

const SUB_INDICES = [
  { l: "Surveillance Strength", v: 6.8 },
  { l: "Lab & Diagnostic Capacity", v: 6.4 },
  { l: "Vaccine Coverage", v: 7.1 },
  { l: "Sanitation & WaSH", v: 5.9 },
  { l: "Healthcare Access", v: 6.2 },
  { l: "Risk Communication", v: 5.5 },
];

export function HealthIndexTab({ isMobile, isTabletDown }: Props) {
  const { regionRisk } = useLiveRegionRisk("30d");
  const { data: regions } = useRegionalRiskLevels("30d");
  const { outbreaks: liveOutbreaks } = useLiveOutbreaks("30d", 400);
  const mapOutbreaks = useMemo(
    () =>
      liveOutbreaks.map((o) => ({
        id: o.id,
        lng: o.lng,
        lat: o.lat,
        severity: o.severity,
      })),
    [liveOutbreaks]
  );

  // Map current Supabase risk by country (used as a chip and as the input to
  // the per-country GHI score below).
  const riskByCountry = useMemo(() => {
    const m = new Map<string, "low" | "medium" | "high" | "critical">();
    for (const r of regions) {
      for (const c of r.countries) {
        m.set(c.name, c.riskLevel);
      }
    }
    return m;
  }, [regions]);

  // Real country GHI computed from live outbreak burden (same formula as the
  // mobile dashboard's DmHealthIndex). Higher score = better preparedness.
  const COUNTRY_GHI = useMemo(() => {
    const flat: { name: string; outbreaks: number; cases: number; risk: string }[] = [];
    for (const region of regions) {
      for (const c of region.countries) {
        flat.push({
          name: c.name,
          outbreaks: c.outbreakCount,
          cases: c.totalCases,
          risk: c.riskLevel,
        });
      }
    }
    const scored = flat.map((c) => {
      const severityPenalty =
        c.risk === "critical" ? 2.5 : c.risk === "high" ? 1.5 : c.risk === "medium" ? 0.7 : 0;
      const outbreakPenalty = Math.min(4, c.outbreaks * 0.4);
      const casePenalty = c.cases > 0 ? Math.min(3, Math.log10(c.cases + 1) * 0.7) : 0;
      const ghi = Math.max(1, Math.min(10, 10 - severityPenalty - outbreakPenalty - casePenalty));
      return {
        name: c.name,
        ghi,
        outbreaks: c.outbreaks,
        cases: c.cases,
      };
    });
    const sorted = scored.slice().sort((a, b) => b.ghi - a.ghi);
    const top = sorted.slice(0, 7);
    const bottom = sorted.slice(-7).reverse();
    const merged = [...top];
    for (const b of bottom) {
      if (!merged.find((x) => x.name === b.name)) merged.push(b);
    }
    return merged;
  }, [regions]);

  // Global average + YoY proxy derived from the live region risk distribution.
  const { avg, yoyDelta } = useMemo(() => {
    const values = Object.values(regionRisk);
    if (!values.length) return { avg: 0, yoyDelta: 0 };
    const avgRisk = values.reduce((a, b) => a + b, 0) / values.length;
    const ghi = Math.max(0, Math.min(10, 10 * (1 - avgRisk)));
    return { avg: ghi, yoyDelta: ghi - 6.5 };
  }, [regionRisk]);

  return (
    <>
      <div style={{ padding: isMobile ? "16px 14px 12px" : "22px 22px 14px", borderBottom: "1px solid var(--ln-line)" }}>
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "flex-end",
            gap: 12,
          }}
        >
          <div>
            <span className="ln-eyebrow">Global Health Index</span>
            <h2
              className="ln-display"
              style={{
                fontSize: isMobile ? 22 : 30,
                margin: "6px 0 0",
                letterSpacing: "-0.02em",
              }}
            >
              How prepared is{" "}
              <span style={{ fontStyle: "italic", color: "var(--ln-ink-3)" }}>each country?</span>
            </h2>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
            <div>
              <div className="ln-eyebrow">Global avg</div>
              <div className="ln-num" style={{ fontSize: 30, color: ACCENT }}>
                {avg.toFixed(1)}{" "}
                <span style={{ fontSize: 12, color: "var(--ln-ink-3)" }}>/ 10</span>
              </div>
            </div>
            <div>
              <div className="ln-eyebrow">Δ YoY</div>
              <div
                className="ln-num"
                style={{
                  fontSize: 18,
                  color: yoyDelta < 0 ? "var(--ln-crit)" : "var(--ln-brand)",
                }}
              >
                {yoyDelta >= 0 ? "+" : "−"}
                {Math.abs(yoyDelta).toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isTabletDown ? "1fr" : "1.4fr 1fr",
          borderBottom: "1px solid var(--ln-line)",
        }}
      >
        <div
          style={{
            borderRight: isTabletDown ? "none" : "1px solid var(--ln-line)",
            borderBottom: isTabletDown ? "1px solid var(--ln-line)" : "none",
            padding: isMobile ? 14 : 22,
            height: isMobile ? 260 : 340,
          }}
        >
          <WorldMap
            width={isMobile ? 380 : 720}
            height={isMobile ? 220 : 300}
            outbreaks={mapOutbreaks}
            regionRisk={regionRisk}
            showChoropleth
            pulse
            dotSpacing={10}
          />
        </div>
        <div style={{ padding: isMobile ? 14 : 22 }}>
          <span className="ln-eyebrow">Sub-indices · global</span>
          <h3 style={{ fontSize: 16, margin: "6px 0 14px", fontWeight: 500 }}>
            What's pulling the index up — and down
          </h3>
          {SUB_INDICES.map((s) => (
            <div
              key={s.l}
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "140px 1fr 40px" : "200px 1fr 40px",
                alignItems: "center",
                gap: 12,
                padding: "8px 0",
                borderBottom: "1px solid var(--ln-line)",
              }}
            >
              <span style={{ fontSize: 12.5, color: "var(--ln-ink-2)" }}>{s.l}</span>
              <div style={{ height: 6, background: "rgba(255,255,255,0.04)", position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: `${s.v * 10}%`,
                    background: s.v >= 7 ? "var(--ln-brand)" : s.v >= 5.5 ? "var(--ln-warn)" : "var(--ln-crit)",
                  }}
                />
              </div>
              <span className="ln-num" style={{ fontSize: 13, textAlign: "right" }}>
                {s.v.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <PaneHead eyebrow="Country rankings" title="GHI · top & bottom" />
        {!isMobile && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "40px 1.5fr 80px 80px 80px 1fr",
              alignItems: "center",
              gap: 12,
              padding: "8px 22px",
              borderBottom: "1px solid var(--ln-line)",
              fontFamily: "var(--ln-font-mono)",
              fontSize: 10,
              letterSpacing: "0.08em",
              color: "var(--ln-ink-4)",
            }}
          >
            <span>RANK</span>
            <span>COUNTRY</span>
            <span style={{ textAlign: "right" }}>GHI</span>
            <span style={{ textAlign: "right" }}>OUTBR</span>
            <span style={{ textAlign: "right" }}>CASES</span>
            <span>NOTES</span>
          </div>
        )}
        {COUNTRY_GHI.map((c, i) => {
          const liveRisk = riskByCountry.get(c.name);
          return (
            <div
              key={c.name}
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "30px 1fr 60px"
                  : "40px 1.5fr 80px 80px 80px 1fr",
                alignItems: "center",
                gap: 12,
                padding: isMobile ? "10px 14px" : "10px 22px",
                borderBottom: "1px solid var(--ln-line)",
              }}
            >
              <span className="ln-num" style={{ fontSize: 12, color: "var(--ln-ink-4)" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: 13 }}>{c.name}</span>
                {isMobile && (
                  <div style={{ fontSize: 10, color: "var(--ln-ink-4)", fontFamily: "var(--ln-font-mono)" }}>
                    {c.outbreaks} outbreaks · {c.cases.toLocaleString()} cases
                  </div>
                )}
              </div>
              <span
                className="ln-num"
                style={{
                  fontSize: 14,
                  textAlign: "right",
                  color: c.ghi >= 7 ? "var(--ln-brand)" : c.ghi >= 5 ? "var(--ln-warn)" : "var(--ln-crit)",
                }}
              >
                {c.ghi.toFixed(1)}
              </span>
              {!isMobile && (
                <>
                  <span
                    className="ln-num"
                    style={{ fontSize: 12, textAlign: "right", color: "var(--ln-ink-2)" }}
                  >
                    {c.outbreaks}
                  </span>
                  <span
                    className="ln-num"
                    style={{ fontSize: 12, textAlign: "right", color: "var(--ln-ink-3)" }}
                  >
                    {c.cases.toLocaleString()}
                  </span>
                  <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {liveRisk && (
                      <span
                        className={`ln-chip ${
                          liveRisk === "critical" ? "is-crit" : liveRisk === "high" ? "is-warn" : "is-info"
                        }`}
                        style={{ fontSize: 10 }}
                      >
                        LIVE · {liveRisk.toUpperCase()}
                      </span>
                    )}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
