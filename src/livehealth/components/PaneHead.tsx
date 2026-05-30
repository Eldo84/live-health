import type { ReactNode } from "react";

interface PaneHeadProps {
  title?: string;
  eyebrow?: string;
  right?: ReactNode;
  children?: ReactNode;
}

export function PaneHead({ title, eyebrow, right, children }: PaneHeadProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px 10px",
        borderBottom: "1px solid var(--ln-line)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {eyebrow && <span className="ln-eyebrow" style={{ flex: "0 0 auto" }}>{eyebrow}</span>}
        {title && <span style={{ fontSize: 13, color: "var(--ln-ink)", fontWeight: 500 }}>{title}</span>}
        {children}
      </div>
      {right}
    </div>
  );
}
