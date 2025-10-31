export interface CDCRecord {
  submission_date?: string;
  state?: string; // two-letter code
  new_case?: string;
  tot_cases?: string;
  new_death?: string;
  tot_death?: string;
  [key: string]: any;
}

// CDC Socrata API sometimes returns dataset.missing or blocks anonymous CORS from browsers.
// We route through a public passthrough to avoid CORS for client-side demos.
const CDC_DATA_URL = "https://data.cdc.gov/resource/9mfq-cb36.json";
const proxyAllOrigins = (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
const proxyIsoGit = (url: string) => `https://cors.isomorphic-git.org/${url}`;

export async function fetchCDCData(limit = 500): Promise<CDCRecord[]> {
  const url = `${CDC_DATA_URL}?$limit=${encodeURIComponent(String(limit))}`;
  let res = await fetch(url, { cache: "no-store" }).catch(() => null as any);
  if (!res || !res.ok) {
    res = await fetch(proxyAllOrigins(url), { cache: "no-store" }).catch(() => null as any);
  }
  if (!res || !res.ok) {
    res = await fetch(proxyIsoGit(url), { cache: "no-store" }).catch(() => null as any);
  }
  if (!res.ok) throw new Error(`Failed to fetch CDC data: ${res.status}`);
  return res.json();
}


