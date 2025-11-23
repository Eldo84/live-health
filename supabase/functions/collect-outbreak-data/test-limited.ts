/**
 * Limited test - tests fetching and translation without database
 * Works even without SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * 
 * Usage: deno run --allow-net --allow-env --allow-read test-limited.ts
 */

import { fetchArticles } from "./fetchNews.ts";
import { translateToEnglish } from "./utils.ts";
import { SUPPORTED_LANGUAGES } from "./languages.ts";
import type { NormalizedArticle } from "./types.ts";

console.log("🧪 Limited test - Fetching and Translation (no database required)...\n");

const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY");

async function testLimited() {
  try {
    // Test 1: Fetch articles from one language
    console.log("✅ Test 1: Fetching articles (English only for speed)...");
    const articles = await fetchArticles("en");
    console.log(`   ✓ Fetched ${articles.length} articles\n`);

    if (articles.length === 0) {
      console.log("⚠️  No articles fetched. This might be normal if sources are down.\n");
      return;
    }

    // Test 2: Check multilingual fields
    console.log("✅ Test 2: Checking multilingual fields...");
    const articlesWithLang = articles.filter(a => a.language);
    const articlesWithOriginal = articles.filter(a => a.originalText);
    console.log(`   ✓ Articles with language: ${articlesWithLang.length}/${articles.length}`);
    console.log(`   ✓ Articles with originalText: ${articlesWithOriginal.length}/${articles.length}\n`);

    // Test 3: Show sample article
    if (articles.length > 0) {
      const sample = articles[0];
      console.log("✅ Test 3: Sample article structure...");
      console.log(`   Title: ${sample.title.substring(0, 60)}...`);
      console.log(`   Source: ${sample.source}`);
      console.log(`   Language: ${sample.language || "not set"}`);
      console.log(`   Has originalText: ${!!sample.originalText}`);
      console.log(`   Content length: ${sample.content.length} chars`);
      if (sample.originalText) {
        console.log(`   OriginalText length: ${sample.originalText.length} chars\n`);
      } else {
        console.log();
      }
    }

    // Test 4: Translation (if API key is available)
    if (deepseekKey) {
      console.log("✅ Test 4: Testing translation...");
      // Create a test article in French (simulated)
      const testText = "Il y a une épidémie de grippe en France. Plusieurs cas ont été signalés.";
      console.log(`   Original (French): ${testText}`);
      try {
        const translated = await translateToEnglish(testText);
        console.log(`   ✓ Translated: ${translated}\n`);
      } catch (error) {
        console.error(`   ✗ Translation failed: ${error}\n`);
      }
    } else {
      console.log("⚠️  Test 4: Skipping translation (DEEPSEEK_API_KEY not set)\n");
    }

    // Test 5: Test with different languages (just check if URLs work)
    console.log("✅ Test 5: Testing language-specific fetching...");
    for (const lang of SUPPORTED_LANGUAGES.slice(0, 2)) { // Test first 2 languages only
      try {
        const langArticles = await fetchArticles(lang);
        console.log(`   ✓ ${lang}: Fetched ${langArticles.length} articles`);
        if (langArticles.length > 0) {
          const sample = langArticles[0];
          console.log(`     Sample language: ${sample.language || "not set"}`);
          console.log(`     Has originalText: ${!!sample.originalText}`);
        }
      } catch (error) {
        console.log(`   ✗ ${lang}: Failed - ${error}`);
      }
    }
    console.log();

    console.log("🎉 Limited test completed!");
    console.log("\nSummary:");
    console.log(`  - Articles fetched: ${articles.length}`);
    console.log(`  - Multilingual support: ${articlesWithLang.length > 0 ? "✓ Working" : "✗ Not working"}`);
    console.log(`  - Original text storage: ${articlesWithOriginal.length > 0 ? "✓ Working" : "✗ Not working"}`);
    
    if (!deepseekKey) {
      console.log("\n💡 To test translation, set DEEPSEEK_API_KEY environment variable");
    }

  } catch (error) {
    console.error("❌ Test failed:", error);
    if (error instanceof Error) {
      console.error("   Error message:", error.message);
    }
  }
}

testLimited();

