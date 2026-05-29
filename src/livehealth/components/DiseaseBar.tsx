import { Sparkline } from "./Sparkline";

interface DiseaseBarProps {
  label: string;
  color: string;
  cases: number;
  delta: number;
  countries?: number;
  max: number;
  spark?: number[];
  isMobile?: boolean;
}

// Row template constants — kept in sync with the parent leaderboard header so
// columns line up. The compact (mobile) layout drops the sparkline column.
export const LEADERBOARD_COLS_FULL = "128px 1fr 60px 56px 84px";
export const LEADERBOARD_COLS_COMPACT = "90px 1fr 56px 52px";

export function DiseaseBar({ label, color, cases, delta, max, spark, isMobile }: DiseaseBarProps) {
  const pct = Math.min(100, (cases / max) * 100);
  const up = delta >= 0;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? LEADERBOARD_COLS_COMPACT : LEADERBOARD_COLS_FULL,
        alignItems: "center",
        gap: isMobile ? 8 : 12,
        padding: isMobile ? "8px 12px" : "8px 14px",
        borderBottom: "1px solid var(--ln-line)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span style={{ width: 8, height: 8, background: color, borderRadius: 1, flex: "0 0 8px" }} />
        <span
          style={{
            fontSize: isMobile ? 12 : 13,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
          title={label}
        >
          {label}
        </span>
      </div>
      <div style={{ position: "relative", height: 16, background: "rgba(255,255,255,0.04)" }}>
        <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: color, opacity: 0.6 }} />
        <div style={{ position: "absolute", inset: 0, width: `${pct}%`, borderRight: `1px solid ${color}` }} />
      </div>
      <span className="ln-num" style={{ fontSize: isMobile ? 12 : 13, textAlign: "right" }}>
        {cases.toLocaleString()}
      </span>
      <span
        className="ln-num"
        style={{
          fontSize: isMobile ? 11 : 12,
          textAlign: "right",
          color: up ? "var(--ln-crit)" : "var(--ln-brand)",
        }}
      >
        {up ? "+" : ""}
        {delta}%
      </span>
      {!isMobile && (
        <span style={{ textAlign: "right" }}>
          {spark ? <Sparkline data={spark} color={color} width={70} height={18} /> : null}
        </span>
      )}
    </div>
  );
}
