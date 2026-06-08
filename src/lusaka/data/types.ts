// ──────────────────────────────────────────────────────────────────────────
// OutbreakNow — Zambia (national) demo data contract.
//
// SINGLE source of truth for the shapes the Zambia dashboard renders. The demo
// fills these from a hardcoded dataset; when the Zambian team provides a real
// feed, only the internals of `useZambiaData()` change — every screen keeps
// consuming these exact types. Treat this as the API contract their
// import/endpoint must match.
//
// Geography is hierarchical: Province → District → Locality (ward / neighborhood
// / village). Lusaka district carries the deep 65-neighborhood detail from the
// original spec; every other district has real towns + representative sub-areas.
// ──────────────────────────────────────────────────────────────────────────

export type FacilityType = "hospital" | "urgent_care" | "lab";
export type Sex = "F" | "M" | "other";
export type GeoLevel = "province" | "district" | "locality";
export type LocalityType = "neighborhood" | "ward" | "village";

// ── Geography ──────────────────────────────────────────────────────────────

export interface Province {
  id: string;          // slug, e.g. "lusaka"
  name: string;
  capital: string;
  population: number;
  lat: number;
  lng: number;
}

export interface District {
  id: string;          // slug, e.g. "kitwe"
  name: string;
  provinceId: string;
  population: number;
  lat: number;
  lng: number;
  /** Display tier (5 = major city … 1 = small rural district). */
  tier: number;
}

export interface Locality {
  id: string;          // slug
  name: string;
  districtId: string;
  provinceId: string;
  type: LocalityType;
  population: number;
  lat: number;
  lng: number;
}

export interface GeoData {
  provinces: Province[];
  districts: District[];
  localities: Locality[];
}

// ── Case record (anonymized; no patient names) ─────────────────────────────

export interface LusakaCase {
  id: string;
  facilityType: FacilityType;
  facilityName: string;
  icd10: string;            // e.g. "B50"
  disease: string;          // resolved display name, e.g. "Malaria"
  province: string;         // province name
  district: string;         // district name
  neighborhood: string;     // locality name (ward / neighborhood / village)
  age: number;              // years (0–120)
  sex: Sex;
  timestamp: string;        // ISO timestamp of the encounter
  labConfirmed: boolean;
}

// Kept for the Lusaka 65-neighborhood reference rows.
export interface LusakaNeighborhood {
  name: string;
  zone: "North" | "South" | "East" | "West" | "Central";
  population: number;
  hospitals: number;
  clinics: number;
  lat: number;
  lng: number;
}

export interface DiseaseMeta {
  icd10: string;
  name: string;
  color: string;
}

export interface LusakaAlert {
  date: string;             // ISO date
  level: "warning" | "alert";
  province: string;
  district: string;
  neighborhood: string;
  trigger: string;
  action: string;
}

// ── Aggregate shapes ───────────────────────────────────────────────────────

export interface DiseaseCount {
  icd10: string;
  disease: string;
  color: string;
  cases: number;
  share: number;            // 0..1 of total
}

/** A child place at the current scope level (province / district / locality). */
export interface PlaceCount {
  id: string;
  name: string;
  level: GeoLevel;
  sublabel: string;         // e.g. zone, province, or locality type
  lat: number;
  lng: number;
  cases: number;
}

export interface AgeBandCount {
  band: string;
  cases: number;
}

export interface SexCount {
  sex: Sex;
  cases: number;
}

export interface DayCount {
  date: string;
  label: string;
  cases: number;
}

export interface LusakaKpis {
  totalCases: number;
  labConfirmed: number;
  labConfirmedPct: number;
  activeAlerts: number;
  change24hPct: number;
}

// ── Scope (drill-down state) + the computed view for that scope ─────────────

export interface Scope {
  level: "national" | "province" | "district";
  provinceId?: string;
  districtId?: string;
  /** Optional 4th tier: filter a district view down to one neighborhood. */
  localityName?: string;
}

export interface ScopeView {
  level: "national" | "province" | "district";
  title: string;            // e.g. "Zambia", "Copperbelt", "Kitwe"
  childLevel: GeoLevel;     // what `places` enumerates
  childLabel: string;       // "provinces" | "districts" | "wards / villages"
  kpis: LusakaKpis;
  byDisease: DiseaseCount[];
  places: PlaceCount[];     // children of the scope, sorted desc by cases
  byAgeBand: AgeBandCount[];
  bySex: SexCount[];
  byDay: DayCount[];
  center: [number, number]; // map focus
  zoom: number;
  alerts: LusakaAlert[];    // alerts within scope
}

/** The full payload every Zambia view consumes. */
export interface ZambiaData {
  geo: GeoData;
  cases: LusakaCase[];
  alerts: LusakaAlert[];
  isDemo: boolean;
  loading: boolean;
  error: string | null;
}
