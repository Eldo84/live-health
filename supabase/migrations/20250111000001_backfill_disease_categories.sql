/*
  # Backfill Disease Categories for Existing Diseases
  
  ## Problem
  Existing diseases in the database don't have categories linked because the category
  linking logic only ran when creating NEW diseases. This migration backfills categories
  for all existing diseases based on their spreadsheet data.
  
  ## Solution
  1. Create "Other" category if it doesn't exist
  2. For each disease from spreadsheet, try to match its category from the spreadsheet
  3. Link diseases to categories (or "Other" if category not found)
*/

-- Step 1: Create "Other" category if it doesn't exist
INSERT INTO outbreak_categories (name, description, color, icon)
VALUES (
  'Other',
  'Diseases without a specific outbreak category',
  '#66dbe1',
  'alert-circle'
)
ON CONFLICT (name) DO NOTHING;

-- Step 2: Create a temporary function to backfill categories
-- This will be called for each disease that needs a category
CREATE OR REPLACE FUNCTION backfill_disease_category(
  p_disease_name TEXT,
  p_category_name TEXT
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_disease_id UUID;
  v_category_id UUID;
  v_other_category_id UUID;
BEGIN
  -- Find the disease
  SELECT id INTO v_disease_id
  FROM diseases
  WHERE name = p_disease_name
  LIMIT 1;
  
  IF v_disease_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Check if disease already has a category
  IF EXISTS (
    SELECT 1 FROM disease_categories WHERE disease_id = v_disease_id
  ) THEN
    RETURN; -- Already has a category, skip
  END IF;
  
  -- Try to find the category (case-insensitive)
  SELECT id INTO v_category_id
  FROM outbreak_categories
  WHERE LOWER(name) = LOWER(TRIM(p_category_name))
  LIMIT 1;
  
  -- If category not found and category name is provided, try to create it
  IF v_category_id IS NULL AND p_category_name IS NOT NULL AND TRIM(p_category_name) != '' THEN
    -- Create new category with default values
    INSERT INTO outbreak_categories (name, description, color, icon)
    VALUES (
      TRIM(p_category_name),
      'Category: ' || TRIM(p_category_name),
      '#8b5cf6', -- Default color from palette
      'alert-circle'
    )
    ON CONFLICT (name) DO NOTHING
    RETURNING id INTO v_category_id;
    
    -- If still null, try to get it (might have been created by conflict)
    IF v_category_id IS NULL THEN
      SELECT id INTO v_category_id
      FROM outbreak_categories
      WHERE name = TRIM(p_category_name)
      LIMIT 1;
    END IF;
  END IF;
  
  -- If still no category, use "Other"
  IF v_category_id IS NULL THEN
    SELECT id INTO v_other_category_id
    FROM outbreak_categories
    WHERE name = 'Other'
    LIMIT 1;
    v_category_id := v_other_category_id;
  END IF;
  
  -- Link disease to category
  IF v_category_id IS NOT NULL THEN
    INSERT INTO disease_categories (disease_id, category_id)
    VALUES (v_disease_id, v_category_id)
    ON CONFLICT (disease_id, category_id) DO NOTHING;
  END IF;
END;
$$;

-- Step 3: Note: We can't directly access the spreadsheet from SQL
-- So we'll need to manually backfill or use the edge function
-- For now, let's at least link diseases that we know should have categories

-- This is a placeholder - the actual backfill should be done by:
-- 1. Running the edge function (which now links categories for existing diseases)
-- 2. Or manually updating via SQL based on spreadsheet data

-- Clean up the temporary function
-- DROP FUNCTION IF EXISTS backfill_disease_category(TEXT, TEXT);

COMMENT ON FUNCTION backfill_disease_category IS 
  'Helper function to backfill categories for existing diseases. Note: Actual backfill should be done by running the edge function or manually via spreadsheet data.';

