import type { District, GeoData, Locality, LocalityType, Province } from "./types";
import { NEIGHBORHOODS } from "./neighborhoods";

// ──────────────────────────────────────────────────────────────────────────
// Zambia geography for the national demo. Provinces, provincial capitals and
// districts are REAL (names + approximate centroids). Sub-localities are real
// compounds/wards for the major cities and representative wards/villages for
// smaller districts — flagged as representative in the UI. Lusaka district
// reuses the deep 65-neighborhood list from the original spec.
// ──────────────────────────────────────────────────────────────────────────

const slug = (s: string) =>
  s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Deterministic [-1,1) jitter so generated points fan out stably.
function jit(s: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 5000 - 1;
}

// ── Provinces (real capitals + approximate centroids + ~census populations) ──
const PROV: Array<[string, string, number, number, number]> = [
  // name, capital, population, lat, lng
  ["Central", "Kabwe", 1600000, -14.45, 28.45],
  ["Copperbelt", "Ndola", 2600000, -12.97, 28.63],
  ["Eastern", "Chipata", 1900000, -13.63, 32.65],
  ["Luapula", "Mansa", 1300000, -11.2, 28.89],
  ["Lusaka", "Lusaka", 3300000, -15.42, 28.28],
  ["Muchinga", "Chinsali", 1000000, -10.55, 32.07],
  ["Northern", "Kasama", 1400000, -10.21, 31.18],
  ["North-Western", "Solwezi", 900000, -12.17, 26.39],
  ["Southern", "Choma", 2000000, -16.8, 26.99],
  ["Western", "Mongu", 1000000, -15.25, 23.13],
];

export const PROVINCES: Province[] = PROV.map(([name, capital, population, lat, lng]) => ({
  id: slug(name),
  name,
  capital,
  population,
  lat,
  lng,
}));

const provId = (name: string) => slug(name);

// ── Districts (real towns + approximate centroids). [name, prov, lat, lng, tier]
const DIST: Array<[string, string, number, number, number]> = [
  // Central
  ["Kabwe", "Central", -14.45, 28.45, 4],
  ["Kapiri Mposhi", "Central", -13.97, 28.67, 4],
  ["Mkushi", "Central", -13.62, 29.39, 3],
  ["Serenje", "Central", -13.23, 30.23, 2],
  ["Mumbwa", "Central", -14.98, 27.06, 3],
  ["Chibombo", "Central", -14.66, 28.07, 3],
  // Copperbelt
  ["Ndola", "Copperbelt", -12.97, 28.63, 5],
  ["Kitwe", "Copperbelt", -12.8, 28.21, 5],
  ["Chingola", "Copperbelt", -12.53, 27.85, 4],
  ["Mufulira", "Copperbelt", -12.55, 28.24, 4],
  ["Luanshya", "Copperbelt", -13.13, 28.42, 4],
  ["Kalulushi", "Copperbelt", -12.84, 28.1, 4],
  ["Chililabombwe", "Copperbelt", -12.37, 27.83, 4],
  // Eastern
  ["Chipata", "Eastern", -13.63, 32.65, 4],
  ["Petauke", "Eastern", -14.25, 31.32, 3],
  ["Katete", "Eastern", -14.07, 32.05, 3],
  ["Lundazi", "Eastern", -12.28, 33.18, 3],
  ["Nyimba", "Eastern", -14.55, 30.82, 2],
  ["Mambwe", "Eastern", -13.07, 31.77, 2],
  // Luapula
  ["Mansa", "Luapula", -11.2, 28.89, 4],
  ["Kawambwa", "Luapula", -9.79, 29.08, 3],
  ["Nchelenge", "Luapula", -9.35, 28.73, 3],
  ["Samfya", "Luapula", -11.36, 29.55, 3],
  ["Mwense", "Luapula", -10.38, 28.69, 2],
  // Lusaka
  ["Lusaka", "Lusaka", -15.42, 28.28, 5],
  ["Kafue", "Lusaka", -15.77, 28.18, 4],
  ["Chongwe", "Lusaka", -15.33, 28.68, 3],
  ["Chilanga", "Lusaka", -15.56, 28.28, 3],
  ["Rufunsa", "Lusaka", -15.07, 29.65, 2],
  ["Luangwa", "Lusaka", -15.61, 30.41, 2],
  // Muchinga
  ["Chinsali", "Muchinga", -10.55, 32.07, 3],
  ["Mpika", "Muchinga", -11.83, 31.45, 3],
  ["Nakonde", "Muchinga", -9.34, 32.75, 3],
  ["Isoka", "Muchinga", -10.13, 32.63, 2],
  ["Chama", "Muchinga", -11.21, 33.15, 2],
  // Northern
  ["Kasama", "Northern", -10.21, 31.18, 4],
  ["Mbala", "Northern", -8.84, 31.37, 3],
  ["Mpulungu", "Northern", -8.76, 31.12, 2],
  ["Luwingu", "Northern", -10.26, 29.93, 2],
  ["Mporokoso", "Northern", -9.37, 30.12, 2],
  ["Mungwi", "Northern", -10.17, 31.61, 2],
  // North-Western
  ["Solwezi", "North-Western", -12.17, 26.39, 4],
  ["Kasempa", "North-Western", -13.46, 25.83, 2],
  ["Mwinilunga", "North-Western", -11.74, 24.43, 3],
  ["Zambezi", "North-Western", -13.54, 23.11, 2],
  ["Kabompo", "North-Western", -13.6, 24.2, 2],
  ["Mufumbwe", "North-Western", -13.68, 24.8, 2],
  // Southern
  ["Choma", "Southern", -16.8, 26.99, 4],
  ["Livingstone", "Southern", -17.85, 25.87, 4],
  ["Mazabuka", "Southern", -15.86, 27.75, 4],
  ["Monze", "Southern", -16.28, 27.48, 3],
  ["Kalomo", "Southern", -17.03, 26.48, 3],
  ["Siavonga", "Southern", -16.54, 28.71, 3],
  ["Namwala", "Southern", -15.75, 26.44, 2],
  // Western
  ["Mongu", "Western", -15.25, 23.13, 4],
  ["Senanga", "Western", -16.12, 23.27, 3],
  ["Kaoma", "Western", -14.78, 24.8, 3],
  ["Sesheke", "Western", -17.48, 24.3, 2],
  ["Kalabo", "Western", -14.99, 22.68, 2],
  ["Lukulu", "Western", -14.37, 23.24, 2],
];

// Rough district populations by tier (used only for case weighting).
const TIER_POP: Record<number, number> = { 5: 600000, 4: 180000, 3: 90000, 2: 45000, 1: 25000 };

export const DISTRICTS: District[] = DIST.map(([name, prov, lat, lng, tier]) => ({
  id: slug(name === "Lusaka" && prov === "Lusaka" ? "lusaka-district" : name),
  name,
  provinceId: provId(prov),
  population: TIER_POP[tier] ?? 45000,
  lat,
  lng,
  tier,
}));

const DISTRICT_BY_KEY: Record<string, District> = Object.fromEntries(
  DISTRICTS.map((d) => [`${d.provinceId}:${d.name}`, d]),
);

// ── Real compounds / wards for major cities. Everything else gets generic but
// plausible representative wards + a rural village.
const CITY_WARDS: Record<string, string[]> = {
  Ndola: ["Kabushi", "Chifubu", "Lubuto", "Masala", "Kansenshi", "Itawa"],
  Kitwe: ["Wusakile", "Kwacha", "Chamboli", "Bulangililo", "Chimwemwe", "Riverside"],
  Kabwe: ["Bwacha", "Kasanda", "Makululu", "Ngungu", "Katondo"],
  Chingola: ["Nchanga", "Chiwempala", "Kabundi", "Buntungwa"],
  Mufulira: ["Kantanshi", "Kankoyo", "Butondo", "Murundu"],
  Luanshya: ["Roan", "Mpatamatu", "Mikomfwa", "Fisenge"],
  Livingstone: ["Maramba", "Dambwa", "Libuyu", "Linda", "Highlands"],
  Chipata: ["Kapata", "Magazine", "Chiparamba", "Chipata Central"],
  Solwezi: ["Kyawama", "Kimasala", "Messengers", "Town Centre"],
  Kasama: ["Location", "Mukulumpe", "Kasama Central"],
  Mansa: ["Senama", "Buntungwa", "Mansa Central"],
  Mongu: ["Lealui", "Imwiko", "Mongu Central"],
  Choma: ["Shampande", "Kamwanu", "Choma Central"],
  Mazabuka: ["Nakambala", "Kaleya", "Mazabuka Central"],
  Kafue: ["Shikoswe", "Kafue Estates", "Nangongwe"],
};

function localitiesForDistrict(d: District): Locality[] {
  // Lusaka district → the deep 65-neighborhood list.
  if (d.name === "Lusaka" && d.provinceId === "lusaka") {
    return NEIGHBORHOODS.map((n) => ({
      id: slug(`lusaka-${n.name}`),
      name: n.name,
      districtId: d.id,
      provinceId: d.provinceId,
      type: "neighborhood" as LocalityType,
      population: n.population,
      lat: n.lat,
      lng: n.lng,
    }));
  }

  const wards = CITY_WARDS[d.name];
  const names: Array<[string, LocalityType]> = wards
    ? wards.map((w) => [w, "ward" as LocalityType])
    : [
        [`${d.name} Central`, "ward"],
        [`${d.name} Township`, "ward"],
        [`${d.name} Rural`, "village"],
      ];

  return names.map(([name, type], i) => ({
    id: slug(`${d.name}-${name}`),
    name,
    districtId: d.id,
    provinceId: d.provinceId,
    type,
    population: Math.round(d.population / (names.length + 1)),
    lat: d.lat + jit(name, 3) * 0.02,
    lng: d.lng + jit(name, 11) * 0.02,
  }));
}

export const LOCALITIES: Locality[] = DISTRICTS.flatMap(localitiesForDistrict);

export const GEO: GeoData = {
  provinces: PROVINCES,
  districts: DISTRICTS,
  localities: LOCALITIES,
};

// Lookups
export const PROVINCE_BY_ID: Record<string, Province> = Object.fromEntries(PROVINCES.map((p) => [p.id, p]));
export const DISTRICT_BY_ID: Record<string, District> = Object.fromEntries(DISTRICTS.map((d) => [d.id, d]));
export const LOCALITIES_BY_DISTRICT: Record<string, Locality[]> = LOCALITIES.reduce(
  (acc, l) => {
    (acc[l.districtId] ??= []).push(l);
    return acc;
  },
  {} as Record<string, Locality[]>,
);

export function lusakaDistrict(): District {
  return DISTRICT_BY_KEY["lusaka:Lusaka"];
}
