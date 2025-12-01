/**
 * Fetch articles from Google News in ALL supported languages.
 * NO rotation - process all languages every run for data freshness.
 */

import type { NormalizedArticle } from "../_shared/types.ts";
import { parseRSSFeedArticles } from "../_shared/rss.ts";

export const SUPPORTED_LANGUAGES = [
  "en",
  "fr",
  "es",
  "ar",
  "de",
  "pt",
  "it",
  "ru",
  "ja",
  "zh",
];

// Language configuration with proper Google News parameters
// All URLs use news.google.com with hl (language), gl (geographic location), and ceid (content edition)
export const LANGUAGE_CONFIG: Record<string, { gl: string; ceid: string; queries: string[] }> = {
  en: {
    gl: "US",
    ceid: "US:en",
    queries: ["outbreak", "epidemic", "disease", "virus+outbreak"],
  },
  fr: {
    gl: "FR",
    ceid: "FR:fr",
    queries: ["epidemie", "maladie", "virus", "grippe"],
  },
  es: {
    gl: "ES",
    ceid: "ES:es",
    queries: ["brote", "epidemia", "enfermedad", "virus"],
  },
  ar: {
    gl: "SA",
    ceid: "SA:ar",
    queries: ["مرض", "فيروس", "وباء", "انفلونزا", "تفشي"],
  },
  de: {
    gl: "DE",
    ceid: "DE:de",
    queries: ["ausbruch", "epidemie", "krankheit", "virus"],
  },
  pt: {
    gl: "BR",
    ceid: "BR:pt-419",
    queries: ["surto", "epidemia", "doenca", "virus"],
  },
  it: {
    gl: "IT",
    ceid: "IT:it",
    queries: ["epidemia", "malattia", "virus", "focolaio"],
  },
  ru: {
    gl: "RU",
    ceid: "RU:ru",
    queries: ["болезнь", "эпидемия", "вирус", "вспышка"],
  },
  ja: {
    gl: "JP",
    ceid: "JP:ja",
    queries: ["病気", "流行", "ウイルス", "感染症"],
  },
  zh: {
    gl: "TW",
    ceid: "TW:zh-Hant",
    queries: ["疾病", "疫情", "病毒", "传染病", "流感"],
  },
};

// Build URLs from config - all use news.google.com base
export const LANGUAGE_NEWS_SOURCES: Record<string, string[]> = Object.fromEntries(
  Object.entries(LANGUAGE_CONFIG).map(([lang, config]) => [
    lang,
    config.queries.map(
      (q) =>
        `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${lang}&gl=${config.gl}&ceid=${config.ceid}`
    ),
  ])
);

const normalizeTitleKey = (title: string): string =>
  title.toLowerCase().replace(/[^\w]/g, "");

/**
 * Fetch articles for a single language
 */
async function fetchArticlesForLanguage(language: string): Promise<NormalizedArticle[]> {
  const articles: NormalizedArticle[] = [];
  const sources = LANGUAGE_NEWS_SOURCES[language] ?? LANGUAGE_NEWS_SOURCES["en"];
  const seenTitles = new Set<string>();
  
  // Only keep articles from last 72 hours (3 days) - some RSS feeds have delayed timestamps
  const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
  
  for (const rssUrl of sources) {
    try {
      // URLs are already properly constructed with hl, gl, and ceid parameters
      let googleArticles = await parseRSSFeedArticles({
        url: rssUrl,
        sourceName: `Google News (${language})`,
        maxItems: 100,
      });
      
      if (googleArticles.length) {
        // Filter by publication date (last 24 hours)
        googleArticles = googleArticles.filter((article) => {
          try {
            const pubDate = article.publishedAt ? new Date(article.publishedAt) : null;
            if (!pubDate || isNaN(pubDate.getTime())) {
              return true; // Keep if no valid date
            }
            return pubDate >= seventyTwoHoursAgo;
          } catch (e) {
            return true;
          }
        });
        
        // Set language and originalText
        googleArticles.forEach(a => {
          a.language = language;
          a.originalText = a.content;
        });
        
        // Deduplicate by title within this language
        googleArticles = googleArticles.filter((article) => {
          const key = normalizeTitleKey(article.title);
          if (seenTitles.has(key)) return false;
          seenTitles.add(key);
          return true;
        });
        
        articles.push(...googleArticles);
      }
    } catch (e) {
      console.warn(`Google News (${language}) query failed:`, e instanceof Error ? e.message : String(e));
    }
  }
  
  if (articles.length > 0) {
    console.log(`Google News (${language}): ${articles.length} unique articles from ${sources.length} queries`);
  }
  
  return articles;
}

/**
 * Main function: Fetch from Google News in ALL languages (parallel)
 */
export async function fetchMultilingualArticles(): Promise<NormalizedArticle[]> {
  console.log(`Fetching Google News for ${SUPPORTED_LANGUAGES.length} languages in parallel...`);
  
  // Fetch all languages in parallel for speed
  const languageFetchResults = await Promise.all(
    SUPPORTED_LANGUAGES.map(async (lang) => {
      console.log(`Starting fetch for language: ${lang}`);
      const langArticles = await fetchArticlesForLanguage(lang);
      console.log(`Completed ${lang}: ${langArticles.length} articles`);
      return { language: lang, articles: langArticles };
    })
  );
  
  // Combine all articles
  const allArticles: NormalizedArticle[] = [];
  const languageCounts: Record<string, number> = {};
  
  for (const result of languageFetchResults) {
    allArticles.push(...result.articles);
    languageCounts[result.language] = result.articles.length;
  }
  
  // Log summary
  console.log("=== FETCH SUMMARY BY LANGUAGE ===");
  for (const [lang, count] of Object.entries(languageCounts)) {
    console.log(`  ${lang}: ${count} articles`);
  }
  console.log(`=== TOTAL: ${allArticles.length} articles from Google News ===`);
  
  return allArticles;
}

