// Accept either a direct CSV export URL or a standard Google Sheets edit URL via env
// VITE_GOOGLE_SHEET_URL can be any of:
// - https://docs.google.com/spreadsheets/d/<ID>/export?format=csv&gid=<GID>
// - https://docs.google.com/spreadsheets/d/<ID>/edit?...#gid=<GID>
const RAW_SHEET_URL = (import.meta as any).env?.VITE_GOOGLE_SHEET_URL as string | undefined;

function buildCsvUrlFromInput(input?: string): string {
  if (!input) {
    // Default to existing sheet
    return "https://docs.google.com/spreadsheets/d/1HU-AANvAkXXLqga2rsSMyy5Hhn3_uJ2ewVZ1UrNbC30/export?format=csv&gid=0";
  }
  try {
    const url = new URL(input);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const idIndex = pathParts.findIndex((p) => p === "d");
    const id = idIndex !== -1 ? pathParts[idIndex + 1] : undefined;
    // Try gid from hash first, fallback to query
    const hashGidMatch = url.hash.match(/gid=(\d+)/);
    const gidFromHash = hashGidMatch ? hashGidMatch[1] : undefined;
    const gidFromQuery = url.searchParams.get("gid") || undefined;
    const gid = gidFromHash || gidFromQuery || "0";
    if (id) {
      return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
    }
    // If already an export URL, pass through
    if (url.pathname.includes("/export")) return input;
  } catch {
    // Not a URL, assume already export URL
    return input;
  }
  return input;
}

const SHEET_CSV_URL = buildCsvUrlFromInput(RAW_SHEET_URL);
const proxyAllOrigins = (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`;
const proxyIsoGit = (u: string) => `https://cors.isomorphic-git.org/${u}`;

export interface SheetRow {
  Disease: string;
  Pathogen: string;
  "Outbreak Category": string;
  PathogenType: string;
  Keywords: string;
  // Optional fields if present later: Country, Region, City, Date, Source, Url
  [key: string]: string;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((v) => v.trim());
}

export async function fetchSheetRows(): Promise<SheetRow[]> {
  let res = await fetch(SHEET_CSV_URL, { cache: "no-store" }).catch(() => null as any);
  if (!res || !res.ok) {
    res = await fetch(proxyAllOrigins(SHEET_CSV_URL), { cache: "no-store" }).catch(() => null as any);
  }
  if (!res || !res.ok) {
    res = await fetch(proxyIsoGit(SHEET_CSV_URL), { cache: "no-store" }).catch(() => null as any);
  }
  if (!res || !res.ok) throw new Error(`Failed to fetch sheet: ${res ? res.status : "network"}`);
  const text = await res.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const header = parseCsvLine(lines[0]);
  const rows: SheetRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const obj: Record<string, string> = {};
    for (let c = 0; c < header.length; c++) {
      obj[header[c]] = values[c] ?? "";
    }
    rows.push(obj as SheetRow);
  }
  return rows;
}
