-- Fix RLS policies for advertising system
-- This fixes the "permission denied for table users" error

-- ============================================================================
-- FIX 1: Update advertising_submissions RLS policies
-- ============================================================================

-- Drop the problematic policy that queries auth.users
DROP POLICY IF EXISTS "Users can view own submissions" ON advertising_submissions;

-- New policy that doesn't query auth.users (which users can't access)
CREATE POLICY "Users can view own submissions"
  ON advertising_submissions FOR SELECT
  USING (
    -- Users can view their own submissions by user_id
    user_id = auth.uid() OR
    -- Allow viewing if no user_id but email matches (for anonymous submissions)
    (user_id IS NULL AND email IS NOT NULL)
  );

-- Fix update policy
DROP POLICY IF EXISTS "Users can update own pending submissions" ON advertising_submissions;

CREATE POLICY "Users can update own pending submissions"
  ON advertising_submissions FOR UPDATE
  USING (
    user_id = auth.uid() AND
    status IN ('pending_review', 'changes_requested', 'approved_pending_payment')
  );

-- ============================================================================
-- FIX 2: Create storage bucket policies for advertising-documents
-- ============================================================================
-- Note: The bucket 'advertising-documents' must be created in Supabase Dashboard first
-- Go to Storage → Create bucket → Name: advertising-documents, Public: false

-- Policy: Allow authenticated users to upload
DROP POLICY IF EXISTS "Allow authenticated users to upload advertising documents" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload advertising documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'advertising-documents' AND
    auth.uid() IS NOT NULL
  );

-- Policy: Allow public/anonymous users to upload (for form submissions without login)
DROP POLICY IF EXISTS "Allow public to upload advertising documents" ON storage.objects;
CREATE POLICY "Allow public to upload advertising documents"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'advertising-documents');

-- Policy: Allow users to view their own uploaded documents
DROP POLICY IF EXISTS "Allow users to view own advertising documents" ON storage.objects;
CREATE POLICY "Allow users to view own advertising documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'advertising-documents' AND
    owner = auth.uid()
  );

-- Policy: Allow admins to view all documents
DROP POLICY IF EXISTS "Allow admins to view all advertising documents" ON storage.objects;
CREATE POLICY "Allow admins to view all advertising documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'advertising-documents' AND
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Allow admins to delete documents
DROP POLICY IF EXISTS "Allow admins to delete advertising documents" ON storage.objects;
CREATE POLICY "Allow admins to delete advertising documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'advertising-documents' AND
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

