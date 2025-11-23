# Local Testing Guide for collect-outbreak-data Edge Function

This guide shows you how to test the edge function locally before deploying it.

## Quick Start (No API Calls)

For the fastest validation without any network calls:

```bash
cd supabase/functions/collect-outbreak-data
deno run --allow-read test-quick.ts
```

This validates:
- ✅ Language configuration
- ✅ Type structure with multilingual fields
- ✅ Language-specific source URLs

## Prerequisites

1. **Deno installed** (required for Supabase Edge Functions)
   ```bash
   curl -fsSL https://deno.land/install.sh | sh
   ```

2. **Environment variables set**
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
   - `DEEPSEEK_API_KEY` - Your DeepSeek API key (for translation and AI matching)
   - `OPENCAGE_API_KEY` - Optional (for geocoding)

## Option 1: Quick Test Script (Recommended)

The test script validates the function without storing data in your database.

### Step 1: Set Environment Variables

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export DEEPSEEK_API_KEY="your-deepseek-api-key"
export OPENCAGE_API_KEY="your-opencage-key"  # Optional
```

Or create a `.env` file in the function directory:
```bash
cd supabase/functions/collect-outbreak-data
cat > .env << EOF
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DEEPSEEK_API_KEY=your-deepseek-api-key
OPENCAGE_API_KEY=your-opencage-key
EOF
```

### Step 2: Run the Test Script

```bash
cd supabase/functions/collect-outbreak-data
deno run --allow-net --allow-env --allow-read test-local.ts
```

The script will:
- ✅ Fetch articles from news sources
- ✅ Test language detection and originalText storage
- ✅ Test translation functionality
- ✅ Test AI matching (limited to 3 articles to save costs)
- ✅ Show multilingual data statistics
- ❌ **Skip actual database storage** (dry run)

### Expected Output

```
🧪 Starting local test of collect-outbreak-data function...

✅ Step 1: Fetching spreadsheet data...
   ✓ Spreadsheets loaded

✅ Step 2: Fetching news articles (testing with 'en' only for speed)...
   ✓ Fetched 45 articles for language: en
   ✓ 45 articles have language set
   ✓ 45 articles have originalText set

✅ Step 2.5: Testing translation (sample article)...
   Sample article language: en
   Sample article title: COVID-19 cases rise in New York...
   Original text length: 1234 chars
   ✓ Article is already in English, no translation needed

✅ Step 3: Cleaning duplicates...
   ✓ Removed 30 duplicates
   ✓ 15 new articles to process

✅ Step 3.5: Testing translation on articles...
   ✓ Translation test complete (0 non-English articles translated)

✅ Step 4: Testing AI matching (limited to 3 articles for cost control)...
   Testing with 3 articles...
   ✓ Matched 2 articles
   Multilingual data in matched articles:
     - Language set: 2
     - Original text: 2
     - Translated text: 2

🎉 Test completed successfully!
```

## Option 2: Test with Supabase CLI (Full Local Environment)

If you have Supabase CLI installed, you can run the function in a full local environment:

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
# or
brew install supabase/tap/supabase
```

### Step 2: Initialize Supabase (if not already done)

```bash
supabase init
```

### Step 3: Link to Your Project (Optional)

```bash
supabase link --project-ref your-project-ref
```

### Step 4: Set Secrets

```bash
supabase secrets set SUPABASE_URL=your-url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-key
supabase secrets set DEEPSEEK_API_KEY=your-deepseek-key
```

### Step 5: Serve Function Locally

```bash
supabase functions serve collect-outbreak-data --no-verify-jwt
```

This will start a local server at `http://localhost:54321/functions/v1/collect-outbreak-data`

### Step 6: Test with curl

```bash
curl -X POST http://localhost:54321/functions/v1/collect-outbreak-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-anon-key"
```

## Option 3: Test Specific Components

You can also test individual components:

### Test Translation Only

```bash
cd supabase/functions/collect-outbreak-data
deno run --allow-net --allow-env << 'EOF'
import { translateToEnglish } from "./utils.ts";

const testText = "Bonjour, il y a une épidémie de grippe en France.";
const translated = await translateToEnglish(testText);
console.log("Original:", testText);
console.log("Translated:", translated);
EOF
```

### Test Language-Specific Fetching

```bash
cd supabase/functions/collect-outbreak-data
deno run --allow-net --allow-env << 'EOF'
import { fetchArticles } from "./fetchNews.ts";

const articles = await fetchArticles("fr");
console.log(`Fetched ${articles.length} French articles`);
articles.forEach(a => {
  console.log(`- ${a.title} (lang: ${a.language}, has original: ${!!a.originalText})`);
});
EOF
```

## Testing Multilingual Features

To test with non-English articles, modify the test script to fetch from other languages:

```typescript
// In test-local.ts, change:
const testLanguage = "fr"; // or "es", "ar", "de", "pt"
```

Then run the test and verify:
- Articles have `language` field set
- Articles have `originalText` with original content
- Articles get translated to English
- Both original and translated text are preserved

## Troubleshooting

### "Missing required environment variables"
- Make sure you've exported the variables or created a `.env` file
- Check that variable names are correct (case-sensitive)

### "Translation failed"
- Verify `DEEPSEEK_API_KEY` is set correctly
- Check your DeepSeek API quota/balance
- Translation will fallback to original text if it fails

### "AI matching failed"
- Verify `DEEPSEEK_API_KEY` is set
- Check API quota
- The test limits to 3 articles to save costs

### "Cannot find module"
- Make sure you're running from the correct directory
- Deno should auto-download npm packages on first run

## Next Steps

After local testing passes:
1. Deploy the function: `supabase functions deploy collect-outbreak-data`
2. Set secrets in Supabase Dashboard
3. Test the deployed function (see `TEST_EDGE_FUNCTION.md`)

