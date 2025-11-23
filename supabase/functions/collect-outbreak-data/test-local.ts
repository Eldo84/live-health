/**
 * Local test script for collect-outbreak-data edge function
 * 
 * Usage:
 * 1. Set environment variables in .env file or export them:
 *    export SUPABASE_URL="your-supabase-url"
 *    export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
 *    export DEEPSEEK_API_KEY="your-deepseek-key"
 *    export OPENCAGE_API_KEY="your-opencage-key" (optional)
 * 
 * 2. Run with Deno:
 *    deno run --allow-net --allow-env --allow-read test-local.ts
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import type { NormalizedArticle } from "./types.ts";
import { loadHumanDiseaseCSV, loadVeterinaryDiseaseCSV } from "./spreadsheet.ts";
import { fetchArticles } from "./fetchNews.ts";
import { deepseekMatchArticles } from "./match.ts";
import { storeArticlesAndSignals } from "./storage.ts";
import { cleanDuplicates } from "./clean.ts";
import { SUPPORTED_LANGUAGES } from "./languages.ts";
import { translateToEnglish } from "./utils.ts";

// Load environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY");

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing required environment variables:");
  console.error("   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  console.error("\nSet them with:");
  console.error('   export SUPABASE_URL="your-url"');
  console.error('   export SUPABASE_SERVICE_ROLE_KEY="your-key"');
  Deno.exit(1);
}

if (!deepseekKey) {
  console.warn("⚠️  DEEPSEEK_API_KEY not set - translation and AI matching will fail");
}

console.log("🧪 Starting local test of collect-outbreak-data function...\n");

async function testFunction() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("✅ Step 1: Fetching spreadsheet data...");
    await Promise.all([
      loadHumanDiseaseCSV(),
      loadVeterinaryDiseaseCSV(),
    ]);
    console.log("   ✓ Spreadsheets loaded\n");

    // Test with limited languages and articles for faster testing
    console.log("✅ Step 2: Fetching news articles (testing with 'en' only for speed)...");
    const testLanguage = "en"; // Test with English first
    const fetchedArticles: NormalizedArticle[] = await fetchArticles(testLanguage);
    console.log(`   ✓ Fetched ${fetchedArticles.length} articles for language: ${testLanguage}\n`);

    // Check if articles have language and originalText set
    const articlesWithLang = fetchedArticles.filter(a => a.language);
    console.log(`   ✓ ${articlesWithLang.length} articles have language set`);
    const articlesWithOriginal = fetchedArticles.filter(a => a.originalText);
    console.log(`   ✓ ${articlesWithOriginal.length} articles have originalText set\n`);

    // Test translation on a sample article (if we have non-English articles)
    if (fetchedArticles.length > 0) {
      const sampleArticle = fetchedArticles[0];
      console.log(`✅ Step 2.5: Testing translation (sample article)...`);
      console.log(`   Sample article language: ${sampleArticle.language || "not set"}`);
      console.log(`   Sample article title: ${sampleArticle.title.substring(0, 60)}...`);
      
      if (sampleArticle.originalText) {
        console.log(`   Original text length: ${sampleArticle.originalText.length} chars`);
        
        // Only test translation if article is not English
        if (sampleArticle.language && sampleArticle.language !== "en") {
          console.log(`   Testing translation from ${sampleArticle.language}...`);
          try {
            const translated = await translateToEnglish(sampleArticle.originalText.substring(0, 500));
            console.log(`   ✓ Translation successful (${translated.length} chars)`);
            console.log(`   Translated preview: ${translated.substring(0, 100)}...\n`);
          } catch (error) {
            console.error(`   ✗ Translation failed:`, error);
          }
        } else {
          console.log(`   ✓ Article is already in English, no translation needed\n`);
        }
      }
    }

    console.log("✅ Step 3: Cleaning duplicates...");
    const articles = await cleanDuplicates(supabase, fetchedArticles);
    console.log(`   ✓ Removed ${fetchedArticles.length - articles.length} duplicates`);
    console.log(`   ✓ ${articles.length} new articles to process\n`);

    if (articles.length === 0) {
      console.log("⚠️  No new articles to process. Test complete!");
      return;
    }

    // Test translation on a few articles
    console.log("✅ Step 3.5: Testing translation on articles...");
    let translatedCount = 0;
    for (const article of articles.slice(0, 3)) { // Test first 3 articles
      if (article.language && article.language !== "en" && article.originalText) {
        try {
          article.translatedText = await translateToEnglish(article.originalText.substring(0, 1000));
          article.content = article.translatedText; // Update for AI matching
          translatedCount++;
        } catch (error) {
          console.warn(`   ⚠️  Translation failed for article: ${article.title.substring(0, 50)}`);
        }
      } else if (!article.language || article.language === "en") {
        article.translatedText = article.content;
        if (!article.originalText) {
          article.originalText = article.content;
        }
      }
    }
    console.log(`   ✓ Translation test complete (${translatedCount} non-English articles translated)\n`);

    // Attach IDs
    articles.forEach((a, index) => {
      a.id = index.toString();
    });

    // Test AI matching (but limit to avoid high costs)
    console.log("✅ Step 4: Testing AI matching (limited to 3 articles for cost control)...");
    const testArticles = articles.slice(0, 3);
    console.log(`   Testing with ${testArticles.length} articles...`);
    
    if (deepseekKey) {
      try {
        const matchedArticles = await deepseekMatchArticles({ articles: testArticles });
        console.log(`   ✓ Matched ${matchedArticles.length} articles\n`);
        
        // Check if matched articles have multilingual fields
        const matchedWithLang = matchedArticles.filter(a => a.language);
        const matchedWithOriginal = matchedArticles.filter(a => a.originalText);
        const matchedWithTranslated = matchedArticles.filter(a => a.translatedText);
        console.log(`   Multilingual data in matched articles:`);
        console.log(`     - Language set: ${matchedWithLang.length}`);
        console.log(`     - Original text: ${matchedWithOriginal.length}`);
        console.log(`     - Translated text: ${matchedWithTranslated.length}\n`);
      } catch (error) {
        console.error(`   ✗ AI matching failed:`, error);
      }
    } else {
      console.log("   ⚠️  Skipping AI matching (DEEPSEEK_API_KEY not set)\n");
    }

    // Test storage (optional - comment out if you don't want to store test data)
    console.log("✅ Step 5: Testing storage (DRY RUN - not actually storing)...");
    console.log("   This would store:");
    console.log(`     - ${articles.length} articles`);
    console.log(`     - With original_text, translated_text, and language fields`);
    console.log("   (Skipping actual storage to avoid test data)\n");

    console.log("🎉 Test completed successfully!\n");
    console.log("Summary:");
    console.log(`  - Articles fetched: ${fetchedArticles.length}`);
    console.log(`  - Articles after deduplication: ${articles.length}`);
    console.log(`  - Articles with language: ${articles.filter(a => a.language).length}`);
    console.log(`  - Articles with originalText: ${articles.filter(a => a.originalText).length}`);
    console.log(`  - Articles with translatedText: ${articles.filter(a => a.translatedText).length}`);

  } catch (error) {
    console.error("❌ Test failed:", error);
    Deno.exit(1);
  }
}

testFunction();

