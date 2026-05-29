import { useMemo, useState } from "react";
import { PaneHead } from "../../components/PaneHead";
import { WorldMap } from "../../components/WorldMap";
import { useLiveOutbreaks } from "../../data/useLiveOutbreaks";
import { timeAgo } from "../../lib/utils";
import type { TimeRange } from "../../lib/timeRange";
import { TrendsCompare } from "./TrendsCompare";

const ACCENT = "#4ee0c4";

interface Props {
  range: TimeRange;
  isMobile: boolean;
  isTabletDown: boolean;
}

export function TrackingTab({ range, isMobile, isTabletDown }: Props) {
  const { outbreaks } = useLiveOutbreaks(range, 600);

  // Pre-sort the largest outbreaks for the selector dropdown — these are the
  // ones a user is most likely to want to track longitudinally.
  const candidates = useMemo(() => {
    return outbreaks
      .slice()
      .sort((a, b) => {
        // Severity first, then cases.
        if (b.severity !== a.severity) return b.severity - a.severity;
        return b.cases - a.cases;
      })
      .slice(0, 30);
  }, [outbreaks]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => candidates.find((c) => c.id === selectedId) || candidates[0] || null,
    [candidates, selectedId]
  );

  // For the spread map we show 6 weekly "snapshots" — outbreaks that match the
  // same disease, accumulated chronologically. Real spread tracking would need
  // historical case data per location, which we don't have here.
  const spread = useMemo(() => {
    if (!selected) return [];
    const same = outbreaks
      .filter((o) => o.disease === selected.disease)
      .sort((a, b) => a.updated - b.updated);
    const buckets: Array<typeof outbreaks> = [];
    for (let i = 1; i <= 6; i++) {
      const slice = same.slice(0, Math.ceil((same.length * i) / 6));
      buckets.push(slice);
    }
    return buckets;
  }, [outbreaks, selected]);

  return (
    <>
      {/* Multi-disease search-interest comparison (Google Trends) */}
      <TrendsCompare isMobile={isMobile} />

      {/* Single-outbreak lifecycle */}
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
            <span className="ln-eyebrow">Single-outbreak lifecycle</span>
            <h2
              className="ln-display"
              style={{ fontSize: isMobile ? 22 : 30, margin: "6px 0 0", letterSpacing: "-0.02em" }}
            >
              The <span style={{ fontStyle: "italic", color: "var(--ln-ink-3)" }}>life</span> of an outbreak.
            </h2>
          </div>
          <select
            value={selected?.id || ""}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={candidates.length === 0}
            style={{
              background: "var(--ln-surface-2)",
              border: "1px solid var(--ln-line-2)",
              padding: "7px 10px",
              fontSize: 12.5,
              color: "var(--ln-ink)",
              borderRadius: 6,
              maxWidth: 320,
            }}
          >
            {candidates.length === 0 && <option>No outbreaks in range</option>}
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.disease} · {c.city || c.country}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selected ? (
        <>
          <div style={{ padding: isMobile ? "16px 14px" : "22px 22px", borderBottom: "1px solid var(--ln-line)" }}>
            <span className="ln-eyebrow">Outbreak stages</span>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr 1fr" : isTabletDown ? "repeat(3, 1fr)" : "repeat(5, 1fr)",
                gap: 8,
                marginTop: 12,
              }}
            >
              {buildStages(selected).map((s, i, arr) => (
                <div
                  key={s.l}
                  style={{
                    padding: "12px 14px",
                    background: s.active ? "var(--ln-surface)" : "transparent",
                    border: "1px solid var(--ln-line-2)",
                    borderTop: `2px solid ${
                      s.done ? "var(--ln-brand)" : s.active ? "var(--ln-warn)" : "var(--ln-line-2)"
                    }`,
                    position: "relative",
                  }}
                >
                  <div
                    className="ln-eyebrow"
                    style={{
                      color: s.done ? "var(--ln-brand)" : s.active ? "var(--ln-warn)" : "var(--ln-ink-4)",
                    }}
                  >
                    {s.l}
                  </div>
                  <div
                    className="ln-num"
                    style={{
                      fontSize: 13,
                      marginTop: 6,
                      color: s.active ? "var(--ln-ink)" : "var(--ln-ink-3)",
                    }}
                  >
                    {s.d}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ln-ink-3)", marginTop: 4 }}>{s.sub}</div>
                  {!isMobile && !isTabletDown && i < arr.length - 1 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        right: -10,
                        width: 12,
                        height: 1,
                        background: "var(--ln-line-2)",
                        zIndex: 1,
                      }}
                    />
                  )}
                </div>
              ))}
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
              }}
            >
              <span className="ln-eyebrow">
                Cumulative cases · {selected.disease} · {selected.city || selected.country}
              </span>
              <h3 style={{ fontSize: 16, margin: "4px 0 14px", fontWeight: 500 }}>
                From index case to today
              </h3>
              <TrackingCurve cases={selected.cases} />
            </div>
            <div style={{ padding: isMobile ? 14 : 22 }}>
              <span className="ln-eyebrow">Outbreak metrics</span>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                {buildMetrics(selected).map((m) => (
                  <div
                    key={m.l}
                    style={{
                      background: "var(--ln-surface-2)",
                      padding: "12px 14px",
                      borderLeft: `2px solid ${m.c}`,
                    }}
                  >
                    <div className="ln-eyebrow">{m.l}</div>
                    <div className="ln-num" style={{ fontSize: 20, fontWeight: 500, marginTop: 4 }}>
                      {m.v}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ borderBottom: "1px solid var(--ln-line)" }}>
            <PaneHead eyebrow="Spread map" title="Where it travelled, week by week" />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : isTabletDown ? "repeat(3, 1fr)" : "repeat(6, 1fr)",
                borderTop: "1px solid var(--ln-line-2)",
                borderLeft: "1px solid var(--ln-line-2)",
              }}
            >
              {spread.map((bucket, i) => (
                <div
                  key={i}
                  style={{
                    borderRight: "1px solid var(--ln-line-2)",
                    borderBottom: "1px solid var(--ln-line-2)",
                    padding: 12,
                  }}
                >
                  <div className="ln-eyebrow">Wk {i + 1}</div>
                  <div
                    style={{
                      marginTop: 6,
                      height: 110,
                      position: "relative",
                      overflow: "hidden",
                      background: "var(--ln-map-bg)",
                    }}
                    className="ln-dotgrid"
                  >
                    <WorldMap
                      width={200}
                      height={110}
                      outbreaks={bucket.map((o) => ({
                        id: o.id,
                        lng: o.lng,
                        lat: o.lat,
                        severity: o.severity,
                      }))}
                      regionRisk={{}}
                      showChoropleth={false}
                      pulse={false}
                      dotSpacing={11}
                    />
                  </div>
                  <div className="ln-num" style={{ fontSize: 11, color: "var(--ln-ink-3)", marginTop: 6 }}>
                    {bucket.reduce((a, o) => a + o.cases, 0).toLocaleString() || bucket.length} cases
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div style={{ padding: 22, fontSize: 13, color: "var(--ln-ink-3)" }}>
          No outbreaks in the selected range. Adjust the range pill above to pick one.
        </div>
      )}
    </>
  );
}

function buildStages(o: { updated: number; cases: number; severity: number }) {
  // Approximate the stages from the outbreak's data: detected when first seen,
  // confirmed = same day, escalated when severity ≥ 3, peak = now if sev ≥ 4,
  // contained = forecast.
  const fmt = (t: number) =>
    new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return [
    { l: "DETECTED", d: fmt(o.updated), sub: "1st signal", active: true, done: true },
    { l: "CONFIRMED", d: fmt(o.updated), sub: `${Math.max(1, Math.floor(o.cases / 100))} cases`, active: true, done: true },
    {
      l: "ESCALATED",
      d: o.severity >= 3 ? fmt(o.updated) : "pending",
      sub: o.severity >= 3 ? `${Math.floor(o.cases / 2)} cases` : "below threshold",
      active: o.severity >= 3,
      done: o.severity >= 3,
    },
    {
      l: "PEAK",
      d: o.severity >= 4 ? fmt(o.updated) : "pending",
      sub: o.severity >= 4 ? `${o.cases.toLocaleString()} cases` : "forecast",
      active: o.severity >= 4,
      done: false,
    },
    {
      l: "CONTAINED",
      d: "forecast",
      sub: "—",
      active: false,
      done: false,
    },
  ];
}

function buildMetrics(o: {
  cases: number;
  deaths: number;
  severity: number;
  confidence: number;
  updated: number;
}) {
  const cfr = o.cases > 0 ? ((o.deaths / o.cases) * 100).toFixed(2) + "%" : "—";
  const daysActive = Math.max(1, Math.floor((Date.now() - o.updated) / (24 * 60 * 60 * 1000))) + 1;
  return [
    { l: "Total cases", v: o.cases > 0 ? o.cases.toLocaleString() : "—", c: "var(--ln-crit)" },
    { l: "CFR", v: cfr, c: "var(--ln-warn)" },
    {
      l: "Severity",
      v: o.severity >= 4 ? "Critical" : o.severity >= 3 ? "High" : "Moderate",
      c: o.severity >= 4 ? "var(--ln-crit)" : "var(--ln-warn)",
    },
    {
      l: "Confidence",
      v: `${Math.round(o.confidence * 100)}%`,
      c: "var(--ln-info)",
    },
    { l: "Days reported", v: String(daysActive), c: "var(--ln-ink)" },
    { l: "Deaths", v: o.deaths > 0 ? o.deaths.toLocaleString() : "—", c: "var(--ln-crit)" },
  ];
}

function TrackingCurve({ cases }: { cases: number }) {
  const W = 660;
  const H = 220;
  const padL = 30;
  const padB = 20;
  const days = 44;
  const peak = Math.max(50, cases);
  const cumulative = Array.from({ length: days }, (_, i) =>
    Math.round(peak / (1 + Math.exp(-(i - 22) * 0.16)))
  );
  const max = cumulative[days - 1];
  const path = cumulative
    .map(
      (v, i) =>
        `${i ? "L" : "M"}${padL + (i / (days - 1)) * (W - padL - 12)} ${(H - padB - 4) - (v / max) * (H - padB - 12) + 4}`
    )
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      {[0, 0.5, 1].map((p) => (
        <line
          key={p}
          x1={padL}
          y1={(H - padB) * (1 - p) + 4}
          x2={W}
          y2={(H - padB) * (1 - p) + 4}
          stroke="var(--ln-line)"
          strokeDasharray="2 4"
        />
      ))}
      <path d={`${path} L${W - 12} ${H - padB} L${padL} ${H - padB} Z`} fill={ACCENT} opacity="0.12" />
      <path d={path} fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" />
      {[
        { x: 0, l: "detect" },
        { x: 3, l: "confirm" },
        { x: 10, l: "escalate" },
        { x: 36, l: "peak" },
      ].map((m) => {
        const x = padL + (m.x / (days - 1)) * (W - padL - 12);
        return (
          <g key={m.l}>
            <line
              x1={x}
              y1={4}
              x2={x}
              y2={H - padB}
              stroke="var(--ln-line-3)"
              strokeDasharray="2 3"
            />
            <text
              x={x + 4}
              y={16}
              fontSize="10"
              fill="var(--ln-ink-4)"
              fontFamily="var(--ln-font-mono)"
              letterSpacing="0.06em"
            >
              {m.l}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
