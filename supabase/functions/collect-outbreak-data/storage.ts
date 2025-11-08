import { type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { isLikelySameString } from "./utils.ts";
import type { DiseaseInfo, NormalizedArticle } from "./types.ts";
import { getCountryInfo } from "./countries.ts";
import { loadHumanDiseaseCSV, csvToJson } from "./spreadsheet.ts";

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
}: {
  supabase: SupabaseClient;
  disease: string;
}): Promise<string | null> {
  try {
    const diseaseInfo = await matchDiseaseFromSpreadsheet(disease);
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
    // !! For now, we're not extracting city locations, only country locations.
    const countryInfo = getCountryInfo(article.location?.country ?? "");

    // if no country info, skip the article
    if (!countryInfo) {
      skippedNoLocation++;
      continue;
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
                lat: countryInfo.latitude,
                lng: countryInfo.longitude,
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
        const diseaseId = await getOrCreateDisease({ supabase, disease });
        if (!diseaseId) continue;
        const { data: existing } = await supabase
          .from("outbreak_signals")
          .select("id")
          .eq("disease_id", diseaseId)
          .eq("country_id", dbCountry.id)
          .gte(
            "detected_at",
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // last 7 days
          )
          .maybeSingle();
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

        await supabase.from("outbreak_signals").insert({
          article_id: newsArticle.id,
          disease_id: diseaseId,
          country_id: dbCountry.id,
          city: article.location?.city || null,
          latitude: countryInfo.latitude,
          longitude: countryInfo.longitude,
          confidence_score: article.confidence_score ?? 0.5,
          case_count_mentioned: caseCount,
          severity_assessment: severity,
          is_new_outbreak: true,
          detected_at: article.publishedAt,
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
