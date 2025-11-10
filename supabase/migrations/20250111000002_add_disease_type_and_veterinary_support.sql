/*
  # Add Disease Type and Veterinary Disease Support

  ## Overview
  Adds support for distinguishing between human, veterinary, and zoonotic diseases.
  This allows the system to track both human and animal disease outbreaks while
  maintaining clear separation and filtering capabilities.

  ## Changes to Existing Tables

  ### `diseases` table
  - Add `disease_type` (text) - Type of disease: 'human', 'veterinary', or 'zoonotic'
    - Default: 'human' for backward compatibility
    - Zoonotic diseases affect both humans and animals (e.g., Avian Influenza with human cases)

  ### `outbreak_categories` table
  - Add "Veterinary Outbreaks" category for animal disease tracking

  ## Migration Strategy
  - All existing diseases default to 'human' type
  - Veterinary diseases will be identified and updated when imported from veterinary spreadsheet
  - Zoonotic diseases can be manually updated or identified during import
*/

-- Add disease_type column to diseases table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diseases' AND column_name = 'disease_type'
  ) THEN
    ALTER TABLE diseases ADD COLUMN disease_type text 
      DEFAULT 'human' 
      CHECK (disease_type IN ('human', 'veterinary', 'zoonotic'));
    
    -- Set all existing diseases to 'human' type
    UPDATE diseases SET disease_type = 'human' WHERE disease_type IS NULL;
    
    -- Create index for filtering
    CREATE INDEX IF NOT EXISTS idx_diseases_type ON diseases(disease_type);
    
    -- Add comment
    COMMENT ON COLUMN diseases.disease_type IS 'Type of disease: human (affects humans only), veterinary (affects animals only), or zoonotic (affects both)';
  END IF;
END $$;

-- Identify and update known veterinary diseases in the database
-- These are diseases that were incorrectly imported as human diseases
UPDATE diseases 
SET disease_type = 'zoonotic' 
WHERE name = 'Avian Influenza (Bird Flu)'
  AND disease_type = 'human';

-- Create "Veterinary Outbreaks" category if it doesn't exist
INSERT INTO outbreak_categories (name, description, color, icon)
VALUES (
  'Veterinary Outbreaks',
  'Animal disease outbreaks affecting livestock, poultry, and other animals',
  '#8b5cf6',
  'paw-print'
)
ON CONFLICT (name) DO NOTHING;

-- Add index on disease_type for performance
CREATE INDEX IF NOT EXISTS idx_diseases_type_name ON diseases(disease_type, name);

