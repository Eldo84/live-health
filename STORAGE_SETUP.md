# Storage Bucket Setup for Ad Media

This document explains how to set up storage buckets for advertising media (images, GIFs, videos).

## Required Buckets

### 1. `sponsored-images` (Public)
- **Purpose**: Images, GIFs, and animations for ads
- **Public**: Yes
- **File size limit**: 10MB (update from default 5MB)
- **Allowed MIME types**:
  - `image/jpeg`
  - `image/png`
  - `image/webp`
  - `image/gif`
  - `image/apng`

**Setup Steps:**
1. Go to Supabase Dashboard → Storage
2. Create bucket: `sponsored-images`
3. Set as **Public**
4. Update file size limit to **10MB**
5. Add allowed MIME types listed above

### 2. `sponsored-videos` (Public) - **NEW**
- **Purpose**: Video files for ads
- **Public**: Yes
- **File size limit**: 15MB
- **Allowed MIME types**:
  - `video/mp4`
  - `video/webm`
  - `video/quicktime`
  - `video/x-msvideo`

**Setup Steps:**
1. Go to Supabase Dashboard → Storage
2. Create bucket: `sponsored-videos`
3. Set as **Public**
4. Set file size limit to **15MB**
5. Add allowed MIME types listed above

### 3. `advertising-documents` (Private - Fallback)
- **Purpose**: Fallback bucket for larger files or when other buckets aren't available
- **Public**: No (private)
- **File size limit**: 15MB (should match video limit)
- **Allowed MIME types**: All (or add video types as fallback)

**Note**: This bucket is used as a fallback. Videos uploaded here will need signed URLs for access.

## Running Migrations

After creating the buckets, run the migration to set up storage policies:

```bash
# Apply the video storage migration
supabase migration up
```

Or apply manually in Supabase Dashboard → SQL Editor.

## Testing

After setup, test by:
1. Submitting an ad with an image
2. Submitting an ad with a GIF
3. Submitting an ad with a video (MP4)

Check the admin panel to verify media displays correctly.

## Troubleshooting

### Videos not showing in admin panel:
1. Check if `sponsored-videos` bucket exists
2. Verify bucket is **Public**
3. Check file size limit (should be 15MB)
4. Verify video MIME types are allowed
5. Check browser console for CORS errors
6. Verify the video URL is accessible (try opening in new tab)

### Upload errors:
- **"Bucket not found"**: Create the `sponsored-videos` bucket
- **"File too large"**: Increase bucket file size limit
- **"Content type not allowed"**: Add video MIME types to bucket settings
- **"Permission denied"**: Check storage policies are applied correctly

## Current Bucket Status

Check your current bucket configuration:
- Go to Supabase Dashboard → Storage
- Review each bucket's settings
- Ensure file size limits and MIME types match the requirements above



