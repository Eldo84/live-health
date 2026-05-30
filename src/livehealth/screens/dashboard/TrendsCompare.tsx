import { useMemo, useRef, useState } from "react";
import { Icon } from "../../components/Icon";
import { useGoogleTrends, TRACKED_DISEASES } from "../../../lib/useGoogleTrends";
import { useGoogleTrendsRegions, type RegionPopularityData } from "../../../lib/useGoogleTrendsRegions";

// Search-interest comparison — ports the original Disease Tracking feature:
// pick up to 5 diseases, compare Google-Trends interest over time. Themed in
// the LiveHealth+ command-center style with a hand-rolled multi-series SVG.

const SERIES_COLORS = ["#4ee0c4", "#6ab7ff", "#ff8b6b", "#ffb547", "#b07cff"];

type CompareRange = "7d" | "30d" | "90d" | "all";
const RANGE_DAYS: Record<CompareRange, number> = { "7d": 7, "30d": 30, "90d": 90, all: 9999 };

interface Props {
  isMobile: boolean;
}

export function TrendsCompare({ isMobile }: Props) {
  const [selected, setSelected] = useState<string[]>(["covid", "influenza", "measles"]);
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<CompareRange>("30d");
  // Tab switcher — mirrors the old Disease Tracking: over-time vs by-region.
  const [activeTab, setActiveTab] = useState<"time" | "region">("time");

  const { trends, loading, error } = useGoogleTrends(selected);
  // Region popularity (Interest by region) for the same selection + range.
  const {
    regionData,
    loading: regionsLoading,
    error: regionsError,
  } = useGoogleTrendsRegions(selected, range);

  const filteredDiseases = useMemo(() => {
    if (!search.trim()) return TRACKED_DISEASES as readonly string[];
    return (TRACKED_DISEASES as readonly string[]).filter((d) =>
      d.toLowerCase().includes(search.toLowerCase().trim())
    );
  }, [search]);

  const cutoff = useMemo(() => {
    if (range === "all") return null;
    const d = new Date();
    d.setDate(d.getDate() - RANGE_DAYS[range]);
    return d.toISOString().split("T")[0];
  }, [range]);

  // Build colored, cutoff-filtered datasets keyed to the selection order.
  const datasets = useMemo(() => {
    return selected
      .map((disease, i) => {
        const td = trends.find((t) => t.disease === disease);
        const data = (td?.data || [])
          .filter((p) => !cutoff || p.date >= cutoff)
          .sort((a, b) => a.date.localeCompare(b.date));
        return { disease, color: SERIES_COLORS[i % SERIES_COLORS.length], data };
      })
      .filter((d) => d.data.length > 0);
  }, [selected, trends, cutoff]);

  const toggle = (disease: string) => {
    setSelected((cur) => {
      if (cur.includes(disease)) return cur.filter((d) => d !== disease);
      if (cur.length >= 5) return cur;
      return [...cur, disease];
    });
  };

  return (
    <div style={{ borderBottom: "1px solid var(--ln-line)" }}>
      {/* Section header */}
      <div
        style={{
          padding: isMobile ? "16px 14px 10px" : "22px 22px 12px",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "flex-end",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <span className="ln-eyebrow">Search-interest · Google Trends</span>
          <h2
            className="ln-display"
            style={{
              fontSize: isMobile ? 18 : 30,
              margin: "6px 0 0",
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
            }}
          >
            Compare what the world is{" "}
            <span style={{ fontStyle: "italic", color: "var(--ln-ink-3)" }}>searching for.</span>
          </h2>
        </div>
        {/* Range pills — full-width on mobile, compact on desktop */}
        <div
          style={{
            display: "flex",
            border: "1px solid var(--ln-line-2)",
            borderRadius: 6,
            overflow: "hidden",
            width: isMobile ? "100%" : undefined,
            alignSelf: isMobile ? "stretch" : undefined,
          }}
        >
          {(["7d", "30d", "90d", "all"] as CompareRange[]).map((r, i, arr) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                padding: isMobile ? "6px 0" : "6px 12px",
                fontSize: 11,
                flex: isMobile ? 1 : undefined,
                background: range === r ? "var(--ln-surface-3)" : "transparent",
                color: range === r ? "var(--ln-ink)" : "var(--ln-ink-3)",
                border: "none",
                cursor: "pointer",
                borderRight: i !== arr.length - 1 ? "1px solid var(--ln-line-2)" : "none",
                fontFamily: "var(--ln-font-mono)",
              }}
            >
              {r === "all" ? "All" : r}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column-reverse" : "row",
          borderTop: "1px solid var(--ln-line)",
        }}
      >
        {/* Disease selector */}
        <div
          style={{
            flex: isMobile ? "0 0 auto" : "0 0 280px",
            borderRight: isMobile ? "none" : "1px solid var(--ln-line)",
            borderTop: isMobile ? "1px solid var(--ln-line)" : "none",
            padding: isMobile ? "12px 14px" : "14px 16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span className="ln-eyebrow">Select up to 5</span>
            <span style={{ fontSize: 11, color: "var(--ln-ink-3)", fontFamily: "var(--ln-font-mono)" }}>
              {selected.length}/5
            </span>
          </div>
          <div style={{ position: "relative", marginBottom: 10 }}>
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
              placeholder="Search diseases…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--ln-ink-3)",
                }}
              >
                <Icon.X />
              </button>
            )}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr",
              gap: 2,
              maxHeight: isMobile ? 180 : 260,
              overflowY: "auto",
            }}
            className="ln-pane"
          >
            {filteredDiseases.map((disease) => {
              const isSel = selected.includes(disease);
              const idx = selected.indexOf(disease);
              const color = isSel ? SERIES_COLORS[idx % SERIES_COLORS.length] : "var(--ln-line-3)";
              const disabled = !isSel && selected.length >= 5;
              return (
                <button
                  key={disease}
                  onClick={() => !disabled && toggle(disease)}
                  disabled={disabled}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 8px",
                    background: isSel ? "rgba(255,255,255,0.04)" : "transparent",
                    border: "none",
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.4 : 1,
                    color: "var(--ln-ink)",
                    textAlign: "left",
                    borderRadius: 4,
                  }}
                >
                  <span
                    style={{
                      width: 11,
                      height: 11,
                      borderRadius: 3,
                      border: `1.5px solid ${color}`,
                      background: isSel ? color : "transparent",
                      flex: "0 0 11px",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      textTransform: "capitalize",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={disease}
                  >
                    {disease}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chart */}
        <div style={{ flex: 1, minWidth: 0, padding: isMobile ? "14px 14px" : "16px 22px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {/* Tab switcher — Interest over time | Interest by region */}
            <div style={{ display: "flex", border: "1px solid var(--ln-line-2)", borderRadius: 6, overflow: "hidden" }}>
              {(
                [
                  { id: "time", label: "Interest over time" },
                  { id: "region", label: "Interest by region" },
                ] as { id: "time" | "region"; label: string }[]
              ).map((tb, i) => (
                <button
                  key={tb.id}
                  onClick={() => setActiveTab(tb.id)}
                  style={{
                    padding: "6px 12px",
                    fontSize: 11.5,
                    background: activeTab === tb.id ? "var(--ln-surface-3)" : "transparent",
                    color: activeTab === tb.id ? "var(--ln-ink)" : "var(--ln-ink-3)",
                    border: "none",
                    borderRight: i === 0 ? "1px solid var(--ln-line-2)" : "none",
                    cursor: "pointer",
                    fontFamily: "var(--ln-font-mono)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tb.label}
                </button>
              ))}
            </div>
            {selected.length > 0 && (
              <button
                onClick={() => setSelected([])}
                style={{
                  fontSize: 11,
                  color: "var(--ln-ink-3)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Icon.X /> Clear
              </button>
            )}
          </div>

          {activeTab === "time" && (
            error ? (
            <div style={{ height: isMobile ? 200 : 280, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, textAlign: "center", padding: "0 16px", color: "var(--ln-crit)" }}>
              Error loading trends: {error}
            </div>
          ) : selected.length === 0 ? (
            <div style={{ height: isMobile ? 200 : 280, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, textAlign: "center", padding: "0 16px", color: "var(--ln-ink-3)" }}>
              Select at least one disease to compare.
            </div>
          ) : loading && datasets.length === 0 ? (
            <div style={{ height: isMobile ? 200 : 280, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, textAlign: "center", padding: "0 16px", color: "var(--ln-ink-3)" }}>
              Loading search interest…
            </div>
          ) : datasets.length === 0 ? (
            <div style={{ height: isMobile ? 200 : 280, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, textAlign: "center", padding: "0 16px", color: "var(--ln-ink-3)" }}>
              No trend data in this range.
            </div>
          ) : (
            <>
              <MultiLineChart datasets={datasets} isMobile={isMobile} />
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--ln-line)" }}>
                {datasets.map((d) => {
                  const last = d.data[d.data.length - 1]?.interest_value ?? 0;
                  const peak = Math.max(...d.data.map((p) => p.interest_value));
                  return (
                    <div key={d.disease} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 16, height: 2, background: d.color }} />
                      <span style={{ fontSize: 12, color: "var(--ln-ink-2)", textTransform: "capitalize" }}>
                        {d.disease}
                      </span>
                      <span className="ln-num" style={{ fontSize: 11, color: "var(--ln-ink-3)" }}>
                        now {last} · peak {peak}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
            )
          )}
          {activeTab === "region" && (
            <RegionInterest
              selected={selected}
              regionData={regionData}
              loading={regionsLoading}
              error={regionsError}
              isMobile={isMobile}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function RegionInterest({
  selected,
  regionData,
  loading,
  error,
  isMobile,
}: {
  selected: string[];
  regionData: RegionPopularityData[];
  loading: boolean;
  error: string | null;
  isMobile: boolean;
}) {
  const empty = (msg: string, tone?: "crit") => (
    <div
      style={{
        height: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        textAlign: "center",
        padding: "0 16px",
        color: tone === "crit" ? "var(--ln-crit)" : "var(--ln-ink-3)",
      }}
    >
      {msg}
    </div>
  );

  // Disease cards in selection order, so colors match the chart legend.
  const cards = selected
    .map((disease) => regionData.find((r) => r.disease === disease))
    .filter((rd): rd is RegionPopularityData => !!rd && rd.regions.length > 0);

  return (
    <div>
      <p style={{ fontSize: 12.5, color: "var(--ln-ink-3)", lineHeight: 1.5, margin: "0 0 4px", maxWidth: 680 }}>
        See where your search terms were most popular. Values are on a scale from 0 to 100, where 100 is the
        location with the most popularity as a fraction of total searches.
      </p>

      <div style={{ marginTop: 14 }}>
        {error
          ? empty(`Error loading regions: ${error}`, "crit")
          : selected.length === 0
          ? empty("Select at least one disease to see regional interest.")
          : loading && regionData.length === 0
          ? empty("Loading regional interest…")
          : cards.length === 0
          ? empty("No regional interest data for this selection.")
          : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 14,
              }}
            >
              {cards.map((rd) => {
                const color = SERIES_COLORS[Math.max(0, selected.indexOf(rd.disease)) % SERIES_COLORS.length];
                const top = rd.regions.slice(0, 12);
                return (
                  <div
                    key={rd.disease}
                    style={{ border: "1px solid var(--ln-line)", background: "var(--ln-surface)", padding: "12px 12px 10px" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flex: "0 0 10px" }} />
                      <span style={{ fontSize: 13, fontWeight: 500, textTransform: "capitalize" }}>{rd.disease}</span>
                      <span className="ln-num" style={{ marginLeft: "auto", fontSize: 10, color: "var(--ln-ink-4)" }}>
                        {rd.regions.length} regions
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {top.map((r) => (
                        <div
                          key={`${r.region}-${r.region_code ?? ""}`}
                          style={{ display: "grid", gridTemplateColumns: "1fr 34px", alignItems: "center", gap: 8 }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 11.5,
                                color: "var(--ln-ink-2)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                marginBottom: 3,
                              }}
                              title={r.region}
                            >
                              {r.region}
                            </div>
                            <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                              <div
                                style={{
                                  height: "100%",
                                  width: `${Math.min(100, Math.max(0, r.popularity_score))}%`,
                                  background: color,
                                  opacity: 0.85,
                                  borderRadius: 3,
                                }}
                              />
                            </div>
                          </div>
                          <span className="ln-num" style={{ fontSize: 12, textAlign: "right", color: "var(--ln-ink)" }}>
                            {Math.round(r.popularity_score)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
}

function MultiLineChart({
  datasets,
  isMobile,
}: {
  datasets: Array<{ disease: string; color: string; data: Array<{ date: string; interest_value: number }> }>;
  isMobile?: boolean;
}) {
  // Taller viewBox on mobile so the chart isn't squished to ~120px tall once
  // SVG preserveAspectRatio scales it to the narrow container width.
  const W = isMobile ? 420 : 760;
  const H = isMobile ? 320 : 280;
  const padL = 30;
  const padB = 24;
  const padT = 10;

  // Union of all dates, sorted, mapped to x positions.
  const allDates = useMemo(() => {
    const s = new Set<string>();
    datasets.forEach((d) => d.data.forEach((p) => s.add(p.date)));
    return Array.from(s).sort();
  }, [datasets]);

  const n = allDates.length;
  const xAtIdx = (i: number) => padL + (n <= 1 ? 0 : (i / (n - 1)) * (W - padL - 12));
  const xAt = (dateStr: string) => xAtIdx(allDates.indexOf(dateStr));
  const yAt = (v: number) => padT + (H - padB - padT) - (v / 100) * (H - padB - padT);

  const xLabels = useMemo(() => {
    if (n === 0) return [];
    const idxs = [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1];
    return Array.from(new Set(idxs)).map((i) => ({
      x: xAtIdx(i),
      label: fmtDate(allDates[i]),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDates, n]);

  // Hover state — "index" mode like the old Chart.js tooltip: hovering anywhere
  // snaps to the nearest date and shows every series' value at that date.
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const setHoverFromClientX = (clientX: number) => {
    const el = wrapRef.current;
    if (!el || n === 0) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    const vbX = ((clientX - rect.left) / rect.width) * W; // px → viewBox units
    const frac = (vbX - padL) / Math.max(1, W - padL - 12);
    const i = Math.max(0, Math.min(n - 1, Math.round(frac * (n - 1))));
    setHoverIdx(i);
  };

  const hoverDate = hoverIdx != null ? allDates[hoverIdx] : null;
  const hoverX = hoverIdx != null ? xAtIdx(hoverIdx) : 0;
  // Anchor the tooltip to the hovered points so it hugs the lines and moves
  // with them, rather than sitting at a fixed top corner.
  const hoverPoints =
    hoverDate != null
      ? datasets
          .map((d) => d.data.find((pt) => pt.date === hoverDate))
          .filter((p): p is { date: string; interest_value: number } => !!p)
      : [];
  const anchorY = hoverPoints.length
    ? hoverPoints.reduce((s, p) => s + yAt(p.interest_value), 0) / hoverPoints.length
    : H / 2;
  const leftPct = (hoverX / W) * 100;
  const topPct = Math.max(8, Math.min(78, (anchorY / H) * 100));
  const tipOnRight = leftPct > 55; // flip tooltip to keep it on-screen

  return (
    <div
      ref={wrapRef}
      style={{ position: "relative" }}
      onMouseMove={(e) => setHoverFromClientX(e.clientX)}
      onMouseLeave={() => setHoverIdx(null)}
      onTouchMove={(e) => e.touches[0] && setHoverFromClientX(e.touches[0].clientX)}
      onTouchEnd={() => setHoverIdx(null)}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {/* gridlines + y labels */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={padL} y1={yAt(v)} x2={W - 12} y2={yAt(v)} stroke="var(--ln-line)" strokeDasharray="2 4" />
            <text
              x={padL - 6}
              y={yAt(v) + 3}
              fontSize="10"
              textAnchor="end"
              fill="var(--ln-ink-4)"
              fontFamily="var(--ln-font-mono)"
            >
              {v}
            </text>
          </g>
        ))}
        {/* x labels */}
        {xLabels.map((l, i) => (
          <text
            key={i}
            x={l.x}
            y={H - 6}
            fontSize="10"
            textAnchor="middle"
            fill="var(--ln-ink-4)"
            fontFamily="var(--ln-font-mono)"
          >
            {l.label}
          </text>
        ))}
        {/* series */}
        {datasets.map((d) => {
          const path = d.data
            .map((p, i) => `${i ? "L" : "M"}${xAt(p.date).toFixed(1)} ${yAt(p.interest_value).toFixed(1)}`)
            .join(" ");
          const lastPoint = d.data[d.data.length - 1];
          return (
            <g key={d.disease}>
              <path d={path} fill="none" stroke={d.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              {lastPoint && <circle cx={xAt(lastPoint.date)} cy={yAt(lastPoint.interest_value)} r="3" fill={d.color} />}
            </g>
          );
        })}
        {/* hover guide line + highlighted points */}
        {hoverDate != null && (
          <g>
            <line x1={hoverX} y1={padT} x2={hoverX} y2={H - padB} stroke="var(--ln-ink-4)" strokeDasharray="3 3" />
            {datasets.map((d) => {
              const p = d.data.find((pt) => pt.date === hoverDate);
              if (!p) return null;
              return (
                <circle
                  key={d.disease}
                  cx={hoverX}
                  cy={yAt(p.interest_value)}
                  r="4"
                  fill={d.color}
                  stroke="var(--ln-bg)"
                  strokeWidth="1.5"
                />
              );
            })}
          </g>
        )}
      </svg>

      {/* Tooltip — date header + every series value at that date + scale note. */}
      {hoverDate != null && (
        <div
          style={{
            position: "absolute",
            top: `${topPct}%`,
            left: `${leftPct}%`,
            transform: tipOnRight ? "translate(calc(-100% - 12px), -50%)" : "translate(12px, -50%)",
            background: "var(--ln-elev-bg)",
            border: "1px solid var(--ln-line-3)",
            borderRadius: 6,
            padding: "8px 10px",
            boxShadow: "0 8px 22px rgba(0,0,0,0.5)",
            pointerEvents: "none",
            minWidth: 150,
            maxWidth: 220,
            zIndex: 5,
          }}
        >
          <div
            style={{
              fontFamily: "var(--ln-font-mono)",
              fontSize: 10,
              color: "var(--ln-ink-3)",
              letterSpacing: "0.06em",
              marginBottom: 6,
            }}
          >
            {fmtDateLong(hoverDate)}
          </div>
          {datasets.map((d) => {
            const p = d.data.find((pt) => pt.date === hoverDate);
            return (
              <div key={d.disease} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flex: "0 0 8px" }} />
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--ln-ink-2)",
                    textTransform: "capitalize",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={d.disease}
                >
                  {d.disease}
                </span>
                <span className="ln-num" style={{ fontSize: 12, color: "var(--ln-ink)" }}>
                  {p ? Math.round(p.interest_value) : "—"}
                </span>
              </div>
            );
          })}
          <div
            style={{
              marginTop: 6,
              paddingTop: 5,
              borderTop: "1px solid var(--ln-line)",
              fontSize: 9.5,
              color: "var(--ln-ink-4)",
              lineHeight: 1.35,
            }}
          >
            Search interest, 0–100. 100 = peak popularity for the term in this window.
          </div>
        </div>
      )}
    </div>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDateLong(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
