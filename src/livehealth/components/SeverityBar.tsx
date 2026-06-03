import { severityColor } from "../lib/utils";
import { T } from "./T";

export function SeverityBar({ s }: { s: number }) {
  return (
    <div style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{
            width: 4,
            height: 10,
            background: i <= s ? severityColor(s) : "var(--ln-line-2)",
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}

export function RiskPill({ value }: { value: number }) {
  const lvl = value >= 0.75 ? "is-crit" : value >= 0.55 ? "is-warn" : value >= 0.35 ? "is-info" : "is-ok";
  return <span className={`ln-chip ${lvl}`}><T>RISK</T> {(value * 10).toFixed(1)}</span>;
}
