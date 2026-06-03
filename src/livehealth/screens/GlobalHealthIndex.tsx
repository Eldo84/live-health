import { useMemo, useState, type ReactNode, type CSSProperties } from "react";
import { Sparkline } from "../components/Sparkline";
import { WorldMap } from "../components/WorldMap";
import { Logo } from "../components/Logo";
import { Icon } from "../components/Icon";
import { ThemeToggle } from "../components/ThemeToggle";
import { LanguageSelector } from "../components/LanguageSelector";
import { HeaderAlerts } from "../components/HeaderAlerts";
import { HeaderUser } from "../components/HeaderUser";
import { TopBar } from "./SurveillanceMap";
import {
  useGbdCountries,
  useGbdCauses,
  useGbdCountryIndicator,
  useGbdDiseaseEstimates,
  useGbdDiseaseMultiMeasure,
  useGbdCountryAllCauses,
  useGbdCountryBurdenSplit,
  useGbdDataCoverage,
  MEASURES,
  type GbdCause,
  type GbdEstimate,
  type Measure,
} from "../data/useGBD";
import { useLiveRegionRisk } from "../data/useLiveRegionRisk";
import { useRegionalRiskLevels } from "../../lib/useRegionalRiskLevels";
import { useLiveOutbreaks } from "../data/useLiveOutbreaks";
import { useBreakpoint } from "../lib/useBreakpoint";
import { T } from "../components/T";
import { useT } from "../lib/useT";

const ACCENT = "#4ee0c4";

const selStyle = {
  background: "var(--ln-surface-2)",
  border: "1px solid var(--ln-line-2)",
  padding: "7px 10px",
  fontSize: 12.5,
  color: "var(--ln-ink)",
  borderRadius: 6,
} as const;

// Country-level indicators we present alongside the disease-specific data.
const COUNTRY_METRICS = [
  { key: "life_expectancy", label: "Life expectancy", unit: "years", color: ACCENT },
  { key: "dtp3_coverage", label: "DTP3 coverage", unit: "%", color: "#6ab7ff" },
  { key: "measles_coverage", label: "Measles vaccine", unit: "%", color: "#9bd95b" },
  { key: "under5_mortality", label: "Under-5 mortality", unit: "per 1k", color: "var(--ln-crit)" },
  { key: "maternal_mortality", label: "Maternal mortality", unit: "per 100k", color: "var(--ln-warn)" },
  { key: "health_expenditure_pct_gdp", label: "Health spending", unit: "% GDP", color: "#b07cff" },
];

const MEASURE_UNIT: Record<Measure, string> = {
  Deaths: "per 100k (age-std)",
  DALYs: "per 100k (age-std)",
  YLLs: "per 100k (age-std)",
  YLDs: "per 100k (age-std)",
  Incidence: "per 100k (age-std)",
  Prevalence: "per 100k (age-std)",
};

const MEASURE_DESC: Record<Measure, string> = {
  Deaths: "Mortality rate",
  DALYs: "Disability-adjusted life years",
  YLLs: "Years of life lost (premature mortality)",
  YLDs: "Years lived with disability",
  Incidence: "New cases per year",
  Prevalence: "Existing cases at a point in time",
};

export function GlobalHealthIndexScreen() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTabletDown = bp !== "desktop";

  const tAllCategories = useT("All categories");
  const tAllCountries = useT("All countries");
  const tGlobalAverage = useT("Global average");
  const tMeasureTitle = useT("Choose what to measure: mortality, total burden, disability, or case counts");
  const tCiTitle = useT("Estimates with 95% uncertainty band");

  const { countries } = useGbdCountries();
  const causes = useGbdCauses();
  const coverage = useGbdDataCoverage();

  const [countryIso, setCountryIso] = useState<string>("global");
  const [diseaseId, setDiseaseId] = useState<string>("ischemic_heart_disease");
  const [measure, setMeasure] = useState<Measure>("DALYs");
  const [year, setYear] = useState<number>(2023);
  // Category filter for the mobile chip row (maps to gbd_causes.category).
  const [category, setCategory] = useState<string>("all");

  const disease = useMemo<GbdCause | null>(
    () => causes.find((c) => c.id === diseaseId) || causes[0] || null,
    [causes, diseaseId]
  );

  // Distinct cause categories, for the mobile "category" select.
  const categoryOptions = useMemo(
    () => Array.from(new Set(causes.map((c) => c.category).filter(Boolean))),
    [causes]
  );
  // Causes shown as chips, narrowed by the active category.
  const visibleCauses = useMemo(
    () => (category === "all" ? causes : causes.filter((c) => c.category === category)),
    [causes, category]
  );

  // Live regional risk for the map.
  const { regionRisk } = useLiveRegionRisk("30d");
  const { data: regions } = useRegionalRiskLevels("30d");
  const { outbreaks: liveOutbreaks } = useLiveOutbreaks("30d", 400);
  const mapOutbreaks = useMemo(
    () =>
      liveOutbreaks.map((o) => ({ id: o.id, lng: o.lng, lat: o.lat, severity: o.severity })),
    [liveOutbreaks]
  );
  const liveRiskByCountry = useMemo(() => {
    const m = new Map<string, "low" | "medium" | "high" | "critical">();
    for (const r of regions) for (const c of r.countries) m.set(c.name, c.riskLevel);
    return m;
  }, [regions]);

  // Disease estimates for the selected measure.
  const { rows: estRows } = useGbdDiseaseEstimates(disease?.id ?? null, measure);
  // All causes for the active country at the selected measure (burden ranking).
  const { rows: countryCauseRows } = useGbdCountryAllCauses(countryIso, measure);
  // Mortality-vs-disability burden split for the active country + disease.
  const { rows: splitRows } = useGbdCountryBurdenSplit(countryIso, disease?.id ?? null);

  return (
    <div
      className="ln-app"
      style={{
        width: "100%",
        // Leave room for the fixed BottomNav on tablet/mobile so the scrolling
        // content (and the bottom disclaimer) isn't hidden behind it.
        height: isTabletDown ? "calc(100vh - 60px)" : "100vh",
        background: "var(--ln-bg)",
        color: "var(--ln-ink)",
        display: "grid",
        gridTemplateRows: isMobile ? "auto 1fr" : "52px 1fr",
        overflow: "hidden",
      }}
    >
      {isMobile ? <MobileGhiHeader /> : <TopBar active="ghi" />}

      {/* Desktop introduces a left disease sidebar; mobile/tablet keep the
          single scrolling column (chip row handles disease selection there). */}
      <div
        style={{
          display: isMobile ? "contents" : "grid",
          gridTemplateColumns: isMobile ? undefined : "260px 1fr",
          minHeight: 0,
          overflow: isMobile ? undefined : "hidden",
        }}
      >
        {!isMobile && (
          <GhiDiseaseSidebar
            causes={causes}
            diseaseId={diseaseId}
            setDiseaseId={setDiseaseId}
            countryCauseRows={countryCauseRows}
            year={year}
          />
        )}
      <div className="ln-pane" style={{ overflowY: "auto", minHeight: 0 }}>
        {/* Filter strip. Mobile mirrors the redesign: category + country selects
            on one row, then a full-width year slider (disease is picked via the
            chip row below; all four burden measures show in the cards). */}
        {isMobile ? (
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid var(--ln-line)",
              background: "var(--ln-topbar)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ ...selStyle, width: "100%" }}
              >
                <option value="all">{tAllCategories}</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={countryIso}
                onChange={(e) => setCountryIso(e.target.value)}
                style={{ ...selStyle, width: "100%" }}
              >
                <option value="global">{tAllCountries}</option>
                {countries.map((c) => (
                  <option key={c.iso3} value={c.iso3}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--ln-ink-3)",
                  fontFamily: "var(--ln-font-mono)",
                  letterSpacing: "0.08em",
                }}
              >
                <T>YEAR</T>
              </span>
              <input
                type="range"
                min={2017}
                max={2023}
                value={year}
                onChange={(e) => setYear(+e.target.value)}
                style={{ flex: 1, accentColor: ACCENT }}
              />
              <span className="ln-num" style={{ fontSize: 16, color: ACCENT, width: 44, textAlign: "right" }}>
                {year}
              </span>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isTabletDown
                ? "minmax(180px,1fr) minmax(180px,1fr) minmax(130px,160px) minmax(200px,260px)"
                : "minmax(180px,220px) minmax(200px,260px) minmax(130px,160px) auto 1fr auto",
              alignItems: "center",
              gap: 10,
              padding: "14px 28px",
              borderBottom: "1px solid var(--ln-line)",
              background: "var(--ln-topbar)",
            }}
          >
            <select
              value={countryIso}
              onChange={(e) => setCountryIso(e.target.value)}
              style={{ ...selStyle, width: "100%" }}
            >
              <option value="global">{tGlobalAverage}</option>
              {countries.map((c) => (
                <option key={c.iso3} value={c.iso3}>{c.name}</option>
              ))}
            </select>
            <select
              value={diseaseId}
              onChange={(e) => setDiseaseId(e.target.value)}
              style={{ ...selStyle, width: "100%" }}
            >
              {causes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={measure}
              onChange={(e) => setMeasure(e.target.value as Measure)}
              style={{ ...selStyle, width: "100%" }}
              title={tMeasureTitle}
            >
              {MEASURES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <span style={{ fontSize: 11, color: "var(--ln-ink-3)", fontFamily: "var(--ln-font-mono)" }}>
                <T>YEAR</T>
              </span>
              <input
                type="range"
                min={2017}
                max={2023}
                value={year}
                onChange={(e) => setYear(+e.target.value)}
                style={{ flex: 1, minWidth: 60, maxWidth: 160 }}
              />
              <span className="ln-num" style={{ fontSize: 14, color: ACCENT, width: 40, textAlign: "right" }}>{year}</span>
            </div>
            <div />
            {coverage && (
              <span
                style={{
                  fontFamily: "var(--ln-font-mono)",
                  fontSize: 10,
                  color: "var(--ln-ink-3)",
                  letterSpacing: "0.08em",
                  textAlign: "right",
                  whiteSpace: "nowrap",
                }}
              >
                <T>REAL DATA</T> · {coverage.rows.toLocaleString()} <T>ROWS</T> · {coverage.causes}{" "}
                <T>CAUSES</T> · {coverage.minYear}–{coverage.maxYear}
              </span>
            )}
          </div>
        )}

        {/* Condition chips — fast disease scoping on mobile. Mirrors the
            redesign's horizontally-scrolling chip row that replaces the desktop
            sidebar; tapping a chip rescopes every chart + the country table. */}
        {isMobile && visibleCauses.length > 0 && (
          <div
            className="ln-pane"
            style={{
              display: "flex",
              gap: 6,
              padding: "12px 14px",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              borderBottom: "1px solid var(--ln-line)",
            }}
          >
            {visibleCauses.map((c) => {
              const on = c.id === diseaseId;
              return (
                <button
                  key={c.id}
                  onClick={() => setDiseaseId(c.id)}
                  style={{
                    flex: "0 0 auto",
                    padding: "7px 12px",
                    borderRadius: 999,
                    cursor: "pointer",
                    fontSize: 12,
                    border: `1px solid ${on ? ACCENT : "var(--ln-line-2)"}`,
                    background: on
                      ? `color-mix(in oklab, ${ACCENT} 16%, transparent)`
                      : "transparent",
                    color: on ? "var(--ln-ink)" : "var(--ln-ink-3)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Disease-centric header (mobile) — category eyebrow + serif disease
            name + scope·year, mirroring the redesign. Desktop keeps the
            country-snapshot header with the full source note. */}
        {isMobile ? (
          <div style={{ padding: "16px 16px 14px", borderBottom: "1px solid var(--ln-line)" }}>
            <span className="ln-eyebrow">{disease?.category || <T>Burden of disease</T>}</span>
            <h2
              className="ln-display"
              style={{ fontSize: 26, margin: "6px 0 4px", letterSpacing: "-0.025em", lineHeight: 1.05 }}
            >
              {disease?.name || "—"}
            </h2>
            <div style={{ fontSize: 13, color: "var(--ln-ink-3)", fontStyle: "italic" }}>
              {countryIso === "global"
                ? tGlobalAverage
                : countries.find((c) => c.iso3 === countryIso)?.name || "—"}{" "}
              · {year}
            </div>
          </div>
        ) : (
          <div style={{ padding: "24px 28px 18px", borderBottom: "1px solid var(--ln-line)" }}>
            <span className="ln-eyebrow"><T>Country health snapshot</T></span>
            <h2
              className="ln-display"
              style={{ fontSize: 38, margin: "8px 0 6px", letterSpacing: "-0.025em" }}
            >
              {countryIso === "global"
                ? tGlobalAverage
                : countries.find((c) => c.iso3 === countryIso)?.name || "—"}
              <span style={{ color: "var(--ln-ink-4)" }}>,</span>{" "}
              <span style={{ color: "var(--ln-ink-3)", fontStyle: "italic" }}>{year}</span>
            </h2>
            <p style={{ fontSize: 13.5, color: "var(--ln-ink-2)", maxWidth: 760, margin: "4px 0 0", lineHeight: 1.5 }}>
              <T>Sources: IHME Global Burden of Disease 2023 (Deaths / DALYs / YLLs / YLDs / Incidence / Prevalence,
              age-standardized rates, 10 causes, 204 countries, 95% CI bounds), World Bank Open Data (country
              indicators), WHO GHO (malaria incidence), and the OutbreakNow surveillance feed.</T>
            </p>
          </div>
        )}

        {/* Metric cards. Mobile shows the 2×2 disease-burden grid
            (Prevalence / Incidence / Mortality / DALYs) from real IHME data;
            desktop keeps the 6 World Bank country-indicator cards. */}
        {isMobile ? (
          <MobileBurdenCards causeId={diseaseId} countryIso={countryIso} year={year} />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isTabletDown ? "repeat(3, 1fr)" : "repeat(6, 1fr)",
              borderBottom: "1px solid var(--ln-line)",
            }}
          >
            {COUNTRY_METRICS.map((m, i) => (
              <CountryMetricCard
                key={m.key}
                indicator={m.key}
                label={m.label}
                unit={m.unit}
                color={m.color}
                countryIso={countryIso}
                year={year}
                border={i > 0}
                borderTop={false}
                isMobile={false}
              />
            ))}
          </div>
        )}

        {/* Disease trend with CI band */}
        <div style={{ padding: isMobile ? "16px 14px" : "20px 28px", borderBottom: "1px solid var(--ln-line)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div>
              <span className="ln-eyebrow">
                {measure} · {disease?.name ?? "—"}
              </span>
              <h3 style={{ fontSize: isMobile ? 15 : 18, margin: "4px 0 0", fontWeight: 500, lineHeight: 1.35 }}>
                <T>{MEASURE_DESC[measure]}</T> ·{" "}
                {countryIso === "global"
                  ? <T>global mean across 204 countries</T>
                  : countries.find((c) => c.iso3 === countryIso)?.name}
                <span style={{ color: "var(--ln-ink-3)", fontStyle: "italic" }}>
                  {" "}({MEASURE_UNIT[measure]})
                </span>
              </h3>
            </div>
            <span
              className="ln-chip"
              style={{
                fontSize: 10,
                background: "color-mix(in oklab, var(--ln-brand) 14%, transparent)",
                color: "var(--ln-brand)",
                border: "1px solid color-mix(in oklab, var(--ln-brand) 40%, transparent)",
              }}
              title={tCiTitle}
            >
              <T>IHME GBD 2023 · 95% CI</T>
            </span>
          </div>
          <div style={{ marginTop: 14 }}>
            <DiseaseTrendChart rows={estRows} countryIso={countryIso} activeYear={year} isMobile={isMobile} />
          </div>
        </div>

        {/* Top countries + Live regional risk */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isTabletDown ? "1fr" : "1fr 1fr",
            borderBottom: "1px solid var(--ln-line)",
          }}
        >
          <CountryComparison
            disease={disease}
            measure={measure}
            year={year}
            rows={estRows}
            countries={countries}
            isMobile={isMobile}
          />
          <div
            style={{
              borderLeft: isTabletDown ? "none" : "1px solid var(--ln-line)",
              borderTop: isTabletDown ? "1px solid var(--ln-line)" : "none",
              padding: isMobile ? "14px 14px" : "18px 22px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <span className="ln-eyebrow"><T>Live regional risk · 30d</T></span>
                <h3 style={{ fontSize: isMobile ? 15 : 16, margin: "4px 0 0", fontWeight: 500, lineHeight: 1.35 }}><T>Outbreak pressure today</T></h3>
              </div>
              <span
                className="ln-chip"
                style={{
                  fontSize: 10,
                  background: "color-mix(in oklab, var(--ln-brand) 14%, transparent)",
                  color: "var(--ln-brand)",
                  border: "1px solid color-mix(in oklab, var(--ln-brand) 40%, transparent)",
                }}
              >
                <T>LIVE · OUTBREAKNOW DB</T>
              </span>
            </div>
            <div
              style={{
                width: "100%",
                aspectRatio: "620 / 240",
                position: "relative",
                overflow: "hidden",
                maxHeight: isMobile ? 220 : 320,
              }}
            >
              <WorldMap
                width={620}
                height={240}
                outbreaks={mapOutbreaks}
                regionRisk={regionRisk}
                showChoropleth
                pulse
                dotSpacing={isMobile ? 13 : 11}
              />
            </div>
            <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--ln-ink-3)", lineHeight: 1.5 }}>
              <T>Continent fills come from the OutbreakNow database, grouped by region risk level.
              Pulsing dots are individual high-severity events from the live surveillance feed.</T>
            </div>
          </div>
        </div>

        {/* Cause burden ranking — all 10 diseases for active country */}
        <div style={{ borderBottom: "1px solid var(--ln-line)" }}>
          <div style={{ padding: isMobile ? "14px 14px 4px" : "18px 28px 4px" }}>
            <span className="ln-eyebrow"><T>Cause burden</T> · {measure}</span>
            <h3 style={{ fontSize: isMobile ? 15 : 16, margin: "4px 0 4px", fontWeight: 500, lineHeight: 1.35 }}>
              {causes.length} <T>tracked causes ranked,</T>{" "}
              {countryIso === "global"
                ? <T>global mean</T>
                : countries.find((c) => c.iso3 === countryIso)?.name}{" "}
              · {year}
            </h3>
          </div>
          <CauseBurdenRanking
            rows={countryCauseRows}
            year={year}
            causes={causes}
            measure={measure}
            isMobile={isMobile}
          />
        </div>

        {/* YLL vs YLD split — premature mortality vs lived disability */}
        <div style={{ borderBottom: "1px solid var(--ln-line)", padding: isMobile ? "14px 14px" : "18px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
            <div>
              <span className="ln-eyebrow"><T>Burden split</T> · {disease?.name ?? "—"}</span>
              <h3 style={{ fontSize: isMobile ? 15 : 16, margin: "4px 0 0", fontWeight: 500, lineHeight: 1.35 }}>
                <T>Years of life lost vs years lived with disability</T>
              </h3>
            </div>
            <span style={{ fontSize: 11, color: "var(--ln-ink-3)", fontFamily: "var(--ln-font-mono)" }}>
              <T>YLL = mortality · YLD = morbidity · DALY = YLL + YLD</T>
            </span>
          </div>
          <BurdenSplitStack rows={splitRows} countryIso={countryIso} isMobile={isMobile} />
        </div>

        {/* Burden landscape + category share (REAL) and gender / age / risk
            radar (MODELED, clearly labeled). Mirrors the redesign's chart grid. */}
        <GhiAnalyticsCharts
          causes={causes}
          disease={disease}
          countryIso={countryIso}
          countryName={
            countryIso === "global"
              ? "Global average"
              : countries.find((c) => c.iso3 === countryIso)?.name || "—"
          }
          year={year}
          isMobile={isMobile}
          isTabletDown={isTabletDown}
        />

        {/* YoY leaderboard — countries with biggest 2017→latest swing for selected disease+measure */}
        <div style={{ borderBottom: "1px solid var(--ln-line)" }}>
          <div style={{ padding: isMobile ? "14px 14px 4px" : "18px 28px 4px" }}>
            <span className="ln-eyebrow"><T>Trajectory</T> · {disease?.name ?? "—"} · {measure}</span>
            <h3 style={{ fontSize: isMobile ? 15 : 16, margin: "4px 0 4px", fontWeight: 500, lineHeight: 1.35 }}>
              <T>Biggest country swings, 2017 → 2023</T>
            </h3>
          </div>
          <YoyLeaderboard rows={estRows} countries={countries} isMobile={isMobile} />
        </div>

        {/* Country table */}
        <div style={{ borderBottom: "1px solid var(--ln-line)" }}>
          <div
            style={{
              padding: isMobile ? "14px 14px 8px" : "14px 28px 8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div>
              <span className="ln-eyebrow"><T>Country detail</T> · {year}</span>
              <h3 style={{ fontSize: isMobile ? 15 : 16, margin: "4px 0 0", fontWeight: 500, lineHeight: 1.35 }}>
                {disease?.name} {measure.toLowerCase()} <T>+ live outbreak risk</T>
              </h3>
            </div>
          </div>
          <CountryTable
            disease={disease}
            measure={measure}
            year={year}
            rows={estRows}
            countries={countries}
            liveRiskByCountry={liveRiskByCountry}
            isTabletDown={isTabletDown}
          />
        </div>

        {/* Methodology */}
        <div
          style={{
            background: "var(--ln-surface)",
            padding: isMobile ? "18px 14px" : "22px 28px",
            borderBottom: "1px solid var(--ln-line)",
          }}
        >
          <span className="ln-eyebrow"><T>Data sources + methodology</T></span>
          <ul
            style={{
              fontSize: 12.5,
              color: "var(--ln-ink-3)",
              lineHeight: 1.65,
              marginTop: 10,
              paddingLeft: 18,
              maxWidth: 900,
            }}
          >
            <li>
              <b style={{ color: "var(--ln-ink-2)" }}><T>IHME Global Burden of Disease (GBD 2023)</T></b> —{" "}
              <T>age-standardized rate estimates with 95% uncertainty bounds for Deaths, DALYs, YLLs,
              YLDs, Incidence and Prevalence, across 10 tracked causes and 204 countries (2017–2023).
              Free for non-commercial use under IHME's terms.</T>
            </li>
            <li>
              <b style={{ color: "var(--ln-ink-2)" }}><T>World Bank Open Data</T></b> —{" "}
              <T>life expectancy,
              DTP3/measles vaccine coverage, under-5 + maternal mortality, health spending as % of
              GDP. Free, no signup, CC-BY 4.0.</T>
            </li>
            <li>
              <b style={{ color: "var(--ln-ink-2)" }}><T>WHO Global Health Observatory</T></b> —{" "}
              <T>malaria
              incidence (kept because IHME's free 10-cause set does not include malaria). Free, no
              signup, CC-BY-NC-SA 3.0.</T>
            </li>
            <li>
              <b style={{ color: "var(--ln-ink-2)" }}><T>OutbreakNow surveillance feed</T></b> —{" "}
              <T>the
              choropleth fills and pulsing outbreak markers on the world map, plus the live risk
              chips in the country table. Streamed in real time from the OutbreakNow database.</T>
            </li>
            <li>
              <T>The metric cards reflect the latest available value for the selected country + year.
              When a country has no reported value for that year, the card falls back to the most
              recent prior year. Same fallback applies to the disease trend chart and country table.</T>
            </li>
          </ul>
        </div>
      </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Mobile app header — logo + bell + avatar, then the eyebrow + serif
// "Burden-of-disease atlas" title (mirrors the redesign's GHI mobile header).
// Replaces the cramped desktop TopBar on phones; the BottomNav handles routing.
// ─────────────────────────────────────────────────────────────────
function MobileGhiHeader() {
  return (
    <header style={{ background: "var(--ln-topbar)", borderBottom: "1px solid var(--ln-line)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px 10px",
        }}
      >
        <Logo color={ACCENT} />
        <div style={{ display: "flex", gap: 12, alignItems: "center", color: "var(--ln-ink-2)" }}>
          <LanguageSelector />
          <ThemeToggle />
          <HeaderAlerts />
          <HeaderUser />
        </div>
      </div>
      <div style={{ padding: "0 16px 12px" }}>
        <span className="ln-eyebrow">
          <Icon.Globe style={{ verticalAlign: -2, color: ACCENT }} /> <T>Global Health Index</T>
        </span>
        <div
          className="ln-display"
          style={{ fontSize: 22, lineHeight: 1.05, letterSpacing: "-0.02em", marginTop: 3 }}
        >
          <T>Burden-of-disease</T> <span style={{ color: "var(--ln-ink-3)", fontStyle: "italic" }}><T>atlas</T></span>
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────
// Mobile 2×2 burden-metric grid — Prevalence / Incidence / Mortality / DALYs
// for the selected cause + country, from real IHME GBD estimates. Each card
// shows the latest value, the YoY trend, and a sparkline of the full series.
// ─────────────────────────────────────────────────────────────────
const BURDEN_METRICS = [
  { measure: "Prevalence", label: "Prevalence", unit: "per 100k", color: "#6ab7ff" },
  { measure: "Incidence", label: "Incidence", unit: "per 100k", color: ACCENT },
  { measure: "Deaths", label: "Mortality", unit: "per 100k", color: "var(--ln-crit)" },
  { measure: "DALYs", label: "DALYs", unit: "per 100k", color: "var(--ln-warn)" },
] as const;
const BURDEN_MEASURE_NAMES = BURDEN_METRICS.map((m) => m.measure);

function MobileBurdenCards({
  causeId,
  countryIso,
  year,
}: {
  causeId: string;
  countryIso: string;
  year: number;
}) {
  const { rows } = useGbdDiseaseMultiMeasure(causeId, BURDEN_MEASURE_NAMES);

  // Per-measure year→value series (country slice, or cross-country mean for global).
  const seriesByMeasure = useMemo(() => {
    const out: Record<string, { year: number; value: number }[]> = {};
    for (const { measure } of BURDEN_METRICS) {
      const byYear = new Map<number, number[]>();
      for (const r of rows) {
        if (r.measure !== measure || r.rate == null) continue;
        if (countryIso !== "global" && r.iso3 !== countryIso) continue;
        if (!byYear.has(r.year)) byYear.set(r.year, []);
        byYear.get(r.year)!.push(r.rate);
      }
      out[measure] = Array.from(byYear.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([y, vals]) => ({ year: y, value: vals.reduce((s, v) => s + v, 0) / vals.length }));
    }
    return out;
  }, [rows, countryIso]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {BURDEN_METRICS.map((m, i) => {
        const series = seriesByMeasure[m.measure] || [];
        // Value at the active year, falling back to the most recent prior year.
        let idx = series.findIndex((p) => p.year === year);
        if (idx === -1) {
          for (let j = series.length - 1; j >= 0; j--) {
            if (series[j].year <= year) {
              idx = j;
              break;
            }
          }
        }
        if (idx === -1) idx = series.length - 1;
        const cur = idx >= 0 ? series[idx] : null;
        const prev = idx > 0 ? series[idx - 1] : null;
        const trend =
          cur && prev && prev.value !== 0
            ? +(((cur.value - prev.value) / prev.value) * 100).toFixed(1)
            : 0;
        const up = trend > 0;
        const spark = series.map((p) => p.value);

        return (
          <div
            key={m.measure}
            style={{
              padding: "14px 14px 12px",
              position: "relative",
              borderRight: i % 2 === 0 ? "1px solid var(--ln-line)" : "none",
              borderBottom: "1px solid var(--ln-line)",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, width: 24, height: 2, background: m.color }} />
            <span className="ln-eyebrow"><T>{m.label}</T></span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 7 }}>
              <span className="ln-num" style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.03em" }}>
                {cur ? cur.value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : "—"}
              </span>
              <span className="ln-num" style={{ fontSize: 10.5, color: "var(--ln-ink-3)" }}>{m.unit}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 8 }}>
              <span
                style={{
                  fontFamily: "var(--ln-font-mono)",
                  fontSize: 10,
                  color: up ? "var(--ln-crit)" : trend < 0 ? "var(--ln-brand)" : "var(--ln-ink-3)",
                }}
              >
                {trend === 0 ? "◆" : up ? "▲" : "▼"} {trend > 0 ? "+" : ""}
                {trend}%
              </span>
              {spark.length >= 2 && <Sparkline data={spark} color={m.color} width={56} height={20} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Country metric card — real World Bank indicator value
// ─────────────────────────────────────────────────────────────────
function CountryMetricCard({
  indicator,
  label,
  unit,
  color,
  countryIso,
  year,
  border,
  borderTop,
  isMobile,
}: {
  indicator: string;
  label: string;
  unit: string;
  color: string;
  countryIso: string;
  year: number;
  border: boolean;
  borderTop: boolean;
  isMobile: boolean;
}) {
  const { rows } = useGbdCountryIndicator(indicator);

  const { value, sparkline, yoy } = useMemo(() => {
    if (!rows.length) return { value: null as number | null, sparkline: [] as number[], yoy: null as number | null };
    const byYear = new Map<number, number[]>();
    for (const r of rows) {
      if (countryIso !== "global" && r.iso3 !== countryIso) continue;
      const arr = byYear.get(r.year) || [];
      arr.push(r.value);
      byYear.set(r.year, arr);
    }
    if (byYear.size === 0) return { value: null, sparkline: [], yoy: null };
    const years = Array.from(byYear.keys()).sort();
    const yearAvg = (yr: number) => {
      const arr = byYear.get(yr) || [];
      if (!arr.length) return null;
      return arr.reduce((a, b) => a + b, 0) / arr.length;
    };
    let v: number | null = yearAvg(year);
    if (v == null) {
      for (let y = year - 1; y >= years[0]; y--) {
        v = yearAvg(y);
        if (v != null) break;
      }
    }
    const spark = years.map((y) => yearAvg(y) ?? 0);
    const yoy =
      years.length > 1
        ? (yearAvg(years[years.length - 1])! - yearAvg(years[years.length - 2])!) /
          (yearAvg(years[years.length - 2]) || 1)
        : 0;
    return { value: v, sparkline: spark, yoy };
  }, [rows, countryIso, year]);

  return (
    <div
      style={{
        padding: isMobile ? "14px 12px 12px" : "18px 20px 16px",
        borderLeft: border ? "1px solid var(--ln-line)" : "none",
        borderTop: borderTop ? "1px solid var(--ln-line)" : "none",
        position: "relative",
        minWidth: 0,
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, width: 28, height: 2, background: color }} />
      <span className="ln-eyebrow" style={{ fontSize: isMobile ? 10 : undefined }}><T>{label}</T></span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
        <span
          className="ln-num"
          style={{
            fontSize: isMobile ? 22 : 26,
            fontWeight: 500,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
          }}
        >
          {value == null ? "—" : value.toFixed(value > 100 ? 0 : 1)}
        </span>
        <span style={{ fontSize: isMobile ? 10 : 11, color: "var(--ln-ink-3)", fontFamily: "var(--ln-font-mono)" }}>{unit}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 8, gap: 6 }}>
        <span
          style={{
            fontFamily: "var(--ln-font-mono)",
            fontSize: 10,
            color: yoy == null ? "var(--ln-ink-4)" : yoy > 0 ? "var(--ln-brand)" : yoy < 0 ? "var(--ln-crit)" : "var(--ln-ink-3)",
          }}
        >
          {yoy == null ? "—" : yoy > 0 ? "▲" : yoy < 0 ? "▼" : "◆"} {yoy == null ? "" : (yoy * 100).toFixed(1) + "%"}
        </span>
        {sparkline.length > 1 && <Sparkline data={sparkline} color={color} width={isMobile ? 44 : 56} height={isMobile ? 14 : 18} />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Disease trend chart with CI band (IHME data)
// ─────────────────────────────────────────────────────────────────
function DiseaseTrendChart({
  rows,
  countryIso,
  activeYear,
  isMobile,
}: {
  rows: GbdEstimate[];
  countryIso: string;
  activeYear: number;
  isMobile: boolean;
}) {
  const points = useMemo(() => {
    const byYear = new Map<number, { rates: number[]; lows: number[]; highs: number[] }>();
    for (const r of rows) {
      if (countryIso !== "global" && r.iso3 !== countryIso) continue;
      if (r.rate == null) continue;
      const slot = byYear.get(r.year) || { rates: [], lows: [], highs: [] };
      slot.rates.push(r.rate);
      if (r.lower != null) slot.lows.push(r.lower);
      if (r.upper != null) slot.highs.push(r.upper);
      byYear.set(r.year, slot);
    }
    const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
    return Array.from(byYear.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, slot]) => ({
        year,
        value: mean(slot.rates)!,
        lo: mean(slot.lows),
        hi: mean(slot.highs),
      }))
      .filter((p) => p.value != null);
  }, [rows, countryIso]);

  if (!points.length) {
    return (
      <div style={{ height: isMobile ? 180 : 220, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ln-ink-3)", fontSize: 13, textAlign: "center", padding: "0 16px" }}>
        <T>No data for this disease + measure combination yet.</T>
      </div>
    );
  }

  // Mobile uses a more-square viewBox so axis labels render larger.
  const W = isMobile ? 420 : 760;
  const H = isMobile ? 260 : 240;
  const padL = isMobile ? 44 : 48;
  const padB = isMobile ? 30 : 28;
  const axisFontSize = isMobile ? 14 : 11;
  const dotR = isMobile ? 5 : 4;
  const max = Math.max(...points.map((p) => p.hi ?? p.value));
  const min = 0;
  const span = Math.max(1, max - min);
  const xAt = (i: number) => padL + (i / Math.max(1, points.length - 1)) * (W - padL - 16);
  const yAt = (v: number) => 8 + (H - padB - 8) - ((v - min) / span) * (H - padB - 16);

  const linePath = points
    .map((p, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)} ${yAt(p.value).toFixed(1)}`)
    .join(" ");

  const hasCi = points.some((p) => p.lo != null && p.hi != null);
  const ciPath = hasCi
    ? [
        ...points.map((p, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)} ${yAt(p.hi ?? p.value).toFixed(1)}`),
        ...points.slice().reverse().map((p, j) => {
          const i = points.length - 1 - j;
          return `L${xAt(i).toFixed(1)} ${yAt(p.lo ?? p.value).toFixed(1)}`;
        }),
        "Z",
      ].join(" ")
    : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
        <g key={p}>
          <line
            x1={padL}
            y1={8 + (H - padB - 8) * (1 - p)}
            x2={W - 16}
            y2={8 + (H - padB - 8) * (1 - p)}
            stroke="var(--ln-line)"
            strokeDasharray="2 4"
          />
          <text
            x={padL - 6}
            y={8 + (H - padB - 8) * (1 - p) + axisFontSize / 3}
            fontSize={axisFontSize}
            textAnchor="end"
            fill="var(--ln-ink-4)"
            fontFamily="var(--ln-font-mono)"
          >
            {fmtAxis(min + (max - min) * p)}
          </text>
        </g>
      ))}
      {points.map((p, i) => (
        <text
          key={p.year}
          x={xAt(i)}
          y={H - 8}
          fontSize={axisFontSize}
          textAnchor="middle"
          fill={p.year === activeYear ? "var(--ln-ink)" : "var(--ln-ink-4)"}
          fontFamily="var(--ln-font-mono)"
          fontWeight={p.year === activeYear ? 600 : 400}
        >
          {p.year}
        </text>
      ))}
      {ciPath && <path d={ciPath} fill={ACCENT} opacity="0.14" />}
      <path d={linePath} fill="none" stroke={ACCENT} strokeWidth={isMobile ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle
          key={p.year}
          cx={xAt(i)}
          cy={yAt(p.value)}
          r={p.year === activeYear ? dotR : dotR * 0.6}
          fill={ACCENT}
        />
      ))}
    </svg>
  );
}

function fmtAxis(v: number) {
  if (v >= 1000) return v.toFixed(0);
  if (v >= 100) return v.toFixed(0);
  if (v >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

// ─────────────────────────────────────────────────────────────────
// Country comparison — top countries for selected disease + measure
// ─────────────────────────────────────────────────────────────────
function CountryComparison({
  disease,
  measure,
  year,
  rows,
  countries,
  isMobile,
}: {
  disease: GbdCause | null;
  measure: Measure;
  year: number;
  rows: GbdEstimate[];
  countries: { iso3: string; name: string }[];
  isMobile: boolean;
}) {
  const top = useMemo(() => {
    const byYear = new Map<number, { iso3: string; rate: number }[]>();
    for (const r of rows) {
      if (r.rate == null) continue;
      const arr = byYear.get(r.year) || [];
      arr.push({ iso3: r.iso3, rate: r.rate });
      byYear.set(r.year, arr);
    }
    const years = Array.from(byYear.keys()).sort((a, b) => b - a);
    const fallback = years.find((y) => y <= year);
    const pickRows = byYear.get(year) || (fallback != null ? byYear.get(fallback) || [] : []);
    const byCountry = new Map<string, number>();
    for (const r of pickRows) byCountry.set(r.iso3, r.rate);
    return Array.from(byCountry.entries())
      .map(([iso3, rate]) => ({
        iso3,
        rate,
        name: countries.find((c) => c.iso3 === iso3)?.name ?? iso3,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 10);
  }, [rows, year, countries]);
  const max = Math.max(1, ...top.map((t) => t.rate));

  return (
    <div style={{ padding: isMobile ? "14px 14px 18px" : "18px 28px 22px" }}>
      <span className="ln-eyebrow"><T>Country comparison</T> · {disease?.name ?? "—"} · {measure}</span>
      <h3 style={{ fontSize: 16, margin: "4px 0 14px", fontWeight: 500 }}><T>Top 10 by</T> {measure} ({MEASURE_UNIT[measure]})</h3>
      {top.length === 0 ? (
        <div style={{ padding: 20, fontSize: 12, color: "var(--ln-ink-3)" }}>
          <T>No country comparison available for this combination yet.</T>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 8 : 6 }}>
          {top.map((row) => (
            <div
              key={row.iso3}
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "minmax(0, 1fr) 60px" : "140px 1fr 60px",
                gridTemplateRows: isMobile ? "auto auto" : "auto",
                alignItems: "center",
                gap: isMobile ? "2px 8px" : "0 10px",
              }}
            >
              <span
                style={{
                  fontSize: isMobile ? 13 : 12,
                  color: "var(--ln-ink-2)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  gridColumn: isMobile ? "1 / 2" : "auto",
                  gridRow: isMobile ? "1 / 2" : "auto",
                }}
                title={row.name}
              >
                {row.name}
              </span>
              <div
                style={{
                  height: isMobile ? 8 : 12,
                  background: "rgba(255,255,255,0.04)",
                  position: "relative",
                  gridColumn: isMobile ? "1 / 2" : "auto",
                  gridRow: isMobile ? "2 / 3" : "auto",
                }}
              >
                <div style={{ position: "absolute", inset: 0, width: `${(row.rate / max) * 100}%`, background: "var(--ln-warn)", opacity: 0.75 }} />
              </div>
              <span
                className="ln-num"
                style={{
                  fontSize: isMobile ? 13 : 12,
                  textAlign: "right",
                  gridColumn: isMobile ? "2 / 3" : "auto",
                  gridRow: isMobile ? "1 / 3" : "auto",
                  alignSelf: "center",
                }}
              >
                {row.rate.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Cause burden ranking — all 10 tracked causes for active country
// ─────────────────────────────────────────────────────────────────
function CauseBurdenRanking({
  rows,
  year,
  causes,
  measure,
  isMobile,
}: {
  rows: GbdEstimate[];
  year: number;
  causes: GbdCause[];
  measure: Measure;
  isMobile: boolean;
}) {
  const ranking = useMemo(() => {
    // For the active country (or global avg), pick latest year ≤ active.
    const byCauseYear = new Map<string, Map<number, number[]>>();
    for (const r of rows) {
      if (r.rate == null) continue;
      let yMap = byCauseYear.get(r.cause_id);
      if (!yMap) {
        yMap = new Map();
        byCauseYear.set(r.cause_id, yMap);
      }
      const arr = yMap.get(r.year) || [];
      arr.push(r.rate);
      yMap.set(r.year, arr);
    }
    const result: { id: string; name: string; rate: number; usedYear: number }[] = [];
    for (const c of causes) {
      const yMap = byCauseYear.get(c.id);
      if (!yMap) continue;
      const years = Array.from(yMap.keys()).sort((a, b) => b - a);
      const usedYear = years.find((y) => y <= year);
      if (usedYear == null) continue;
      const arr = yMap.get(usedYear)!;
      const rate = arr.reduce((a, b) => a + b, 0) / arr.length;
      result.push({ id: c.id, name: c.name, rate, usedYear });
    }
    return result.sort((a, b) => b.rate - a.rate);
  }, [rows, year, causes]);

  if (!ranking.length) {
    return (
      <div style={{ padding: 20, fontSize: 12, color: "var(--ln-ink-3)" }}>
        <T>No cause data available for this country yet.</T>
      </div>
    );
  }
  const max = Math.max(1, ranking[0].rate);

  return (
    <div style={{ padding: isMobile ? "4px 14px 18px" : "4px 28px 22px", display: "flex", flexDirection: "column", gap: isMobile ? 10 : 6 }}>
      {ranking.map((row, i) => (
        <div
          key={row.id}
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "26px minmax(0,1fr) 60px"
              : "30px minmax(160px, 260px) 1fr 80px",
            gridTemplateRows: isMobile ? "auto auto" : "auto",
            alignItems: "center",
            gap: isMobile ? "2px 8px" : "0 10px",
          }}
        >
          <span
            className="ln-num"
            style={{
              fontSize: 11,
              color: "var(--ln-ink-4)",
              gridRow: isMobile ? "1 / 3" : "auto",
              alignSelf: "center",
            }}
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <span
            style={{
              fontSize: isMobile ? 13 : 12.5,
              color: "var(--ln-ink-2)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              gridColumn: isMobile ? "2 / 3" : "auto",
              gridRow: isMobile ? "1 / 2" : "auto",
            }}
            title={row.name}
          >
            {row.name}
          </span>
          <div
            style={{
              height: isMobile ? 6 : 12,
              background: "rgba(255,255,255,0.04)",
              position: "relative",
              gridColumn: isMobile ? "2 / 3" : "auto",
              gridRow: isMobile ? "2 / 3" : "auto",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                width: `${(row.rate / max) * 100}%`,
                background: measure === "Deaths" || measure === "YLLs" ? "var(--ln-crit)" : ACCENT,
                opacity: 0.65,
              }}
            />
          </div>
          <span
            className="ln-num"
            style={{
              fontSize: isMobile ? 13 : 12,
              textAlign: "right",
              gridColumn: isMobile ? "3 / 4" : "auto",
              gridRow: isMobile ? "1 / 3" : "auto",
              alignSelf: "center",
            }}
          >
            {row.rate.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Burden split — YLLs + YLDs stacked by year
// ─────────────────────────────────────────────────────────────────
function BurdenSplitStack({
  rows,
  countryIso,
  isMobile,
}: {
  rows: GbdEstimate[];
  countryIso: string;
  isMobile: boolean;
}) {
  const data = useMemo(() => {
    const byYear = new Map<number, { yll: number[]; yld: number[] }>();
    for (const r of rows) {
      if (r.rate == null) continue;
      if (countryIso !== "global" && r.iso3 !== countryIso) continue;
      const slot = byYear.get(r.year) || { yll: [], yld: [] };
      if (r.measure === "YLLs") slot.yll.push(r.rate);
      else if (r.measure === "YLDs") slot.yld.push(r.rate);
      byYear.set(r.year, slot);
    }
    const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    return Array.from(byYear.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, s]) => ({ year, yll: mean(s.yll), yld: mean(s.yld) }));
  }, [rows, countryIso]);

  if (!data.length) {
    return (
      <div style={{ height: 160, marginTop: 12, display: "flex", alignItems: "center", color: "var(--ln-ink-3)", fontSize: 12 }}>
        <T>YLL/YLD split unavailable for this disease (mental-health causes are reported without YLLs).</T>
      </div>
    );
  }

  const max = Math.max(1, ...data.map((d) => d.yll + d.yld));
  const W = isMobile ? 420 : 760;
  const H = isMobile ? 240 : 200;
  const padL = isMobile ? 44 : 48;
  const padB = isMobile ? 30 : 28;
  const axisFontSize = isMobile ? 14 : 11;
  const legendFontSize = isMobile ? 14 : 12;
  const bw = Math.max(8, (W - padL - 16) / data.length - 8);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block", marginTop: 12 }}>
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
        <g key={p}>
          <line x1={padL} y1={8 + (H - padB - 8) * (1 - p)} x2={W - 16} y2={8 + (H - padB - 8) * (1 - p)} stroke="var(--ln-line)" strokeDasharray="2 4" />
          <text x={padL - 6} y={8 + (H - padB - 8) * (1 - p) + axisFontSize / 3} fontSize={axisFontSize} textAnchor="end" fill="var(--ln-ink-4)" fontFamily="var(--ln-font-mono)">
            {fmtAxis(max * p)}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = padL + i * ((W - padL - 16) / data.length) + 4;
        const yllH = ((d.yll / max) * (H - padB - 8));
        const yldH = ((d.yld / max) * (H - padB - 8));
        const yBaseTop = H - padB;
        return (
          <g key={d.year}>
            <rect x={x} y={yBaseTop - yllH} width={bw} height={yllH} fill="var(--ln-crit)" opacity="0.85" />
            <rect x={x} y={yBaseTop - yllH - yldH} width={bw} height={yldH} fill={ACCENT} opacity="0.85" />
            <text x={x + bw / 2} y={H - 8} fontSize={axisFontSize} textAnchor="middle" fill="var(--ln-ink-4)" fontFamily="var(--ln-font-mono)">
              {d.year}
            </text>
          </g>
        );
      })}
      <g transform={`translate(${padL}, 12)`}>
        <rect x={0} y={0} width={legendFontSize} height={legendFontSize} fill="var(--ln-crit)" />
        <text x={legendFontSize + 4} y={legendFontSize - 2} fontSize={legendFontSize} fill="var(--ln-ink-2)" fontFamily="var(--ln-font-mono)">YLLs</text>
        <rect x={legendFontSize * 5} y={0} width={legendFontSize} height={legendFontSize} fill={ACCENT} />
        <text x={legendFontSize * 5 + legendFontSize + 4} y={legendFontSize - 2} fontSize={legendFontSize} fill="var(--ln-ink-2)" fontFamily="var(--ln-font-mono)">YLDs</text>
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// YoY leaderboard — biggest swings 2017 → 2023
// ─────────────────────────────────────────────────────────────────
function YoyLeaderboard({
  rows,
  countries,
  isMobile,
}: {
  rows: GbdEstimate[];
  countries: { iso3: string; name: string }[];
  isMobile: boolean;
}) {
  const swings = useMemo(() => {
    const byIso = new Map<string, Map<number, number>>();
    for (const r of rows) {
      if (r.rate == null) continue;
      let yMap = byIso.get(r.iso3);
      if (!yMap) {
        yMap = new Map();
        byIso.set(r.iso3, yMap);
      }
      yMap.set(r.year, r.rate);
    }
    const out: { iso3: string; name: string; first: number; last: number; pct: number }[] = [];
    for (const [iso3, yMap] of byIso) {
      const years = Array.from(yMap.keys()).sort();
      if (years.length < 2) continue;
      const first = yMap.get(years[0])!;
      const last = yMap.get(years[years.length - 1])!;
      if (first === 0) continue;
      out.push({
        iso3,
        name: countries.find((c) => c.iso3 === iso3)?.name ?? iso3,
        first,
        last,
        pct: (last - first) / first,
      });
    }
    out.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
    return { up: out.filter((o) => o.pct > 0).slice(0, 5), down: out.filter((o) => o.pct < 0).slice(0, 5) };
  }, [rows, countries]);

  const Section = ({ title, items, color }: { title: string; items: typeof swings.up; color: string }) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: "var(--ln-ink-3)", fontFamily: "var(--ln-font-mono)", letterSpacing: "0.08em", marginBottom: 8 }}>
        <T>{title}</T>
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--ln-ink-4)" }}>—</div>
      ) : (
        items.map((it) => (
          <div
            key={it.iso3}
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "minmax(0,1fr) 70px" : "minmax(0,1fr) 100px 70px",
              gap: isMobile ? 8 : 10,
              alignItems: "center",
              padding: "8px 0",
              borderBottom: "1px solid var(--ln-line)",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: isMobile ? 13 : 12.5,
                  color: "var(--ln-ink-2)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={it.name}
              >
                {it.name}
              </div>
              {isMobile && (
                <div
                  className="ln-num"
                  style={{ fontSize: 11, color: "var(--ln-ink-4)", marginTop: 2 }}
                >
                  {it.first.toFixed(1)} → {it.last.toFixed(1)}
                </div>
              )}
            </div>
            {!isMobile && (
              <span
                className="ln-num"
                style={{ fontSize: 12, textAlign: "right", color: "var(--ln-ink-3)", whiteSpace: "nowrap" }}
              >
                {it.first.toFixed(1)} → {it.last.toFixed(1)}
              </span>
            )}
            <span
              className="ln-num"
              style={{ fontSize: isMobile ? 14 : 13, textAlign: "right", color, fontWeight: 500 }}
            >
              {it.pct > 0 ? "+" : ""}{(it.pct * 100).toFixed(0)}%
            </span>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 18 : 24, padding: isMobile ? "10px 14px 18px" : "10px 28px 22px" }}>
      <Section title="LARGEST INCREASES" items={swings.up} color="var(--ln-crit)" />
      <Section title="LARGEST DECREASES" items={swings.down} color="var(--ln-brand)" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Country table — selected disease + measure + live risk chip
// ─────────────────────────────────────────────────────────────────
function CountryTable({
  disease,
  measure,
  year,
  rows,
  countries,
  liveRiskByCountry,
  isTabletDown,
}: {
  disease: GbdCause | null;
  measure: Measure;
  year: number;
  rows: GbdEstimate[];
  countries: { iso3: string; name: string; who_region: string | null; population: number | null }[];
  liveRiskByCountry: Map<string, "low" | "medium" | "high" | "critical">;
  isTabletDown: boolean;
}) {
  const tLiveRiskTitle = useT("Live outbreak risk from surveillance feed");
  const tableRows = useMemo(() => {
    const latestByIso = new Map<string, { year: number; rate: number }>();
    for (const r of rows) {
      if (r.rate == null) continue;
      if (r.year > year) continue;
      const prev = latestByIso.get(r.iso3);
      if (!prev || r.year > prev.year) latestByIso.set(r.iso3, { year: r.year, rate: r.rate });
    }
    return countries
      .map((c) => ({
        ...c,
        rate: latestByIso.get(c.iso3)?.rate ?? null,
        rateYear: latestByIso.get(c.iso3)?.year ?? null,
      }))
      .filter((c) => c.rate != null)
      .sort((a, b) => (b.rate! - a.rate!))
      .slice(0, 25);
  }, [rows, year, countries]);

  if (!disease || tableRows.length === 0) {
    return (
      <div style={{ padding: 20, fontSize: 12, color: "var(--ln-ink-3)" }}>
        <T>No country-level data for</T> {disease?.name} ({measure}) <T>yet.</T>
      </div>
    );
  }

  const cols = isTabletDown ? "50px 1fr 70px 70px" : "50px 1.4fr 1fr 90px 90px 90px";

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: isTabletDown ? 540 : "auto" }}>
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
          <span><T>RANK</T></span>
          <span><T>COUNTRY</T></span>
          {!isTabletDown && <span><T>REGION</T></span>}
          {!isTabletDown && <span style={{ textAlign: "right" }}><T>POP (M)</T></span>}
          <span style={{ textAlign: "right" }}>{measure.toUpperCase()}</span>
          <span style={{ textAlign: "right" }}><T>YEAR</T></span>
        </div>
        {tableRows.map((r, i) => {
          const liveRisk = liveRiskByCountry.get(r.name);
          return (
            <div
              key={r.iso3}
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
              <span
                style={{
                  fontSize: 12.5,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {r.name}
                {liveRisk && (
                  <span
                    className={`ln-chip ${
                      liveRisk === "critical" ? "is-crit" : liveRisk === "high" ? "is-warn" : "is-info"
                    }`}
                    style={{ fontSize: 9 }}
                    title={tLiveRiskTitle}
                  >
                    {liveRisk.toUpperCase()}
                  </span>
                )}
              </span>
              {!isTabletDown && (
                <span style={{ fontFamily: "var(--ln-font-mono)", fontSize: 11, color: "var(--ln-ink-3)" }}>
                  {r.who_region ?? "—"}
                </span>
              )}
              {!isTabletDown && (
                <span className="ln-num" style={{ fontSize: 12, textAlign: "right", color: "var(--ln-ink-3)" }}>
                  {r.population != null ? (r.population / 1_000_000).toFixed(1) : "—"}
                </span>
              )}
              <span className="ln-num" style={{ fontSize: 12, textAlign: "right", color: "var(--ln-warn)" }}>
                {r.rate!.toFixed(1)}
              </span>
              <span className="ln-num" style={{ fontSize: 11, textAlign: "right", color: "var(--ln-ink-4)" }}>
                {r.rateYear}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Searchable disease sidebar (desktop only). Lists every tracked
// cause with a search box + category tag, highlights the active one,
// and selects on click. Mirrors the redesign's left rail.
// ─────────────────────────────────────────────────────────────────
function GhiDiseaseSidebar({
  causes,
  diseaseId,
  setDiseaseId,
  countryCauseRows,
  year,
}: {
  causes: GbdCause[];
  diseaseId: string;
  setDiseaseId: (id: string) => void;
  countryCauseRows: GbdEstimate[];
  year: number;
}) {
  const [search, setSearch] = useState("");
  const tSearchConditions = useT("Search conditions…");

  // Real burden value per cause (selected measure, latest year ≤ active),
  // shown as a subtle metric next to each list item.
  const burdenByCause = useMemo(() => {
    const byCauseYear = new Map<string, Map<number, number[]>>();
    for (const r of countryCauseRows) {
      if (r.rate == null) continue;
      let yMap = byCauseYear.get(r.cause_id);
      if (!yMap) {
        yMap = new Map();
        byCauseYear.set(r.cause_id, yMap);
      }
      const arr = yMap.get(r.year) || [];
      arr.push(r.rate);
      yMap.set(r.year, arr);
    }
    const out = new Map<string, number>();
    for (const [id, yMap] of byCauseYear) {
      const years = Array.from(yMap.keys()).sort((a, b) => b - a);
      const used = years.find((y) => y <= year);
      if (used == null) continue;
      const arr = yMap.get(used)!;
      out.set(id, arr.reduce((a, b) => a + b, 0) / arr.length);
    }
    return out;
  }, [countryCauseRows, year]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? causes.filter((c) => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q))
      : causes;
    // Sort by burden (desc) so the heaviest causes surface first.
    return list
      .slice()
      .sort((a, b) => (burdenByCause.get(b.id) ?? -1) - (burdenByCause.get(a.id) ?? -1));
  }, [causes, search, burdenByCause]);

  return (
    <aside
      className="ln-pane"
      style={{
        borderRight: "1px solid var(--ln-line)",
        background: "var(--ln-rail, var(--ln-surface))",
        overflowY: "auto",
        alignSelf: "stretch",
      }}
    >
      <div style={{ padding: "16px 14px 10px", position: "sticky", top: 0, background: "var(--ln-rail, var(--ln-surface))", zIndex: 1 }}>
        <span className="ln-eyebrow"><T>Conditions</T> · {causes.length}</span>
        <div style={{ position: "relative", marginTop: 8 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ln-ink-4)", display: "inline-flex" }}>
            <Icon.Search />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tSearchConditions}
            style={{
              width: "100%",
              background: "var(--ln-surface)",
              border: "1px solid var(--ln-line-2)",
              borderRadius: 6,
              padding: "7px 10px 7px 32px",
              color: "var(--ln-ink)",
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>
      </div>
      <div style={{ borderTop: "1px solid var(--ln-line)" }}>
        {filtered.length === 0 && (
          <div style={{ padding: "16px 14px", fontSize: 12, color: "var(--ln-ink-4)" }}>
            <T>No conditions match</T> “{search}”.
          </div>
        )}
        {filtered.map((d) => {
          const on = d.id === diseaseId;
          const burden = burdenByCause.get(d.id);
          return (
            <button
              key={d.id}
              onClick={() => setDiseaseId(d.id)}
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 3,
                padding: "12px 14px",
                background: on ? `color-mix(in oklab, ${ACCENT} 10%, transparent)` : "transparent",
                border: "none",
                borderLeft: on ? `2px solid ${ACCENT}` : "2px solid transparent",
                borderBottom: "1px solid var(--ln-line)",
                cursor: "pointer",
                color: "inherit",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 13, color: on ? "var(--ln-ink)" : "var(--ln-ink-2)" }}>{d.name}</span>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    fontFamily: "var(--ln-font-mono)",
                    fontSize: 9,
                    color: on ? ACCENT : "var(--ln-ink-4)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {d.category}
                </span>
                <span className="ln-num" style={{ fontSize: 10, color: "var(--ln-ink-3)", whiteSpace: "nowrap" }}>
                  {burden != null ? burden.toFixed(0) : "—"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────
// Deterministic modeled-value helpers. Our gbd_estimates table is
// both-sexes / age-standardized only, so gender / age / risk-factor
// breakdowns are NOT measured. We derive them DETERMINISTICALLY from
// each cause's real burden + a stable hash of its id (no Math.random),
// and label every such chart as "modeled / illustrative".
// ─────────────────────────────────────────────────────────────────
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295; // 0..1
}

// "Modeled" pill shown on charts whose dimension we don't truly have.
function ModeledChip() {
  const tModeledTitle = useT("Illustrative model — our IHME slice is both-sexes / age-standardized, so this breakdown is derived deterministically, not measured.");
  return (
    <span
      className="ln-chip"
      style={{
        fontSize: 9,
        background: "color-mix(in oklab, var(--ln-warn) 12%, transparent)",
        color: "var(--ln-warn)",
        border: "1px solid color-mix(in oklab, var(--ln-warn) 38%, transparent)",
        letterSpacing: "0.06em",
      }}
      title={tModeledTitle}
    >
      <T>MODELED · ILLUSTRATIVE</T>
    </span>
  );
}

function ChartHead({
  eyebrow,
  title,
  right,
}: {
  eyebrow: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
      <div style={{ minWidth: 0 }}>
        <span className="ln-eyebrow">{eyebrow}</span>
        <h3 style={{ fontSize: 16, margin: "4px 0 0", fontWeight: 500, lineHeight: 1.3 }}>{title}</h3>
      </div>
      {right}
    </div>
  );
}

// Category → stable color, reused across the analytics charts.
const CAT_COLORS = ["#6ab7ff", ACCENT, "var(--ln-warn)", "#b07cff", "#ff8b6b", "#9bd95b", "var(--ln-crit)"];
function categoryColorMap(categories: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  categories.forEach((c, i) => {
    out[c] = CAT_COLORS[i % CAT_COLORS.length];
  });
  return out;
}

// ─────────────────────────────────────────────────────────────────
// Analytics charts block — Bubble + Category-stacked (REAL data),
// plus Gender / Age / Radar (MODELED, clearly labeled). Fetches its
// own per-cause aggregates so the parent stays lean.
// ─────────────────────────────────────────────────────────────────
function GhiAnalyticsCharts({
  causes,
  disease,
  countryIso,
  countryName,
  year,
  isMobile,
  isTabletDown,
}: {
  causes: GbdCause[];
  disease: GbdCause | null;
  countryIso: string;
  countryName: string;
  year: number;
  isMobile: boolean;
  isTabletDown: boolean;
}) {
  const tBurdenLandscape = useT("Burden landscape");
  const tBurdenShare = useT("Burden share");
  const tGenderDistribution = useT("Gender distribution · top causes");
  const tAgeDistribution = useT("Age distribution");
  const tRiskFactors = useT("Risk factors");
  const tSelectedCondition = useT("Selected condition");
  const tBubbleTitle = useT("Prevalence × Incidence × DALYs, one bubble per cause");
  const tDalysByCategory = useT("DALYs by cause category");
  const tModeledMaleFemaleShare = useT("Modeled male vs. female share");
  const tModeledCasesByAge = useT("Modeled cases by age band");
  const tModeledAttributableWeight = useT("Modeled attributable weight");
  const tModeledGenderSplit = useT("Modeled gender split");
  const tGlobalMean = useT("global mean");
  // Real per-cause aggregates for the active country/global at the active year
  // (latest ≤ year), across the 3 axes the bubble chart needs.
  const { rows: prevRows } = useGbdCountryAllCauses(countryIso, "Prevalence");
  const { rows: incRows } = useGbdCountryAllCauses(countryIso, "Incidence");
  const { rows: dalyRows } = useGbdCountryAllCauses(countryIso, "DALYs");

  // value(cause) = mean rate at latest year ≤ active, for a given measure's rows.
  const pickByCause = useMemo(() => {
    const build = (rows: GbdEstimate[]) => {
      const byCauseYear = new Map<string, Map<number, number[]>>();
      for (const r of rows) {
        if (r.rate == null) continue;
        let yMap = byCauseYear.get(r.cause_id);
        if (!yMap) {
          yMap = new Map();
          byCauseYear.set(r.cause_id, yMap);
        }
        const arr = yMap.get(r.year) || [];
        arr.push(r.rate);
        yMap.set(r.year, arr);
      }
      const out = new Map<string, number>();
      for (const [id, yMap] of byCauseYear) {
        const years = Array.from(yMap.keys()).sort((a, b) => b - a);
        const used = years.find((y) => y <= year);
        if (used == null) continue;
        const arr = yMap.get(used)!;
        out.set(id, arr.reduce((a, b) => a + b, 0) / arr.length);
      }
      return out;
    };
    return { prev: build(prevRows), inc: build(incRows), daly: build(dalyRows) };
  }, [prevRows, incRows, dalyRows, year]);

  const categories = useMemo(
    () => Array.from(new Set(causes.map((c) => c.category).filter(Boolean))),
    [causes]
  );
  const catColors = useMemo(() => categoryColorMap(categories), [categories]);

  // Bubble dataset (REAL): one bubble per cause with all 3 axes present.
  const bubbles = useMemo(() => {
    return causes
      .map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        prev: pickByCause.prev.get(c.id),
        inc: pickByCause.inc.get(c.id),
        daly: pickByCause.daly.get(c.id),
      }))
      .filter((b) => b.prev != null && b.inc != null && b.daly != null) as {
      id: string;
      name: string;
      category: string;
      prev: number;
      inc: number;
      daly: number;
    }[];
  }, [causes, pickByCause]);

  // Category stacked (REAL): sum DALYs per category, shown as a 100% share bar.
  const categoryShare = useMemo(() => {
    const totals = new Map<string, number>();
    for (const c of causes) {
      const d = pickByCause.daly.get(c.id);
      if (d == null) continue;
      totals.set(c.category, (totals.get(c.category) || 0) + d);
    }
    const grand = Array.from(totals.values()).reduce((a, b) => a + b, 0);
    return {
      grand,
      rows: Array.from(totals.entries())
        .map(([cat, val]) => ({ cat, val, pct: grand ? (val / grand) * 100 : 0 }))
        .sort((a, b) => b.val - a.val),
    };
  }, [causes, pickByCause]);

  const block: CSSProperties = {
    padding: isMobile ? "16px 14px" : "18px 28px",
    borderBottom: "1px solid var(--ln-line)",
  };
  const scope = countryIso === "global" ? tGlobalMean : countryName;

  return (
    <>
      {/* Burden bubble (REAL) + Category stacked (REAL) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isTabletDown ? "1fr" : "1.2fr 1fr",
          borderBottom: "1px solid var(--ln-line)",
        }}
      >
        <div style={{ padding: isMobile ? "16px 14px" : "18px 28px" }}>
          <ChartHead
            eyebrow={`${tBurdenLandscape} · ${scope} · ${year}`}
            title={tBubbleTitle}
            right={
              <span
                className="ln-chip"
                style={{
                  fontSize: 9,
                  background: "color-mix(in oklab, var(--ln-brand) 14%, transparent)",
                  color: "var(--ln-brand)",
                  border: "1px solid color-mix(in oklab, var(--ln-brand) 40%, transparent)",
                }}
              >
                IHME GBD 2023
              </span>
            }
          />
          <BurdenBubbleChart
            bubbles={bubbles}
            catColors={catColors}
            activeId={disease?.id ?? null}
            isMobile={isMobile}
          />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
            {categories.map((c) => (
              <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ln-ink-2)" }}>
                <span style={{ width: 10, height: 10, background: catColors[c], borderRadius: 2 }} />
                {c}
              </span>
            ))}
          </div>
        </div>
        <div style={{ padding: isMobile ? "16px 14px" : "18px 28px", borderLeft: isTabletDown ? "none" : "1px solid var(--ln-line)", borderTop: isTabletDown ? "1px solid var(--ln-line)" : "none" }}>
          <ChartHead
            eyebrow={`${tBurdenShare} · ${scope} · ${year}`}
            title={tDalysByCategory}
            right={
              <span
                className="ln-chip"
                style={{
                  fontSize: 9,
                  background: "color-mix(in oklab, var(--ln-brand) 14%, transparent)",
                  color: "var(--ln-brand)",
                  border: "1px solid color-mix(in oklab, var(--ln-brand) 40%, transparent)",
                }}
              >
                IHME GBD 2023
              </span>
            }
          />
          <CategoryStackedBar rows={categoryShare.rows} catColors={catColors} />
        </div>
      </div>

      {/* Modeled trio: Gender comparison + Age histogram + Risk radar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isTabletDown ? "1fr" : "1fr 1fr 1fr",
          borderBottom: "1px solid var(--ln-line)",
        }}
      >
        <div style={block}>
          <ChartHead
            eyebrow={tGenderDistribution}
            title={tModeledMaleFemaleShare}
            right={<ModeledChip />}
          />
          <GenderComparison causes={causes} pickDaly={pickByCause.daly} isMobile={isMobile} />
        </div>
        <div style={{ ...block, borderLeft: isTabletDown ? "none" : "1px solid var(--ln-line)" }}>
          <ChartHead
            eyebrow={`${tAgeDistribution} · ${disease?.name ?? "—"}`}
            title={tModeledCasesByAge}
            right={<ModeledChip />}
          />
          <AgeHistogram
            cause={disease}
            total={disease ? pickByCause.prev.get(disease.id) ?? null : null}
            isMobile={isMobile}
          />
        </div>
        <div style={{ ...block, borderLeft: isTabletDown ? "none" : "1px solid var(--ln-line)" }}>
          <ChartHead
            eyebrow={`${tRiskFactors} · ${disease?.name ?? "—"}`}
            title={tModeledAttributableWeight}
            right={<ModeledChip />}
          />
          <RiskRadar cause={disease} />
        </div>
      </div>

      {/* Gender split for the selected condition (MODELED) */}
      <div style={block}>
        <ChartHead
          eyebrow={`${tSelectedCondition} · ${disease?.name ?? "—"}`}
          title={tModeledGenderSplit}
          right={<ModeledChip />}
        />
        <GenderSplit cause={disease} />
      </div>
    </>
  );
}

// ─── Burden bubble chart (REAL) ───────────────────────────────────
function BurdenBubbleChart({
  bubbles,
  catColors,
  activeId,
  isMobile,
}: {
  bubbles: { id: string; name: string; category: string; prev: number; inc: number; daly: number }[];
  catColors: Record<string, string>;
  activeId: string | null;
  isMobile: boolean;
}) {
  const tPrevalenceAxis = useT("PREVALENCE →");
  const tIncidenceAxis = useT("↑ INCIDENCE · bubble = DALYs");
  if (bubbles.length === 0) {
    return (
      <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ln-ink-3)", fontSize: 13 }}>
        <T>No prevalence/incidence/DALYs overlap for this scope yet.</T>
      </div>
    );
  }
  const W = isMobile ? 420 : 560;
  const H = isMobile ? 300 : 280;
  const padL = 52;
  const padB = 34;
  const padT = 12;
  const padR = 16;
  const maxP = Math.max(...bubbles.map((b) => b.prev));
  const maxI = Math.max(...bubbles.map((b) => b.inc));
  const maxD = Math.max(...bubbles.map((b) => b.daly));
  const xAt = (v: number) => padL + (v / maxP) * (W - padL - padR);
  const yAt = (v: number) => (H - padB) - (v / maxI) * (H - padB - padT);
  const rAt = (v: number) => 5 + Math.sqrt(v / maxD) * (isMobile ? 22 : 26);
  const fs = isMobile ? 11 : 9;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
        <g key={p}>
          <line x1={padL} y1={(H - padB) - p * (H - padB - padT)} x2={W - padR} y2={(H - padB) - p * (H - padB - padT)} stroke="var(--ln-line)" strokeDasharray="2 4" />
          <text x={padL - 6} y={(H - padB) - p * (H - padB - padT) + fs / 3} fontSize={fs} textAnchor="end" fill="var(--ln-ink-4)" fontFamily="var(--ln-font-mono)">
            {fmtAxis(maxI * p)}
          </text>
        </g>
      ))}
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="var(--ln-line-2)" />
      <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="var(--ln-line-2)" />
      <text x={W - padR} y={H - 6} fontSize={fs} textAnchor="end" fill="var(--ln-ink-4)" fontFamily="var(--ln-font-mono)">{tPrevalenceAxis}</text>
      <text x={padL + 4} y={padT + 2} fontSize={fs} fill="var(--ln-ink-4)" fontFamily="var(--ln-font-mono)">{tIncidenceAxis}</text>
      {bubbles.map((b) => {
        const x = xAt(b.prev);
        const y = yAt(b.inc);
        const r = rAt(b.daly);
        const on = b.id === activeId;
        const color = catColors[b.category] || ACCENT;
        return (
          <g key={b.id}>
            <circle cx={x} cy={y} r={r} fill={color} opacity={on ? 0.5 : 0.28} stroke={on ? color : "none"} strokeWidth={on ? 2 : 0} />
            <circle cx={x} cy={y} r={2.5} fill={color} />
            {(on || r > (isMobile ? 16 : 14)) && (
              <text x={x} y={y - r - 3} fontSize={fs} textAnchor="middle" fill={on ? "var(--ln-ink)" : "var(--ln-ink-3)"} fontFamily="var(--ln-font-mono)">
                {b.name.split(" ")[0]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Category stacked bar (REAL) ──────────────────────────────────
function CategoryStackedBar({
  rows,
  catColors,
}: {
  rows: { cat: string; val: number; pct: number }[];
  catColors: Record<string, string>;
}) {
  if (rows.length === 0) {
    return (
      <div style={{ height: 160, display: "flex", alignItems: "center", color: "var(--ln-ink-3)", fontSize: 12 }}>
        <T>No DALYs available to aggregate for this scope yet.</T>
      </div>
    );
  }
  return (
    <div>
      <div style={{ display: "flex", height: 30, borderRadius: 4, overflow: "hidden", border: "1px solid var(--ln-line)" }}>
        {rows.map((r) => (
          <span
            key={r.cat}
            title={`${r.cat} · ${r.pct.toFixed(1)}%`}
            style={{ width: `${r.pct}%`, background: catColors[r.cat] || ACCENT, opacity: 0.85 }}
          />
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 14 }}>
        {rows.map((r) => (
          <div key={r.cat} style={{ display: "grid", gridTemplateColumns: "12px 1fr 52px", alignItems: "center", gap: 10 }}>
            <span style={{ width: 10, height: 10, background: catColors[r.cat] || ACCENT, borderRadius: 2 }} />
            <span style={{ fontSize: 12, color: "var(--ln-ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.cat}</span>
            <span className="ln-num" style={{ fontSize: 12, textAlign: "right", color: "var(--ln-ink)" }}>{r.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Gender comparison (MODELED) ──────────────────────────────────
// Deterministic male/female split per cause, anchored on a stable hash
// of the cause id (so it never shuffles between renders). NOT measured.
function GenderComparison({
  causes,
  pickDaly,
  isMobile,
}: {
  causes: GbdCause[];
  pickDaly: Map<string, number>;
  isMobile: boolean;
}) {
  const rows = useMemo(() => {
    return causes
      .map((c) => ({ c, daly: pickDaly.get(c.id) }))
      .filter((r) => r.daly != null)
      .sort((a, b) => (b.daly! - a.daly!))
      .slice(0, 6)
      .map(({ c }) => {
        const male = Math.round(38 + hashStr(c.id) * 24); // 38–62%
        return { name: c.name, male, female: 100 - male };
      });
  }, [causes, pickDaly]);

  if (rows.length === 0) {
    return <div style={{ fontSize: 12, color: "var(--ln-ink-3)" }}><T>No causes to model yet.</T></div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {rows.map((r) => (
        <div key={r.name}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ln-ink-2)", marginBottom: 3, gap: 8 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
            <span style={{ fontFamily: "var(--ln-font-mono)", color: "var(--ln-ink-3)", whiteSpace: "nowrap" }}>{r.male}% / {r.female}%</span>
          </div>
          <div style={{ display: "flex", height: isMobile ? 12 : 10, borderRadius: 2, overflow: "hidden" }}>
            <span style={{ width: `${r.male}%`, background: "#6ab7ff" }} />
            <span style={{ width: `${r.female}%`, background: "#ff8b6b" }} />
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 14, marginTop: 4 }}>
        <span style={{ fontSize: 11, color: "var(--ln-ink-2)", display: "inline-flex", gap: 6, alignItems: "center" }}>
          <span style={{ width: 10, height: 10, background: "#6ab7ff" }} /><T>Male</T>
        </span>
        <span style={{ fontSize: 11, color: "var(--ln-ink-2)", display: "inline-flex", gap: 6, alignItems: "center" }}>
          <span style={{ width: 10, height: 10, background: "#ff8b6b" }} /><T>Female</T>
        </span>
      </div>
    </div>
  );
}

// ─── Age histogram (MODELED) ──────────────────────────────────────
// Distributes the cause's real prevalence rate across age bands using a
// deterministic, cause-skewed weighting (older-skew vs younger-skew set
// by the cause id hash). Bar heights are illustrative, not measured.
function AgeHistogram({
  cause,
  total,
  isMobile,
}: {
  cause: GbdCause | null;
  total: number | null;
  isMobile: boolean;
}) {
  const bins = ["0-4", "5-14", "15-24", "25-34", "35-44", "45-54", "55-64", "65-74", "75+"];
  const data = useMemo(() => {
    if (!cause || total == null) return null;
    const skew = hashStr(cause.id); // 0=young-skew, 1=old-skew
    // Center the age curve between band index 2 and 8 based on skew.
    const center = 2 + skew * 6;
    const width = 2.2 + hashStr(cause.id + "w") * 2.5;
    const weights = bins.map((_, i) => Math.exp(-Math.pow((i - center) / width, 2)));
    const sum = weights.reduce((a, b) => a + b, 0);
    return weights.map((w) => (w / sum) * total);
  }, [cause, total]);

  if (!data) {
    return <div style={{ fontSize: 12, color: "var(--ln-ink-3)", height: 140 }}><T>No prevalence to model yet.</T></div>;
  }
  const max = Math.max(...data);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 150, padding: "0 0 4px" }}>
        {data.map((v, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, justifyContent: "flex-end", height: "100%" }}>
            <span className="ln-num" style={{ fontSize: isMobile ? 9 : 8.5, color: "var(--ln-ink-3)" }}>{v.toFixed(0)}</span>
            <div style={{ width: "100%", height: `${(v / max) * 100}%`, background: ACCENT, opacity: 0.7, minHeight: 2, borderRadius: "2px 2px 0 0" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {bins.map((b) => (
          <span key={b} style={{ flex: 1, textAlign: "center", fontFamily: "var(--ln-font-mono)", fontSize: isMobile ? 9 : 8.5, color: "var(--ln-ink-4)" }}>{b}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Risk-factor radar (MODELED) ──────────────────────────────────
// Axes are the cause's REAL risk_factors; the relative magnitudes are
// modeled deterministically from a hash of (cause id + factor name).
function RiskRadar({ cause }: { cause: GbdCause | null }) {
  const factors = (cause?.risk_factors ?? []).slice(0, 6);
  if (!cause || factors.length < 3) {
    return (
      <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ln-ink-3)", fontSize: 12, textAlign: "center" }}>
        <T>Not enough mapped risk factors for</T> {cause?.name ?? <T>this cause</T>} <T>to plot a radar.</T>
      </div>
    );
  }
  const n = factors.length;
  const W = 280;
  const H = 230;
  const cx = W / 2;
  const cy = H / 2 + 6;
  const r = 78;
  const values = factors.map((f) => 0.45 + hashStr(cause.id + "|" + f) * 0.5); // 0.45–0.95
  const pt = (i: number, mag: number) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [cx + Math.cos(a) * r * mag, cy + Math.sin(a) * r * mag] as const;
  };
  const polygon = values.map((v, i) => pt(i, v).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
      {[0.25, 0.5, 0.75, 1].map((p) => (
        <polygon
          key={p}
          points={factors.map((_, i) => pt(i, p).join(",")).join(" ")}
          fill="none"
          stroke="var(--ln-line)"
          strokeDasharray="2 3"
        />
      ))}
      {factors.map((f, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const lx = cx + Math.cos(a) * (r + 16);
        const ly = cy + Math.sin(a) * (r + 12);
        return (
          <g key={f}>
            <line x1={cx} y1={cy} x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r} stroke="var(--ln-line)" />
            <text x={lx} y={ly} textAnchor={Math.abs(Math.cos(a)) < 0.3 ? "middle" : Math.cos(a) > 0 ? "start" : "end"} fontSize="8.5" fill="var(--ln-ink-3)" fontFamily="var(--ln-font-mono)">
              {f}
            </text>
          </g>
        );
      })}
      <polygon points={polygon} fill={ACCENT} opacity="0.2" />
      <polygon points={polygon} fill="none" stroke={ACCENT} strokeWidth="1.5" />
      {values.map((v, i) => {
        const [x, y] = pt(i, v);
        return <circle key={i} cx={x} cy={y} r="3" fill={ACCENT} />;
      })}
    </svg>
  );
}

// ─── Gender split (MODELED) ───────────────────────────────────────
// Single-condition male/female split + a 10-figure pictogram, derived
// deterministically from the cause id hash. NOT measured.
function GenderSplit({ cause }: { cause: GbdCause | null }) {
  if (!cause) {
    return <div style={{ fontSize: 12, color: "var(--ln-ink-3)" }}><T>Select a condition.</T></div>;
  }
  const male = Math.round(38 + hashStr(cause.id) * 24);
  const female = 100 - male;
  const figs = Array.from({ length: 10 }, (_, i) => (i < Math.round(male / 10) ? "m" : "f"));
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
        <div>
          <span className="ln-eyebrow"><T>Male</T></span>
          <div className="ln-num" style={{ fontSize: 36, color: "#6ab7ff", lineHeight: 1, marginTop: 4 }}>{male}%</div>
        </div>
        <div>
          <span className="ln-eyebrow"><T>Female</T></span>
          <div className="ln-num" style={{ fontSize: 36, color: "#ff8b6b", lineHeight: 1, marginTop: 4 }}>{female}%</div>
        </div>
      </div>
      <svg viewBox="0 0 264 70" width="264" style={{ maxWidth: "100%" }}>
        <rect x="0" y="0" width={2.6 * male} height="14" fill="#6ab7ff" />
        <rect x={2.6 * male} y="0" width={2.6 * female} height="14" fill="#ff8b6b" />
        {figs.map((g, i) => (
          <g key={i} transform={`translate(${i * 26 + 4} 30)`}>
            <circle cx="10" cy="6" r="4" fill={g === "m" ? "#6ab7ff" : "#ff8b6b"} />
            <rect x="6" y="11" width="8" height="14" fill={g === "m" ? "#6ab7ff" : "#ff8b6b"} opacity="0.7" />
          </g>
        ))}
      </svg>
    </div>
  );
}
