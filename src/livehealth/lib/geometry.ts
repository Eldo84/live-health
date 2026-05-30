// Equirectangular world geometry helpers for the dotted choropleth map.

export type LngLat = [number, number];

export const CONTINENTS: Record<string, LngLat[]> = {
  "N. America": [
    [-167, 65], [-150, 71], [-128, 70], [-115, 73], [-100, 74], [-85, 73], [-65, 82], [-55, 79],
    [-58, 67], [-65, 57], [-55, 52], [-58, 46], [-67, 44], [-74, 40], [-78, 34], [-82, 25],
    [-97, 18], [-105, 21], [-117, 32], [-124, 38], [-128, 49], [-138, 58], [-152, 59], [-165, 55],
  ],
  "S. America": [
    [-81, 11], [-72, 11], [-60, 9], [-50, 4], [-35, -5], [-35, -22], [-43, -22], [-50, -31],
    [-58, -40], [-66, -50], [-72, -54], [-74, -50], [-71, -42], [-72, -30], [-79, -15], [-81, -2],
  ],
  Europe: [
    [-9, 36], [-4, 43], [2, 51], [-3, 58], [10, 60], [18, 69], [30, 69], [33, 60], [40, 55],
    [44, 48], [40, 42], [28, 41], [20, 40], [14, 38], [5, 37], [-3, 36],
  ],
  Africa: [
    [-17, 21], [-10, 28], [-4, 32], [10, 36], [24, 32], [33, 30], [35, 22], [43, 12], [51, 12],
    [50, 1], [42, -12], [35, -23], [20, -34], [14, -21], [8, -5], [-2, 5], [-12, 9], [-17, 15],
  ],
  "M. East": [
    [33, 30], [35, 38], [45, 40], [55, 38], [60, 28], [55, 17], [44, 12], [40, 17], [35, 22],
  ],
  Asia: [
    [40, 42], [44, 48], [50, 55], [60, 62], [80, 70], [110, 76], [140, 73], [165, 69], [170, 62],
    [160, 56], [148, 46], [140, 38], [135, 33], [127, 32], [123, 24], [112, 21], [105, 22],
    [98, 27], [90, 28], [78, 32], [70, 40], [58, 42], [50, 42],
  ],
  "S. Asia": [
    [68, 8], [78, 8], [85, 20], [90, 26], [80, 33], [72, 34], [68, 24],
  ],
  "SE Asia": [
    [95, 1], [105, 5], [120, 2], [133, -3], [140, -9], [127, -10], [110, -9], [100, -3],
  ],
  Oceania: [
    [114, -22], [130, -13], [140, -11], [152, -24], [148, -38], [137, -37], [115, -34],
  ],
};

export const GREENLAND: LngLat[] = [
  [-55, 60], [-30, 60], [-22, 77], [-32, 83], [-55, 80], [-60, 68],
];

export type Projection = (lng: number, lat: number) => [number, number];

export function makeProjection(W: number, H: number, latMax = 78, latMin = -56): Projection {
  return (lng, lat) => {
    const x = ((lng + 180) / 360) * W;
    const y = ((latMax - lat) / (latMax - latMin)) * H;
    return [x, y];
  };
}

export function polyToPath(poly: LngLat[], proj: Projection): string {
  return (
    poly
      .map((p, i) => {
        const [x, y] = proj(p[0], p[1]);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ") + " Z"
  );
}

export function pointInPoly(x: number, y: number, poly: LngLat[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-9) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function landPath(proj: Projection): string {
  return (
    Object.values(CONTINENTS)
      .map((p) => polyToPath(p, proj))
      .join(" ") +
    " " +
    polyToPath(GREENLAND, proj)
  );
}

// Map a country / region name to its continent bucket used by the choropleth.
// Covers every country present in the `public.countries` table (the
// `continent` column there is all "Unknown" so we can't rely on it).
const COUNTRY_TO_CONTINENT: Record<string, string> = {
  // North America
  "United States": "N. America", USA: "N. America", "United States of America": "N. America",
  Canada: "N. America", Mexico: "N. America", Bahamas: "N. America", Cuba: "N. America",
  "Dominican Republic": "N. America", Haiti: "N. America", Jamaica: "N. America",
  "El Salvador": "N. America", Guatemala: "N. America", Honduras: "N. America",
  Nicaragua: "N. America", Panama: "N. America", Belize: "N. America",
  "Costa Rica": "N. America", "Puerto Rico": "N. America", "Trinidad and Tobago": "N. America",
  // South America
  Brazil: "S. America", Argentina: "S. America", Chile: "S. America", Colombia: "S. America",
  Peru: "S. America", Venezuela: "S. America", Ecuador: "S. America", Bolivia: "S. America",
  Paraguay: "S. America", Uruguay: "S. America", Guyana: "S. America", Suriname: "S. America",
  "French Guiana": "S. America",
  // Europe
  "United Kingdom": "Europe", UK: "Europe", Ireland: "Europe", France: "Europe", Germany: "Europe",
  Netherlands: "Europe", Spain: "Europe", Italy: "Europe", Poland: "Europe", Belgium: "Europe",
  Austria: "Europe", Greece: "Europe", "Czech Republic": "Europe", Russia: "Europe",
  Portugal: "Europe", Sweden: "Europe", Norway: "Europe", Denmark: "Europe", Finland: "Europe",
  Switzerland: "Europe", Hungary: "Europe", Romania: "Europe", Ukraine: "Europe",
  Luxembourg: "Europe", Belarus: "Europe", Armenia: "Europe", Georgia: "Europe",
  // Middle East
  "Saudi Arabia": "M. East", Iran: "M. East", Iraq: "M. East", Israel: "M. East", Jordan: "M. East",
  Syria: "M. East", Lebanon: "M. East", "United Arab Emirates": "M. East", Qatar: "M. East",
  Yemen: "M. East", Oman: "M. East", Kuwait: "M. East", Turkey: "M. East", Palestine: "M. East",
  Bahrain: "M. East",
  // Africa
  Nigeria: "Africa", "South Africa": "Africa", "South Sudan": "Africa", Kenya: "Africa",
  Egypt: "Africa", Ghana: "Africa", Ethiopia: "Africa", Tanzania: "Africa", Togo: "Africa",
  Uganda: "Africa", Rwanda: "Africa", "DR Congo": "Africa", "Democratic Republic of Congo": "Africa",
  "Democratic Republic of the Congo": "Africa", Congo: "Africa", Sudan: "Africa",
  Zambia: "Africa", Morocco: "Africa", Algeria: "Africa", Senegal: "Africa",
  Tunisia: "Africa", Libya: "Africa", Cameroon: "Africa", "Côte d'Ivoire": "Africa",
  Niger: "Africa", Mali: "Africa", "Burkina Faso": "Africa", Angola: "Africa",
  Mozambique: "Africa", Zimbabwe: "Africa", Madagascar: "Africa", Burundi: "Africa",
  "Central African Republic": "Africa", "Cape Verde": "Africa", Mauritius: "Africa",
  Mayotte: "Africa", Seychelles: "Africa", "Saint Helena": "Africa",
  // South Asia
  India: "S. Asia", Pakistan: "S. Asia", Bangladesh: "S. Asia", "Sri Lanka": "S. Asia",
  Nepal: "S. Asia", Afghanistan: "S. Asia", Maldives: "S. Asia",
  // SE Asia
  Thailand: "SE Asia", Indonesia: "SE Asia", Philippines: "SE Asia", Vietnam: "SE Asia",
  Singapore: "SE Asia", Malaysia: "SE Asia", Cambodia: "SE Asia", Myanmar: "SE Asia",
  Laos: "SE Asia",
  // East Asia (use Asia bucket)
  China: "Asia", Japan: "Asia", "South Korea": "Asia", "North Korea": "Asia", Mongolia: "Asia",
  Taiwan: "Asia", "Hong Kong": "Asia", Macau: "Asia", Kazakhstan: "Asia",
  // Oceania
  Australia: "Oceania", "New Zealand": "Oceania", Fiji: "Oceania", Vanuatu: "Oceania",
  Tonga: "Oceania", Guam: "Oceania", Antarctica: "Oceania",
};

export function continentForCountry(name: string | undefined, dbContinent?: string): string {
  if (!name) return "Other";
  const normalized = (dbContinent || "").trim();
  if (normalized && normalized.toLowerCase() !== "unknown" && normalized !== "") {
    // Translate Supabase continent values to our buckets.
    if (normalized === "Americas" || normalized === "North America") return "N. America";
    if (normalized === "South America") return "S. America";
    if (normalized === "Africa") return "Africa";
    if (normalized === "Europe") return "Europe";
    if (normalized === "Asia") return COUNTRY_TO_CONTINENT[name] ?? "Asia";
    if (normalized === "Oceania") return "Oceania";
  }
  return COUNTRY_TO_CONTINENT[name] ?? "Other";
}

// Derive continent from raw lat/lng — used when country name is missing.
export function continentFromLatLng(lat: number, lng: number): string {
  if (lat >= 50 && lng >= -10 && lng <= 60) return "Europe";
  if (lat >= 35 && lat < 50 && lng >= -10 && lng <= 60) return "Europe";
  if (lat >= 12 && lat < 35 && lng >= 25 && lng <= 60) return "M. East";
  if (lat >= -35 && lat < 35 && lng >= -20 && lng <= 55) return "Africa";
  if (lat >= 5 && lat < 35 && lng >= 60 && lng <= 95) return "S. Asia";
  if (lat >= -10 && lat < 25 && lng >= 95 && lng <= 145) return "SE Asia";
  if (lat >= 25 && lng >= 95 && lng <= 150) return "Asia";
  if (lat >= 15 && lng >= -180 && lng <= -50) return "N. America";
  if (lat < 15 && lng >= -90 && lng <= -30) return "S. America";
  if (lat < -10 && lng >= 110) return "Oceania";
  return "Other";
}
