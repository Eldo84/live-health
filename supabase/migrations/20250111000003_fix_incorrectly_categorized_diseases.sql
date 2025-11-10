/*
  # Fix Incorrectly Categorized Diseases

  ## Overview
  Fixes diseases that were incorrectly categorized as "human" when they should be
  "zoonotic" or "veterinary" based on the veterinary spreadsheet and known zoonotic diseases.

  ## Diseases to Fix:
  1. Rabies - Should be zoonotic (affects both humans and animals)
  2. Newcastle Disease - Should be zoonotic (can affect humans, though rare)
  3. OTHER disease with Rift Valley Fever - Should be zoonotic
  4. Anthrax - Should be zoonotic (if exists)
*/

-- Fix Rabies (zoonotic)
UPDATE diseases 
SET disease_type = 'zoonotic' 
WHERE name = 'Rabies' 
  AND disease_type = 'human';

-- Fix Newcastle Disease (zoonotic - can affect humans)
UPDATE diseases 
SET disease_type = 'zoonotic' 
WHERE name = 'Newcastle Disease' 
  AND disease_type = 'human';

-- Fix OTHER disease that mentions Rift Valley Fever (zoonotic)
UPDATE diseases 
SET disease_type = 'zoonotic' 
WHERE name = 'OTHER' 
  AND description LIKE '%Rift Valley%'
  AND disease_type = 'human';

-- Fix Anthrax if it exists (zoonotic)
UPDATE diseases 
SET disease_type = 'zoonotic' 
WHERE (name LIKE '%Anthrax%' OR description LIKE '%Anthrax%')
  AND disease_type = 'human';

-- Note: Diseases stored as "OTHER" with veterinary detected_disease_name
-- (like African Swine Fever, Foot and Mouth Disease, etc.) are correctly
-- stored as "OTHER" with human type because they were filtered out by AI.
-- These don't need to be changed as they represent diseases that were
-- detected but shouldn't have been processed (AI filtering working correctly).

