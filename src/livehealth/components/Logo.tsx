interface LogoProps {
  size?: number;
  color?: string;
}

export function Logo({ size = 14, color = "var(--ln-brand)" }: LogoProps) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--ln-ink)" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: color,
            animation: "ln-pulse-soft 2.4s infinite ease-in-out",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: color,
            opacity: 0.35,
            animation: "ln-pulse 2.4s infinite ease-out",
          }}
        />
      </div>
      <div style={{ fontFamily: "var(--ln-font-mono)", fontSize: 12, letterSpacing: "0.16em", fontWeight: 500 }}>
        <span style={{ color: "var(--ln-ink)" }}>LIVE</span>
        <span style={{ color }}>HEALTH</span>
        <span style={{ color: "var(--ln-ink-3)" }}>/+</span>
      </div>
    </div>
  );
}
