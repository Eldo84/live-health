// Curated burden-of-disease (BoD) dataset for the Global Health Index page.
// We don't currently track BoD metrics in Supabase, so this mirrors the design's
// curated set and exposes the shape the GHI page consumes.

export const GHI_CATEGORIES = [
  { id: "all", label: "All categories" },
  { id: "communicable", label: "Communicable, maternal, neonatal" },
  { id: "ncd", label: "Non-communicable diseases" },
  { id: "injuries", label: "Injuries" },
  { id: "mental", label: "Mental & substance use" },
] as const;

export type GhiCategory = (typeof GHI_CATEGORIES)[number]["id"];

export interface GhiDisease {
  id: string;
  name: string;
  cat: GhiCategory;
  prevalence: number; // per 1k
  incidence: number;
  mortality: number;
  dalys: number;
  riskFactors: string[];
}

export const GHI_DISEASES: GhiDisease[] = [
  { id: "ischemic", name: "Ischemic heart disease", cat: "ncd", prevalence: 1842, incidence: 412, mortality: 0.123, dalys: 187, riskFactors: ["High BP", "Smoking", "High BMI", "Diet", "Inactivity"] },
  { id: "stroke", name: "Stroke", cat: "ncd", prevalence: 1018, incidence: 213, mortality: 0.089, dalys: 143, riskFactors: ["High BP", "Smoking", "Diabetes", "Diet"] },
  { id: "lri", name: "Lower respiratory infections", cat: "communicable", prevalence: 844, incidence: 612, mortality: 0.082, dalys: 102, riskFactors: ["Air pollution", "Undernutrition", "Smoking"] },
  { id: "diabetes", name: "Diabetes mellitus", cat: "ncd", prevalence: 672, incidence: 184, mortality: 0.024, dalys: 91, riskFactors: ["High BMI", "Diet", "Inactivity", "Genetics"] },
  { id: "depressive", name: "Depressive disorders", cat: "mental", prevalence: 582, incidence: 142, mortality: 0.004, dalys: 72, riskFactors: ["Trauma", "Substance use", "Genetics"] },
  { id: "copd", name: "COPD", cat: "ncd", prevalence: 391, incidence: 88, mortality: 0.061, dalys: 84, riskFactors: ["Smoking", "Air pollution", "Occupational dust"] },
  { id: "tb", name: "Tuberculosis", cat: "communicable", prevalence: 244, incidence: 120, mortality: 0.041, dalys: 62, riskFactors: ["HIV", "Undernutrition", "Smoking", "Crowding"] },
  { id: "roadinj", name: "Road injuries", cat: "injuries", prevalence: 118, incidence: 64, mortality: 0.018, dalys: 56, riskFactors: ["Speed", "Alcohol", "Helmet absent"] },
  { id: "hiv", name: "HIV/AIDS", cat: "communicable", prevalence: 371, incidence: 39, mortality: 0.019, dalys: 48, riskFactors: ["Unsafe sex", "Injection drug use"] },
  { id: "anxiety", name: "Anxiety disorders", cat: "mental", prevalence: 461, incidence: 102, mortality: 0.001, dalys: 44, riskFactors: ["Trauma", "Genetics", "Substance use"] },
  { id: "asthma", name: "Asthma", cat: "ncd", prevalence: 342, incidence: 98, mortality: 0.004, dalys: 31, riskFactors: ["Air pollution", "Allergens", "Smoking"] },
  { id: "malaria", name: "Malaria", cat: "communicable", prevalence: 202, incidence: 240, mortality: 0.012, dalys: 41, riskFactors: ["Vector exposure", "ITN gap"] },
];

export const GHI_YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

export function makeTrend(base: number, vol = 0.06, dir = 0.012): number[] {
  return GHI_YEARS.map(
    (_, i) => Math.max(0, +(base * (1 + dir * i + Math.sin(i * 1.3) * vol)).toFixed(1))
  );
}

export interface GhiCountry {
  code: string;
  name: string;
  ghi: number;
  pop: number;
  region: string;
  factor: number;
}

export const GHI_COUNTRIES: GhiCountry[] = [
  { code: "NOR", name: "Norway", ghi: 8.9, pop: 5.5, region: "Europe", factor: 0.62 },
  { code: "CHE", name: "Switzerland", ghi: 8.7, pop: 8.8, region: "Europe", factor: 0.64 },
  { code: "SGP", name: "Singapore", ghi: 8.6, pop: 5.9, region: "Asia", factor: 0.66 },
  { code: "AUS", name: "Australia", ghi: 8.4, pop: 26, region: "Oceania", factor: 0.68 },
  { code: "JPN", name: "Japan", ghi: 8.0, pop: 125, region: "Asia", factor: 0.74 },
  { code: "DEU", name: "Germany", ghi: 8.1, pop: 84, region: "Europe", factor: 0.78 },
  { code: "GBR", name: "United Kingdom", ghi: 7.6, pop: 67, region: "Europe", factor: 0.84 },
  { code: "USA", name: "United States", ghi: 7.4, pop: 335, region: "N. Am.", factor: 0.92 },
  { code: "BRA", name: "Brazil", ghi: 6.2, pop: 215, region: "S. Am.", factor: 1.18 },
  { code: "CHN", name: "China", ghi: 7.1, pop: 1410, region: "Asia", factor: 0.94 },
  { code: "IND", name: "India", ghi: 5.4, pop: 1400, region: "S. Asia", factor: 1.34 },
  { code: "NGA", name: "Nigeria", ghi: 4.2, pop: 220, region: "Africa", factor: 1.62 },
  { code: "COD", name: "DR Congo", ghi: 3.6, pop: 99, region: "Africa", factor: 1.74 },
  { code: "YEM", name: "Yemen", ghi: 2.9, pop: 34, region: "M. East", factor: 1.92 },
];
