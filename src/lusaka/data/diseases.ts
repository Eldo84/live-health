import type { DiseaseMeta } from "./types";

// ICD-10 codes tracked in the Lusaka demo, with display name + a marker color.
// Colors echo the OutbreakNow palette (warm = vector/parasitic, cool = viral,
// amber = bacterial/enteric) so the map + charts read consistently.
export const DISEASES: DiseaseMeta[] = [
  { icd10: "B50", name: "Malaria",      color: "#ff4a5c" },
  { icd10: "J18", name: "Pneumonia",    color: "#6ab7ff" },
  { icd10: "A09", name: "Diarrhea",     color: "#ffb547" },
  { icd10: "A01", name: "Typhoid",      color: "#b07cff" },
  { icd10: "A15", name: "Tuberculosis", color: "#4eb7bd" },
  { icd10: "B34", name: "Viral (unspecified)", color: "#7ee787" },
  { icd10: "A90", name: "Dengue",       color: "#ff8b97" },
  { icd10: "B77", name: "Ascariasis",   color: "#d2a679" },
  { icd10: "B26", name: "Mumps",        color: "#c9a0ff" },
  { icd10: "B99", name: "Other infectious", color: "#87929d" },
];

export const DISEASE_BY_CODE: Record<string, DiseaseMeta> = Object.fromEntries(
  DISEASES.map((d) => [d.icd10, d]),
);

// Target case counts for the demo week. Mirrors the spec's "Top 10 diseases"
// table; the "Other infectious" bucket carries the remainder so the marginal
// sums to the headline total of 847.
//
//   245+198+167+89+48+32+18+12+10 = 819  →  Other = 28  →  total = 847
export const DISEASE_COUNTS: Record<string, number> = {
  B50: 245, // Malaria
  J18: 198, // Pneumonia
  A09: 167, // Diarrhea
  A01: 89,  // Typhoid
  A15: 48,  // TB
  B34: 32,  // Viral
  A90: 18,  // Dengue
  B77: 12,  // Ascariasis
  B26: 10,  // Mumps
  B99: 28,  // Other (remainder)
};

export const TOTAL_CASES = Object.values(DISEASE_COUNTS).reduce((a, b) => a + b, 0); // 847

// Per-disease lab-confirmation weight, loosely tracking the spec's lab table
// (Part 3.3): vector/notifiable diseases get lab-confirmed often. The generator
// uses these as RANKING weights — it marks exactly the spec's 312 confirmed
// (36.8%), concentrating them on the most confirmable diseases first.
export const LAB_CONFIRM_RATE: Record<string, number> = {
  B50: 0.78, A01: 0.81, A15: 0.72, A90: 0.77, // confirmable, matches lab table
  J18: 0.10, A09: 0.08, B34: 0.05, B77: 0.20, B26: 0.10, B99: 0.12,
};
