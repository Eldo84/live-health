/*
  # Allow Admins to Delete Outbreak Signals

  Ensures administrators can remove outbreak signals created from user alerts,
  so deleting an approved alert also removes its map entry.
*/

-- Drop existing policy if it exists to avoid duplicates on re-run
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Admins can delete outbreak signals'
      AND tablename = 'outbreak_signals'
  ) THEN
    DROP POLICY "Admins can delete outbreak signals" ON outbreak_signals;
  END IF;
END$$;

-- Admins can delete any outbreak signal
CREATE POLICY "Admins can delete outbreak signals"
  ON outbreak_signals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );





























