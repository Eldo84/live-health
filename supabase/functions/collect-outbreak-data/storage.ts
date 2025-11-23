import { type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { isLikelySameString } from "./utils.ts";
import type { DiseaseInfo, NormalizedArticle } from "./types.ts";
import { getCountryInfo } from "./countries.ts";
import { loadHumanDiseaseCSV, loadVeterinaryDiseaseCSV, csvToJson } from "./spreadsheet.ts";

// Geocode city using OpenCage API
async function geocodeCity(
  cityName: string,
  countryName?: string
): Promise<[number, number] | null> {
  const opencageKey = Deno.env.get("OPENCAGE_API_KEY");
  if (!opencageKey) {
    console.log(`OpenCage API key not found in environment variables`);
    return null;
  }
  if (!cityName) return null;

  try {
    // Build query: city + country for better accuracy
    const query = countryName
      ? `${cityName}, ${countryName}`
      : cityName;

    // Rate limiting: wait 1 second between requests to avoid hitting rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const geocodeUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${opencageKey}&limit=1&no_annotations=1`;
    console.log(`Attempting to geocode: ${query}`);
    const geocodeRes = await fetch(geocodeUrl);

    if (!geocodeRes.ok) {
      console.error(`OpenCage API error for ${query}: ${geocodeRes.status} ${geocodeRes.statusText}`);
      return null;
    }

    const geocodeData = await geocodeRes.json();
    
    if (!geocodeData.results || geocodeData.results.length === 0) {
      console.log(`No results from OpenCage for ${query}`);
      return null;
    }

    const result = geocodeData.results[0];

    if (result?.geometry) {
      const lat = result.geometry.lat;
      const lng = result.geometry.lng;
      console.log(`Successfully geocoded ${query} -> ${lat}, ${lng}`);
      return [lat, lng];
    } else {
      console.log(`No geometry in OpenCage result for ${query}`);
      return null;
    }
  } catch (error) {
    console.error(`Geocoding failed for ${cityName}:`, error);
    return null;
  }
}

export async function matchDiseaseFromSpreadsheet(
  disease: string,
  checkVeterinary: boolean = false // Deprecated: Now always checks both spreadsheets, kept for backward compatibility
): Promise<DiseaseInfo | null> {
  // Load human disease spreadsheet (always needed)
  const humanDiseaseCSV = await loadHumanDiseaseCSV();
  const humanDiseaseJson = await csvToJson(humanDiseaseCSV);

  // Helper function to find matching row
  const findMatchingRow = (json: any[]) => {
    return json.find((row) => {
      const rowDisease = row["Disease"];
      const rowKeywords = row["Keywords"];

      if (rowDisease && isLikelySameString(disease, rowDisease)) {
        return true;
      }
      if (
        rowKeywords &&
        rowKeywords
          .split(",")
          .map((keyword: string) => keyword.trim())
          .some((keyword: string) => isLikelySameString(disease, keyword))
      ) {
        return true;
      }
      return false;
    });
  };

  // Check human diseases first (primary source)
  let row = findMatchingRow(humanDiseaseJson);
  let diseaseType: "human" | "veterinary" | "zoonotic" = "human";

  if (row) {
    // Found in human spreadsheet - mark as human
    diseaseType = "human";
  } else {
    // Not found in human spreadsheet - check veterinary spreadsheet
    const veterinaryDiseaseCSV = await loadVeterinaryDiseaseCSV();
    const veterinaryDiseaseJson = await csvToJson(veterinaryDiseaseCSV);
    row = findMatchingRow(veterinaryDiseaseJson);
    
    if (row) {
      // Found in veterinary spreadsheet - check if it's a zoonotic disease (affects both humans and animals)
      const zoonoticDiseases = [
        "Avian Influenza",
        "Bird Flu",
        "Rabies",
        "Anthrax",
        "Leptospirosis",
        "Q Fever",
        "Rift Valley Fever",
      ];
      const isZoonotic = zoonoticDiseases.some((zoonotic) =>
        row["Disease"]?.toLowerCase().includes(zoonotic.toLowerCase())
      );
      diseaseType = isZoonotic ? "zoonotic" : "veterinary";
    }
  }

  if (!row) {
    console.warn(`Disease or Keyword "${disease}" not found in either spreadsheet`);
    return null;
  }

  return {
    diseaseName: row["Disease"],
    pathogen: row["Pathogen"],
    category: row["Outbreak Category"],
    pathogenType: row["PathogenType"],
    keywords: row["Keywords"],
    diseaseType: diseaseType,
  };
}

// Helper function to get or create an outbreak category
async function getOrCreateCategory(
  supabase: SupabaseClient,
  categoryName: string
): Promise<string | null> {
  if (!categoryName || !categoryName.trim()) {
    return null;
  }
  
  const normalizedName = categoryName.trim();
  
  // Check if category exists (case-insensitive match)
  const { data: existingCategory } = await supabase
    .from("outbreak_categories")
    .select("id, name")
    .ilike("name", normalizedName)
    .maybeSingle();
  
  if (existingCategory) {
    return existingCategory.id;
  }
  
  // Check for exact match (case-sensitive) as fallback
  const { data: exactMatch } = await supabase
    .from("outbreak_categories")
    .select("id")
    .eq("name", normalizedName)
    .maybeSingle();
  
  if (exactMatch) {
    return exactMatch.id;
  }
  
  // Create new category with default values
  // Use a color palette that cycles based on category name hash
  const defaultColors = [
    "#8b5cf6", // purple
    "#06b6d4", // cyan
    "#f59e0b", // amber
    "#10b981", // green
    "#ec4899", // pink
    "#6366f1", // indigo
    "#14b8a6", // teal
    "#f97316", // orange
    "#ef4444", // red
    "#3b82f6", // blue
  ];
  
  // Use hash of name to consistently assign colors
  let hash = 0;
  for (let i = 0; i < normalizedName.length; i++) {
    hash = ((hash << 5) - hash) + normalizedName.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  const colorIndex = Math.abs(hash) % defaultColors.length;
  const defaultColor = defaultColors[colorIndex];
  
  const { data: newCategory, error } = await supabase
    .from("outbreak_categories")
    .insert({
      name: normalizedName,
      description: `Category: ${normalizedName}`,
      color: defaultColor,
      icon: "alert-circle", // Default icon
    })
    .select("id")
    .single();
  
  if (error || !newCategory) {
    console.error(`Error creating category "${normalizedName}":`, error);
    return null;
  }
  
  console.log(`Created new category: "${normalizedName}" with color ${defaultColor}`);
  return newCategory.id;
}

export async function getOrCreateDisease({
  supabase,
  disease,
  detectedDiseaseName,
  aiDetectedDiseaseType,
}: {
  supabase: SupabaseClient;
  disease: string;
  detectedDiseaseName?: string; // Actual disease name when disease is "OTHER"
  aiDetectedDiseaseType?: "human" | "veterinary" | "zoonotic"; // AI-detected disease type (optional)
}): Promise<string | null> {
  try {
    // If disease is "OTHER" and we have a detected disease name, use that for description
    const isOther = disease.toUpperCase().trim() === "OTHER";
    
    let diseaseInfo = await matchDiseaseFromSpreadsheet(disease);
    
    // If disease is "OTHER" and not in spreadsheet, check if detected_disease_name is in veterinary spreadsheet
    if (isOther && !diseaseInfo && detectedDiseaseName) {
      // Check veterinary spreadsheet for the detected disease name
      diseaseInfo = await matchDiseaseFromSpreadsheet(detectedDiseaseName, true);
    }
    
    // If disease is "OTHER" and still not in any spreadsheet, create/use OTHER disease with detected name
    if (isOther && !diseaseInfo) {
      // Helper function to infer disease type from detected disease name
      const inferDiseaseType = (detectedName?: string): "human" | "veterinary" | "zoonotic" => {
        if (aiDetectedDiseaseType) {
          return aiDetectedDiseaseType;
        }
        
        if (!detectedName) {
          return "human";
        }
        
        const lowerName = detectedName.toLowerCase();
        // Veterinary keywords
        const veterinaryKeywords = [
          "cattle", "livestock", "animal", "livestock disease", "animal disease",
          "swine", "pig", "poultry", "chicken", "bird", "goat", "sheep", "cow",
          "veterinary", "herd", "flock", "livestock outbreak", "animal outbreak"
        ];
        
        // Zoonotic keywords (affects both)
        const zoonoticKeywords = [
          "avian influenza", "bird flu", "rabies", "anthrax", "leptospirosis",
          "q fever", "rift valley fever", "brucellosis", "salmonella"
        ];
        
        // Check for zoonotic first (more specific)
        if (zoonoticKeywords.some(keyword => lowerName.includes(keyword))) {
          return "zoonotic";
        }
        
        // Check for veterinary
        if (veterinaryKeywords.some(keyword => lowerName.includes(keyword))) {
          return "veterinary";
        }
        
        return "human";
      };
      
      // Determine disease type: use AI-detected if available, otherwise infer from detected disease name
      const diseaseType = inferDiseaseType(detectedDiseaseName);
      
      let { data: otherDisease } = await supabase
        .from("diseases")
        .select("id, name, description, disease_type")
        .eq("name", "OTHER")
        .maybeSingle();
      
      if (!otherDisease) {
        // Create OTHER disease if it doesn't exist
        const { data: newOtherDisease } = await supabase
          .from("diseases")
          .insert({
            name: "OTHER",
            description: "Other diseases not in the standard disease database",
            severity_level: "medium",
            color_code: "#66dbe1",
            clinical_manifestation: "Other",
            spreadsheet_source: false,
            disease_type: diseaseType,
          })
          .select()
          .single();
        otherDisease = newOtherDisease;
      } else if (diseaseType !== otherDisease.disease_type) {
        // Check if existing description contains zoonotic keywords
        const description = otherDisease.description || "";
        const zoonoticKeywords = [
          "avian influenza", "bird flu", "rabies", "anthrax", "leptospirosis",
          "q fever", "rift valley fever", "brucellosis", "salmonella"
        ];
        const hasZoonoticInDescription = zoonoticKeywords.some(keyword => 
          description.toLowerCase().includes(keyword)
        );
        
        // If description has zoonotic diseases, prefer zoonotic
        const finalDiseaseType = hasZoonoticInDescription ? "zoonotic" : diseaseType;
        
        // Update disease_type if we detected/inferred a different type
        // Prefer more specific types: zoonotic > veterinary > human
        const typePriority: Record<"human" | "veterinary" | "zoonotic", number> = {
          human: 1,
          veterinary: 2,
          zoonotic: 3,
        };
        
        const currentPriority = typePriority[otherDisease.disease_type as "human" | "veterinary" | "zoonotic"] || 1;
        const newPriority = typePriority[finalDiseaseType];
        
        // Only update if the new type is more specific (higher priority)
        if (newPriority > currentPriority) {
          await supabase
            .from("diseases")
            .update({ disease_type: finalDiseaseType })
            .eq("id", otherDisease.id);
          otherDisease.disease_type = finalDiseaseType;
        }
      }
      
      // Update description if we have a detected disease name
      // Store detected diseases in a list format for better tracking
      if (detectedDiseaseName && otherDisease) {
        const currentDesc = otherDisease.description || "Other diseases not in the standard disease database";
        
        // Extract existing detected diseases from description (format: "Disease1, Disease2 - Other diseases...")
        let detectedDiseases: string[] = [];
        if (currentDesc.includes(" - ")) {
          const detectedPart = currentDesc.split(" - ")[0];
          detectedDiseases = detectedPart.split(", ").map(d => d.trim()).filter(d => d);
        } else if (currentDesc !== "Other diseases not in the standard disease database" && 
                   currentDesc !== "OTHER") {
          // Legacy format: might have diseases listed
          detectedDiseases = currentDesc.split(", ").map(d => d.trim()).filter(d => d);
        }
        
        // Add new detected disease if not already in list
        if (!detectedDiseases.includes(detectedDiseaseName)) {
          detectedDiseases.push(detectedDiseaseName);
          const newDesc = detectedDiseases.length > 0
            ? `${detectedDiseases.join(", ")} - Other diseases not in the standard disease database`
            : "Other diseases not in the standard disease database";
          
          await supabase
            .from("diseases")
            .update({ description: newDesc })
            .eq("id", otherDisease.id);
        }
      }
      
      return otherDisease?.id ?? null;
    }
    
    // Check if disease exists in database first (by the input disease name)
    // This handles cases where disease exists but matchDiseaseFromSpreadsheet returns null
    let { data: existingDisease } = await supabase
      .from("diseases")
      .select("id, name")
      .eq("name", disease)
      .maybeSingle();
    
    // If disease not found in spreadsheet but exists in database, try to match by database name
    if (!diseaseInfo && existingDisease) {
      // Try matching again using the database disease name
      diseaseInfo = await matchDiseaseFromSpreadsheet(existingDisease.name);
    }
    
    // If still no diseaseInfo and disease doesn't exist, return null
    if (!diseaseInfo && !existingDisease) {
      return null;
    }

    // If we have diseaseInfo, use the canonical name from spreadsheet
    if (diseaseInfo) {
      const { data: diseaseByName } = await supabase
        .from("diseases")
        .select("id, name")
        .eq("name", diseaseInfo.diseaseName)
        .maybeSingle();
      existingDisease = diseaseByName;
    }

    if (!existingDisease && diseaseInfo) {
      const severityMap: Record<string, string> = {
        "Emerging Infectious Diseases": "critical",
        "Healthcare-Associated Infections": "high",
        "Foodborne Outbreaks": "medium",
        "Waterborne Outbreaks": "high",
        "Vector-Borne Outbreaks": "high",
        "Airborne Outbreaks": "high",
        "Veterinary Outbreaks": "medium",
      };
      const severity = severityMap[diseaseInfo.category || ""] || "medium";
      const colorMap: Record<string, string> = {
        critical: "#f87171",
        high: "#fbbf24",
        medium: "#66dbe1",
        low: "#4ade80",
      };

      // Determine disease type: use AI-detected type if provided, otherwise use from spreadsheet matching
      const diseaseType = aiDetectedDiseaseType || diseaseInfo.diseaseType || "human";

      const { data: newDisease, error: diseaseError } = await supabase
        .from("diseases")
        .insert({
          name: diseaseInfo.diseaseName,
          description: diseaseInfo.pathogen
            ? `${diseaseInfo.diseaseName} caused by ${diseaseInfo.pathogen}`
            : diseaseInfo.diseaseName,
          severity_level: severity,
          color_code: colorMap[severity],
          clinical_manifestation: diseaseInfo.diseaseName,
          spreadsheet_source: true,
          disease_type: diseaseType,
        })
        .select()
        .single();
      if (diseaseError || !newDisease) {
        console.error(
          `Error creating disease: ${diseaseInfo.diseaseName}`,
          diseaseError
        );
        return null;
      }

      existingDisease = newDisease;

      if (diseaseInfo.pathogen) {
        const pathogenTypeMap: Record<string, string> = {
          Bacteria: "Bacteria",
          Virus: "Virus",
          Fungus: "Fungus",
          "other(parasite/protozoan or Helminth)": "Protozoan",
          Parasite: "Parasite",
          Helminth: "Helminth",
        };
        const normalizedPathogenType =
          pathogenTypeMap[diseaseInfo.pathogenType || ""] ||
          diseaseInfo.pathogenType ||
          "Other";
        let { data: existingPathogen } = await supabase
          .from("pathogens")
          .select("id")
          .eq("name", diseaseInfo.pathogen)
          .maybeSingle();
        if (!existingPathogen) {
          const { data: newPathogen } = await supabase
            .from("pathogens")
            .insert({
              name: diseaseInfo.pathogen,
              type: normalizedPathogenType,
              description: `Causative agent of ${diseaseInfo.diseaseName}`,
            })
            .select()
            .maybeSingle();
          existingPathogen = newPathogen;
        }
        if (existingPathogen) {
          await supabase.from("disease_pathogens").upsert(
            {
              disease_id: existingDisease?.id,
              pathogen_id: existingPathogen.id,
              is_primary: true,
            },
            { onConflict: "disease_id,pathogen_id" }
          );
        }
      }

      // Process category - only create if exists in spreadsheet, otherwise use "Other"
      let categoryId: string | null = null;
      if (diseaseInfo.category) {
        // Try to find or create the category from spreadsheet
        categoryId = await getOrCreateCategory(supabase, diseaseInfo.category);
        if (!categoryId) {
          console.warn(`Could not create or find category for "${diseaseInfo.category}" (disease: ${diseaseInfo.diseaseName}), using "Other"`);
        }
      }
      
      // If no category from spreadsheet or category creation failed, use "Other"
      if (!categoryId) {
        const { data: otherCategory } = await supabase
          .from("outbreak_categories")
          .select("id")
          .eq("name", "Other")
          .maybeSingle();
        
        if (otherCategory) {
          categoryId = otherCategory.id;
        } else {
          // Create "Other" category if it doesn't exist
          const { data: newOtherCategory } = await supabase
            .from("outbreak_categories")
            .insert({
              name: "Other",
              description: "Diseases without a specific outbreak category",
              color: "#66dbe1",
              icon: "alert-circle",
            })
            .select("id")
            .single();
          
          if (newOtherCategory) {
            categoryId = newOtherCategory.id;
          }
        }
      }
      
      // Link disease to category (either from spreadsheet or "Other")
      if (categoryId) {
        await supabase
          .from("disease_categories")
          .upsert(
            { disease_id: existingDisease?.id, category_id: categoryId },
            { onConflict: "disease_id,category_id" }
          );
      }

      if (diseaseInfo && diseaseInfo.keywords) {
        await supabase.from("disease_keywords").upsert(
          {
            disease_id: existingDisease?.id,
            keyword: diseaseInfo.keywords.toLowerCase(),
            keyword_type: "primary",
            confidence_weight: 1.0,
          },
          { onConflict: "disease_id,keyword" }
        );
      }
    } else {
      // Disease already exists - still need to link category if not already linked
      // Check if disease already has a category
      const { data: existingCategoryLink } = await supabase
        .from("disease_categories")
        .select("category_id")
        .eq("disease_id", existingDisease.id)
        .maybeSingle();

      // Only link category if disease doesn't have one yet
      if (!existingCategoryLink) {
        // Process category - only create if exists in spreadsheet, otherwise use "Other"
        let categoryId: string | null = null;
        if (diseaseInfo && diseaseInfo.category) {
          // Try to find or create the category from spreadsheet
          categoryId = await getOrCreateCategory(supabase, diseaseInfo.category);
          if (!categoryId) {
            console.warn(`Could not create or find category for "${diseaseInfo.category}" (disease: ${diseaseInfo.diseaseName}), using "Other"`);
          }
        }
        
        // If no category from spreadsheet or category creation failed, use "Other"
        if (!categoryId) {
          const { data: otherCategory } = await supabase
            .from("outbreak_categories")
            .select("id")
            .eq("name", "Other")
            .maybeSingle();
          
          if (otherCategory) {
            categoryId = otherCategory.id;
          } else {
            // Create "Other" category if it doesn't exist
            const { data: newOtherCategory } = await supabase
              .from("outbreak_categories")
              .insert({
                name: "Other",
                description: "Diseases without a specific outbreak category",
                color: "#66dbe1",
                icon: "alert-circle",
              })
              .select("id")
              .single();
            
            if (newOtherCategory) {
              categoryId = newOtherCategory.id;
            }
          }
        }
        
        // Link disease to category (either from spreadsheet or "Other")
        if (categoryId) {
          await supabase
            .from("disease_categories")
            .upsert(
              { disease_id: existingDisease.id, category_id: categoryId },
              { onConflict: "disease_id,category_id" }
            );
        }
      }
    }

    return existingDisease?.id ?? null;
  } catch (error) {
    console.error(`Error getting or creating disease: ${disease}`, error);
    return null;
  }
}

export async function storeArticlesAndSignals({
  supabase,
  matchedArticles,
}: {
  supabase: SupabaseClient;
  matchedArticles: NormalizedArticle[];
}): Promise<{
  processedCount: number;
  signalCount: number;
  skippedNoLocation: number;
  skippedNoSource: number;
  skippedDuplicate: number;
}> {
  let processedCount = 0;
  let signalCount = 0;
  let skippedNoLocation = 0;
  let skippedNoSource = 0;
  let skippedDuplicate = 0;

  const { data: sources } = await supabase
    .from("news_sources")
    .select("id, name");

  // Create a mapping of article source names to database source names for better matching
  // This handles abbreviations and variations
  const sourceMapping: Record<string, string[]> = {
    "who": ["who - world health organization", "world health organization"],
    "cdc": ["cdc - centers for disease control", "centers for disease control"],
    "bbc health": ["bbc health"],
    "promed-mail": ["promed-mail", "promed mail"],
    "google news": ["google news"],
    "reuters health": ["reuters health", "reuters"],
  };

  for (const article of matchedArticles) {
    const countryInfo = getCountryInfo(article.location?.country ?? "");

    // Match source first (needed for storing article regardless of location)
    const articleSource = (article.source as string).toLowerCase().trim();
    let source = sources?.find((s: any) => {
      const dbNameLower = s.name.toLowerCase().trim();
      
      // Check exact match first
      if (dbNameLower === articleSource) {
        return true;
      }
      
      // Check if database name contains article source (e.g., "CDC - Centers..." contains "cdc")
      if (dbNameLower.includes(articleSource)) {
        return true;
      }
      
      // Check if article source contains first word of database name
      const dbFirstWord = dbNameLower.split(" ")[0];
      if (articleSource.includes(dbFirstWord) && dbFirstWord.length > 2) {
        return true;
      }
      
      // Use source mapping for known abbreviations
      const mappedNames = sourceMapping[articleSource];
      if (mappedNames) {
        return mappedNames.some(mapped => dbNameLower.includes(mapped) || mapped.includes(dbNameLower));
      }
      
      // Handle WHO specifically (common abbreviation)
      if (articleSource === "who" && dbNameLower.includes("world health")) {
        return true;
      }
      
      // Handle CDC specifically
      if (articleSource === "cdc" && dbNameLower.includes("centers for disease control")) {
        return true;
      }
      
      return false;
    });

    // if no source, fallback to a source named "Unknown"
    if (!source) {
      console.warn(`Source not found for article source: "${article.source}" (article title: ${article.title.substring(0, 50)})`);
      source = sources?.find((s: any) =>
        s.name.toLowerCase().includes("unknown")
      );
      if (source) {
        console.log(`Using "Unknown" source as fallback for "${article.source}"`);
      }
    }

    // if still no source, skip the article
    if (!source) {
      console.error(`No source found and no "Unknown" source available. Skipping article: ${article.title.substring(0, 50)}`);
      skippedNoSource++;
      continue;
    }
    
    // Log successful source matching for debugging (only for non-Google News to reduce noise)
    if (article.source !== "Google News") {
      console.log(`[SOURCE MATCH] Matched source "${article.source}" to database source "${source.name}" for article: "${article.title.substring(0, 60)}"`);
    }

    // Geocode city if available (only if we have country info)
    let cityCoords: [number, number] | null = null;
    if (countryInfo) {
      const cityName = article.location?.city;
      if (cityName && cityName !== "null" && cityName.trim() !== "") {
        cityCoords = await geocodeCity(cityName, countryInfo.country);
        if (cityCoords) {
          console.log(`Geocoded city: ${cityName}, ${countryInfo.country} -> ${cityCoords[0]}, ${cityCoords[1]}`);
        } else {
          console.log(`Failed to geocode city: ${cityName}, ${countryInfo.country}`);
        }
      }
    }

    // Get or create country if location exists
    let dbCountry: { id: string; name: string; code: string } | null = null;
    if (countryInfo) {
      let { data: foundCountry } = await supabase
        .from("countries")
        .select("id, name, code")
        .eq("name", countryInfo.country)
        .maybeSingle();
      if (!foundCountry) {
        const { data: newCountry } = await supabase
          .from("countries")
          .insert({
            name: countryInfo.country,
            code: countryInfo["alpha-2"].toUpperCase(),
            continent: "Unknown",
            population: 0,
          })
          .select()
          .single();
        foundCountry = newCountry;
      }
      dbCountry = foundCountry;
    }

    // Store article regardless of whether it has location or not
    // Articles without locations will appear in news section but won't create signals
    const articleData = {
      source_id: source.id,
      title: article.title,
      content: article.content, // This will be the translated text for non-English articles
      url: article.url,
      published_at: article.publishedAt,
      location_extracted: countryInfo
        ? {
            country: countryInfo.country,
            city: article.location?.city,
            lat: cityCoords ? cityCoords[0] : countryInfo.latitude,
            lng: cityCoords ? cityCoords[1] : countryInfo.longitude,
          }
        : null,
      diseases_mentioned: article.diseases,
      sentiment_score: -0.5,
      is_verified: false,
      // Store multilingual support fields
      original_text: article.originalText || article.content, // Original text (multilingual or English)
      translated_text: article.translatedText || (article.language === "en" ? article.content : null), // English translation
      language: article.language || "en", // Language code
    };
    
    // Store article using upsert (will update if URL already exists)
    // This ensures that if an authoritative source article comes in with the same URL as a Google News article,
    // the source_id will be updated to the authoritative source
    const { data: newsArticle, error: articleError } = await supabase
      .from("news_articles")
      .upsert(articleData, { onConflict: "url", ignoreDuplicates: false })
      .select()
      .maybeSingle();

    if (articleError) {
      console.error(`[ERROR] Error storing article from "${article.source}": ${articleError.message}`);
      console.error(`[ERROR] Article title: ${article.title.substring(0, 60)}`);
      console.error(`[ERROR] Article URL: ${article.url}`);
      console.error(`[ERROR] Full error:`, articleError);
      continue;
    }

    if (!newsArticle) {
      console.error(
        `[ERROR] No article returned after upsert for "${article.source}": "${article.title.substring(0, 60)}"`
      );
      console.error(`[ERROR] URL: ${article.url}`);
      continue;
    }
    
    // Verify source_id was set correctly and log for authoritative sources
    if (article.source !== "Google News") {
      const sourceMatches = newsArticle.source_id === source.id;
      if (sourceMatches) {
        console.log(`[STORED] Successfully stored ${article.source} article: "${article.title.substring(0, 60)}" (ID: ${newsArticle.id})`);
      } else {
        console.warn(`[WARNING] Source mismatch for ${article.source} article: expected source_id ${source.id}, got ${newsArticle.source_id}`);
        console.warn(`[WARNING] Article: "${article.title.substring(0, 60)}" (URL: ${article.url})`);
      }
    }

    // Track articles without location for reporting
    if (!countryInfo) {
      skippedNoLocation++;
    }

    // Only create outbreak signals if we have both location and diseases
    if (dbCountry && article.diseases && article.diseases.length > 0) {
      for (const disease of article.diseases) {
        // Skip empty diseases
        if (disease.trim() === "") {
          continue;
        }
        
        const diseaseId = await getOrCreateDisease({ 
          supabase, 
          disease,
          detectedDiseaseName: article.detected_disease_name,
          aiDetectedDiseaseType: article.disease_type
        });
        if (!diseaseId) continue;
        
        // Normalize city value: convert "null" strings to null, trim whitespace
        let normalizedCityForCheck: string | null = null;
        if (article.location?.city) {
          const cityValue = article.location.city.trim();
          if (cityValue && cityValue.toLowerCase() !== "null" && cityValue !== "") {
            normalizedCityForCheck = cityValue;
          }
        }
        
        // Check for duplicates - include city in check if we have city-level data
        // This allows multiple city-level signals for the same disease+country (different cities)
        const validCityName = normalizedCityForCheck !== null && cityCoords !== null;
        
        let existing: { id: string; city: string | null; latitude: number; longitude: number } | null = null;
        
        if (validCityName && cityCoords && normalizedCityForCheck) {
          // For city-level data: only check for exact city match
          // This allows creating new signals for different cities (e.g., Petaling Jaya vs Selangor)
          const { data: cityMatch } = await supabase
            .from("outbreak_signals")
            .select("id, city, latitude, longitude")
            .eq("disease_id", diseaseId)
            .eq("country_id", dbCountry.id)
            .eq("city", normalizedCityForCheck)
            .gte(
              "detected_at",
              new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            )
            .maybeSingle();
          
          if (cityMatch) {
            existing = {
              id: cityMatch.id,
              city: cityMatch.city,
              latitude: parseFloat(cityMatch.latitude),
              longitude: parseFloat(cityMatch.longitude),
            };
          }
          // If no exact city match, we can create a new signal (even if country-level signal exists)
        } else {
          // For country-level data: check for any duplicate (same disease + country)
          // Reduced from 7 days to 2 days to allow new signals for ongoing outbreaks
          const { data: countryMatch } = await supabase
            .from("outbreak_signals")
            .select("id, city, latitude, longitude")
            .eq("disease_id", diseaseId)
            .eq("country_id", dbCountry.id)
            .gte(
              "detected_at",
              new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            )
            .maybeSingle();
          
          if (countryMatch) {
            existing = {
              id: countryMatch.id,
              city: countryMatch.city,
              latitude: parseFloat(countryMatch.latitude),
              longitude: parseFloat(countryMatch.longitude),
            };
          }
        }
        
        // If exact duplicate exists (same city for city-level, or any match for country-level), skip
        if (existing) {
          skippedDuplicate++;
          continue;
        }

        const severity =
          article.confidence_score && article.confidence_score > 0.9
            ? "critical"
            : article.confidence_score && article.confidence_score > 0.75
            ? "high"
            : article.confidence_score && article.confidence_score > 0.6
            ? "medium"
            : "low";
        const caseCount = article.case_count_mentioned ?? null;
        const mortalityCount = article.mortality_count_mentioned ?? null;

        // Use city coordinates if available, otherwise fallback to country coordinates
        // Note: countryInfo is guaranteed to exist here because we're inside the dbCountry check
        const finalLatitude = cityCoords ? cityCoords[0] : (countryInfo?.latitude ?? 0);
        const finalLongitude = cityCoords ? cityCoords[1] : (countryInfo?.longitude ?? 0);

        // Use normalized city (already computed above)
        // Store detected disease name if disease is "OTHER"
        const detectedDiseaseName = disease.toUpperCase().trim() === "OTHER" 
          ? article.detected_disease_name || null
          : null;

        await supabase.from("outbreak_signals").insert({
          article_id: newsArticle.id,
          disease_id: diseaseId,
          country_id: dbCountry.id,
          city: normalizedCityForCheck,
          latitude: finalLatitude,
          longitude: finalLongitude,
          confidence_score: article.confidence_score ?? 0.5,
          case_count_mentioned: caseCount,
          mortality_count_mentioned: mortalityCount,
          severity_assessment: severity,
          is_new_outbreak: true,
          detected_at: article.publishedAt,
          detected_disease_name: detectedDiseaseName,
        });
        signalCount++;
      }
    }

    processedCount++;
  }

  return {
    processedCount,
    signalCount,
    skippedNoLocation,
    skippedNoSource,
    skippedDuplicate,
  };
}
