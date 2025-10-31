// Manual location-to-coords mapping for demo purposes (replace later with API)
const GEO_LOOKUP: Record<string, [number, number]> = {
  'Democratic Republic of Congo': [-4.3317, 15.3139],
  'Nigeria': [9.082, 8.6753],
  'Brazil': [-10, -55],
  'Yemen': [15.5527, 48.5164],
  'Singapore': [1.3521, 103.8198],
  'Kenya': [1, 38],
  'India': [22, 78],
};

export function geocodeLocation(location: string): [number, number] | null {
  return GEO_LOOKUP[location.trim()] ?? null;
}

const COUNTRY_NAMES = Object.keys(GEO_LOOKUP);

export function detectCountryInText(text?: string): string | null {
  if (!text) return null;
  const hay = text.toLowerCase();
  for (const name of COUNTRY_NAMES) {
    if (hay.includes(name.toLowerCase())) return name;
  }
  return null;
}

export function resolveCoordinatesFromTexts(texts: Array<string | undefined>): [number, number] | null {
  for (const t of texts) {
    const detected = detectCountryInText(t);
    if (detected) return geocodeLocation(detected);
  }
  return null;
}
