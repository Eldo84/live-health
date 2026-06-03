import { useEffect, type ReactNode } from "react";
import { Icon } from "./Icon";
import { useT } from "../lib/useT";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  width?: number | string;
  /** Optional element shown right of the title (e.g. a chip or action). */
  headerRight?: ReactNode;
  children: ReactNode;
}

// Themed modal shell for the LiveHealth+ design system. Renders an overlay +
// bordered panel using the ln-* tokens so dialogs work in both dark and light
// themes. Closes on Escape, click-outside, and the explicit close button.
export function Modal({ open, onClose, title, eyebrow, width = 560, headerRight, children }: ModalProps) {
  const tClose = useT("Close");
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Prevent background scroll while the modal is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: typeof width === "number" ? `${width}px` : width,
          maxHeight: "calc(100vh - 32px)",
          background: "var(--ln-elev-bg)",
          border: "1px solid var(--ln-line-3)",
          boxShadow: "0 28px 60px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            padding: "16px 20px 14px",
            borderBottom: "1px solid var(--ln-line)",
          }}
        >
          <div style={{ minWidth: 0 }}>
            {eyebrow && <span className="ln-eyebrow">{eyebrow}</span>}
            <h2
              className="ln-display"
              style={{ fontSize: 22, lineHeight: 1.1, margin: eyebrow ? "4px 0 0" : 0, letterSpacing: "-0.02em" }}
            >
              {title}
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
            {headerRight}
            <button
              onClick={onClose}
              aria-label={tClose}
              className="ln-btn"
              style={{ width: 28, height: 28, justifyContent: "center", padding: 0 }}
            >
              <Icon.X />
            </button>
          </div>
        </div>
        <div className="ln-pane" style={{ overflowY: "auto", padding: "16px 20px 18px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// Small themed field wrapper used inside the dialogs.
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span className="ln-eyebrow" style={{ display: "block", marginBottom: 6 }}>
        {label}
      </span>
      {children}
      {hint && !error && <div style={{ fontSize: 11, color: "var(--ln-ink-3)", marginTop: 4 }}>{hint}</div>}
      {error && (
        <div style={{ fontSize: 11.5, color: "var(--ln-crit)", marginTop: 4, fontFamily: "var(--ln-font-mono)" }}>
          {error}
        </div>
      )}
    </label>
  );
}
