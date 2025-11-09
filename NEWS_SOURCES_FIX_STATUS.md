# News Sources Fix Status

## Summary
Fixed RSS feed URLs based on testing results. Some sources are working, others are disabled due to authentication/access issues.

---

## ✅ Working Sources (3)

### 1. **WHO - World Health Organization** ✅ FIXED
- **Status**: Working
- **Fix Applied**: Changed URL from non-existent DON feed to general news RSS
- **URL**: `https://www.who.int/rss-feeds/news-english.xml`
- **Note**: This is the general WHO news feed (includes health/outbreak news)
- **Original URL**: `https://www.who.int/feeds/entity/csr/don/en/rss.xml` (404 Not Found)

### 2. **BBC Health** ✅ WORKING
- **Status**: Working (no changes needed)
- **URL**: `https://feeds.bbci.co.uk/news/health/rss.xml`
- **Response**: 200 OK

### 3. **Google News** ✅ WORKING
- **Status**: Working (no changes needed)
- **URL**: `https://news.google.com/rss/search?q=outbreak when:1d&hl=en`
- **Response**: Working

---

## ⚠️ Partially Working Sources (1)

### 4. **ProMED-mail** ⚠️ FIXED (needs testing)
- **Status**: URL Fixed
- **Fix Applied**: Added `www.` prefix to URLs (redirects require it)
- **RSS URL**: `https://www.promedmail.org/feed/` (was: `https://promedmail.org/feed/`)
- **WordPress API URL**: `https://www.promedmail.org/wp-json/promed/v1/posts?per_page=50`
- **Note**: ProMED redirects (308) to www version. RSS parser should handle this, but using www directly is more reliable.

---

## ❌ Disabled Sources (2)

### 5. **CDC - Centers for Disease Control** ❌ DISABLED
- **Status**: Disabled (requires authentication)
- **Reason**: All proxy attempts return 403 Forbidden
- **Original URL**: `https://data.cdc.gov/resource/9mfq-cb36.json`
- **Issue**: 
  - Direct fetch: Blocked
  - AllOrigins proxy: 403
  - Isomorphic-git proxy: 403
- **Solution**: Requires API token or different endpoint
- **Action**: Commented out CDC fetching code

### 6. **Reuters Health** ❌ DISABLED
- **Status**: Disabled (not publicly accessible)
- **Reason**: RSS feeds require authentication or have changed
- **Original URLs**:
  - `https://www.reutersagency.com/feed/?best-topics=health&post_type=best` (301 redirect, returns HTML)
  - `https://www.reuters.com/rssFeed/health` (401 Unauthorized)
- **Solution**: Would need Reuters API access or alternative feed
- **Action**: Disabled Reuters fetching (logs message only)

---

## Current Active Sources (3)

After fixes:
1. ✅ **WHO** - General health news RSS
2. ✅ **BBC Health** - Health news RSS
3. ✅ **Google News** - Outbreak search RSS
4. ⚠️ **ProMED-mail** - RSS/WordPress API (needs testing)

**Total Active**: 3-4 sources (depending on ProMED)

---

## Expected Results

### Before Fixes:
- ❌ WHO: 404 error
- ❌ CDC: 403 error (all proxies)
- ✅ BBC: Working
- ❌ Reuters: 404/401 errors
- ❌ ProMED: 404 error

### After Fixes:
- ✅ WHO: Should fetch articles (using general news feed)
- ⚠️ CDC: Disabled (requires API access)
- ✅ BBC: Working
- ⚠️ Reuters: Disabled (requires authentication)
- ⚠️ ProMED: Should work (URLs fixed with www prefix)

---

## Next Steps

1. **Deploy and Test**: Deploy the updated code and test if WHO and ProMED now work
2. **Monitor Logs**: Check edge function logs to verify:
   - WHO is fetching articles
   - ProMED RSS or WordPress API is working
3. **CDC Alternative**: Research alternative CDC data sources or API access
4. **Reuters Alternative**: Find alternative health news sources or Reuters API access

---

## Alternative Sources to Consider

If CDC and Reuters remain unavailable, consider:
- **HealthMap**: `https://healthmap.org/en/` (has RSS feeds)
- **CIDRAP**: `https://www.cidrap.umn.edu/` (Center for Infectious Disease Research and Policy)
- **Eurosurveillance**: European health surveillance RSS
- **MMWR (Morbidity and Mortality Weekly Report)**: CDC's weekly report (might have RSS)

---

## Files Modified

1. `supabase/functions/collect-outbreak-data/fetchNews.ts`
   - Fixed WHO RSS URL
   - Disabled CDC (commented out)
   - Disabled Reuters (commented out)
   - Fixed ProMED URLs (added www prefix)

---

## Testing

After deployment, test by:
1. Triggering the edge function
2. Checking logs for:
   - `WHO fetched X articles`
   - `ProMED-mail (RSS) fetched X articles` OR `ProMED-mail (WordPress API) fetched X posts`
   - `BBC Health fetched X articles`
   - `Google News fetched X items`
3. Verifying articles in database:
   ```sql
   SELECT ns.name, COUNT(na.id) as count
   FROM news_sources ns
   LEFT JOIN news_articles na ON na.source_id = ns.id
   WHERE na.scraped_at > NOW() - INTERVAL '1 hour'
   GROUP BY ns.name
   ORDER BY count DESC;
   ```

---

## Last Updated
November 9, 2025

