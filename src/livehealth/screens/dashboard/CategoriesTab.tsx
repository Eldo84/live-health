import { useMemo } from "react";
import { T } from "../../components/T";
import { useT } from "../../lib/useT";
import { PaneHead } from "../../components/PaneHead";
import { useOutbreakCategoriesLive } from "../../data/useOutbreakCategoriesLive";
import { useLiveOutbreaks } from "../../data/useLiveOutbreaks";
import type { TimeRange } from "../../lib/timeRange";

interface Props {
  range: TimeRange;
  isMobile: boolean;
  isTabletDown: boolean;
}

export function CategoriesTab({ range, isMobile, isTabletDown }: Props) {
  const { categories, matchesCategory } = useOutbreakCategoriesLive();
  const { outbreaks } = useLiveOutbreaks(range, 600);
  const tRecentEvents = useT("Recent events by category");
  const tRosterLast = useT("Roster · last");
  const tSeverityMatrix = useT("Severity matrix");
  const tCategoriesBySeverity = useT("Categories × severity");

  // Augment each category with live counts and a severity bucket.
  const augmented = useMemo(() => {
    return categories.slice(0, 8).map((c) => {
      const matched = outbreaks.filter((o) => matchesCategory(o.diseaseId, c.id));
      const cases = matched.reduce((a, o) => a + o.cases, 0) || matched.length;
      const hiCrit = matched.filter((o) => o.severity >= 4).length;
      const ratio = matched.length ? hiCrit / matched.length : 0;
      const severity = ratio >= 0.5 ? "High" : ratio >= 0.2 ? "Medium" : "Low";
      const low = matched.filter((o) => o.severity <= 2).length;
      const med = matched.filter((o) => o.severity === 3).length;
      const high = matched.filter((o) => o.severity >= 4).length;
      return { ...c, count: matched.length, cases, severity, low, med, high, matched };
    });
  }, [categories, outbreaks, matchesCategory]);

  const total = augmented.reduce((a, c) => a + c.cases, 0);
  const top = augmented[0]?.cases || 1;
  const gridCols = isMobile ? "1fr 1fr" : isTabletDown ? "repeat(3, 1fr)" : "repeat(4, 1fr)";

  return (
    <>
      <div style={{ padding: isMobile ? "16px 14px 12px" : "22px 22px 14px", borderBottom: "1px solid var(--ln-line)" }}>
        <span className="ln-eyebrow"><T>Outbreak categories</T></span>
        <h2
          className="ln-display"
          style={{
            fontSize: isMobile ? 22 : 30,
            margin: "6px 0 0",
            letterSpacing: "-0.02em",
          }}
        >
          <T>What's</T>{" "}
          <span style={{ fontStyle: "italic", color: "var(--ln-ink-3)" }}><T>circulating, by family.</T></span>
        </h2>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: gridCols,
          borderBottom: "1px solid var(--ln-line)",
        }}
      >
        {augmented.map((c, i, arr) => (
          <div
            key={c.id}
            style={{
              padding: "18px 18px 16px",
              borderRight: "1px solid var(--ln-line)",
              borderBottom: i < arr.length - (isMobile ? 2 : isTabletDown ? 3 : 4) ? "1px solid var(--ln-line)" : "none",
              position: "relative",
              cursor: "pointer",
              transition: "background .15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ln-surface-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: c.color }} />
            <span
              className="ln-eyebrow"
              style={{
                display: "block",
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
              style={{
                fontSize: isMobile ? 22 : 30,
                marginTop: 8,
                fontWeight: 500,
                letterSpacing: "-0.03em",
              }}
            >
              {c.cases.toLocaleString()}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <span
                style={{
                  fontSize: 11,
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
              <span style={{ fontFamily: "var(--ln-font-mono)", fontSize: 11, color: "var(--ln-ink-4)" }}>
                {total ? ((c.cases / total) * 100).toFixed(1) : "0.0"}%
              </span>
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.04)", marginTop: 8 }}>
              <div
                style={{ height: "100%", width: `${(c.cases / top) * 100}%`, background: c.color, opacity: 0.7 }}
              />
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isTabletDown ? "1fr" : "1.4fr 1fr",
          borderBottom: "1px solid var(--ln-line)",
        }}
      >
        <div
          style={{
            borderRight: isTabletDown ? "none" : "1px solid var(--ln-line)",
            borderBottom: isTabletDown ? "1px solid var(--ln-line)" : "none",
          }}
        >
          <PaneHead eyebrow={tRecentEvents} title={`${tRosterLast} ${range}`} />
          <div style={{ padding: isMobile ? "8px 14px 16px" : "8px 22px 16px" }}>
            {augmented.slice(0, 6).map((c) => (
              <div key={c.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--ln-line)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ width: 10, height: 10, background: c.color, borderRadius: 2 }} />
                  <span style={{ fontSize: 13.5, fontWeight: 500 }}>{c.label}</span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontFamily: "var(--ln-font-mono)",
                      fontSize: 11,
                      color: "var(--ln-ink-3)",
                    }}
                  >
                    {c.count} {c.count === 1 ? <T>event</T> : <T>events</T>}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {c.matched.slice(0, 5).map((o) => (
                    <span key={o.id} className="ln-chip">
                      {o.city || o.country}
                      {o.country && o.city && `, ${o.country}`}
                    </span>
                  ))}
                  {c.matched.length === 0 && (
                    <span style={{ fontSize: 11, color: "var(--ln-ink-4)" }}><T>No active events</T></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <PaneHead eyebrow={tSeverityMatrix} title={tCategoriesBySeverity} />
          <div style={{ padding: isMobile ? "12px 14px" : "16px 22px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--ln-line-2)" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "6px 0",
                      fontFamily: "var(--ln-font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      color: "var(--ln-ink-4)",
                      fontWeight: 400,
                    }}
                  >
                    <T>CATEGORY</T>
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "6px 0",
                      fontFamily: "var(--ln-font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      color: "var(--ln-ink-4)",
                      fontWeight: 400,
                    }}
                  >
                    <T>LOW</T>
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "6px 0",
                      fontFamily: "var(--ln-font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      color: "var(--ln-ink-4)",
                      fontWeight: 400,
                    }}
                  >
                    <T>MED</T>
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "6px 0",
                      fontFamily: "var(--ln-font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      color: "var(--ln-ink-4)",
                      fontWeight: 400,
                    }}
                  >
                    <T>HIGH</T>
                  </th>
                </tr>
              </thead>
              <tbody>
                {augmented.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid var(--ln-line)" }}>
                    <td style={{ padding: "8px 0" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 7, height: 7, background: c.color, borderRadius: 1 }} />
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 160,
                          }}
                          title={c.label}
                        >
                          {c.label}
                        </span>
                      </span>
                    </td>
                    <td className="ln-num" style={{ padding: "8px 0", textAlign: "right", color: "var(--ln-ink-3)" }}>
                      {c.low}
                    </td>
                    <td className="ln-num" style={{ padding: "8px 0", textAlign: "right", color: "var(--ln-warn)" }}>
                      {c.med}
                    </td>
                    <td className="ln-num" style={{ padding: "8px 0", textAlign: "right", color: "var(--ln-crit)" }}>
                      {c.high}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
