// Disease label/color map — used by Top Pathogens, time series, etc.
// Mirrors the design's data.js disease palette but expanded to handle Supabase rows.

const DISEASE_PALETTE: Record<string, string> = {
  "COVID-19": "#6ab7ff",
  COVID: "#6ab7ff",
  "SARS-CoV-2": "#6ab7ff",
  Influenza: "#8eb6ff",
  "H5N1": "#b07cff",
  "H5N1 Avian Flu": "#b07cff",
  "Avian Influenza": "#b07cff",
  "Avian Flu": "#b07cff",
  Measles: "#ffb547",
  Cholera: "#4ee0c4",
  Dengue: "#ff8b6b",
  Ebola: "#ff4a5c",
  Mpox: "#d4a55b",
  Monkeypox: "#d4a55b",
  Poliomyelitis: "#9bd95b",
  Polio: "#9bd95b",
  "Yellow Fever": "#f5d142",
  Marburg: "#ff7676",
  Malaria: "#c69cff",
  Tuberculosis: "#7fc1ad",
  Chikungunya: "#ffa07a",
  Zika: "#a3d977",
  Plague: "#ff6b8b",
  Lassa: "#d28858",
  Nipah: "#e07cff",
  Rabies: "#9b8bff",
  Anthrax: "#cbb98a",
};

const SEEDS = ["#4ee0c4", "#6ab7ff", "#ffb547", "#ff8b6b", "#b07cff", "#d4a55b", "#9bd95b", "#ff7676"];

export function colorForDisease(name: string, fallbackIndex = 0): string {
  if (!name) return SEEDS[fallbackIndex % SEEDS.length];
  if (DISEASE_PALETTE[name]) return DISEASE_PALETTE[name];
  // case-insensitive
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(DISEASE_PALETTE)) {
    if (key.toLowerCase() === lower) return val;
  }
  // hash-based stable color
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return SEEDS[h % SEEDS.length];
}
