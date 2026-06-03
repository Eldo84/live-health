import { useState } from "react";
import { Icon } from "../../components/Icon";
import { useAIPredictions, type AIPrediction } from "../../data/useAIPredictions";
import { useGroundedForecasts, type GroundedForecast } from "../../data/useGroundedForecasts";
import { T } from "../../components/T";
import { useT } from "../../lib/useT";

const ACCENT = "#4ee0c4";

interface Props {
  isMobile: boolean;
  isTabletDown: boolean;
}

type Source = "grounded" | "ai";

const RISK_TONE: Record<string, { chip: string; color: string; label: string }> = {
  critical: { chip: "is-crit", color: "var(--ln-crit)", label: "CRITICAL" },
  high: { chip: "is-warn", color: "var(--ln-warn)", label: "HIGH" },
  medium: { chip: "is-info", color: "var(--ln-info)", label: "MEDIUM" },
  low: { chip: "is-ok", color: "var(--ln-brand)", label: "LOW" },
};

export function PredictionsTab({ isMobile, isTabletDown }: Props) {
  const tForecasts = useT("Forecasts");
  const tAvgConfidence = useT("Avg confidence");
  const tHighCritical = useT("High / critical");
  const tGrounded = useT("Grounded");
  const tGroundedReal = useT("Grounded (real numbers)");
  const tAINarrative = useT("AI narrative");
  const tAINarrativeDeepSeek = useT("AI narrative (DeepSeek)");
  const [source, setSource] = useState<Source>("grounded");
  const grounded = useGroundedForecasts(8);
  const ai = useAIPredictions();

  const loading = source === "grounded" ? grounded.loading : ai.loading;
  const error = source === "grounded" ? grounded.error : ai.error;
  const cards = source === "grounded" ? grounded.forecasts : ai.predictions;

  const avgConfidence = cards.length
    ? Math.round(cards.reduce((a, p) => a + p.confidence, 0) / cards.length)
    : 0;
  const critical = cards.filter((p) => p.riskLevel === "critical" || p.riskLevel === "high").length;

  return (
    <>
      <div style={{ padding: isMobile ? "16px 14px 12px" : "22px 22px 12px", borderBottom: "1px solid var(--ln-line)" }}>
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "flex-end",
            gap: isMobile ? 14 : 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ maxWidth: 660 }}>
            <span className="ln-eyebrow">
              <Icon.Sparkles style={{ verticalAlign: -2, color: ACCENT }} /> <T>AI Predictions</T> ·{" "}
              {source === "grounded" ? <T>grounded forecast</T> : <T>DeepSeek narrative</T>}
            </span>
            <h2
              className="ln-display"
              style={{ fontSize: isMobile ? 22 : 30, margin: "6px 0 8px", letterSpacing: "-0.02em" }}
            >
              <T>The forecast you can</T> <span style={{ fontStyle: "italic", color: "var(--ln-ink-3)" }}><T>defend.</T></span>
            </h2>
            <p style={{ fontSize: 13.5, color: "var(--ln-ink-2)", lineHeight: 1.55, margin: 0 }}>
              {source === "grounded" ? (
                <>
                  <T>Every figure below is</T> <b style={{ color: "var(--ln-ink)" }}><T>computed from real signals</T></b> —{" "}
                  <T>reported case counts, deaths, week-over-week signal momentum and severity over the last 30 days</T>{grounded.meta.signalsAnalyzed ? <> ({grounded.meta.signalsAnalyzed.toLocaleString()} <T>analyzed</T>)</> : null}.{" "}
                  <T>Projections extrapolate the observed growth rate; the working is shown on each card.</T>
                </>
              ) : (
                <>
                  <T>Written by DeepSeek Chat from the top outbreaks by case volume. Reads well, but the specific numbers are</T>{" "}
                  <b style={{ color: "var(--ln-ink)" }}><T>model-estimated, not verified</T></b>{" "}
                  <T>against the database — use the grounded view for figures you need to defend.</T>
                </>
              )}
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <Stat label={tForecasts} value={loading ? "…" : String(cards.length)} />
            <Stat label={tAvgConfidence} value={loading ? "…" : `${avgConfidence}%`} />
            <Stat label={tHighCritical} value={loading ? "…" : String(critical)} tone={critical > 0 ? "crit" : undefined} />
          </div>
        </div>

        {/* Source toggle */}
        <div style={{ display: "flex", gap: 6, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              border: "1px solid var(--ln-line-2)",
              borderRadius: 6,
              overflow: "hidden",
              maxWidth: "100%",
            }}
          >
            {(
              [
                {
                  id: "grounded",
                  label: isMobile ? tGrounded : tGroundedReal,
                },
                {
                  id: "ai",
                  label: isMobile ? tAINarrative : tAINarrativeDeepSeek,
                },
              ] as { id: Source; label: string }[]
            ).map((s, i) => (
              <button
                key={s.id}
                onClick={() => setSource(s.id)}
                style={{
                  padding: isMobile ? "6px 10px" : "6px 12px",
                  fontSize: isMobile ? 11.5 : 12,
                  background: source === s.id ? "var(--ln-surface-3)" : "transparent",
                  color: source === s.id ? "var(--ln-ink)" : "var(--ln-ink-3)",
                  border: "none",
                  cursor: "pointer",
                  borderRight: i === 0 ? "1px solid var(--ln-line-2)" : "none",
                  whiteSpace: "nowrap",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
          {source === "ai" && (
            <button className="ln-btn" onClick={ai.regenerate} disabled={ai.loading}>
              <Icon.Refresh /> {ai.loading ? <T>Working…</T> : <T>Regenerate</T>}
            </button>
          )}
          {source === "grounded" && grounded.meta.generatedAt && !loading && (
            <span
              style={{
                fontFamily: "var(--ln-font-mono)",
                fontSize: 11,
                color: "var(--ln-ink-4)",
                flexBasis: isMobile ? "100%" : "auto",
                minWidth: 0,
              }}
            >
              <T>computed</T> {new Date(grounded.meta.generatedAt).toLocaleTimeString()}
              {!isMobile && (
                <> · {grounded.meta.pairsConsidered} <T>disease–country pairs scanned</T></>
              )}
            </span>
          )}
          {source === "ai" && ai.generatedAt && !loading && !error && (
            <span
              style={{
                fontFamily: "var(--ln-font-mono)",
                fontSize: 11,
                color: "var(--ln-ink-4)",
                flexBasis: isMobile ? "100%" : "auto",
                minWidth: 0,
              }}
            >
              {ai.cached ? <T>cached</T> : <T>fresh</T>} · {ai.generatedAt.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--ln-ink-3)" }}>
          <div
            style={{
              width: 22,
              height: 22,
              border: "2px solid var(--ln-line-3)",
              borderTopColor: ACCENT,
              borderRadius: "50%",
              margin: "0 auto 14px",
              animation: "ln-rotate 0.8s linear infinite",
            }}
          />
          <div style={{ fontSize: 13 }}>
            {source === "grounded" ? <T>Computing forecasts from live signals…</T> : <T>Generating DeepSeek forecasts…</T>}
          </div>
        </div>
      ) : error ? (
        <div style={{ padding: isMobile ? "20px 14px" : "24px 28px" }}>
          <div
            style={{
              display: "flex",
              gap: 12,
              padding: 16,
              border: "1px solid color-mix(in oklab, var(--ln-crit) 35%, transparent)",
              background: "color-mix(in oklab, var(--ln-crit) 8%, transparent)",
            }}
          >
            <Icon.Sparkles style={{ color: "var(--ln-crit)", flex: "0 0 14px", marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ln-ink)" }}><T>Unable to generate forecasts</T></div>
              <p style={{ fontSize: 12.5, color: "var(--ln-ink-2)", lineHeight: 1.5, margin: "6px 0 12px" }}>{error}</p>
              {source === "ai" && (
                <button className="ln-btn" onClick={ai.refresh}>
                  <Icon.Refresh /> <T>Retry</T>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : cards.length === 0 ? (
        <div style={{ padding: 32, fontSize: 13, color: "var(--ln-ink-3)" }}>
          <T>Not enough recent signal momentum to forecast right now.</T>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              borderBottom: "1px solid var(--ln-line)",
            }}
          >
            {cards.map((p, i) => (
              <ForecastCard
                key={`${p.disease}-${p.location}-${i}`}
                p={p}
                grounded={source === "grounded"}
                isMobile={isMobile}
                borderRight={!isMobile && i % 2 === 0}
                borderBottom={
                  isMobile ? i < cards.length - 1 : i < cards.length - (cards.length % 2 === 0 ? 2 : 1)
                }
              />
            ))}
          </div>

          <div style={{ background: "var(--ln-surface)", borderBottom: "1px solid var(--ln-line)", padding: isMobile ? "16px 14px" : "20px 28px" }}>
            <span className="ln-eyebrow"><T>How this is computed</T></span>
            <p style={{ fontSize: 12.5, color: "var(--ln-ink-3)", lineHeight: 1.6, marginTop: 8, maxWidth: 920 }}>
              {source === "grounded" ? (
                <>
                  <b style={{ color: "var(--ln-ink-2)" }}><T>Grounded forecast</T></b>: <T>cases = Σ reported case counts (a lone background-stat outlier is dropped), deaths → CFR, and weekly growth from signal volume (this week vs last). Projection = cases × (1 + growth)</T><sup>weeks</sup>, <T>shown as a −10% / +18% band. Horizon shortens as growth and severity rise. Nothing is invented — the card footer shows the exact inputs.</T>
                </>
              ) : (
                <>
                  <b style={{ color: "var(--ln-ink-2)" }}><T>AI narrative</T></b>: <T>DeepSeek Chat writes prose from the top outbreaks by case volume, cached 24h. It's good for readable framing, but figures may drift from the database (e.g. it can round or estimate). Switch to</T> <b style={{ color: "var(--ln-ink-2)" }}><T>Grounded</T></b>{" "}
                  <T>for verifiable numbers.</T>
                </>
              )}
            </p>
          </div>
        </>
      )}
    </>
  );
}

function ForecastCard({
  p,
  grounded,
  borderRight,
  borderBottom,
  isMobile,
}: {
  p: GroundedForecast | AIPrediction;
  grounded: boolean;
  borderRight: boolean;
  borderBottom: boolean;
  isMobile?: boolean;
}) {
  const tone = RISK_TONE[p.riskLevel] || RISK_TONE.medium;
  const g = grounded ? (p as GroundedForecast) : null;
  return (
    <article
      style={{
        padding: isMobile ? "16px 14px" : "20px 22px",
        borderRight: borderRight ? "1px solid var(--ln-line)" : "none",
        borderBottom: borderBottom ? "1px solid var(--ln-line)" : "none",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: p.color, flex: "0 0 10px" }} />
            <span style={{ fontSize: 15, fontWeight: 500, color: "var(--ln-ink)" }}>{p.disease}</span>
            <span className={`ln-chip ${tone.chip}`} style={{ fontSize: 10 }}>
              <T>{tone.label}</T>
            </span>
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              marginTop: 6,
              fontFamily: "var(--ln-font-mono)",
              fontSize: 10.5,
              color: "var(--ln-ink-3)",
              letterSpacing: "0.06em",
            }}
          >
            <Icon.Globe style={{ width: 12, height: 12 }} /> {p.location.toUpperCase()}
          </div>
        </div>
        <div style={{ textAlign: "right", flex: "0 0 auto" }}>
          <div className="ln-num" style={{ fontSize: 22, fontWeight: 500, color: ACCENT, lineHeight: 1 }}>
            {p.confidence}%
          </div>
          <div className="ln-eyebrow" style={{ fontSize: 9, marginTop: 2 }}>
            <T>confidence</T>
          </div>
        </div>
      </div>

      <div>
        <span className="ln-eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: tone.color }}>
          {typeIcon(p.type)} <T>{p.type}</T>
        </span>
        <p style={{ fontSize: 14, color: "var(--ln-ink)", lineHeight: 1.55, margin: "8px 0 0" }}>{p.prediction}</p>
      </div>

      {/* Grounded "working" — the real inputs behind the forecast */}
      {g && (
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            paddingTop: 4,
          }}
        >
          {g.cases > 0 && <Fact label="cases" value={g.cases.toLocaleString()} />}
          {g.deaths > 0 && <Fact label="deaths" value={g.deaths.toLocaleString()} tone="crit" />}
          {g.cfr !== null && <Fact label="CFR" value={`${g.cfr}%`} />}
          <Fact label="7d/prior" value={`${g.r7}/${g.p7}`} />
          <Fact label="WoW" value={`${g.growthPct > 0 ? "+" : ""}${g.growthPct}%`} tone={g.growthPct > 0 ? "crit" : undefined} />
          <Fact label="high" value={`${Math.round(g.highShare * 100)}%`} />
          {g.projLow !== null && g.projHigh !== null && (
            <Fact label="proj" value={`${g.projLow.toLocaleString()}–${g.projHigh.toLocaleString()}`} tone="accent" />
          )}
        </div>
      )}

      <div style={{ position: "relative", height: 4, background: "rgba(255,255,255,0.05)" }}>
        <div style={{ position: "absolute", inset: 0, width: `${p.confidence}%`, background: tone.color }} />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 10,
          borderTop: "1px solid var(--ln-line)",
          fontFamily: "var(--ln-font-mono)",
          fontSize: 10.5,
        }}
      >
        <span style={{ color: "var(--ln-ink-4)" }}>
          <T>Model:</T>{" "}
          <span style={{ color: "var(--ln-ink-3)" }}>
            {grounded ? "OutbreakNow signal model" : "DeepSeek Chat"}
          </span>
        </span>
        <span style={{ color: ACCENT }}><T>Target:</T> {p.targetDate}</span>
      </div>
    </article>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: "crit" | "accent" }) {
  const color = tone === "crit" ? "var(--ln-crit)" : tone === "accent" ? ACCENT : "var(--ln-ink-2)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 4,
        padding: "3px 7px",
        background: "var(--ln-surface-2)",
        border: "1px solid var(--ln-line)",
        borderRadius: 4,
        fontFamily: "var(--ln-font-mono)",
        fontSize: 10.5,
      }}
    >
      <span style={{ color: "var(--ln-ink-4)", letterSpacing: "0.04em" }}><T>{label}</T></span>
      <span style={{ color }}>{value}</span>
    </span>
  );
}

function typeIcon(type: string) {
  switch (type) {
    case "Case Forecast":
      return <Icon.Chart style={{ width: 12, height: 12 }} />;
    case "Geographic Spread":
      return <Icon.Map style={{ width: 12, height: 12 }} />;
    case "Timeline Projection":
      return <Icon.Pulse style={{ width: 12, height: 12 }} />;
    case "Risk Assessment":
    default:
      return <Icon.Sparkles style={{ width: 12, height: 12 }} />;
  }
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "crit" }) {
  return (
    <div>
      <div className="ln-eyebrow">{label}</div>
      <div
        className="ln-num"
        style={{ fontSize: 22, fontWeight: 500, marginTop: 2, color: tone === "crit" ? "var(--ln-crit)" : "var(--ln-ink)" }}
      >
        {value}
      </div>
    </div>
  );
}
