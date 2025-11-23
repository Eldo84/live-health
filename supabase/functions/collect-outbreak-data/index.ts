import { createClient } from "npm:@supabase/supabase-js@2";
import type { NormalizedArticle } from "./types.ts";
import { loadHumanDiseaseCSV, loadVeterinaryDiseaseCSV } from "./spreadsheet.ts";
import { fetchArticles } from "./fetchNews.ts";
import { deepseekMatchArticles } from "./match.ts";
import { storeArticlesAndSignals } from "./storage.ts";
import { cleanDuplicates } from "./clean.ts";
import { getLanguagesForThisRun } from "./languages.ts";
import { translateToEnglish, stripHtmlTags } from "./utils.ts";

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

    // 2) Fetch news from languages for this run (rotation: 3 languages per run)
    const languagesToProcess = await getLanguagesForThisRun(supabase, 3);
    console.log(`Step 2: Fetching news articles from ${languagesToProcess.length} languages for this run: ${languagesToProcess.join(", ")}`);
    let fetchedArticles: NormalizedArticle[] = [];
    
    for (const lang of languagesToProcess) {
      console.log(`Fetching articles for language: ${lang}`);
      const langArticles = await fetchArticles(lang);
      console.log(`Fetched ${langArticles.length} articles for language: ${lang}`);
      fetchedArticles.push(...langArticles);
    }
    
    console.log(`Total fetched ${fetchedArticles.length} articles from ${languagesToProcess.length} languages`);

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

    // 2.5) Translate non-English articles to English
    console.log("Step 2.5: Translating non-English articles to English...");
    const translationPromises = articles.map(async (article) => {
      // If article is already in English or has no language set, use content as translated text
      if (!article.language || article.language === "en") {
        // Ensure originalText is set even for English articles (may contain HTML)
        if (!article.originalText) {
          article.originalText = article.content;
        }
        // For English articles, strip HTML from content for translated_text
        // This ensures clean text is stored even for English articles
        article.translatedText = stripHtmlTags(article.content);
        // Update content to clean version for AI matching
        article.content = article.translatedText;
        return article;
      }

      // Translate if not English
      if (article.originalText) {
        console.log(`Translating article from ${article.language}: ${article.title.substring(0, 50)}...`);
        try {
          // Translate the originalText (which may contain HTML)
          // translateToEnglish will strip HTML and return clean translated text
          const translated = await translateToEnglish(article.originalText);
          article.translatedText = translated;
          
          // Update content to translated version (clean text) for AI matching
          // Keep originalText (with HTML) for storage - this preserves the original
          article.content = article.translatedText;
        } catch (error) {
          console.warn(`Translation failed for article ${article.title.substring(0, 50)}:`, error);
          // Fallback: strip HTML from original and use as translated text
          const cleanOriginal = stripHtmlTags(article.originalText);
          article.translatedText = cleanOriginal;
          article.content = cleanOriginal;
        }
      } else {
        // No originalText set, use content as both
        article.originalText = article.content;
        // Strip HTML from content for translated text
        article.translatedText = stripHtmlTags(article.content);
      }
      
      return article;
    });
    
    await Promise.all(translationPromises);
    const translatedCount = articles.filter(a => a.language && a.language !== "en").length;
    console.log(`Translation complete: ${translatedCount} articles translated, ${articles.length - translatedCount} already in English`);

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

    // Trigger AI prediction generation if new signals were created
    // Do this asynchronously so it doesn't block the response
    if (signalCount > 0) {
      console.log(`Triggering AI prediction generation (${signalCount} new signals detected)...`);
      // Fire and forget - don't wait for it to complete
      fetch(`${supabaseUrl}/functions/v1/generate-ai-predictions?refresh=true`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
      }).catch((err) => {
        console.error("Failed to trigger prediction generation (non-blocking):", err);
        // Don't throw - this is a background task
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        articlesProcessed: processedCount,
        signalsCreated: signalCount,
        totalArticlesFetched: articles.length,
        articlesMatched: matchedArticles.length,
        predictionsTriggered: signalCount > 0,
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
