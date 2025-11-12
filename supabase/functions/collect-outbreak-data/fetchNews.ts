import type { NormalizedArticle } from "./types.ts";
import { parseRSSFeedArticles } from "./rss.ts";

// Outbreak-related tags to filter CDC Media API results
const OUTBREAK_RELATED_TAGS = [
  "Measles",
  "Rabies",
  "Vector-borne diseases",
  "Mosquito-Borne Diseases",
  "Influenza",
  "COVID-19",
  "Ebola",
  "Marburg",
  "Cholera",
  "Dengue",
  "Malaria",
  "Yellow Fever",
  "Zika",
  "West Nile",
  "MERS",
  "SARS",
  "Pertussis",
  "Tuberculosis",
  "Meningitis",
  "Hepatitis",
  "Polio",
  "Diphtheria",
  "Tetanus",
  "Anthrax",
  "Plague",
  "Tularemia",
  "Brucellosis",
  "Leptospirosis",
  "Rickettsial Diseases",
  "Outbreak",
  "Epidemic",
  "Pandemic",
  "Disease Surveillance",
  "Disease Outbreak",
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
  syndicateUrl?: string;
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
 * Filters by outbreak-related tags and converts to NormalizedArticle format
 */
async function fetchCDCMediaAPI(
  maxItems: number = 50,
  maxPages: number = 5
): Promise<NormalizedArticle[]> {
  const articles: NormalizedArticle[] = [];
  const seenIds = new Set<number>();

  try {
    let currentPage = 1;
    let hasMore = true;
    const baseUrl = "https://tools.cdc.gov/api/v2/resources/media";

    while (hasMore && currentPage <= maxPages && articles.length < maxItems) {
      const url =
        currentPage === 1
          ? baseUrl
          : `${baseUrl}?pagenum=${currentPage}`;

      const response = await fetch(url);
      if (!response.ok) {
        console.warn(
          `CDC Media API returned ${response.status} for page ${currentPage}`
        );
        break;
      }

      const data: CDCMediaResponse = await response.json();

      if (!data.results || data.results.length === 0) {
        hasMore = false;
        break;
      }

      // Filter for outbreak-related content
      for (const item of data.results) {
        if (articles.length >= maxItems) break;
        if (seenIds.has(item.id)) continue;

        // Check if item has outbreak-related tags
        const hasOutbreakTag = item.tags?.some((tag) =>
          OUTBREAK_RELATED_TAGS.some((outbreakTag) =>
            tag.name.toLowerCase().includes(outbreakTag.toLowerCase()) ||
            outbreakTag.toLowerCase().includes(tag.name.toLowerCase())
          )
        );

        // Also check title and description for outbreak keywords
        const titleLower = item.name.toLowerCase();
        const descLower = (item.description || "").toLowerCase();
        const hasOutbreakKeyword =
          titleLower.includes("outbreak") ||
          titleLower.includes("epidemic") ||
          titleLower.includes("disease") ||
          titleLower.includes("case") ||
          descLower.includes("outbreak") ||
          descLower.includes("epidemic") ||
          descLower.includes("disease") ||
          descLower.includes("case");

        if (hasOutbreakTag || hasOutbreakKeyword) {
          seenIds.add(item.id);

          // Try to fetch content from contentUrl or use description
          let content = item.description || "";
          if (item.contentUrl) {
            try {
              const contentResponse = await fetch(item.contentUrl);
              if (contentResponse.ok) {
                const htmlContent = await contentResponse.text();
                // Extract text from HTML (simple version)
                content = htmlContent
                  .replace(/<[^>]*>/g, " ")
                  .replace(/\s+/g, " ")
                  .trim()
                  .substring(0, 5000); // Limit content length
              }
            } catch (e) {
              // Fallback to description if content fetch fails
              console.warn(
                `Failed to fetch content for CDC item ${item.id}:`,
                e
              );
            }
          }

          articles.push({
            title: item.name,
            content: content || item.description || "",
            url: item.targetUrl || item.sourceUrl,
            publishedAt: item.datePublished || item.dateModified || new Date().toISOString(),
            source: "CDC",
          });
        }
      }

      // Check if there's a next page
      hasMore =
        data.meta.pagination.nextUrl !== undefined &&
        data.meta.pagination.nextUrl !== "" &&
        currentPage < data.meta.pagination.totalPages;

      currentPage++;
    }

    console.log(
      `CDC Media API fetched ${articles.length} outbreak-related articles from ${currentPage - 1} page(s)`
    );
  } catch (e) {
    console.warn("CDC Media API fetch failed:", e);
  }

  return articles;
}

export async function fetchArticles(): Promise<NormalizedArticle[]> {
  const articles: NormalizedArticle[] = [];

  // WHO - World Health Organization Disease Outbreak News
  // Using RSS feed (general news feed which includes health/outbreak news)
  try {
    const whoArticles = await parseRSSFeedArticles({
      url: "https://www.who.int/rss-feeds/news-english.xml",
      sourceName: "WHO",
      maxItems: 50,
    });
    if (whoArticles.length > 0) {
      console.log(`WHO fetched ${whoArticles.length} articles`);
      articles.push(...whoArticles);
    }
  } catch (e) {
    console.warn("WHO fetch failed:", e);
  }

  // CDC - Centers for Disease Control
  // Try CDC Media API first (more structured data)
  try {
    const cdcMediaArticles = await fetchCDCMediaAPI(50, 3);
    if (cdcMediaArticles.length > 0) {
      console.log(`CDC Media API fetched ${cdcMediaArticles.length} articles`);
      articles.push(...cdcMediaArticles);
    }
  } catch (e) {
    console.warn("CDC Media API fetch failed:", e);
  }

  // Fallback to CDC RSS feed if Media API didn't return enough results
  try {
    const cdcRssArticles = await parseRSSFeedArticles({
      url: "https://tools.cdc.gov/api/v2/resources/media/403372.rss",
      sourceName: "CDC",
      maxItems: 30, // Reduced since we're also using Media API
    });
    if (cdcRssArticles.length > 0) {
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
      console.log(`BBC Health fetched ${bbcArticles.length} articles`);
      articles.push(...bbcArticles);
    }
  } catch (e) {
    console.warn("BBC Health fetch failed:", e);
  }

  // Reuters Health
  // Note: Reuters RSS feeds appear to require authentication or have changed
  // Trying alternative health news RSS feeds
  try {
    // Try Reuters health news via Google News search as fallback
    // The direct RSS feeds are not publicly accessible
    console.log("Reuters Health RSS feeds are not publicly accessible, skipping");
  } catch (e) {
    console.warn("Reuters Health fetch failed:", e);
  }

  // ProMED-mail (Program for Monitoring Emerging Diseases)
  try {
    // Try RSS feed first (with www prefix - redirects require it)
    const promadRssUrl = "https://www.promedmail.org/feed/";
    const promadArticles = await parseRSSFeedArticles({
      url: promadRssUrl,
      sourceName: "ProMED-mail",
      maxItems: 50,
    });
    if (promadArticles.length > 0) {
      console.log(`ProMED-mail (RSS) fetched ${promadArticles.length} articles`);
      articles.push(...promadArticles);
    } else {
      // Fallback to WordPress REST API (with www prefix)
      console.log("ProMED-mail RSS empty, trying WordPress API...");
      try {
        const promadResponse = await fetch(
          "https://www.promedmail.org/wp-json/promed/v1/posts?per_page=50"
        );
        if (promadResponse.ok) {
          const promadData = await promadResponse.json();
          if (Array.isArray(promadData)) {
            promadData.forEach((post: any) => {
              if (!post.title || !post.link) return;
              articles.push({
                title: post.title.rendered || post.title,
                content: post.content?.rendered || post.excerpt?.rendered || "",
                url: post.link || post.url,
                publishedAt: post.date || new Date().toISOString(),
                source: "ProMED-mail",
              });
            });
            console.log(`ProMED-mail (WordPress API) fetched ${promadData.length} posts`);
          }
        } else {
          console.warn(`ProMED-mail WordPress API returned ${promadResponse.status}`);
        }
      } catch (apiError: any) {
        console.warn("ProMED-mail WordPress API failed:", apiError?.message);
      }
    }
  } catch (e) {
    console.warn("ProMED-mail fetch failed:", e);
  }

  // Google News (results for outbreaks, in the past 12 hours) via RSS parser
  // Reduced from 24h to 12h to get fresher articles more frequently
  const searchQuery = encodeURIComponent("outbreak when:12h");
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${searchQuery}&hl=en`;
    let googleArticles = await parseRSSFeedArticles({
      url: rssUrl,
      sourceName: "Google News",
      maxItems: 100,
    });
    if (googleArticles.length) {
      // // eliminate duplicates by title
      // const titles = new Set<string>();
      // googleArticles = googleArticles.filter((article) => {
      //   if (titles.has(article.title)) return false;
      //   titles.add(article.title);
      //   return true;
      // });
      console.log(
        `Google News fetched ${googleArticles.length} items for ${searchQuery}`
      );
      articles.push(...googleArticles);
    }
  } catch (e) {
    console.warn(`Google News fetch failed for ${searchQuery}:`, e);
  }

  return articles;
}
