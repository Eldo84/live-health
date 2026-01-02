import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Disease categories to collect data for
const DISEASE_CATEGORIES = [
  "Cardiovascular Diseases",
  "Neoplasms",
  "Chronic Respiratory Diseases",
  "Neurological Disorders",
  "Mental Disorders",
  "Diabetes & Kidney Diseases",
  "Digestive Diseases",
  "Musculoskeletal Disorders",
  "HIV/AIDS & Tuberculosis",
  "Other Infectious Diseases",
  "Maternal & Neonatal Disorders",
  "Nutritional Deficiencies",
  "Unintentional Injuries",
  "Transport Injuries",
  "Self-harm & Interpersonal Violence"
];

// Key countries to collect data for (prioritize major countries first)
const PRIORITY_COUNTRIES = [
  "United States", "China", "India", "Germany", "United Kingdom", "France",
  "Japan", "Brazil", "Canada", "Russia", "Australia", "South Korea",
  "Italy", "Spain", "Mexico", "Indonesia", "Netherlands", "Switzerland",
  "Saudi Arabia", "Turkey", "Poland", "Sweden", "Belgium", "Norway"
];

interface EpidemiologicalData {
  country: string;
  year: number;
  category: string;
  condition: string;
  prevalence: number; // per 100,000
  incidence: number; // per 100,000
  mortalityRate: number; // per 100,000
  dalys: number; // Disability-Adjusted Life Years per 100,000
  ylds: number; // Years Lived with Disability per 100,000
  riskFactors: string[];
  dataSource: string;
}

// DeepSeek API call function
async function callDeepSeek(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY not configured");
  }

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
          content: "You are an expert epidemiologist with access to the latest global health data from WHO, IHME Global Burden of Disease Study, and national health surveillance systems. Provide accurate, research-based epidemiological data."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for consistency
      max_tokens: 4000
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Generate prompt for country-specific epidemiological data
function generateCountryPrompt(country: string, category: string, year: number): string {
  return `As an expert epidemiologist, provide the most recent epidemiological data for ${country} in ${year} for the disease category "${category}".

Please provide data for the 5-8 most prevalent conditions in this category. For each condition, provide:

1. Exact condition name (use standard medical terminology)
2. Age-standardized prevalence rate (per 100,000 population)
3. Age-standardized incidence rate (per 100,000 population)
4. Age-standardized mortality rate (deaths per 100,000 population)
5. Disability-Adjusted Life Years (DALYs per 100,000 population)
6. Years Lived with Disability (YLDs per 100,000 population)
7. Top 3-5 risk factors (in order of importance)

Format your response as a valid JSON array of objects with this exact structure:
[
  {
    "condition": "Disease Name",
    "prevalence": 1234.56,
    "incidence": 567.89,
    "mortalityRate": 89.12,
    "dalys": 2345.67,
    "ylds": 345.67,
    "riskFactors": ["Risk Factor 1", "Risk Factor 2", "Risk Factor 3"]
  }
]

Use data from the most recent Global Burden of Disease Study, WHO reports, and national health surveillance systems. If exact ${year} data isn't available, use the most recent available data and note the actual year in your response.

Base your estimates on:
- IHME Global Burden of Disease Study ${year}
- WHO Global Health Observatory
- National health ministry reports
- Peer-reviewed epidemiological studies

Ensure all rates are age-standardized to allow for cross-country comparisons.`;
}

// Parse DeepSeek response into structured data
function parseDeepSeekResponse(response: string, country: string, category: string, year: number): EpidemiologicalData[] {
  try {
    // Extract JSON from the response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn(`No JSON found in response for ${country} ${category}`);
      return [];
    }

    const data = JSON.parse(jsonMatch[0]);

    return data.map((item: any) => ({
      country,
      year,
      category,
      condition: item.condition,
      prevalence: Math.round(item.prevalence * 100) / 100, // Round to 2 decimal places
      incidence: Math.round(item.incidence * 100) / 100,
      mortalityRate: Math.round(item.mortalityRate * 100) / 100,
      dalys: Math.round(item.dalys * 100) / 100,
      ylds: Math.round(item.ylds * 100) / 100,
      riskFactors: item.riskFactors || [],
      dataSource: `DeepSeek AI (${year})`
    }));
  } catch (error) {
    console.error(`Error parsing response for ${country} ${category}:`, error);
    return [];
  }
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
    const { countries, categories, year } = await req.json();
    const targetCountries = countries || PRIORITY_COUNTRIES;
    const targetCategories = categories || DISEASE_CATEGORIES;
    const targetYear = year || new Date().getFullYear();

    console.log(`Starting epidemiological data collection for ${targetCountries.length} countries, ${targetCategories.length} categories, year ${targetYear}`);

    let totalProcessed = 0;
    let totalErrors = 0;

    // Process each country and category combination
    for (const country of targetCountries) {
      for (const category of targetCategories) {
        try {
          console.log(`Processing ${country} - ${category} (${targetYear})`);

          // Generate prompt and call DeepSeek
          const prompt = generateCountryPrompt(country, category, targetYear);
          const response = await callDeepSeek(prompt);

          // Parse response
          const parsedData = parseDeepSeekResponse(response, country, category, targetYear);

          if (parsedData.length > 0) {
            // Store data in database
            const { error } = await supabase
              .from('epidemiological_data')
              .upsert(parsedData, {
                onConflict: 'country,year,category,condition'
              });

            if (error) {
              console.error(`Error storing data for ${country} ${category}:`, error);
              totalErrors++;
            } else {
              console.log(`Stored ${parsedData.length} records for ${country} ${category}`);
              totalProcessed += parsedData.length;
            }
          } else {
            console.warn(`No data parsed for ${country} ${category}`);
            totalErrors++;
          }

          // Rate limiting - wait 2 seconds between API calls
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          console.error(`Error processing ${country} ${category}:`, error);
          totalErrors++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        errors: totalErrors,
        countries: targetCountries.length,
        categories: targetCategories.length,
        year: targetYear
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});































