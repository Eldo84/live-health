/**
 * COLLECT MULTILINGUAL NEWS
 * 
 * This edge function collects outbreak data from Google News in ALL 10 languages:
 * - en (English)
 * - fr (French)
 * - es (Spanish)
 * - ar (Arabic)
 * - de (German)
 * - pt (Portuguese)
 * - it (Italian)
 * - ru (Russian)
 * - ja (Japanese)
 * - zh (Chinese)
 * 
 * Includes translation for non-English articles.
 * Runs every 3 hours at :30 minutes (offset from authoritative sources).
 * 
 * NO ROTATION - Processes ALL languages every run for faster data freshness.
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import type { NormalizedArticle } from "../_shared/types.ts";
import { loadHumanDiseaseCSV, loadVeterinaryDiseaseCSV } from "../_shared/spreadsheet.ts";
import { deepseekMatchArticles } from "../_shared/match.ts";
import { storeArticlesAndSignals } from "../_shared/storage.ts";
import { cleanDuplicates } from "../_shared/clean.ts";
import { translateToEnglish, stripHtmlTags } from "../_shared/utils.ts";
import { fetchMultilingualArticles, SUPPORTED_LANGUAGES } from "./fetchNews.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const MATCH_BATCH_SIZE = 60;
const MAX_ARTICLES_TO_PROCESS = 100; // Limit to avoid timeouts (lower than authoritative due to translation overhead)
// English keywords
const OUTBREAK_KEYWORDS_EN = [
  "outbreak", "cases", "case", "infected", "infection", "epidemic", "pandemic",
  "surge", "cluster", "detected", "reports", "reported", "virus", "disease",
  "spread", "quarantine", "alert", "kills", "deaths", "hospitalized", "sick",
  "illness", "vector-borne", "fever", "flu", "influenza", "cholera", "ebola",
  "measles", "malaria", "dengue", "marburg", "mpox", "hiv", "aids", "covid",
];

// Chinese keywords (Simplified + Traditional)
const OUTBREAK_KEYWORDS_ZH = [
  "疫情", "病例", "感染", "流行", "疾病", "传染", "爆发", "确诊", "死亡",
  "病毒", "流感", "霍乱", "埃博拉", "麻疹", "疟疾", "登革热", "猴痘",
  "艾滋", "新冠", "肺炎", "发热", "隔离", "防控",
];

// Arabic keywords
const OUTBREAK_KEYWORDS_AR = [
  "وباء", "حالات", "إصابة", "مرض", "فيروس", "تفشي", "انتشار", "وفاة", "وفيات",
  "إنفلونزا", "كوليرا", "إيبولا", "حصبة", "ملاريا", "حمى", "عدوى", "كورونا",
  "جدري", "إيدز", "سل", "حجر", "صحي",
];

// French keywords
const OUTBREAK_KEYWORDS_FR = [
  "épidémie", "cas", "infection", "maladie", "virus", "pandémie", "grippe",
  "décès", "mort", "fièvre", "choléra", "rougeole", "paludisme", "dengue",
];

// Spanish keywords
const OUTBREAK_KEYWORDS_ES = [
  "brote", "casos", "infección", "enfermedad", "virus", "epidemia", "pandemia",
  "gripe", "muerte", "fiebre", "cólera", "sarampión", "malaria", "dengue",
];

// Russian keywords
const OUTBREAK_KEYWORDS_RU = [
  "вспышка", "случаи", "инфекция", "болезнь", "вирус", "эпидемия", "пандемия",
  "грипп", "смерть", "лихорадка", "холера", "корь", "малярия",
];

// Japanese keywords
const OUTBREAK_KEYWORDS_JA = [
  "感染", "発生", "病気", "ウイルス", "流行", "死亡", "患者", "インフルエンザ",
  "コレラ", "麻疹", "マラリア", "デング熱", "エボラ", "発熱",
];

// Combined keywords for all languages
const ALL_OUTBREAK_KEYWORDS = [
  ...OUTBREAK_KEYWORDS_EN,
  ...OUTBREAK_KEYWORDS_ZH,
  ...OUTBREAK_KEYWORDS_AR,
  ...OUTBREAK_KEYWORDS_FR,
  ...OUTBREAK_KEYWORDS_ES,
  ...OUTBREAK_KEYWORDS_RU,
  ...OUTBREAK_KEYWORDS_JA,
];

const isLikelyOutbreakArticle = (article: NormalizedArticle): boolean => {
  const text = `${article.title || ""} ${article.content || ""}`.toLowerCase();
  if (!text.trim()) return false;
  return ALL_OUTBREAK_KEYWORDS.some((kw) => text.toLowerCase().includes(kw.toLowerCase()));
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("=== COLLECT MULTILINGUAL NEWS ===");
    console.log(`Processing ALL ${SUPPORTED_LANGUAGES.length} languages: ${SUPPORTED_LANGUAGES.join(", ")}`);

    // 1) Pre-load spreadsheet data (for caching)
    console.log("Step 1: Loading disease spreadsheets...");
    await Promise.all([
      loadHumanDiseaseCSV(),
      loadVeterinaryDiseaseCSV(),
    ]);

    // 2) Fetch from Google News in ALL languages (parallel)
    console.log("Step 2: Fetching articles from Google News (all languages)...");
    const fetchedArticles = await fetchMultilingualArticles();
    console.log(`Total fetched ${fetchedArticles.length} articles from ${SUPPORTED_LANGUAGES.length} languages`);

    // 3) Remove duplicates
    console.log("Step 3: Removing duplicates...");
    const articles = await cleanDuplicates(supabase, fetchedArticles);
    console.log(
      `Removed ${fetchedArticles.length - articles.length} duplicate articles, ${articles.length} remain`
    );

    // 4) Filter for outbreak-related content using MULTILINGUAL keywords
    // This ensures Chinese (疫情, 病毒), Arabic (وباء, مرض), etc. articles pass the filter
    console.log("Step 4: Filtering for outbreak keywords (multilingual)...");
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

    // 5) Clean content and prepare for AI matching
    // OPTIMIZATION: Skip full translation to avoid timeout - DeepSeek can match in any language
    console.log("Step 5: Cleaning content for AI matching (no translation - DeepSeek is multilingual)...");
    for (const article of articlesToProcess) {
      if (!article.originalText) {
        article.originalText = article.content;
      }
      // Clean HTML but don't translate - AI can handle multilingual content
      const cleanContent = stripHtmlTags(article.originalText || article.content);
      article.translatedText = cleanContent;
      article.content = cleanContent;
    }
    const nonEnglishCount = articlesToProcess.filter(a => a.language && a.language !== "en").length;
    console.log(`Content cleaned: ${nonEnglishCount} non-English articles, ${articlesToProcess.length - nonEnglishCount} English articles`);

    // Attach IDs for AI matching
    articlesToProcess.forEach((a, index) => {
      a.id = index.toString();
    });

    // 6) Match with AI
    console.log("Step 6: Matching articles to diseases with AI...");
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
    console.log("Step 7: Storing data in database...");
    const {
      processedCount,
      signalCount,
      skippedDuplicate,
      skippedNoLocation,
      skippedNoSource,
    } = await storeArticlesAndSignals({ supabase, matchedArticles });

    console.log("=== COLLECTION SUMMARY ===");
    console.log(`Languages processed: ${SUPPORTED_LANGUAGES.join(", ")}`);
    console.log(`Total articles fetched (after dedupe): ${articles.length}`);
    console.log(`Articles evaluated for matching: ${articlesToProcess.length}`);
    console.log(`Non-English articles: ${nonEnglishCount}`);
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
        function: "collect-multilingual-news",
        languagesProcessed: SUPPORTED_LANGUAGES,
        articlesProcessed: processedCount,
        signalsCreated: signalCount,
        totalArticlesFetched: articlesToProcess.length,
        nonEnglishArticles: nonEnglishCount,
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

