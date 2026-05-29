import { useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { Sparkline } from "../components/Sparkline";
import { WorldMap } from "../components/WorldMap";
import { AdCard } from "../components/AdCard";
import { TopBar } from "./SurveillanceMap";
import {
  GHI_CATEGORIES,
  GHI_DISEASES,
  GHI_YEARS,
  GHI_COUNTRIES,
  makeTrend,
  type GhiCategory,
  type GhiDisease,
} from "../data/ghiData";
import { useLiveSponsored } from "../data/useLiveSponsored";
import { useLiveRegionRisk } from "../data/useLiveRegionRisk";
import { useRegionalRiskLevels } from "../../lib/useRegionalRiskLevels";
import { useBreakpoint } from "../lib/useBreakpoint";

const ACCENT = "#4ee0c4";

const selStyle = {
  background: "var(--ln-surface-2)",
  border: "1px solid var(--ln-line-2)",
  padding: "7px 10px",
  fontSize: 12.5,
  color: "var(--ln-ink)",
  borderRadius: 6,
} as const;

export function GlobalHealthIndexScreen() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTabletDown = bp !== "desktop";

  const [diseaseId, setDiseaseId] = useState<string>("ischemic");
  const [category, setCategory] = useState<GhiCategory>("all");
  const [year, setYear] = useState<number>(2026);
  const [country, setCountry] = useState<string>("all");
  const [diseaseSearch, setDiseaseSearch] = useState("");

  const { ads } = useLiveSponsored({ location: "homepage" });
  const { regionRisk } = useLiveRegionRisk("30d");
  const { data: regions } = useRegionalRiskLevels("30d");

  const visibleDiseases = useMemo(
    () =>
      GHI_DISEASES.filter((d) => category === "all" || d.cat === category).filter(
        (d) => !diseaseSearch || d.name.toLowerCase().includes(diseaseSearch.toLowerCase())
      ),
    [category, diseaseSearch]
  );

  const disease = useMemo(
    () => GHI_DISEASES.find((d) => d.id === diseaseId) || GHI_DISEASES[0],
    [diseaseId]
  );

  const cFactor =
    country === "all" ? 1 : GHI_COUNTRIES.find((c) => c.code === country)?.factor || 1;

  const metricSeries = useMemo(
    () => ({
      prevalence: makeTrend(disease.prevalence * cFactor, 0.04, -0.008),
      incidence: makeTrend(disease.incidence * cFactor, 0.05, 0.004),
      mortality: makeTrend(disease.mortality * cFactor, 0.03, -0.014),
      dalys: makeTrend(disease.dalys * cFactor, 0.03, -0.006),
    }),
    [disease, cFactor]
  );

  const yearIndex = GHI_YEARS.indexOf(year);
  const val = (s: number[]) => s[yearIndex];
  const trend = (s: number[]) =>
    yearIndex > 0 ? +(((s[yearIndex] - s[yearIndex - 1]) / s[yearIndex - 1]) * 100).toFixed(1) : 0;

  const liveRiskByCountry = useMemo(() => {
    const m = new Map<string, "low" | "medium" | "high" | "critical">();
    for (const r of regions) {
      for (const c of r.countries) m.set(c.name, c.riskLevel);
    }
    return m;
  }, [regions]);

  // Responsive column templates for the chart rows.
  const triCols = isMobile ? "1fr" : isTabletDown ? "1fr 1fr" : "1fr 1fr 1fr";
  const duoCols = isTabletDown ? "1fr" : "1fr 1fr";
  const leaderCols = isTabletDown ? "1fr" : "1.1fr 1fr";

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
      <TopBar active="ghi" />

      <div className="ln-pane" style={{ overflowY: "auto" }}>
        {/* Filter strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: isMobile ? "12px 14px" : "14px 28px",
            borderBottom: "1px solid var(--ln-line)",
            background: "var(--ln-topbar)",
            flexWrap: "wrap",
          }}
        >
          <select value={category} onChange={(e) => setCategory(e.target.value as GhiCategory)} style={selStyle}>
            {GHI_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <select value={country} onChange={(e) => setCountry(e.target.value)} style={selStyle}>
            <option value="all">All countries</option>
            {GHI_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--ln-ink-3)", fontFamily: "var(--ln-font-mono)" }}>
              YEAR
            </span>
            <input
              type="range"
              min={2020}
              max={2026}
              value={year}
              onChange={(e) => setYear(+e.target.value)}
              style={{ width: isMobile ? 110 : 160 }}
            />
            <span className="ln-num" style={{ fontSize: 16, color: ACCENT, width: 48 }}>
              {year}
            </span>
          </div>
          <div style={{ flex: 1 }} />
          <button className="ln-btn ln-hide-mobile">
            <Icon.ArrowR /> Export
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isTabletDown ? "1fr" : "260px 1fr" }}>
          {/* Disease sidebar */}
          {!isTabletDown && (
            <aside
              style={{ borderRight: "1px solid var(--ln-line)", background: "var(--ln-rail)" }}
              className="ln-pane"
            >
              <div style={{ padding: "16px 14px 10px" }}>
                <span className="ln-eyebrow">Conditions</span>
                <div style={{ position: "relative", marginTop: 8 }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--ln-ink-4)",
                    }}
                  >
                    <Icon.Search />
                  </span>
                  <input
                    className="ln-input"
                    placeholder="Search…"
                    value={diseaseSearch}
                    onChange={(e) => setDiseaseSearch(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ borderTop: "1px solid var(--ln-line)" }}>
                {visibleDiseases.map((d) => {
                  const on = d.id === diseaseId;
                  const catLabel =
                    GHI_CATEGORIES.find((c) => c.id === d.cat)?.label.split(",")[0] || d.cat;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setDiseaseId(d.id)}
                      style={{
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        padding: "12px 14px",
                        background: on ? "rgba(255,255,255,0.04)" : "transparent",
                        border: "none",
                        borderLeft: on ? `2px solid ${ACCENT}` : "2px solid transparent",
                        borderBottom: "1px solid var(--ln-line)",
                        cursor: "pointer",
                        color: "inherit",
                        textAlign: "left",
                      }}
                    >
                      <span style={{ fontSize: 13, color: on ? "var(--ln-ink)" : "var(--ln-ink-2)" }}>
                        {d.name}
                      </span>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span
                          style={{
                            fontFamily: "var(--ln-font-mono)",
                            fontSize: 9,
                            color: "var(--ln-ink-4)",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                          }}
                        >
                          {catLabel}
                        </span>
                        <span className="ln-num" style={{ fontSize: 10, color: "var(--ln-ink-3)" }}>
                          {d.dalys}M DALYs
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>
          )}

          {/* Main content */}
          <main>
            {/* Disease header */}
            <div style={{ padding: isMobile ? "16px 14px" : "24px 28px 18px", borderBottom: "1px solid var(--ln-line)" }}>
              {isTabletDown && (
                <select
                  value={diseaseId}
                  onChange={(e) => setDiseaseId(e.target.value)}
                  style={{ ...selStyle, width: "100%", marginBottom: 12 }}
                >
                  {visibleDiseases.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}
              <span className="ln-eyebrow">{GHI_CATEGORIES.find((c) => c.id === disease.cat)?.label}</span>
              <h2
                className="ln-display"
                style={{
                  fontSize: isMobile ? 26 : 38,
                  margin: "8px 0 6px",
                  letterSpacing: "-0.025em",
                }}
              >
                {disease.name}
                <span style={{ color: "var(--ln-ink-4)" }}>,</span>{" "}
                <span style={{ color: "var(--ln-ink-3)", fontStyle: "italic" }}>
                  {country === "all" ? "global" : GHI_COUNTRIES.find((c) => c.code === country)?.name} · {year}
                </span>
              </h2>
              <p
                style={{
                  fontSize: 13.5,
                  color: "var(--ln-ink-2)",
                  maxWidth: 720,
                  margin: "4px 0 0",
                  lineHeight: 1.5,
                }}
              >
                Source: IHME Global Burden of Disease 2024 release · WHO Global Health Observatory · CDC NCHS.
                All age-standardized rates per 100,000 unless noted.
              </p>
            </div>

            {/* 4 metric cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr 1fr" : isTabletDown ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
                borderBottom: "1px solid var(--ln-line)",
              }}
            >
              <MetricCard
                label="Prevalence"
                value={val(metricSeries.prevalence).toFixed(1)}
                unit="per 100k"
                trend={trend(metricSeries.prevalence)}
                sparkline={metricSeries.prevalence}
                color="#6ab7ff"
              />
              <MetricCard
                label="Incidence"
                value={val(metricSeries.incidence).toFixed(1)}
                unit="new/year"
                trend={trend(metricSeries.incidence)}
                sparkline={metricSeries.incidence}
                color={ACCENT}
                border={!isMobile}
              />
              <MetricCard
                label="Mortality"
                value={(val(metricSeries.mortality) * 100).toFixed(2) + "%"}
                unit="age-stand."
                trend={trend(metricSeries.mortality)}
                sparkline={metricSeries.mortality}
                color="var(--ln-crit)"
                border
              />
              <MetricCard
                label="DALYs"
                value={val(metricSeries.dalys).toFixed(1)}
                unit="million yrs"
                trend={trend(metricSeries.dalys)}
                sparkline={metricSeries.dalys}
                color="var(--ln-warn)"
                border={!isMobile}
              />
            </div>

            {/* Trend + country comparison */}
            <div style={{ display: "grid", gridTemplateColumns: duoCols, borderBottom: "1px solid var(--ln-line)" }}>
              <Panel
                title="Time-series trend · 2020-2026"
                eyebrow="Prevalence + DALYs"
                right={<span className="ln-chip">{disease.name.split(" ")[0]}</span>}
              >
                <TrendChart
                  seriesA={metricSeries.prevalence}
                  seriesB={metricSeries.dalys.map((d) => d * 10)}
                />
              </Panel>
              <Panel
                title="Country comparison · top 8"
                eyebrow="DALYs per 100k"
                right={
                  <span style={{ fontFamily: "var(--ln-font-mono)", fontSize: 11, color: "var(--ln-ink-3)" }}>
                    {year}
                  </span>
                }
                bordered={!isTabletDown}
              >
                <CountryBars disease={disease} />
              </Panel>
            </div>

            {/* Histogram + bubble + radar */}
            <div style={{ display: "grid", gridTemplateColumns: triCols, borderBottom: "1px solid var(--ln-line)" }}>
              <Panel title="Distribution histogram" eyebrow="Cases per 100k by age">
                <AgeHistogram />
              </Panel>
              <Panel title="Disease burden analysis" eyebrow="Prevalence × Mortality" bordered={!isMobile}>
                <BubbleChart />
              </Panel>
              <Panel
                title="Top risk factors"
                eyebrow={`Attributed to ${disease.name.split(" ")[0]}`}
                bordered={!isTabletDown}
              >
                <RadarChart disease={disease} />
              </Panel>
            </div>

            {/* Top conditions + category stacked */}
            <div style={{ display: "grid", gridTemplateColumns: leaderCols, borderBottom: "1px solid var(--ln-line)" }}>
              <Panel title="Top 10 conditions by burden" eyebrow="DALYs (millions)">
                <TopConditionsBars onPick={setDiseaseId} />
              </Panel>
              <Panel title="Category burden comparison" eyebrow="Stacked share by region" bordered={!isTabletDown}>
                <CategoryStacked />
              </Panel>
            </div>

            {/* Gender + YLDs/YLLs + gender split */}
            <div style={{ display: "grid", gridTemplateColumns: triCols, borderBottom: "1px solid var(--ln-line)" }}>
              <Panel title="Gender distribution by condition" eyebrow="Male vs. female · top 6">
                <GenderByCondition />
              </Panel>
              <Panel title="YLDs vs YLLs" eyebrow="Disability vs. life lost" bordered={!isMobile}>
                <YldsYlls />
              </Panel>
              <Panel title="Selected condition · gender split" eyebrow={disease.name} bordered={!isTabletDown}>
                <GenderSplit disease={disease} />
              </Panel>
            </div>

            {/* World map + side panel */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isTabletDown ? "1fr" : "1.6fr 1fr",
                borderBottom: "1px solid var(--ln-line)",
              }}
            >
              <div style={{ padding: isMobile ? "14px 14px 18px" : "14px 22px 22px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <span className="ln-eyebrow">Live regional risk · 30d</span>
                    <h3 style={{ fontSize: 16, margin: "4px 0 0", fontWeight: 500 }}>
                      Outbreak signal pressure today
                    </h3>
                  </div>
                  <span className="ln-chip">{year}</span>
                </div>
                <div style={{ height: 280, position: "relative" }}>
                  <WorldMap
                    width={760}
                    height={280}
                    outbreaks={[]}
                    regionRisk={regionRisk}
                    showChoropleth
                    pulse={false}
                    dotSpacing={11}
                  />
                </div>
              </div>
              <div
                style={{
                  borderLeft: isTabletDown ? "none" : "1px solid var(--ln-line)",
                  borderTop: isTabletDown ? "1px solid var(--ln-line)" : "none",
                  padding: 20,
                }}
              >
                <span className="ln-eyebrow">Data source</span>
                <div style={{ fontSize: 12.5, color: "var(--ln-ink-2)", marginTop: 6 }}>
                  IHME · WHO · CDC · NCPG
                </div>
                <div style={{ height: 1, background: "var(--ln-line)", margin: "16px 0" }} />
                <span className="ln-eyebrow">Risk factors · {disease.name.split(" ")[0]}</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  {disease.riskFactors.map((rf) => (
                    <span key={rf} className="ln-chip" style={{ fontSize: 10 }}>
                      {rf}
                    </span>
                  ))}
                </div>
                <div style={{ height: 1, background: "var(--ln-line)", margin: "16px 0" }} />
                <span className="ln-eyebrow">Methodology</span>
                <p style={{ fontSize: 11.5, color: "var(--ln-ink-3)", lineHeight: 1.55, marginTop: 6 }}>
                  Age-standardized rates apply the 2015 WHO world standard population. DALYs sum years lived
                  with disability (YLDs) and years of life lost (YLLs). Confidence intervals available via the
                  Methods button.
                </p>
                <button className="ln-btn" style={{ marginTop: 12, width: "100%", justifyContent: "center" }}>
                  Methods note <Icon.ArrowR />
                </button>
              </div>
            </div>

            {/* Country table */}
            <div style={{ borderBottom: "1px solid var(--ln-line)" }}>
              <div
                style={{
                  padding: isMobile ? "14px 14px 8px" : "14px 22px 8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div>
                  <span className="ln-eyebrow">Detailed country data</span>
                  <h3 style={{ fontSize: 16, margin: "4px 0 0", fontWeight: 500 }}>
                    {disease.name} · {year}
                  </h3>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="ln-btn">CSV</button>
                  <button className="ln-btn">JSON</button>
                  {!isMobile && <button className="ln-btn">Parquet</button>}
                </div>
              </div>
              <CountryTable disease={disease} liveRiskByCountry={liveRiskByCountry} isTabletDown={isTabletDown} />
            </div>

            {/* Disclaimer */}
            <div
              style={{
                background: "var(--ln-surface)",
                padding: isMobile ? "18px 14px" : "22px 28px",
                borderBottom: "1px solid var(--ln-line)",
              }}
            >
              <span className="ln-eyebrow">Disclaimer</span>
              <p style={{ fontSize: 12, color: "var(--ln-ink-3)", lineHeight: 1.6, marginTop: 8, maxWidth: 900 }}>
                The burden-of-disease data shown is compiled from publicly available sources (IHME GBD 2024, WHO
                GHO, CDC NCHS) for informational and reference purposes only. Live regional-risk chips on the
                country table reflect current outbreak-signal activity from the LiveHealth+ surveillance feed.
                For official statistics, refer to the publishing national health authorities.
              </p>
            </div>

            {/* Sponsored */}
            {ads.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: ads.length >= 2 && !isMobile ? "1fr 1fr" : "1fr",
                }}
              >
                {ads.slice(0, 2).map((ad, i) => (
                  <div
                    key={ad.id}
                    style={i === 0 && ads.length >= 2 && !isMobile ? { borderRight: "1px solid var(--ln-line)" } : {}}
                  >
                    <AdCard ad={ad} variant="inline" />
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

/* ─── Reusable Panel ─── */
function Panel({
  title,
  eyebrow,
  right,
  children,
  bordered,
}: {
  title: string;
  eyebrow: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  bordered?: boolean;
}) {
  return (
    <div style={{ padding: "14px 22px 18px", borderLeft: bordered ? "1px solid var(--ln-line)" : "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <span className="ln-eyebrow">{eyebrow}</span>
          <h3 style={{ fontSize: 16, margin: "4px 0 0", fontWeight: 500 }}>{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  trend,
  sparkline,
  color,
  border,
}: {
  label: string;
  value: string;
  unit: string;
  trend: number;
  sparkline: number[];
  color: string;
  border?: boolean;
}) {
  const up = trend > 0;
  return (
    <div style={{ padding: "18px 22px", borderLeft: border ? "1px solid var(--ln-line)" : "none", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 28, height: 2, background: color }} />
      <span className="ln-eyebrow">{label}</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
        <span className="ln-num" style={{ fontSize: 34, fontWeight: 500, letterSpacing: "-0.03em" }}>
          {value}
        </span>
        <span className="ln-num" style={{ fontSize: 12, color: "var(--ln-ink-3)" }}>
          {unit}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 10 }}>
        <span
          style={{
            fontFamily: "var(--ln-font-mono)",
            fontSize: 11,
            color: up ? "var(--ln-crit)" : trend < 0 ? "var(--ln-brand)" : "var(--ln-ink-3)",
          }}
        >
          {trend === 0 ? "◆" : up ? "▲" : "▼"} {trend > 0 ? "+" : ""}
          {trend}% <span style={{ color: "var(--ln-ink-4)" }}>YoY</span>
        </span>
        <Sparkline data={sparkline} color={color} width={76} height={24} />
      </div>
    </div>
  );
}

function TrendChart({ seriesA, seriesB }: { seriesA: number[]; seriesB: number[] }) {
  const W = 540;
  const H = 220;
  const padL = 36;
  const padB = 26;
  const maxA = Math.max(...seriesA);
  const maxB = Math.max(...seriesB);
  const xAt = (i: number) => padL + (i / (seriesA.length - 1)) * (W - padL - 12);
  const yA = (v: number) => 8 + (H - padB - 8) - (v / maxA) * (H - padB - 16);
  const yB = (v: number) => 8 + (H - padB - 8) - (v / maxB) * (H - padB - 16);
  const pathB = seriesB.map((v, i) => `${i ? "L" : "M"}${xAt(i)} ${yB(v)}`).join(" ");
  const pathA = seriesA.map((v, i) => `${i ? "L" : "M"}${xAt(i)} ${yA(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      {[0, 0.5, 1].map((p) => (
        <g key={p}>
          <line
            x1={padL}
            y1={8 + (H - padB - 8) * (1 - p)}
            x2={W - 12}
            y2={8 + (H - padB - 8) * (1 - p)}
            stroke="var(--ln-line)"
            strokeDasharray="2 4"
          />
          <text
            x={padL - 6}
            y={8 + (H - padB - 8) * (1 - p) + 3}
            fontSize="10"
            textAnchor="end"
            fill="var(--ln-ink-4)"
            fontFamily="var(--ln-font-mono)"
          >
            {Math.round(maxA * p)}
          </text>
        </g>
      ))}
      {GHI_YEARS.map((y, i) => (
        <text
          key={y}
          x={xAt(i)}
          y={H - 6}
          fontSize="10"
          textAnchor="middle"
          fill="var(--ln-ink-4)"
          fontFamily="var(--ln-font-mono)"
        >
          {y}
        </text>
      ))}
      <path
        d={`${pathB} L${xAt(seriesB.length - 1)} ${H - padB} L${padL} ${H - padB} Z`}
        fill="var(--ln-warn)"
        opacity="0.12"
      />
      <path d={pathB} fill="none" stroke="var(--ln-warn)" strokeWidth="1.5" strokeLinecap="round" />
      <path d={pathA} fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
      {seriesA.map((v, i) => (
        <circle key={i} cx={xAt(i)} cy={yA(v)} r="3" fill={ACCENT} />
      ))}
      <g transform={`translate(${W - 180} 10)`}>
        <rect x="0" y="0" width="170" height="36" fill="var(--ln-overlay-bg)" stroke="var(--ln-line-2)" />
        <line x1="8" y1="12" x2="20" y2="12" stroke={ACCENT} strokeWidth="2" />
        <text x="24" y="15" fontSize="10" fill="var(--ln-ink-2)" fontFamily="var(--ln-font-mono)">
          Prevalence (per 100k)
        </text>
        <rect x="8" y="22" width="12" height="3" fill="var(--ln-warn)" opacity="0.5" />
        <text x="24" y="28" fontSize="10" fill="var(--ln-ink-2)" fontFamily="var(--ln-font-mono)">
          DALYs (×10)
        </text>
      </g>
    </svg>
  );
}

function CountryBars({ disease }: { disease: GhiDisease }) {
  const rows = GHI_COUNTRIES.slice()
    .sort((a, b) => b.factor - a.factor)
    .slice(0, 8)
    .map((c) => ({ code: c.code, name: c.name, dalys: +(disease.dalys * c.factor).toFixed(1) }));
  const max = Math.max(...rows.map((r) => r.dalys));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {rows.map((r) => (
        <div key={r.code} style={{ display: "grid", gridTemplateColumns: "120px 1fr 50px", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "var(--ln-ink-2)" }}>{r.name}</span>
          <div style={{ height: 12, background: "rgba(255,255,255,0.04)", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, width: `${(r.dalys / max) * 100}%`, background: "var(--ln-brand)", opacity: 0.75 }} />
          </div>
          <span className="ln-num" style={{ fontSize: 12, textAlign: "right" }}>
            {r.dalys}
          </span>
        </div>
      ))}
    </div>
  );
}

function AgeHistogram() {
  const bins = ["0-4", "5-14", "15-24", "25-34", "35-44", "45-54", "55-64", "65-74", "75+"];
  const vals = [42, 28, 52, 88, 128, 184, 234, 268, 312];
  const max = Math.max(...vals);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 140, padding: "0 0 4px" }}>
        {vals.map((v, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span className="ln-num" style={{ fontSize: 9, color: "var(--ln-ink-3)" }}>
              {v}
            </span>
            <div style={{ width: "100%", height: `${(v / max) * 100}%`, background: ACCENT, opacity: 0.7, minHeight: 2 }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {bins.map((b) => (
          <span
            key={b}
            style={{ flex: 1, textAlign: "center", fontFamily: "var(--ln-font-mono)", fontSize: 9, color: "var(--ln-ink-4)" }}
          >
            {b}
          </span>
        ))}
      </div>
    </div>
  );
}

function BubbleChart() {
  const items = GHI_DISEASES.slice(0, 10).map((d) => ({
    name: d.name.split(" ")[0],
    prev: d.prevalence,
    mort: d.mortality * 100,
    dalys: d.dalys,
    color: d.cat === "ncd" ? ACCENT : d.cat === "communicable" ? "#ff8b6b" : d.cat === "injuries" ? "#ffb547" : "#b07cff",
  }));
  const maxP = Math.max(...items.map((i) => i.prev));
  const maxM = Math.max(...items.map((i) => i.mort));
  const W = 320;
  const H = 200;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      <line x1="30" y1={H - 22} x2={W} y2={H - 22} stroke="var(--ln-line-2)" />
      <line x1="30" y1="0" x2="30" y2={H - 22} stroke="var(--ln-line-2)" />
      <text x="30" y={H - 6} fontSize="9" fill="var(--ln-ink-4)" fontFamily="var(--ln-font-mono)">
        → PREVALENCE
      </text>
      <text x="36" y="10" fontSize="9" fill="var(--ln-ink-4)" fontFamily="var(--ln-font-mono)">
        ↑ MORTALITY
      </text>
      {items.map((i) => {
        const x = 30 + (i.prev / maxP) * (W - 40);
        const y = H - 22 - (i.mort / maxM) * (H - 32);
        const r = 4 + (i.dalys / 200) * 14;
        return (
          <g key={i.name}>
            <circle cx={x} cy={y} r={r} fill={i.color} opacity="0.45" />
            <circle cx={x} cy={y} r="3" fill={i.color} />
          </g>
        );
      })}
    </svg>
  );
}

function RadarChart({ disease }: { disease: GhiDisease }) {
  const factors = disease.riskFactors.slice(0, 5).concat(Array(5).fill("—")).slice(0, 5);
  const values = factors.map((_, i) => 0.4 + Math.abs(Math.sin(i * 1.7 + disease.name.length)) * 0.55);
  const cx = 130;
  const cy = 110;
  const r = 80;
  const points = values.map((v, i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    return [cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v];
  });
  const polygon = points.map((p) => `${p[0]},${p[1]}`).join(" ");
  return (
    <svg viewBox="0 0 260 220" width="100%" style={{ display: "block" }}>
      {[0.25, 0.5, 0.75, 1].map((p) => (
        <polygon
          key={p}
          points={Array.from({ length: 5 }, (_, i) => {
            const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
            return `${cx + Math.cos(a) * r * p},${cy + Math.sin(a) * r * p}`;
          }).join(" ")}
          fill="none"
          stroke="var(--ln-line)"
          strokeDasharray="2 3"
        />
      ))}
      {factors.map((f, i) => {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const lx = cx + Math.cos(a) * (r + 28);
        const ly = cy + Math.sin(a) * (r + 14);
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r} stroke="var(--ln-line)" />
            <text x={lx} y={ly} textAnchor="middle" fontSize="9" fill="var(--ln-ink-3)" fontFamily="var(--ln-font-mono)">
              {f}
            </text>
          </g>
        );
      })}
      <polygon points={polygon} fill={ACCENT} opacity="0.2" />
      <polygon points={polygon} fill="none" stroke={ACCENT} strokeWidth="1.5" />
      {points.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={ACCENT} />
      ))}
    </svg>
  );
}

function TopConditionsBars({ onPick }: { onPick: (id: string) => void }) {
  const items = GHI_DISEASES.slice()
    .sort((a, b) => b.dalys - a.dalys)
    .slice(0, 10);
  const max = Math.max(...items.map((d) => d.dalys));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {items.map((d, i) => (
        <button
          key={d.id}
          onClick={() => onPick(d.id)}
          style={{
            display: "grid",
            gridTemplateColumns: "24px 1fr 40px",
            alignItems: "center",
            gap: 10,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "inherit",
            textAlign: "left",
            padding: "5px 0",
          }}
        >
          <span className="ln-num" style={{ fontSize: 11, color: "var(--ln-ink-4)" }}>
            {String(i + 1).padStart(2, "0")}
          </span>
          <div style={{ position: "relative", height: 18, background: "rgba(255,255,255,0.04)" }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                width: `${(d.dalys / max) * 100}%`,
                background:
                  d.cat === "ncd"
                    ? "var(--ln-info)"
                    : d.cat === "communicable"
                    ? "#ff8b6b"
                    : d.cat === "injuries"
                    ? "var(--ln-warn)"
                    : "#b07cff",
                opacity: 0.7,
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 8,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 11.5,
                color: "var(--ln-ink)",
                whiteSpace: "nowrap",
              }}
            >
              {d.name}
            </span>
          </div>
          <span className="ln-num" style={{ fontSize: 12, textAlign: "right" }}>
            {d.dalys}
          </span>
        </button>
      ))}
    </div>
  );
}

function CategoryStacked() {
  const regions = ["Africa", "S. Asia", "SE Asia", "M. East", "S. Am.", "N. Am.", "Europe", "E. Asia"];
  const rows = regions.map((r, i) => {
    const com = [56, 41, 28, 24, 18, 9, 7, 12][i];
    const ncd = [28, 38, 47, 52, 60, 71, 74, 64][i];
    const inj = [10, 14, 17, 16, 14, 12, 10, 16][i];
    const men = 100 - com - ncd - inj;
    return { r, com, ncd, inj, men };
  });
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((row) => (
          <div key={row.r} style={{ display: "grid", gridTemplateColumns: "80px 1fr", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11.5, color: "var(--ln-ink-2)" }}>{row.r}</span>
            <div style={{ display: "flex", height: 14 }}>
              <span style={{ width: `${row.com}%`, background: "#ff8b6b" }} />
              <span style={{ width: `${row.ncd}%`, background: "var(--ln-info)" }} />
              <span style={{ width: `${row.inj}%`, background: "var(--ln-warn)" }} />
              <span style={{ width: `${row.men}%`, background: "#b07cff" }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
        {[
          { l: "Communicable", c: "#ff8b6b" },
          { l: "NCD", c: "var(--ln-info)" },
          { l: "Injuries", c: "var(--ln-warn)" },
          { l: "Mental", c: "#b07cff" },
        ].map((x) => (
          <span key={x.l} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ln-ink-2)" }}>
            <span style={{ width: 10, height: 10, background: x.c, borderRadius: 1 }} />
            {x.l}
          </span>
        ))}
      </div>
    </div>
  );
}

function GenderByCondition() {
  const rows = GHI_DISEASES.slice(0, 6).map((d, i) => {
    const m = 0.4 + ((i * 13) % 35) / 100;
    return { name: d.name.split(" ")[0], m: Math.round(m * 100), f: Math.round((1 - m) * 100) };
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((r) => (
        <div key={r.name}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ln-ink-2)", marginBottom: 3 }}>
            <span>{r.name}</span>
            <span style={{ fontFamily: "var(--ln-font-mono)", color: "var(--ln-ink-3)" }}>
              {r.m}% / {r.f}%
            </span>
          </div>
          <div style={{ display: "flex", height: 10 }}>
            <span style={{ width: `${r.m}%`, background: "var(--ln-info)" }} />
            <span style={{ width: `${r.f}%`, background: "#ff8b6b" }} />
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 14, marginTop: 4 }}>
        <span style={{ fontSize: 11, color: "var(--ln-ink-2)", display: "inline-flex", gap: 6, alignItems: "center" }}>
          <span style={{ width: 10, height: 10, background: "var(--ln-info)" }} />
          Male
        </span>
        <span style={{ fontSize: 11, color: "var(--ln-ink-2)", display: "inline-flex", gap: 6, alignItems: "center" }}>
          <span style={{ width: 10, height: 10, background: "#ff8b6b" }} />
          Female
        </span>
      </div>
    </div>
  );
}

function YldsYlls() {
  const rows = GHI_DISEASES.slice(0, 6).map((d) => ({
    name: d.name.split(" ")[0],
    ylds: d.dalys * 0.32,
    ylls: d.dalys * 0.68,
  }));
  const max = Math.max(...rows.map((r) => r.ylds + r.ylls));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((r) => (
        <div key={r.name}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
            <span style={{ color: "var(--ln-ink-2)" }}>{r.name}</span>
            <span className="ln-num" style={{ color: "var(--ln-ink-3)" }}>
              {(r.ylds + r.ylls).toFixed(0)}M
            </span>
          </div>
          <div style={{ display: "flex", height: 12, background: "rgba(255,255,255,0.04)" }}>
            <span style={{ width: `${(r.ylds / max) * 100}%`, background: "var(--ln-warn)" }} />
            <span style={{ width: `${(r.ylls / max) * 100}%`, background: "var(--ln-crit)" }} />
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 14, marginTop: 4, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "var(--ln-ink-2)", display: "inline-flex", gap: 6, alignItems: "center" }}>
          <span style={{ width: 10, height: 10, background: "var(--ln-warn)" }} />
          YLDs · disability
        </span>
        <span style={{ fontSize: 11, color: "var(--ln-ink-2)", display: "inline-flex", gap: 6, alignItems: "center" }}>
          <span style={{ width: 10, height: 10, background: "var(--ln-crit)" }} />
          YLLs · life lost
        </span>
      </div>
    </div>
  );
}

function GenderSplit({ disease }: { disease: GhiDisease }) {
  const m = Math.round(45 + ((disease.name.length * 2.7) % 18));
  const f = 100 - m;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
        <div>
          <span className="ln-eyebrow">Male</span>
          <div className="ln-num" style={{ fontSize: 36, color: "var(--ln-info)", lineHeight: 1, marginTop: 4 }}>
            {m}%
          </div>
        </div>
        <div>
          <span className="ln-eyebrow">Female</span>
          <div className="ln-num" style={{ fontSize: 36, color: "#ff8b6b", lineHeight: 1, marginTop: 4 }}>
            {f}%
          </div>
        </div>
      </div>
      <svg viewBox="0 0 240 100" width="100%">
        <rect x="0" y="40" width={2.4 * m} height="20" fill="var(--ln-info)" />
        <rect x={2.4 * m} y="40" width={2.4 * f} height="20" fill="#ff8b6b" />
        {Array.from({ length: 10 }, (_, i) => (i < m / 10 ? "m" : "f")).map((g, i) => (
          <g key={i} transform={`translate(${i * 24 + 4} 70)`}>
            <circle cx="10" cy="6" r="4" fill={g === "m" ? "var(--ln-info)" : "#ff8b6b"} />
            <rect x="6" y="11" width="8" height="14" fill={g === "m" ? "var(--ln-info)" : "#ff8b6b"} opacity="0.7" />
          </g>
        ))}
      </svg>
    </div>
  );
}

function CountryTable({
  disease,
  liveRiskByCountry,
  isTabletDown,
}: {
  disease: GhiDisease;
  liveRiskByCountry: Map<string, "low" | "medium" | "high" | "critical">;
  isTabletDown: boolean;
}) {
  const rows = GHI_COUNTRIES.map((c) => ({
    ...c,
    prevalence: +(disease.prevalence * c.factor).toFixed(1),
    incidence: +(disease.incidence * c.factor).toFixed(1),
    mortality: +(disease.mortality * c.factor * 100).toFixed(2),
    dalys: +(disease.dalys * c.factor).toFixed(1),
  })).sort((a, b) => b.dalys - a.dalys);
  const cols = "50px 1.4fr 0.8fr 80px 90px 90px 90px 90px";
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: isTabletDown ? 720 : "auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: cols,
            gap: 12,
            padding: "8px 22px",
            borderBottom: "1px solid var(--ln-line-2)",
            fontFamily: "var(--ln-font-mono)",
            fontSize: 10,
            letterSpacing: "0.08em",
            color: "var(--ln-ink-4)",
            background: "var(--ln-surface)",
          }}
        >
          <span>RANK</span>
          <span>COUNTRY</span>
          <span>REGION</span>
          <span style={{ textAlign: "right" }}>POP (M)</span>
          <span style={{ textAlign: "right" }}>PREV</span>
          <span style={{ textAlign: "right" }}>INC</span>
          <span style={{ textAlign: "right" }}>MORT %</span>
          <span style={{ textAlign: "right" }}>DALYs</span>
        </div>
        {rows.map((r, i) => {
          const liveRisk = liveRiskByCountry.get(r.name);
          return (
            <div
              key={r.code}
              style={{
                display: "grid",
                gridTemplateColumns: cols,
                gap: 12,
                padding: "8px 22px",
                borderBottom: "1px solid var(--ln-line)",
              }}
            >
              <span className="ln-num" style={{ fontSize: 11, color: "var(--ln-ink-4)" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 8 }}>
                {r.name}
                {liveRisk && (
                  <span
                    className={`ln-chip ${
                      liveRisk === "critical" ? "is-crit" : liveRisk === "high" ? "is-warn" : "is-info"
                    }`}
                    style={{ fontSize: 9 }}
                    title="Current live outbreak risk"
                  >
                    {liveRisk.toUpperCase()}
                  </span>
                )}
              </span>
              <span style={{ fontFamily: "var(--ln-font-mono)", fontSize: 11, color: "var(--ln-ink-3)" }}>
                {r.region.toUpperCase()}
              </span>
              <span className="ln-num" style={{ fontSize: 12, textAlign: "right", color: "var(--ln-ink-3)" }}>
                {r.pop}
              </span>
              <span className="ln-num" style={{ fontSize: 12, textAlign: "right" }}>
                {r.prevalence}
              </span>
              <span className="ln-num" style={{ fontSize: 12, textAlign: "right" }}>
                {r.incidence}
              </span>
              <span className="ln-num" style={{ fontSize: 12, textAlign: "right", color: "var(--ln-crit)" }}>
                {r.mortality}%
              </span>
              <span className="ln-num" style={{ fontSize: 12, textAlign: "right", color: "var(--ln-warn)" }}>
                {r.dalys}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
