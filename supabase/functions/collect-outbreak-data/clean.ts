import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { NormalizedArticle } from "./types.ts";
import { isLikelySameString } from "./utils.ts";

// Normalize title for comparison (more aggressive than isLikelySameString)
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    // Remove common suffixes that don't affect story identity
    .replace(/\s*-\s*(tribune india|ani news|msn|aol\.com|bernama|crispng\.com)$/i, '')
    .replace(/\s*[….]+\s*$/g, '') // Remove trailing ellipses
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove special characters but keep important ones
    .replace(/[^\w\s-]/g, '')
    .trim();
}

// Source priority for deduplication (higher number = more authoritative)
const sourcePriority: Record<string, number> = {
  "WHO": 10,
  "ProMED-mail": 9,
  "CDC": 8,
  "BBC Health": 7,
  "Reuters Health": 6,
  "Google News": 1,
};

function getSourcePriority(source: string): number {
  return sourcePriority[source] || 0;
}

// Deduplicate articles by title similarity
function deduplicateByTitle(articles: NormalizedArticle[]): NormalizedArticle[] {
  const titleMap = new Map<string, NormalizedArticle>();
  
  for (const article of articles) {
    const normalizedTitle = normalizeTitle(article.title);
    
    // Check if we've seen a similar title
    let isDuplicate = false;
    let existingArticle: NormalizedArticle | null = null;
    
    for (const [existingNormalized, existing] of titleMap.entries()) {
      // Check if titles are similar (exact match on normalized title)
      if (normalizedTitle === existingNormalized) {
        isDuplicate = true;
        existingArticle = existing;
        break;
      }
      
      // Also check using the existing utility for fuzzy matching
      if (isLikelySameString(article.title, existing.title)) {
        isDuplicate = true;
        existingArticle = existing;
        break;
      }
    }
    
    if (isDuplicate && existingArticle) {
      // Decide which article to keep based on:
      // 1. Source priority (more authoritative source wins)
      // 2. Content length (more content wins if same source priority)
      const currentPriority = getSourcePriority(article.source);
      const existingPriority = getSourcePriority(existingArticle.source);
      
      const shouldReplace = 
        currentPriority > existingPriority ||
        (currentPriority === existingPriority && 
         article.content.length > existingArticle.content.length);
      
      if (shouldReplace) {
        titleMap.delete(normalizeTitle(existingArticle.title));
        titleMap.set(normalizedTitle, article);
      }
      // Otherwise, keep the existing article
    } else {
      // New unique article
      titleMap.set(normalizedTitle, article);
    }
  }
  
  return Array.from(titleMap.values());
}

export async function cleanDuplicates(
  supabase: SupabaseClient,
  articles: NormalizedArticle[]
) {
  // Step 1: Deduplicate by title similarity within the fetched batch
  console.log(`Before title deduplication: ${articles.length} articles`);
  const deduplicatedByTitle = deduplicateByTitle(articles);
  console.log(`After title deduplication: ${deduplicatedByTitle.length} articles (removed ${articles.length - deduplicatedByTitle.length} duplicates)`);
  
  // Step 2: Filter out articles we've already processed (that have outbreak signals)
  // Only consider articles as duplicates if they have at least one outbreak_signal linked
  // First, get all article IDs that have outbreak signals
  const { data: signals } = await supabase
    .from("outbreak_signals")
    .select("article_id");

  if (!signals || signals.length === 0) {
    // No articles with signals, so no duplicates to filter
    return deduplicatedByTitle;
  }

  // Get unique article IDs
  const articleIdsWithSignals = [...new Set(signals.map((s) => s.article_id))];

  // Get URLs of articles that have outbreak signals
  const { data: existingArticleUrls } = await supabase
    .from("news_articles")
    .select("url")
    .in("id", articleIdsWithSignals);

  const existingArticleUrlsSet = new Set(
    (existingArticleUrls ?? []).map((a) => a.url)
  );
  
  // Also check by title to catch duplicates that were stored with different URLs
  const { data: existingArticles } = await supabase
    .from("news_articles")
    .select("title, url")
    .in("id", articleIdsWithSignals);
  
  const existingTitlesSet = new Set(
    (existingArticles ?? []).map((a) => normalizeTitle(a.title))
  );
  
  const filtered = deduplicatedByTitle.filter((a) => {
    // Filter out if URL matches
    if (existingArticleUrlsSet.has(a.url)) {
      return false;
    }
    // Filter out if normalized title matches
    if (existingTitlesSet.has(normalizeTitle(a.title))) {
      return false;
    }
    return true;
  });
  
  console.log(`After URL/title deduplication with database: ${filtered.length} articles (removed ${deduplicatedByTitle.length - filtered.length} already processed)`);
  
  return filtered;
}
