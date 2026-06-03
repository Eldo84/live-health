# UI translation pipeline (OutbreakNow redesign)

The redesign (`src/livehealth/`) translates UI text through the `useT("…")` hook and
the `<T>…</T>` component (`src/livehealth/components/T.tsx`). Each visible English
string is looked up, keyed by the **exact English source**, in a per-language bundle
under `src/livehealth/locales/<lang>.json`. Bundles are code-split and loaded on
demand; English ships no translation bytes. Strings missing from a bundle fall back to
the live `translate-article` edge function, then to English.

When you add or change UI text, regenerate the bundles:

```bash
# 1. Extract every useT("…") / <T>…</T> literal (JSX-whitespace normalized) -> i18n_en_strings.json
node tools/i18n_extract.cjs

# 2. Split into chunks for translation (optional; helps when translating in batches)
node tools/i18n_split.cjs 3        # writes tools/chunks/en_1..3.json

# 3. Translate each chunk into tools/parts/<lang>_<n>.json  (object: { "<english>": "<translation>" })
#    Keys MUST stay byte-for-byte identical to the English source.

# 4. Merge parts into src/livehealth/locales/<lang>.json and validate key coverage
node tools/i18n_merge.cjs          # reports any missing / typo'd keys per language
```

`i18n_en_strings.json` is the current master list of UI strings (kept as a snapshot).
Supported languages: fr, es, ar, de, pt, it, ru, ja, zh (English is the source).
