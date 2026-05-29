import { useMemo, useState } from "react";
import { Sparkline } from "../components/Sparkline";
import { WorldMap } from "../components/WorldMap";
import { TopBar } from "./SurveillanceMap";
import {
  useGbdCountries,
  useGbdCauses,
  useGbdCountryIndicator,
  useGbdDiseaseEstimates,
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

  const { countries } = useGbdCountries();
  const causes = useGbdCauses();
  const coverage = useGbdDataCoverage();

  const [countryIso, setCountryIso] = useState<string>("global");
  const [diseaseId, setDiseaseId] = useState<string>("ischemic_heart_disease");
  const [measure, setMeasure] = useState<Measure>("DALYs");
  const [year, setYear] = useState<number>(2023);

  const disease = useMemo<GbdCause | null>(
    () => causes.find((c) => c.id === diseaseId) || causes[0] || null,
    [causes, diseaseId]
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
        {/* Filter strip: 1-col on mobile, wrap on tablet, single row on desktop */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr 1fr"
              : isTabletDown
              ? "minmax(180px,1fr) minmax(180px,1fr) minmax(130px,160px) minmax(200px,260px)"
              : "minmax(180px,220px) minmax(200px,260px) minmax(130px,160px) auto 1fr auto",
            alignItems: "center",
            gap: isMobile ? 8 : 10,
            padding: isMobile ? "10px 12px" : "14px 28px",
            borderBottom: "1px solid var(--ln-line)",
            background: "var(--ln-topbar)",
          }}
        >
          <select
            value={countryIso}
            onChange={(e) => setCountryIso(e.target.value)}
            style={{ ...selStyle, width: "100%" }}
          >
            <option value="global">Global average</option>
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
            style={{ ...selStyle, width: "100%", gridColumn: isMobile ? "1 / 2" : "auto" }}
            title="Choose what to measure: mortality, total burden, disability, or case counts"
          >
            {MEASURES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              gridColumn: isMobile ? "2 / 3" : "auto",
              justifyContent: isMobile ? "flex-end" : "flex-start",
              minWidth: 0,
            }}
          >
            <span style={{ fontSize: 11, color: "var(--ln-ink-3)", fontFamily: "var(--ln-font-mono)" }}>
              YEAR
            </span>
            <input
              type="range"
              min={2017}
              max={2023}
              value={year}
              onChange={(e) => setYear(+e.target.value)}
              style={{ flex: 1, minWidth: 60, maxWidth: isMobile ? 110 : 160 }}
            />
            <span className="ln-num" style={{ fontSize: 14, color: ACCENT, width: 40, textAlign: "right" }}>{year}</span>
          </div>
          {!isMobile && <div />}
          {!isMobile && coverage && (
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
              REAL DATA · {coverage.rows.toLocaleString()} ROWS · {coverage.causes} CAUSES ·{" "}
              {coverage.minYear}–{coverage.maxYear}
            </span>
          )}
        </div>

        {/* Header */}
        <div
          style={{
            padding: isMobile ? "16px 14px" : "24px 28px 18px",
            borderBottom: "1px solid var(--ln-line)",
          }}
        >
          <span className="ln-eyebrow">Country health snapshot</span>
          <h2
            className="ln-display"
            style={{
              fontSize: isMobile ? 26 : 38,
              margin: "8px 0 6px",
              letterSpacing: "-0.025em",
            }}
          >
            {countryIso === "global"
              ? "Global average"
              : countries.find((c) => c.iso3 === countryIso)?.name || "—"}
            <span style={{ color: "var(--ln-ink-4)" }}>,</span>{" "}
            <span style={{ color: "var(--ln-ink-3)", fontStyle: "italic" }}>{year}</span>
          </h2>
          <p
            style={{
              fontSize: 13.5,
              color: "var(--ln-ink-2)",
              maxWidth: 760,
              margin: "4px 0 0",
              lineHeight: 1.5,
            }}
          >
            Sources: IHME Global Burden of Disease 2023 (Deaths / DALYs / YLLs / YLDs / Incidence / Prevalence,
            age-standardized rates, 10 causes, 204 countries, 95% CI bounds), World Bank Open Data (country
            indicators), WHO GHO (malaria incidence), and the LiveHealth+ surveillance feed.
          </p>
        </div>

        {/* 6 country-indicator cards (real World Bank data) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : isTabletDown ? "repeat(3, 1fr)" : "repeat(6, 1fr)",
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
              border={isMobile ? i % 2 !== 0 : i > 0}
              borderTop={isMobile ? i >= 2 : false}
              isMobile={isMobile}
            />
          ))}
        </div>

        {/* Disease trend with CI band */}
        <div style={{ padding: isMobile ? "16px 14px" : "20px 28px", borderBottom: "1px solid var(--ln-line)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div>
              <span className="ln-eyebrow">
                {measure} · {disease?.name ?? "—"}
              </span>
              <h3 style={{ fontSize: isMobile ? 15 : 18, margin: "4px 0 0", fontWeight: 500, lineHeight: 1.35 }}>
                {MEASURE_DESC[measure]} ·{" "}
                {countryIso === "global"
                  ? "global mean across 204 countries"
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
              title="Estimates with 95% uncertainty band"
            >
              IHME GBD 2023 · 95% CI
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
                <span className="ln-eyebrow">Live regional risk · 30d</span>
                <h3 style={{ fontSize: isMobile ? 15 : 16, margin: "4px 0 0", fontWeight: 500, lineHeight: 1.35 }}>Outbreak pressure today</h3>
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
                LIVE · SUPABASE
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
              Continent fills come from `outbreak_signals` grouped by region risk level. Pulsing
              dots are individual high-severity outbreak signals from the live surveillance feed.
            </div>
          </div>
        </div>

        {/* Cause burden ranking — all 10 diseases for active country */}
        <div style={{ borderBottom: "1px solid var(--ln-line)" }}>
          <div style={{ padding: isMobile ? "14px 14px 4px" : "18px 28px 4px" }}>
            <span className="ln-eyebrow">Cause burden · {measure}</span>
            <h3 style={{ fontSize: isMobile ? 15 : 16, margin: "4px 0 4px", fontWeight: 500, lineHeight: 1.35 }}>
              {causes.length} tracked causes ranked,{" "}
              {countryIso === "global"
                ? "global mean"
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
              <span className="ln-eyebrow">Burden split · {disease?.name ?? "—"}</span>
              <h3 style={{ fontSize: isMobile ? 15 : 16, margin: "4px 0 0", fontWeight: 500, lineHeight: 1.35 }}>
                Years of life lost vs years lived with disability
              </h3>
            </div>
            <span style={{ fontSize: 11, color: "var(--ln-ink-3)", fontFamily: "var(--ln-font-mono)" }}>
              YLL = mortality · YLD = morbidity · DALY = YLL + YLD
            </span>
          </div>
          <BurdenSplitStack rows={splitRows} countryIso={countryIso} isMobile={isMobile} />
        </div>

        {/* YoY leaderboard — countries with biggest 2017→latest swing for selected disease+measure */}
        <div style={{ borderBottom: "1px solid var(--ln-line)" }}>
          <div style={{ padding: isMobile ? "14px 14px 4px" : "18px 28px 4px" }}>
            <span className="ln-eyebrow">Trajectory · {disease?.name ?? "—"} · {measure}</span>
            <h3 style={{ fontSize: isMobile ? 15 : 16, margin: "4px 0 4px", fontWeight: 500, lineHeight: 1.35 }}>
              Biggest country swings, 2017 → 2023
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
              <span className="ln-eyebrow">Country detail · {year}</span>
              <h3 style={{ fontSize: isMobile ? 15 : 16, margin: "4px 0 0", fontWeight: 500, lineHeight: 1.35 }}>
                {disease?.name} {measure.toLowerCase()} + live outbreak risk
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
          <span className="ln-eyebrow">Data sources + methodology</span>
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
              <b style={{ color: "var(--ln-ink-2)" }}>IHME Global Burden of Disease (GBD 2023)</b> —
              age-standardized rate estimates with 95% uncertainty bounds for Deaths, DALYs, YLLs,
              YLDs, Incidence and Prevalence, across 10 tracked causes and 204 countries (2017–2023).
              Free for non-commercial use under IHME's terms.
            </li>
            <li>
              <b style={{ color: "var(--ln-ink-2)" }}>World Bank Open Data</b> — life expectancy,
              DTP3/measles vaccine coverage, under-5 + maternal mortality, health spending as % of
              GDP. Free, no signup, CC-BY 4.0.
            </li>
            <li>
              <b style={{ color: "var(--ln-ink-2)" }}>WHO Global Health Observatory</b> — malaria
              incidence (kept because IHME's free 10-cause set does not include malaria). Free, no
              signup, CC-BY-NC-SA 3.0.
            </li>
            <li>
              <b style={{ color: "var(--ln-ink-2)" }}>LiveHealth+ surveillance feed</b> — the
              choropleth fills and pulsing outbreak markers on the world map, plus the live risk
              chips in the country table. Real-time from `outbreak_signals` in Supabase.
            </li>
            <li>
              The metric cards reflect the latest available value for the selected country + year.
              When a country has no reported value for that year, the card falls back to the most
              recent prior year. Same fallback applies to the disease trend chart and country table.
            </li>
          </ul>
        </div>
      </div>
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
      <span className="ln-eyebrow" style={{ fontSize: isMobile ? 10 : undefined }}>{label}</span>
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
        No data for this disease + measure combination yet.
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
      <span className="ln-eyebrow">Country comparison · {disease?.name ?? "—"} · {measure}</span>
      <h3 style={{ fontSize: 16, margin: "4px 0 14px", fontWeight: 500 }}>Top 10 by {measure} ({MEASURE_UNIT[measure]})</h3>
      {top.length === 0 ? (
        <div style={{ padding: 20, fontSize: 12, color: "var(--ln-ink-3)" }}>
          No country comparison available for this combination yet.
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
        No cause data available for this country yet.
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
        YLL/YLD split unavailable for this disease (mental-health causes are reported without YLLs).
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
        {title}
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
        No country-level data for {disease?.name} ({measure}) yet.
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
          <span>RANK</span>
          <span>COUNTRY</span>
          {!isTabletDown && <span>REGION</span>}
          {!isTabletDown && <span style={{ textAlign: "right" }}>POP (M)</span>}
          <span style={{ textAlign: "right" }}>{measure.toUpperCase()}</span>
          <span style={{ textAlign: "right" }}>YEAR</span>
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
                    title="Live outbreak risk from surveillance feed"
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
