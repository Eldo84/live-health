import type { LusakaCase, Scope } from "./types";
import { DISEASE_BY_CODE } from "./diseases";
import { DISTRICT_BY_ID, LOCALITIES_BY_DISTRICT } from "./geo";

// ──────────────────────────────────────────────────────────────────────────
// Map overlay data derived from the case records:
//  • Pie slices per place (disease breakdown) for the zoomed-out pie markers.
//  • Jittered per-case markers for the zoomed-in district view (color-coded by
//    disease). NB: the spec stores no street address (privacy), so individual
//    points are scattered around the locality centroid — illustrative positions,
//    not real GPS.
// ──────────────────────────────────────────────────────────────────────────

export interface PieSlice {
  label: string;
  color: string;
  value: number;
}

export interface CaseMarker {
  id: string;
  lat: number;
  lng: number;
  color: string;
  disease: string;
  age: number;
  sex: string;
  date: string;
}

// Which case field names the child place at this scope level.
function placeKeyField(scope: Scope): keyof LusakaCase {
  if (scope.level === "national") return "province";
  if (scope.level === "province") return "district";
  return "neighborhood";
}

/**
 * Disease breakdown per child place (top 4 diseases + "Other"), keyed by place
 * name. Used for the pie markers when zoomed out to province / district level.
 */
export function computePlacePies(cases: LusakaCase[], scope: Scope): Record<string, PieSlice[]> {
  const field = placeKeyField(scope);
  const byPlace = new Map<string, Map<string, number>>();
  for (const c of cases) {
    const place = String(c[field]);
    let d = byPlace.get(place);
    if (!d) byPlace.set(place, (d = new Map()));
    d.set(c.icd10, (d.get(c.icd10) ?? 0) + 1);
  }

  const out: Record<string, PieSlice[]> = {};
  for (const [place, diseaseMap] of byPlace) {
    const sorted = [...diseaseMap.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 4).map(([icd10, value]) => ({
      label: DISEASE_BY_CODE[icd10]?.name ?? icd10,
      color: DISEASE_BY_CODE[icd10]?.color ?? "#87929d",
      value,
    }));
    const otherTotal = sorted.slice(4).reduce((s, [, v]) => s + v, 0);
    if (otherTotal > 0) top.push({ label: "Other", color: "#5b6b75", value: otherTotal });
    out[place] = top;
  }
  return out;
}

// Deterministic [-1,1) jitter from a string + salt (stable across reloads).
function jit(s: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 5000 - 1;
}

/**
 * One marker per case for the district zoom-in, scattered around each case's
 * locality centroid. Caller passes cases already scoped to the district.
 */
export function buildCaseMarkers(cases: LusakaCase[], districtId: string): CaseMarker[] {
  const d = DISTRICT_BY_ID[districtId];
  if (!d) return [];
  const locCentroid = new Map<string, { lat: number; lng: number }>();
  for (const l of LOCALITIES_BY_DISTRICT[d.id] ?? []) locCentroid.set(l.name, { lat: l.lat, lng: l.lng });

  const markers: CaseMarker[] = [];
  for (const c of cases) {
    const centroid = locCentroid.get(c.neighborhood) ?? { lat: d.lat, lng: d.lng };
    const spread = 0.012; // ~1.3 km scatter within the locality
    markers.push({
      id: c.id,
      lat: centroid.lat + jit(c.id, 1) * spread,
      lng: centroid.lng + jit(c.id, 7) * spread,
      color: DISEASE_BY_CODE[c.icd10]?.color ?? "#87929d",
      disease: c.disease,
      age: c.age,
      sex: c.sex,
      date: c.timestamp.slice(0, 10),
    });
  }
  return markers;
}
