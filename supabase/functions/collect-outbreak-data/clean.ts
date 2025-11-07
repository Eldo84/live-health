import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { NormalizedArticle } from "./types.ts";

export async function cleanDuplicates(
  supabase: SupabaseClient,
  articles: NormalizedArticle[]
) {
  const { data: existingArticleUrls } = await supabase
    .from("news_articles")
    .select("url");
  const existingArticleUrlsSet = new Set(
    (existingArticleUrls ?? []).map((a) => a.url)
  );
  return articles.filter((a) => !existingArticleUrlsSet.has(a.url));
}
