import rssParser from "npm:rss-parser@3";

import type { NormalizedArticle } from "./types.ts";

export async function parseRSSFeedArticles({
  url,
  sourceName,
  maxItems = 50,
}: {
  url: string;
  sourceName: string;
  maxItems?: number;
}) {
  const feedArticles: NormalizedArticle[] = [];
  try {
    const parser = new rssParser();
    const feed = await parser.parseURL(url);
    const items = Array.isArray(feed.items) ? feed.items : [];
    feedArticles.push(
      ...items.slice(0, maxItems).map((item: any) => ({
        title: item.title,
        content: item.content,
        url: item.link as string,
        publishedAt: item.isoDate || (item.pubDate as string),
        source: sourceName as any,
      }))
    );
  } catch (e) {
    console.warn(`${sourceName} RSS fetch failed:`, e);
  }
  return feedArticles;
}
