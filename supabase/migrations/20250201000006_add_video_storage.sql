-- Add storage bucket and policies for video content
-- This allows uploading videos, GIFs, and animations for ads

-- ============================================================================
-- STORAGE BUCKET CONFIGURATION FOR VIDEOS
-- ============================================================================
-- Note: The bucket 'sponsored-videos' is created automatically by migration 20250207000000_create_sponsored_videos_bucket.sql
-- File size limit: 15MB (configured in bucket creation)
-- Allowed types: video/mp4, video/webm, video/quicktime, video/x-msvideo

-- ============================================================================
-- STORAGE POLICIES FOR sponsored-videos BUCKET
-- ============================================================================

-- Policy: Allow authenticated users to upload videos
DROP POLICY IF EXISTS "Allow authenticated users to upload sponsored videos" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload sponsored videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'sponsored-videos' AND
    auth.uid() IS NOT NULL
  );

-- Policy: Allow public to read videos (for displaying ads)
DROP POLICY IF EXISTS "Allow public to read sponsored videos" ON storage.objects;
CREATE POLICY "Allow public to read sponsored videos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'sponsored-videos');

-- Policy: Allow users to update/delete their own uploaded videos
DROP POLICY IF EXISTS "Allow users to manage own sponsored videos" ON storage.objects;
CREATE POLICY "Allow users to manage own sponsored videos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'sponsored-videos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'sponsored-videos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Allow users to delete own sponsored videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'sponsored-videos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Allow admins to manage all videos
DROP POLICY IF EXISTS "Allow admins to manage all sponsored videos" ON storage.objects;
CREATE POLICY "Allow admins to manage all sponsored videos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'sponsored-videos' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'sponsored-videos' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- UPDATE EXISTING BUCKETS TO SUPPORT MORE MEDIA TYPES
-- ============================================================================
-- Note: These are configuration notes. Actual bucket settings must be updated in Supabase Dashboard

-- For sponsored-images bucket:
-- - Update file size limit to 10MB (for larger images and GIFs)
-- - Add allowed types: image/gif, image/webp, image/apng

-- For advertising-documents bucket:
-- - Update file size limit to 15MB (for video fallback, should match sponsored-videos)
-- - Add allowed types: video/mp4, video/webm, video/quicktime, video/x-msvideo, image/gif

COMMENT ON POLICY "Allow authenticated users to upload sponsored videos" ON storage.objects IS 
  'Allows authenticated users to upload video files to sponsored-videos bucket';

COMMENT ON POLICY "Allow public to read sponsored videos" ON storage.objects IS 
  'Allows public access to read video files for displaying ads';



