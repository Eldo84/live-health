/**
 * Fetch articles from authoritative English sources ONLY.
 * No Google News, no language rotation.
 */

import type { NormalizedArticle } from "../_shared/types.ts";
import { parseRSSFeedArticles } from "../_shared/rss.ts";

// Helper: retry wrapper for fetch-based requests
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3,
  backoffMs = 500
): Promise<Response> {
  let attempt = 0;
  let lastError: unknown = null;
  while (attempt <= retries) {
    try {
      const response = await fetch(url, options);
      if (response.ok || attempt === retries) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, backoffMs * (attempt + 1)));
    attempt++;
  }
  throw lastError instanceof Error ? lastError : new Error("Fetch failed");
}

// Helper: run async tasks in batches
async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  handler: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const settled = await Promise.allSettled(batch.map(handler));
    settled.forEach((res) => {
      if (res.status === "fulfilled") {
        results.push(res.value);
      }
    });
  }
  return results;
}

// Outbreak-related tags for CDC filtering
const OUTBREAK_RELATED_TAGS = [
  "Measles", "Rabies", "Vector-borne diseases", "Mosquito-Borne Diseases",
  "Influenza", "COVID-19", "Ebola", "Marburg", "Cholera", "Dengue",
  "Malaria", "Yellow Fever", "Zika", "West Nile", "MERS", "SARS",
  "Pertussis", "Tuberculosis", "Meningitis", "Hepatitis", "Polio",
  "Diphtheria", "Tetanus", "Anthrax", "Plague", "Tularemia",
  "Brucellosis", "Leptospirosis", "Rickettsial Diseases",
  "Outbreak", "Epidemic", "Pandemic", "Disease Surveillance", "Disease Outbreak",
];

interface CDCMediaItem {
  id: number;
  name: string;
  description: string | null;
  tags: Array<{ name: string; type: string }>;
  sourceUrl: string;
  targetUrl: string;
  datePublished: string;
  dateModified: string;
  contentUrl?: string;
}

interface CDCMediaResponse {
  meta: {
    status: number;
    pagination: {
      total: number;
      count: number;
      totalPages: number;
      nextUrl?: string;
    };
  };
  results: CDCMediaItem[];
}

/**
 * Fetches outbreak-related content from CDC Media API
 */
async function fetchCDCMediaAPI(maxItems = 50, maxPages = 3): Promise<NormalizedArticle[]> {
  const articles: NormalizedArticle[] = [];
  const seenIds = new Set<number>();

  try {
    let currentPage = 1;
    let hasMore = true;
    const baseUrl = "https://tools.cdc.gov/api/v2/resources/media";

    while (hasMore && currentPage <= maxPages && articles.length < maxItems) {
      const url = currentPage === 1 ? baseUrl : `${baseUrl}?pagenum=${currentPage}`;
      const response = await fetchWithRetry(url);
      
      if (!response.ok) {
        console.warn(`CDC Media API returned ${response.status} for page ${currentPage}`);
        break;
      }

      const data: CDCMediaResponse = await response.json();
      if (!data.results || data.results.length === 0) {
        hasMore = false;
        break;
      }

      const itemsToProcess: CDCMediaItem[] = [];

      for (const item of data.results) {
        if (articles.length + itemsToProcess.length >= maxItems) break;
        if (seenIds.has(item.id)) continue;

        const hasOutbreakTag = item.tags?.some((tag) =>
          OUTBREAK_RELATED_TAGS.some((outbreakTag) =>
            tag.name.toLowerCase().includes(outbreakTag.toLowerCase()) ||
            outbreakTag.toLowerCase().includes(tag.name.toLowerCase())
          )
        );

        const titleLower = item.name.toLowerCase();
        const descLower = (item.description || "").toLowerCase();
        const hasOutbreakKeyword =
          titleLower.includes("outbreak") ||
          titleLower.includes("epidemic") ||
          titleLower.includes("disease") ||
          titleLower.includes("case") ||
          descLower.includes("outbreak") ||
          descLower.includes("epidemic");

        if (hasOutbreakTag || hasOutbreakKeyword) {
          seenIds.add(item.id);
          itemsToProcess.push(item);
        }
      }

      const processedItems = await processInBatches(itemsToProcess, 5, async (item) => {
        let content = item.description || "";
        if (item.contentUrl) {
          try {
            const contentResponse = await fetchWithRetry(item.contentUrl);
            if (contentResponse.ok) {
              const htmlContent = await contentResponse.text();
              content = htmlContent
                .replace(/<[^>]*>/g, " ")
                .replace(/\s+/g, " ")
                .trim()
                .substring(0, 5000);
            }
          } catch (e) {
            console.warn(`Failed to fetch CDC content for ${item.id}:`, e);
          }
        }
        return {
          title: item.name,
          content: content || item.description || "",
          url: item.targetUrl || item.sourceUrl,
          publishedAt: item.datePublished || item.dateModified || new Date().toISOString(),
          source: "CDC",
          language: "en",
          originalText: content || item.description || "",
        } as NormalizedArticle;
      });

      articles.push(...processedItems);
      hasMore = data.meta.pagination.nextUrl !== undefined && 
                data.meta.pagination.nextUrl !== "" &&
                currentPage < data.meta.pagination.totalPages;
      currentPage++;
    }

    console.log(`CDC Media API fetched ${articles.length} articles from ${currentPage - 1} page(s)`);
  } catch (e) {
    console.warn("CDC Media API fetch failed:", e);
  }

  return articles;
}

/**
 * Main function: Fetch from ALL authoritative English sources
 */
export async function fetchAuthoritativeArticles(): Promise<NormalizedArticle[]> {
  const articles: NormalizedArticle[] = [];

  // WHO - World Health Organization
  try {
    const whoArticles = await parseRSSFeedArticles({
      url: "https://www.who.int/rss-feeds/news-english.xml",
      sourceName: "WHO",
      maxItems: 50,
    });
    if (whoArticles.length > 0) {
      whoArticles.forEach(a => {
        a.language = "en";
        a.originalText = a.content;
      });
      console.log(`WHO fetched ${whoArticles.length} articles`);
      articles.push(...whoArticles);
    }
  } catch (e) {
    console.warn("WHO RSS fetch failed:", e);
  }

  // CDC Media API
  try {
    const cdcMediaArticles = await fetchCDCMediaAPI(50, 3);
    if (cdcMediaArticles.length > 0) {
      console.log(`CDC Media API fetched ${cdcMediaArticles.length} articles`);
      articles.push(...cdcMediaArticles);
    }
  } catch (e) {
    console.warn("CDC Media API fetch failed:", e);
  }

  // CDC RSS Fallback
  try {
    const cdcRssArticles = await parseRSSFeedArticles({
      url: "https://tools.cdc.gov/api/v2/resources/media/403372.rss",
      sourceName: "CDC",
      maxItems: 30,
    });
    if (cdcRssArticles.length > 0) {
      cdcRssArticles.forEach(a => {
        a.language = "en";
        a.originalText = a.content;
      });
      console.log(`CDC RSS fetched ${cdcRssArticles.length} articles`);
      articles.push(...cdcRssArticles);
    }
  } catch (e) {
    console.warn("CDC RSS fetch failed:", e);
  }

  // BBC Health
  try {
    const bbcArticles = await parseRSSFeedArticles({
      url: "https://feeds.bbci.co.uk/news/health/rss.xml",
      sourceName: "BBC Health",
      maxItems: 50,
    });
    if (bbcArticles.length > 0) {
      bbcArticles.forEach(a => {
        a.language = "en";
        a.originalText = a.content;
      });
      console.log(`BBC Health fetched ${bbcArticles.length} articles`);
      articles.push(...bbcArticles);
    }
  } catch (e) {
    console.warn("BBC Health fetch failed:", e);
  }

  // CDC MMWR (Morbidity and Mortality Weekly Report)
  try {
    const cdcMmwrArticles = await parseRSSFeedArticles({
      url: "https://tools.cdc.gov/api/v2/resources/media/342778.rss",
      sourceName: "CDC MMWR",
      maxItems: 50,
    });
    if (cdcMmwrArticles.length > 0) {
      cdcMmwrArticles.forEach(a => {
        a.language = "en";
        a.originalText = a.content;
      });
      console.log(`CDC MMWR fetched ${cdcMmwrArticles.length} articles`);
      articles.push(...cdcMmwrArticles);
    }
  } catch (e) {
    console.warn("CDC MMWR RSS fetch failed:", e);
  }

  // ReliefWeb Epidemic Reports
  try {
    const reliefWebArticles = await parseRSSFeedArticles({
      url: "https://reliefweb.int/updates/rss.xml?disaster_type=Epidemic",
      sourceName: "ReliefWeb",
      maxItems: 30,
    });
    if (reliefWebArticles.length > 0) {
      reliefWebArticles.forEach(a => {
        a.language = "en";
        a.originalText = a.content;
      });
      console.log(`ReliefWeb Epidemic fetched ${reliefWebArticles.length} articles`);
      articles.push(...reliefWebArticles);
    }
  } catch (e) {
    console.warn("ReliefWeb RSS fetch failed:", e);
  }

  // UK Health Security Agency
  try {
    const ukHsaArticles = await parseRSSFeedArticles({
      url: "https://www.gov.uk/government/organisations/uk-health-security-agency.atom",
      sourceName: "UK Health Security Agency",
      maxItems: 30,
    });
    if (ukHsaArticles.length > 0) {
      ukHsaArticles.forEach(a => {
        a.language = "en";
        a.originalText = a.content;
      });
      console.log(`UK HSA fetched ${ukHsaArticles.length} articles`);
      articles.push(...ukHsaArticles);
    }
  } catch (e) {
    console.warn("UK HSA RSS fetch failed:", e);
  }

  // STAT News
  try {
    const statNewsArticles = await parseRSSFeedArticles({
      url: "https://www.statnews.com/feed/",
      sourceName: "STAT News",
      maxItems: 30,
    });
    if (statNewsArticles.length > 0) {
      statNewsArticles.forEach(a => {
        a.language = "en";
        a.originalText = a.content;
      });
      console.log(`STAT News fetched ${statNewsArticles.length} articles`);
      articles.push(...statNewsArticles);
    }
  } catch (e) {
    console.warn("STAT News RSS fetch failed:", e);
  }

  // Contagion Live
  try {
    const contagionArticles = await parseRSSFeedArticles({
      url: "https://www.contagionlive.com/rss",
      sourceName: "Contagion Live",
      maxItems: 40,
    });
    if (contagionArticles.length > 0) {
      contagionArticles.forEach(a => {
        a.language = "en";
        a.originalText = a.content;
      });
      console.log(`Contagion Live fetched ${contagionArticles.length} articles`);
      articles.push(...contagionArticles);
    }
  } catch (e) {
    console.warn("Contagion Live RSS fetch failed:", e);
  }

  // NPR Health
  try {
    const nprArticles = await parseRSSFeedArticles({
      url: "https://feeds.npr.org/103537970/rss.xml",
      sourceName: "NPR Health",
      maxItems: 20,
    });
    if (nprArticles.length > 0) {
      nprArticles.forEach(a => {
        a.language = "en";
        a.originalText = a.content;
      });
      console.log(`NPR Health fetched ${nprArticles.length} articles`);
      articles.push(...nprArticles);
    }
  } catch (e) {
    console.warn("NPR Health RSS fetch failed:", e);
  }

  console.log(`=== TOTAL: ${articles.length} articles from authoritative sources ===`);
  return articles;
}

