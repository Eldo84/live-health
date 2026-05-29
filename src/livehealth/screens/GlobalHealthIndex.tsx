import { useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { Sparkline } from "../components/Sparkline";
import { WorldMap } from "../components/WorldMap";
import { TopBar } from "./SurveillanceMap";
import {
  useGbdCountries,
  useGbdCauses,
  useGbdCountryIndicator,
  useGbdDiseaseEstimates,
  useGbdDataCoverage,
  type GbdCause,
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
// Each key matches a row in gbd_country_indicators.indicator.
const COUNTRY_METRICS = [
  { key: "life_expectancy", label: "Life expectancy", unit: "years", color: ACCENT },
  { key: "dtp3_coverage", label: "DTP3 coverage", unit: "%", color: "#6ab7ff" },
  { key: "measles_coverage", label: "Measles vaccine", unit: "%", color: "#9bd95b" },
  { key: "under5_mortality", label: "Under-5 mortality", unit: "per 1k", color: "var(--ln-crit)" },
  { key: "maternal_mortality", label: "Maternal mortality", unit: "per 100k", color: "var(--ln-warn)" },
  { key: "health_expenditure_pct_gdp", label: "Health spending", unit: "% GDP", color: "#b07cff" },
];

export function GlobalHealthIndexScreen() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTabletDown = bp !== "desktop";

  const { countries } = useGbdCountries();
  const causes = useGbdCauses();
  const coverage = useGbdDataCoverage();

  // Country & disease selection — both default to a country/disease with real data.
  const [countryIso, setCountryIso] = useState<string>("global");
  const [diseaseId, setDiseaseId] = useState<string>("tuberculosis");
  const [year, setYear] = useState<number>(2022);

  const disease = useMemo<GbdCause | null>(
    () => causes.find((c) => c.id === diseaseId) || causes[0] || null,
    [causes, diseaseId]
  );

  // Live regional risk (real Supabase outbreak data) for the map.
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
  const liveRiskByCountry = useMemo(() => {
    const m = new Map<string, "low" | "medium" | "high" | "critical">();
    for (const r of regions) for (const c of r.countries) m.set(c.name, c.riskLevel);
    return m;
  }, [regions]);

  // Disease incidence — real WHO data for TB / HIV / Malaria; "—" for others.
  const { rows: incidenceRows } = useGbdDiseaseEstimates(disease?.id ?? null, "incidence");
  const hasIncidence = incidenceRows.length > 0;

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
            gap: 10,
            padding: isMobile ? "12px 14px" : "14px 28px",
            borderBottom: "1px solid var(--ln-line)",
            background: "var(--ln-topbar)",
            flexWrap: "wrap",
          }}
        >
          <select
            value={countryIso}
            onChange={(e) => setCountryIso(e.target.value)}
            style={{ ...selStyle, minWidth: 200 }}
          >
            <option value="global">Global average</option>
            {countries.map((c) => (
              <option key={c.iso3} value={c.iso3}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={diseaseId}
            onChange={(e) => setDiseaseId(e.target.value)}
            style={{ ...selStyle, minWidth: 220 }}
          >
            {causes.map((c) => (
              <option key={c.id} value={c.id}>
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
              min={2017}
              max={2023}
              value={year}
              onChange={(e) => setYear(+e.target.value)}
              style={{ width: isMobile ? 110 : 160 }}
            />
            <span className="ln-num" style={{ fontSize: 16, color: ACCENT, width: 48 }}>
              {year}
            </span>
          </div>
          <div style={{ flex: 1 }} />
          {coverage && (
            <span
              style={{
                fontFamily: "var(--ln-font-mono)",
                fontSize: 10,
                color: "var(--ln-ink-3)",
                letterSpacing: "0.08em",
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
              maxWidth: 720,
              margin: "4px 0 0",
              lineHeight: 1.5,
            }}
          >
            Source: World Bank Open Data (life expectancy, vaccination, mortality, health
            spending) and WHO Global Health Observatory (TB, HIV, malaria incidence). All
            indicators imported via the public, no-signup APIs; refreshed via the
            <code style={{ fontFamily: "var(--ln-font-mono)", fontSize: 12, color: ACCENT }}>
              {" "}
              import-public-health-data{" "}
            </code>
            edge function.
          </p>
        </div>

        {/* 6 country-indicator cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr 1fr"
              : isTabletDown
              ? "repeat(3, 1fr)"
              : "repeat(6, 1fr)",
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
            />
          ))}
        </div>

        {/* Disease incidence */}
        <div style={{ padding: isMobile ? "16px 14px" : "20px 28px", borderBottom: "1px solid var(--ln-line)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div>
              <span className="ln-eyebrow">
                Disease incidence · {disease?.name ?? "—"}
              </span>
              <h3 style={{ fontSize: 18, margin: "4px 0 0", fontWeight: 500 }}>
                {hasIncidence
                  ? `WHO-reported incidence rate, ${countryIso === "global" ? "global average" : countries.find((c) => c.iso3 === countryIso)?.name}`
                  : "No WHO-reported series for this disease"}
              </h3>
            </div>
            {!hasIncidence && (
              <span
                className="ln-chip"
                style={{
                  fontSize: 10,
                  background: "color-mix(in oklab, var(--ln-warn) 16%, transparent)",
                  color: "var(--ln-warn)",
                  border: "1px solid color-mix(in oklab, var(--ln-warn) 40%, transparent)",
                }}
              >
                WHO COVERAGE: TB · HIV · MALARIA
              </span>
            )}
          </div>
          <div style={{ marginTop: 14 }}>
            <DiseaseIncidenceChart
              rows={incidenceRows}
              countryIso={countryIso}
              activeYear={year}
            />
          </div>
        </div>

        {/* Country comparison + live regional risk */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isTabletDown ? "1fr" : "1fr 1fr",
            borderBottom: "1px solid var(--ln-line)",
          }}
        >
          <CountryComparison
            disease={disease}
            year={year}
            rows={incidenceRows}
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
                <h3 style={{ fontSize: 16, margin: "4px 0 0", fontWeight: 500 }}>
                  Outbreak pressure today
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
              >
                LIVE · SUPABASE
              </span>
            </div>
            <div style={{ height: 240, position: "relative", overflow: "hidden" }}>
              <WorldMap
                width={620}
                height={240}
                outbreaks={mapOutbreaks}
                regionRisk={regionRisk}
                showChoropleth
                pulse
                dotSpacing={11}
              />
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: 11.5,
                color: "var(--ln-ink-3)",
                lineHeight: 1.5,
              }}
            >
              Continent fills come from `outbreak_signals` grouped by region risk level. Pulsing
              dots are individual high-severity outbreak signals from the live surveillance feed.
            </div>
          </div>
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
              <h3 style={{ fontSize: 16, margin: "4px 0 0", fontWeight: 500 }}>
                {disease?.name} incidence + country indicators
              </h3>
            </div>
          </div>
          <CountryTable
            disease={disease}
            year={year}
            incidenceRows={incidenceRows}
            countries={countries}
            liveRiskByCountry={liveRiskByCountry}
            isTabletDown={isTabletDown}
          />
        </div>

        {/* Methodology + disclaimer */}
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
              <b style={{ color: "var(--ln-ink-2)" }}>World Bank Open Data</b> — life
              expectancy, DTP3/measles vaccine coverage, under-5 + maternal mortality, health
              spending as % of GDP. Free, no signup, CC-BY 4.0.
            </li>
            <li>
              <b style={{ color: "var(--ln-ink-2)" }}>WHO Global Health Observatory</b> —
              tuberculosis, HIV/AIDS and malaria incidence per 100k. Free, no signup, CC-BY-NC-SA
              3.0. Disease coverage is currently limited to these three because IHME GBD's
              full disease catalog requires an agreement (covered separately under "future work").
            </li>
            <li>
              <b style={{ color: "var(--ln-ink-2)" }}>LiveHealth+ surveillance feed</b> — the
              choropleth fills and pulsing outbreak markers on the world map. Real-time from
              `outbreak_signals` in Supabase.
            </li>
            <li>
              The metric cards reflect the latest available value for the selected
              country + year. When a country has no reported value for that year, the card
              falls back to the most recent prior year.
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
}: {
  indicator: string;
  label: string;
  unit: string;
  color: string;
  countryIso: string;
  year: number;
  border: boolean;
}) {
  const { rows } = useGbdCountryIndicator(indicator);

  // Filter to the active country (or compute global average across countries).
  const { value, sparkline, yoy } = useMemo(() => {
    if (!rows.length) return { value: null, sparkline: [], yoy: null };
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
    // Active value: requested year, or latest available before it.
    let value: number | null = yearAvg(year);
    if (value == null) {
      for (let y = year - 1; y >= years[0]; y--) {
        value = yearAvg(y);
        if (value != null) break;
      }
    }
    const spark = years.map((y) => yearAvg(y) ?? 0);
    const yoy =
      years.length > 1
        ? (yearAvg(years[years.length - 1])! - yearAvg(years[years.length - 2])!) /
          (yearAvg(years[years.length - 2]) || 1)
        : 0;
    return { value, sparkline: spark, yoy };
  }, [rows, countryIso, year]);

  return (
    <div
      style={{
        padding: "18px 20px 16px",
        borderLeft: border ? "1px solid var(--ln-line)" : "none",
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, width: 28, height: 2, background: color }} />
      <span className="ln-eyebrow">{label}</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
        <span className="ln-num" style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.03em" }}>
          {value == null ? "—" : value.toFixed(value > 100 ? 0 : 1)}
        </span>
        <span style={{ fontSize: 11, color: "var(--ln-ink-3)", fontFamily: "var(--ln-font-mono)" }}>
          {unit}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginTop: 8,
          gap: 6,
        }}
      >
        <span
          style={{
            fontFamily: "var(--ln-font-mono)",
            fontSize: 10,
            color: yoy == null
              ? "var(--ln-ink-4)"
              : yoy > 0
              ? "var(--ln-brand)"
              : yoy < 0
              ? "var(--ln-crit)"
              : "var(--ln-ink-3)",
          }}
        >
          {yoy == null ? "—" : yoy > 0 ? "▲" : yoy < 0 ? "▼" : "◆"} {yoy == null ? "" : (yoy * 100).toFixed(1) + "%"}
        </span>
        {sparkline.length > 1 && (
          <Sparkline data={sparkline} color={color} width={56} height={18} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Disease incidence time-series chart (WHO data)
// ─────────────────────────────────────────────────────────────────
function DiseaseIncidenceChart({
  rows,
  countryIso,
  activeYear,
}: {
  rows: { iso3: string; year: number; rate: number }[];
  countryIso: string;
  activeYear: number;
}) {
  const points = useMemo(() => {
    const byYear = new Map<number, number[]>();
    for (const r of rows) {
      if (countryIso !== "global" && r.iso3 !== countryIso) continue;
      const arr = byYear.get(r.year) || [];
      arr.push(r.rate);
      byYear.set(r.year, arr);
    }
    return Array.from(byYear.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, arr]) => ({
        year,
        value: arr.reduce((a, b) => a + b, 0) / arr.length,
      }));
  }, [rows, countryIso]);

  if (!points.length) {
    return (
      <div
        style={{
          height: 220,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ln-ink-3)",
          fontSize: 13,
          padding: "0 16px",
          textAlign: "center",
        }}
      >
        WHO doesn't publish open per-country incidence for this disease.
        Try Tuberculosis, HIV/AIDS, or Malaria — those have full WHO GHO coverage.
      </div>
    );
  }

  const W = 760;
  const H = 220;
  const padL = 44;
  const padB = 26;
  const max = Math.max(...points.map((p) => p.value));
  const xAt = (i: number) =>
    padL + (i / Math.max(1, points.length - 1)) * (W - padL - 12);
  const yAt = (v: number) =>
    8 + (H - padB - 8) - (v / max) * (H - padB - 16);

  const path = points
    .map((p, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)} ${yAt(p.value).toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
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
            {Math.round(max * p)}
          </text>
        </g>
      ))}
      {points.map((p, i) => (
        <text
          key={p.year}
          x={xAt(i)}
          y={H - 6}
          fontSize="10"
          textAnchor="middle"
          fill={p.year === activeYear ? "var(--ln-ink)" : "var(--ln-ink-4)"}
          fontFamily="var(--ln-font-mono)"
          fontWeight={p.year === activeYear ? 600 : 400}
        >
          {p.year}
        </text>
      ))}
      <path
        d={`${path} L${xAt(points.length - 1)} ${H - padB} L${padL} ${H - padB} Z`}
        fill={ACCENT}
        opacity="0.12"
      />
      <path
        d={path}
        fill="none"
        stroke={ACCENT}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <circle
          key={p.year}
          cx={xAt(i)}
          cy={yAt(p.value)}
          r={p.year === activeYear ? 4 : 2.5}
          fill={ACCENT}
        />
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// Country comparison — top countries by incidence (WHO data)
// ─────────────────────────────────────────────────────────────────
function CountryComparison({
  disease,
  year,
  rows,
  countries,
  isMobile,
}: {
  disease: GbdCause | null;
  year: number;
  rows: { iso3: string; year: number; rate: number }[];
  countries: { iso3: string; name: string }[];
  isMobile: boolean;
}) {
  const top = useMemo(() => {
    const byCountry = new Map<string, number>();
    // Pick the row for the active year, fall back to the latest prior year.
    const rowsByYear = new Map<number, { iso3: string; rate: number }[]>();
    for (const r of rows) {
      const arr = rowsByYear.get(r.year) || [];
      arr.push({ iso3: r.iso3, rate: r.rate });
      rowsByYear.set(r.year, arr);
    }
    const years = Array.from(rowsByYear.keys()).sort((a, b) => b - a);
    const pickRows = rowsByYear.get(year) || (years.find((y) => y < year) != null ? rowsByYear.get(years.find((y) => y < year)!) || [] : []);
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
      <span className="ln-eyebrow">Country comparison · {disease?.name ?? "—"}</span>
      <h3 style={{ fontSize: 16, margin: "4px 0 14px", fontWeight: 500 }}>
        Top 10 incidence (per 100k)
      </h3>
      {top.length === 0 ? (
        <div style={{ padding: 20, fontSize: 12, color: "var(--ln-ink-3)" }}>
          No country comparison available for this disease.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {top.map((row) => (
            <div
              key={row.iso3}
              style={{
                display: "grid",
                gridTemplateColumns: "140px 1fr 60px",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: "var(--ln-ink-2)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={row.name}
              >
                {row.name}
              </span>
              <div style={{ height: 12, background: "rgba(255,255,255,0.04)", position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: `${(row.rate / max) * 100}%`,
                    background: "var(--ln-warn)",
                    opacity: 0.75,
                  }}
                />
              </div>
              <span className="ln-num" style={{ fontSize: 12, textAlign: "right" }}>
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
// Country table — incidence + live risk chip
// ─────────────────────────────────────────────────────────────────
function CountryTable({
  disease,
  year,
  incidenceRows,
  countries,
  liveRiskByCountry,
  isTabletDown,
}: {
  disease: GbdCause | null;
  year: number;
  incidenceRows: { iso3: string; year: number; rate: number }[];
  countries: { iso3: string; name: string; who_region: string | null; population: number | null }[];
  liveRiskByCountry: Map<string, "low" | "medium" | "high" | "critical">;
  isTabletDown: boolean;
}) {
  const rows = useMemo(() => {
    // Map: iso3 → most recent incidence at or before active year.
    const latestByIso = new Map<string, { year: number; rate: number }>();
    for (const r of incidenceRows) {
      if (r.year > year) continue;
      const prev = latestByIso.get(r.iso3);
      if (!prev || r.year > prev.year) latestByIso.set(r.iso3, r);
    }
    return countries
      .map((c) => ({
        ...c,
        incidence: latestByIso.get(c.iso3)?.rate ?? null,
        incidenceYear: latestByIso.get(c.iso3)?.year ?? null,
      }))
      .filter((c) => c.incidence != null)
      .sort((a, b) => (b.incidence! - a.incidence!))
      .slice(0, 25);
  }, [incidenceRows, year, countries]);

  if (!disease || rows.length === 0) {
    return (
      <div style={{ padding: 20, fontSize: 12, color: "var(--ln-ink-3)" }}>
        No country-level WHO incidence series for this disease yet.
      </div>
    );
  }

  const cols = isTabletDown
    ? "50px 1fr 70px 70px"
    : "50px 1.4fr 1fr 90px 90px 90px";

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
          <span style={{ textAlign: "right" }}>INC</span>
          <span style={{ textAlign: "right" }}>YEAR</span>
        </div>
        {rows.map((r, i) => {
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
                {r.incidence!.toFixed(1)}
              </span>
              <span className="ln-num" style={{ fontSize: 11, textAlign: "right", color: "var(--ln-ink-4)" }}>
                {r.incidenceYear}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
