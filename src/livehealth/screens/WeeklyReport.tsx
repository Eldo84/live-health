import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { PaneHead } from "../components/PaneHead";
import { TopBar } from "./SurveillanceMap";
import { useWeeklyReports, type DiseaseRecommendation } from "../data/useWeeklyReport";
import { colorForDisease } from "../data/diseaseColors";
import { useBreakpoint } from "../lib/useBreakpoint";

const ACCENT = "#4ee0c4";

// Editorial weekly outbreak report. Renders the latest active weekly report
// from Supabase with prev/next navigation across the recent history.
export function WeeklyReportScreen() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTabletDown = bp !== "desktop";

  const { reports, loading } = useWeeklyReports(12);
  const [idx, setIdx] = useState(0);

  const report = reports[idx];

  const topDisease = report?.diseases[0];
  const maxCases = useMemo(() => (report ? Math.max(1, ...report.diseases.map((d) => d.total_cases)) : 1), [report]);

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

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

      <div className="ln-pane" style={{ overflowY: "auto" }}>
        {/* Hero / masthead */}
        <section
          style={{
            padding: isMobile ? "20px 14px 16px" : "28px 28px 20px",
            borderBottom: "1px solid var(--ln-line)",
            background: "var(--ln-topbar)",
          }}
        >
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
              <Link
                to="/dashboard"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  color: "var(--ln-ink-3)",
                  textDecoration: "none",
                  fontFamily: "var(--ln-font-mono)",
                  letterSpacing: "0.1em",
                }}
              >
                ← BACK TO ANALYTICS
              </Link>
              <span className="ln-eyebrow" style={{ display: "block", marginTop: 12 }}>
                Weekly outbreak report
              </span>
              <h1
                className="ln-display"
                style={{
                  fontSize: isMobile ? 28 : isTabletDown ? 38 : 48,
                  lineHeight: 1,
                  margin: "6px 0 0",
                  letterSpacing: "-0.025em",
                }}
              >
                {report ? (
                  <>
                    The week of{" "}
                    <span style={{ color: ACCENT, fontStyle: "italic" }}>{fmtDate(report.week_start_date)}</span>
                  </>
                ) : loading ? (
                  "Loading…"
                ) : (
                  "No weekly reports yet"
                )}
              </h1>
              {report && (
                <p style={{ fontSize: 13, color: "var(--ln-ink-3)", marginTop: 8 }}>
                  {fmtDate(report.week_start_date)} → {fmtDate(report.week_end_date)} · generated{" "}
                  {new Date(report.generated_at).toLocaleString()}
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button
                className="ln-btn"
                onClick={() => setIdx((i) => Math.min(reports.length - 1, i + 1))}
                disabled={idx >= reports.length - 1}
                title="Older report"
              >
                ←
              </button>
              <span
                className="ln-num"
                style={{ fontSize: 12, color: "var(--ln-ink-3)", minWidth: 50, textAlign: "center" }}
              >
                {reports.length ? `${idx + 1} / ${reports.length}` : "—"}
              </span>
              <button
                className="ln-btn"
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
                disabled={idx <= 0}
                title="Newer report"
              >
                →
              </button>
              <button className="ln-btn" onClick={handlePrint}>
                <Icon.News /> Print
              </button>
            </div>
          </div>
        </section>

        {!report && !loading && (
          <div style={{ padding: 32, fontSize: 13, color: "var(--ln-ink-3)" }}>
            No weekly reports have been generated yet. The weekly cron writes a new report each Friday at
            08:00 UTC.
          </div>
        )}

        {report && (
          <>
            {/* Summary callout */}
            {report.recommendations.summary && (
              <section
                style={{
                  padding: isMobile ? "20px 14px" : "24px 28px",
                  borderBottom: "1px solid var(--ln-line)",
                  background: "var(--ln-surface)",
                }}
              >
                <span className="ln-eyebrow">Editor's note</span>
                <p
                  style={{
                    fontSize: isMobile ? 15 : 17,
                    color: "var(--ln-ink)",
                    lineHeight: 1.55,
                    margin: "8px 0 0",
                    maxWidth: 820,
                  }}
                >
                  {report.recommendations.summary}
                </p>
              </section>
            )}

            {/* Top diseases bar chart */}
            <section
              style={{
                padding: isMobile ? "20px 14px" : "24px 28px",
                borderBottom: "1px solid var(--ln-line)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  marginBottom: 18,
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <span className="ln-eyebrow">Top {report.diseases.length} diseases this week</span>
                  <h2 style={{ fontSize: 22, margin: "4px 0 0", fontWeight: 500 }}>
                    By new case volume
                  </h2>
                </div>
                {topDisease && (
                  <div
                    style={{
                      fontFamily: "var(--ln-font-mono)",
                      fontSize: 12,
                      color: "var(--ln-ink-3)",
                    }}
                  >
                    Leader:{" "}
                    <span style={{ color: ACCENT }}>{topDisease.disease_name}</span> ·{" "}
                    {topDisease.new_cases.toLocaleString()} new
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {report.diseases.map((d, i) => {
                  const color = colorForDisease(d.disease_name);
                  return (
                    <div
                      key={`${d.disease_name}-${i}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile
                          ? "1fr 90px"
                          : "280px 1fr 90px 70px",
                        alignItems: "center",
                        gap: 12,
                        padding: "6px 0",
                        borderBottom: "1px solid var(--ln-line)",
                      }}
                    >
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 10,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={d.disease_name}
                      >
                        <span className="ln-num" style={{ fontSize: 11, color: "var(--ln-ink-4)" }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span style={{ width: 9, height: 9, background: color, borderRadius: 2, flex: "0 0 9px" }} />
                        <span
                          style={{
                            fontSize: 13.5,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {d.disease_name}
                        </span>
                      </div>
                      {!isMobile && (
                        <div style={{ position: "relative", height: 12, background: "rgba(255,255,255,0.04)" }}>
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              width: `${(d.total_cases / maxCases) * 100}%`,
                              background: color,
                              opacity: 0.7,
                            }}
                          />
                        </div>
                      )}
                      <span className="ln-num" style={{ fontSize: 12.5, textAlign: "right" }}>
                        {d.total_cases.toLocaleString()}
                      </span>
                      {!isMobile && (
                        <span
                          className="ln-num"
                          style={{ fontSize: 12, textAlign: "right", color: "var(--ln-crit)" }}
                        >
                          +{d.new_cases}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* General recommendations: 2 columns (users / medical staff) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isTabletDown ? "1fr" : "1fr 1fr",
                borderBottom: "1px solid var(--ln-line)",
              }}
            >
              <RecommendationList
                eyebrow="For the public"
                title="What to do this week"
                items={report.recommendations.userRecommendations || []}
                accent="var(--ln-info)"
                isMobile={isMobile}
              />
              <div
                style={{
                  borderLeft: isTabletDown ? "none" : "1px solid var(--ln-line)",
                  borderTop: isTabletDown ? "1px solid var(--ln-line)" : "none",
                }}
              >
                <RecommendationList
                  eyebrow="For medical staff"
                  title="Operational priorities"
                  items={report.recommendations.medicalPersonnelRecommendations || []}
                  accent="var(--ln-warn)"
                  isMobile={isMobile}
                />
              </div>
            </div>

            {/* Disease-specific recommendations */}
            {report.recommendations.diseaseSpecific && report.recommendations.diseaseSpecific.length > 0 && (
              <section style={{ borderBottom: "1px solid var(--ln-line)" }}>
                <PaneHead
                  eyebrow="Disease deep-dives"
                  title="Specific recommendations by pathogen"
                />
                <div>
                  {report.recommendations.diseaseSpecific.map((rec, i) => (
                    <DiseaseRecRow key={`${rec.disease_name}-${i}`} rec={rec} isMobile={isMobile} />
                  ))}
                </div>
              </section>
            )}

            {/* Footer / methodology */}
            <section
              style={{
                padding: isMobile ? "20px 14px 32px" : "24px 28px 40px",
                background: "var(--ln-surface)",
              }}
            >
              <span className="ln-eyebrow">About this report</span>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--ln-ink-3)",
                  lineHeight: 1.6,
                  marginTop: 8,
                  maxWidth: 820,
                }}
              >
                Generated automatically each Friday at 08:00 UTC from the previous 7 days of outbreak
                signals. Disease counts reflect <em>new</em> signals detected in our pipeline, not
                officially-confirmed case totals. Recommendations are AI-drafted and reviewed by
                LiveHealth+ public health editors before publication.
              </p>
              <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link to="/dashboard" className="ln-btn">
                  <Icon.Chart /> Back to Analytics
                </Link>
                <Link to="/map" className="ln-btn">
                  <Icon.Map /> Open live map
                </Link>
                <Link to="/news" className="ln-btn">
                  <Icon.News /> Today's news
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function RecommendationList({
  eyebrow,
  title,
  items,
  accent,
  isMobile,
}: {
  eyebrow: string;
  title: string;
  items: string[];
  accent: string;
  isMobile: boolean;
}) {
  return (
    <div style={{ padding: isMobile ? "20px 14px" : "24px 28px" }}>
      <span className="ln-eyebrow" style={{ color: accent }}>
        {eyebrow}
      </span>
      <h2 style={{ fontSize: 18, margin: "4px 0 16px", fontWeight: 500 }}>{title}</h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {items.length === 0 ? (
          <li style={{ fontSize: 13, color: "var(--ln-ink-3)" }}>No general recommendations published.</li>
        ) : (
          items.map((it, i) => (
            <li
              key={i}
              style={{ display: "grid", gridTemplateColumns: "20px 1fr", alignItems: "flex-start", gap: 10 }}
            >
              <span
                className="ln-num"
                style={{
                  fontSize: 11,
                  color: accent,
                  fontFamily: "var(--ln-font-mono)",
                  marginTop: 2,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ fontSize: 13.5, color: "var(--ln-ink)", lineHeight: 1.55 }}>{it}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function DiseaseRecRow({
  rec,
  isMobile,
}: {
  rec: DiseaseRecommendation;
  isMobile: boolean;
}) {
  const [open, setOpen] = useState(false);
  const color = colorForDisease(rec.disease_name);
  return (
    <div style={{ borderBottom: "1px solid var(--ln-line)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: isMobile ? "14px 14px" : "16px 28px",
          background: open ? "var(--ln-surface-2)" : "transparent",
          border: "none",
          cursor: "pointer",
          color: "inherit",
          textAlign: "left",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ width: 10, height: 10, background: color, borderRadius: 2, flex: "0 0 10px" }} />
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {rec.disease_name}
          </span>
        </span>
        <span
          style={{
            color: "var(--ln-ink-3)",
            transform: open ? "rotate(180deg)" : "rotate(0)",
            transition: "transform .15s",
          }}
        >
          <Icon.Down />
        </span>
      </button>
      {open && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: isMobile ? 0 : 24,
            padding: isMobile ? "0 14px 18px" : "0 28px 22px",
          }}
        >
          <div>
            <span className="ln-eyebrow" style={{ color: "var(--ln-info)" }}>
              For the public
            </span>
            <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 10 }}>
              {rec.userRecommendations.map((it, i) => (
                <li
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "6px 1fr",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 1,
                      background: "var(--ln-info)",
                      marginTop: 8,
                    }}
                  />
                  <span style={{ fontSize: 13, color: "var(--ln-ink-2)", lineHeight: 1.55 }}>{it}</span>
                </li>
              ))}
            </ul>
          </div>
          <div style={{ marginTop: isMobile ? 16 : 0 }}>
            <span className="ln-eyebrow" style={{ color: "var(--ln-warn)" }}>
              For medical staff
            </span>
            <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 10 }}>
              {rec.medicalPersonnelRecommendations.map((it, i) => (
                <li
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "6px 1fr",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 1,
                      background: "var(--ln-warn)",
                      marginTop: 8,
                    }}
                  />
                  <span style={{ fontSize: 13, color: "var(--ln-ink-2)", lineHeight: 1.55 }}>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
