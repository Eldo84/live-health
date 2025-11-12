import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface DiseaseSummary {
  keyFacts: {
    cause: string;
    transmission: string;
    severity: string;
    history: string;
    treatment: string;
    vaccine: string;
  };
  symptoms: {
    early: string;
    progression: string;
    severe: string;
  };
  transmission: {
    primary: string;
    otherModes: string;
    humanToHuman: string;
    environmental: string;
  };
  diagnosisTreatment: {
    tests: string;
    treatment: string;
    advancedTherapies: string;
  };
  preventionControl: {
    prophylaxis: string;
    infectionControl: string;
    communityPractices: string;
    otherSteps: string;
  };
  globalResponse: {
    organizations: string;
    strategies: string;
    research: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
    
    if (!deepseekApiKey) {
      return new Response(
        JSON.stringify({ 
          error: "DEEPSEEK_API_KEY not configured",
          summary: null 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { diseaseName } = await req.json();

    if (!diseaseName) {
      return new Response(
        JSON.stringify({ error: "Disease name is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Check if summary exists in database cache
    const { data: cachedSummary } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", `disease_summary_${diseaseName.toLowerCase().replace(/\s+/g, "_")}`)
      .single();

    if (cachedSummary?.value) {
      return new Response(
        JSON.stringify({ summary: JSON.parse(cachedSummary.value) }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Get disease information from database
    const { data: diseaseData } = await supabase
      .from("diseases")
      .select(`
        *,
        disease_pathogens(pathogens(name, type, description)),
        disease_categories(outbreak_categories(name, description))
      `)
      .eq("name", diseaseName)
      .single();

    // Build prompt for AI
    const pathogenInfo = diseaseData?.disease_pathogens?.[0]?.pathogens 
      ? `Pathogen: ${diseaseData.disease_pathogens[0].pathogens.name} (${diseaseData.disease_pathogens[0].pathogens.type})`
      : "";
    
    const categoryInfo = diseaseData?.disease_categories?.[0]?.outbreak_categories
      ? `Category: ${diseaseData.disease_categories[0].outbreak_categories.name}`
      : "";

    const prompt = `Generate a comprehensive medical summary for the disease "${diseaseName}" in JSON format. ${pathogenInfo} ${categoryInfo}

The summary must be structured exactly as follows with all sections filled:

{
  "keyFacts": {
    "cause": "Brief description of what causes the disease",
    "transmission": "How the disease is transmitted (primary routes)",
    "severity": "Severity level and fatality rates with and without treatment",
    "history": "Historical context and notable facts",
    "treatment": "Primary treatment approach",
    "vaccine": "Vaccine availability and usage"
  },
  "symptoms": {
    "early": "Early symptoms and onset timeline",
    "progression": "How symptoms progress",
    "severe": "Severe complications and critical symptoms"
  },
  "transmission": {
    "primary": "Primary transmission route",
    "otherModes": "Other transmission modes",
    "humanToHuman": "Whether it spreads person-to-person",
    "environmental": "Environmental sources and reservoirs"
  },
  "diagnosisTreatment": {
    "tests": "Diagnostic tests and methods",
    "treatment": "Primary treatment approach",
    "advancedTherapies": "Advanced or specialized treatments"
  },
  "preventionControl": {
    "prophylaxis": "Preventive measures and vaccines",
    "infectionControl": "Infection control in healthcare settings",
    "communityPractices": "Community prevention practices",
    "otherSteps": "Additional preventive measures"
  },
  "globalResponse": {
    "organizations": "Key organizations involved in response",
    "strategies": "Outbreak control strategies",
    "research": "Ongoing research efforts"
  }
}

Provide accurate, medically sound information. If specific details are unknown, state "Information not available" rather than guessing.`;

    // Call DeepSeek API
    const deepseekResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "You are a medical information expert. Provide accurate, structured disease summaries in JSON format only. Do not include markdown formatting, only valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      console.error("DeepSeek API error:", errorText);
      return new Response(
        JSON.stringify({ 
          error: "Failed to generate summary",
          details: errorText 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const deepseekData = await deepseekResponse.json();
    const content = deepseekData.choices?.[0]?.message?.content || "";

    // Extract JSON from response (handle markdown code blocks)
    let summaryJson = content.trim();
    if (summaryJson.startsWith("```json")) {
      summaryJson = summaryJson.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    } else if (summaryJson.startsWith("```")) {
      summaryJson = summaryJson.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    let summary: DiseaseSummary;
    try {
      summary = JSON.parse(summaryJson);
    } catch (e) {
      console.error("Failed to parse AI response:", e, summaryJson);
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse AI response",
          raw: summaryJson 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Cache the summary in database
    await supabase
      .from("app_settings")
      .upsert({
        key: `disease_summary_${diseaseName.toLowerCase().replace(/\s+/g, "_")}`,
        value: JSON.stringify(summary),
        description: `AI-generated summary for ${diseaseName}`,
      });

    return new Response(
      JSON.stringify({ summary }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error: any) {
    console.error("Error generating disease summary:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

