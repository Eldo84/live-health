/* eslint-disable */
// One-off extractor: collect every literal UI string fed to useT("…") or <T>…</T>
// across the source tree, normalizing JSX whitespace the way React does, so the
// keys we emit match the strings looked up at runtime. Also pulls obvious
// data-literal labels (label/title/sub/eyebrow/l/name) from files that render
// dynamic <T>{var}</T>, since those values are looked up too.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "src");
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules") continue;
      walk(p);
    } else if (/\.(tsx|ts)$/.test(e.name)) {
      files.push(p);
    }
  }
})(ROOT);

const SKIP = new Set([
  path.join(ROOT, "livehealth", "components", "T.tsx"),
  path.join(ROOT, "livehealth", "lib", "useT.ts"),
  path.join(ROOT, "livehealth", "locales", "index.ts"),
]);

const out = new Set();

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

// React JSXText whitespace handling: lines that are only whitespace are removed;
// leading/trailing whitespace introduced by indentation across newlines collapses
// to a single space; text on a single line is preserved as-is.
function normJSX(raw) {
  if (!raw.includes("\n")) return decodeEntities(raw);
  const lines = raw.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  return decodeEntities(lines.join(" "));
}

function unquote(lit) {
  // lit includes surrounding quotes (single or double)
  const q = lit[0];
  const inner = lit.slice(1, -1);
  if (q === '"') {
    try {
      return JSON.parse(lit);
    } catch {
      /* fall through */
    }
  }
  // single-quoted or JSON.parse failed — manual unescape
  return inner.replace(/\\(['"\\nrt])/g, (m, c) => {
    if (c === "n") return "\n";
    if (c === "r") return "\r";
    if (c === "t") return "\t";
    return c;
  });
}

const reUseT = /useT\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*[\),]/g;
const reT = /<T>([\s\S]*?)<\/T>/g;
const reDataLabel =
  /\b(?:label|title|sub|eyebrow|name|desc|body|hint|l)\s*:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g;

function junk(s) {
  const t = s.trim();
  if (!t) return true;
  if (t === "…" || t === "·" || t === "—" || t === "•") return true;
  // pure punctuation / symbols / numbers only
  if (!/[A-Za-z]/.test(t)) return true;
  return false;
}

for (const f of files) {
  if (SKIP.has(f)) continue;
  const c = fs.readFileSync(f, "utf8");
  const hasDynamicT = /<T>\s*\{/.test(c);

  let m;
  while ((m = reUseT.exec(c))) {
    const s = unquote(m[1]);
    if (!junk(s)) out.add(s);
  }
  while ((m = reT.exec(c))) {
    const inner = m[1];
    if (inner.includes("<") || inner.includes("{")) continue; // mixed/dynamic
    const s = normJSX(inner);
    if (!junk(s)) out.add(s);
  }
  if (hasDynamicT) {
    while ((m = reDataLabel.exec(c))) {
      const s = unquote(m[1]);
      if (!junk(s)) out.add(s);
    }
  }
}

const arr = Array.from(out).sort((a, b) => a.localeCompare(b));
const dest = path.resolve(__dirname, "i18n_en_strings.json");
fs.writeFileSync(dest, JSON.stringify(arr, null, 2) + "\n");
console.log("files scanned:", files.length);
console.log("unique strings:", arr.length);
console.log("written to:", dest);
