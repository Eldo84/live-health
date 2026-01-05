# Disease Duplicates Analysis & Fix

## Problem
The Global Health Index tab was showing many duplicate diseases with slight variations in their names. For example:
- "Cardiovascular Disease (CVD) [1]" vs "Cardiovascular Disease (CVD) [2]" vs "Cardiovascular Disease (CVD)"
- "Breast Cancer (Female)" vs "Breast Cancer"
- "Sleep Apnea (Diagnosed)" vs "Sleep Apnea (OSA)" vs "Sleep Apnea"
- "Hepatitis B (Chronic)" vs "Hepatitis B (HBsAg+)" vs "Hepatitis B (HBV)"

## Root Cause
These duplicates were coming from the source JSON data files:
- `src/data/usa.json`
- `src/data/china.json`
- `src/data/india.json`
- `src/data/brazil.json`

The same disease appeared with different naming variations (brackets, parentheses, suffixes) which created different `baseId` values, causing them to appear as separate diseases in the sidebar.

## Solution
Created a disease name normalizer (`src/data/diseaseNameNormalizer.ts`) that:
1. Maps all variations of disease names to their canonical form
2. Integrates with the data loading process in `mockData.ts`
3. Ensures all variations of the same disease map to the same `baseId`

## Duplicate Groups Found
34 groups of semantic duplicates were identified:

1. **Cardiovascular Disease** - 3 variations
2. **Stroke** - 2 variations
3. **Obesity** - 2 variations
4. **Breast Cancer** - 2 variations
5. **Liver Cancer** - 2 variations
6. **Sleep Apnea** - 3 variations
7. **Developmental Disorders** - 4 variations
8. **Autism Spectrum Disorder** - 2 variations
9. **Depression** - 2 variations
10. **Eating Disorders** - 2 variations
11. **Substance Use Disorders** - 4 variations
12. **Sleep Disorders** - 4 variations
13. **Thyroid Disorders** - 4 variations
14. **Hepatitis B** - 4 variations (including typo "Hepatitis B is")
15. **Hepatitis C** - 3 variations
16. **STIs** - 4 variations
17. **Leprosy** - 2 variations
18. **Anemia** - 4 variations
19. **Leishmaniasis** - 3 variations
20. **Soil-transmitted helminths** - 3 variations
21. **Road Traffic Accidents** - 2 variations
22. **Firearm-related Injuries** - 3 variations
23. **Domestic Violence** - 5 variations
24. **Child Abuse** - 4 variations
25. **Gender-Based Violence** - 6 variations
26. **Preterm Birth** - 3 variations
27. **Low Birth Weight** - 3 variations
28. **Lead Poisoning** - 4 variations
29. **Heavy Metal Toxicity** - 3 variations
30. **Occupational Lung Diseases** - 4 variations
31. **Radiation Exposure Disorders** - 2 variations
32. **Hearing Loss** - 5 variations
33. **Age-related Macular Degeneration** - 2 variations
34. **Schistosomiasis** - 2 variations

## Files Modified
1. `src/data/diseaseNameNormalizer.ts` - New file with normalization mappings
2. `src/data/mockData.ts` - Updated to use the normalizer

## Result
All disease name variations now map to their canonical forms, eliminating duplicates in the Global Health Index sidebar. The data is preserved (all records remain), but they're now properly grouped under a single disease entry.
