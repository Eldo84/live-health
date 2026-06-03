/* eslint-disable */
// Merge per-language chunk parts (tools/parts/<lang>_<n>.json) into the final
// bundle src/livehealth/locales/<lang>.json. Validates against the master
// English key list and reports missing / extra (typo'd) keys per language.
const fs = require("fs");
const path = require("path");

const LANGS = ["fr", "es", "ar", "de", "pt", "it", "ru", "ja", "zh"];
const toolsDir = __dirname;
const partsDir = path.join(toolsDir, "parts");
const localesDir = path.resolve(toolsDir, "..", "src", "livehealth", "locales");

const master = JSON.parse(fs.readFileSync(path.join(toolsDir, "i18n_en_strings.json"), "utf8"));
const masterSet = new Set(master);

let allClean = true;
for (const lang of LANGS) {
  const merged = {};
  let partCount = 0;
  for (let n = 1; n <= 3; n++) {
    const p = path.join(partsDir, `${lang}_${n}.json`);
    if (!fs.existsSync(p)) {
      console.log(`[${lang}] MISSING PART FILE: ${lang}_${n}.json`);
      allClean = false;
      continue;
    }
    let obj;
    try {
      obj = JSON.parse(fs.readFileSync(p, "utf8"));
    } catch (e) {
      console.log(`[${lang}] INVALID JSON in ${lang}_${n}.json: ${e.message}`);
      allClean = false;
      continue;
    }
    partCount++;
    Object.assign(merged, obj);
  }

  const bundleKeys = Object.keys(merged);
  const extra = bundleKeys.filter((k) => !masterSet.has(k));
  const missing = master.filter((k) => !(k in merged));

  // Keep only master keys (drop typo'd extras), preserve master order.
  const clean = {};
  for (const k of master) if (k in merged) clean[k] = merged[k];

  const dest = path.join(localesDir, `${lang}.json`);
  fs.writeFileSync(dest, JSON.stringify(clean, null, 2) + "\n");

  console.log(
    `[${lang}] parts:${partCount} merged:${bundleKeys.length} written:${Object.keys(clean).length} missing:${missing.length} extra(dropped):${extra.length}`
  );
  if (missing.length) {
    console.log(`   missing keys (${lang}): ` + JSON.stringify(missing.slice(0, 20)));
    allClean = false;
  }
  if (extra.length) {
    console.log(`   extra/typo keys (${lang}): ` + JSON.stringify(extra.slice(0, 20)));
  }
}
console.log(allClean ? "ALL CLEAN" : "ISSUES FOUND (see above)");
