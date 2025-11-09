export async function geocodeWithOpenCage(query: string): Promise<[number, number] | null> {
  const key = (import.meta as any).env?.VITE_OPENCAGE_KEY as string | undefined;
  if (!key || !query) return null;
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${encodeURIComponent(key)}&limit=1&no_annotations=1`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const first = data?.results?.[0]?.geometry;
    if (first && typeof first.lat === "number" && typeof first.lng === "number") {
      return [first.lat, first.lng];
    }
    return null;
  } catch {
    return null;
  }
}

export interface ReverseGeocodeResult {
  country: string;
  countryCode: string;
  city?: string;
  coordinates: [number, number];
}

export async function reverseGeocodeWithOpenCage(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult | null> {
  const key = (import.meta as any).env?.VITE_OPENCAGE_KEY as string | undefined;
  if (!key) return null;
  
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}&key=${encodeURIComponent(key)}&limit=1&no_annotations=1`;
  
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.results?.[0];
    if (!result) return null;
    
    const components = result.components || {};
    const country = components.country || components.country_name || null;
    const countryCode = components.country_code?.toUpperCase() || null;
    const city = components.city || components.town || components.village || components.county || null;
    
    if (!country) return null;
    
    return {
      country,
      countryCode: countryCode || "",
      city: city || undefined,
      coordinates: [lat, lng] as [number, number],
    };
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
}


