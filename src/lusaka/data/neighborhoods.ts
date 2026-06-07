import type { LusakaNeighborhood, Zone } from "./types";

// ──────────────────────────────────────────────────────────────────────────
// The 65 Lusaka neighborhoods from the spec (Part 2), verbatim for name / zone
// / population / facility counts. Coordinates are NOT in the spec, so: major &
// hotspot areas are hand-placed at real approximate centroids (so the heat map
// reads correctly), and the remainder are deterministically spread within their
// zone. All coordinates are approximate and flagged as such in the UI.
// ──────────────────────────────────────────────────────────────────────────

const LUSAKA_CENTER = { lat: -15.4167, lng: 28.2833 };

// Per-zone base offset from the city center (degrees). North = higher latitude.
const ZONE_BASE: Record<Zone, { lat: number; lng: number }> = {
  Central: { lat: LUSAKA_CENTER.lat + 0.0, lng: LUSAKA_CENTER.lng + 0.0 },
  North: { lat: LUSAKA_CENTER.lat + 0.06, lng: LUSAKA_CENTER.lng + 0.0 },
  South: { lat: LUSAKA_CENTER.lat - 0.06, lng: LUSAKA_CENTER.lng + 0.0 },
  East: { lat: LUSAKA_CENTER.lat + 0.0, lng: LUSAKA_CENTER.lng + 0.07 },
  West: { lat: LUSAKA_CENTER.lat + 0.0, lng: LUSAKA_CENTER.lng - 0.07 },
};

// Hand-placed approximate centroids for well-known / high-case areas.
const COORD_OVERRIDES: Record<string, { lat: number; lng: number }> = {
  Chawama: { lat: -15.453, lng: 28.262 },
  Kanyama: { lat: -15.433, lng: 28.235 },
  Matero: { lat: -15.38, lng: 28.23 },
  George: { lat: -15.372, lng: 28.246 },
  Kalingalinga: { lat: -15.398, lng: 28.337 },
  Kabwata: { lat: -15.43, lng: 28.295 },
  Kamwala: { lat: -15.43, lng: 28.283 },
  Chilenje: { lat: -15.445, lng: 28.305 },
  Chelston: { lat: -15.388, lng: 28.38 },
  Mandevu: { lat: -15.35, lng: 28.27 },
  Kabulonga: { lat: -15.42, lng: 28.33 },
  Woodlands: { lat: -15.44, lng: 28.32 },
  Roma: { lat: -15.378, lng: 28.33 },
  Northmead: { lat: -15.398, lng: 28.3 },
  Avondale: { lat: -15.385, lng: 28.345 },
  "Ng'ombe": { lat: -15.36, lng: 28.33 },
  Bauleni: { lat: -15.45, lng: 28.35 },
  Mutendere: { lat: -15.398, lng: 28.355 },
  Libala: { lat: -15.448, lng: 28.29 },
  Ridgeway: { lat: -15.42, lng: 28.3 },
};

// Raw reference rows: [name, zone, population, hospitals, clinics].
type Row = [string, Zone, number, number, number];
const ROWS: Row[] = [
  ["Chawama", "South", 85000, 1, 3],
  ["Kalingalinga", "East", 78000, 0, 2],
  ["Matero", "West", 120000, 1, 4],
  ["George", "North", 95000, 0, 1],
  ["Kabwata", "Central", 65000, 0, 2],
  ["Chelston", "East", 52000, 1, 1],
  ["Woodlands", "East", 45000, 1, 2],
  ["Roma", "East", 40000, 0, 1],
  ["Olympia", "Central", 35000, 0, 1],
  ["Rhodes Park", "Central", 28000, 0, 1],
  ["Kabulonga", "East", 32000, 1, 0],
  ["Ibex Hill", "East", 15000, 0, 1],
  ["Sunningdale", "East", 22000, 0, 1],
  ["Mass Media", "East", 18000, 0, 0],
  ["Longacres", "Central", 12000, 0, 0],
  ["Thornpark", "East", 8000, 0, 0],
  ["Avondale", "Central", 25000, 0, 1],
  ["Northmead", "North", 30000, 1, 0],
  ["Fairview", "North", 20000, 0, 1],
  ["Kamwala", "South", 55000, 0, 2],
  ["Kamwala South", "South", 48000, 0, 1],
  ["Lilayi", "South", 25000, 0, 1],
  ["Makeni", "West", 35000, 1, 0],
  ["Makeni Villa", "West", 12000, 0, 0],
  ["John Laing", "West", 40000, 0, 1],
  ["Chipata", "North", 28000, 0, 1],
  ["Mandevu", "North", 50000, 0, 1],
  ["Chaisa", "North", 35000, 0, 1],
  ["Garden", "North", 22000, 0, 1],
  ["Chipolopolo", "North", 18000, 0, 0],
  ["Chalala", "South", 30000, 0, 1],
  ["Shantumbu", "South", 15000, 0, 0],
  ["Silverest", "South", 12000, 0, 0],
  ["Nsumbu", "South", 10000, 0, 0],
  ["Bauleni", "East", 42000, 0, 1],
  ["Chilenje", "West", 48000, 1, 0],
  ["Chilenje South", "West", 25000, 0, 1],
  ["Mutendere", "West", 38000, 0, 1],
  ["New Kasama", "North", 45000, 0, 1],
  ["Kasama", "North", 30000, 0, 1],
  ["Libala", "West", 28000, 1, 0],
  ["Libala South", "West", 22000, 0, 0],
  ["Emmasdale", "East", 35000, 0, 1],
  ["PHI", "East", 12000, 0, 0],
  ["Los Angeles", "West", 8000, 0, 0],
  ["Meanwood", "North", 25000, 0, 1],
  ["Ibex", "East", 10000, 0, 0],
  ["Leopards Hill", "East", 18000, 0, 0],
  ["State Lodge", "Central", 5000, 1, 0],
  ["Ridgeway", "Central", 8000, 2, 0],
  ["Lusaka Central", "Central", 15000, 0, 1],
  ["Town Centre", "Central", 10000, 0, 0],
  ["Barlastone", "East", 12000, 0, 0],
  ["Jack", "East", 8000, 0, 0],
  ["Chamba Valley", "East", 20000, 0, 0],
  ["Protea", "East", 15000, 0, 0],
  ["Waterfalls", "East", 28000, 1, 0],
  ["Foxdale", "North", 18000, 0, 0],
  ["Twin Palm", "North", 22000, 0, 0],
  ["Lubuto", "North", 12000, 0, 0],
  ["Ng'ombe", "West", 35000, 0, 1],
  ["Chipata Compound", "North", 45000, 0, 1],
  ["Mandevu Compound", "North", 55000, 1, 0],
  ["Chazanga", "South", 25000, 0, 1],
  ["Kanyama", "West", 85000, 1, 3],
];

// Deterministic [-1, 1) jitter from a string, so zone-approximated points fan
// out stably across reloads instead of stacking on the zone center.
function hashUnit(s: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  // map to [-1, 1)
  return ((h >>> 0) % 10000) / 5000 - 1;
}

export const NEIGHBORHOODS: LusakaNeighborhood[] = ROWS.map(
  ([name, zone, population, hospitals, clinics]) => {
    const override = COORD_OVERRIDES[name];
    const base = ZONE_BASE[zone];
    const lat = override ? override.lat : base.lat + hashUnit(name, 1) * 0.03;
    const lng = override ? override.lng : base.lng + hashUnit(name, 7) * 0.03;
    return { name, zone, population, hospitals, clinics, lat, lng };
  },
);

export const NEIGHBORHOOD_BY_NAME: Record<string, LusakaNeighborhood> =
  Object.fromEntries(NEIGHBORHOODS.map((n) => [n.name, n]));
