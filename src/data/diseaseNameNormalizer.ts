/**
 * Disease Name Normalizer
 * Maps variations of disease names to canonical names to prevent duplicates
 * Based on the official format specification
 */

export interface DiseaseNameMapping {
  canonical: string;
  variations: string[];
}

/**
 * Maps disease name variations to their canonical form
 * This prevents duplicates like "Cardiovascular Disease (CVD) [1]" and "Cardiovascular Disease (CVD) [2]"
 * from appearing as separate diseases.
 * 
 * Canonical names follow the official format specification.
 */
export const diseaseNameMappings: DiseaseNameMapping[] = [
  // ============================================================================
  // Cardiovascular and Metabolic Disorders
  // ============================================================================
  {
    canonical: "Cardiovascular Disease (CVD)",
    variations: [
      "Cardiovascular Disease (CVD) [1]",
      "Cardiovascular Disease (CVD) [2]",
      "Cardiovascular Disease (CVD)",
    ],
  },
  {
    canonical: "Stroke",
    variations: [
      "Stroke",
      "Stroke (Ischemic & Hemorrhagic)",
    ],
  },
  {
    canonical: "Obesity",
    variations: [
      "Obesity (BMI ≥30)",
      "Obesity",
    ],
  },
  
  // ============================================================================
  // Cancers
  // ============================================================================
  {
    canonical: "Breast Cancer",
    variations: [
      "Breast Cancer (Female)",
      "Breast Cancer",
    ],
  },
  {
    canonical: "Liver Cancer (NAFLD, Cirrhosis-related HCC)",
    variations: [
      "Liver Cancer (incl. HCC)",
      "Liver Cancer",
      "Liver Cancer (NAFLD, Cirrhosis-related HCC)",
    ],
  },
  
  // ============================================================================
  // Respiratory Diseases
  // ============================================================================
  {
    canonical: "Sleep Apnea",
    variations: [
      "Sleep Apnea (Diagnosed)",
      "Sleep Apnea (OSA)",
      "Sleep Apnea",
    ],
  },
  
  // ============================================================================
  // Neurological Disorders
  // ============================================================================
  {
    canonical: "Alzheimer's Disease / Dementia",
    variations: [
      "Alzheimer's Disease / Dementia",
      "Alzheimer's Disease",
      "Dementia",
      "Alzheimer / Dementia",
    ],
  },
  {
    canonical: "Developmental Disorders (e.g., Cerebral Palsy)",
    variations: [
      "Developmental Disorders (e.g., Cerebral Palsy)",
      "Developmental Disorders",
      "Developmental Disorders (Cerebral Palsy)",
    ],
  },
  {
    canonical: "Autism Spectrum Disorder (ASD)",
    variations: [
      "Autism Spectrum Disorder (ASD)",
      "Autism Spectrum Disorder",
      "Autism Spectrum Disorder (ASD)",
    ],
  },
  
  // ============================================================================
  // Musculoskeletal Disorders
  // ============================================================================
  {
    canonical: "Rheumatoid Arthritis / Inflammatory Arthritis",
    variations: [
      "Rheumatoid Arthritis / Inflammatory Arthritis",
      "Rheumatoid Arthritis (RA)",
      "Rheumatoid Arthritis",
      "Inflammatory Arthritis",
    ],
  },
  {
    canonical: "Low Back Pain",
    variations: [
      "Low Back Pain",
      "Low Back",
    ],
  },
  
  // ============================================================================
  // Mental and Behavioral Disorders
  // ============================================================================
  {
    canonical: "Depression",
    variations: [
      "Depression (Major Depressive Episode)",
      "Depression",
    ],
  },
  {
    canonical: "Eating Disorders",
    variations: [
      "Eating Disorders (e.g., Anorexia, Bulimia)",
      "Eating Disorders",
    ],
  },
  {
    canonical: "Substance Use Disorders",
    variations: [
      "Substance Use Disorders (SUD) [4]",
      "Substance Use Disorders",
      "Substance Use Disorders (Alcohol & Drugs)",
      "Substance Use Disorders (Alcohol)",
    ],
  },
  {
    canonical: "Sleep Disorders",
    variations: [
      "Sleep Disorders (Insomnia, etc.) [5]",
      "Sleep Disorders (Insomnia)",
      "Sleep Disorders",
    ],
  },
  {
    canonical: "Schizophrenia / Psychotic Disorders",
    variations: [
      "Schizophrenia / Psychotic Disorders",
      "Schizophrenia",
      "Psychotic Disorders",
    ],
  },
  
  // ============================================================================
  // Endocrine and Hematologic Disorders
  // ============================================================================
  {
    canonical: "Thyroid Disorders",
    variations: [
      "Thyroid Disorders (Hypothyroidism) [1]",
      "Thyroid Disorders",
      "Thyroid Disorders (Hypo/Hyperthyroidism)",
      "Thyroid Disorders (Hypo/Hyper)",
      "Thyroid Disorders (All)",
    ],
  },
  {
    canonical: "Anemia (Iron-deficiency anemia)",
    variations: [
      "Anemia (Iron-deficiency anemia) [2]",
      "Anemia (Iron-deficiency anemia)",
      "Anemia (Iron-deficiency)",
      "Iron-Deficiency Anemia (IDA)",
    ],
  },
  
  // ============================================================================
  // High-Burden Infectious Diseases
  // ============================================================================
  {
    canonical: "Hepatitis B & C",
    variations: [
      "Hepatitis B & C",
      "Hepatitis B is", // Typo fix - maps to combined entry
      "Hepatitis B (Chronic)",
      "Hepatitis B (HBsAg+)",
      "Hepatitis B (HBV)",
      "Hepatitis C (Chronic)",
      "Hepatitis C (RNA+)",
      "Hepatitis C (HCV)",
    ],
  },
  {
    canonical: "Ebola / Marburg Virus",
    variations: [
      "Ebola / Marburg Virus",
      "Ebola / Marburg",
    ],
  },
  {
    canonical: "STIs (e.g., Syphilis, Gonorrhea, HPV)",
    variations: [
      "STIs (Chlamydia, Gonorrhea, Syphilis)",
      "STIs (Syphilis, Gonorrhea, Chlamydia)",
      "STIs (Syphilis)",
      "STIs (e.g., Syphilis, Gonorrhea)",
      "STIs (e.g., Syphilis, Gonorrhea, HPV)",
    ],
  },
  {
    canonical: "Leprosy (Hansen's Disease)",
    variations: [
      "Leprosy (Hansen's Disease)",
      "Leprosy",
    ],
  },
  
  // ============================================================================
  // Neglected Tropical Diseases
  // ============================================================================
  {
    canonical: "Leishmaniasis",
    variations: [
      "Leishmaniasis",
      "Leishmaniasis (Kala-azar)",
      "Leishmaniasis (VL & CL)",
    ],
  },
  {
    canonical: "Soil-transmitted helminths",
    variations: [
      "Soil-transmitted helminths",
      "Soil-transmitted Helminths",
      "Soil-transmitted helminths (Ascaris, Hookworm, etc.)",
    ],
  },
  {
    canonical: "Schistosomiasis",
    variations: [
      "Schistosomiasis",
      "Schistosomiasis (Manson's)",
    ],
  },
  
  // ============================================================================
  // Injuries & Trauma
  // ============================================================================
  {
    canonical: "Road Traffic Accidents (MVA)",
    variations: [
      "Road Traffic Accidents (MVA)",
      "Road Traffic Accidents",
    ],
  },
  {
    canonical: "Firearm-related Injuries",
    variations: [
      "Firearm-related Injuries",
      "Firearm-related Injuries (Assault)",
      "Firearm-related",
    ],
  },
  {
    canonical: "Natural Disaster-related Injuries",
    variations: [
      "Natural Disaster-related Injuries",
      "Natural Disaster-related",
      "Natural Disasters",
    ],
  },
  {
    canonical: "Conflict-Related Injuries",
    variations: [
      "Conflict-Related Injuries",
      "Conflict-Related",
    ],
  },
  
  // ============================================================================
  // Violence & Self-Harm
  // ============================================================================
  {
    canonical: "Domestic Violence",
    variations: [
      "Domestic Violence (Intimate Partner Violence)",
      "Domestic Violence (IPV)",
      "Domestic Violence (Physical/Sexual by partner)",
      "Domestic Violence (reported)",
      "Domestic Violence",
    ],
  },
  {
    canonical: "Child Abuse",
    variations: [
      "Child Abuse (Maltreatment)",
      "Child Abuse",
      "Child Abuse (Violence)",
      "Child Abuse (reported)",
    ],
  },
  {
    canonical: "Gender-Based Violence (GBV)",
    variations: [
      "Gender-Based Violence (GBV) [6]",
      "Gender-Based Violence (GBV) [4]",
      "Gender-Based Violence (GBV)",
      "Gender-Based Violence (GBV) (non-domestic)",
      "Gender-Based Violence (non-domestic)",
      "Gender-Based Violence",
    ],
  },
  
  // ============================================================================
  // Maternal, Neonatal, and Child Health
  // ============================================================================
  {
    canonical: "Preeclampsia / Eclampsia",
    variations: [
      "Preeclampsia / Eclampsia",
      "Preeclampsia",
      "Eclampsia",
    ],
  },
  {
    canonical: "Preterm Birth",
    variations: [
      "Preterm Birth (<37 weeks)",
      "Preterm Birth",
    ],
  },
  {
    canonical: "Low Birth Weight",
    variations: [
      "Low Birth Weight (<2500g)",
      "Low Birth Weight",
    ],
  },
  
  // ============================================================================
  // Environmental & Occupational Health
  // ============================================================================
  {
    canonical: "Lead Poisoning",
    variations: [
      "Lead Poisoning (≥5 µg/dL) [1]",
      "Lead Poisoning (≥3.5 µg/dL) [1]",
      "Lead Poisoning (BLL >5μg/dL)",
      "Lead Poisoning",
    ],
  },
  {
    canonical: "Heavy Metal Toxicity",
    variations: [
      "Heavy Metal Toxicity (Arsenic, Mercury, Cadmium) [2]",
      "Heavy Metal Toxicity",
      "Heavy Metal Toxicity (e.g., Mercury)",
    ],
  },
  {
    canonical: "Pesticide-Related Illnesses",
    variations: [
      "Pesticide-Related Illnesses",
      "Pesticide Poisoning",
      "Pesticide-Related Illnesses",
    ],
  },
  {
    canonical: "Occupational Lung Diseases",
    variations: [
      "Occupational Lung Diseases(Pneumoconiosis) [3]",
      "Occupational Lung Diseases",
      "Occupational Lung Diseases (e.g., Silicosis, Asbestosis)",
      "Occupational Lung Diseases (Silicosis, Asbestosis)",
    ],
  },
  {
    canonical: "Heat-Related Illnesses",
    variations: [
      "Heat-Related Illnesses",
      "Heat-Related Illness",
    ],
  },
  {
    canonical: "Radiation Exposure Disorders",
    variations: [
      "Radiation Exposure Disorders (Non-medical) [5]",
      "Radiation Exposure Disorders",
    ],
  },
  
  // ============================================================================
  // Sensory Disorders
  // ============================================================================
  {
    canonical: "Hearing Loss",
    variations: [
      "Hearing Loss (≥25 dB) [1]",
      "Hearing Loss (Disabling, >40 dB)",
      "Hearing Loss (Disabling, >35 dB)",
      "Hearing Loss (Disabling)",
      "Hearing Loss",
    ],
  },
  {
    canonical: "Age-related Macular Degeneration (AMD)",
    variations: [
      "Age-related Macular Degeneration (AMD)",
      "Age-related Macular Degeneration",
    ],
  },
];

/**
 * Normalizes whitespace and special characters for better matching
 */
function normalizeWhitespace(str: string): string {
  return str
    .replace(/\u00A0/g, ' ') // Replace non-breaking spaces with regular spaces
    .replace(/\u2009/g, ' ') // Replace thin spaces
    .replace(/\u202F/g, ' ') // Replace narrow no-break spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces to single space
    .trim();
}

/**
 * Creates a reverse lookup map from variation to canonical name
 * Uses normalized whitespace to handle non-breaking spaces and other whitespace variations
 */
const variationToCanonical = new Map<string, string>();
diseaseNameMappings.forEach(mapping => {
  mapping.variations.forEach(variation => {
    const normalized = normalizeWhitespace(variation);
    variationToCanonical.set(normalized, mapping.canonical);
    // Also add case-insensitive version
    variationToCanonical.set(normalized.toLowerCase(), mapping.canonical);
  });
  // Add canonical to itself (with normalized whitespace)
  const normalizedCanonical = normalizeWhitespace(mapping.canonical);
  variationToCanonical.set(normalizedCanonical, mapping.canonical);
  variationToCanonical.set(normalizedCanonical.toLowerCase(), mapping.canonical);
});

/**
 * Normalizes a disease name to its canonical form
 * @param diseaseName The disease name to normalize
 * @returns The canonical disease name, or the original if no mapping exists
 */
export function normalizeDiseaseName(diseaseName: string): string {
  if (!diseaseName) return diseaseName;
  
  // First normalize whitespace (handles non-breaking spaces, etc.)
  const normalized = normalizeWhitespace(diseaseName);
  
  // Check exact match first
  if (variationToCanonical.has(normalized)) {
    return variationToCanonical.get(normalized)!;
  }
  
  // Check case-insensitive match
  const lower = normalized.toLowerCase();
  if (variationToCanonical.has(lower)) {
    return variationToCanonical.get(lower)!;
  }
  
  // Try fuzzy matching - remove brackets and their contents, then match
  const withoutBrackets = normalizeWhitespace(normalized.replace(/\s*\[[^\]]+\]\s*/g, ''));
  if (withoutBrackets !== normalized && variationToCanonical.has(withoutBrackets)) {
    return variationToCanonical.get(withoutBrackets)!;
  }
  if (withoutBrackets !== normalized) {
    const lowerWithoutBrackets = withoutBrackets.toLowerCase();
    if (variationToCanonical.has(lowerWithoutBrackets)) {
      return variationToCanonical.get(lowerWithoutBrackets)!;
    }
  }
  
  // Try matching base name (remove parenthetical content)
  const baseName = normalizeWhitespace(normalized.replace(/\s*\([^)]*\)\s*/g, ''));
  if (baseName !== normalized && variationToCanonical.has(baseName)) {
    return variationToCanonical.get(baseName)!;
  }
  if (baseName !== normalized) {
    const lowerBaseName = baseName.toLowerCase();
    if (variationToCanonical.has(lowerBaseName)) {
      return variationToCanonical.get(lowerBaseName)!;
    }
  }
  
  // No mapping found, return normalized (whitespace cleaned) original
  return normalized;
}
