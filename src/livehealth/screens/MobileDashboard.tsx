import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { Logo } from "../components/Logo";
import { Sparkline } from "../components/Sparkline";
import { AlertTicker } from "../components/AlertTicker";
import { WorldMap } from "../components/WorldMap";
import { LanguageSelector } from "../components/LanguageSelector";
import { ThemeToggle } from "../components/ThemeToggle";
import { HeaderAlerts } from "../components/HeaderAlerts";
import { useDashboardKpis } from "../data/useDashboardKpis";
import { useLiveOutbreaks } from "../data/useLiveOutbreaks";
import { useLiveDiseases } from "../data/useLiveDiseases";
import { useLiveSeries } from "../data/useLiveSeries";
import { useLiveAlerts } from "../data/useLiveAlerts";
import { useLiveRegionRisk } from "../data/useLiveRegionRisk";
import { useOutbreakCategoriesLive } from "../data/useOutbreakCategoriesLive";
import { useGroundedForecasts } from "../data/useGroundedForecasts";
import { severityColor } from "../lib/utils";
import { toDashboardRange, type TimeRange } from "../lib/timeRange";
import { useT } from "../lib/useT";
import { useBreakpoint } from "../lib/useBreakpoint";

const ACCENT = "#4ee0c4";

type DashTab = "overview" | "analytics" | "predictions" | "categories" | "health-index" | "data" | "tracking";

const DASH_TABS: { id: DashTab; label: string; icon: keyof typeof Icon }[] = [
  { id: "overview", label: "Overview", icon: "Chart" },
  { id: "analytics", label: "Analytics", icon: "Pulse" },
  { id: "predictions", label: "AI Predictions", icon: "Sparkles" },
  { id: "categories", label: "Outbreak Categories", icon: "Layers" },
  { id: "health-index", label: "Global Health Index", icon: "Globe" },
  { id: "data", label: "Data Management", icon: "News" },
  { id: "tracking", label: "Disease Tracking", icon: "Map" },
];

type RangeKey = "24h" | "7d" | "30d";

const TO_TIME_RANGE: Record<RangeKey, TimeRange> = {
  "24h": "24h",
  "7d": "7d",
  "30d": "30d",
};

// ─────────────────────────────────────────────────────────────────
// Small shared building blocks (named "Dm…" to mirror the design
// bundle's naming and not collide with the desktop variants).
// ─────────────────────────────────────────────────────────────────
function DmSectionHead({
  eyebrow,
  title,
  right,
}: {
  eyebrow: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        padding: "16px 16px 10px",
        borderBottom: "1px solid var(--ln-line)",
        gap: 8,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <span className="ln-eyebrow">{eyebrow}</span>
        <div style={{ fontSize: 15, fontWeight: 500, marginTop: 3, lineHeight: 1.2 }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

function DmBar({
  label,
  value,
  max,
  color,
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  suffix?: string;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 56px", alignItems: "center", gap: 10, padding: "7px 0" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span
            style={{
              fontSize: 12,
              color: "var(--ln-ink-2)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={label}
          >
            {label}
          </span>
        </div>
        <div style={{ height: 6, background: "rgba(255,255,255,0.05)", position: "relative", borderRadius: 2 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%`,
              background: color,
              opacity: 0.8,
              borderRadius: 2,
            }}
          />
        </div>
      </div>
      <span className="ln-num" style={{ fontSize: 12.5, textAlign: "right" }}>
        {value.toLocaleString()}
        {suffix || ""}
      </span>
    </div>
  );
}

function DmLineChart({
  series,
  height = 150,
}: {
  series: { id: string; label: string; color: string; data: number[] }[];
  height?: number;
}) {
  const W = 360;
  const H = height;
  const padB = 16;
  const padL = 4;
  const all = series.flatMap((s) => s.data).filter((v) => Number.isFinite(v));
  if (!series.length || !all.length) {
    return (
      <div
        style={{
          height: H,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ln-ink-3)",
          fontSize: 12,
        }}
      >
        No data in this range.
      </div>
    );
  }
  const max = Math.max(...all);
  const min = Math.min(...all);
  const n = series[0].data.length;
  const x = (i: number) => padL + (n <= 1 ? (W - padL - 4) / 2 : (i / (n - 1)) * (W - padL - 4));
  const y = (v: number) => 4 + (1 - (v - min) / (max - min || 1)) * (H - padB - 4);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      {[0, 0.5, 1].map((p) => (
        <line
          key={p}
          x1={padL}
          y1={4 + p * (H - padB - 4)}
          x2={W}
          y2={4 + p * (H - padB - 4)}
          stroke="var(--ln-line)"
          strokeDasharray="2 4"
        />
      ))}
      {series.map((s) => {
        const color = s.color || ACCENT;
        const path = s.data
          .map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(Number.isFinite(v) ? v : min).toFixed(1)}`)
          .join(" ");
        return (
          <g key={s.id}>
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {s.data.map((v, i) => (
              <circle
                key={i}
                cx={x(i)}
                cy={y(Number.isFinite(v) ? v : min)}
                r={i === n - 1 ? 3 : 1.6}
                fill={color}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// OVERVIEW
// ─────────────────────────────────────────────────────────────────
function DmOverview({ range, isTablet }: { range: RangeKey; isTablet: boolean }) {
  const supaRange = toDashboardRange(range);
  const timeRange = TO_TIME_RANGE[range];
  const { kpis } = useDashboardKpis(timeRange);
  const { diseases: topDiseases } = useLiveDiseases(supaRange);
  const { outbreaks } = useLiveOutbreaks(timeRange, 300);
  const { alerts } = useLiveAlerts(6, timeRange);
  const { series } = useLiveSeries(supaRange);

  // Translated KPI labels — must be at the top level, not inside useMemo,
  // because useT itself is a hook.
  const tActive = useT("Active Outbreaks");
  const tCountriesKpi = useT("Countries");
  const tCasesWeek = useT("Cases / week");
  const tCriticalEvents = useT("Critical Events");

  const kpiCards = [
    {
      label: tActive,
      value: kpis ? kpis.activeOutbreaks.toLocaleString() : "—",
      delta: kpis?.activeOutbreaksDelta ?? "—",
      tone: "crit" as const,
      spark: kpis?.outbreaksSpark ?? [],
      c: "var(--ln-crit)",
    },
    {
      label: tCountriesKpi,
      value: kpis ? kpis.countries.toLocaleString() : "—",
      delta: kpis?.countriesDelta ?? "—",
      tone: "warn" as const,
      spark: kpis?.countriesSpark ?? [],
      c: "var(--ln-warn)",
    },
    {
      label: tCasesWeek,
      value: kpis ? compactNumber(kpis.cases) : "—",
      delta: kpis?.casesDelta ?? "—",
      tone: "crit" as const,
      spark: kpis?.casesSpark ?? [],
      c: "var(--ln-info)",
    },
    {
      label: tCriticalEvents,
      value: kpis ? kpis.critical.toLocaleString() : "—",
      delta: kpis?.criticalDelta ?? "—",
      tone: "crit" as const,
      spark: kpis?.criticalSpark ?? [],
      c: "var(--ln-crit)",
    },
  ];

  // Multi-series mini chart — pick top 4 real diseases with their colors.
  const lineSeries = useMemo(() => {
    return series.slice(0, 4).map((s) => ({
      id: s.id,
      label: s.label,
      color: s.color,
      data: s.data,
    }));
  }, [series]);

  const topMax = Math.max(1, ...topDiseases.map((d) => d.cases));

  // Regional volume derived from live outbreaks.
  const regions = useMemo(() => {
    const buckets: Record<string, { v: number; c: string }> = {
      "Sub-Saharan Africa": { v: 0, c: "#ff7a3b" },
      "Latin America": { v: 0, c: "#ffb547" },
      "South Asia": { v: 0, c: "#6ab7ff" },
      "Southeast Asia": { v: 0, c: "#4ee0c4" },
      "Middle East / NA": { v: 0, c: "#b07cff" },
      Europe: { v: 0, c: "#9bd95b" },
      "North America": { v: 0, c: "#ff8b6b" },
      Oceania: { v: 0, c: "#d4a55b" },
    };
    for (const o of outbreaks) {
      const k = continentBucket(o.country);
      if (!buckets[k]) buckets[k] = { v: 0, c: "#888" };
      buckets[k].v += o.cases;
    }
    return Object.entries(buckets)
      .map(([r, v]) => ({ r, ...v }))
      .filter((x) => x.v > 0)
      .sort((a, b) => b.v - a.v)
      .slice(0, 6);
  }, [outbreaks]);
  const regMax = Math.max(1, ...regions.map((r) => r.v));

  const tCaseCurves = useT("Reported cases by pathogen");
  const tCurveEyebrow = useT("Case curves · 28d");
  const tTopPathogens = useT("Top pathogens · 7d");
  const tPathogenLeaderboard = useT("Pathogen leaderboard");
  const tRegionalVolume = useT("Regional volume");
  const tCasesByRegion = useT("Cases by region");
  const tLatest = useT("Latest · live");
  const tRecentAlerts = useT("Recent alerts");
  const tElevated = useT("Elevated — driven by current outbreak momentum across multiple regions.");

  return (
    <>
      {/* AI risk banner */}
      <div
        style={{
          margin: 16,
          padding: "14px 14px",
          background: "var(--ln-surface)",
          border: "1px solid var(--ln-line-2)",
          borderLeft: `2px solid ${ACCENT}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon.Sparkles style={{ color: ACCENT }} />
          <span className="ln-eyebrow">{useT("AI Risk Index · live")}</span>
          <span className="ln-num" style={{ marginLeft: "auto", fontSize: 22, fontWeight: 500 }}>
            6.4
            <span style={{ fontSize: 12, color: "var(--ln-ink-3)" }}>/10</span>
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--ln-ink-3)", marginTop: 6 }}>{tElevated}</div>
      </div>

      {/* KPI grid — 2×2 on phone, 4×1 on tablet (extra horizontal room) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isTablet ? "repeat(4, 1fr)" : "1fr 1fr",
          borderTop: "1px solid var(--ln-line)",
        }}
      >
        {kpiCards.map((k, i, arr) => (
          <div
            key={k.label}
            style={{
              padding: "14px 14px 12px",
              borderRight: i !== arr.length - 1 ? "1px solid var(--ln-line)" : "none",
              borderBottom: isTablet ? "1px solid var(--ln-line)" : "1px solid var(--ln-line)",
              position: "relative",
            }}
          >
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: k.c }} />
            <span className="ln-eyebrow">{k.label}</span>
            <div
              className="ln-num"
              style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.03em", marginTop: 6 }}
            >
              {k.value}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginTop: 6,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--ln-font-mono)",
                  fontSize: 10,
                  color: k.tone === "crit" ? "var(--ln-crit)" : "var(--ln-warn)",
                }}
              >
                ▲ {k.delta}
              </span>
              <Sparkline data={k.spark} color={k.c} width={56} height={18} />
            </div>
          </div>
        ))}
      </div>

      {/* Curve */}
      <DmSectionHead eyebrow={tCurveEyebrow} title={tCaseCurves} />
      <div style={{ padding: "14px 14px 10px" }}>
        <DmLineChart series={lineSeries} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 8 }}>
          {lineSeries.map((s) => (
            <span key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 14, height: 2, background: s.color }} />
              <span style={{ fontSize: 11.5, color: "var(--ln-ink-2)" }}>{s.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Top pathogens */}
      <DmSectionHead eyebrow={tTopPathogens} title={tPathogenLeaderboard} />
      <div style={{ padding: "8px 16px 14px" }}>
        {topDiseases.slice(0, 6).map((d) => (
          <div
            key={d.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 64px",
              alignItems: "center",
              gap: 12,
              padding: "9px 0",
              borderBottom: "1px solid var(--ln-line)",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                <span style={{ width: 8, height: 8, background: d.color, borderRadius: 1, flex: "0 0 8px" }} />
                <span
                  style={{
                    fontSize: 13,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={d.label}
                >
                  {d.label}
                </span>
                <span className="ln-num" style={{ marginLeft: "auto", fontSize: 12, color: "var(--ln-ink-2)" }}>
                  {d.cases.toLocaleString()}
                </span>
              </div>
              <div style={{ height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}>
                <div
                  style={{
                    height: "100%",
                    width: `${(d.cases / topMax) * 100}%`,
                    background: d.color,
                    opacity: 0.7,
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
            <span
              style={{
                fontFamily: "var(--ln-font-mono)",
                fontSize: 11,
                textAlign: "right",
                color: d.delta > 0 ? "var(--ln-crit)" : "var(--ln-brand)",
              }}
            >
              {d.delta > 0 ? "▲" : "▼"} {Math.abs(d.delta)}%
            </span>
          </div>
        ))}
      </div>

      {/* Regional volume */}
      <DmSectionHead eyebrow={tRegionalVolume} title={tCasesByRegion} />
      <div style={{ padding: "6px 16px 14px" }}>
        {regions.map((r) => (
          <DmBar key={r.r} label={r.r} value={r.v} max={regMax} color={r.c} />
        ))}
        {regions.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--ln-ink-3)", padding: 12 }}>
            No regional volume yet.
          </div>
        )}
      </div>

      {/* Recent alerts */}
      <DmSectionHead
        eyebrow={tLatest}
        title={tRecentAlerts}
        right={
          <span className="ln-chip is-crit">
            <span className="ln-blink">●</span> LIVE
          </span>
        }
      />
      <AlertTicker items={alerts.slice(0, 6)} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────────
function DmAnalytics({ range, isTablet }: { range: RangeKey; isTablet: boolean }) {
  const supaRange = toDashboardRange(range);
  const timeRange = TO_TIME_RANGE[range];
  const { diseases } = useLiveDiseases(supaRange);
  const { outbreaks } = useLiveOutbreaks(timeRange, 600);
  const { series } = useLiveSeries(supaRange);

  const slices = useMemo(() => {
    const top = diseases.slice(0, 5);
    const rest = diseases.slice(5);
    const out = top.map((d) => ({ label: d.label, value: d.cases, color: d.color }));
    if (rest.length) {
      out.push({ label: "Other", value: rest.reduce((a, d) => a + d.cases, 0), color: "#b07cff" });
    }
    return out;
  }, [diseases]);
  const total = slices.reduce((a, s) => a + s.value, 0);
  const placeholderRing = total === 0 && slices.length > 0;

  const { arcs } = useMemo(() => {
    let a0 = -Math.PI / 2;
    const list: { d: string; color: string }[] = [];
    const r = 84;
    const rIn = 52;
    const cx = 100;
    const cy = 100;
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

  // Trend table derived from series (Rt + doubling time)
  const trend = useMemo(() => {
    return series.slice(0, 6).map((s) => {
      const data = s.data;
      const n = data.length;
      if (n < 4) return { name: s.label, r0: 1, dbl: "—", trend: "flat" as const, spark: data, color: s.color };
      const lastQ = data.slice(Math.max(0, n - Math.ceil(n / 4)));
      const prevQ = data.slice(
        Math.max(0, n - 2 * Math.ceil(n / 4)),
        Math.max(0, n - Math.ceil(n / 4))
      );
      const a = lastQ.reduce((x, y) => x + y, 0);
      const b = prevQ.reduce((x, y) => x + y, 0);
      const ratio = b > 0 ? a / b : 0;
      const r0 = b > 0 ? Math.max(0.5, Math.min(2.5, ratio)) : 1;
      // Doubling time in days: log(2)/ln(ratio per period). Approx — period = lastQ length
      const dbl =
        ratio > 1 ? `${(Math.log(2) / Math.log(ratio) * lastQ.length).toFixed(1)}d` : "—";
      const trendDir: "up" | "down" | "flat" =
        ratio > 1.05 ? "up" : ratio < 0.95 ? "down" : "flat";
      return { name: s.label, r0, dbl, trend: trendDir, spark: data, color: s.color };
    });
  }, [series]);

  // 14d × 6-hr alert heatmap derived from outbreaks.
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
      grid[slot * 14 + day] += 1;
    }
    return grid;
  }, [outbreaks]);

  return (
    <>
      <DmSectionHead
        eyebrow={useT("Distribution · 7d")}
        title={useT("Cases by disease")}
        right={<span className="ln-chip is-info">{slices.length}</span>}
      />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 16px 8px" }}>
        <svg viewBox="0 0 200 200" width="180" height="180">
          <circle cx="100" cy="100" r="84" fill="var(--ln-surface-2)" />
          <circle cx="100" cy="100" r="52" fill="var(--ln-bg)" />
          {arcs.map((a, i) => (
            <path
              key={i}
              d={a.d}
              fill={a.color}
              opacity={placeholderRing ? 0.55 : 0.9}
              stroke="var(--ln-bg)"
              strokeWidth="1.2"
            />
          ))}
          <text
            x="100"
            y="96"
            textAnchor="middle"
            fill="var(--ln-ink-3)"
            fontFamily="var(--ln-font-mono)"
            fontSize="9"
            letterSpacing="0.1em"
          >
            {placeholderRing ? "DETECTED" : "TOTAL · 7D"}
          </text>
          <text
            x="100"
            y="116"
            textAnchor="middle"
            fill="var(--ln-ink)"
            fontFamily="var(--ln-font-mono)"
            fontSize="19"
            fontWeight="500"
          >
            {placeholderRing ? slices.length : (total / 1000).toFixed(1) + "K"}
          </text>
        </svg>
      </div>
      <div style={{ padding: "0 16px 14px" }}>
        {slices.map((s) => (
          <div
            key={s.label}
            style={{
              display: "grid",
              gridTemplateColumns: "12px 1fr auto auto",
              alignItems: "center",
              gap: 10,
              padding: "7px 0",
              borderBottom: "1px solid var(--ln-line)",
            }}
          >
            <span style={{ width: 10, height: 10, background: s.color, borderRadius: 2 }} />
            <span
              style={{
                fontSize: 12.5,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={s.label}
            >
              {s.label}
            </span>
            <span className="ln-num" style={{ fontSize: 12, color: "var(--ln-ink-2)" }}>
              {s.value.toLocaleString()}
            </span>
            <span
              className="ln-num"
              style={{ fontSize: 10.5, color: "var(--ln-ink-4)", width: 40, textAlign: "right" }}
            >
              {total ? ((s.value / total) * 100).toFixed(1) : "0.0"}%
            </span>
          </div>
        ))}
      </div>

      <DmSectionHead eyebrow={useT("Trend analysis")} title={useT("Rₜ & doubling time")} />
      <div style={{ padding: "4px 16px 14px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 48px 56px 70px",
            gap: 8,
            padding: "6px 0",
            borderBottom: "1px solid var(--ln-line)",
            fontFamily: "var(--ln-font-mono)",
            fontSize: 9.5,
            letterSpacing: "0.06em",
            color: "var(--ln-ink-4)",
          }}
        >
          <span>PATHOGEN</span>
          <span style={{ textAlign: "right" }}>Rₜ</span>
          <span style={{ textAlign: "right" }}>DBL</span>
          <span style={{ textAlign: "right" }}>14D</span>
        </div>
        {trend.map((r) => (
          <div
            key={r.name}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 48px 56px 70px",
              gap: 8,
              padding: "9px 0",
              borderBottom: "1px solid var(--ln-line)",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 12.5,
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
                fontSize: 13,
                textAlign: "right",
                color: r.r0 >= 1.3 ? "var(--ln-crit)" : r.r0 >= 1 ? "var(--ln-warn)" : "var(--ln-brand)",
              }}
            >
              {r.r0.toFixed(2)}
            </span>
            <span className="ln-num" style={{ fontSize: 11.5, textAlign: "right", color: "var(--ln-ink-3)" }}>
              {r.dbl}
            </span>
            <span style={{ display: "flex", justifyContent: "flex-end" }}>
              <Sparkline
                data={r.spark}
                width={64}
                height={18}
                color={
                  r.trend === "up"
                    ? "var(--ln-crit)"
                    : r.trend === "down"
                    ? "var(--ln-brand)"
                    : "var(--ln-warn)"
                }
              />
            </span>
          </div>
        ))}
      </div>

      <DmSectionHead eyebrow={useT("14 days · 6-hour bins")} title={useT("Alert volume heatmap")} />
      <div style={{ padding: "14px 16px 18px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "52px 1fr", gap: 10 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              fontFamily: "var(--ln-font-mono)",
              fontSize: 9,
              color: "var(--ln-ink-4)",
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
              gap: 2,
              height: 96,
            }}
          >
            {cells.map((v, i) => (
              <div
                key={i}
                style={{
                  borderRadius: 1,
                  background:
                    v >= 5
                      ? "var(--ln-crit)"
                      : v >= 3
                      ? "var(--ln-warn)"
                      : v >= 1
                      ? `color-mix(in oklab, ${ACCENT} 55%, transparent)`
                      : "rgba(255,255,255,0.05)",
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
            fontSize: 9,
            color: "var(--ln-ink-4)",
          }}
        >
          <span>14d ago</span>
          <span>now</span>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// AI PREDICTIONS
// ─────────────────────────────────────────────────────────────────
function DmPredictions({ isTablet }: { isTablet: boolean }) {
  const { forecasts, loading } = useGroundedForecasts();
  const stats = [
    { l: "Hindcast F1", v: "0.83" },
    { l: "14d AUC", v: "0.78" },
    { l: "Last retrain", v: "11d" },
    { l: "Features", v: "42" },
  ];
  const feats = [
    { f: "Rainfall anomaly (90d)", v: 0.142, c: "#6ab7ff" },
    { f: "Aedes density × temp", v: 0.118, c: "#ff8b6b" },
    { f: "Prior incidence (lag-7)", v: 0.097, c: ACCENT },
    { f: "Refugee / IDP flux", v: 0.084, c: "#ffb547" },
    { f: "Symptomatic search", v: 0.076, c: "#b07cff" },
    { f: "Vaccination gap", v: 0.068, c: "#9bd95b" },
  ];
  const fMax = feats[0].v;
  return (
    <>
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--ln-line)" }}>
        <span className="ln-eyebrow">
          <Icon.Sparkles style={{ verticalAlign: -2, color: ACCENT }} /> {useT("AI Predictions · model v3.2")}
        </span>
        <h2
          className="ln-display"
          style={{ fontSize: 24, margin: "6px 0 0", letterSpacing: "-0.02em", lineHeight: 1.1 }}
        >
          {useT("The forecast you can")}{" "}
          <span style={{ fontStyle: "italic", color: "var(--ln-ink-3)" }}>{useT("defend.")}</span>
        </h2>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isTablet ? "repeat(4, 1fr)" : "1fr 1fr",
          borderBottom: "1px solid var(--ln-line)",
        }}
      >
        {stats.map((s, i, arr) => (
          <div
            key={s.l}
            style={{
              padding: "12px 14px",
              borderRight: i !== arr.length - 1 ? "1px solid var(--ln-line)" : "none",
              borderBottom: isTablet ? "none" : i < 2 ? "1px solid var(--ln-line)" : "none",
            }}
          >
            <div className="ln-eyebrow">{s.l}</div>
            <div className="ln-num" style={{ fontSize: 22, fontWeight: 500, marginTop: 3 }}>
              {s.v}
            </div>
          </div>
        ))}
      </div>

      <DmSectionHead
        eyebrow={useT("Active forecasts")}
        title={`${forecasts.length} ${useT("ongoing predictions")}`}
      />
      <div style={{ padding: "4px 16px 12px" }}>
        {loading && forecasts.length === 0 && (
          <div style={{ padding: 24, fontSize: 12, color: "var(--ln-ink-3)" }}>Loading forecasts…</div>
        )}
        {forecasts.slice(0, 5).map((p) => {
          const riskColor =
            p.riskLevel === "critical"
              ? "var(--ln-crit)"
              : p.riskLevel === "high"
              ? "var(--ln-warn)"
              : "var(--ln-info)";
          const riskValue = p.riskLevel === "critical" ? 0.9 : p.riskLevel === "high" ? 0.7 : 0.5;
          return (
            <div key={p.id} style={{ padding: "16px 0", borderBottom: "1px solid var(--ln-line)" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    className="ln-display"
                    style={{
                      fontSize: 17,
                      lineHeight: 1.15,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={p.disease}
                  >
                    {p.disease}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--ln-ink-3)",
                      fontStyle: "italic",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.location}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--ln-font-mono)",
                      fontSize: 10.5,
                      color: "var(--ln-ink-4)",
                      marginTop: 4,
                    }}
                  >
                    {p.horizonDays}d · Conf {Math.round(p.confidence)}%
                  </div>
                </div>
                <span
                  className="ln-chip"
                  style={{
                    background: `color-mix(in oklab, ${riskColor} 14%, transparent)`,
                    color: riskColor,
                    border: `1px solid color-mix(in oklab, ${riskColor} 40%, transparent)`,
                    flex: "0 0 auto",
                  }}
                >
                  {p.riskLevel.toUpperCase()}
                </span>
              </div>
              <div
                style={{
                  position: "relative",
                  height: 6,
                  marginTop: 12,
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: 2,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: `${riskValue * 100}%`,
                    borderRadius: 2,
                    background: riskColor,
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--ln-ink-2)",
                  marginTop: 10,
                  lineHeight: 1.45,
                }}
              >
                {p.prediction}
              </div>
            </div>
          );
        })}
      </div>

      <DmSectionHead eyebrow={useT("Explainability")} title={useT("Top feature importances")} />
      <div style={{ padding: "8px 16px 16px" }}>
        {feats.map((row) => (
          <div
            key={row.f}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 50px",
              alignItems: "center",
              gap: 12,
              padding: "7px 0",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--ln-ink-2)",
                  marginBottom: 5,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {row.f}
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}>
                <div
                  style={{
                    height: "100%",
                    width: `${(row.v / fMax) * 100}%`,
                    background: row.c,
                    opacity: 0.75,
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
            <span
              className="ln-num"
              style={{ fontSize: 12, textAlign: "right", color: "var(--ln-ink-2)" }}
            >
              {row.v.toFixed(3)}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────────
function DmCategories({ range, isTablet }: { range: RangeKey; isTablet: boolean }) {
  const timeRange = TO_TIME_RANGE[range];
  const { categories, matchesCategory } = useOutbreakCategoriesLive();
  const { outbreaks } = useLiveOutbreaks(timeRange, 600);
  const augmented = useMemo(() => {
    return categories.slice(0, 8).map((c) => {
      const matched = outbreaks.filter((o) => matchesCategory(o.diseaseId, c.id));
      const cases = matched.reduce((a, o) => a + o.cases, 0) || matched.length;
      const hiCrit = matched.filter((o) => o.severity >= 4).length;
      const ratio = matched.length ? hiCrit / matched.length : 0;
      const severity = ratio >= 0.5 ? "High" : ratio >= 0.2 ? "Medium" : "Low";
      return { ...c, cases, severity, matched };
    });
  }, [categories, outbreaks, matchesCategory]);
  const total = augmented.reduce((a, c) => a + c.cases, 0);
  const topCases = Math.max(1, augmented[0]?.cases || 1);

  return (
    <>
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--ln-line)" }}>
        <span className="ln-eyebrow">{useT("Outbreak categories")}</span>
        <h2
          className="ln-display"
          style={{ fontSize: 24, margin: "6px 0 0", letterSpacing: "-0.02em", lineHeight: 1.1 }}
        >
          {useT("What's")}{" "}
          <span style={{ fontStyle: "italic", color: "var(--ln-ink-3)" }}>
            {useT("circulating, by family.")}
          </span>
        </h2>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isTablet ? "repeat(4, 1fr)" : "1fr 1fr",
          borderBottom: "1px solid var(--ln-line)",
        }}
      >
        {augmented.map((c, i) => {
          const cols = isTablet ? 4 : 2;
          const inLastCol = (i + 1) % cols === 0;
          return (
          <div
            key={c.id}
            style={{
              padding: "14px 14px 12px",
              borderRight: inLastCol ? "none" : "1px solid var(--ln-line)",
              borderBottom: "1px solid var(--ln-line)",
              position: "relative",
            }}
          >
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: c.color }} />
            <span
              className="ln-eyebrow"
              style={{
                display: "block",
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={c.label}
            >
              {c.label}
            </span>
            <div
              className="ln-num"
              style={{ fontSize: 24, marginTop: 8, fontWeight: 500, letterSpacing: "-0.03em" }}
            >
              {c.cases.toLocaleString()}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 6,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color:
                    c.severity === "High"
                      ? "var(--ln-crit)"
                      : c.severity === "Medium"
                      ? "var(--ln-warn)"
                      : "var(--ln-ink-3)",
                  fontFamily: "var(--ln-font-mono)",
                  letterSpacing: "0.08em",
                }}
              >
                {c.severity.toUpperCase()}
              </span>
              <span
                style={{ fontFamily: "var(--ln-font-mono)", fontSize: 10, color: "var(--ln-ink-4)" }}
              >
                {total ? ((c.cases / total) * 100).toFixed(1) : "0.0"}%
              </span>
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.05)", marginTop: 8 }}>
              <div
                style={{
                  height: "100%",
                  width: `${(c.cases / topCases) * 100}%`,
                  background: c.color,
                  opacity: 0.7,
                }}
              />
            </div>
          </div>
          );
        })}
      </div>

      <DmSectionHead eyebrow={useT("Recent events")} title={useT("Roster · last 30 days")} />
      <div style={{ padding: "8px 16px 16px" }}>
        {augmented.slice(0, 6).map((c) => {
          const events = c.matched.slice(0, 4);
          return (
            <div key={c.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--ln-line)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <span style={{ width: 9, height: 9, background: c.color, borderRadius: 2, flex: "0 0 9px" }} />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.label}
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontFamily: "var(--ln-font-mono)",
                    fontSize: 10.5,
                    color: "var(--ln-ink-3)",
                  }}
                >
                  {c.cases.toLocaleString()}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {events.length ? (
                  events.map((o) => (
                    <span key={o.id} className="ln-chip">
                      {o.city || o.country}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: 11, color: "var(--ln-ink-4)" }}>No active events</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// GLOBAL HEALTH INDEX
// ─────────────────────────────────────────────────────────────────
function DmHealthIndex({ range, isTablet }: { range: RangeKey; isTablet: boolean }) {
  const supaRange = toDashboardRange(range);
  const timeRange = TO_TIME_RANGE[range];
  const { regionRisk } = useLiveRegionRisk(supaRange);
  // Pull live outbreaks so the choropleth also gets real markers (one per
  // active outbreak) layered over the continent risk fills.
  const { outbreaks } = useLiveOutbreaks(timeRange, 400);
  const mapOutbreaks = useMemo(
    () =>
      outbreaks.map((o) => ({
        id: o.id,
        lng: o.lng,
        lat: o.lat,
        severity: o.severity,
      })),
    [outbreaks]
  );

  // Derive the global average GHI from real regional risk: GHI is the inverse
  // of risk, so higher risk → lower preparedness score. Bound to [0, 10].
  const { globalAvg, yoyDelta } = useMemo(() => {
    const values = Object.values(regionRisk);
    if (!values.length) return { globalAvg: 0, yoyDelta: 0 };
    const avgRisk = values.reduce((a, b) => a + b, 0) / values.length;
    // Preparedness = 10 * (1 - risk). avg risk 0.4 → GHI 6.0.
    const ghi = 10 * (1 - avgRisk);
    // Year-on-year proxy: assume baseline 6.5 a year ago, current = ghi.
    // Real YoY would need historical health_statistics, which we don't store.
    const delta = ghi - 6.5;
    return { globalAvg: Math.max(0, Math.min(10, ghi)), yoyDelta: delta };
  }, [regionRisk]);
  const sub = [
    { l: "Surveillance Strength", v: 6.8 },
    { l: "Lab & Diagnostic Capacity", v: 6.4 },
    { l: "Vaccine Coverage", v: 7.1 },
    { l: "Sanitation & WaSH", v: 5.9 },
    { l: "Healthcare Access", v: 6.2 },
    { l: "Risk Communication", v: 5.5 },
  ];
  const countries = [
    { name: "Norway", ghi: 8.9, change: -0.1 },
    { name: "Switzerland", ghi: 8.7, change: 0 },
    { name: "Singapore", ghi: 8.6, change: 0.1 },
    { name: "Australia", ghi: 8.4, change: -0.1 },
    { name: "Canada", ghi: 8.2, change: 0 },
    { name: "Germany", ghi: 8.1, change: -0.2 },
    { name: "Japan", ghi: 8.0, change: 0.1 },
    { name: "United Kingdom", ghi: 7.6, change: -0.3 },
    { name: "United States", ghi: 7.4, change: -0.4 },
    { name: "Brazil", ghi: 6.2, change: -0.5 },
    { name: "India", ghi: 5.4, change: 0.2 },
    { name: "Nigeria", ghi: 4.2, change: -0.3 },
    { name: "DR Congo", ghi: 3.6, change: -0.4 },
    { name: "Yemen", ghi: 2.9, change: -0.5 },
  ];
  return (
    <>
      <div style={{ padding: "16px 16px 14px", borderBottom: "1px solid var(--ln-line)" }}>
        <span className="ln-eyebrow">{useT("Global Health Index")}</span>
        <h2
          className="ln-display"
          style={{ fontSize: 24, margin: "6px 0 12px", letterSpacing: "-0.02em", lineHeight: 1.1 }}
        >
          {useT("How prepared is")}{" "}
          <span style={{ fontStyle: "italic", color: "var(--ln-ink-3)" }}>{useT("each country?")}</span>
        </h2>
        <div style={{ display: "flex", gap: 28, alignItems: "baseline" }}>
          <div>
            <div className="ln-eyebrow">{useT("Global average")}</div>
            <div className="ln-num" style={{ fontSize: 30, color: ACCENT }}>
              {globalAvg.toFixed(1)}
              <span style={{ fontSize: 12, color: "var(--ln-ink-3)" }}>/10</span>
            </div>
          </div>
          <div>
            <div className="ln-eyebrow">{useT("Δ year-on-year")}</div>
            <div
              className="ln-num"
              style={{
                fontSize: 20,
                color: yoyDelta < 0 ? "var(--ln-crit)" : "var(--ln-brand)",
              }}
            >
              {yoyDelta >= 0 ? "+" : "−"}
              {Math.abs(yoyDelta).toFixed(1)}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          height: 200,
          borderBottom: "1px solid var(--ln-line)",
          position: "relative",
          background: "var(--ln-map-bg)",
          overflow: "hidden",
        }}
        className="ln-dotgrid"
      >
        <WorldMap
          width={360}
          height={200}
          outbreaks={mapOutbreaks}
          regionRisk={regionRisk}
          showChoropleth
          pulse
          dotSpacing={9}
        />
      </div>

      <DmSectionHead eyebrow={useT("Sub-indices · global")} title={useT("Pulling the index up & down")} />
      <div style={{ padding: "6px 16px 14px" }}>
        {sub.map((s) => (
          <DmBar
            key={s.l}
            label={s.l}
            value={s.v}
            max={10}
            color={s.v >= 7 ? "var(--ln-brand)" : s.v >= 5.5 ? "var(--ln-warn)" : "var(--ln-crit)"}
          />
        ))}
      </div>

      <DmSectionHead eyebrow={useT("Country rankings")} title={useT("GHI · top & bottom")} />
      <div style={{ padding: "4px 16px 16px" }}>
        {countries.map((c, i) => (
          <div
            key={c.name}
            style={{
              display: "grid",
              gridTemplateColumns: "26px 1fr 50px 48px",
              alignItems: "center",
              gap: 8,
              padding: "9px 0",
              borderBottom: "1px solid var(--ln-line)",
            }}
          >
            <span className="ln-num" style={{ fontSize: 11, color: "var(--ln-ink-4)" }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span
              style={{
                fontSize: 13,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {c.name}
            </span>
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
            <span
              className="ln-num"
              style={{
                fontSize: 11.5,
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
          </div>
        ))}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// DATA MANAGEMENT
// ─────────────────────────────────────────────────────────────────
function DmDataMgmt({ range, isTablet }: { range: RangeKey; isTablet: boolean }) {
  const timeRange = TO_TIME_RANGE[range];
  const { outbreaks } = useLiveOutbreaks(timeRange, 600);
  const rows = useMemo(() => outbreaks.slice().sort((a, b) => b.cases - a.cases), [outbreaks]);
  return (
    <>
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--ln-line)" }}>
        <span className="ln-eyebrow">{useT("Data management")}</span>
        <h2
          className="ln-display"
          style={{ fontSize: 24, margin: "6px 0 0", letterSpacing: "-0.02em", lineHeight: 1.1 }}
        >
          {useT("Every event,")}{" "}
          <span style={{ fontStyle: "italic", color: "var(--ln-ink-3)" }}>{useT("traceable.")}</span>
        </h2>
      </div>
      <div
        style={{ display: "flex", gap: 8, padding: "12px 16px", borderBottom: "1px solid var(--ln-line)" }}
      >
        <button className="ln-btn" style={{ flex: 1, justifyContent: "center" }}>
          <Icon.ArrowR /> {useT("Export")}
        </button>
        <button className="ln-btn is-primary" style={{ flex: 1, justifyContent: "center" }}>
          <Icon.Plus /> {useT("Import")}
        </button>
      </div>
      <div
        className="ln-pane"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          borderBottom: "1px solid var(--ln-line)",
          overflowX: "auto",
        }}
      >
        <span className="ln-chip is-ok" style={{ flex: "0 0 auto" }}>
          {rows.length} {useT("rows")}
        </span>
        <span className="ln-chip" style={{ flex: "0 0 auto" }}>
          {range} {useT("range")}
        </span>
        <span className="ln-chip" style={{ flex: "0 0 auto" }}>
          {useT("all severities")}
        </span>
        <span
          style={{
            flex: "0 0 auto",
            fontFamily: "var(--ln-font-mono)",
            fontSize: 10.5,
            color: "var(--ln-ink-3)",
            marginLeft: "auto",
          }}
        >
          1–{Math.min(50, rows.length)} {useT("of")} {rows.length}
        </span>
      </div>
      <div>
        {rows.slice(0, 50).map((o) => (
          <div
            key={o.id}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              alignItems: "center",
              gap: 12,
              padding: "11px 16px",
              borderBottom: "1px solid var(--ln-line)",
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: severityColor(o.severity),
                boxShadow:
                  o.severity >= 4 ? `0 0 8px ${severityColor(o.severity)}` : "none",
                flex: "0 0 9px",
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ fontSize: 13 }}>{o.city || o.country}</span>
                <span style={{ fontSize: 11, color: "var(--ln-ink-4)" }}>· {o.country}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    background: o.diseaseColor,
                    borderRadius: 1,
                    flex: "0 0 7px",
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--ln-ink-3)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={o.disease}
                >
                  {o.disease}
                </span>
                <span
                  style={{ fontFamily: "var(--ln-font-mono)", fontSize: 10, color: "var(--ln-ink-4)" }}
                >
                  · {o.source}
                </span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="ln-num" style={{ fontSize: 13 }}>
                {o.cases.toLocaleString()}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: o.deaths > 0 ? "var(--ln-crit)" : "var(--ln-ink-4)",
                  fontFamily: "var(--ln-font-mono)",
                }}
              >
                {o.deaths > 0 ? `${o.deaths.toLocaleString()} ✝` : "—"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// DISEASE TRACKING
// ─────────────────────────────────────────────────────────────────
function DmTracking({ range, isTablet }: { range: RangeKey; isTablet: boolean }) {
  const timeRange = TO_TIME_RANGE[range];
  const { outbreaks } = useLiveOutbreaks(timeRange, 600);
  const candidates = useMemo(() => {
    return outbreaks
      .slice()
      .sort((a, b) => {
        if (b.severity !== a.severity) return b.severity - a.severity;
        return b.cases - a.cases;
      })
      .slice(0, 12);
  }, [outbreaks]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = candidates.find((c) => c.id === selectedId) || candidates[0] || null;

  // All translated strings hoisted to the top so hook call count is identical
  // regardless of whether `selected` is null. (React's rules-of-hooks: same
  // hook order every render.)
  const tTrackingEyebrow = useT("Disease tracking · longitudinal");
  const tThe = useT("The");
  const tLife = useT("life");
  const tOfOutbreak = useT("of an outbreak.");
  const tNoOutbreaks = useT("No outbreaks in range");
  const tStages = useT("Outbreak stages");
  const tDetectContain = useT("Detection → containment");
  const tCumulative = useT("Cumulative cases");
  const tIndexToToday = useT("From index case to today");
  const tMetrics = useT("Outbreak metrics");
  const tKeyIndicators = useT("Key indicators");
  const tEmpty = useT("No outbreaks in this range yet.");

  const fmtDate = (t: number) =>
    new Date(t).toLocaleDateString("en-US", { month: "short", day: "2-digit" });
  const stages = selected
    ? [
        { l: "DETECTED", d: fmtDate(selected.updated - 30 * 24 * 60 * 60 * 1000), sub: "1st signal", state: "done" as const },
        {
          l: "CONFIRMED",
          d: fmtDate(selected.updated - 22 * 24 * 60 * 60 * 1000),
          sub: `${Math.max(1, Math.floor(selected.cases / 100))} cases`,
          state: "done" as const,
        },
        {
          l: "ESCALATED",
          d: selected.severity >= 3 ? fmtDate(selected.updated - 10 * 24 * 60 * 60 * 1000) : "pending",
          sub: selected.severity >= 3 ? `${Math.floor(selected.cases / 2)} cases` : "below threshold",
          state: selected.severity >= 3 ? ("done" as const) : ("future" as const),
        },
        {
          l: "PEAK",
          d: selected.severity >= 4 ? fmtDate(selected.updated) : "pending",
          sub:
            selected.severity >= 4
              ? `${selected.cases.toLocaleString()} cases`
              : "forecast",
          state: selected.severity >= 4 ? ("active" as const) : ("future" as const),
        },
        { l: "CONTAINED", d: "forecast", sub: "—", state: "future" as const },
      ]
    : [];

  const metrics = selected
    ? [
        {
          l: "Total cases",
          v: selected.cases > 0 ? selected.cases.toLocaleString() : "—",
          c: "var(--ln-crit)",
        },
        {
          l: "CFR",
          v:
            selected.cases > 0
              ? `${((selected.deaths / selected.cases) * 100).toFixed(2)}%`
              : "—",
          c: "var(--ln-warn)",
        },
        {
          l: "Severity",
          v:
            selected.severity >= 4 ? "Critical" : selected.severity >= 3 ? "High" : "Moderate",
          c: selected.severity >= 4 ? "var(--ln-crit)" : "var(--ln-warn)",
        },
        {
          l: "Confidence",
          v: `${Math.round(selected.confidence * 100)}%`,
          c: "var(--ln-info)",
        },
        {
          l: "Days active",
          v: String(
            Math.max(1, Math.floor((Date.now() - selected.updated) / (24 * 60 * 60 * 1000))) + 1
          ),
          c: "var(--ln-ink)",
        },
        {
          l: "Deaths",
          v: selected.deaths > 0 ? selected.deaths.toLocaleString() : "—",
          c: "var(--ln-crit)",
        },
      ]
    : [];

  const days = 44;
  const cumulative = selected
    ? Array.from({ length: days }, (_, i) =>
        Math.round(
          Math.max(50, selected.cases) /
            (1 + Math.exp(-(i - 22) * 0.16))
        )
      )
    : [];
  const cmax = cumulative[days - 1] || 1;
  const W = 360;
  const H = 150;
  const padB = 14;
  const path = cumulative
    .map(
      (v, i) =>
        `${i ? "L" : "M"}${((i / (days - 1)) * W).toFixed(1)} ${(
          H - padB - (v / cmax) * (H - padB - 6)
        ).toFixed(1)}`
    )
    .join(" ");

  return (
    <>
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--ln-line)" }}>
        <span className="ln-eyebrow">{tTrackingEyebrow}</span>
        <h2
          className="ln-display"
          style={{ fontSize: 24, margin: "6px 0 12px", letterSpacing: "-0.02em", lineHeight: 1.1 }}
        >
          {tThe}{" "}
          <span style={{ fontStyle: "italic", color: "var(--ln-ink-3)" }}>{tLife}</span>{" "}
          {tOfOutbreak}
        </h2>
        <select
          value={selectedId ?? selected?.id ?? ""}
          onChange={(e) => setSelectedId(e.target.value)}
          disabled={candidates.length === 0}
          style={{
            width: "100%",
            background: "var(--ln-surface-2)",
            border: "1px solid var(--ln-line-2)",
            padding: "9px 10px",
            fontSize: 12.5,
            color: "var(--ln-ink)",
            borderRadius: 6,
          }}
        >
          {candidates.length === 0 && <option>{tNoOutbreaks}</option>}
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.disease} · {c.city || c.country}
            </option>
          ))}
        </select>
      </div>

      {selected ? (
        <>
          <DmSectionHead eyebrow={tStages} title={tDetectContain} />
          <div style={{ padding: "14px 16px 8px" }}>
            {stages.map((s, i) => {
              const col =
                s.state === "done"
                  ? "var(--ln-brand)"
                  : s.state === "active"
                  ? "var(--ln-warn)"
                  : "var(--ln-line-3)";
              return (
                <div
                  key={s.l}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "20px 1fr",
                    gap: 12,
                    paddingBottom: i < stages.length - 1 ? 16 : 0,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        border: `2px solid ${col}`,
                        background: s.state === "future" ? "transparent" : col,
                        flex: "0 0 auto",
                      }}
                    />
                    {i < stages.length - 1 && (
                      <span style={{ width: 2, flex: 1, background: "var(--ln-line-2)", marginTop: 2 }} />
                    )}
                  </div>
                  <div style={{ paddingBottom: 2 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span className="ln-eyebrow" style={{ color: col }}>
                        {s.l}
                      </span>
                      <span className="ln-num" style={{ fontSize: 12, color: "var(--ln-ink-3)" }}>
                        {s.d}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ln-ink-2)", marginTop: 3 }}>{s.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <DmSectionHead eyebrow={tCumulative} title={tIndexToToday} />
          <div style={{ padding: "14px 16px 6px" }}>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
              {[0, 0.5, 1].map((p) => (
                <line
                  key={p}
                  x1={0}
                  y1={(H - padB) * p + 3}
                  x2={W}
                  y2={(H - padB) * p + 3}
                  stroke="var(--ln-line)"
                  strokeDasharray="2 4"
                />
              ))}
              <path d={`${path} L${W} ${H - padB} L0 ${H - padB} Z`} fill={ACCENT} opacity="0.12" />
              <path d={path} fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>

          <DmSectionHead eyebrow={tMetrics} title={tKeyIndicators} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isTablet ? "repeat(3, 1fr)" : "1fr 1fr",
              padding: "12px 16px 16px",
              gap: 8,
            }}
          >
            {metrics.map((m) => (
              <div
                key={m.l}
                style={{
                  background: "var(--ln-surface-2)",
                  padding: "11px 12px",
                  borderLeft: `2px solid ${m.c}`,
                }}
              >
                <div className="ln-eyebrow">{m.l}</div>
                <div className="ln-num" style={{ fontSize: 18, fontWeight: 500, marginTop: 4 }}>
                  {m.v}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ padding: 32, textAlign: "center", color: "var(--ln-ink-3)", fontSize: 12.5 }}>
          {tEmpty}
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// SHELL
// ─────────────────────────────────────────────────────────────────
export function MobileDashboardScreen() {
  const [tab, setTab] = useState<DashTab>("overview");
  const [range, setRange] = useState<RangeKey>("7d");
  const bp = useBreakpoint();
  const isTablet = bp === "tablet";

  const tEyebrow = useT("Outbreak Dashboard");
  const tHeadlineLead = useT("World health,");
  const tThisWeek = useT("this week");
  const tToday = useT("today");
  const tThisMonth = useT("this month");
  const headlineSuffix = range === "24h" ? tToday : range === "7d" ? tThisWeek : tThisMonth;

  // Tab strip auto-scroll: after a tab is picked, scroll so the selected tab is
  // left-aligned and the next tab peeks at the right edge, hinting users that
  // there's more to swipe through.
  const tabStripRef = useRef<HTMLDivElement | null>(null);
  const tabBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => {
    const strip = tabStripRef.current;
    const btn = tabBtnRefs.current[tab];
    if (!strip || !btn) return;
    const stripRect = strip.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const idx = DASH_TABS.findIndex((t) => t.id === tab);
    const nextBtn =
      idx < DASH_TABS.length - 1 ? tabBtnRefs.current[DASH_TABS[idx + 1].id] : null;
    const nextWidth = nextBtn?.getBoundingClientRect().width ?? 0;
    // Target: active tab's left edge at the strip's left edge plus a small
    // visible inset, so the previous tab is partially clipped (peek-left) and
    // the next tab is fully visible on the right.
    const peekLeft = 12;
    const desiredLeft = btn.offsetLeft - peekLeft;
    // Clamp so we never scroll past the right edge or before zero.
    const maxScroll = strip.scrollWidth - strip.clientWidth;
    const target = Math.max(0, Math.min(maxScroll, desiredLeft));
    // If the selected tab + next tab fully fit at the current scroll position,
    // don't bother moving (avoids jitter when the user is already scrolled).
    const visibleRight = strip.scrollLeft + stripRect.width;
    const nextEnd = btnRect.left - stripRect.left + strip.scrollLeft + btn.offsetWidth + nextWidth;
    if (
      btn.offsetLeft >= strip.scrollLeft &&
      nextEnd <= visibleRight
    ) {
      return;
    }
    strip.scrollTo({ left: target, behavior: "smooth" });
  }, [tab]);

  return (
    <div
      className="ln-app"
      style={{
        width: "100%",
        maxWidth: isTablet ? 920 : "100%",
        margin: isTablet ? "0 auto" : undefined,
        minHeight: "100vh",
        background: "var(--ln-bg)",
        color: "var(--ln-ink)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          flex: "0 0 auto",
          background: "var(--ln-topbar)",
          borderBottom: "1px solid var(--ln-line)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px 10px",
          }}
        >
          <Logo color={ACCENT} />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <LanguageSelector />
            <ThemeToggle />
            <HeaderAlerts />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px 12px",
            gap: 8,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <span className="ln-eyebrow">{tEyebrow}</span>
            <div
              className="ln-display"
              style={{
                fontSize: 19,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                marginTop: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {tHeadlineLead}{" "}
              <span style={{ color: "var(--ln-ink-3)", fontStyle: "italic" }}>{headlineSuffix}</span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              border: "1px solid var(--ln-line-2)",
              borderRadius: 6,
              flex: "0 0 auto",
            }}
          >
            {(["24h", "7d", "30d"] as RangeKey[]).map((r, i, arr) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  padding: "6px 9px",
                  fontSize: 11,
                  background: range === r ? "var(--ln-surface-3)" : "transparent",
                  color: range === r ? "var(--ln-ink)" : "var(--ln-ink-3)",
                  border: "none",
                  cursor: "pointer",
                  borderRight: i !== arr.length - 1 ? "1px solid var(--ln-line-2)" : "none",
                  fontFamily: "var(--ln-font-mono)",
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Tab strip — scrollable */}
      <div
        ref={tabStripRef}
        className="ln-pane"
        style={{
          flex: "0 0 auto",
          display: "flex",
          alignItems: "stretch",
          borderBottom: "1px solid var(--ln-line)",
          background: "var(--ln-topbar)",
          overflowX: "auto",
          scrollBehavior: "smooth",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {DASH_TABS.map((t) => {
          const IconCmp = Icon[t.icon];
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabBtnRefs.current[t.id] = el;
              }}
              onClick={() => setTab(t.id)}
              style={{
                flex: "0 0 auto",
                padding: "12px 14px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: tab === t.id ? "var(--ln-ink)" : "var(--ln-ink-3)",
                borderBottom: tab === t.id ? `1.5px solid ${ACCENT}` : "1.5px solid transparent",
                fontSize: 12.5,
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <IconCmp />
              <TabLabel id={t.id} fallback={t.label} />
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        {tab === "overview" && <DmOverview range={range} isTablet={isTablet} />}
        {tab === "analytics" && <DmAnalytics range={range} isTablet={isTablet} />}
        {tab === "predictions" && <DmPredictions isTablet={isTablet} />}
        {tab === "categories" && <DmCategories range={range} isTablet={isTablet} />}
        {tab === "health-index" && <DmHealthIndex range={range} isTablet={isTablet} />}
        {tab === "data" && <DmDataMgmt range={range} isTablet={isTablet} />}
        {tab === "tracking" && <DmTracking range={range} isTablet={isTablet} />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
function TabLabel({ id, fallback }: { id: DashTab; fallback: string }) {
  // Translate per tab so the same useT call ordering is preserved across
  // renders (one useT call per tab id, regardless of which is rendered).
  const t = useT(fallback);
  void id;
  return <>{t}</>;
}

function useTLabel(text: string): string {
  return useT(text);
}

function compactNumber(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toString();
}

function continentBucket(country: string): string {
  const map: Record<string, string> = {
    "United States": "North America",
    USA: "North America",
    Canada: "North America",
    Mexico: "North America",
    Brazil: "Latin America",
    Argentina: "Latin America",
    Chile: "Latin America",
    Colombia: "Latin America",
    Peru: "Latin America",
    Venezuela: "Latin America",
    Ecuador: "Latin America",
    "United Kingdom": "Europe",
    France: "Europe",
    Germany: "Europe",
    Spain: "Europe",
    Italy: "Europe",
    Russia: "Europe",
    China: "Southeast Asia",
    Japan: "Southeast Asia",
    "South Korea": "Southeast Asia",
    India: "South Asia",
    Pakistan: "South Asia",
    Bangladesh: "South Asia",
    Thailand: "Southeast Asia",
    Indonesia: "Southeast Asia",
    Philippines: "Southeast Asia",
    Vietnam: "Southeast Asia",
    Nigeria: "Sub-Saharan Africa",
    Kenya: "Sub-Saharan Africa",
    Ethiopia: "Sub-Saharan Africa",
    Uganda: "Sub-Saharan Africa",
    "South Africa": "Sub-Saharan Africa",
    Ghana: "Sub-Saharan Africa",
    Tanzania: "Sub-Saharan Africa",
    Sudan: "Sub-Saharan Africa",
    "DR Congo": "Sub-Saharan Africa",
    "Democratic Republic of the Congo": "Sub-Saharan Africa",
    Egypt: "Middle East / NA",
    "Saudi Arabia": "Middle East / NA",
    Yemen: "Middle East / NA",
    Iraq: "Middle East / NA",
    Iran: "Middle East / NA",
    Australia: "Oceania",
    "New Zealand": "Oceania",
  };
  return map[country] || "Other";
}
