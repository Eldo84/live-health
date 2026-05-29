import { useMemo } from "react";
import { WorldMap } from "../../components/WorldMap";
import { useLiveRegionRisk } from "../../data/useLiveRegionRisk";
import { useLiveOutbreaks } from "../../data/useLiveOutbreaks";

const ACCENT = "#4ee0c4";

interface Props {
  isMobile: boolean;
  isTabletDown: boolean;
}

// Dashboard "Regional Risk" tab: just the live choropleth + global avg, with
// a link to the standalone /global-health-index for sub-indices and rankings.
export function HealthIndexTab({ isMobile, isTabletDown: _isTabletDown }: Props) {
  void _isTabletDown;
  const { regionRisk } = useLiveRegionRisk("30d");
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

  // Global preparedness + delta vs baseline derived from regional risk.
  const { avg, yoyDelta } = useMemo(() => {
    const values = Object.values(regionRisk);
    if (!values.length) return { avg: 0, yoyDelta: 0 };
    const avgRisk = values.reduce((a, b) => a + b, 0) / values.length;
    const ghi = Math.max(0, Math.min(10, 10 * (1 - avgRisk)));
    return { avg: ghi, yoyDelta: ghi - 6.5 };
  }, [regionRisk]);

  return (
    <>
      <div style={{ padding: isMobile ? "16px 14px 12px" : "22px 22px 14px", borderBottom: "1px solid var(--ln-line)" }}>
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
            <span className="ln-eyebrow">Regional Risk</span>
            <h2
              className="ln-display"
              style={{
                fontSize: isMobile ? 22 : 30,
                margin: "6px 0 0",
                letterSpacing: "-0.02em",
              }}
            >
              Where the world is{" "}
              <span style={{ fontStyle: "italic", color: "var(--ln-ink-3)" }}>under pressure.</span>
            </h2>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
            <div>
              <div className="ln-eyebrow">Global preparedness</div>
              <div className="ln-num" style={{ fontSize: 30, color: ACCENT }}>
                {avg.toFixed(1)}{" "}
                <span style={{ fontSize: 12, color: "var(--ln-ink-3)" }}>/ 10</span>
              </div>
            </div>
            <div>
              <div className="ln-eyebrow">Δ vs baseline</div>
              <div
                className="ln-num"
                style={{
                  fontSize: 18,
                  color: yoyDelta < 0 ? "var(--ln-crit)" : "var(--ln-brand)",
                }}
              >
                {yoyDelta >= 0 ? "+" : "−"}
                {Math.abs(yoyDelta).toFixed(1)}
              </div>
            </div>
            <a
              href="/global-health-index"
              style={{
                color: ACCENT,
                fontFamily: "var(--ln-font-mono)",
                fontSize: 11,
                textDecoration: "none",
                letterSpacing: "0.06em",
              }}
            >
              FULL GHI →
            </a>
          </div>
        </div>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          padding: isMobile ? 14 : 22,
          height: isMobile ? 280 : 360,
          borderBottom: "1px solid var(--ln-line)",
          overflow: "hidden",
        }}
      >
        <WorldMap
          width={isMobile ? 380 : 720}
          height={isMobile ? 240 : 316}
          outbreaks={mapOutbreaks}
          regionRisk={regionRisk}
          showChoropleth
          pulse
          dotSpacing={10}
        />
      </div>

      <div
        style={{
          padding: isMobile ? "14px 14px 18px" : "18px 22px 22px",
          fontSize: 13,
          color: "var(--ln-ink-3)",
          lineHeight: 1.55,
        }}
      >
        Continent fills reflect outbreak severity in the active window; pulsing dots mark
        high-severity events. For per-country GHI, sub-indices and the full ranking table, open{" "}
        <a
          href="/global-health-index"
          style={{
            color: ACCENT,
            textDecoration: "none",
            fontFamily: "var(--ln-font-mono)",
            fontSize: 12,
          }}
        >
          /global-health-index
        </a>
        .
      </div>
    </>
  );
}
