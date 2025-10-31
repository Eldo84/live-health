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


