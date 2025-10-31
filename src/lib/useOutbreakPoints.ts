import { useEffect, useState } from "react";
import { geocodeLocation, resolveCoordinatesFromTexts } from "./geocode";
import { fetchWHOItems } from "./who";
import { fetchCDCData } from "./cdc";
import { fetchSheetRows } from "./sheet";
import { fetchGoogleNewsByKeyword } from "./news";
import { geocodeWithOpenCage } from "./opencage";

export interface OutbreakPoint {
  id: string;
  disease: string;
  location: string;
  category: string;
  pathogen: string;
  keywords: string;
  position: [number, number];
  // Optionals:
  date?: string;
  url?: string;
}

export function useOutbreakPoints() {
  const [points, setPoints] = useState<OutbreakPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const envAny = (import.meta as any).env || {};
        const DISABLE_WHO = String(envAny?.VITE_DISABLE_WHO || "false").toLowerCase() === "true";
        const DISABLE_CDC = String(envAny?.VITE_DISABLE_CDC || "false").toLowerCase() === "true";
        const DISABLE_NEWS = String(envAny?.VITE_DISABLE_NEWS || "false").toLowerCase() === "true";

        const [whoItemsRaw, cdcItemsRaw] = await Promise.all([
          DISABLE_WHO ? Promise.resolve([]) : fetchWHOItems().catch(() => []),
          DISABLE_CDC ? Promise.resolve([]) : fetchCDCData(150).catch(() => []),
        ]);
        const whoItems: any[] = Array.isArray(whoItemsRaw) ? whoItemsRaw : [];
        const cdcItems: any[] = Array.isArray(cdcItemsRaw) ? cdcItemsRaw : [];

        // Simple geocoding budget to avoid excessive external calls
        let geocodeBudget = 80;
        const tryOpenCage = async (text: string): Promise<[number, number] | null> => {
          if (geocodeBudget <= 0) return null;
          const coords = await geocodeWithOpenCage(text);
          if (coords) geocodeBudget--;
          return coords;
        };

        const fromWHO: Array<OutbreakPoint | null> = await Promise.all(whoItems.map(async (item, idx) => {
          const title = (item.title || "").trim();
          const parts = title.split(/\s[–-]\s/);
          const disease = (parts[0] || title || "Unknown").trim();
          const locationGuess = (parts[1] || "").trim() || (item.description || "");
          const location = locationGuess || "Unknown";
          let pos = resolveCoordinatesFromTexts([title, item.description || undefined, location]);
          if (!pos) pos = geocodeLocation(location) || null;
          if (!pos) pos = await tryOpenCage(location);
          if (!pos) return null;
          return {
            id: `who-${idx}-${title}`,
            disease,
            location,
            category: "Emerging Infectious Diseases",
            pathogen: "",
            keywords: "",
            position: pos,
            date: item.pubDate || undefined,
            url: item.link || undefined,
          };
        }))

        const fromCDC: Array<OutbreakPoint | null> = await Promise.all(cdcItems.slice(0, 500).map(async (rec: any, idx: number) => {
          const state = (rec.state || "").trim();
          const location = state ? `United States - ${state}` : "United States";
          const disease = "COVID-19";
          let pos = resolveCoordinatesFromTexts([location, disease]);
          if (!pos) pos = geocodeLocation(location) || null;
          if (!pos) pos = await tryOpenCage(location);
          if (!pos) return null;
          return {
            id: `cdc-${idx}-${state}-${rec.submission_date || ""}`,
            disease,
            location,
            category: "Airborne Outbreaks",
            pathogen: "SARS-CoV-2",
            keywords: "",
            position: pos,
            date: rec.submission_date,
            url: undefined,
          };
        }))

        let result: OutbreakPoint[] = [...fromWHO, ...fromCDC].filter(Boolean) as OutbreakPoint[];

        // Pull keywords from sheet to search recent news
        try {
          const sheetRows = await fetchSheetRows();
          const rawKeywords = sheetRows
            .map((r: any) => (r.Keywords || ""))
            .flatMap((k: string) => k.split(/[,;]+/).map((s) => s.trim()).filter(Boolean));
          const uniqueKeywords = Array.from(new Set(rawKeywords)).slice(0, 20); // throttle overall volume
          let newsArticles: any[] = [];
          if (!DISABLE_NEWS) {
            let errors429 = 0;
            for (let i = 0; i < uniqueKeywords.length; i++) {
              const kw = uniqueKeywords[i];
              try {
                const items = await fetchGoogleNewsByKeyword(kw, 3);
                newsArticles = newsArticles.concat(items);
              } catch (e: any) {
                if (String(e?.message || "").includes("429")) errors429++;
              }
              // small delay between requests to avoid 429
              await new Promise((r) => setTimeout(r, 900));
              // if many 429s, stop early
              if (errors429 >= 3) break;
              // cap total items
              if (newsArticles.length >= 60) break;
            }
          }
          const newsPoints: OutbreakPoint[] = (await Promise.all(newsArticles.map(async (a, idx) => {
            const title = a.title || "";
            const locationGuess = title + " " + (a.description || "");
            let pos = resolveCoordinatesFromTexts([title, a.description]);
            if (!pos) pos = geocodeLocation(locationGuess) || null;
            if (!pos) pos = await tryOpenCage(locationGuess);
            if (!pos) return null as any;
            const category = "Emerging Infectious Diseases";
            return {
              id: `news-${idx}-${a.link}`,
              disease: title.replace(/ - .*$/, "").slice(0, 120) || "Outbreak",
              location: locationGuess.slice(0, 140) || "Unknown",
              category,
              pathogen: "",
              keywords: "",
              position: pos,
              date: a.pubDate,
              url: a.link,
            };
          })) ).filter(Boolean) as OutbreakPoint[];
          result = [...result, ...newsPoints];
        } catch {
          // ignore news failures
        }
        // Fallback: if both sources are empty (or failed silently), try Google Sheet to avoid empty map
        if (result.length === 0) {
          try {
            const raw = await fetchSheetRows();
            const fromSheet: OutbreakPoint[] = [];
            for (let i = 0; i < raw.length; i++) {
              const row = raw[i] as any;
              const key = `${row.Disease}-${row.Keywords || row.Pathogen}-${row["Outbreak Category"]}-${i}`;
              const location = (row.Country || row.Location || row.Disease || "Unknown").trim();
              let pos = resolveCoordinatesFromTexts([row.Keywords, row.Disease, row.Pathogen, location]);
              if (!pos) pos = geocodeLocation(location) || null;
              if (!pos) continue;
              fromSheet.push({
                id: key,
                disease: row.Disease?.trim() || "Unknown",
                location,
                category: row["Outbreak Category"]?.trim() || "Other",
                pathogen: row.Pathogen?.trim() || "",
                keywords: row.Keywords?.trim() || "",
                position: pos,
              });
            }
            result = fromSheet;
          } catch {
            // ignore; we'll surface empty state below
          }
        }

        if (result.length === 0) {
          console.warn("No outbreak data loaded from WHO, CDC, or fallback sheet. Using mock sample.");
          const mock: OutbreakPoint[] = [
            { id: "mock-1", disease: "Cholera", location: "Yemen", category: "Waterborne Outbreaks", pathogen: "Vibrio cholerae", keywords: "", position: [15.5527, 48.5164], date: undefined, url: undefined },
            { id: "mock-2", disease: "Dengue", location: "Singapore", category: "Vector-Borne Outbreaks", pathogen: "DENV", keywords: "", position: [1.3521, 103.8198], date: undefined, url: undefined },
            { id: "mock-3", disease: "Ebola", location: "Democratic Republic of Congo", category: "Emerging Infectious Diseases", pathogen: "EBOV", keywords: "", position: [-4.3317, 15.3139], date: undefined, url: undefined },
            { id: "mock-4", disease: "COVID-19", location: "India", category: "Airborne Outbreaks", pathogen: "SARS-CoV-2", keywords: "", position: [22, 78], date: undefined, url: undefined },
            { id: "mock-5", disease: "Malaria", location: "Kenya", category: "Vector-Borne Outbreaks", pathogen: "Plasmodium falciparum", keywords: "", position: [1, 38], date: undefined, url: undefined },
            { id: "mock-6", disease: "Chikungunya", location: "Brazil", category: "Vector-Borne Outbreaks", pathogen: "CHIKV", keywords: "", position: [-10, -55], date: undefined, url: undefined }
          ];
          result = mock;
        }
        if (active) setPoints(result);
      } catch (e: any) {
        if (active) setError(e?.message || "Failed to load outbreaks");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);
  return { points, loading, error };
}
