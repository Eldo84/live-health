# Language Rotation System

## Overview

The edge function now processes **3 languages per run** instead of all 9 languages at once. This prevents timeouts and ensures the function completes successfully.

## How It Works

### Rotation Pattern

With 9 languages total and 3 languages per run:
- **Run 1 (index 0)**: `en`, `fr`, `es`
- **Run 2 (index 1)**: `ar`, `de`, `pt`
- **Run 3 (index 2)**: `it`, `ru`, `ja`
- **Run 4 (index 0)**: `en`, `fr`, `es` (cycles back)
- **Run 5 (index 1)**: `ar`, `de`, `pt`
- **Run 6 (index 2)**: `it`, `ru`, `ja`
- And so on...

### Database State

The rotation state is stored in the `app_settings` table:
- **Key**: `language_rotation_index`
- **Value**: `0`, `1`, or `2` (rotates between these three values)
- **Description**: Tracks which set of languages to process

### Implementation Details

1. **Function**: `getLanguagesForThisRun(supabase, 3)` in `languages.ts`
2. **State Management**: Uses `app_settings` table to track current rotation index
3. **Automatic Rotation**: After each run, the index increments and cycles
4. **Fallback**: If database access fails, falls back to time-based rotation

## Benefits

✅ **Prevents Timeouts**: Processing 3 languages takes ~135 seconds (within limits)
✅ **Complete Coverage**: All 6 languages are processed over 2 runs
✅ **Reliable**: Database state ensures consistent rotation
✅ **Automatic**: No manual intervention needed

## Testing

To test the rotation:

1. **Check current rotation index**:
```sql
SELECT key, value, updated_at 
FROM app_settings 
WHERE key = 'language_rotation_index';
```

2. **Manually reset rotation** (if needed):
```sql
UPDATE app_settings 
SET value = '0', updated_at = NOW(),
    description = 'Current rotation index for language processing. Cycles: 0=en,fr,es | 1=ar,de,pt | 2=it,ru,ja'
WHERE key = 'language_rotation_index';
```

3. **Trigger function** and check logs for:
   - Which languages are being processed
   - The rotation index being used
   - Next rotation index

## Example Log Output

```
Language rotation: Current index=0, Processing languages: en, fr, es, Next index=1
Step 2: Fetching news articles from 3 languages for this run: en, fr, es
```

Next run will show:
```
Language rotation: Current index=1, Processing languages: ar, de, pt, Next index=0
Step 2: Fetching news articles from 3 languages for this run: ar, de, pt
```

## Configuration

To change the number of languages per run, modify the call in `index.ts`:
```typescript
const languagesToProcess = await getLanguagesForThisRun(supabase, 3); // Change 3 to desired number
```

Note: With 9 languages total:
- `3 per run` = 3 rotations (recommended) - covers all languages
- `2 per run` = 5 rotations (slower coverage)
- `4 per run` = 3 rotations (might timeout with 4 languages)

