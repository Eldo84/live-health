export interface WHOItem {
  title?: string | null;
  link?: string | null;
  pubDate?: string | null;
  description?: string | null;
}

// WHO DON RSS occasionally moves and often blocks CORS. Use a passthrough.
const WHO_RSS_URL = "https://www.who.int/feeds/entity/csr/don/en/rss.xml";
const proxyAllOrigins = (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
const proxyIsoGit = (url: string) => `https://cors.isomorphic-git.org/${url}`;

export async function fetchWHOItems(): Promise<WHOItem[]> {
  // Try direct; if it fails (CORS/404), try proxied.
  let res = await fetch(WHO_RSS_URL, { cache: "no-store" }).catch(() => null as any);
  if (!res || !res.ok) {
    res = await fetch(proxyAllOrigins(WHO_RSS_URL), { cache: "no-store" }).catch(() => null as any);
  }
  if (!res || !res.ok) {
    res = await fetch(proxyIsoGit(WHO_RSS_URL), { cache: "no-store" }).catch(() => null as any);
  }
  if (!res.ok) throw new Error(`Failed to fetch WHO feed: ${res.status}`);
  const text = await res.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "text/xml");
  const items = Array.from(xml.querySelectorAll("item"));
  return items.map((item) => ({
    title: item.querySelector("title")?.textContent,
    link: item.querySelector("link")?.textContent,
    pubDate: item.querySelector("pubDate")?.textContent,
    description: item.querySelector("description")?.textContent,
  }));
}


