import { useEffect, useReducer } from "react";
import { useLanguage, type Language } from "../../contexts/LanguageContext";

// Live UI translation via DeepSeek. The redesign's copy isn't keyed in the
// existing locale JSONs, so rather than hand-translating every string we
// translate on demand and cache aggressively. First render after a language
// switch shows the English source; the next render swaps in the translation.
//
// Layers:
//   1. In-memory map shared across all hook consumers (process lifetime)
//   2. localStorage (per-browser, survives reloads)
//   3. translate-article edge function (cold path; populates layers 1 and 2)

const MEMO = new Map<string, string>();
const PENDING = new Map<string, Promise<string>>();
const LS_KEY = "lh_ui_translations_v1";

interface LSCache {
  [langAndText: string]: string;
}

function readLS(): LSCache {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as LSCache;
  } catch {
    return {};
  }
}

function writeLSEntry(key: string, value: string) {
  try {
    const cur = readLS();
    cur[key] = value;
    localStorage.setItem(LS_KEY, JSON.stringify(cur));
  } catch {
    // Storage may be unavailable (private mode, quota) — fall back to in-memory only.
  }
}

function cacheKey(lang: Language, text: string): string {
  return `${lang}::${text}`;
}

async function fetchTranslation(text: string, target: Language): Promise<string> {
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return text;
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/translate-article`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
      },
      body: JSON.stringify({ text, targetLanguage: target }),
    });
    if (!res.ok) return text;
    const data = (await res.json()) as { translatedText?: string };
    return data.translatedText?.trim() || text;
  } catch {
    return text;
  }
}

/**
 * useT — translate a string into the active app language. Returns the English
 * source verbatim when language === "en". On other languages, returns the
 * translation if cached, otherwise returns the source and triggers a
 * translation in the background (component re-renders when it arrives).
 */
export function useT(text: string): string {
  const { language } = useLanguage();
  // Force re-render hook handle; used inside the effect to schedule a re-render.
  const [, bump] = useReducer((n: number) => n + 1, 0);

  if (!text || language === "en") {
    // Bare paths (English active or empty text) — skip everything.
    // We still need to register the effect below as a no-op so React's hook
    // order stays stable across re-renders when the language changes.
  }

  const key = cacheKey(language, text);
  const memo = !text || language === "en" ? null : MEMO.get(key);

  useEffect(() => {
    if (!text || language === "en") return;
    if (MEMO.has(key)) return;
    // Try localStorage first.
    const ls = readLS();
    if (ls[key]) {
      MEMO.set(key, ls[key]);
      bump();
      return;
    }
    // Dedup concurrent requests for the same key.
    let promise = PENDING.get(key);
    if (!promise) {
      promise = fetchTranslation(text, language).then((translated) => {
        MEMO.set(key, translated);
        writeLSEntry(key, translated);
        PENDING.delete(key);
        return translated;
      });
      PENDING.set(key, promise);
    }
    let cancelled = false;
    promise.then(() => {
      if (!cancelled) bump();
    });
    return () => {
      cancelled = true;
    };
  }, [key, text, language]);

  if (!text) return text;
  if (language === "en") return text;
  return memo || text;
}

/**
 * Translate multiple strings together. Useful for components that render a list
 * of labels; returns the same array shape with translated values (or originals
 * during the cold path).
 */
export function useTMany(texts: string[]): string[] {
  // useT for each — fine because the array's length is stable per render.
  return texts.map((t) => useT(t)); // eslint-disable-line react-hooks/rules-of-hooks
}
