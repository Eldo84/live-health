# Multi-Source News Collection Fix

## Problem
Only Google News articles were appearing in the news section, even though multiple sources (WHO, BBC Health, ProMED-mail) were enabled and fetching articles.

## Root Cause
Articles were being filtered out at multiple stages:
1. **AI Matching Step**: Articles without countries were filtered out (line 169 in `match.ts`)
2. **Storage Step**: Articles without locations were being skipped entirely (line 327-330 in `storage.ts`)

## Solution

### 1. Updated Matching Logic (`match.ts`)
- **Removed country requirement**: Articles no longer need a country to pass the matching step
- **Updated AI prompt**: Country field is now optional - AI can return "null" if it can't determine a country
- **Handle null countries**: Properly normalize "null" country strings to undefined

### 2. Updated Storage Logic (`storage.ts`)
- **Store all matched articles**: Articles are now stored regardless of whether they have location data
- **Conditional signal creation**: Only articles with both location AND diseases create outbreak signals
- **Articles without locations**: Stored in database and appear in news section, but don't create map signals

## Changes Made

### `supabase/functions/collect-outbreak-data/match.ts`
- Removed filter: `.filter((article) => article.location?.country)`
- Updated AI prompt to allow "null" for country field
- Improved country normalization to handle null/empty values

### `supabase/functions/collect-outbreak-data/storage.ts`
- Moved source matching before location checks
- Store articles even if they lack location data
- Track articles without locations separately (they're stored but don't create signals)
- Only create outbreak signals when both location and diseases are present

## Expected Behavior

After deployment:
1. **All sources** (WHO, BBC Health, ProMED-mail, Google News) will have articles stored
2. **Articles with locations + diseases**: Create outbreak signals on map
3. **Articles without locations**: Appear in news section but don't create signals
4. **News section**: Shows articles from all enabled sources, not just Google News

## Testing

To verify the fix:
1. Deploy the updated edge function
2. Trigger the function manually
3. Check database: `SELECT ns.name, COUNT(na.id) FROM news_sources ns LEFT JOIN news_articles na ON na.source_id = ns.id GROUP BY ns.name;`
4. Check news section: Should see articles from multiple sources
5. Check map: Only articles with locations should create signals

## Files Modified
- `supabase/functions/collect-outbreak-data/match.ts`
- `supabase/functions/collect-outbreak-data/storage.ts`
- `supabase/functions/collect-outbreak-data/index.ts` (updated logging)

