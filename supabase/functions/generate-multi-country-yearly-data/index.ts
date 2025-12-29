import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Years to collect data for
const TARGET_YEARS = [2020, 2021, 2022, 2023, 2024];

// Priority countries (24 major countries)
const PRIORITY_COUNTRIES = [
  "United States", "China", "India", "Germany", "United Kingdom", "France",
  "Japan", "Brazil", "Canada", "Russia", "Australia", "South Korea",
  "Italy", "Spain", "Mexico", "Indonesia", "Netherlands", "Switzerland",
  "Saudi Arabia", "Turkey", "Poland", "Sweden", "Belgium", "Norway"
];

// Extended countries list (can be expanded)
const EXTENDED_COUNTRIES = [
  // Add more countries as needed
  "Argentina", "Chile", "Colombia", "Peru", "Venezuela",
  "South Africa", "Egypt", "Nigeria", "Kenya", "Ghana",
  "Thailand", "Vietnam", "Philippines", "Malaysia", "Singapore",
  // ... more countries
];

interface ConditionSeed {
  name: string;
  category: string;
  ageGroups: string[];
  riskFactors: string[];
}

interface EpidemiologicalRecord {
  condition_name: string;
  category: string;
  country: string;
  year: number;
  age_group_affected: string;
  prevalence_per_100k: number;
  incidence_per_100k: number;
  mortality_rate_percent: number;
  female_rate: number;
  male_rate: number;
  all_sexes_rate: number;
  ylds_per_100k: number;
  dalys_per_100k: number;
  risk_factors: string[];
  equity_score: number;
  intervention_score: number;
  data_source: string;
}

// DeepSeek API call with retry logic
async function callDeepSeek(prompt: string, retries = 3): Promise<string> {
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
              content: "You are an expert epidemiologist with access to the latest global health data from WHO, IHME Global Burden of Disease Study, and national health surveillance systems. Provide accurate, research-based epidemiological data in valid JSON format."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 4000
        }),
      });

      if (!response.ok) {
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  throw new Error("All retry attempts failed");
}

// Generate comprehensive prompt for condition-country-year combination
function generateComprehensivePrompt(
  condition: ConditionSeed,
  country: string,
  year: number
): string {
  return `As an expert epidemiologist, provide comprehensive epidemiological data for:

CONDITION: ${condition.name}
CATEGORY: ${condition.category}
COUNTRY: ${country}
YEAR: ${year}
AGE GROUPS AFFECTED: ${condition.ageGroups.join(', ')}
KNOWN RISK FACTORS: ${condition.riskFactors.join(', ')}

Provide age-standardized rates per 100,000 population. Return as valid JSON:

{
  "prevalence": 1234.56,
  "incidence": 567.89,
  "mortalityRate": 89.12,
  "femaleRate": 1200.00,
  "maleRate": 1269.12,
  "allSexesRate": 1234.56,
  "ylds": 345.67,
  "dalys": 2345.67,
  "equityScore": 72,
  "interventionScore": 85,
  "dataSource": "IHME GBD ${year}, WHO GHO"
}

Base estimates on:
- IHME Global Burden of Disease Study ${year}
- WHO Global Health Observatory
- National health surveillance systems for ${country}
- Peer-reviewed epidemiological studies

Ensure all rates are age-standardized for cross-country comparison.`;
}

// Parse DeepSeek response
function parseDeepSeekResponse(
  response: string,
  condition: ConditionSeed,
  country: string,
  year: number
): EpidemiologicalRecord[] {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(`No JSON found in response for ${condition.name} ${country} ${year}`);
      return [];
    }

    const data = JSON.parse(jsonMatch[0]);

    // Create record for each age group
    return condition.ageGroups.map(ageGroup => ({
      condition_name: condition.name,
      category: condition.category,
      country,
      year,
      age_group_affected: ageGroup,
      prevalence_per_100k: Math.round((data.prevalence || 0) * 100) / 100,
      incidence_per_100k: Math.round((data.incidence || 0) * 100) / 100,
      mortality_rate_percent: Math.round((data.mortalityRate || 0) * 100) / 100,
      female_rate: Math.round((data.femaleRate || data.allSexesRate || 0) * 100) / 100,
      male_rate: Math.round((data.maleRate || data.allSexesRate || 0) * 100) / 100,
      all_sexes_rate: Math.round((data.allSexesRate || 0) * 100) / 100,
      ylds_per_100k: Math.round((data.ylds || 0) * 100) / 100,
      dalys_per_100k: Math.round((data.dalys || 0) * 100) / 100,
      risk_factors: condition.riskFactors,
      equity_score: Math.round((data.equityScore || 50) * 100) / 100,
      intervention_score: Math.round((data.interventionScore || 50) * 100) / 100,
      data_source: data.dataSource || `DeepSeek AI (${year})`
    }));
  } catch (error) {
    console.error(`Error parsing response for ${condition.name} ${country} ${year}:`, error);
    return [];
  }
}

// Validate data before storing
function validateRecord(record: EpidemiologicalRecord): boolean {
  if (record.prevalence_per_100k <= 0) return false;
  if (record.incidence_per_100k > record.prevalence_per_100k) return false;
  if (record.mortality_rate_percent > 100) return false;
  if (record.dalys_per_100k < record.ylds_per_100k) return false;
  if (record.equity_score < 0 || record.equity_score > 100) return false;
  if (record.intervention_score < 0 || record.intervention_score > 100) return false;
  return true;
}

// Check if data already exists
async function checkExisting(
  supabase: any,
  condition: string,
  country: string,
  year: number
): Promise<boolean> {
  const { data, error } = await supabase
    .from('health_conditions')
    .select('id')
    .eq('condition_name', condition)
    .eq('country', country)
    .eq('year', year)
    .limit(1)
    .maybeSingle();

  return !error && data !== null;
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
    const {
      conditions = [], // Array of ConditionSeed from spreadsheet
      countries = PRIORITY_COUNTRIES,
      years = TARGET_YEARS,
      forceRegenerate = false,
      skipExisting = true
    } = await req.json().catch(() => ({}));

    if (conditions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No conditions provided. Extract from spreadsheet first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Start sync logging
    const { data: syncLog } = await supabase
      .from('data_sync_log')
      .insert({
        sync_type: 'full',
        spreadsheet_url: 'https://docs.google.com/spreadsheets/d/1HU-AANvAkXXLqga2rsSMyy5Hhn3_uJ2ewVZ1UrNbC30',
        status: 'running'
      })
      .select()
      .single();

    const syncId = syncLog?.id;

    try {
      let totalProcessed = 0;
      let totalSkipped = 0;
      let totalErrors = 0;
      const errors: any[] = [];

      const totalCombinations = conditions.length * countries.length * years.length;
      let currentCombination = 0;

      console.log(`Starting data generation: ${conditions.length} conditions × ${countries.length} countries × ${years.length} years = ${totalCombinations} combinations`);

      // Process each condition-country-year combination
      for (const condition of conditions) {
        for (const country of countries) {
          for (const year of years) {
            currentCombination++;
            
            try {
              // Check if exists
              if (skipExisting && !forceRegenerate) {
                const exists = await checkExisting(supabase, condition.name, country, year);
                if (exists) {
                  totalSkipped++;
                  console.log(`[${currentCombination}/${totalCombinations}] Skipping ${condition.name} - ${country} - ${year} (exists)`);
                  continue;
                }
              }

              console.log(`[${currentCombination}/${totalCombinations}] Processing ${condition.name} - ${country} - ${year}`);

              // Generate prompt and call DeepSeek
              const prompt = generateComprehensivePrompt(condition, country, year);
              const response = await callDeepSeek(prompt);

              // Parse response
              const records = parseDeepSeekResponse(response, condition, country, year);

              if (records.length > 0) {
                // Validate and store
                const validRecords = records.filter(validateRecord);
                
                if (validRecords.length > 0) {
                  const { error } = await supabase
                    .from('health_conditions')
                    .upsert(validRecords, {
                      onConflict: 'condition_name,category,country,year,age_group_affected'
                    });

                  if (error) {
                    console.error(`Error storing ${condition.name} ${country} ${year}:`, error);
                    totalErrors++;
                    errors.push({ condition: condition.name, country, year, error: error.message });
                  } else {
                    totalProcessed += validRecords.length;
                    console.log(`✓ Stored ${validRecords.length} records for ${condition.name} - ${country} - ${year}`);
                  }
                } else {
                  console.warn(`No valid records for ${condition.name} ${country} ${year}`);
                  totalErrors++;
                }
              } else {
                console.warn(`No records parsed for ${condition.name} ${country} ${year}`);
                totalErrors++;
              }

              // Rate limiting: 2 seconds between API calls
              await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error) {
              console.error(`Error processing ${condition.name} ${country} ${year}:`, error);
              totalErrors++;
              errors.push({ condition: condition.name, country, year, error: error.message });
            }
          }
        }
      }

      // Update sync log
      if (syncId) {
        await supabase
          .from('data_sync_log')
          .update({
            records_processed: totalProcessed,
            records_failed: totalErrors,
            completed_at: new Date().toISOString(),
            status: 'completed'
          })
          .eq('id', syncId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          syncId,
          totalProcessed,
          totalSkipped,
          totalErrors,
          totalCombinations,
          errors: errors.slice(0, 10), // First 10 errors
          message: `Processed ${totalProcessed} records, skipped ${totalSkipped}, errors: ${totalErrors}`
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

    } catch (error) {
      // Update sync log as failed
      if (syncId) {
        await supabase
          .from('data_sync_log')
          .update({
            error_message: error.message,
            completed_at: new Date().toISOString(),
            status: 'failed'
          })
          .eq('id', syncId);
      }

      throw error;
    }

  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});


























