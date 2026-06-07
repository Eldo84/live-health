import { useMemo } from "react";
import type {
  AgeBandCount,
  DayCount,
  DiseaseCount,
  GeoLevel,
  LusakaAlert,
  LusakaCase,
  LusakaKpis,
  PlaceCount,
  Scope,
  ScopeView,
  SexCount,
  ZambiaData,
} from "./types";
import { DISEASE_BY_CODE } from "./diseases";
import {
  DISTRICTS,
  DISTRICT_BY_ID,
  GEO,
  LOCALITIES_BY_DISTRICT,
  PROVINCES,
  PROVINCE_BY_ID,
} from "./geo";
import { generateZambiaCases } from "./generateCases";
import { LUSAKA_ALERTS } from "./alerts";

// ──────────────────────────────────────────────────────────────────────────
// useZambiaData() — THE SWAP POINT.
//
// The whole Zambia dashboard reads from this hook. Today it returns the
// hardcoded demo dataset (national synthetic cases + the exact Lusaka 847).
// When the Zambian team gives us a real feed, replace ONLY the body of this
// hook (fetch their API / Supabase table → LusakaCase[]) and set isDemo:false.
// Drill-down, scoping, charts and the map all keep working because they depend
// on the contract in types.ts, not the source.
// ──────────────────────────────────────────────────────────────────────────

const AGE_BAND_ORDER = ["0-4", "5-14", "15-24", "25-44", "45-64", "65+"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ageBand(age: number): string {
  if (age <= 4) return "0-4";
  if (age <= 14) return "5-14";
  if (age <= 24) return "15-24";
  if (age <= 44) return "25-44";
  if (age <= 64) return "45-64";
  return "65+";
}

function tierLabel(tier: number): string {
  if (tier >= 5) return "Major city";
  if (tier >= 4) return "City / large town";
  if (tier >= 3) return "Town";
  return "Rural district";
}

function byDisease(cases: LusakaCase[]): DiseaseCount[] {
  const total = cases.length;
  const m = new Map<string, number>();
  for (const c of cases) m.set(c.icd10, (m.get(c.icd10) ?? 0) + 1);
  return [...m.entries()]
    .map(([icd10, count]) => {
      const meta = DISEASE_BY_CODE[icd10];
      return {
        icd10,
        disease: meta?.name ?? icd10,
        color: meta?.color ?? "#87929d",
        cases: count,
        share: total ? count / total : 0,
      };
    })
    .sort((a, b) => b.cases - a.cases);
}

function byAge(cases: LusakaCase[]): AgeBandCount[] {
  const m = new Map<string, number>();
  for (const c of cases) {
    const b = ageBand(c.age);
    m.set(b, (m.get(b) ?? 0) + 1);
  }
  return AGE_BAND_ORDER.map((band) => ({ band, cases: m.get(band) ?? 0 }));
}

function bySex(cases: LusakaCase[]): SexCount[] {
  const m = new Map<string, number>();
  for (const c of cases) m.set(c.sex, (m.get(c.sex) ?? 0) + 1);
  return (["F", "M", "other"] as const)
    .map((sex) => ({ sex, cases: m.get(sex) ?? 0 }))
    .filter((s) => s.cases > 0);
}

function byDay(cases: LusakaCase[]): DayCount[] {
  const m = new Map<string, number>();
  for (const c of cases) {
    const date = c.timestamp.slice(0, 10);
    m.set(date, (m.get(date) ?? 0) + 1);
  }
  return [...m.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, n]) => ({
      date,
      label: DAY_LABELS[new Date(date + "T00:00:00Z").getUTCDay()],
      cases: n,
    }));
}

function kpisFor(cases: LusakaCase[], days: DayCount[], activeAlerts: number): LusakaKpis {
  const total = cases.length;
  const labConfirmed = cases.filter((c) => c.labConfirmed).length;
  const lastTwo = days.slice(-2);
  const change =
    lastTwo.length === 2 && lastTwo[0].cases > 0
      ? (lastTwo[1].cases - lastTwo[0].cases) / lastTwo[0].cases
      : 0;
  return {
    totalCases: total,
    labConfirmed,
    labConfirmedPct: total ? labConfirmed / total : 0,
    activeAlerts,
    change24hPct: change,
  };
}

/**
 * Compute everything a scope (national / province / district) needs to render,
 * from the full case list. Pure — same inputs always yield the same view.
 */
export function computeScope(cases: LusakaCase[], alerts: LusakaAlert[], scope: Scope): ScopeView {
  // 1. Filter cases + alerts to the scope.
  let scoped = cases;
  let scopedAlerts = alerts;
  let title = "Zambia";
  let center: [number, number] = [-13.8, 27.6];
  let zoom = 6;
  let childLevel: GeoLevel = "province";
  let childLabel = "provinces";
  let places: PlaceCount[] = [];

  if (scope.level === "province" && scope.provinceId) {
    const p = PROVINCE_BY_ID[scope.provinceId];
    scoped = cases.filter((c) => c.province === p?.name);
    scopedAlerts = alerts.filter((a) => a.province === p?.name);
    title = p?.name ?? "Province";
    center = p ? [p.lat, p.lng] : center;
    zoom = 7;
    childLevel = "district";
    childLabel = "districts";
  } else if (scope.level === "district" && scope.districtId) {
    const d = DISTRICT_BY_ID[scope.districtId];
    const p = d ? PROVINCE_BY_ID[d.provinceId] : undefined;
    scoped = cases.filter((c) => c.district === d?.name && c.province === p?.name);
    scopedAlerts = alerts.filter((a) => a.district === d?.name && a.province === p?.name);
    title = d?.name ?? "District";
    center = d ? [d.lat, d.lng] : center;
    zoom = 11;
    childLevel = "locality";
    const locs = d ? LOCALITIES_BY_DISTRICT[d.id] ?? [] : [];
    childLabel = locs.some((l) => l.type === "neighborhood") ? "neighborhoods" : "wards / villages";
  }

  // 2. Build the child places (with their case counts) for the current scope.
  if (childLevel === "province") {
    const counts = new Map<string, number>();
    for (const c of scoped) counts.set(c.province, (counts.get(c.province) ?? 0) + 1);
    places = PROVINCES.map((p) => ({
      id: p.id,
      name: p.name,
      level: "province" as GeoLevel,
      sublabel: `Capital: ${p.capital}`,
      lat: p.lat,
      lng: p.lng,
      cases: counts.get(p.name) ?? 0,
    }));
  } else if (childLevel === "district") {
    const p = scope.provinceId ? PROVINCE_BY_ID[scope.provinceId] : undefined;
    const counts = new Map<string, number>();
    for (const c of scoped) counts.set(c.district, (counts.get(c.district) ?? 0) + 1);
    places = DISTRICTS.filter((d) => d.provinceId === p?.id).map((d) => ({
      id: d.id,
      name: d.name,
      level: "district" as GeoLevel,
      sublabel: tierLabel(d.tier),
      lat: d.lat,
      lng: d.lng,
      cases: counts.get(d.name) ?? 0,
    }));
  } else {
    const d = scope.districtId ? DISTRICT_BY_ID[scope.districtId] : undefined;
    const locs = d ? LOCALITIES_BY_DISTRICT[d.id] ?? [] : [];
    const counts = new Map<string, number>();
    for (const c of scoped) counts.set(c.neighborhood, (counts.get(c.neighborhood) ?? 0) + 1);
    places = locs.map((l) => ({
      id: l.id,
      name: l.name,
      level: "locality" as GeoLevel,
      sublabel: l.type,
      lat: l.lat,
      lng: l.lng,
      cases: counts.get(l.name) ?? 0,
    }));
  }
  places.sort((a, b) => b.cases - a.cases);

  const days = byDay(scoped);
  return {
    level: scope.level,
    title,
    childLevel,
    childLabel,
    kpis: kpisFor(scoped, days, scopedAlerts.length),
    byDisease: byDisease(scoped),
    places,
    byAgeBand: byAge(scoped),
    bySex: bySex(scoped),
    byDay: days,
    center,
    zoom,
    alerts: scopedAlerts,
  };
}

export function useZambiaData(): ZambiaData {
  return useMemo(() => {
    const cases = generateZambiaCases();
    return {
      geo: GEO,
      cases,
      alerts: LUSAKA_ALERTS,
      isDemo: true,
      loading: false,
      error: null,
    };
  }, []);
}
