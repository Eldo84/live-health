import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Sparkline } from "../components/Sparkline";
import { SeverityBar, RiskPill } from "../components/SeverityBar";
import { WorldMap } from "../components/WorldMap";
import { LineChart } from "../components/LineChart";
import { DiseaseBar } from "../components/DiseaseBar";
import { AlertTicker } from "../components/AlertTicker";
import { AdCard } from "../components/AdCard";
import { useLiveSponsored } from "../data/useLiveSponsored";
import { PaneHead } from "../components/PaneHead";
import { TopBar } from "./SurveillanceMap";
import { PREDICTIONS } from "../data/predictions";
import { useLiveOutbreaks } from "../data/useLiveOutbreaks";
import { useLiveAlerts } from "../data/useLiveAlerts";
import { useLiveRegionRisk } from "../data/useLiveRegionRisk";
import { useLiveSeries } from "../data/useLiveSeries";
import { useLiveDiseases } from "../data/useLiveDiseases";
import { compactNumber } from "../lib/utils";
import type { TimeRange } from "../lib/timeRange";
import { useDashboardKpis } from "../data/useDashboardKpis";
import { useBreakpoint } from "../lib/useBreakpoint";
import { useT } from "../lib/useT";
import { AnalyticsTab } from "./dashboard/AnalyticsTab";
import { PredictionsTab } from "./dashboard/PredictionsTab";
import { CategoriesTab } from "./dashboard/CategoriesTab";
import { HealthIndexTab } from "./dashboard/HealthIndexTab";
import { DataMgmtTab } from "./dashboard/DataMgmtTab";
import { TrackingTab } from "./dashboard/TrackingTab";

type DashboardTab =
  | "overview"
  | "analytics"
  | "predictions"
  | "categories"
  | "health-index"
  | "data"
  | "tracking";

const DASH_TABS: Array<{ id: DashboardTab; label: string; icon: keyof typeof Icon }> = [
  { id: "overview", label: "Overview", icon: "Chart" },
  { id: "analytics", label: "Analytics", icon: "Pulse" },
  { id: "predictions", label: "AI Predictions", icon: "Sparkles" },
  { id: "categories", label: "Outbreak Categories", icon: "Layers" },
  { id: "health-index", label: "Global Health Index", icon: "Globe" },
  { id: "data", label: "Data Management", icon: "News" },
  { id: "tracking", label: "Disease Tracking", icon: "Map" },
];

const ACCENT = "#4ee0c4";

type RangeKey = "24h" | "7d" | "30d" | "90d";
const TO_TIME_RANGE: Record<RangeKey, TimeRange> = {
  "24h": "24h",
  "7d": "7d",
  "30d": "30d",
  "90d": "6m",
};
const TO_DASHBOARD: Record<RangeKey, "24h" | "7d" | "30d" | "1y"> = {
  "24h": "24h",
  "7d": "7d",
  "30d": "30d",
  "90d": "1y",
};

export function AnalyticsDashboardScreen() {
  const [tab, setTab] = useState<DashboardTab>("overview");
  const [range, setRange] = useState<RangeKey>("7d");
  const supaRange = TO_DASHBOARD[range];
  const timeRange = TO_TIME_RANGE[range];
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTabletDown = bp !== "desktop";

  // Responsive grid templates — used by the dashboard's section layouts.
  const kpiCols = isMobile ? "1fr 1fr" : isTabletDown ? "repeat(3, 1fr)" : "repeat(5, 1fr)";
  const chartCols = isTabletDown ? "1fr" : "1.45fr 1fr";
  const leaderboardCols = isTabletDown ? "1fr" : "1.45fr 1fr";
  const bottomCols = isMobile ? "1fr" : isTabletDown ? "1fr 1fr" : "1fr 1fr 1fr";
  const sectionPad = isMobile ? "12px 14px" : "16px 18px 18px";

  const { ads: sponsoredAds } = useLiveSponsored({ location: "homepage" });
  const { series, labels } = useLiveSeries(supaRange);
  const { regionRisk } = useLiveRegionRisk(supaRange);
  const { outbreaks } = useLiveOutbreaks(timeRange, 300);
  const { alerts } = useLiveAlerts(6, timeRange);
  const { diseases: topDiseases } = useLiveDiseases(supaRange);
  const { kpis } = useDashboardKpis(timeRange);

  // Translated tab labels — kept in sync with DASH_TABS by id.
  const tOverview = useT("Overview");
  const tAnalytics = useT("Analytics");
  const tAIPredictions = useT("AI Predictions");
  const tOutbreakCategories = useT("Outbreak Categories");
  const tGlobalHealthIndex = useT("Global Health Index");
  const tDataManagement = useT("Data Management");
  const tDiseaseTracking = useT("Disease Tracking");
  const tEyebrow = useT("Analytics · Global outlook");
  const tHeadlineLead = useT("The state of the world's health");
  const tToday = useT("today");
  const tThisWeek = useT("this week");
  const tThisMonth = useT("this month");
  const tThisQuarter = useT("this quarter");
  const tFilters = useT("Filters");
  const tExport = useT("Export");
  const tWeeklyReport = useT("Weekly Report");
  // Overview tab labels
  const tActiveOutbreaks = useT("Active Outbreaks");
  const tCountriesAffected = useT("Countries Affected");
  const tCasesLabel = useT("Cases");
  const tCriticalEvents = useT("Critical Events");
  const tAIRiskIndex = useT("AI Risk Index");
  const tDiseaseIncidence = useT("Disease incidence");
  const tCaseCurves = useT("Reported case curves by pathogen");
  const tChoroplethEyebrow = useT("Choropleth · regional risk");
  const tSignalLoudest = useT("Where the signal is loudest");
  const tOpenMap = useT("Open map");
  const tTopPathogens = useT("Top pathogens");
  const tPathogenLeaderboard = useT("Pathogen leaderboard");
  const tForesight = useT("Foresight");
  const tAIForecast = useT("AI forecast");
  const tRegionalVolume = useT("Regional volume");
  const tCasesByRegion = useT("Cases by region");
  const tLatest = useT("Latest");
  const tCriticalAlertsLive = useT("Critical alerts · live");
  const tHotspots = useT("Hotspots");
  const tOutbreakRoster = useT("Outbreak roster");
  const dashLabels: Record<DashboardTab, string> = {
    overview: tOverview,
    analytics: tAnalytics,
    predictions: tAIPredictions,
    categories: tOutbreakCategories,
    "health-index": tGlobalHealthIndex,
    data: tDataManagement,
    tracking: tDiseaseTracking,
  };

  const [activeIds, setActiveIds] = useState<string[]>([]);
  const visibleSeries = useMemo(() => {
    if (!series.length) return [];
    if (!activeIds.length) return series.slice(0, 4);
    return series.filter((s) => activeIds.includes(s.id));
  }, [series, activeIds]);

  const maxBar = Math.max(1, ...topDiseases.map((d) => d.cases));

  const regionBreakdown = useMemo(() => {
    const buckets: Record<string, { count: number; cases: number }> = {};
    for (const o of outbreaks) {
      const k = continentBucket(o.country);
      if (!buckets[k]) buckets[k] = { count: 0, cases: 0 };
      buckets[k].count += 1;
      buckets[k].cases += o.cases;
    }
    return Object.entries(buckets)
      .map(([k, v]) => ({ region: k, count: v.count, cases: v.cases }))
      .sort((a, b) => b.cases - a.cases);
  }, [outbreaks]);
  const maxRegion = Math.max(1, ...regionBreakdown.map((r) => r.cases));

  return (
    <div
      className="ln-app"
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "var(--ln-bg)",
        color: "var(--ln-ink)",
        display: "grid",
        gridTemplateRows: "52px 1fr",
        overflow: "hidden",
      }}
    >
      <TopBar active="dashboard" />

      <div className="ln-pane ln-no-scroll-x" style={{ overflowY: "auto" }}>
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "flex-start" : "flex-end",
            justifyContent: "space-between",
            gap: isMobile ? 14 : 12,
            padding: isMobile ? "16px 14px 12px" : "20px 22px 14px",
            borderBottom: "1px solid var(--ln-line)",
          }}
        >
          <div>
            <span className="ln-eyebrow">{tEyebrow}</span>
            <h1
              className="ln-display"
              style={{
                fontSize: isMobile ? 24 : isTabletDown ? 28 : 36,
                lineHeight: 1.05,
                margin: "4px 0 0",
              }}
            >
              {tHeadlineLead}
              <span style={{ color: "var(--ln-ink-4)" }}>,</span>{" "}
              <span style={{ color: "var(--ln-ink-3)", fontStyle: "italic" }}>
                {range === "24h"
                  ? tToday
                  : range === "7d"
                  ? tThisWeek
                  : range === "30d"
                  ? tThisMonth
                  : tThisQuarter}
              </span>
            </h1>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", border: "1px solid var(--ln-line-2)", borderRadius: 6 }}>
              {(["24h", "7d", "30d", "90d"] as RangeKey[]).map((r, i, arr) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
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
            <button className="ln-btn ln-hide-mobile">
              <Icon.Filter /> {tFilters}
            </button>
            <button className="ln-btn">
              <Icon.ArrowR /> {tExport}
            </button>
          </div>
        </div>

        {/* Dashboard tab strip — 7 tabs from the design.
            On mobile/tablet scrolls horizontally so every tab stays reachable
            via swipe instead of wrapping (which clipped). */}
        <div
          className="ln-pane"
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: isMobile ? "nowrap" : "wrap",
            overflowX: isMobile ? "auto" : "visible",
            WebkitOverflowScrolling: "touch",
            rowGap: 0,
            columnGap: isMobile ? 2 : 4,
            padding: isMobile ? "0 8px" : "0 22px",
            borderBottom: "1px solid var(--ln-line)",
            background: "var(--ln-topbar)",
          }}
        >
          {DASH_TABS.map((t) => {
            const IconCmp = Icon[t.icon];
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: isMobile ? "11px 10px" : "14px 14px",
                  background: active ? "rgba(255,255,255,0.04)" : "none",
                  border: "none",
                  cursor: "pointer",
                  color: active ? "var(--ln-ink)" : "var(--ln-ink-3)",
                  borderBottom: active ? `2px solid ${ACCENT}` : "2px solid transparent",
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: active ? 500 : 400,
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <IconCmp />
                {dashLabels[t.id]}
              </button>
            );
          })}
          {!isMobile && <div style={{ flex: 1, minWidth: 12 }} />}
          <Link
            to="/dashboard/weekly-report"
            style={{
              padding: isMobile ? "11px 10px" : "14px 14px",
              fontSize: isMobile ? 12 : 13,
              color: "var(--ln-ink-3)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            <Icon.News /> {tWeeklyReport} <Icon.ArrowR />
          </Link>
        </div>

        {tab !== "overview" && (
          <>
            {tab === "analytics" && (
              <AnalyticsTab range={timeRange} isMobile={isMobile} isTabletDown={isTabletDown} />
            )}
            {tab === "predictions" && (
              <PredictionsTab isMobile={isMobile} isTabletDown={isTabletDown} />
            )}
            {tab === "categories" && (
              <CategoriesTab range={timeRange} isMobile={isMobile} isTabletDown={isTabletDown} />
            )}
            {tab === "health-index" && (
              <HealthIndexTab isMobile={isMobile} isTabletDown={isTabletDown} />
            )}
            {tab === "data" && (
              <DataMgmtTab range={timeRange} isMobile={isMobile} isTabletDown={isTabletDown} />
            )}
            {tab === "tracking" && (
              <TrackingTab range={timeRange} isMobile={isMobile} isTabletDown={isTabletDown} />
            )}
          </>
        )}

        {tab === "overview" && (
          <>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: kpiCols,
            gap: 0,
            borderBottom: "1px solid var(--ln-line)",
          }}
        >
          {[
            {
              label: tActiveOutbreaks,
              value: kpis ? kpis.activeOutbreaks.toLocaleString() : "—",
              delta: kpis?.activeOutbreaksDelta ?? "—",
              spark: kpis?.outbreaksSpark ?? [],
              accent: "var(--ln-crit)",
              tone: "crit" as const,
            },
            {
              label: tCountriesAffected,
              value: kpis ? kpis.countries.toLocaleString() : "—",
              delta: kpis?.countriesDelta ?? "—",
              spark: kpis?.countriesSpark ?? [],
              accent: "var(--ln-warn)",
              tone: "warn" as const,
            },
            {
              label: `${tCasesLabel} · ${range}`,
              value: kpis ? compactNumber(kpis.cases) : "—",
              delta: kpis?.casesDelta ?? "—",
              spark: kpis?.casesSpark ?? [],
              accent: "var(--ln-info)",
              tone: "crit" as const,
            },
            {
              label: tCriticalEvents,
              value: kpis ? kpis.critical.toLocaleString() : "—",
              delta: kpis?.criticalDelta ?? "—",
              spark: kpis?.criticalSpark ?? [],
              accent: "var(--ln-crit)",
              tone: "crit" as const,
            },
            {
              label: tAIRiskIndex,
              value: kpis ? kpis.aiRiskIndex.toFixed(1) : "—",
              unit: "/10",
              delta: kpis?.aiRiskDelta ?? "—",
              spark: kpis?.aiRiskSpark ?? [],
              accent: ACCENT,
              tone: "warn" as const,
            },
          ].map((k) => (
            <div
              key={k.label}
              style={{
                borderRight: "1px solid var(--ln-line)",
                borderTop: "1px solid var(--ln-line)",
                padding: isMobile ? "12px 14px 10px" : "18px 18px 16px",
                position: "relative",
              }}
            >
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: k.accent }} />
              <span className="ln-eyebrow">{k.label}</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 8 }}>
                <span
                  className="ln-num"
                  style={{ fontSize: isMobile ? 24 : 34, fontWeight: 500, letterSpacing: "-0.03em" }}
                >
                  {k.value}
                </span>
                {("unit" in k && k.unit) && (
                  <span className="ln-num" style={{ fontSize: 13, color: "var(--ln-ink-3)" }}>
                    {k.unit}
                  </span>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  gap: 6,
                  marginTop: 8,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--ln-font-mono)",
                    fontSize: isMobile ? 10 : 11,
                    color: k.tone === "crit" ? "var(--ln-crit)" : "var(--ln-warn)",
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  ▲ {k.delta}
                  {!isMobile && <span style={{ color: "var(--ln-ink-4)" }}> vs prior period</span>}
                </span>
                <Sparkline
                  data={k.spark}
                  color={k.accent}
                  width={isMobile ? 50 : 70}
                  height={isMobile ? 18 : 22}
                />
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: chartCols,
            borderBottom: "1px solid var(--ln-line)",
          }}
        >
          <div
            style={{
              borderRight: isTabletDown ? "none" : "1px solid var(--ln-line)",
              borderBottom: isTabletDown ? "1px solid var(--ln-line)" : "none",
              padding: sectionPad,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <span className="ln-eyebrow">{tDiseaseIncidence} · {range}</span>
                <h2 style={{ fontSize: isMobile ? 16 : 18, margin: "4px 0 0", fontWeight: 500 }}>
                  {tCaseCurves}
                </h2>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  flexWrap: "wrap",
                  maxWidth: isMobile ? "100%" : 360,
                  justifyContent: isMobile ? "flex-start" : "flex-end",
                }}
              >
                {series.slice(0, 7).map((d) => {
                  const on = activeIds.length === 0 ? series.indexOf(d) < 4 : activeIds.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      onClick={() => {
                        if (activeIds.length === 0) {
                          // initialise to current visible set, then toggle
                          const init = series.slice(0, 4).map((s) => s.id);
                          const next = init.includes(d.id) ? init.filter((x) => x !== d.id) : [...init, d.id];
                          setActiveIds(next);
                        } else {
                          setActiveIds(on ? activeIds.filter((x) => x !== d.id) : [...activeIds, d.id]);
                        }
                      }}
                      style={{
                        padding: "4px 8px",
                        fontSize: 11,
                        border: "1px solid var(--ln-line-2)",
                        background: on ? "rgba(255,255,255,0.04)" : "transparent",
                        color: on ? "var(--ln-ink)" : "var(--ln-ink-4)",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <span style={{ width: 7, height: 7, background: on ? d.color : "var(--ln-line-3)", borderRadius: 1 }} />
                      {d.label.split(" ")[0]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ marginTop: 14, width: "100%", overflow: "hidden" }}>
              {visibleSeries.length ? (
                <LineChart
                  series={visibleSeries}
                  labels={labels}
                  width={isMobile ? 320 : 760}
                  height={isMobile ? 200 : 260}
                />
              ) : (
                <div
                  style={{
                    height: isMobile ? 180 : 260,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--ln-ink-3)",
                    fontSize: 12,
                  }}
                >
                  No incidence data for this range yet.
                </div>
              )}
            </div>
            {/* Legend: stack one-per-row on mobile so long pathogen names never
                truncate. Each row is a flex container with the label expanding
                and the value pinned to the right. */}
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: isMobile ? 6 : 24,
                marginTop: 6,
                paddingTop: 8,
                borderTop: "1px solid var(--ln-line)",
                flexWrap: "wrap",
              }}
            >
              {visibleSeries.map((s) => {
                const last = s.data[s.data.length - 1];
                return (
                  <div
                    key={s.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minWidth: 0,
                      width: isMobile ? "100%" : "auto",
                    }}
                  >
                    <span
                      style={{
                        width: 16,
                        height: 2,
                        background: s.color,
                        flex: "0 0 16px",
                      }}
                    />
                    <span
                      style={{
                        fontSize: isMobile ? 11 : 11.5,
                        color: "var(--ln-ink-2)",
                        flex: isMobile ? 1 : "0 1 auto",
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={s.label}
                    >
                      {s.label}
                    </span>
                    <span
                      className="ln-num"
                      style={{
                        fontSize: 11,
                        color: "var(--ln-ink-3)",
                        flex: "0 0 auto",
                      }}
                    >
                      {last.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ padding: sectionPad }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div>
                <span className="ln-eyebrow">{tChoroplethEyebrow}</span>
                <h2 style={{ fontSize: isMobile ? 16 : 18, margin: "4px 0 0", fontWeight: 500 }}>
                  {tSignalLoudest}
                </h2>
              </div>
              <Link to="/map" className="ln-btn">
                <Icon.Map /> {tOpenMap}
              </Link>
            </div>
            <div
              style={{
                height: isMobile ? 200 : 240,
                width: "100%",
                maxWidth: "100%",
                marginTop: 12,
                position: "relative",
                overflow: "hidden",
                contain: "paint",
              }}
            >
              <WorldMap
                width={isMobile ? 320 : 620}
                height={isMobile ? 180 : 240}
                outbreaks={outbreaks.map((o) => ({
                  id: o.id,
                  lng: o.lng,
                  lat: o.lat,
                  severity: o.severity,
                }))}
                regionRisk={regionRisk}
                showChoropleth
                pulse={false}
                dotSpacing={11}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
                gap: 8,
                marginTop: 10,
              }}
            >
              {Object.entries(regionRisk).slice(0, isMobile ? 6 : 9).map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 11,
                    padding: "4px 6px",
                    background: "var(--ln-surface-2)",
                  }}
                >
                  <span style={{ color: "var(--ln-ink-2)" }}>{k}</span>
                  <span
                    className="ln-num"
                    style={{
                      color:
                        v >= 0.7 ? "var(--ln-crit)" : v >= 0.5 ? "var(--ln-warn)" : "var(--ln-ink-3)",
                    }}
                  >
                    {(v * 10).toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: leaderboardCols,
            borderBottom: "1px solid var(--ln-line)",
          }}
        >
          <div
            style={{
              borderRight: isTabletDown ? "none" : "1px solid var(--ln-line)",
              borderBottom: isTabletDown ? "1px solid var(--ln-line)" : "none",
            }}
          >
            <PaneHead
              eyebrow={tTopPathogens}
              title={`${tPathogenLeaderboard} · ${range}`}
              right={
                <button className="ln-btn" style={{ fontSize: 11 }}>
                  Sort: Cases ▾
                </button>
              }
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "90px 1fr 56px 52px"
                  : "128px 1fr 60px 56px 84px",
                alignItems: "center",
                gap: isMobile ? 8 : 12,
                padding: isMobile ? "6px 12px" : "6px 14px",
                borderBottom: "1px solid var(--ln-line)",
                fontFamily: "var(--ln-font-mono)",
                fontSize: 10,
                letterSpacing: "0.08em",
                color: "var(--ln-ink-4)",
              }}
            >
              <span>DISEASE</span>
              <span>{isMobile ? "VOL" : "WEEKLY VOLUME"}</span>
              <span style={{ textAlign: "right" }}>{isMobile ? "REPS" : "REPORTS"}</span>
              <span style={{ textAlign: "right" }}>Δ</span>
              {!isMobile && <span style={{ textAlign: "right" }}>TREND</span>}
            </div>
            {topDiseases.length ? (
              topDiseases.slice(0, 8).map((d) => (
                <DiseaseBar
                  key={d.id}
                  label={d.label}
                  color={d.color}
                  cases={d.cases}
                  delta={d.delta}
                  countries={d.countries}
                  max={maxBar}
                  spark={d.spark}
                  isMobile={isMobile}
                />
              ))
            ) : (
              <div style={{ padding: 18, fontSize: 12, color: "var(--ln-ink-3)" }}>
                No disease activity recorded for this range.
              </div>
            )}
          </div>

          <div>
            <PaneHead
              eyebrow={tForesight}
              title={tAIForecast}
              right={
                <span className="ln-chip is-info">
                  <Icon.Sparkles /> Model v3.2
                </span>
              }
            />
            <div style={{ padding: "4px 14px 14px" }}>
              {PREDICTIONS.map((p) => (
                <div
                  key={p.id}
                  style={{ padding: "14px 0", borderBottom: "1px solid var(--ln-line)" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={`${p.disease} · ${p.region}`}
                      >
                        {p.disease} · {p.region}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--ln-font-mono)",
                          fontSize: 11,
                          color: "var(--ln-ink-3)",
                          marginTop: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Horizon {p.horizon} · Confidence {(p.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                    <RiskPill value={p.risk} />
                  </div>
                  <div
                    style={{
                      position: "relative",
                      height: 4,
                      marginTop: 10,
                      background: "rgba(255,255,255,0.05)",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: `${p.risk * 100}%`,
                        background:
                          p.risk >= 0.75
                            ? "var(--ln-crit)"
                            : p.risk >= 0.55
                            ? "var(--ln-warn)"
                            : "var(--ln-info)",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {p.drivers.map((dv) => (
                      <span key={dv} className="ln-chip" style={{ fontSize: 10 }}>
                        {dv}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {sponsoredAds.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: sponsoredAds.length >= 2 ? "1fr 1fr" : "1fr",
              borderBottom: "1px solid var(--ln-line)",
            }}
          >
            {sponsoredAds.slice(0, 2).map((ad, i) => (
              <div
                key={ad.id}
                style={i === 0 && sponsoredAds.length >= 2 ? { borderRight: "1px solid var(--ln-line)" } : {}}
              >
                <AdCard ad={ad} variant="inline" />
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: bottomCols }}>
          <div
            style={{
              borderRight: isMobile ? "none" : "1px solid var(--ln-line)",
              borderBottom: isMobile ? "1px solid var(--ln-line)" : "none",
            }}
          >
            <PaneHead eyebrow={tRegionalVolume} title={tCasesByRegion} />
            <div style={{ padding: "12px 14px" }}>
              {regionBreakdown.length ? (
                regionBreakdown.map((row) => (
                  <div
                    key={row.region}
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "100px 1fr 60px" : "140px 1fr 70px",
                      alignItems: "center",
                      gap: isMobile ? 8 : 10,
                      padding: "5px 0",
                    }}
                  >
                    <span
                      style={{
                        fontSize: isMobile ? 11 : 12,
                        color: "var(--ln-ink-2)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={row.region}
                    >
                      {row.region}
                    </span>
                    <div style={{ position: "relative", height: 12, background: "rgba(255,255,255,0.04)" }}>
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: `${(row.cases / maxRegion) * 100}%`,
                          background: "#ff7a3b",
                          opacity: 0.7,
                        }}
                      />
                    </div>
                    <span className="ln-num" style={{ fontSize: 12, textAlign: "right" }}>
                      {row.cases.toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: "var(--ln-ink-3)" }}>No data.</div>
              )}
            </div>
          </div>

          <div
            style={{
              borderRight: isMobile ? "none" : "1px solid var(--ln-line)",
              borderBottom: isMobile ? "1px solid var(--ln-line)" : "none",
            }}
          >
            <PaneHead
              eyebrow={tLatest}
              title={tCriticalAlertsLive}
              right={
                <span className="ln-chip is-crit">
                  <span className="ln-blink">●</span> LIVE
                </span>
              }
            />
            <AlertTicker items={alerts.slice(0, 6)} />
          </div>

          <div>
            <PaneHead eyebrow={tHotspots} title={tOutbreakRoster} />
            <div style={{ overflow: "hidden" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1fr auto auto",
                  gap: 8,
                  padding: "6px 14px",
                  borderBottom: "1px solid var(--ln-line)",
                  fontFamily: "var(--ln-font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  color: "var(--ln-ink-4)",
                }}
              >
                <span>LOCATION</span>
                <span>DISEASE</span>
                <span>SEV</span>
                <span style={{ textAlign: "right" }}>CASES</span>
              </div>
              {outbreaks
                .slice()
                .sort((a, b) => b.cases - a.cases)
                .slice(0, 8)
                .map((o) => (
                  <div
                    key={o.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.4fr 1fr auto auto",
                      gap: 8,
                      padding: "8px 14px",
                      borderBottom: "1px solid var(--ln-line)",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: "var(--ln-ink)" }}>{o.city}</div>
                      <div
                        style={{
                          fontFamily: "var(--ln-font-mono)",
                          fontSize: 10,
                          color: "var(--ln-ink-4)",
                        }}
                      >
                        {o.country.toUpperCase()}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <span style={{ width: 7, height: 7, background: ACCENT, borderRadius: 1, flex: "0 0 7px" }} />
                      <span
                        style={{
                          fontSize: 11.5,
                          color: "var(--ln-ink-2)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {o.disease}
                      </span>
                    </div>
                    <SeverityBar s={o.severity} />
                    <span className="ln-num" style={{ fontSize: 12, textAlign: "right" }}>
                      {o.cases.toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}

function continentBucket(country: string): string {
  const map: Record<string, string> = {
    "United States": "North America", USA: "North America", Canada: "North America", Mexico: "North America",
    Brazil: "South America", Argentina: "South America", Chile: "South America", Colombia: "South America",
    Peru: "South America", Venezuela: "South America", Ecuador: "South America",
    "United Kingdom": "Europe", France: "Europe", Germany: "Europe", Spain: "Europe", Italy: "Europe",
    Russia: "Europe",
    China: "East Asia", Japan: "East Asia", "South Korea": "East Asia",
    India: "South Asia", Pakistan: "South Asia", Bangladesh: "South Asia",
    Thailand: "SE Asia", Indonesia: "SE Asia", Philippines: "SE Asia", Vietnam: "SE Asia",
    Nigeria: "Sub-Saharan Africa", Kenya: "Sub-Saharan Africa", "South Africa": "Sub-Saharan Africa",
    "DR Congo": "Sub-Saharan Africa", Uganda: "Sub-Saharan Africa", Rwanda: "Sub-Saharan Africa",
    Sudan: "Sub-Saharan Africa", Ethiopia: "Sub-Saharan Africa",
    Egypt: "Middle East / NA", "Saudi Arabia": "Middle East / NA", Iran: "Middle East / NA",
    Australia: "Oceania", "New Zealand": "Oceania",
  };
  return map[country] ?? "Other";
}
