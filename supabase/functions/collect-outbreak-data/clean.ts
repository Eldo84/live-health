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

// Authoritative source keywords for filtering
const AUTHORITATIVE_SOURCES = [
  "cdc",
  "centers for disease control",
  "who",
  "world health organization",
  "bbc health",
  "promed",
];

// Check if source is authoritative (reusable helper)
export function isAuthoritativeSource(source: string): boolean {
  const lower = source.toLowerCase();
  return AUTHORITATIVE_SOURCES.some(keyword => lower.includes(keyword));
}

// Optimized deduplicate by title - O(n) instead of O(n²)
// Groups articles by normalized title first, then picks the best from each group
function deduplicateByTitle(articles: NormalizedArticle[]): NormalizedArticle[] {
  // Step 1: Group articles by normalized title (O(n))
  const groups = new Map<string, NormalizedArticle[]>();

  for (const article of articles) {
    const normalizedTitle = normalizeTitle(article.title);
    if (!groups.has(normalizedTitle)) {
      groups.set(normalizedTitle, []);
    }
    groups.get(normalizedTitle)!.push(article);
  }

  // Step 2: For each group, pick the best article by priority and content length
  const deduped: NormalizedArticle[] = [];

  for (const group of groups.values()) {
    if (group.length === 1) {
      // Single article in group - no deduplication needed
      deduped.push(group[0]);
      continue;
    }

    // Multiple articles with same normalized title - pick the best one
    // Select based on: 1) source priority (higher = better), 2) content length (longer = better)
    const best = group.reduce((best, current) => {
      const bestPriority = getSourcePriority(best.source);
      const currentPriority = getSourcePriority(current.source);
      if (
        currentPriority > bestPriority ||
        (currentPriority === bestPriority &&
          current.content.length > best.content.length)
      ) {
        return current;
      }
      return best;
    });
    deduped.push(best);
  }

  return deduped;
}

export async function cleanDuplicates(
  supabase: SupabaseClient,
  articles: NormalizedArticle[]
) {
  // Defensive guard: ensure articles is an array
  if (!Array.isArray(articles) || articles.length === 0) {
    console.log("[CLEAN] No articles to process");
    return articles;
  }

  // Step 1: Deduplicate by title similarity within the fetched batch
  console.log(`[CLEAN] Before title deduplication: ${articles.length} articles`);
  const deduplicatedByTitle = deduplicateByTitle(articles);
  console.log(
    `[CLEAN] After title deduplication: ${deduplicatedByTitle.length} articles (removed ${articles.length - deduplicatedByTitle.length} duplicates)`
  );

  // Step 2: Filter out articles we've already processed (that have outbreak signals)
  // IMPORTANT: Prioritize authoritative sources - if an authoritative source article exists,
  // don't filter it out even if Google News has the same article
  // Only consider articles as duplicates if they have at least one outbreak_signal linked

  // Get all article IDs that have outbreak signals
  const { data: signals, error: signalsError } = await supabase
    .from("outbreak_signals")
    .select("article_id");

  // Defensive guard: handle errors and empty results
  if (signalsError) {
    console.error(`[CLEAN] Error fetching signals: ${signalsError.message}`);
    return deduplicatedByTitle;
  }

  if (!signals || !Array.isArray(signals) || signals.length === 0) {
    // No articles with signals, so no duplicates to filter
    console.log("[CLEAN] No existing signals found, skipping database deduplication");
    return deduplicatedByTitle;
  }

  // Get unique article IDs
  const articleIdsWithSignals = [...new Set(signals.map((s) => s.article_id).filter(Boolean))];

  if (articleIdsWithSignals.length === 0) {
    return deduplicatedByTitle;
  }

  // Batch the query to avoid URL length limits (max ~100 IDs per query)
  const BATCH_SIZE = 100;
  const totalBatches = Math.ceil(articleIdsWithSignals.length / BATCH_SIZE);
  console.log(`[CLEAN] Fetching ${articleIdsWithSignals.length} existing articles in ${totalBatches} batch(es)`);
  
  const existingArticles: any[] = [];
  
  for (let i = 0; i < articleIdsWithSignals.length; i += BATCH_SIZE) {
    const batch = articleIdsWithSignals.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    
    const { data: batchData, error: batchError } = await supabase
      .from("news_articles")
      .select("id, title, url, source_id, news_sources(name)")
      .in("id", batch);

    if (batchError) {
      console.error(`[CLEAN] Error fetching existing articles (batch ${batchNumber}/${totalBatches}): ${batchError.message}`);
      // Continue with other batches even if one fails
      continue;
    }

    if (batchData && Array.isArray(batchData)) {
      existingArticles.push(...batchData);
      console.log(`[CLEAN] Batch ${batchNumber}/${totalBatches}: fetched ${batchData.length} articles`);
    }
  }
  
  console.log(`[CLEAN] Total existing articles fetched: ${existingArticles.length}`);

  // Defensive guard: handle empty results
  if (existingArticles.length === 0) {
    console.log("[CLEAN] No existing articles found, skipping database deduplication");
    return deduplicatedByTitle;
  }

  // Build maps from the joined data
  const sourceMap = new Map<string, string>();
  const existingUrlToSource = new Map<string, string>();
  const existingTitleToSource = new Map<string, string>();
  const existingArticleUrlsSet = new Set<string>();
  const existingTitlesSet = new Set<string>();

  for (const article of existingArticles) {
    // Handle nested source object from join
    const sourceName = article.news_sources
      ? (Array.isArray(article.news_sources)
          ? article.news_sources[0]?.name
          : article.news_sources.name) || "unknown"
      : "unknown";

    const sourceNameLower = sourceName.toLowerCase();
    sourceMap.set(article.source_id, sourceNameLower);

    // Build URL -> source map
    if (article.url) {
      existingArticleUrlsSet.add(article.url);
      existingUrlToSource.set(article.url, sourceNameLower);
    }

    // Build title -> source map
    if (article.title) {
      const normalizedTitle = normalizeTitle(article.title);
      existingTitlesSet.add(normalizedTitle);
      existingTitleToSource.set(normalizedTitle, sourceNameLower);
    }
  }

  // Filter articles, prioritizing authoritative sources
  const filtered = deduplicatedByTitle.filter((a) => {
    const normalizedTitle = normalizeTitle(a.title);

    // Check URL match
    if (existingArticleUrlsSet.has(a.url)) {
      const existingSource = existingUrlToSource.get(a.url) || "unknown";
      // If current article is from authoritative source and existing is from Google News, keep it
      if (isAuthoritativeSource(a.source) && existingSource.includes("google news")) {
        console.log(
          `[CLEAN] Keeping authoritative ${a.source} article (replacing Google News): "${a.title.substring(0, 60)}"`
        );
        return true;
      }
      // Log when filtering out articles from authoritative sources
      if (a.source !== "Google News") {
        console.log(
          `[CLEAN] Filtering out ${a.source} article (URL match, existing source: ${existingSource}): "${a.title.substring(0, 60)}"`
        );
      }
      return false;
    }

    // Check normalized title match
    if (existingTitlesSet.has(normalizedTitle)) {
      const existingSource = existingTitleToSource.get(normalizedTitle) || "unknown";
      // If current article is from authoritative source and existing is from Google News, keep it
      if (isAuthoritativeSource(a.source) && existingSource.includes("google news")) {
        console.log(
          `[CLEAN] Keeping authoritative ${a.source} article (replacing Google News by title): "${a.title.substring(0, 60)}"`
        );
        return true;
      }
      // Log when filtering out articles from authoritative sources
      if (a.source !== "Google News") {
        console.log(
          `[CLEAN] Filtering out ${a.source} article (title match, existing source: ${existingSource}): "${a.title.substring(0, 60)}"`
        );
      }
      return false;
    }
    return true;
  });

  // Improved logging with cleaner format
  const filteredSources = new Map<string, number>();
  filtered.forEach((a) => {
    filteredSources.set(a.source, (filteredSources.get(a.source) || 0) + 1);
  });

  console.log(
    `[CLEAN] After URL/title deduplication with database: ${filtered.length} articles (removed ${deduplicatedByTitle.length - filtered.length} already processed)`
  );

  // Use console.table for cleaner output if available, otherwise fallback to object
  if (filteredSources.size > 0) {
    const sourcesObj = Object.fromEntries(filteredSources);
    console.log("[CLEAN] Sources in filtered articles:");
    console.table(sourcesObj);
  }

  // Log which authoritative sources made it through
  const authoritativeInFiltered = filtered.filter((a) =>
    isAuthoritativeSource(a.source)
  );
  if (authoritativeInFiltered.length > 0) {
    console.log(
      `[CLEAN] Authoritative sources that passed deduplication (${authoritativeInFiltered.length}):`,
      authoritativeInFiltered.map(
        (a) => `${a.source}: "${a.title.substring(0, 50)}"`
      )
    );
  }

  return filtered;
}
