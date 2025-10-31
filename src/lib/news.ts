export interface NewsArticle {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
}

const rssProxy = (rssUrl: string) =>
  `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

export async function fetchGoogleNewsByKeyword(keyword: string, limit = 5): Promise<NewsArticle[]> {
  const base = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword + " outbreak")}&hl=en-US&gl=US&ceid=US:en`;
  const res = await fetch(rssProxy(base), { cache: "no-store" });
  if (!res.ok) throw new Error(`News fetch failed: ${res.status}`);
  const data = await res.json();
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.slice(0, limit).map((it: any) => ({
    title: it.title || "",
    link: it.link || it.guid || "",
    pubDate: it.pubDate || it.published || undefined,
    description: it.description || it.content || undefined,
  }));
}


