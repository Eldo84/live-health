import type { FacilityType, LusakaCase, Sex } from "./types";
import { DISEASE_BY_CODE, DISEASE_COUNTS, LAB_CONFIRM_RATE } from "./diseases";
import { NEIGHBORHOODS } from "./neighborhoods";
import { DISTRICTS, LOCALITIES_BY_DISTRICT, PROVINCE_BY_ID } from "./geo";

// ──────────────────────────────────────────────────────────────────────────
// Deterministic synthetic generator for the demo week (Jun 1–7, 2026).
//
// Strategy: build one length-847 array per attribute whose value counts EXACTLY
// match the spec's published marginals, shuffle each independently with a
// seeded PRNG, then zip them index-by-index into case records. This guarantees
// every headline aggregate (total 847, top-disease counts, age bands, sex
// split, daily counts, 312 lab-confirmed) reproduces the spec exactly. The
// joint correlations between fields are synthetic — fine for a demo, and noted
// here so nobody mistakes this for real epidemiology.
// ──────────────────────────────────────────────────────────────────────────

// Seeded PRNG (mulberry32) — stable dataset across reloads.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 0x0babe5; // fixed — change to reshuffle the synthetic joint distribution

// In-place Fisher–Yates using the supplied rng.
function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Allocate `total` across weighted items so the parts sum to exactly `total`
// (largest-remainder method).
function allocateByWeight(total: number, items: { key: string; weight: number }[]): Record<string, number> {
  const sumW = items.reduce((s, i) => s + i.weight, 0) || 1;
  const raw = items.map((i) => ({ key: i.key, exact: (i.weight / sumW) * total }));
  const out: Record<string, number> = {};
  let used = 0;
  for (const r of raw) {
    out[r.key] = Math.floor(r.exact);
    used += out[r.key];
  }
  // Hand out the remaining units to the largest fractional remainders.
  const rema = raw
    .map((r) => ({ key: r.key, frac: r.exact - Math.floor(r.exact) }))
    .sort((a, b) => b.frac - a.frac);
  let left = total - used;
  for (let i = 0; left > 0 && i < rema.length; i++, left--) out[rema[i].key]++;
  return out;
}

// Age bands → [lo, hi] inclusive.
const AGE_BANDS: { band: string; count: number; lo: number; hi: number }[] = [
  { band: "0-4", count: 156, lo: 0, hi: 4 },
  { band: "5-14", count: 112, lo: 5, hi: 14 },
  { band: "15-24", count: 168, lo: 15, hi: 24 },
  { band: "25-44", count: 174, lo: 25, hi: 44 },
  { band: "45-64", count: 124, lo: 45, hi: 64 },
  { band: "65+", count: 113, lo: 65, hi: 89 },
];

// Per-day reported case counts for the demo week (sums to 847).
const DAYS: { date: string; label: string; count: number }[] = [
  { date: "2026-06-01", label: "Sun", count: 116 },
  { date: "2026-06-02", label: "Mon", count: 124 },
  { date: "2026-06-03", label: "Tue", count: 131 },
  { date: "2026-06-04", label: "Wed", count: 125 },
  { date: "2026-06-05", label: "Thu", count: 119 },
  { date: "2026-06-06", label: "Fri", count: 122 },
  { date: "2026-06-07", label: "Sat", count: 110 },
];

// Top-10 neighborhood case counts from the spec's report; the rest of the 847
// are spread across the remaining neighborhoods weighted by population.
const NEIGHBORHOOD_TOP: Record<string, number> = {
  Chawama: 142,
  Kalingalinga: 98,
  Matero: 76,
  George: 72,
  Kanyama: 68,
  Kabwata: 45,
  Kamwala: 38,
  Chilenje: 32,
  Chelston: 28,
  Mandevu: 25,
};

const TOTAL = 847;
const LAB_CONFIRMED = 312; // spec headline (36.8%)

function expand<T>(pairs: [T, number][]): T[] {
  const out: T[] = [];
  for (const [val, n] of pairs) for (let i = 0; i < n; i++) out.push(val);
  return out;
}

let CACHE: LusakaCase[] | null = null;

export function generateLusakaCases(): LusakaCase[] {
  if (CACHE) return CACHE;
  const rng = mulberry32(SEED);

  // ── Disease column ──
  const diseaseCol = shuffle(
    expand(Object.entries(DISEASE_COUNTS).map(([code, n]) => [code, n] as [string, number])),
    rng,
  );

  // ── Neighborhood column ── (top-10 explicit + population-weighted remainder)
  const topSum = Object.values(NEIGHBORHOOD_TOP).reduce((a, b) => a + b, 0);
  const remainderItems = NEIGHBORHOODS.filter((n) => !(n.name in NEIGHBORHOOD_TOP)).map((n) => ({
    key: n.name,
    weight: n.population,
  }));
  const remainderAlloc = allocateByWeight(TOTAL - topSum, remainderItems);
  const neighborhoodCol = shuffle(
    expand([
      ...Object.entries(NEIGHBORHOOD_TOP),
      ...Object.entries(remainderAlloc),
    ] as [string, number][]),
    rng,
  );

  // ── Age column ── (band → concrete age)
  const ageBandCol = shuffle(
    expand(AGE_BANDS.map((b) => [b, b.count] as [(typeof AGE_BANDS)[number], number])),
    rng,
  );
  const ageCol = ageBandCol.map((b) => b.lo + Math.floor(rng() * (b.hi - b.lo + 1)));

  // ── Sex column ──
  const sexCol = shuffle(
    expand([
      ["F", 448],
      ["M", 399],
    ] as [Sex, number][]),
    rng,
  );

  // ── Day/time column ──
  const dayCol = shuffle(
    expand(DAYS.map((d) => [d, d.count] as [(typeof DAYS)[number], number])),
    rng,
  );

  // ── Zip into records ──
  const cases: LusakaCase[] = [];
  for (let i = 0; i < TOTAL; i++) {
    const code = diseaseCol[i];
    const meta = DISEASE_BY_CODE[code];
    const day = dayCol[i];
    const hour = 6 + Math.floor(rng() * 13); // 06:00–18:59 clinic window
    const minute = Math.floor(rng() * 60);
    const hh = String(hour).padStart(2, "0");
    const mm = String(minute).padStart(2, "0");

    // Facility: hospital / urgent care clinic / lab, then a coded name.
    const fRoll = rng();
    const facilityType: FacilityType =
      fRoll < 0.4 ? "hospital" : fRoll < 0.85 ? "urgent_care" : "lab";
    const nbh = neighborhoodCol[i];
    const facilityName =
      facilityType === "hospital"
        ? `${nbh} Hospital`
        : facilityType === "lab"
          ? `${nbh} Lab`
          : `${nbh} Clinic`;

    cases.push({
      id: `LSK-${String(i + 1).padStart(4, "0")}`,
      facilityType,
      facilityName,
      icd10: code,
      disease: meta?.name ?? code,
      province: "Lusaka",
      district: "Lusaka",
      neighborhood: nbh,
      age: ageCol[i],
      sex: sexCol[i],
      timestamp: `${day.date}T${hh}:${mm}:00Z`,
      labConfirmed: false, // assigned below to hit exactly LAB_CONFIRMED
    });
  }

  // ── Lab confirmation ── rank by disease weight (+ jitter) and confirm the
  // top 312 so the rate is exactly the spec's 36.8%, concentrated on the most
  // confirmable diseases.
  const ranked = cases
    .map((c, idx) => ({ idx, score: (LAB_CONFIRM_RATE[c.icd10] ?? 0.1) + rng() * 0.15 }))
    .sort((a, b) => b.score - a.score);
  for (let k = 0; k < LAB_CONFIRMED && k < ranked.length; k++) {
    cases[ranked[k].idx].labConfirmed = true;
  }

  CACHE = cases;
  return cases;
}

// ──────────────────────────────────────────────────────────────────────────
// National generator — every district EXCEPT Lusaka district (which is the
// exact 847 above). No published national marginals exist, so these are drawn
// probabilistically: malaria-heavy, weighted up in endemic provinces and down
// in the two most urban ones. Distributions are plausible, not authoritative.
// ──────────────────────────────────────────────────────────────────────────

const NATIONAL_SEED = 0x21a3b1;
const TIER_TARGET: Record<number, number> = { 5: 360, 4: 175, 3: 95, 2: 48, 1: 28 };

// Province-level malaria emphasis (endemic north/west higher, urban lower).
const MALARIA_MULT: Record<string, number> = {
  Northern: 1.35,
  Luapula: 1.35,
  Muchinga: 1.3,
  Western: 1.3,
  "North-Western": 1.25,
  Eastern: 1.15,
  Central: 1.0,
  Southern: 1.0,
  Copperbelt: 0.8,
  Lusaka: 0.8,
};

// Base national disease mix (weights, by ICD-10). Malaria is scaled per province.
const NAT_MIX: Record<string, number> = {
  B50: 42, J18: 16, A09: 15, A01: 7, A15: 5, B34: 5, A90: 1, B77: 3, B26: 2, B99: 4,
};

function weightedPick<T>(rng: () => number, items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [val, w] of items) {
    r -= w;
    if (r <= 0) return val;
  }
  return items[items.length - 1][0];
}

const DAY_WEIGHTS: [(typeof DAYS)[number], number][] = DAYS.map((d) => [d, d.count]);
const AGE_WEIGHTS: [(typeof AGE_BANDS)[number], number][] = AGE_BANDS.map((b) => [b, b.count]);

let NAT_CACHE: LusakaCase[] | null = null;

export function generateNationalCases(): LusakaCase[] {
  if (NAT_CACHE) return NAT_CACHE;
  const rng = mulberry32(NATIONAL_SEED);
  const out: LusakaCase[] = [];
  let serial = 1;

  for (const d of DISTRICTS) {
    // Skip Lusaka district — covered exactly by generateLusakaCases().
    if (d.name === "Lusaka" && d.provinceId === "lusaka") continue;

    const localities = LOCALITIES_BY_DISTRICT[d.id] ?? [];
    if (!localities.length) continue;

    // District weekly target with ±18% deterministic jitter.
    const base = TIER_TARGET[d.tier] ?? 40;
    const target = Math.max(10, Math.round(base * (0.82 + rng() * 0.36)));

    // Province-adjusted disease mix for this district.
    const provName = PROVINCE_BY_ID[d.provinceId]?.name ?? d.provinceId;
    const mMult = MALARIA_MULT[provName] ?? 1;
    const mix: [string, number][] = Object.entries(NAT_MIX).map(([code, w]) => [
      code,
      code === "B50" ? w * mMult : w,
    ]);

    // Spread the district target across its localities by population.
    const alloc = allocateByWeight(
      target,
      localities.map((l) => ({ key: l.id, weight: l.population || 1 })),
    );

    for (const loc of localities) {
      const n = alloc[loc.id] ?? 0;
      for (let i = 0; i < n; i++) {
        const code = weightedPick(rng, mix);
        const meta = DISEASE_BY_CODE[code];
        const band = weightedPick(rng, AGE_WEIGHTS);
        const age = band.lo + Math.floor(rng() * (band.hi - band.lo + 1));
        const sex: Sex = rng() < 0.53 ? "F" : "M";
        const day = weightedPick(rng, DAY_WEIGHTS);
        const hh = String(6 + Math.floor(rng() * 13)).padStart(2, "0");
        const mm = String(Math.floor(rng() * 60)).padStart(2, "0");

        const fRoll = rng();
        const facilityType: FacilityType =
          fRoll < 0.35 ? "hospital" : fRoll < 0.85 ? "urgent_care" : "lab";
        const facilityName =
          facilityType === "hospital"
            ? `${d.name} Hospital`
            : facilityType === "lab"
              ? `${d.name} Lab`
              : `${loc.name} Clinic`;

        const labConfirmed = rng() < (LAB_CONFIRM_RATE[code] ?? 0.1);

        out.push({
          id: `ZM-${String(serial++).padStart(5, "0")}`,
          facilityType,
          facilityName,
          icd10: code,
          disease: meta?.name ?? code,
          province: provName,
          district: d.name,
          neighborhood: loc.name,
          age,
          sex,
          timestamp: `${day.date}T${hh}:${mm}:00Z`,
          labConfirmed,
        });
      }
    }
  }

  NAT_CACHE = out;
  return out;
}

let ALL_CACHE: LusakaCase[] | null = null;

/** Full national dataset: the exact Lusaka 847 + probabilistic rest-of-country. */
export function generateZambiaCases(): LusakaCase[] {
  if (ALL_CACHE) return ALL_CACHE;
  ALL_CACHE = [...generateLusakaCases(), ...generateNationalCases()];
  return ALL_CACHE;
}
