import { createClient } from "npm:@supabase/supabase-js@2";
import type { NormalizedArticle } from "./types.ts";
import { loadHumanDiseaseCSV, loadVeterinaryDiseaseCSV } from "./spreadsheet.ts";
import { fetchArticles } from "./fetchNews.ts";
import { deepseekMatchArticles } from "./match.ts";
import { storeArticlesAndSignals } from "./storage.ts";
import { cleanDuplicates } from "./clean.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    // const opencageKey = Deno.env.get("OPENCAGE_API_KEY");

    console.log("Starting outbreak data collection...");

    // 1) Spreadsheet data (pre-load for caching)
    console.log(
      "Step 1: Fetching spreadsheet data (direct source for cache)..."
    );
    await Promise.all([
      loadHumanDiseaseCSV(),
      loadVeterinaryDiseaseCSV(), // Pre-load for potential use in matching
    ]);

    // 2) Fetch news and remove duplicates
    console.log("Step 2: Fetching news articles...");
    const fetchedArticles: NormalizedArticle[] = await fetchArticles();
    console.log(`Fetched ${fetchedArticles.length} articles`);

    console.log("Removing articles we already tracked ...");
    const articles = await cleanDuplicates(supabase, fetchedArticles);
    console.log(
      `Removed ${
        fetchedArticles.length - articles.length
      } articles that we already tracked`
    );

    console.log(`Processing ${articles.length} new articles`);

    if (articles.length > 0) {
      const shuffled = articles.slice().sort(() => Math.random() - 0.5);
      const sample = shuffled.slice(0, 3);
      console.log(`Sample articles: ${sample.map((a) => a.title).join("; ")}`);
    }

    // attach arbitrary id to articles
    articles.forEach((a, index) => {
      a.id = index.toString();
    });

    // 3) Match
    console.log(
      "Step 3: Matching articles to diseases and extracting locations with AI..."
    );
    const matchedArticles = await deepseekMatchArticles({ articles });
    console.log(
      `Matched ${matchedArticles.length} articles, ${
        articles.length - matchedArticles.length
      } articles couldn't be matched`
    );

    // For debugging skipped articles
    const unmatchedArticles = articles.filter(
      (a) => !matchedArticles.some((m) => m.title === a.title)
    );
    if (unmatchedArticles.length > 0) {
      console.log(
        "UNMATCHED ARTICLES TITLES: ",
        JSON.stringify(
          unmatchedArticles.map((a) => `${a.id} => ${a.title}`),
          null,
          2
        )
      );
    }

    // 4) Store
    console.log("Step 4: Storing data in database...");
    const {
      processedCount,
      signalCount,
      skippedDuplicate,
      skippedNoLocation,
      skippedNoSource,
    } = await storeArticlesAndSignals({ supabase, matchedArticles });

    console.log(
      `Processing complete: ${processedCount} articles, ${signalCount} signals created`
    );
    console.log("=== COLLECTION SUMMARY ===");
    console.log(`Total articles fetched: ${articles.length}`);
    console.log(`Articles matched by AI: ${matchedArticles.length}`);
    console.log(`Articles stored in database: ${processedCount}`);
    console.log(
      `Articles stored without location (shown in news, but no signals created): ${skippedNoLocation}`
    );
    console.log(`Articles skipped - no source: ${skippedNoSource}`);
    console.log(`Signals skipped - duplicates: ${skippedDuplicate}`);
    console.log(`Outbreak signals created: ${signalCount}`);
    console.log("========================");

    return new Response(
      JSON.stringify({
        success: true,
        articlesProcessed: processedCount,
        signalsCreated: signalCount,
        totalArticlesFetched: articles.length,
        articlesMatched: matchedArticles.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
