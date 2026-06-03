// Static UI translation bundles for the LiveHealth+ / OutbreakNow redesign.
//
// Each bundle is a flat map keyed by the *English source string* exactly as it
// is passed to useT("…"). useT resolves a translation synchronously from the
// loaded bundle (no per-string network flash).
//
// Bundles are code-split and loaded on demand: an English visitor downloads
// zero translation bytes, and switching to a language fetches only that one
// bundle (~20-30 KB gzip), cached for the session. The language is applied only
// after its bundle has loaded (see LanguageContext), so there is no flash of
// English when switching.
import type { Language } from "../../contexts/LanguageContext";

type Bundle = Record<string, string>;

const loaders: Record<Exclude<Language, "en">, () => Promise<{ default: Bundle }>> = {
  fr: () => import("./fr.json"),
  es: () => import("./es.json"),
  ar: () => import("./ar.json"),
  de: () => import("./de.json"),
  pt: () => import("./pt.json"),
  it: () => import("./it.json"),
  ru: () => import("./ru.json"),
  ja: () => import("./ja.json"),
  zh: () => import("./zh.json"),
};

const cache: Partial<Record<Language, Bundle>> = {};
const inflight: Partial<Record<Language, Promise<void>>> = {};

/** The already-loaded bundle for `lang`, or undefined if not yet loaded. */
export function getBundle(lang: Language): Bundle | undefined {
  if (lang === "en") return undefined;
  return cache[lang];
}

/** Load (once) the bundle for `lang`. Resolves immediately for English / cached. */
export function ensureBundle(lang: Language): Promise<void> {
  if (lang === "en" || cache[lang]) return Promise.resolve();
  if (!inflight[lang]) {
    inflight[lang] = loaders[lang as Exclude<Language, "en">]()
      .then((m) => {
        cache[lang] = m.default;
      })
      .catch(() => {
        // Leave uncached so a later attempt can retry; useT falls back to English.
        delete inflight[lang];
      });
  }
  return inflight[lang]!;
}

/** Synchronous lookup of a UI string in the loaded bundle for `lang`. */
export function staticLookup(lang: Language, text: string): string | undefined {
  if (lang === "en") return text;
  return cache[lang]?.[text];
}
