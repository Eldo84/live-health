import { useEffect, useState } from "react";
import { fmtClock } from "../lib/utils";

interface StatusPillProps {
  label?: string;
}

export function StatusPill({ label = "LIVE" }: StatusPillProps) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "var(--ln-font-mono)",
        fontSize: 11,
        color: "var(--ln-ink-2)",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "var(--ln-brand)",
          boxShadow: "0 0 8px var(--ln-brand)",
          animation: "ln-pulse-soft 1.4s infinite",
        }}
      />
      <span style={{ color: "var(--ln-brand)", letterSpacing: "0.14em" }}>{label}</span>
      <span style={{ color: "var(--ln-ink-4)" }}>·</span>
      <span style={{ color: "var(--ln-ink-3)" }}>{fmtClock(now)} UTC</span>
    </div>
  );
}
