import { useEffect, useState } from "react";
import { timeAgo } from "../lib/utils";
import { translateArticle } from "../../lib/translateArticle";
import { useLanguage, SUPPORTED_LANGUAGES } from "../../contexts/LanguageContext";

export interface TickerAlert {
  id: string;
  ts: number;
  level: "critical" | "high" | "medium" | "low" | "info";
  region: string;
  country: string;
  text: string;
  src?: string;
}

interface AlertTickerProps {
  items: TickerAlert[];
  onSelect?: (a: TickerAlert) => void;
}

type TState = {
  showing: "translated" | "original";
  text?: string;
  loading?: boolean;
  error?: string;
};

export function AlertTicker({ items, onSelect }: AlertTickerProps) {
  const { language } = useLanguage();
  const [rows, setRows] = useState<TickerAlert[]>(items);
  const [flashId, setFlashId] = useState<string | null>(null);
  // Per-alert translation state keyed by `${alertId}::${targetLanguage}` so
  // flipping languages re-translates rather than returning stale text.
  const [translations, setTranslations] = useState<Record<string, TState>>({});
  const tKey = (id: string) => `${id}::${language}`;

  const toggleTranslate = async (a: TickerAlert) => {
    const k = tKey(a.id);
    const cur = translations[k];
    if (cur && cur.text) {
      setTranslations((m) => ({
        ...m,
        [k]: { ...cur, showing: cur.showing === "translated" ? "original" : "translated" },
      }));
      return;
    }
    setTranslations((m) => ({ ...m, [k]: { showing: "translated", loading: true } }));
    try {
      const res = await translateArticle(a.text, undefined, language);
      setTranslations((m) => ({
        ...m,
        [k]: { showing: "translated", text: res.translatedText, loading: false },
      }));
    } catch (e: any) {
      setTranslations((m) => ({
        ...m,
        [k]: { showing: "original", loading: false, error: e?.message || "Translation failed" },
      }));
    }
  };

  // Sync when items prop changes
  useEffect(() => {
    setRows(items);
  }, [items]);

  useEffect(() => {
    const id = setInterval(() => {
      setRows((rs) => {
        if (rs.length < 2) return rs;
        const next = [{ ...rs[rs.length - 1], ts: Date.now() }, ...rs.slice(0, -1)];
        setFlashId(next[0].id);
        setTimeout(() => setFlashId(null), 1800);
        return next;
      });
    }, 6000);
    return () => clearInterval(id);
  }, []);

  const targetName =
    SUPPORTED_LANGUAGES.find((l) => l.code === language)?.nativeName || language.toUpperCase();

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {rows.map((a) => (
        <button
          key={a.id + a.ts}
          onClick={() => onSelect && onSelect(a)}
          style={{
            textAlign: "left",
            padding: "11px 14px",
            borderBottom: "1px solid var(--ln-line)",
            cursor: onSelect ? "pointer" : "default",
            background: a.id === flashId ? "rgba(78,224,196,0.05)" : "transparent",
            transition: "background .5s",
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            animation: a.id === flashId ? "ln-tick-up .35s ease-out" : "none",
          }}
        >
          <span
            style={{
              marginTop: 5,
              width: 8,
              height: 8,
              borderRadius: "50%",
              flex: "0 0 8px",
              background:
                a.level === "critical"
                  ? "var(--ln-crit)"
                  : a.level === "high"
                  ? "#ff7a3b"
                  : a.level === "medium"
                  ? "var(--ln-warn)"
                  : "var(--ln-info)",
              boxShadow: a.level === "critical" ? "0 0 8px var(--ln-crit)" : "none",
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
              <span
                style={{
                  fontFamily: "var(--ln-font-mono)",
                  fontSize: 10,
                  color: "var(--ln-ink-3)",
                  letterSpacing: "0.1em",
                }}
              >
                {a.region} · {a.country.toUpperCase()}
              </span>
              <span style={{ fontFamily: "var(--ln-font-mono)", fontSize: 10, color: "var(--ln-ink-4)" }}>
                {timeAgo(a.ts)} ago
              </span>
            </div>
            {(() => {
              const t = translations[tKey(a.id)];
              const showTranslated = t?.showing === "translated" && t.text;
              return (
                <div style={{ fontSize: 12.5, color: "var(--ln-ink)", lineHeight: 1.35 }}>
                  {showTranslated ? t!.text : a.text}
                </div>
              );
            })()}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 6,
                flexWrap: "wrap",
              }}
            >
              {a.src && (
                <span
                  style={{
                    fontFamily: "var(--ln-font-mono)",
                    fontSize: 10,
                    color: "var(--ln-ink-4)",
                  }}
                >
                  {a.src}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTranslate(a);
                }}
                disabled={translations[tKey(a.id)]?.loading}
                title={
                  translations[tKey(a.id)]?.error ||
                  (translations[tKey(a.id)]?.showing === "translated"
                    ? "Show original"
                    : `Translate to ${targetName}`)
                }
                style={{
                  background: "none",
                  border: "1px solid var(--ln-line-2)",
                  color: "var(--ln-ink-3)",
                  fontFamily: "var(--ln-font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.08em",
                  padding: "3px 8px",
                  borderRadius: 3,
                  cursor: "pointer",
                }}
              >
                🌐{" "}
                {translations[tKey(a.id)]?.loading
                  ? "TRANSLATING…"
                  : translations[tKey(a.id)]?.showing === "translated"
                  ? "ORIGINAL"
                  : "TRANSLATE"}
              </button>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
