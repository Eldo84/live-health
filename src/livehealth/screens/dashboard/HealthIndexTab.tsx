import { useMemo } from "react";
import { PaneHead } from "../../components/PaneHead";
import { WorldMap } from "../../components/WorldMap";
import { useLiveRegionRisk } from "../../data/useLiveRegionRisk";
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

// GHI scores aren't currently tracked in our database, so we keep the curated
// 14-country roster the design ships with. Replace with real data once a GHI
// source exists.
const COUNTRY_GHI: Array<{
  name: string;
  ghi: number;
  change: number;
  pop: string;
  ds: string[];
}> = [
  { name: "Norway", ghi: 8.9, change: -0.1, pop: "5.5M", ds: ["Vaccination 96%", "Surveillance ★", "Sanitation ★"] },
  { name: "Switzerland", ghi: 8.7, change: 0, pop: "8.8M", ds: ["Vaccination 95%", "Surveillance ★", "Sanitation ★"] },
  { name: "Singapore", ghi: 8.6, change: 0.1, pop: "5.9M", ds: ["Surveillance ★", "Lab capacity ★"] },
  { name: "Australia", ghi: 8.4, change: -0.1, pop: "26M", ds: ["Vaccination 94%", "Surveillance ★"] },
  { name: "Canada", ghi: 8.2, change: 0, pop: "40M", ds: ["Surveillance ★", "Sanitation ★"] },
  { name: "Germany", ghi: 8.1, change: -0.2, pop: "84M", ds: ["Vaccination 91%"] },
  { name: "Japan", ghi: 8.0, change: 0.1, pop: "125M", ds: ["Lab capacity ★"] },
  { name: "United Kingdom", ghi: 7.6, change: -0.3, pop: "67M", ds: ["Vaccination 89%"] },
  { name: "United States", ghi: 7.4, change: -0.4, pop: "335M", ds: ["Lab capacity ★", "Coverage gaps ⚠"] },
  { name: "Brazil", ghi: 6.2, change: -0.5, pop: "215M", ds: ["Vector pressure ⚠"] },
  { name: "India", ghi: 5.4, change: 0.2, pop: "1.4B", ds: ["Scale ★", "Density ⚠"] },
  { name: "Nigeria", ghi: 4.2, change: -0.3, pop: "220M", ds: ["Polio risk ⚠", "WaSH gap ⚠"] },
  { name: "DR Congo", ghi: 3.6, change: -0.4, pop: "99M", ds: ["Multi-outbreak ⚠"] },
  { name: "Yemen", ghi: 2.9, change: -0.5, pop: "34M", ds: ["Cholera risk ⚠"] },
];

export function HealthIndexTab({ isMobile, isTabletDown }: Props) {
  const { regionRisk } = useLiveRegionRisk("30d");
  const { data: regions } = useRegionalRiskLevels("30d");

  // Tag GHI rows with a small chip flagging current live risk so we don't just
  // show static data — the chip pulls from Supabase, the score itself stays curated.
  const riskByCountry = useMemo(() => {
    const m = new Map<string, "low" | "medium" | "high" | "critical">();
    for (const r of regions) {
      for (const c of r.countries) {
        m.set(c.name, c.riskLevel);
      }
    }
    return m;
  }, [regions]);

  const avg = COUNTRY_GHI.reduce((a, c) => a + c.ghi, 0) / COUNTRY_GHI.length;

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
              <div className="ln-num" style={{ fontSize: 18, color: "var(--ln-crit)" }}>
                −0.2
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
            outbreaks={[]}
            regionRisk={regionRisk}
            showChoropleth
            pulse={false}
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
            <span style={{ textAlign: "right" }}>Δ YoY</span>
            <span style={{ textAlign: "right" }}>POP</span>
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
                    {c.pop} · Δ {c.change > 0 ? "+" : ""}
                    {c.change.toFixed(1)}
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
                    style={{
                      fontSize: 12,
                      textAlign: "right",
                      color:
                        c.change > 0
                          ? "var(--ln-brand)"
                          : c.change < 0
                          ? "var(--ln-crit)"
                          : "var(--ln-ink-3)",
                    }}
                  >
                    {c.change > 0 ? "+" : ""}
                    {c.change.toFixed(1)}
                  </span>
                  <span
                    className="ln-num"
                    style={{ fontSize: 12, textAlign: "right", color: "var(--ln-ink-3)" }}
                  >
                    {c.pop}
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
                    {c.ds.map((d) => (
                      <span key={d} className="ln-chip" style={{ fontSize: 10 }}>
                        {d}
                      </span>
                    ))}
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
