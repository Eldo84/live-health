import { useMemo } from "react";
import { Sparkline } from "../../components/Sparkline";
import { PaneHead } from "../../components/PaneHead";
import { useLiveDiseases } from "../../data/useLiveDiseases";
import { useLiveOutbreaks } from "../../data/useLiveOutbreaks";
import { useLiveSeries } from "../../data/useLiveSeries";
import { compactNumber } from "../../lib/utils";
import type { TimeRange } from "../../lib/timeRange";
import { toDashboardRange } from "../../lib/timeRange";
import { T } from "../../components/T";
import { useT } from "../../lib/useT";

const ACCENT = "#4ee0c4";

interface Props {
  range: TimeRange;
  isMobile: boolean;
  isTabletDown: boolean;
}

export function AnalyticsTab({ range, isMobile, isTabletDown }: Props) {
  const supaRange = toDashboardRange(range);
  const { diseases } = useLiveDiseases(supaRange);
  const { outbreaks } = useLiveOutbreaks(range, 600);
  const { series } = useLiveSeries(supaRange);

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isTabletDown ? "1fr" : "1fr 1fr",
          borderBottom: "1px solid var(--ln-line)",
        }}
      >
        <DistributionPie diseases={diseases} isMobile={isMobile} />
        <div
          style={{
            borderLeft: isTabletDown ? "none" : "1px solid var(--ln-line)",
            borderTop: isTabletDown ? "1px solid var(--ln-line)" : "none",
          }}
        >
          <TrendAnalysis series={series} isMobile={isMobile} />
        </div>
      </div>
      <AlertTimeline outbreaks={outbreaks} isMobile={isMobile} />
    </>
  );
}

function DistributionPie({
  diseases,
  isMobile,
}: {
  diseases: ReturnType<typeof useLiveDiseases>["diseases"];
  isMobile: boolean;
}) {
  const tOther = useT("Other");
  const tDetected = useT("DETECTED");
  const tTotal = useT("TOTAL");
  const tNoCaseCounts = useT("NO CASE COUNTS");
  const slices = useMemo(() => {
    const top = diseases.slice(0, 5);
    const rest = diseases.slice(5);
    const out = top.map((d) => ({ label: d.label, value: d.cases, color: d.color }));
    if (rest.length) {
      out.push({
        label: tOther,
        value: rest.reduce((a, d) => a + d.cases, 0),
        color: "#b07cff",
      });
    }
    return out;
  }, [diseases, tOther]);

  const total = slices.reduce((a, s) => a + s.value, 0);
  // When every disease reports 0 cases in this range, draw an equal-share ring
  // so the donut still renders. The center label flips to "—" + a hint instead
  // of showing "0".
  const placeholderRing = total === 0 && slices.length > 0;

  const { arcs } = useMemo(() => {
    let a0 = -Math.PI / 2;
    const list: Array<{ d: string; color: string }> = [];
    const cx = 110;
    const cy = 110;
    const r = 90;
    const rIn = 56;
    const denom = placeholderRing ? slices.length : Math.max(1, total);
    for (const s of slices) {
      const weight = placeholderRing ? 1 : s.value;
      const a1 = a0 + (weight / denom) * Math.PI * 2;
      const x0 = cx + r * Math.cos(a0);
      const y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1);
      const y1 = cy + r * Math.sin(a1);
      const xi0 = cx + rIn * Math.cos(a1);
      const yi0 = cy + rIn * Math.sin(a1);
      const xi1 = cx + rIn * Math.cos(a0);
      const yi1 = cy + rIn * Math.sin(a0);
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const d = `M${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1} L${xi0} ${yi0} A${rIn} ${rIn} 0 ${large} 0 ${xi1} ${yi1} Z`;
      list.push({ d, color: s.color });
      a0 = a1;
    }
    return { arcs: list };
  }, [slices, total, placeholderRing]);

  return (
    <div style={{ padding: isMobile ? "14px 14px" : "16px 18px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span className="ln-eyebrow"><T>Distribution · current range</T></span>
          <h2 style={{ fontSize: 18, margin: "4px 0 0", fontWeight: 500 }}>
            <T>Disease distribution by reports</T>
          </h2>
        </div>
        <span className="ln-chip is-info">{slices.length} <T>categories</T></span>
      </div>
      {slices.length === 0 ? (
        <div style={{ marginTop: 24, fontSize: 12, color: "var(--ln-ink-3)" }}>
          <T>No disease data for this range.</T>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "220px 1fr",
            gap: 24,
            marginTop: 16,
            alignItems: "center",
          }}
        >
          <svg viewBox="0 0 220 220" width="220" height="220" style={{ justifySelf: "center" }}>
            {/* Background ring so the donut always reads against either theme,
                even before / instead of any colored slices. */}
            <circle cx="110" cy="110" r="90" fill="var(--ln-surface-2)" />
            <circle cx="110" cy="110" r="56" fill="var(--ln-bg)" />
            {arcs.map((a, i) => (
              <path
                key={i}
                d={a.d}
                fill={a.color}
                opacity={placeholderRing ? 0.55 : 0.9}
                stroke="var(--ln-bg)"
                strokeWidth="1.5"
              />
            ))}
            <text
              x="110"
              y={placeholderRing ? 100 : 105}
              textAnchor="middle"
              fill="var(--ln-ink-3)"
              fontFamily="var(--ln-font-mono)"
              fontSize="10"
              letterSpacing="0.1em"
            >
              {placeholderRing ? tDetected : tTotal}
            </text>
            <text
              x="110"
              y={placeholderRing ? 120 : 125}
              textAnchor="middle"
              fill="var(--ln-ink)"
              fontFamily="var(--ln-font-mono)"
              fontSize="20"
              fontWeight="500"
            >
              {placeholderRing ? slices.length : compactNumber(total)}
            </text>
            {placeholderRing && (
              <text
                x="110"
                y="138"
                textAnchor="middle"
                fill="var(--ln-ink-4)"
                fontFamily="var(--ln-font-mono)"
                fontSize="8"
                letterSpacing="0.1em"
              >
                {tNoCaseCounts}
              </text>
            )}
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {slices.map((s) => (
              <div
                key={s.label}
                style={{
                  display: "grid",
                  gridTemplateColumns: "12px 1fr auto auto",
                  alignItems: "center",
                  gap: 10,
                  paddingBottom: 6,
                  borderBottom: "1px solid var(--ln-line)",
                }}
              >
                <span style={{ width: 10, height: 10, background: s.color, borderRadius: 2 }} />
                <span style={{ fontSize: 12.5 }}>{s.label}</span>
                <span className="ln-num" style={{ fontSize: 12, color: "var(--ln-ink-2)" }}>
                  {s.value.toLocaleString()}
                </span>
                <span className="ln-num" style={{ fontSize: 11, color: "var(--ln-ink-4)" }}>
                  {total ? ((s.value / total) * 100).toFixed(1) : "0.0"}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TrendAnalysis({
  series,
  isMobile,
}: {
  series: ReturnType<typeof useLiveSeries>["series"];
  isMobile: boolean;
}) {
  // Derive a simple Rt-ish ratio from the last 7 vs prior 7 buckets, and a
  // doubling-time estimate from the recent growth rate.
  const rows = useMemo(() => {
    return series.slice(0, 6).map((s) => {
      const data = s.data;
      const n = data.length;
      const recent = data.slice(Math.max(0, n - 7)).reduce((a, v) => a + v, 0);
      const prior = data.slice(Math.max(0, n - 14), n - 7).reduce((a, v) => a + v, 0);
      const ratio = prior > 0 ? recent / prior : recent > 0 ? 1.4 : 0;
      const dailyGrowth = prior > 0 ? Math.log(Math.max(1.001, ratio)) / 7 : 0;
      const dbl = dailyGrowth > 0.01 ? `${(Math.log(2) / dailyGrowth).toFixed(1)}d` : "—";
      const trend = ratio > 1.05 ? "up" : ratio < 0.95 ? "down" : "flat";
      return {
        name: s.label,
        rt: ratio,
        dbl,
        spark: data.slice(-14),
        color: s.color,
        trend,
      };
    });
  }, [series]);

  return (
    <div style={{ padding: isMobile ? "14px 14px" : "16px 18px 18px" }}>
      <span className="ln-eyebrow"><T>Trend analysis</T></span>
      <h2 style={{ fontSize: 18, margin: "4px 0 14px", fontWeight: 500 }}>
        <T>Reproduction ratio & doubling time</T>
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 48px 56px 36px" : "1fr 56px 64px 110px 40px",
          gap: isMobile ? 8 : 10,
          padding: "6px 0",
          borderBottom: "1px solid var(--ln-line)",
          fontFamily: "var(--ln-font-mono)",
          fontSize: 10,
          letterSpacing: "0.08em",
          color: "var(--ln-ink-4)",
        }}
      >
        <span><T>PATHOGEN</T></span>
        <span style={{ textAlign: "right" }}>Rt</span>
        <span style={{ textAlign: "right" }}><T>DBL</T></span>
        {!isMobile && <span style={{ textAlign: "right" }}><T>14D TREND</T></span>}
        <span style={{ textAlign: "right" }}><T>DIR</T></span>
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: 18, fontSize: 12, color: "var(--ln-ink-3)" }}>
          <T>Not enough data to compute trends yet.</T>
        </div>
      ) : (
        rows.map((r) => (
          <div
            key={r.name}
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 48px 56px 36px" : "1fr 56px 64px 110px 40px",
              gap: isMobile ? 8 : 10,
              padding: "10px 0",
              borderBottom: "1px solid var(--ln-line)",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: isMobile ? 12 : 13,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={r.name}
            >
              {r.name}
            </span>
            <span
              className="ln-num"
              style={{
                fontSize: isMobile ? 13 : 14,
                textAlign: "right",
                color: r.rt >= 1.3 ? "var(--ln-crit)" : r.rt >= 1 ? "var(--ln-warn)" : "var(--ln-brand)",
              }}
            >
              {r.rt ? r.rt.toFixed(2) : "—"}
            </span>
            <span className="ln-num" style={{ fontSize: 12, textAlign: "right", color: "var(--ln-ink-3)" }}>
              {r.dbl}
            </span>
            {!isMobile && (
              <span style={{ display: "flex", justifyContent: "flex-end" }}>
                <Sparkline
                  data={r.spark}
                  width={100}
                  height={20}
                  color={
                    r.trend === "up"
                      ? "var(--ln-crit)"
                      : r.trend === "down"
                      ? "var(--ln-brand)"
                      : "var(--ln-warn)"
                  }
                />
              </span>
            )}
            <span
              style={{
                textAlign: "right",
                color:
                  r.trend === "up"
                    ? "var(--ln-crit)"
                    : r.trend === "down"
                    ? "var(--ln-brand)"
                    : "var(--ln-warn)",
                fontFamily: "var(--ln-font-mono)",
                fontSize: 11,
              }}
            >
              {r.trend === "up" ? "▲" : r.trend === "down" ? "▼" : "◆"}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

function AlertTimeline({
  outbreaks,
  isMobile,
}: {
  outbreaks: ReturnType<typeof useLiveOutbreaks>["outbreaks"];
  isMobile: boolean;
}) {
  const tEyebrow = useT("Alert timeline · 14 days · 6-hour bins");
  const tTitle = useT("Volume heatmap — when do we get hit");
  // 14 days × 4 6-hour slots → count alerts per cell
  const cells = useMemo(() => {
    const grid = Array.from({ length: 14 * 4 }, () => 0);
    const now = Date.now();
    const start = now - 14 * 24 * 60 * 60 * 1000;
    for (const o of outbreaks) {
      if (o.updated < start) continue;
      const daysAgo = Math.floor((now - o.updated) / (24 * 60 * 60 * 1000));
      if (daysAgo < 0 || daysAgo >= 14) continue;
      const hour = new Date(o.updated).getUTCHours();
      const slot = Math.floor(hour / 6);
      const day = 13 - daysAgo;
      const idx = slot * 14 + day;
      grid[idx] += 1;
    }
    return grid;
  }, [outbreaks]);

  return (
    <div style={{ borderBottom: "1px solid var(--ln-line)" }}>
      <PaneHead eyebrow={tEyebrow} title={tTitle} />
      <div style={{ padding: isMobile ? "14px 14px 16px" : "14px 22px 20px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "52px 1fr" : "70px 1fr",
            gap: isMobile ? 8 : 12,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              fontFamily: "var(--ln-font-mono)",
              fontSize: 10,
              color: "var(--ln-ink-4)",
              paddingRight: 8,
              textAlign: "right",
            }}
          >
            {["00–06", "06–12", "12–18", "18–24"].map((h) => (
              <span key={h}>{h}</span>
            ))}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(14, 1fr)",
              gridTemplateRows: "repeat(4, 1fr)",
              gap: 3,
              height: 140,
            }}
          >
            {cells.map((v, i) => (
              <div
                key={i}
                title={`${v} signal${v === 1 ? "" : "s"}`}
                style={{
                  background:
                    v >= 5
                      ? "var(--ln-crit)"
                      : v >= 3
                      ? "var(--ln-warn)"
                      : v >= 1
                      ? `color-mix(in oklab, ${ACCENT} 55%, transparent)`
                      : "rgba(255,255,255,0.04)",
                  opacity: v >= 5 ? 1 : v >= 3 ? 0.85 : v >= 1 ? 0.6 : 1,
                }}
              />
            ))}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 8,
            fontFamily: "var(--ln-font-mono)",
            fontSize: 10,
            color: "var(--ln-ink-4)",
          }}
        >
          <span><T>14d ago</T></span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span><T>fewer</T></span>
            <span style={{ width: 14, height: 8, background: "rgba(255,255,255,0.04)" }} />
            <span style={{ width: 14, height: 8, background: "color-mix(in oklab, var(--ln-brand) 55%, transparent)" }} />
            <span style={{ width: 14, height: 8, background: "var(--ln-warn)" }} />
            <span style={{ width: 14, height: 8, background: "var(--ln-crit)" }} />
            <span><T>more</T></span>
          </div>
          <span><T>now</T></span>
        </div>
      </div>
    </div>
  );
}
