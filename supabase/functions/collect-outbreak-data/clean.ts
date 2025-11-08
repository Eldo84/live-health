import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { NormalizedArticle } from "./types.ts";

export async function cleanDuplicates(
  supabase: SupabaseClient,
  articles: NormalizedArticle[]
) {
  // Only consider articles as duplicates if they have at least one outbreak_signal linked
  // First, get all article IDs that have outbreak signals
  const { data: signals } = await supabase
    .from("outbreak_signals")
    .select("article_id");

  if (!signals || signals.length === 0) {
    // No articles with signals, so no duplicates to filter
    return articles;
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
  return articles.filter((a) => !existingArticleUrlsSet.has(a.url));
}
