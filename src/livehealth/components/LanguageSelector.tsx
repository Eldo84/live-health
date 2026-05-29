import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { useLanguage, SUPPORTED_LANGUAGES, type Language } from "../../contexts/LanguageContext";

interface Props {
  /** "icon" = compact square button (headers); "labeled" = icon + current language. */
  variant?: "icon" | "labeled";
}

// Themed language switcher. Shares the same chrome as ThemeToggle / HeaderUser
// so it slots into every header without breaking the editorial aesthetic. Writes
// through to LanguageContext, which persists to localStorage and flips dir="rtl"
// for Arabic.
export function LanguageSelector({ variant = "icon" }: Props) {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const current = SUPPORTED_LANGUAGES.find((l) => l.code === language) ?? SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (code: Language) => {
    setLanguage(code);
    setOpen(false);
  };

  const triggerLabel = `Language: ${current.nativeName}`;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {variant === "labeled" ? (
        <button
          className="ln-btn"
          onClick={() => setOpen((v) => !v)}
          aria-label={triggerLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          title={triggerLabel}
        >
          <Icon.Globe />
          <span style={{ fontSize: 12 }}>{current.code.toUpperCase()}</span>
        </button>
      ) : (
        <button
          className="ln-btn"
          onClick={() => setOpen((v) => !v)}
          aria-label={triggerLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          title={triggerLabel}
          style={{ width: 30, height: 30, justifyContent: "center", padding: 0 }}
        >
          <Icon.Globe />
        </button>
      )}

      {open && (
        <div
          role="listbox"
          aria-label="Select language"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 200,
            background: "var(--ln-elev-bg)",
            border: "1px solid var(--ln-line-2)",
            borderRadius: 6,
            padding: 4,
            zIndex: 1000,
            boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {SUPPORTED_LANGUAGES.map((lang) => {
            const active = lang.code === language;
            return (
              <button
                key={lang.code}
                role="option"
                aria-selected={active}
                onClick={() => pick(lang.code)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  width: "100%",
                  padding: "8px 10px",
                  background: active ? "color-mix(in oklab, var(--ln-brand) 12%, transparent)" : "transparent",
                  border: "none",
                  color: "var(--ln-ink)",
                  fontSize: 13,
                  cursor: "pointer",
                  textAlign: "left",
                  borderRadius: 4,
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = "var(--ln-surface)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", lineHeight: 1.2 }}>{lang.nativeName}</span>
                  <span
                    style={{
                      display: "block",
                      fontFamily: "var(--ln-font-mono)",
                      fontSize: 10,
                      color: "var(--ln-ink-4)",
                      letterSpacing: "0.06em",
                      marginTop: 2,
                    }}
                  >
                    {lang.code.toUpperCase()} · {lang.name}
                  </span>
                </span>
                {active && (
                  <span style={{ color: "var(--ln-brand)", fontSize: 11 }}>●</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
