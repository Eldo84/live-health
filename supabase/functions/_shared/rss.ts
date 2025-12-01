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
    const parser = new rssParser({
      // Custom fields to parse additional content
      customFields: {
        item: [
          ['content:encoded', 'contentEncoded'],
          ['description', 'description'],
          ['summary', 'summary'],
        ],
      },
    });
    const feed = await parser.parseURL(url);
    const items = Array.isArray(feed.items) ? feed.items : [];
    feedArticles.push(
      ...items.slice(0, maxItems).map((item: any) => {
        // Try multiple content fields in order of preference
        const content = 
          item.content || 
          item.contentSnippet || 
          item.contentEncoded || 
          item.description || 
          item.summary || 
          '';
        
        return {
          title: item.title || '',
          content: content,
          url: item.link || item.guid || '',
          publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
          source: sourceName as any,
        };
      }).filter((article) => article.title && article.url) // Filter out invalid articles
    );
  } catch (e) {
    console.warn(`${sourceName} RSS fetch failed:`, e);
  }
  return feedArticles;
}

