/**
 * COLLECT AUTHORITATIVE SOURCES
 * 
 * This edge function collects outbreak data from authoritative English sources:
 * - WHO (World Health Organization)
 * - CDC (Centers for Disease Control) 
 * - CDC MMWR (Morbidity and Mortality Weekly Report)
 * - BBC Health
 * - ReliefWeb
 * - UK Health Security Agency
 * - STAT News
 * - Contagion Live
 * - NPR Health
 * 
 * NO translation needed - all sources are English.
 * Runs every 3 hours at :00 minutes.
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import type { NormalizedArticle } from "../_shared/types.ts";
import { loadHumanDiseaseCSV, loadVeterinaryDiseaseCSV } from "../_shared/spreadsheet.ts";
import { deepseekMatchArticles } from "../_shared/match.ts";
import { storeArticlesAndSignals } from "../_shared/storage.ts";
import { cleanDuplicates } from "../_shared/clean.ts";
import { stripHtmlTags } from "../_shared/utils.ts";
import { fetchAuthoritativeArticles } from "./fetchNews.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const MATCH_BATCH_SIZE = 60;
const MAX_ARTICLES_TO_PROCESS = 75; // Limit to avoid timeouts (authoritative sources have more content to process)
const OUTBREAK_KEYWORDS = [
  "outbreak",
  "cases",
  "case",
  "infected",
  "infection",
  "epidemic",
  "pandemic",
  "surge",
  "cluster",
  "detected",
  "reports",
  "reported",
  "virus",
  "disease",
  "spread",
  "quarantine",
  "alert",
  "kills",
  "deaths",
  "hospitalized",
  "sick",
  "illness",
  "vector-borne",
  "fever",
];

const isLikelyOutbreakArticle = (article: NormalizedArticle): boolean => {
  const text = `${article.title || ""} ${article.content || ""}`.toLowerCase();
  if (!text.trim()) return false;
  return OUTBREAK_KEYWORDS.some((kw) => text.includes(kw));
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("=== COLLECT AUTHORITATIVE SOURCES ===");
    console.log("Starting authoritative source data collection...");

    // 1) Pre-load spreadsheet data (for caching)
    console.log("Step 1: Loading disease spreadsheets...");
    await Promise.all([
      loadHumanDiseaseCSV(),
      loadVeterinaryDiseaseCSV(),
    ]);

    // 2) Fetch from all authoritative sources (all English)
    console.log("Step 2: Fetching articles from authoritative sources...");
    const fetchedArticles = await fetchAuthoritativeArticles();
    console.log(`Total fetched ${fetchedArticles.length} articles from authoritative sources`);

    // 3) Remove duplicates
    console.log("Step 3: Removing duplicates...");
    const articles = await cleanDuplicates(supabase, fetchedArticles);
    console.log(
      `Removed ${fetchedArticles.length - articles.length} duplicate articles, ${articles.length} remain`
    );

    // 4) Filter for outbreak-related content
    const outbreakCandidates = articles.filter(isLikelyOutbreakArticle);
    if (outbreakCandidates.length && outbreakCandidates.length < articles.length) {
      console.log(`Filtered out ${articles.length - outbreakCandidates.length} low-signal articles, ${outbreakCandidates.length} remain`);
    } else if (outbreakCandidates.length === 0) {
      console.log("Outbreak keyword filter found no matches, using complete dataset");
    }
    let articlesToProcess = outbreakCandidates.length > 0 ? outbreakCandidates : articles;
    
    // Apply article limit to avoid timeouts - prioritize most recent articles
    if (articlesToProcess.length > MAX_ARTICLES_TO_PROCESS) {
      console.log(`Limiting from ${articlesToProcess.length} to ${MAX_ARTICLES_TO_PROCESS} articles (most recent first)`);
      // Sort by publication date (most recent first) and take the limit
      articlesToProcess = articlesToProcess
        .slice()
        .sort((a, b) => {
          const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          return dateB - dateA; // Most recent first
        })
        .slice(0, MAX_ARTICLES_TO_PROCESS);
    }
    console.log(`Processing ${articlesToProcess.length} articles`);

    if (articlesToProcess.length > 0) {
      const shuffled = articlesToProcess.slice().sort(() => Math.random() - 0.5);
      const sample = shuffled.slice(0, 3);
      console.log(`Sample articles: ${sample.map((a) => a.title).join("; ")}`);
    }

    // 5) Clean HTML from content (NO translation needed - all English)
    console.log("Step 4: Cleaning HTML from articles...");
    for (const article of articlesToProcess) {
      article.originalText = article.content;
      article.translatedText = stripHtmlTags(article.content);
      article.content = article.translatedText;
    }

    // Attach IDs for AI matching
    articlesToProcess.forEach((a, index) => {
      a.id = index.toString();
    });

    // 6) Match with AI
    console.log("Step 5: Matching articles to diseases with AI...");
    const matchedArticles: NormalizedArticle[] = [];
    const totalBatches = Math.max(1, Math.ceil(articlesToProcess.length / MATCH_BATCH_SIZE));

    for (let i = 0; i < articlesToProcess.length; i += MATCH_BATCH_SIZE) {
      const batchNumber = Math.floor(i / MATCH_BATCH_SIZE) + 1;
      const batch = articlesToProcess.slice(i, i + MATCH_BATCH_SIZE);
      console.log(`Matching batch ${batchNumber}/${totalBatches} (${batch.length} articles)`);
      try {
        const batchMatches = await deepseekMatchArticles({ articles: batch });
        matchedArticles.push(...batchMatches);
        console.log(`Batch ${batchNumber} matched ${batchMatches.length} articles`);
      } catch (error) {
        console.error(`Batch ${batchNumber} failed during matching:`, error);
      }
    }

    console.log(
      `Matched ${matchedArticles.length} articles, ${articlesToProcess.length - matchedArticles.length} couldn't be matched`
    );

    // 7) Store in database
    console.log("Step 6: Storing data in database...");
    const {
      processedCount,
      signalCount,
      skippedDuplicate,
      skippedNoLocation,
      skippedNoSource,
    } = await storeArticlesAndSignals({ supabase, matchedArticles });

    console.log("=== COLLECTION SUMMARY ===");
    console.log(`Total articles fetched (after dedupe): ${articles.length}`);
    console.log(`Articles evaluated for matching: ${articlesToProcess.length}`);
    console.log(`Articles matched by AI: ${matchedArticles.length}`);
    console.log(`Articles stored in database: ${processedCount}`);
    console.log(`Articles without location: ${skippedNoLocation}`);
    console.log(`Articles skipped - no source: ${skippedNoSource}`);
    console.log(`Signals skipped - duplicates: ${skippedDuplicate}`);
    console.log(`Outbreak signals created: ${signalCount}`);
    console.log("========================");

    // Trigger AI prediction generation if new signals were created
    if (signalCount > 0) {
      console.log(`Triggering AI prediction generation (${signalCount} new signals)...`);
      fetch(`${supabaseUrl}/functions/v1/generate-ai-predictions?refresh=true`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
      }).catch((err) => {
        console.error("Failed to trigger prediction generation:", err);
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        function: "collect-authoritative-sources",
        articlesProcessed: processedCount,
        signalsCreated: signalCount,
        totalArticlesFetched: articlesToProcess.length,
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

