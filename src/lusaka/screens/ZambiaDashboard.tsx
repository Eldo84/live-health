import { useMemo, useState, type ReactNode } from "react";
import { TopBar } from "../../livehealth/screens/SurveillanceMap";
import { useBreakpoint } from "../../livehealth/lib/useBreakpoint";
import { useZambiaData, computeScope } from "../data/useZambiaData";
import { GeoMap } from "../components/GeoMap";
import { PROVINCE_BY_ID, DISTRICT_BY_ID } from "../data/geo";
import type { PlaceCount, Scope } from "../data/types";

const ACCENT = "#4ee0c4";
const pct = (x: number) => `${x >= 0 ? "+" : ""}${Math.round(x * 100)}%`;

export function ZambiaDashboardScreen() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTabletDown = bp !== "desktop";

  const data = useZambiaData();
  const [scope, setScope] = useState<Scope>({ level: "national" });
  const [disease, setDisease] = useState<string | null>(null); // icd10 filter
  const [geoView, setGeoView] = useState<"bars" | "map">("map");

  // Disease filter composes with scope. `viewAll` (no disease filter) drives the
  // disease list/donut so you can always pick; `view` (filtered) drives every
  // other panel; `provinceView` gives province totals for the choropleth even
  // when drilled in. All computed live from case rows — exactly as on the real
  // feed.
  const scopedCases = useMemo(
    () => (disease ? data.cases.filter((c) => c.icd10 === disease) : data.cases),
    [disease, data],
  );
  const viewAll = useMemo(() => computeScope(data.cases, data.alerts, scope), [data, scope]);
  const view = useMemo(() => computeScope(scopedCases, data.alerts, scope), [scopedCases, data.alerts, scope]);
  const provinceView = useMemo(
    () => computeScope(scopedCases, data.alerts, { level: "national" }),
    [scopedCases, data.alerts],
  );
  const provinceCounts = useMemo(
    () => Object.fromEntries(provinceView.places.map((p) => [p.name, p.cases])),
    [provinceView],
  );

  const k = view.kpis;
  const kpiCols = isMobile ? "1fr 1fr" : "repeat(4, 1fr)";
  const sectionPad = isMobile ? "14px 14px" : "18px 22px";

  // Drill into a clicked place (province → district → stop at locality).
  const drill = (p: PlaceCount) => {
    if (p.level === "province") setScope({ level: "province", provinceId: p.id });
    else if (p.level === "district")
      setScope({ level: "district", provinceId: scope.provinceId, districtId: p.id });
  };
  // Drill from a province polygon (the map passes the province name).
  const drillProvinceByName = (name: string) => {
    const p = data.geo.provinces.find((x) => x.name === name);
    if (p) setScope({ level: "province", provinceId: p.id });
  };

  // Breadcrumb pieces.
  const prov = scope.provinceId ? PROVINCE_BY_ID[scope.provinceId] : undefined;
  const dist = scope.districtId ? DISTRICT_BY_ID[scope.districtId] : undefined;

  // Header context line.
  const nDistInProv = prov
    ? data.geo.districts.filter((d) => d.provinceId === prov.id).length
    : 0;
  const contextLine =
    scope.level === "national"
      ? `${data.geo.provinces.length} provinces · ${data.geo.districts.length} districts · ${data.geo.localities.length} localities`
      : scope.level === "province"
        ? `Capital: ${prov?.capital} · ${nDistInProv} districts`
        : `${view.places.length} ${view.childLabel} · ${dist?.name} district`;

  const placeSectionTitle =
    view.childLevel === "province" ? "By province" : view.childLevel === "district" ? "By district" : "By area";

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
      <TopBar active="zambia" />

      <div className="ln-pane ln-no-scroll-x" style={{ overflowY: "auto" }}>
        {/* ── Header + breadcrumb ── */}
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "flex-start" : "flex-end",
            justifyContent: "space-between",
            gap: 12,
            padding: isMobile ? "16px 14px 12px" : "20px 22px 14px",
            borderBottom: "1px solid var(--ln-line)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
              <Crumb label="Zambia" onClick={() => setScope({ level: "national" })} active={scope.level === "national"} />
              {prov && (
                <>
                  <span style={{ color: "var(--ln-ink-4)" }}>/</span>
                  <Crumb
                    label={prov.name}
                    onClick={() => setScope({ level: "province", provinceId: prov.id })}
                    active={scope.level === "province"}
                  />
                </>
              )}
              {dist && (
                <>
                  <span style={{ color: "var(--ln-ink-4)" }}>/</span>
                  <Crumb label={dist.name} onClick={() => {}} active />
                </>
              )}
            </div>
            <h1 className="ln-display" style={{ fontSize: isMobile ? 24 : 34, lineHeight: 1.05, margin: "2px 0 0" }}>
              {view.title}
              <span style={{ color: "var(--ln-ink-4)" }}>,</span>{" "}
              <span style={{ color: "var(--ln-ink-3)", fontStyle: "italic" }}>this week</span>
            </h1>
            <div style={{ fontSize: 12, color: "var(--ln-ink-3)", marginTop: 6, fontFamily: "var(--ln-font-mono)" }}>
              Week of Jun 1–7, 2026 · {contextLine}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className="ln-chip is-warn">● Demo data — synthetic</span>
            {scope.level !== "national" && (
              <button className="ln-btn" onClick={() => setScope({ level: "national" })}>
                ↑ Back to Zambia
              </button>
            )}
            {disease && (
              <button className="ln-btn" onClick={() => setDisease(null)}>
                ✕ Clear disease
              </button>
            )}
          </div>
        </div>

        {/* ── KPI row ── */}
        <div style={{ display: "grid", gridTemplateColumns: kpiCols, gap: 1, background: "var(--ln-line)" }}>
          <Kpi label="Total Cases" value={k.totalCases.toLocaleString()} sub={disease ? "filtered" : "this week"} accent={ACCENT} />
          <Kpi
            label="Lab Confirmed"
            value={k.labConfirmed.toLocaleString()}
            sub={`${Math.round(k.labConfirmedPct * 1000) / 10}% of cases`}
            accent="#6ab7ff"
          />
          <Kpi label="Active Alerts" value={String(k.activeAlerts)} sub="in scope" accent="#ffb547" tone="warn" />
          <Kpi
            label="24h Change"
            value={pct(k.change24hPct)}
            sub="day-over-day"
            accent={k.change24hPct >= 0 ? "#ff4a5c" : "#4eb7bd"}
            tone={k.change24hPct >= 0 ? "crit" : undefined}
          />
        </div>

        {/* ── Diseases: donut + ranked clickable list ── */}
        <Section
          title="Disease surveillance"
          eyebrow="What — by ICD-10"
          pad={sectionPad}
          note={disease ? "Filtering whole view by this disease" : "Click a disease to filter the whole view"}
        >
          <div style={{ display: "grid", gridTemplateColumns: isTabletDown ? "1fr" : "200px 1fr", gap: 22, alignItems: "center" }}>
            <Donut slices={viewAll.byDisease.slice(0, 8).map((d) => ({ label: d.disease, value: d.cases, color: d.color }))} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {viewAll.byDisease.map((d) => {
                const max = viewAll.byDisease[0]?.cases || 1;
                const active = disease === d.icd10;
                return (
                  <button
                    key={d.icd10}
                    onClick={() => setDisease(active ? null : d.icd10)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "132px 1fr 76px",
                      alignItems: "center",
                      gap: 10,
                      padding: "5px 8px",
                      borderRadius: 6,
                      cursor: "pointer",
                      background: active ? "rgba(78,224,196,0.10)" : "transparent",
                      border: active ? "1px solid rgba(78,224,196,0.4)" : "1px solid transparent",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ln-ink)" }}>
                      <span style={{ width: 9, height: 9, borderRadius: 2, background: d.color, flex: "0 0 auto" }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.disease}</span>
                    </span>
                    <span style={{ height: 8, background: "var(--ln-surface-2)", borderRadius: 4, overflow: "hidden" }}>
                      <span style={{ display: "block", height: "100%", width: `${(d.cases / max) * 100}%`, background: d.color }} />
                    </span>
                    <span className="ln-num" style={{ fontSize: 12.5, color: "var(--ln-ink-2)", textAlign: "right" }}>
                      {d.cases} · {Math.round(d.share * 100)}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        {/* ── Places: bars ↔ map toggle, drill-down ── */}
        <Section
          title={placeSectionTitle}
          eyebrow="Where"
          pad={sectionPad}
          note={view.childLevel !== "locality" ? "Click a place (bar or map) to drill in" : "Approximate centroids (representative)"}
          right={
            <div style={{ display: "flex", border: "1px solid var(--ln-line-2)", borderRadius: 6 }}>
              {(["bars", "map"] as const).map((v, i) => (
                <button
                  key={v}
                  onClick={() => setGeoView(v)}
                  style={{
                    padding: "6px 14px",
                    fontSize: 12,
                    background: geoView === v ? "var(--ln-surface-3)" : "transparent",
                    color: geoView === v ? "var(--ln-ink)" : "var(--ln-ink-3)",
                    border: "none",
                    cursor: "pointer",
                    borderRight: i === 0 ? "1px solid var(--ln-line-2)" : "none",
                    fontFamily: "var(--ln-font-mono)",
                    textTransform: "capitalize",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          }
        >
          {geoView === "map" ? (
            <div>
              <div style={{ height: isMobile ? 380 : 500, border: "1px solid var(--ln-line)", borderRadius: 8, overflow: "hidden" }}>
                <GeoMap
                  level={scope.level}
                  provinceCounts={provinceCounts}
                  activeProvince={prov?.name ?? null}
                  circlePlaces={scope.level === "national" ? [] : view.places}
                  center={view.center}
                  zoom={view.zoom}
                  onSelectProvince={drillProvinceByName}
                  onSelectCircle={drill}
                />
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--ln-ink-4)", fontFamily: "var(--ln-font-mono)" }}>
                {scope.level === "national"
                  ? "Provinces shaded by case load — hover for the border, click to drill in. Real boundaries (geoBoundaries ADM1)."
                  : "Province outline is real; district/locality points use approximate representative centroids."}
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isTabletDown ? "1fr" : "1fr 1fr", gap: "4px 28px" }}>
              {view.places.slice(0, 20).map((n) => {
                const max = view.places[0]?.cases || 1;
                const clickable = n.level !== "locality";
                return (
                  <button
                    key={n.id}
                    onClick={() => clickable && drill(n)}
                    disabled={!clickable}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "128px 1fr 42px",
                      alignItems: "center",
                      gap: 10,
                      padding: "4px 4px",
                      background: "transparent",
                      border: "none",
                      borderRadius: 5,
                      cursor: clickable ? "pointer" : "default",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 13, color: clickable ? "var(--ln-ink)" : "var(--ln-ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {n.name}
                    </span>
                    <span style={{ height: 9, background: "var(--ln-surface-2)", borderRadius: 4, overflow: "hidden" }}>
                      <span style={{ display: "block", height: "100%", width: `${(n.cases / max) * 100}%`, background: ACCENT }} />
                    </span>
                    <span className="ln-num" style={{ fontSize: 12.5, color: "var(--ln-ink-2)", textAlign: "right" }}>
                      {n.cases}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Section>

        {/* ── Age + Sex ── */}
        <Section title="Who" eyebrow="Demographics" pad={sectionPad}>
          <div style={{ display: "grid", gridTemplateColumns: isTabletDown ? "1fr" : "1.4fr 1fr", gap: 28 }}>
            <div>
              <div className="ln-eyebrow" style={{ marginBottom: 10 }}>Cases by age group</div>
              {view.byAgeBand.map((a) => {
                const max = Math.max(1, ...view.byAgeBand.map((x) => x.cases));
                return (
                  <div key={a.band} style={{ display: "grid", gridTemplateColumns: "56px 1fr 44px", alignItems: "center", gap: 10, padding: "4px 0" }}>
                    <span className="ln-num" style={{ fontSize: 12.5, color: "var(--ln-ink-3)" }}>{a.band}</span>
                    <span style={{ height: 12, background: "var(--ln-surface-2)", borderRadius: 4, overflow: "hidden" }}>
                      <span style={{ display: "block", height: "100%", width: `${(a.cases / max) * 100}%`, background: "#6ab7ff" }} />
                    </span>
                    <span className="ln-num" style={{ fontSize: 12.5, color: "var(--ln-ink-2)", textAlign: "right" }}>{a.cases}</span>
                  </div>
                );
              })}
            </div>
            <div>
              <div className="ln-eyebrow" style={{ marginBottom: 10 }}>Cases by sex</div>
              {view.bySex.map((s) => {
                const total = view.bySex.reduce((acc, x) => acc + x.cases, 0) || 1;
                const label = s.sex === "F" ? "Female" : s.sex === "M" ? "Male" : "Other";
                const color = s.sex === "F" ? "#ff8b97" : s.sex === "M" ? "#6ab7ff" : "#b07cff";
                return (
                  <div key={s.sex} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--ln-ink-2)", marginBottom: 4 }}>
                      <span>{label}</span>
                      <span className="ln-num">{s.cases} · {Math.round((s.cases / total) * 100)}%</span>
                    </div>
                    <span style={{ display: "block", height: 12, background: "var(--ln-surface-2)", borderRadius: 4, overflow: "hidden" }}>
                      <span style={{ display: "block", height: "100%", width: `${(s.cases / total) * 100}%`, background: color }} />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>

        {/* ── Daily trend + alerts ── */}
        <Section title="This week" eyebrow="When & response" pad={sectionPad}>
          <div style={{ display: "grid", gridTemplateColumns: isTabletDown ? "1fr" : "1.3fr 1fr", gap: 28 }}>
            <div>
              <div className="ln-eyebrow" style={{ marginBottom: 10 }}>Daily reported cases</div>
              <Trend points={view.byDay} />
            </div>
            <div>
              <div className="ln-eyebrow" style={{ marginBottom: 10 }}>Active alerts ({view.alerts.length})</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {view.alerts.length === 0 && (
                  <div style={{ fontSize: 12.5, color: "var(--ln-ink-4)", fontFamily: "var(--ln-font-mono)" }}>
                    No active alerts in this scope.
                  </div>
                )}
                {view.alerts.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      border: "1px solid var(--ln-line-2)",
                      borderLeft: `3px solid ${a.level === "alert" ? "#ff4a5c" : "#ffb547"}`,
                      borderRadius: 6,
                      padding: "8px 10px",
                      background: "var(--ln-surface)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, color: "var(--ln-ink)" }}>
                        <span style={{ color: a.level === "alert" ? "#ff8b97" : "#ffc97a" }}>
                          {a.level === "alert" ? "🚨" : "⚠️"} {a.neighborhood}
                        </span>
                        {" — "}
                        {a.trigger}
                      </span>
                      <span className="ln-num" style={{ fontSize: 11, color: "var(--ln-ink-4)", flex: "0 0 auto" }}>
                        {a.date.slice(5)}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ln-ink-4)", marginTop: 2, fontFamily: "var(--ln-font-mono)" }}>
                      {a.district}, {a.province}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--ln-ink-3)", marginTop: 3 }}>→ {a.action}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── Footer note: the swap story ── */}
        <div style={{ padding: isMobile ? "14px" : "16px 22px 40px", color: "var(--ln-ink-4)", fontSize: 11.5, fontFamily: "var(--ln-font-mono)", lineHeight: 1.6 }}>
          Demo dataset — {data.cases.length.toLocaleString()} synthetic anonymized records (no patient names) across all
          10 provinces. Lusaka district carries the exact 847-case spec breakdown; the rest is generated to plausible
          distributions. Every panel is computed live from these records and re-scopes as you drill in. When the Zambian
          team provides a real feed, only <span style={{ color: "var(--ln-ink-2)" }}>useZambiaData()</span> changes —
          the dashboard stays identical.
        </div>
      </div>
    </div>
  );
}

// ── Small building blocks ──────────────────────────────────────────────────

function Crumb({ label, onClick, active }: { label: string; onClick: () => void; active: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={active}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        cursor: active ? "default" : "pointer",
        fontFamily: "var(--ln-font-mono)",
        fontSize: 11,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: active ? "var(--ln-brand)" : "var(--ln-ink-3)",
      }}
    >
      {label}
    </button>
  );
}

function Kpi({ label, value, sub, accent, tone }: { label: string; value: string; sub: string; accent: string; tone?: "warn" | "crit" }) {
  const subColor = tone === "crit" ? "var(--ln-crit)" : tone === "warn" ? "var(--ln-warn)" : "var(--ln-ink-3)";
  return (
    <div style={{ background: "var(--ln-surface)", padding: "14px 16px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: accent }} />
      <div className="ln-eyebrow">{label}</div>
      <div className="ln-num" style={{ fontSize: 28, color: "var(--ln-ink)", fontWeight: 500, marginTop: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: subColor, fontFamily: "var(--ln-font-mono)", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function Section({ title, eyebrow, right, note, pad, children }: { title: string; eyebrow: string; right?: ReactNode; note?: string; pad: string; children: ReactNode }) {
  return (
    <section style={{ borderBottom: "1px solid var(--ln-line)", padding: pad }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <span className="ln-eyebrow">{eyebrow}</span>
          <span style={{ fontSize: 16, color: "var(--ln-ink)", fontWeight: 500 }}>{title}</span>
          {note && <span style={{ fontSize: 11.5, color: "var(--ln-ink-4)", fontFamily: "var(--ln-font-mono)" }}>{note}</span>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Donut({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const size = 180;
  const cx = size / 2;
  const r = size / 2 - 6;
  const inner = r * 0.58;
  let a0 = -Math.PI / 2;
  const arcs = slices.map((s, i) => {
    const frac = s.value / total;
    const a1 = a0 + frac * Math.PI * 2;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cx + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cx + r * Math.sin(a1);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cx} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
    a0 = a1;
    return <path key={i} d={d} fill={s.color} opacity={0.9} />;
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", margin: "0 auto" }}>
      {arcs}
      <circle cx={cx} cy={cx} r={inner} fill="var(--ln-surface)" />
      <text x={cx} y={cx - 6} textAnchor="middle" fill="var(--ln-ink)" fontSize={24} fontFamily="var(--ln-font-mono)" fontWeight={600}>
        {total.toLocaleString()}
      </text>
      <text x={cx} y={cx + 14} textAnchor="middle" fill="var(--ln-ink-4)" fontSize={10} fontFamily="var(--ln-font-mono)" letterSpacing={1}>
        CASES
      </text>
    </svg>
  );
}

function Trend({ points }: { points: { label: string; cases: number }[] }) {
  const w = 460;
  const h = 150;
  const padX = 8;
  const padY = 16;
  const max = Math.max(1, ...points.map((p) => p.cases));
  const min = Math.min(...points.map((p) => p.cases), 0);
  const n = points.length;
  const x = (i: number) => padX + (i / Math.max(1, n - 1)) * (w - padX * 2);
  const y = (v: number) => padY + (1 - (v - min) / Math.max(1, max - min)) * (h - padY * 2);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.cases).toFixed(1)}`).join(" ");
  const area = `${line} L ${x(n - 1).toFixed(1)} ${h - padY} L ${x(0).toFixed(1)} ${h - padY} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <path d={area} fill={ACCENT} opacity={0.12} />
      <path d={line} fill="none" stroke={ACCENT} strokeWidth={2} />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.cases)} r={3} fill={ACCENT} />
          <text x={x(i)} y={h - 4} textAnchor="middle" fill="var(--ln-ink-4)" fontSize={10} fontFamily="var(--ln-font-mono)">
            {p.label}
          </text>
          <text x={x(i)} y={y(p.cases) - 8} textAnchor="middle" fill="var(--ln-ink-3)" fontSize={10} fontFamily="var(--ln-font-mono)">
            {p.cases}
          </text>
        </g>
      ))}
    </svg>
  );
}
