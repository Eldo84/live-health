import { useMemo, useState, type ReactNode } from "react";
import { TopBar } from "../../livehealth/screens/SurveillanceMap";
import { useBreakpoint } from "../../livehealth/lib/useBreakpoint";
import { useZambiaData, computeScope } from "../data/useZambiaData";
import { GeoMap, type Basemap } from "../components/GeoMap";
import { FilterBar } from "../components/FilterBar";
import { AIPredictions, ActionsPanel, NotificationAnalytics } from "../components/ZambiaPanels";
import { computePlacePies, buildCaseMarkers } from "../data/mapData";
import { computeZambiaPredictions } from "../data/zambiaPredictions";
import { PROVINCE_BY_ID, DISTRICT_BY_ID } from "../data/geo";
import { DISEASES } from "../data/diseases";
import type { PlaceCount, Scope } from "../data/types";

const ACCENT = "#4ee0c4";
const pct = (x: number) => `${x >= 0 ? "+" : ""}${Math.round(x * 100)}%`;

export function ZambiaDashboardScreen() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTabletDown = bp !== "desktop";

  const data = useZambiaData();
  const [scope, setScope] = useState<Scope>({ level: "national" });
  const [disease, setDisease] = useState<string | null>(null);
  const [satellite, setSatellite] = useState(false);

  const scopedCases = useMemo(
    () => (disease ? data.cases.filter((c) => c.icd10 === disease) : data.cases),
    [disease, data],
  );
  const viewAll = useMemo(() => computeScope(data.cases, data.alerts, scope), [data, scope]);
  const view = useMemo(() => computeScope(scopedCases, data.alerts, scope), [scopedCases, data.alerts, scope]);
  const provinceView = useMemo(() => computeScope(scopedCases, data.alerts, { level: "national" }), [scopedCases, data.alerts]);
  const provinceCounts = useMemo(
    () => Object.fromEntries(provinceView.places.map((p) => [p.name, p.cases])),
    [provinceView],
  );

  // Breadcrumb pieces.
  const prov = scope.provinceId ? PROVINCE_BY_ID[scope.provinceId] : undefined;
  const dist = scope.districtId ? DISTRICT_BY_ID[scope.districtId] : undefined;

  // Map overlays.
  const pies = useMemo(() => computePlacePies(scopedCases, scope), [scopedCases, scope]);
  const districtCases = useMemo(() => {
    if (scope.level !== "district" || !dist) return [];
    return scopedCases.filter(
      (c) =>
        c.district === dist.name &&
        c.province === prov?.name &&
        (!scope.localityName || c.neighborhood === scope.localityName),
    );
  }, [scope, scopedCases, dist, prov]);
  const caseMarkers = useMemo(
    () => (scope.level === "district" && scope.districtId ? buildCaseMarkers(districtCases, scope.districtId) : []),
    [districtCases, scope],
  );

  const predictions = useMemo(() => computeZambiaPredictions(view, pies), [view, pies]);

  const k = view.kpis;
  // National = pure choropleth (no tiles, hides Africa). Drilled-in = a real
  // basemap like the main app map: street by default at district zoom, with a
  // satellite toggle.
  const effectiveBasemap: Basemap =
    scope.level === "national" ? "none" : satellite ? "satellite" : scope.level === "district" ? "street" : "none";

  // Drill helpers (kept in sync with the FilterBar).
  const drill = (p: PlaceCount) => {
    if (p.level === "province") setScope({ level: "province", provinceId: p.id });
    else if (p.level === "district") setScope({ level: "district", provinceId: scope.provinceId, districtId: p.id });
    else if (p.level === "locality") setScope({ level: "district", provinceId: scope.provinceId, districtId: scope.districtId, localityName: p.name });
  };
  const drillProvinceByName = (name: string) => {
    const p = data.geo.provinces.find((x) => x.name === name);
    if (p) setScope({ level: "province", provinceId: p.id });
  };

  const placeSectionTitle =
    view.childLevel === "province" ? "By province" : view.childLevel === "district" ? "By district" : "By area";
  const contextLine =
    scope.level === "national"
      ? `${data.geo.provinces.length} provinces · ${data.geo.districts.length} districts · ${data.geo.localities.length} localities`
      : scope.level === "province"
        ? `Capital: ${prov?.capital} · ${data.geo.districts.filter((d) => d.provinceId === prov?.id).length} districts`
        : `${view.kpis.totalCases.toLocaleString()} cases · ${dist?.name} district`;

  // ── Map column (toolbar + map + legend) ──
  const mapMode =
    scope.level === "national" ? "Provinces — choropleth + disease pies"
    : scope.level === "province" ? "Districts — disease pies"
    : "Individual cases — pan, zoom & click for detail";
  const mapNode = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px", borderBottom: "1px solid var(--ln-line)", background: "var(--ln-topbar)" }}>
        <span className="ln-eyebrow">{mapMode}</span>
        <div style={{ display: "flex", border: "1px solid var(--ln-line-2)", borderRadius: 6, opacity: scope.level === "national" ? 0.4 : 1 }}>
          {([false, true] as const).map((sat, i) => (
            <button
              key={String(sat)}
              disabled={scope.level === "national"}
              onClick={() => setSatellite(sat)}
              style={{
                padding: "5px 11px", fontSize: 11, fontFamily: "var(--ln-font-mono)",
                background: satellite === sat ? "var(--ln-surface-3)" : "transparent",
                color: satellite === sat ? "var(--ln-ink)" : "var(--ln-ink-3)",
                border: "none", cursor: scope.level === "national" ? "default" : "pointer",
                borderRight: i === 0 ? "1px solid var(--ln-line-2)" : "none",
              }}
            >
              {sat ? "Satellite" : "Map"}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <GeoMap
          level={scope.level}
          provinceCounts={provinceCounts}
          activeProvince={prov?.name ?? null}
          placePoints={view.places}
          pies={pies}
          caseMarkers={caseMarkers}
          basemap={effectiveBasemap}
          center={view.center}
          zoom={view.zoom}
          onSelectPlace={drill}
          onSelectProvinceName={drillProvinceByName}
        />
      </div>
      {/* Disease legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", padding: "8px 12px", borderTop: "1px solid var(--ln-line)", background: "var(--ln-topbar)" }}>
        {DISEASES.slice(0, 8).map((d) => (
          <span key={d.icd10} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "var(--ln-ink-3)", fontFamily: "var(--ln-font-mono)" }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: d.color }} />
            {d.name}
          </span>
        ))}
      </div>
    </div>
  );

  // ── Right column (data panels) ──
  const panelsNode = (
    <>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 1, background: "var(--ln-line)" }}>
        <Kpi label="Total Cases" value={k.totalCases.toLocaleString()} sub={disease ? "filtered" : "this week"} accent={ACCENT} />
        <Kpi label="Lab Confirmed" value={k.labConfirmed.toLocaleString()} sub={`${Math.round(k.labConfirmedPct * 1000) / 10}% of cases`} accent="#6ab7ff" />
        <Kpi label="Active Alerts" value={String(k.activeAlerts)} sub="in scope" accent="#ffb547" tone="warn" />
        <Kpi label="24h Change" value={pct(k.change24hPct)} sub="day-over-day" accent={k.change24hPct >= 0 ? "#ff4a5c" : "#4eb7bd"} tone={k.change24hPct >= 0 ? "crit" : undefined} />
      </div>

      {/* Disease surveillance */}
      <Section title="Disease surveillance" eyebrow="What" note={disease ? "Filtering whole view + map" : "Click a disease to cross-filter the map + panels"}>
        <Donut slices={viewAll.byDisease.slice(0, 8).map((d) => ({ label: d.disease, value: d.cases, color: d.color }))} />
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 12 }}>
          {viewAll.byDisease.map((d) => {
            const max = viewAll.byDisease[0]?.cases || 1;
            const active = disease === d.icd10;
            return (
              <button key={d.icd10} onClick={() => setDisease(active ? null : d.icd10)} style={{ display: "grid", gridTemplateColumns: "120px 1fr 72px", alignItems: "center", gap: 10, padding: "4px 6px", borderRadius: 6, cursor: "pointer", background: active ? "rgba(78,224,196,0.10)" : "transparent", border: active ? "1px solid rgba(78,224,196,0.4)" : "1px solid transparent", textAlign: "left" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ln-ink)" }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: d.color, flex: "0 0 auto" }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.disease}</span>
                </span>
                <span style={{ height: 8, background: "var(--ln-surface-2)", borderRadius: 4, overflow: "hidden" }}>
                  <span style={{ display: "block", height: "100%", width: `${(d.cases / max) * 100}%`, background: d.color }} />
                </span>
                <span className="ln-num" style={{ fontSize: 12, color: "var(--ln-ink-2)", textAlign: "right" }}>{d.cases} · {Math.round(d.share * 100)}%</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Ranked places (drill) */}
      <Section title={placeSectionTitle} eyebrow="Where" note={view.childLevel !== "locality" ? "Click to drill in" : undefined}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 2 }}>
          {view.places.slice(0, 14).map((n) => {
            const max = view.places[0]?.cases || 1;
            const clickable = n.level !== "locality" || true;
            return (
              <button key={n.id} onClick={() => clickable && drill(n)} style={{ display: "grid", gridTemplateColumns: "130px 1fr 42px", alignItems: "center", gap: 10, padding: "4px 4px", background: "transparent", border: "none", borderRadius: 5, cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 12.5, color: "var(--ln-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.name}</span>
                <span style={{ height: 9, background: "var(--ln-surface-2)", borderRadius: 4, overflow: "hidden" }}>
                  <span style={{ display: "block", height: "100%", width: `${(n.cases / max) * 100}%`, background: ACCENT }} />
                </span>
                <span className="ln-num" style={{ fontSize: 12, color: "var(--ln-ink-2)", textAlign: "right" }}>{n.cases}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Demographics */}
      <Section title="Who" eyebrow="Demographics">
        <div className="ln-eyebrow" style={{ marginBottom: 8 }}>By age group</div>
        {view.byAgeBand.map((a) => {
          const max = Math.max(1, ...view.byAgeBand.map((x) => x.cases));
          return (
            <div key={a.band} style={{ display: "grid", gridTemplateColumns: "52px 1fr 40px", alignItems: "center", gap: 10, padding: "3px 0" }}>
              <span className="ln-num" style={{ fontSize: 12, color: "var(--ln-ink-3)" }}>{a.band}</span>
              <span style={{ height: 11, background: "var(--ln-surface-2)", borderRadius: 4, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${(a.cases / max) * 100}%`, background: "#6ab7ff" }} /></span>
              <span className="ln-num" style={{ fontSize: 12, color: "var(--ln-ink-2)", textAlign: "right" }}>{a.cases}</span>
            </div>
          );
        })}
        <div className="ln-eyebrow" style={{ margin: "12px 0 8px" }}>By sex</div>
        {view.bySex.map((s) => {
          const total = view.bySex.reduce((acc, x) => acc + x.cases, 0) || 1;
          const label = s.sex === "F" ? "Female" : s.sex === "M" ? "Male" : "Other";
          const color = s.sex === "F" ? "#ff8b97" : s.sex === "M" ? "#6ab7ff" : "#b07cff";
          return (
            <div key={s.sex} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ln-ink-2)", marginBottom: 3 }}>
                <span>{label}</span><span className="ln-num">{s.cases} · {Math.round((s.cases / total) * 100)}%</span>
              </div>
              <span style={{ display: "block", height: 11, background: "var(--ln-surface-2)", borderRadius: 4, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${(s.cases / total) * 100}%`, background: color }} /></span>
            </div>
          );
        })}
      </Section>

      {/* Trend */}
      <Section title="Daily reported cases" eyebrow="When">
        <Trend points={view.byDay} />
      </Section>

      {/* AI predictions */}
      <AIPredictions pred={predictions} />

      {/* Actions */}
      <ActionsPanel scope={scope} />

      {/* Notification analytics */}
      <NotificationAnalytics view={view} />

      {/* Alerts */}
      <Section title={`Active alerts (${view.alerts.length})`} eyebrow="Response">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {view.alerts.length === 0 && <div style={{ fontSize: 12, color: "var(--ln-ink-4)", fontFamily: "var(--ln-font-mono)" }}>No active alerts in this scope.</div>}
          {view.alerts.map((a, i) => (
            <div key={i} style={{ border: "1px solid var(--ln-line-2)", borderLeft: `3px solid ${a.level === "alert" ? "#ff4a5c" : "#ffb547"}`, borderRadius: 6, padding: "8px 10px", background: "var(--ln-surface)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12.5, color: "var(--ln-ink)" }}>
                  <span style={{ color: a.level === "alert" ? "#ff8b97" : "#ffc97a" }}>{a.level === "alert" ? "🚨" : "⚠️"} {a.neighborhood}</span> — {a.trigger}
                </span>
                <span className="ln-num" style={{ fontSize: 11, color: "var(--ln-ink-4)", flex: "0 0 auto" }}>{a.date.slice(5)}</span>
              </div>
              <div style={{ fontSize: 10.5, color: "var(--ln-ink-4)", marginTop: 2, fontFamily: "var(--ln-font-mono)" }}>{a.district}, {a.province}</div>
              <div style={{ fontSize: 11.5, color: "var(--ln-ink-3)", marginTop: 3 }}>→ {a.action}</div>
            </div>
          ))}
        </div>
      </Section>

      <div style={{ padding: "16px 18px 40px", color: "var(--ln-ink-4)", fontSize: 11, fontFamily: "var(--ln-font-mono)", lineHeight: 1.6 }}>
        {data.cases.length.toLocaleString()} synthetic anonymized records across all 10 provinces (Lusaka pinned to the
        spec's 847). Map + panels recompute live as you drill or filter. Sections marked <span style={{ color: "#c9a0ff" }}>◆ Illustrative</span> (AI predictions, notification analytics) use demo heuristics, not live ML / messaging. Real feed swaps in via <span style={{ color: "var(--ln-ink-2)" }}>useZambiaData()</span>.
      </div>
    </>
  );

  return (
    <div className="ln-app" style={{ width: "100%", height: "100vh", background: "var(--ln-bg)", color: "var(--ln-ink)", display: "grid", gridTemplateRows: "52px auto 1fr", overflow: "hidden" }}>
      <TopBar active="zambia" />

      {/* Header: breadcrumb + title + filter bar */}
      <div style={{ padding: isMobile ? "12px 14px" : "12px 20px", borderBottom: "1px solid var(--ln-line)", display: "flex", flexDirection: isTabletDown ? "column" : "row", alignItems: isTabletDown ? "flex-start" : "center", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
            <Crumb label="Zambia" onClick={() => setScope({ level: "national" })} active={scope.level === "national"} />
            {prov && (<><span style={{ color: "var(--ln-ink-4)" }}>/</span><Crumb label={prov.name} onClick={() => setScope({ level: "province", provinceId: prov.id })} active={scope.level === "province" && !scope.localityName} /></>)}
            {dist && (<><span style={{ color: "var(--ln-ink-4)" }}>/</span><Crumb label={dist.name} onClick={() => setScope({ level: "district", provinceId: scope.provinceId, districtId: dist.id })} active={scope.level === "district" && !scope.localityName} /></>)}
            {scope.localityName && (<><span style={{ color: "var(--ln-ink-4)" }}>/</span><Crumb label={scope.localityName} onClick={() => {}} active /></>)}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <h1 className="ln-display" style={{ fontSize: isMobile ? 20 : 26, lineHeight: 1, margin: 0 }}>{view.title}</h1>
            <span style={{ fontSize: 11.5, color: "var(--ln-ink-3)", fontFamily: "var(--ln-font-mono)" }}>{contextLine}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <FilterBar geo={data.geo} scope={scope} onChange={setScope} />
          <span className="ln-chip is-warn" style={{ fontSize: 10 }}>● Demo</span>
          {disease && <button className="ln-btn" onClick={() => setDisease(null)} style={{ fontSize: 11, padding: "5px 9px" }}>✕ {viewAll.byDisease.find((d) => d.icd10 === disease)?.disease}</button>}
        </div>
      </div>

      {/* Body: split-screen on desktop, stacked on tablet/mobile */}
      {isTabletDown ? (
        <div className="ln-pane" style={{ overflowY: "auto" }}>
          <div style={{ height: 380, borderBottom: "1px solid var(--ln-line)" }}>{mapNode}</div>
          {panelsNode}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", overflow: "hidden" }}>
          <div style={{ borderRight: "1px solid var(--ln-line)", height: "100%", minHeight: 0 }}>{mapNode}</div>
          <div className="ln-pane" style={{ overflowY: "auto", height: "100%" }}>{panelsNode}</div>
        </div>
      )}
    </div>
  );
}

// ── Small building blocks ────────────────────────────────────────────────────
function Crumb({ label, onClick, active }: { label: string; onClick: () => void; active: boolean }) {
  return (
    <button onClick={onClick} disabled={active} style={{ background: "none", border: "none", padding: 0, cursor: active ? "default" : "pointer", fontFamily: "var(--ln-font-mono)", fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: active ? "var(--ln-brand)" : "var(--ln-ink-3)" }}>
      {label}
    </button>
  );
}

function Kpi({ label, value, sub, accent, tone }: { label: string; value: string; sub: string; accent: string; tone?: "warn" | "crit" }) {
  const subColor = tone === "crit" ? "var(--ln-crit)" : tone === "warn" ? "var(--ln-warn)" : "var(--ln-ink-3)";
  return (
    <div style={{ background: "var(--ln-surface)", padding: "12px 14px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: accent }} />
      <div className="ln-eyebrow">{label}</div>
      <div className="ln-num" style={{ fontSize: 24, color: "var(--ln-ink)", fontWeight: 500, marginTop: 3 }}>{value}</div>
      <div style={{ fontSize: 10.5, color: subColor, fontFamily: "var(--ln-font-mono)", marginTop: 1 }}>{sub}</div>
    </div>
  );
}

function Section({ title, eyebrow, note, children }: { title: string; eyebrow: string; note?: string; children: ReactNode }) {
  return (
    <section style={{ borderBottom: "1px solid var(--ln-line)", padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <span className="ln-eyebrow">{eyebrow}</span>
        <span style={{ fontSize: 15, color: "var(--ln-ink)", fontWeight: 500 }}>{title}</span>
        {note && <span style={{ fontSize: 11, color: "var(--ln-ink-4)", fontFamily: "var(--ln-font-mono)" }}>{note}</span>}
      </div>
      {children}
    </section>
  );
}

function Donut({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const size = 150;
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
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      {arcs}
      <circle cx={cx} cy={cx} r={inner} fill="var(--ln-surface)" />
      <text x={cx} y={cx - 4} textAnchor="middle" fill="var(--ln-ink)" fontSize={22} fontFamily="var(--ln-font-mono)" fontWeight={600}>{total.toLocaleString()}</text>
      <text x={cx} y={cx + 14} textAnchor="middle" fill="var(--ln-ink-4)" fontSize={9} fontFamily="var(--ln-font-mono)" letterSpacing={1}>CASES</text>
    </svg>
  );
}

function Trend({ points }: { points: { label: string; cases: number }[] }) {
  const w = 460;
  const h = 140;
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
          <text x={x(i)} y={h - 3} textAnchor="middle" fill="var(--ln-ink-4)" fontSize={9.5} fontFamily="var(--ln-font-mono)">{p.label}</text>
          <text x={x(i)} y={y(p.cases) - 7} textAnchor="middle" fill="var(--ln-ink-3)" fontSize={9.5} fontFamily="var(--ln-font-mono)">{p.cases}</text>
        </g>
      ))}
    </svg>
  );
}
