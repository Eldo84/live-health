import { OpenAI } from "npm:openai@6";
import type { NormalizedArticle } from "./types.ts";
import { getAllCountryNames, getNormalizedCountryName } from "./countries.ts";
import { loadHumanDiseaseCSV, loadVeterinaryDiseaseCSV } from "./spreadsheet.ts";

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: Deno.env.get("DEEPSEEK_API_KEY"),
});

// Fallback function to extract country from article content when AI doesn't extract it
function extractCountryFallback(article: NormalizedArticle): string | undefined {
  const text = `${article.title} ${article.content || ""} ${article.translatedText || ""}`.toLowerCase();
  const allCountries = getAllCountryNames();
  
  // Source-based inference
  if (article.source === "CDC" || article.source === "CDC MMWR") {
    return "United States";
  }
  
  // Language-based inference
  if (article.language === "pt" || article.language === "pt-BR") {
    // Portuguese - check for Brazil/Portugal mentions
    if (text.includes("brasil") || text.includes("brazil") || text.includes("são paulo") || text.includes("rio de janeiro")) {
      return "Brazil";
    }
    if (text.includes("portugal") || text.includes("lisboa")) {
      return "Portugal";
    }
  }
  
  if (article.language === "es" || article.language === "es-ES" || article.language === "es-MX") {
    // Spanish - check for Spanish-speaking countries
    const spanishCountries = ["Spain", "Mexico", "Argentina", "Colombia", "Chile", "Peru", "Venezuela", "Ecuador", "Guatemala", "Cuba", "Haiti", "Dominican Republic", "Honduras", "Paraguay", "Nicaragua", "El Salvador", "Costa Rica", "Panama", "Uruguay", "Bolivia"];
    for (const country of spanishCountries) {
      if (text.includes(country.toLowerCase())) {
        return country;
      }
    }
  }
  
  // Try to find country names in text (case-insensitive)
  // Sort by length (longest first) to match "United States" before "States"
  const sortedCountries = allCountries.sort((a, b) => b.length - a.length);
  for (const country of sortedCountries) {
    const countryLower = country.toLowerCase();
    // Match whole word or as part of phrases like "in [Country]", "[Country] reports", etc.
    const patterns = [
      new RegExp(`\\bin\\s+${countryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
      new RegExp(`\\b${countryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(?:reports|confirms|announces|detects)`, 'i'),
      new RegExp(`\\b(?:outbreak|cases|reports)\\s+(?:in|from|at)\\s+${countryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
    ];
    
    if (patterns.some(p => p.test(text)) || text.includes(countryLower)) {
      return country;
    }
  }
  
  // City-to-country mapping for common cities
  const cityCountryMap: Record<string, string> = {
    "new york": "United States",
    "los angeles": "United States",
    "chicago": "United States",
    "houston": "United States",
    "philadelphia": "United States",
    "phoenix": "United States",
    "san antonio": "United States",
    "san diego": "United States",
    "dallas": "United States",
    "london": "United Kingdom",
    "manchester": "United Kingdom",
    "birmingham": "United Kingdom",
    "paris": "France",
    "lyon": "France",
    "marseille": "France",
    "berlin": "Germany",
    "munich": "Germany",
    "hamburg": "Germany",
    "tokyo": "Japan",
    "osaka": "Japan",
    "são paulo": "Brazil",
    "rio de janeiro": "Brazil",
    "brasília": "Brazil",
    "mexico city": "Mexico",
    "guadalajara": "Mexico",
    "mumbai": "India",
    "delhi": "India",
    "bangalore": "India",
    "kolkata": "India",
    "sydney": "Australia",
    "melbourne": "Australia",
    "toronto": "Canada",
    "vancouver": "Canada",
    "montreal": "Canada",
  };
  
  for (const [city, country] of Object.entries(cityCountryMap)) {
    if (text.includes(city)) {
      return country;
    }
  }
  
  return undefined;
}

const generateSystemPrompt = (humanDiseaseCSV: string, veterinaryDiseaseCSV: string) => {
  return `
You are a disease outbreak classifier. Your job is to identify ACTIVE DISEASE OUTBREAKS from news articles.

=== WHAT IS AN OUTBREAK? ===
An outbreak is a CURRENT, LOCALIZED increase in disease cases in a specific geographic area.
- Must be an INFECTIOUS DISEASE or health emergency
- Must have CURRENT/RECENT cases (not historical statistics)
- Must be in a SPECIFIC LOCATION (country/city), not global aggregates

=== CRITICAL: WHAT TO SKIP (DO NOT CREATE SIGNALS FOR) ===

1. **NON-DISEASE EVENTS** - Skip these entirely:
   - Weather/disasters: typhoons, hurricanes, floods, droughts, earthquakes, cyclones
   - Violence/conflict: war, violence against women, landmine injuries, conflict deaths
   - Social issues: poverty, hunger (unless acute malnutrition outbreak)
   - Accidents: traffic deaths, industrial accidents
   
2. **GLOBAL STATISTICS** - Skip these entirely:
   - "X million people living with HIV worldwide" → This is PREVALENCE, not an outbreak
   - "Measles cases since 2000" → This is HISTORICAL, not current outbreak
   - "840 million women faced violence" → This is LIFETIME statistics, not outbreak
   - Any "worldwide", "globally", "since [year]" statistics
   
3. **VACCINATION CAMPAIGNS** - Do NOT confuse with disease cases:
   - "4.5 million children to be vaccinated" → This is VACCINATION TARGET, not disease cases
   - "Campaign targets X million" → Skip or set case_count to null
   - Only extract actual DISEASE CASES, never vaccination numbers
   
4. **CHRONIC/NON-INFECTIOUS CONDITIONS**:
   - Cancer, diabetes, heart disease, stroke, cerebrovascular disease
   - Mental health statistics
   - These are NOT outbreak diseases

=== CASE COUNT RULES ===

CRITICAL: Only extract case counts that represent ACTUAL CURRENT OUTBREAK CASES:

✅ EXTRACT these as case counts:
- "50 people hospitalized with cholera"
- "Health officials report 200 new measles cases"
- "Outbreak has infected 150 residents"

❌ DO NOT extract these as case counts (use null instead):
- "40 million people living with HIV" → Global prevalence, use null
- "11 million cases since 2000" → Historical cumulative, use null  
- "5 million children to be vaccinated" → Vaccination target, use null
- "15 million affected by typhoon" → Disaster victims, SKIP ARTICLE
- "840 million women faced violence" → Lifetime statistic, SKIP ARTICLE

SANITY CHECK: If a case count seems impossibly high for a single outbreak (>100,000 for most diseases, >1,000,000 for any disease), it's probably:
- A global statistic (use null)
- A historical cumulative number (use null)
- A vaccination target (use null)
- Not an outbreak at all (skip the article)

=== CSV DISEASE LISTS ===

HUMAN DISEASES CSV:
\`\`\`csv
${humanDiseaseCSV}
\`\`\`

VETERINARY DISEASES CSV:
\`\`\`csv
${veterinaryDiseaseCSV}
\`\`\`

=== MATCHING RULES ===

1. Match diseases from BOTH spreadsheets
2. If found in HUMAN CSV → mark as "human"
3. If found in VETERINARY CSV → mark as "veterinary"  
4. Zoonotic diseases (affect both): Avian Influenza, Rabies, Anthrax, Leptospirosis, Q Fever, Rift Valley Fever → mark as "zoonotic"
5. If disease NOT in CSV, use "OTHER" with detected_disease_name field

=== OUTPUT FORMAT (JSON) ===

Return a valid JSON array of outbreak signals. For each valid outbreak article, output a string in this format:
"id => diseases (| separated) => detected_disease_name => disease_type => country => city => case_count_mentioned => mortality_count_mentioned => confidence_score"

Rules:
- detected_disease_name: Only if using "OTHER", otherwise "null"
- disease_type: "human", "veterinary", "zoonotic", or "null"
- country: Must be from this list: ${JSON.stringify(getAllCountryNames())}
- case_count_mentioned: ONLY actual outbreak cases, use "null" for global/historical stats
- mortality_count_mentioned: ONLY outbreak deaths, use "null" if unclear
- confidence_score: 0-1, lower if uncertain

=== EXAMPLES (JSON array format) ===

GOOD - Create signal (return as JSON array):
[
"1 => Cholera => null => human => Haiti => Port-au-Prince => 500 => 12 => 0.95",
"2 => Avian Influenza (Bird Flu) => null => zoonotic => Vietnam => Hanoi => 50000 => 200 => 0.9",
"3 => OTHER => Chronic Wasting Disease => veterinary => United States => Wisconsin => 3 => null => 0.85"
]

BAD - Would skip or use null:
- Article about "40.8 million people living with HIV globally" → SKIP (global prevalence, not outbreak)
- Article about "Typhoon affects 15 million" → SKIP (not a disease)
- Article about "4.5 million children to be vaccinated against polio" → If included, case_count = null (vaccination campaign)
- Article about "Violence against women epidemic" → SKIP (not a disease)
- Article about "Measles deaths down 88% since 2000, 11 million cases" → case_count = null (historical stat)

`;
};

export async function deepseekMatchArticles(opts: {
  articles: NormalizedArticle[];
}): Promise<NormalizedArticle[]> {
  const { articles } = opts;
  const [humanDiseaseCSV, veterinaryDiseaseCSV] = await Promise.all([
    loadHumanDiseaseCSV(),
    loadVeterinaryDiseaseCSV(),
  ]);

  // Prepare article data with title and content (limit content to 2000 chars to avoid token limits)
  // Strip HTML tags and clean up whitespace for better AI processing
  // Use translated text if available, otherwise use original content
  const articleData = articles.map((a) => {
    // Prefer translated text for AI matching (it's in English)
    let contentPreview = a.translatedText || a.content || "";
    // Remove HTML tags
    contentPreview = contentPreview.replace(/<[^>]*>/g, " ");
    // Replace multiple spaces/newlines with single space
    contentPreview = contentPreview.replace(/\s+/g, " ").trim();
    // Limit to 2000 characters
    contentPreview = contentPreview.substring(0, 2000);
    
    // Include language info if available for context
    const languageInfo = a.language && a.language !== "en" 
      ? ` [Original language: ${a.language}]` 
      : "";
    
    return `${a.id} => Title: ${a.title}${languageInfo} | Content: ${contentPreview || "No content available"}`;
  });

  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: generateSystemPrompt(humanDiseaseCSV, veterinaryDiseaseCSV) },
      {
        role: "user",
        content: JSON.stringify(articleData),
      },
    ],
    model: "deepseek-chat",
    response_format: { type: "json_object" },
  });

  console.log(
    `DEEPSEEK MATCH COMPLETION TOKENS: total=${completion.usage?.total_tokens}, prompt=${completion.usage?.prompt_tokens}, completion=${completion.usage?.completion_tokens}`
  );

  // Log raw AI response for debugging
  const rawResponse = completion.choices[0].message.content || "[]";
  console.log(`AI RAW RESPONSE (first 500 chars): ${rawResponse.substring(0, 500)}`);

  let matches: string[] = [];
  let parsed: any = null;
  try {
    parsed = JSON.parse(rawResponse);
  } catch (error) {
    console.error("Error parsing DeepSeek match completion:", error);
    const fallback = rawResponse.match(/\[[\s\S]*\]/);
    if (fallback && fallback[0]) {
      try {
        parsed = JSON.parse(fallback[0]);
        console.warn("Fallback JSON parsing succeeded after extracting array content.");
      } catch (fallbackError) {
        console.error("Fallback JSON parse failed:", fallbackError);
      }
    }
  }

  if (parsed) {
    if (Array.isArray(parsed)) {
      matches = parsed;
    } else if (parsed && typeof parsed === "object" && parsed.matches && Array.isArray(parsed.matches)) {
      matches = parsed.matches;
    } else if (parsed && typeof parsed === "object") {
      const arrayKey = Object.keys(parsed).find((key) => Array.isArray(parsed[key]));
      if (arrayKey) {
        matches = parsed[arrayKey];
      }
    }
  }

  // List of non-disease terms that should be filtered out
  const nonDiseaseTerms = new Set([
    // Weather/disasters
    "typhoon", "hurricane", "flood", "floods", "drought", "cyclone", "tropical cyclone",
    "earthquake", "tornado", "storm", "landslide", "wildfire", "tsunami",
    // Violence/conflict
    "violence", "violence against women", "war", "conflict", "war-related",
    "landmine", "landmine injuries", "violence-related deaths", "terrorism",
    // Humanitarian (not diseases)
    "malnutrition", "hunger", "famine", "starvation",
    "poverty", "unemployment", "displacement", "refugee", "migration",
    "humanitarian crisis", "humanitarian", "food insecurity",
    // Medical procedures (not diseases)
    "vaccination", "vaccine", "immunization", "immunisation", "doses",
    // Chronic conditions (not outbreaks)
    "heart disease", "alzheimer", "cancer", "diabetes", "obesity",
    "stroke", "cerebrovascular", "hypertension",
    // Meta/vague terms
    "ai tool", "disease surveillance", "health system", "disease",
    "environmental disease", "fire outbreak",
    // Acute respiratory infections (too vague as "OTHER")
    "acute respiratory infections",
  ]);

  // Function to check if detected disease name is actually a non-disease
  const isNonDisease = (name: string | undefined): boolean => {
    if (!name) return false;
    const lower = name.toLowerCase();
    return Array.from(nonDiseaseTerms).some(term => lower.includes(term));
  };

  // Function to validate case count - reject obviously wrong numbers
  const validateCaseCount = (count: number | undefined, diseaseName: string): number | undefined => {
    if (count === undefined || count === null) return undefined;
    
    // If case count is suspiciously high, it's probably global statistics
    // Most real outbreaks have <100,000 cases in a single report
    // Exception: very large outbreaks like COVID or seasonal flu
    const MAX_REASONABLE_OUTBREAK = 1000000; // 1 million is max reasonable for single outbreak report
    const LIKELY_GLOBAL_STAT = 10000000; // 10 million is almost certainly global stat
    
    if (count >= LIKELY_GLOBAL_STAT) {
      console.log(`[VALIDATION] Rejecting case count ${count} for ${diseaseName} - likely global statistic`);
      return undefined;
    }
    
    if (count >= MAX_REASONABLE_OUTBREAK) {
      // For very high counts, check if disease makes sense
      const highVolumeDiseasesOk = ["influenza", "covid", "flu", "measles", "dengue"];
      const lowerName = diseaseName.toLowerCase();
      if (!highVolumeDiseasesOk.some(d => lowerName.includes(d))) {
        console.log(`[VALIDATION] Rejecting case count ${count} for ${diseaseName} - too high for this disease`);
        return undefined;
      }
    }
    
    return count;
  };

  const articleMatches = matches
    .filter((match) => typeof match === "string") // Only process string matches
    .map((match) => {
      const parts = match.split(" => ");
      // Parse fields: id => diseases => detected_disease_name => disease_type => country => city => case_count_mentioned => mortality_count_mentioned => confidence_score
      // Handle different formats for backward compatibility
      const [
        id,
        diseases,
        detected_disease_name,
        disease_type,
        country,
        city,
        case_count_mentioned,
        mortality_count_mentioned,
        confidence_score,
      ] = parts.length === 9 
        ? parts // New format with mortality_count_mentioned
        : parts.length === 8
        ? [...parts.slice(0, 7), null, parts[7]] // Old format without mortality (add null for mortality)
        : parts.length === 7
        ? [parts[0], parts[1], null, null, parts[2], parts[3], parts[4], null, parts[5]] // Very old format
        : [parts[0], parts[1], null, null, parts[2], parts[3], parts[4], null, parts[5]]; // Fallback

      const article = articles.find(
        (a) => id && a.id && a.id.toString() === id.toString()
      );
      if (!article) return null;

      // cleanup diseases array from AI response
      const diseasesArray = (diseases?.split("|") ?? [])
        .map((d) => d.trim())
        .filter(
          (d) =>
            typeof d === "string" &&
            d.trim() !== "" &&
            d !== "null" &&
            d !== "undefined"
        );

      // Normalize "null" string to actual null/undefined
      const normalizedCity = city && city !== "null" && city.trim() !== "" ? city : undefined;
      const normalizedDetectedDisease = detected_disease_name && 
                                        detected_disease_name !== "null" && 
                                        detected_disease_name.trim() !== "" 
                                        ? detected_disease_name.trim() 
                                        : undefined;
      
      // Skip non-disease entries (typhoons, violence, etc.)
      if (isNonDisease(normalizedDetectedDisease)) {
        console.log(`[FILTER] Skipping non-disease entry: "${normalizedDetectedDisease}" from article: "${article.title.substring(0, 50)}"`);
        return null;
      }

      const normalizedDiseaseType = disease_type && 
                                     disease_type !== "null" && 
                                     disease_type.trim() !== "" &&
                                     ["human", "veterinary", "zoonotic"].includes(disease_type.trim().toLowerCase())
                                     ? disease_type.trim().toLowerCase() as "human" | "veterinary" | "zoonotic"
                                     : undefined;

      // Note: The AI can optionally provide disease_type. If provided, it will be used.
      // Otherwise, the spreadsheet matching in storage.ts will determine disease_type
      // based on which spreadsheet the disease is found in.

      // Normalize country - handle "null" strings and empty values
      // Only normalize if country exists and is not "null"
      let normalizedCountry = country && 
                                country !== "null" && 
                                country.trim() !== "" 
                                ? getNormalizedCountryName(country) 
                                : undefined;
      
      // Fallback: If AI didn't extract country, try to extract it from article content
      if (!normalizedCountry) {
        const fallbackCountry = extractCountryFallback(article);
        if (fallbackCountry) {
          normalizedCountry = getNormalizedCountryName(fallbackCountry);
          if (normalizedCountry) {
            console.log(`[FALLBACK] Extracted country "${normalizedCountry}" from article: "${article.title.substring(0, 60)}"`);
          }
        }
      }
      
      // Parse and validate case counts
      const rawCaseCount = case_count_mentioned && case_count_mentioned !== "null"
        ? parseInt(case_count_mentioned)
        : undefined;
      const rawMortalityCount = mortality_count_mentioned && mortality_count_mentioned !== "null"
        ? parseInt(mortality_count_mentioned)
        : undefined;
      
      // Validate case count - reject obviously wrong numbers
      const diseaseName = normalizedDetectedDisease || diseasesArray[0] || "Unknown";
      const validatedCaseCount = validateCaseCount(rawCaseCount, diseaseName);
      const validatedMortalityCount = validateCaseCount(rawMortalityCount, diseaseName);
      
      return {
        ...article,
        location: normalizedCountry ? {
          country: normalizedCountry,
          city: normalizedCity,
        } : undefined,
        diseases: diseasesArray,
        detected_disease_name: normalizedDetectedDisease,
        disease_type: normalizedDiseaseType,
        case_count_mentioned: validatedCaseCount,
        mortality_count_mentioned: validatedMortalityCount,
        confidence_score: confidence_score ? parseFloat(confidence_score) : 0.5,
      };
    })
    .filter((article) => article !== null)
    .filter((article) => article.diseases && article.diseases.length > 0); // must match at least one disease
    // Note: We no longer filter out articles without countries - they'll be stored but won't create signals

  return articleMatches;
}

