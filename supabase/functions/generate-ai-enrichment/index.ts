import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { OpenAI } from "npm:openai@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Lazy initialization of OpenAI client
let openaiInstance: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY environment variable is not set");
    }
    openaiInstance = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey: apiKey,
    });
  }
  return openaiInstance;
}

const PROMPT_VERSION = "v1.0";

interface AIEnrichment {
  risk_factors: string;
  equity_notes: string;
  interventions: string;
}

/**
 * Generate AI enrichment for a health condition
 * Note: This function does NOT use numeric data - only qualitative information
 */
async function generateEnrichment(
  condition: string,
  category: string,
  countryCode: string,
  year: number,
  ageGroup: string | null
): Promise<AIEnrichment> {
  const openai = getOpenAIClient();

  const prompt = `You are a public health expert. Provide qualitative health information for the following condition.

Condition: ${condition}
Category: ${category}
Country: ${countryCode}
Year: ${year}
Age Group: ${ageGroup || "All ages"}

Provide comprehensive qualitative information in JSON format with the following fields:
- risk_factors: A detailed description of key risk factors for this condition (qualitative, not numeric statistics)
- equity_notes: Equity and disparity considerations, including vulnerable populations and access barriers
- interventions: Evidence-based interventions and public health strategies for prevention and management

Return ONLY valid JSON. Do not include numeric statistics or prevalence data - focus on qualitative descriptions, risk factors, equity considerations, and interventions.

Example format:
{
  "risk_factors": "Key risk factors include lifestyle factors such as poor diet and physical inactivity, genetic predisposition, and environmental exposures. Socioeconomic factors also play a significant role.",
  "equity_notes": "Significant disparities exist across socioeconomic groups, with higher burden in underserved communities. Access to healthcare and preventive services varies by geographic location and insurance status.",
  "interventions": "Evidence-based interventions include community health education programs, screening initiatives, policy changes to improve food environments, and improved access to healthcare services. Multisectoral approaches involving healthcare, education, and policy sectors are most effective."
}`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are an expert public health researcher. Provide qualitative health information in JSON format only. Do not include numeric statistics - focus on descriptions, risk factors, equity considerations, and interventions.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "deepseek-chat",
      temperature: 0.5, // Slightly higher temperature for more varied qualitative content
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0].message.content || "{}";
    const parsed = JSON.parse(responseText);

    return {
      risk_factors: parsed.risk_factors || "",
      equity_notes: parsed.equity_notes || "",
      interventions: parsed.interventions || "",
    };
  } catch (error) {
    console.error(`[ERROR] Failed to generate AI enrichment:`, error);
    // Return empty enrichment on error
    return {
      risk_factors: "",
      equity_notes: "",
      interventions: "",
    };
  }
}

/**
 * Check if enrichment already exists
 */
async function enrichmentExists(
  supabase: ReturnType<typeof createClient>,
  countryCode: string,
  year: number,
  condition: string,
  ageGroup: string | null
): Promise<boolean> {
  const { data, error } = await supabase
    .from("ai_health_enrichment")
    .select("id")
    .eq("country_code", countryCode)
    .eq("year", year)
    .eq("condition", condition)
    .eq("age_group", ageGroup)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error(`Error checking enrichment existence:`, error);
  }

  return !!data;
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
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { forceRegenerate = false, limit = null } = body;

    console.log("Starting AI enrichment generation...");

    // Get health statistics records that need enrichment
    // Join with ai_health_enrichment to find records without enrichment
    let query = supabase
      .from("health_statistics")
      .select("country_code, year, condition, age_group, category");

    if (!forceRegenerate) {
      // Only get records that don't have enrichment yet
      // We'll filter in code since Supabase doesn't support NOT EXISTS easily
      query = query.limit(limit || 1000);
    } else {
      query = query.limit(limit || 1000);
    }

    const { data: healthStats, error: statsError } = await query;

    if (statsError) {
      throw new Error(`Failed to fetch health statistics: ${statsError.message}`);
    }

    if (!healthStats || healthStats.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No health statistics found. Please run collect-health-statistics first.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Found ${healthStats.length} health statistics records to process`);

    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    // Process each record
    for (const stat of healthStats) {
      // Check if enrichment already exists (unless force regenerate)
      if (!forceRegenerate) {
        const exists = await enrichmentExists(
          supabase,
          stat.country_code,
          stat.year,
          stat.condition,
          stat.age_group
        );

        if (exists) {
          skipped++;
          continue;
        }
      }

      // Rate limiting: small delay between AI calls
      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
        // Generate enrichment
        const enrichment = await generateEnrichment(
          stat.condition,
          stat.category,
          stat.country_code,
          stat.year,
          stat.age_group
        );

        // Save to database
        const { error: insertError } = await supabase
          .from("ai_health_enrichment")
          .upsert(
            {
              country_code: stat.country_code,
              year: stat.year,
              condition: stat.condition,
              age_group: stat.age_group,
              risk_factors: enrichment.risk_factors,
              equity_notes: enrichment.equity_notes,
              interventions: enrichment.interventions,
              model_used: "deepseek-chat",
              prompt_version: PROMPT_VERSION,
            },
            { onConflict: "country_code,year,condition,age_group" }
          );

        if (insertError) {
          console.error(
            `[ERROR] Failed to save enrichment for ${stat.condition} in ${stat.country_code} (${stat.year}):`,
            insertError
          );
          failed++;
        } else {
          console.log(
            `[SUCCESS] Generated enrichment for ${stat.condition} in ${stat.country_code} (${stat.year})`
          );
          succeeded++;
        }
      } catch (error) {
        console.error(
          `[ERROR] Exception generating enrichment for ${stat.condition} in ${stat.country_code} (${stat.year}):`,
          error
        );
        failed++;
      }

      processed++;

      // Log progress every 10 records
      if (processed % 10 === 0) {
        console.log(
          `[PROGRESS] ${processed}/${healthStats.length} (${succeeded} succeeded, ${failed} failed, ${skipped} skipped)`
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `AI enrichment generation completed`,
        summary: {
          processed,
          succeeded,
          failed,
          skipped,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Enrichment function error:", error);
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







































