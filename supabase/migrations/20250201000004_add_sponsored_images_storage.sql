-- Add storage policies for sponsored-images bucket
-- This allows authenticated users to upload ad images

-- ============================================================================
-- STORAGE POLICIES FOR sponsored-images BUCKET
-- ============================================================================
-- Note: The bucket 'sponsored-images' must be created in Supabase Dashboard first
-- Go to Storage → Create bucket → Name: sponsored-images, Public: true

-- Policy: Allow authenticated users to upload images
DROP POLICY IF EXISTS "Allow authenticated users to upload sponsored images" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload sponsored images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'sponsored-images' AND
    auth.uid() IS NOT NULL
  );

-- Policy: Allow public to read images (for displaying ads)
DROP POLICY IF EXISTS "Allow public to read sponsored images" ON storage.objects;
CREATE POLICY "Allow public to read sponsored images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'sponsored-images');

-- Policy: Allow users to update/delete their own uploaded images
DROP POLICY IF EXISTS "Allow users to manage own sponsored images" ON storage.objects;
CREATE POLICY "Allow users to manage own sponsored images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'sponsored-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'sponsored-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Allow users to delete own sponsored images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'sponsored-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Allow admins to manage all images
DROP POLICY IF EXISTS "Allow admins to manage all sponsored images" ON storage.objects;
CREATE POLICY "Allow admins to manage all sponsored images"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'sponsored-images' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'sponsored-images' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

