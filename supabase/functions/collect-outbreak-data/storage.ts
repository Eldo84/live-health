import { type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { isLikelySameString } from "./utils.ts";
import type { DiseaseInfo, NormalizedArticle } from "./types.ts";
import { getCountryInfo } from "./countries.ts";
import { loadHumanDiseaseCSV, csvToJson } from "./spreadsheet.ts";

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
  disease: string
): Promise<DiseaseInfo | null> {
  const humanDiseaseCSV = await loadHumanDiseaseCSV();
  const humanDiseaseJson = await csvToJson(humanDiseaseCSV);

  const row = humanDiseaseJson.find((row) => {
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

  if (!row) {
    console.warn(`Disease or Keyword "${disease}" not found in spreadsheet`);
    return null;
  }

  return {
    diseaseName: row["Disease"],
    pathogen: row["Pathogen"],
    category: row["Outbreak Category"],
    pathogenType: row["PathogenType"],
    keywords: row["Keywords"],
  };
}

export async function getOrCreateDisease({
  supabase,
  disease,
  detectedDiseaseName,
}: {
  supabase: SupabaseClient;
  disease: string;
  detectedDiseaseName?: string; // Actual disease name when disease is "OTHER"
}): Promise<string | null> {
  try {
    // If disease is "OTHER" and we have a detected disease name, use that for description
    const isOther = disease.toUpperCase().trim() === "OTHER";
    
    const diseaseInfo = await matchDiseaseFromSpreadsheet(disease);
    
    // If disease is "OTHER" and not in spreadsheet, create/use OTHER disease with detected name
    if (isOther && !diseaseInfo) {
      let { data: otherDisease } = await supabase
        .from("diseases")
        .select("id, name, description")
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
          })
          .select()
          .single();
        otherDisease = newOtherDisease;
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
    
    if (!diseaseInfo) return null;

    let { data: existingDisease } = await supabase
      .from("diseases")
      .select("id, name")
      .eq("name", diseaseInfo.diseaseName)
      .maybeSingle();

    if (!existingDisease) {
      const severityMap: Record<string, string> = {
        "Emerging Infectious Diseases": "critical",
        "Healthcare-Associated Infections": "high",
        "Foodborne Outbreaks": "medium",
        "Waterborne Outbreaks": "high",
        "Vector-Borne Outbreaks": "high",
        "Airborne Outbreaks": "high",
      };
      const severity = severityMap[diseaseInfo.category || ""] || "medium";
      const colorMap: Record<string, string> = {
        critical: "#f87171",
        high: "#fbbf24",
        medium: "#66dbe1",
        low: "#4ade80",
      };

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

      if (diseaseInfo.category) {
        const { data: category } = await supabase
          .from("outbreak_categories")
          .select("id")
          .eq("name", diseaseInfo.category)
          .maybeSingle();
        if (category) {
          await supabase
            .from("disease_categories")
            .upsert(
              { disease_id: existingDisease?.id, category_id: category.id },
              { onConflict: "disease_id,category_id" }
            );
        }
      }

      if (diseaseInfo.keywords) {
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

  for (const article of matchedArticles) {
    const countryInfo = getCountryInfo(article.location?.country ?? "");

    // if no country info, skip the article
    if (!countryInfo) {
      skippedNoLocation++;
      continue;
    }

    // Geocode city if available
    let cityCoords: [number, number] | null = null;
    const cityName = article.location?.city;
    if (cityName && cityName !== "null" && cityName.trim() !== "") {
      cityCoords = await geocodeCity(cityName, countryInfo.country);
      if (cityCoords) {
        console.log(`Geocoded city: ${cityName}, ${countryInfo.country} -> ${cityCoords[0]}, ${cityCoords[1]}`);
      } else {
        console.log(`Failed to geocode city: ${cityName}, ${countryInfo.country}`);
      }
    }

    let source = sources?.find((s: any) => {
      const sourceLower = (article.source as string).toLowerCase();
      const dbNameLower = s.name.toLowerCase();
      return (
        dbNameLower.includes(sourceLower) ||
        sourceLower.includes(dbNameLower.split(" ")[0])
      );
    });

    // if no source, fallback to a source named "Unknown"
    if (!source) {
      source = sources?.find((s: any) =>
        s.name.toLowerCase().includes("unknown")
      );
    }

    // if still no source, skip the article
    if (!source) {
      skippedNoSource++;
      continue;
    }

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

    const { data: newsArticle, error: articleError } = await supabase
      .from("news_articles")
      .upsert(
        {
          source_id: source.id,
          title: article.title,
          content: article.content,
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
        },
        { onConflict: "url", ignoreDuplicates: false }
      )
      .select()
      .maybeSingle();

    if (articleError) {
      console.error(`Error storing article: ${articleError.message}`);
      continue;
    }

    if (!newsArticle || articleError) {
      console.error(
        `Error storing article: ${
          articleError || "Unknown error, no news article returned"
        }`
      );
      continue;
    }

    if (dbCountry && article.diseases && article.diseases.length > 0) {
      for (const disease of article.diseases) {
        // Skip empty diseases
        if (disease.trim() === "") {
          continue;
        }
        
        const diseaseId = await getOrCreateDisease({ 
          supabase, 
          disease,
          detectedDiseaseName: article.detected_disease_name 
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
              new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
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
          const { data: countryMatch } = await supabase
            .from("outbreak_signals")
            .select("id, city, latitude, longitude")
            .eq("disease_id", diseaseId)
            .eq("country_id", dbCountry.id)
            .gte(
              "detected_at",
              new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
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
        const caseCount = article.case_count_mentioned ?? 0;

        // Use city coordinates if available, otherwise fallback to country coordinates
        const finalLatitude = cityCoords ? cityCoords[0] : countryInfo.latitude;
        const finalLongitude = cityCoords ? cityCoords[1] : countryInfo.longitude;

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
