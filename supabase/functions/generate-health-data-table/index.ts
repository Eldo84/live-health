import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { COUNTRIES, type Country } from "../_shared/countries.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default 5 countries to focus on initially
const DEFAULT_COUNTRIES = ["US", "GB", "CA", "AU", "DE"]; // USA, UK, Canada, Australia, Germany

// Default starting year
const DEFAULT_START_YEAR = 2020;

// Batch size: process 5-15 conditions per API call
const CONDITIONS_PER_BATCH = 10;

// ============================================================================
// MASTER SYSTEM PROMPT (set once, never changes)
// ============================================================================
const SYSTEM_PROMPT = `You are an epidemiology modeling system.

Your task is to generate AI-modeled national health burden estimates using
GBD-style methodology and peer-reviewed literature patterns.

Rules:
- Outputs are AI-modeled estimates, not official statistics
- Use conservative, plausible national-level values
- Avoid false precision (round appropriately)
- DALYs must be greater than or equal to YLDs
- Sex percentages must sum to 100
- Prevalence > Incidence for chronic diseases
- Use per-100,000 population unless otherwise specified
- Neonatal and maternal conditions may use per-100,000 live births
- Narrative fields must reflect known structural inequities
- Interventions must be evidence-based and realistic

If a value is not applicable, use "N/A" and explain implicitly.

Return data as a markdown table with all columns filled.`;

// ============================================================================
// HEALTH CONDITIONS BY CATEGORY
// ============================================================================
const HEALTH_CONDITIONS = {
  "Cardiovascular and Metabolic Disorders": [
    { name: "Diabetes (Type 2)", ageGroups: "18–35, 36–60, 60+" },
    { name: "Hypertension", ageGroups: "18–35, 36–60, 60+" },
    { name: "Cardiovascular Disease (CVD)", ageGroups: "36–60, 60+" },
    { name: "Stroke", ageGroups: "36–60, 60+" },
    { name: "Hyperlipidemia", ageGroups: "36–60, 60+" },
    { name: "Obesity", ageGroups: "0–17, 18–35, 36–60" },
    { name: "Metabolic Syndrome", ageGroups: "0–17, 18–35, 36–60" },
  ],
  "Cancers": [
    { name: "Lung Cancer", ageGroups: "60+" },
    { name: "Breast Cancer", ageGroups: "36–60, 60+" },
    { name: "Colorectal Cancer", ageGroups: "36–60, 60+" },
    { name: "Prostate Cancer", ageGroups: "18–35, 36–60, 60+" },
    { name: "Cervical Cancer", ageGroups: "36–60, 60+" },
    { name: "Pancreatic Cancer", ageGroups: "60+" },
    { name: "Liver Cancer (NAFLD, Cirrhosis-related HCC)", ageGroups: "18–35, 36–60, 60+" },
    { name: "Thyroid Cancer", ageGroups: "36–60, 60+" },
  ],
  "Respiratory Diseases": [
    { name: "COPD", ageGroups: "60+" },
    { name: "Asthma", ageGroups: "0–17, 18–35, 36–60" },
    { name: "Sleep Apnea", ageGroups: "36–60, 60+" },
  ],
  "Neurological Disorders": [
    { name: "Alzheimer's Disease / Dementia", ageGroups: "60+" },
    { name: "Parkinson's Disease", ageGroups: "60+" },
    { name: "Epilepsy", ageGroups: "All ages (0–17, 18–35, 36–60, 60+)" },
    { name: "Multiple Sclerosis (MS)", ageGroups: "18–35, 36–60" },
    { name: "Developmental Disorders (e.g., Cerebral Palsy)", ageGroups: "0–17" },
    { name: "Autism Spectrum Disorder (ASD)", ageGroups: "0–17" },
  ],
  "Musculoskeletal Disorders": [
    { name: "Osteoporosis", ageGroups: "36–60, 60+" },
    { name: "Rheumatoid Arthritis / Inflammatory Arthritis", ageGroups: "18–35, 36–60" },
    { name: "Low Back Pain", ageGroups: "All ages (0–17, 18–35, 36–60, 60+)" },
  ],
  "Mental and Behavioral Disorders": [
    { name: "Depression", ageGroups: "18–35, 36–60, 60+" },
    { name: "Anxiety Disorders", ageGroups: "18–35, 36–60, 60+" },
    { name: "Schizophrenia / Psychotic Disorders", ageGroups: "18–35, 36–60" },
    { name: "Eating Disorders", ageGroups: "0–17, 18–35, 36–60" },
    { name: "Substance Use Disorders", ageGroups: "18–35, 36–60" },
    { name: "Gambling Disorder", ageGroups: "18–35, 36–60" },
    { name: "Sleep Disorders", ageGroups: "All ages (0–17, 18–35, 36–60, 60+)" },
  ],
  "Endocrine and Hematologic Disorders": [
    { name: "Thyroid Disorders", ageGroups: "18–35, 36–60, 60+" },
    { name: "Anemia (Iron-deficiency anemia)", ageGroups: "All ages (0–17, 18–35, 36–60, 60+)" },
  ],
  "High-Burden Infectious Diseases": [
    { name: "Tuberculosis (TB)", ageGroups: "All ages" },
    { name: "HIV/AIDS", ageGroups: "18–35, 36–60, 60+" },
    { name: "Hepatitis B & C", ageGroups: "All ages" },
    { name: "Malaria", ageGroups: "All ages" },
    { name: "COVID-19", ageGroups: "All ages" },
    { name: "Influenza", ageGroups: "All ages" },
    { name: "Dengue Fever", ageGroups: "All ages" },
    { name: "Measles", ageGroups: "0–17, 18–35" },
    { name: "Zika Virus", ageGroups: "18–35, 36–60" },
    { name: "Cholera", ageGroups: "All ages" },
    { name: "Ebola / Marburg Virus", ageGroups: "All ages" },
    { name: "STIs (e.g., Syphilis, Gonorrhea, HPV)", ageGroups: "18–35, 36–60" },
    { name: "Leprosy (Hansen's Disease)", ageGroups: "All ages" },
  ],
  "Neglected Tropical Diseases": [
    { name: "Schistosomiasis", ageGroups: "All ages" },
    { name: "Chagas Disease", ageGroups: "All ages" },
    { name: "Lymphatic Filariasis", ageGroups: "All ages" },
    { name: "Onchocerciasis", ageGroups: "All ages" },
    { name: "Leishmaniasis", ageGroups: "All ages" },
    { name: "Soil-transmitted helminths", ageGroups: "All ages" },
  ],
  "Injuries & Trauma": [
    { name: "Road Traffic Accidents (MVA)", ageGroups: "All ages" },
    { name: "Falls", ageGroups: "0–17, 60+" },
    { name: "Firearm-related Injuries", ageGroups: "18–35, 36–60" },
    { name: "Burns", ageGroups: "All ages" },
    { name: "Drowning", ageGroups: "0–17, 18–35" },
    { name: "Occupational Injuries", ageGroups: "18–35, 36–60" },
    { name: "Natural Disaster-related Injuries", ageGroups: "All ages" },
    { name: "Conflict-Related Injuries", ageGroups: "All ages" },
  ],
  "Violence & Self-Harm": [
    { name: "Suicide", ageGroups: "18–35, 36–60, 60+" },
    { name: "Domestic Violence", ageGroups: "All ages" },
    { name: "Child Abuse", ageGroups: "0–17" },
    { name: "Gender-Based Violence (GBV)", ageGroups: "18–35, 36–60" },
  ],
  "Maternal, Neonatal, and Child Health": [
    { name: "Maternal Mortality", ageGroups: "18–35, 36–60" },
    { name: "Postpartum Hemorrhage", ageGroups: "18–35, 36–60" },
    { name: "Preeclampsia / Eclampsia", ageGroups: "18–35, 36–60" },
    { name: "Preterm Birth", ageGroups: "Neonates (0–1 month)" },
    { name: "Neonatal Sepsis", ageGroups: "Neonates (0–1 month)" },
    { name: "Low Birth Weight", ageGroups: "Neonates (0–1 month)" },
    { name: "Congenital Anomalies", ageGroups: "Neonates (0–1 month)" },
  ],
  "Environmental & Occupational Health": [
    { name: "Lead Poisoning", ageGroups: "All ages" },
    { name: "Heavy Metal Toxicity", ageGroups: "18–35, 36–60" },
    { name: "Pesticide-Related Illnesses", ageGroups: "18–35, 36–60" },
    { name: "Occupational Lung Diseases", ageGroups: "18–35, 36–60" },
    { name: "Heat-Related Illnesses", ageGroups: "All ages" },
    { name: "Radiation Exposure Disorders", ageGroups: "All ages" },
  ],
  "Sensory Disorders": [
    { name: "Hearing Loss", ageGroups: "All ages" },
    { name: "Glaucoma", ageGroups: "36–60, 60+" },
    { name: "Age-related Macular Degeneration (AMD)", ageGroups: "60+" },
    { name: "Cataracts", ageGroups: "60+" },
  ],
};

/**
 * Generate reusable generation prompt template
 * This is what gets looped with dynamic values
 */
function generateUserPrompt(
  countryName: string,
  year: number,
  category: string,
  conditions: Array<{ name: string; ageGroups: string }>
): string {
  // Format conditions list
  const conditionsList = conditions
    .map(cond => `${cond.name} – ${cond.ageGroups}`)
    .join("\n");

  return `Generate a table of AI-modeled health burden data for:

Country: ${countryName}
Year: ${year}

Disease Category: ${category}

Use the following columns exactly and return the result as a markdown table:

Condition |
Age Group Affected |
Prevalence (total cases per 100,000) |
Incidence (new cases per year per 100,000) |
Mortality Rate (%) |
Female (%) |
Male (%) |
All sexes (estimated total cases) |
YLDs (per 100,000) |
DALYs (per 100,000) |
Year |
Location (country) |
Data source |
Risk Factors |
Equity (AI-generated) |
Interventions (AI-generated)

Use:
- AI-modeled national estimates
- GBD-style epidemiological reasoning
- Rounded, realistic values
- Consistent methodology across all rows

Conditions and age groups:

${conditionsList}

Data source column must be:
"AI-modeled (DeepSeek, literature-informed estimates)"`;
}

/**
 * Parse markdown table into structured data
 */
function parseMarkdownTable(markdown: string): any[] {
  const lines = markdown.trim().split("\n");
  const data: any[] = [];

  // Find the table header and data rows
  let inTable = false;
  let headers: string[] = [];
  let headerLineIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect markdown table header (starts with |)
    if (line.startsWith("|") && line.includes("Condition")) {
      inTable = true;
      headers = line
        .split("|")
        .map(h => h.trim())
        .filter(h => h.length > 0);
      headerLineIndex = i;
      continue;
    }

    // Skip separator line (|---|---|)
    if (inTable && line.match(/^\|[\s\-:]+\|/)) {
      continue;
    }

    // Parse data rows
    if (inTable && line.startsWith("|") && i > headerLineIndex + 1) {
      const values = line
        .split("|")
        .map(v => v.trim())
        .filter((_, idx) => idx > 0 && idx <= headers.length);

      if (values.length === headers.length) {
        const row: any = {};
        headers.forEach((header, idx) => {
          const value = values[idx] || "";
          const normalizedHeader = header.toLowerCase().trim();

          // Map headers to our field names
          if (normalizedHeader.includes("condition")) {
            row.condition = value;
          } else if (normalizedHeader.includes("age group")) {
            row.age_group = value;
          } else if (normalizedHeader.includes("prevalence")) {
            row.prevalence_per_100k = parseNumeric(value);
          } else if (normalizedHeader.includes("incidence")) {
            row.incidence_per_100k = parseNumeric(value);
          } else if (normalizedHeader.includes("mortality")) {
            row.mortality_rate = parseNumeric(value);
          } else if (normalizedHeader.includes("female") && !normalizedHeader.includes("all")) {
            row.female = parseNumeric(value);
          } else if (normalizedHeader.includes("male")) {
            row.male = parseNumeric(value);
          } else if (normalizedHeader.includes("all sexes")) {
            row.all_sexes = parseNumeric(value);
          } else if (normalizedHeader.includes("ylds")) {
            row.ylds = parseNumeric(value);
          } else if (normalizedHeader.includes("dalys")) {
            row.dalys = parseNumeric(value);
          } else if (normalizedHeader.includes("year")) {
            row.year = parseInt(value) || null;
          } else if (normalizedHeader.includes("location") || normalizedHeader.includes("country")) {
            row.location = value;
          } else if (normalizedHeader.includes("data source")) {
            row.data_source = value;
          } else if (normalizedHeader.includes("risk factors")) {
            row.risk_factors = value;
          } else if (normalizedHeader.includes("equity")) {
            row.equity = value;
          } else if (normalizedHeader.includes("interventions")) {
            row.interventions = value;
          }
        });

        if (row.condition) {
          data.push(row);
        }
      }
    }
  }

  return data;
}

/**
 * Parse numeric value from string (handles N/A, commas, etc.)
 */
function parseNumeric(value: string): number | null {
  if (!value || value.trim() === "" || value.toUpperCase() === "N/A") {
    return null;
  }

  // Remove commas and extract number
  const cleaned = value.replace(/,/g, "").trim();
  const match = cleaned.match(/[\d.]+/);
  if (match) {
    const num = parseFloat(match[0]);
    return isNaN(num) ? null : num;
  }

  return null;
}

/**
 * Call DeepSeek API to generate health data
 */
async function callDeepSeek(userPrompt: string, retries = 3): Promise<any[]> {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY not configured");
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
          temperature: 0.2, // Low temperature for consistency
          max_tokens: 8000,
        }),
      });

      if (!response.ok) {
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }
        const errorText = await response.text();
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content || "";

      // Parse markdown table
      const parsed = parseMarkdownTable(content);

      if (parsed.length === 0) {
        throw new Error("No data parsed from AI response");
      }

      return parsed;
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  throw new Error("All retry attempts failed");
}

/**
 * Validate data record
 */
function validateRecord(record: any): boolean {
  // Check required fields
  if (!record.condition) return false;

  // Validate DALYs >= YLDs
  if (record.dalys !== null && record.ylds !== null && record.dalys < record.ylds) {
    console.warn(`DALYs (${record.dalys}) < YLDs (${record.ylds}) for ${record.condition}, adjusting...`);
    record.dalys = Math.max(record.dalys, record.ylds);
  }

  // Validate sex percentages sum to ~100 (allow some tolerance)
  if (record.female !== null && record.male !== null) {
    const sum = record.female + record.male;
    if (Math.abs(sum - 100) > 5) {
      console.warn(`Sex percentages sum to ${sum}% for ${record.condition}, adjusting...`);
      // Normalize to 100%
      const total = record.female + record.male;
      record.female = (record.female / total) * 100;
      record.male = (record.male / total) * 100;
    }
  }

  return true;
}

/**
 * Store health statistics in database
 */
async function storeHealthStatistics(
  supabase: ReturnType<typeof createClient>,
  countryCode: string,
  year: number,
  category: string,
  data: any[]
): Promise<{ stored: number; errors: number }> {
  let stored = 0;
  let errors = 0;

  const countryInfo: Country | undefined = COUNTRIES.find((c) => c["alpha-2"] === countryCode);
  const locationName = countryInfo?.country || countryCode;

  for (const item of data) {
    try {
      if (!validateRecord(item)) {
        console.warn(`Skipping invalid record: ${item.condition}`);
        errors++;
        continue;
      }

      const record: any = {
        country_code: countryCode,
        year: item.year || year,
        category: category,
        condition: item.condition,
        age_group: item.age_group || null,
        location_name: item.location || locationName,
        data_source: item.data_source || "AI-modeled (DeepSeek, literature-informed estimates)",
        
        // Numeric fields
        prevalence_per_100k: item.prevalence_per_100k,
        incidence_per_100k: item.incidence_per_100k,
        mortality_rate: item.mortality_rate,
        female_value: item.female,
        male_value: item.male,
        all_sexes_value: item.all_sexes,
        ylds_per_100k: item.ylds,
        dalys_per_100k: item.dalys,
      };

      // Upsert health statistics
      const { error } = await supabase
        .from("health_statistics")
        .upsert(record, {
          onConflict: "country_code,year,condition,age_group",
        });

      if (error) {
        console.error(`Error storing ${item.condition}:`, error);
        errors++;
      } else {
        stored++;
      }

      // Store AI enrichment separately if provided
      if (item.equity || item.interventions || item.risk_factors) {
        const enrichmentRecord: any = {
          country_code: countryCode,
          year: item.year || year,
          condition: item.condition,
          age_group: item.age_group || null,
          risk_factors: item.risk_factors || null,
          equity_notes: item.equity || null,
          interventions: item.interventions || null,
          model_used: "deepseek-chat",
          prompt_version: "2.0",
        };

        await supabase
          .from("ai_health_enrichment")
          .upsert(enrichmentRecord, {
            onConflict: "country_code,year,condition,age_group",
          });
      }
    } catch (error) {
      console.error(`Error processing record for ${item.condition}:`, error);
      errors++;
    }
  }

  return { stored, errors };
}

/**
 * Split array into batches
 */
function batchArray<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const {
      countries = DEFAULT_COUNTRIES,
      startYear = DEFAULT_START_YEAR,
      endYear = new Date().getFullYear(),
      forceRegenerate = false,
      skipExisting = true,
      batchSize = CONDITIONS_PER_BATCH,
    } = body;

    // Generate years array
    const years: number[] = [];
    for (let year = startYear; year <= endYear; year++) {
      years.push(year);
    }

    console.log(`Starting health data generation for ${countries.length} countries, years ${startYear}-${endYear}`);
    console.log(`Using batch size: ${batchSize} conditions per API call`);

    const results: any = {
      totalProcessed: 0,
      totalStored: 0,
      totalErrors: 0,
      totalBatches: 0,
      byCountry: {} as Record<string, any>,
      byYear: {} as Record<number, any>,
    };

    // Process each country
    for (const countryCode of countries) {
      const countryInfo = COUNTRIES.find(c => c["alpha-2"] === countryCode);
      const countryName = countryInfo?.country || countryCode;

      const countryResults = {
        processed: 0,
        stored: 0,
        errors: 0,
        batches: 0,
        byYear: {} as Record<number, any>,
      };

      // Process each year
      for (const year of years) {
        const yearResults = {
          processed: 0,
          stored: 0,
          errors: 0,
          batches: 0,
          byCategory: {} as Record<string, any>,
        };

        // Process each category
        for (const [category, conditions] of Object.entries(HEALTH_CONDITIONS)) {
          try {
            // Check if data already exists
            if (skipExisting && !forceRegenerate) {
              const { data: existing } = await supabase
                .from("health_statistics")
                .select("id")
                .eq("country_code", countryCode)
                .eq("year", year)
                .eq("category", category)
                .limit(1)
                .maybeSingle();

              if (existing) {
                console.log(`[SKIP] Data exists for ${countryCode} ${year} ${category}`);
                continue;
              }
            }

            // Split conditions into batches
            const batches = batchArray(conditions, batchSize);
            console.log(`[PROCESSING] ${countryCode} ${year} ${category} (${conditions.length} conditions in ${batches.length} batches)`);

            for (const batch of batches) {
              try {
                // Generate prompt for this batch
                const userPrompt = generateUserPrompt(countryName, year, category, batch);

                // Call AI
                const aiData = await callDeepSeek(userPrompt);

                // Store data
                const { stored, errors } = await storeHealthStatistics(
                  supabase,
                  countryCode,
                  year,
                  category,
                  aiData
                );

                yearResults.processed += batch.length;
                yearResults.stored += stored;
                yearResults.errors += errors;
                yearResults.batches++;

                // Rate limiting: 2 seconds between API calls
                await new Promise(resolve => setTimeout(resolve, 2000));

              } catch (error) {
                console.error(`Error processing batch for ${countryCode} ${year} ${category}:`, error);
                yearResults.errors += batch.length;
                yearResults.batches++;
              }
            }

            yearResults.byCategory[category] = {
              stored: yearResults.stored,
              errors: yearResults.errors,
              batches: yearResults.batches,
            };

          } catch (error) {
            console.error(`Error processing ${countryCode} ${year} ${category}:`, error);
            yearResults.errors += conditions.length;
            yearResults.byCategory[category] = {
              stored: 0,
              errors: conditions.length,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        }

        countryResults.processed += yearResults.processed;
        countryResults.stored += yearResults.stored;
        countryResults.errors += yearResults.errors;
        countryResults.batches += yearResults.batches;
        countryResults.byYear[year] = yearResults;

        results.byYear[year] = results.byYear[year] || { processed: 0, stored: 0, errors: 0, batches: 0 };
        results.byYear[year].processed += yearResults.processed;
        results.byYear[year].stored += yearResults.stored;
        results.byYear[year].errors += yearResults.errors;
        results.byYear[year].batches += yearResults.batches;
      }

      results.totalProcessed += countryResults.processed;
      results.totalStored += countryResults.stored;
      results.totalErrors += countryResults.errors;
      results.totalBatches += countryResults.batches;
      results.byCountry[countryCode] = countryResults;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated health data for ${countries.length} countries, years ${startYear}-${endYear}`,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
