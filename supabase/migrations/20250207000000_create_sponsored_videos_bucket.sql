-- Create the sponsored-videos storage bucket
-- This bucket stores video files for advertising content
-- File size limit: 15MB (configured in bucket settings)
-- Allowed types: video/mp4, video/webm, video/quicktime, video/x-msvideo

-- ============================================================================
-- CREATE SPONSORED-VIDEOS STORAGE BUCKET
-- ============================================================================

-- Insert bucket if it doesn't exist
-- Note: If this fails, you may need to create the bucket manually in Supabase Dashboard
-- and then run the policies section below
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'sponsored-videos',
    'sponsored-videos',
    true, -- Public bucket for direct access
    15728640, -- 15MB in bytes (15 * 1024 * 1024)
    ARRAY[
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo'
    ]
  )
  ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 15728640,
    allowed_mime_types = ARRAY[
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo'
    ];
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Bucket creation failed. Please create manually in Supabase Dashboard: Storage → Create bucket → Name: sponsored-videos, Public: true, File size limit: 15MB';
END $$;

-- ============================================================================
-- STORAGE POLICIES FOR sponsored-videos BUCKET
-- ============================================================================
-- These policies ensure proper access control

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

-- Policy: Allow users to update their own uploaded videos
DROP POLICY IF EXISTS "Allow users to manage own sponsored videos" ON storage.objects;
CREATE POLICY "Allow users to manage own sponsored videos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'sponsored-videos' AND
    auth.uid() IS NOT NULL
  )
  WITH CHECK (
    bucket_id = 'sponsored-videos' AND
    auth.uid() IS NOT NULL
  );

-- Policy: Allow users to delete their own uploaded videos
DROP POLICY IF EXISTS "Allow users to delete own sponsored videos" ON storage.objects;
CREATE POLICY "Allow users to delete own sponsored videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'sponsored-videos' AND
    auth.uid() IS NOT NULL
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

-- Add comments for documentation
COMMENT ON POLICY "Allow authenticated users to upload sponsored videos" ON storage.objects IS 
  'Allows authenticated users to upload video files to sponsored-videos bucket';

COMMENT ON POLICY "Allow public to read sponsored videos" ON storage.objects IS 
  'Allows public access to read video files for displaying ads';

