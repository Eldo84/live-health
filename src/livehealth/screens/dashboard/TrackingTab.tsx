import { useMemo, useRef, useState } from "react";
import { PaneHead } from "../../components/PaneHead";
import { WorldMap } from "../../components/WorldMap";
import { useLiveOutbreaks } from "../../data/useLiveOutbreaks";
import { timeAgo } from "../../lib/utils";
import type { TimeRange } from "../../lib/timeRange";
import { TrendsCompare } from "./TrendsCompare";
import { T } from "../../components/T";
import { useT } from "../../lib/useT";

const ACCENT = "#4ee0c4";

interface Props {
  range: TimeRange;
  isMobile: boolean;
  isTabletDown: boolean;
}

export function TrackingTab({ range, isMobile, isTabletDown }: Props) {
  const tNoOutbreaksInRange = useT("No outbreaks in range");
  const tCurveInfo = useT(
    "Modeled cumulative-case curve (logistic S-growth) from the index case to today. Dashed markers flag detection, confirmation, escalation and the projected peak. Hover the curve to read the running total on any day; the real reported total is in the metrics panel."
  );
  const tSpreadMap = useT("Spread map");
  const tSpreadTitle = useT("Where it travelled, week by week");
  const tSpreadInfoPre = useT("Each panel adds the locations reporting");
  const tSpreadInfoPost = useT(
    "up to that point, accumulated across six equal time slices — a proxy for geographic spread from the first signal to now. Hover a week for its location and case totals."
  );
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
  const [hoverWeek, setHoverWeek] = useState<number | null>(null);
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
            <span className="ln-eyebrow"><T>Single-outbreak lifecycle</T></span>
            <h2
              className="ln-display"
              style={{ fontSize: isMobile ? 22 : 30, margin: "6px 0 0", letterSpacing: "-0.02em" }}
            >
              <T>The</T> <span style={{ fontStyle: "italic", color: "var(--ln-ink-3)" }}><T>life</T></span> <T>of an outbreak.</T>
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
            {candidates.length === 0 && <option>{tNoOutbreaksInRange}</option>}
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
            <span className="ln-eyebrow"><T>Outbreak stages</T></span>
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
                    <T>{s.l}</T>
                  </div>
                  <div
                    className="ln-num"
                    style={{
                      fontSize: 13,
                      marginTop: 6,
                      color: s.active ? "var(--ln-ink)" : "var(--ln-ink-3)",
                    }}
                  >
                    {s.dWord ? <T>{s.d}</T> : s.d}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ln-ink-3)", marginTop: 4 }}>
                    {s.subWord ? <T>{s.sub}</T> : s.sub}
                  </div>
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
                <T>Cumulative cases</T> · {selected.disease} · {selected.city || selected.country}
              </span>
              <h3 style={{ fontSize: 16, margin: "4px 0 14px", fontWeight: 500, display: "flex", alignItems: "center" }}>
                <T>From index case to today</T>
                <InfoDot text={tCurveInfo} />
              </h3>
              <TrackingCurve cases={selected.cases} />
            </div>
            <div style={{ padding: isMobile ? 14 : 22 }}>
              <span className="ln-eyebrow"><T>Outbreak metrics</T></span>
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
                    <div className="ln-eyebrow"><T>{m.l}</T></div>
                    <div className="ln-num" style={{ fontSize: 20, fontWeight: 500, marginTop: 4 }}>
                      {m.vWord ? <T>{m.v}</T> : m.v}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ borderBottom: "1px solid var(--ln-line)" }}>
            <PaneHead
              eyebrow={tSpreadMap}
              title={tSpreadTitle}
              right={
                <InfoDot
                  text={`${tSpreadInfoPre} ${selected.disease} ${tSpreadInfoPost}`}
                />
              }
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : isTabletDown ? "repeat(3, 1fr)" : "repeat(6, 1fr)",
                borderTop: "1px solid var(--ln-line-2)",
                borderLeft: "1px solid var(--ln-line-2)",
              }}
            >
              {spread.map((bucket, i) => {
                const weekCases = bucket.reduce((a, o) => a + o.cases, 0);
                const weekLocs = bucket.length;
                return (
                  <div
                    key={i}
                    onMouseEnter={() => setHoverWeek(i)}
                    onMouseLeave={() => setHoverWeek((w) => (w === i ? null : w))}
                    style={{
                      borderRight: "1px solid var(--ln-line-2)",
                      borderBottom: "1px solid var(--ln-line-2)",
                      padding: 12,
                    }}
                  >
                    <div className="ln-eyebrow"><T>Wk</T> {i + 1}</div>
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
                      {/* Descriptive per-week tooltip */}
                      {hoverWeek === i && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 4,
                            background: "color-mix(in oklab, var(--ln-elev-bg) 92%, transparent)",
                            border: "1px solid var(--ln-line-3)",
                            borderRadius: 4,
                            padding: "6px 8px",
                            fontSize: 9.5,
                            lineHeight: 1.4,
                            color: "var(--ln-ink-2)",
                            zIndex: 4,
                            pointerEvents: "none",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                          }}
                        >
                          <strong style={{ color: "var(--ln-ink)", fontSize: 11 }}><T>Week</T> {i + 1} <T>of 6</T></strong>
                          <span style={{ marginTop: 2 }}>
                            {weekLocs} {weekLocs === 1 ? <T>location</T> : <T>locations</T>} ·{" "}
                            {weekCases > 0 ? weekCases.toLocaleString() : weekLocs} <T>cases</T>
                          </span>
                          <span style={{ marginTop: 2, color: "var(--ln-ink-3)" }}>
                            <T>cumulative spread of</T> {selected.disease} <T>to this point</T>
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ln-num" style={{ fontSize: 11, color: "var(--ln-ink-3)", marginTop: 6 }}>
                      {weekCases > 0 ? weekCases.toLocaleString() : weekLocs} <T>cases</T>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div style={{ padding: 22, fontSize: 13, color: "var(--ln-ink-3)" }}>
          <T>No outbreaks in the selected range. Adjust the range pill above to pick one.</T>
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
    { l: "DETECTED", d: fmt(o.updated), dWord: false, sub: "1st signal", subWord: true, active: true, done: true },
    { l: "CONFIRMED", d: fmt(o.updated), dWord: false, sub: `${Math.max(1, Math.floor(o.cases / 100))} cases`, subWord: false, active: true, done: true },
    {
      l: "ESCALATED",
      d: o.severity >= 3 ? fmt(o.updated) : "pending",
      dWord: o.severity < 3,
      sub: o.severity >= 3 ? `${Math.floor(o.cases / 2)} cases` : "below threshold",
      subWord: o.severity < 3,
      active: o.severity >= 3,
      done: o.severity >= 3,
    },
    {
      l: "PEAK",
      d: o.severity >= 4 ? fmt(o.updated) : "pending",
      dWord: o.severity < 4,
      sub: o.severity >= 4 ? `${o.cases.toLocaleString()} cases` : "forecast",
      subWord: o.severity < 4,
      active: o.severity >= 4,
      done: false,
    },
    {
      l: "CONTAINED",
      d: "forecast",
      dWord: true,
      sub: "—",
      subWord: false,
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
    { l: "Total cases", v: o.cases > 0 ? o.cases.toLocaleString() : "—", vWord: false, c: "var(--ln-crit)" },
    { l: "CFR", v: cfr, vWord: false, c: "var(--ln-warn)" },
    {
      l: "Severity",
      v: o.severity >= 4 ? "Critical" : o.severity >= 3 ? "High" : "Moderate",
      vWord: true,
      c: o.severity >= 4 ? "var(--ln-crit)" : "var(--ln-warn)",
    },
    {
      l: "Confidence",
      v: `${Math.round(o.confidence * 100)}%`,
      vWord: false,
      c: "var(--ln-info)",
    },
    { l: "Days reported", v: String(daysActive), vWord: false, c: "var(--ln-ink)" },
    { l: "Deaths", v: o.deaths > 0 ? o.deaths.toLocaleString() : "—", vWord: false, c: "var(--ln-crit)" },
  ];
}

function TrackingCurve({ cases }: { cases: number }) {
  const W = 660;
  const H = 220;
  const padL = 30;
  const padB = 20;
  const days = 44;
  const peak = Math.max(50, cases);
  const cumulative = useMemo(
    () => Array.from({ length: days }, (_, i) => Math.round(peak / (1 + Math.exp(-(i - 22) * 0.16)))),
    [peak]
  );
  const max = cumulative[days - 1] || 1;
  const xAt = (i: number) => padL + (i / (days - 1)) * (W - padL - 12);
  const yAt = (v: number) => H - padB - 4 - (v / max) * (H - padB - 12) + 4;
  const path = cumulative.map((v, i) => `${i ? "L" : "M"}${xAt(i)} ${yAt(v)}`).join(" ");

  // Hover tooltip — reads the running total on any day.
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hoverI, setHoverI] = useState<number | null>(null);
  const setFromX = (clientX: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width) return;
    const vbX = ((clientX - rect.left) / rect.width) * W;
    const frac = (vbX - padL) / Math.max(1, W - padL - 12);
    setHoverI(Math.max(0, Math.min(days - 1, Math.round(frac * (days - 1)))));
  };

  const hx = hoverI != null ? xAt(hoverI) : 0;
  const hy = hoverI != null ? yAt(cumulative[hoverI]) : 0;
  const leftPct = (hx / W) * 100;
  const topPct = Math.max(8, Math.min(80, (hy / H) * 100));
  const onRight = leftPct > 55;

  return (
    <div
      ref={wrapRef}
      style={{ position: "relative" }}
      onMouseMove={(e) => setFromX(e.clientX)}
      onMouseLeave={() => setHoverI(null)}
      onTouchMove={(e) => e.touches[0] && setFromX(e.touches[0].clientX)}
      onTouchEnd={() => setHoverI(null)}
    >
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
          const x = xAt(m.x);
          return (
            <g key={m.l}>
              <line x1={x} y1={4} x2={x} y2={H - padB} stroke="var(--ln-line-3)" strokeDasharray="2 3" />
              <text
                x={x + 4}
                y={16}
                fontSize="10"
                fill="var(--ln-ink-4)"
                fontFamily="var(--ln-font-mono)"
                letterSpacing="0.06em"
              >
                <T>{m.l}</T>
              </text>
            </g>
          );
        })}
        {hoverI != null && (
          <g>
            <line x1={hx} y1={4} x2={hx} y2={H - padB} stroke="var(--ln-ink-4)" strokeDasharray="3 3" />
            <circle cx={hx} cy={hy} r="4" fill={ACCENT} stroke="var(--ln-bg)" strokeWidth="1.5" />
          </g>
        )}
      </svg>
      {hoverI != null && (
        <div
          style={{
            position: "absolute",
            top: `${topPct}%`,
            left: `${leftPct}%`,
            transform: onRight ? "translate(calc(-100% - 12px), -50%)" : "translate(12px, -50%)",
            background: "var(--ln-elev-bg)",
            border: "1px solid var(--ln-line-3)",
            borderRadius: 6,
            padding: "7px 9px",
            boxShadow: "0 8px 22px rgba(0,0,0,0.5)",
            pointerEvents: "none",
            zIndex: 5,
            minWidth: 130,
          }}
        >
          <div
            style={{
              fontFamily: "var(--ln-font-mono)",
              fontSize: 10,
              color: "var(--ln-ink-3)",
              letterSpacing: "0.06em",
              marginBottom: 4,
            }}
          >
            <T>Day</T> {hoverI + 1} <T>of</T> {days}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: ACCENT, flex: "0 0 8px" }} />
            <span style={{ fontSize: 12, color: "var(--ln-ink-2)", flex: 1 }}><T>Cumulative</T></span>
            <span className="ln-num" style={{ fontSize: 12, color: "var(--ln-ink)" }}>
              {cumulative[hoverI].toLocaleString()}
            </span>
          </div>
          <div
            style={{
              marginTop: 5,
              paddingTop: 4,
              borderTop: "1px solid var(--ln-line)",
              fontSize: 9.5,
              color: "var(--ln-ink-4)",
              lineHeight: 1.35,
            }}
          >
            <T>Modeled cases reported by this day.</T>
          </div>
        </div>
      )}
    </div>
  );
}

// Small "?" info affordance with a styled descriptive tooltip on hover/focus.
function InfoDot({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const tWhatIsThis = useT("What is this?");
  return (
    <span style={{ position: "relative", display: "inline-flex", verticalAlign: "middle", marginLeft: 6 }}>
      <button
        type="button"
        aria-label={tWhatIsThis}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        style={{
          width: 15,
          height: 15,
          borderRadius: "50%",
          border: "1px solid var(--ln-line-3)",
          background: "transparent",
          color: "var(--ln-ink-3)",
          fontSize: 10,
          lineHeight: 1,
          cursor: "help",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          fontFamily: "var(--ln-font-mono)",
        }}
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            width: 240,
            maxWidth: "70vw",
            background: "var(--ln-elev-bg)",
            border: "1px solid var(--ln-line-3)",
            borderRadius: 6,
            padding: "8px 10px",
            boxShadow: "0 8px 22px rgba(0,0,0,0.5)",
            fontSize: 11.5,
            fontWeight: 400,
            color: "var(--ln-ink-2)",
            lineHeight: 1.45,
            letterSpacing: 0,
            textTransform: "none",
            whiteSpace: "normal",
            zIndex: 30,
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
