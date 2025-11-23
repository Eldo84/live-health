/**
 * Quick test - validates multilingual setup without API calls
 * 
 * Usage: deno run --allow-read test-quick.ts
 */

import { SUPPORTED_LANGUAGES, LANGUAGE_NEWS_SOURCES } from "./languages.ts";
import type { NormalizedArticle } from "./types.ts";

console.log("🧪 Quick validation test for multilingual support...\n");

// Test 1: Languages config
console.log("✅ Test 1: Language configuration");
console.log(`   Supported languages: ${SUPPORTED_LANGUAGES.join(", ")}`);
console.log(`   Language sources configured: ${Object.keys(LANGUAGE_NEWS_SOURCES).length}\n`);

// Test 2: Type structure
console.log("✅ Test 2: Type structure");
const testArticle: NormalizedArticle = {
  title: "Test Article",
  content: "Test content",
  url: "https://example.com",
  publishedAt: new Date().toISOString(),
  source: "Google News",
  language: "fr",
  originalText: "Contenu original en français",
  translatedText: "Original content in French",
};
console.log(`   ✓ Article with multilingual fields created`);
console.log(`   - Language: ${testArticle.language}`);
console.log(`   - Has originalText: ${!!testArticle.originalText}`);
console.log(`   - Has translatedText: ${!!testArticle.translatedText}\n`);

// Test 3: Language sources
console.log("✅ Test 3: Language-specific sources");
for (const lang of SUPPORTED_LANGUAGES) {
  const sources = LANGUAGE_NEWS_SOURCES[lang];
  if (sources && sources.length > 0) {
    console.log(`   ✓ ${lang}: ${sources.length} source(s) configured`);
  } else {
    console.log(`   ⚠️  ${lang}: No sources configured (will use English fallback)`);
  }
}
console.log();

console.log("🎉 Quick validation complete!");
console.log("\nNext steps:");
console.log("  1. Set environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEEPSEEK_API_KEY)");
console.log("  2. Run full test: deno run --allow-net --allow-env --allow-read test-local.ts");
console.log("  3. Or test with Supabase CLI: supabase functions serve collect-outbreak-data");

