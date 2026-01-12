import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DiseaseRecommendationData {
  disease_name: string;
  user_recommendations: string[];
  medical_personnel_recommendations: string[];
  summary: string;
}

// Helper to sanitize recommendations - removes incorrect COVID-19/insect associations
const sanitizeRecommendations = (
  recommendations: string[],
  diseaseName: string
): string[] => {
  const lowerName = diseaseName.toLowerCase();
  const isCovid =
    lowerName.includes("covid") ||
    lowerName.includes("sars-cov-2") ||
    lowerName.includes("coronavirus");

  if (!isCovid) return recommendations;

  const insectKeywords = ["mosquito", "insect", "fly", "flies", "vector", "bug", "pest", "bed net", "repellent"];
  
  return recommendations.map((rec) => {
    const lower = rec.toLowerCase();
    const mentionsInsects = insectKeywords.some((k) => lower.includes(k));
    
    if (mentionsInsects) {
      // Replace with correct COVID-19 guidance
      return "For COVID-19, focus on respiratory precautions: get vaccinated/boosted if eligible, wear a mask in crowded indoor spaces, improve ventilation, and practice hand hygiene. COVID-19 is NOT transmitted by insects or mosquitoes.";
    }
    return rec;
  });
};

// Generate AI recommendations for a single disease
const generateDiseaseRecommendations = async (
  diseaseName: string,
  deepseekApiKey: string | undefined
): Promise<DiseaseRecommendationData | null> => {
  if (!deepseekApiKey) {
    return null;
  }

  try {
    const lowerName = diseaseName.toLowerCase();
    const isCovid =
      lowerName.includes("covid") ||
      lowerName.includes("sars-cov-2") ||
      lowerName.includes("coronavirus");

    const isVectorBorne =
      lowerName.includes("malaria") ||
      lowerName.includes("dengue") ||
      lowerName.includes("chikungunya") ||
      lowerName.includes("zika") ||
      lowerName.includes("yellow fever");

    const prompt = `You are an expert epidemiologist and public health advisor. Generate specific, actionable recommendations for ${diseaseName}.

CRITICAL SCIENTIFIC CONSTRAINTS:
${isCovid ? "- COVID-19 (SARS-CoV-2, coronavirus) is NOT transmitted by insects or mosquitoes. It is primarily transmitted via respiratory droplets and aerosols. DO NOT recommend killing insects, mosquito control, bed nets, or insect repellent for COVID-19 prevention." : ""}
${isVectorBorne ? "- This is a vector-borne disease transmitted by mosquitoes. Include appropriate vector control measures." : ""}
${!isCovid && !isVectorBorne ? "- Ensure recommendations match the actual transmission route of this disease." : ""}

Generate recommendations in this JSON format:
{
  "summary": "2-3 sentence summary about ${diseaseName} and key prevention strategies",
  "userRecommendations": [
    "Specific recommendation 1 for general public",
    "Specific recommendation 2 for general public",
    "Specific recommendation 3 for general public"
  ],
  "medicalPersonnelRecommendations": [
    "Specific recommendation 1 for medical professionals",
    "Specific recommendation 2 for medical professionals",
    "Specific recommendation 3 for medical professionals"
  ]
}

Make recommendations:
- Specific to ${diseaseName}
- Based on established scientific evidence
- Actionable and practical
- Appropriate for the disease's transmission route
- Free from incorrect associations (especially COVID-19 with insect control)

Return ONLY valid JSON, no additional text.`;

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
            content: "You are an expert epidemiologist. Always respond with valid JSON only, no markdown formatting.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!deepseekResponse.ok) {
      console.error("DeepSeek API error:", await deepseekResponse.text());
      return null;
    }

    const deepseekData = await deepseekResponse.json();
    const content = deepseekData.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    } else if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    try {
      const parsed = JSON.parse(jsonContent);
      
      // Sanitize recommendations
      const userRecs = sanitizeRecommendations(
        Array.isArray(parsed.userRecommendations) ? parsed.userRecommendations : [],
        diseaseName
      );
      const medicalRecs = sanitizeRecommendations(
        Array.isArray(parsed.medicalPersonnelRecommendations) ? parsed.medicalPersonnelRecommendations : [],
        diseaseName
      );

      return {
        disease_name: diseaseName,
        user_recommendations: userRecs,
        medical_personnel_recommendations: medicalRecs,
        summary: parsed.summary || `Key prevention strategies for ${diseaseName}.`,
      };
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      return null;
    }
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return null;
  }
};

// Generate fallback recommendations (when AI is unavailable)
const generateFallbackRecommendations = (diseaseName: string): DiseaseRecommendationData => {
  const lowerName = diseaseName.toLowerCase();
  const isCovid =
    lowerName.includes("covid") ||
    lowerName.includes("sars-cov-2") ||
    lowerName.includes("coronavirus");

  if (isCovid) {
    return {
      disease_name: diseaseName,
      user_recommendations: [
        "Get vaccinated and stay up to date with COVID-19 boosters if eligible.",
        "Wear a well-fitting mask in crowded indoor spaces and on public transportation.",
        "Practice good hand hygiene and respiratory etiquette (cover coughs and sneezes).",
        "Improve indoor ventilation when possible.",
        "Stay home and get tested if you develop COVID-19 symptoms.",
      ],
      medical_personnel_recommendations: [
        "Ensure access to COVID-19 testing, vaccination, and early treatment for high-risk groups.",
        "Maintain up-to-date clinical protocols for COVID-19 case management.",
        "Promote indoor ventilation and masking policies in high-risk settings.",
      ],
      summary: `COVID-19 is a respiratory illness transmitted through droplets and aerosols. Prevention focuses on vaccination, masking, ventilation, and hygiene.`,
    };
  }

  return {
    disease_name: diseaseName,
    user_recommendations: [
      `Stay informed about ${diseaseName} activity in your area and follow guidance from health authorities.`,
      `Practice core prevention measures: hand hygiene, staying home when sick, and seeking care early if symptoms worsen.`,
      `If vaccines or specific preventive measures exist for ${diseaseName}, discuss them with a healthcare provider.`,
    ],
    medical_personnel_recommendations: [
      `Maintain appropriate surveillance and reporting for ${diseaseName}, especially in higher-risk populations.`,
      `Ensure diagnostic and treatment protocols for ${diseaseName} are available to frontline staff.`,
      `Review local capacity to respond to potential increases in ${diseaseName} cases.`,
    ],
    summary: `Key prevention and management strategies for ${diseaseName}.`,
  };
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // This function can be called without auth for internal use, but we'll require it for security
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { disease_name, force_regenerate } = body;

    if (!disease_name || typeof disease_name !== "string") {
      return new Response(
        JSON.stringify({ error: "disease_name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if recommendations already exist
    if (!force_regenerate) {
      const { data: existing, error: fetchError } = await supabase
        .from("disease_recommendations")
        .select("*")
        .eq("disease_name", disease_name)
        .eq("is_active", true)
        .single();

      if (!fetchError && existing) {
        return new Response(
          JSON.stringify({
            success: true,
            data: existing,
            cached: true,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Generate new recommendations
    let recommendationData: DiseaseRecommendationData | null = null;

    if (deepseekApiKey) {
      recommendationData = await generateDiseaseRecommendations(disease_name, deepseekApiKey);
    }

    // Fallback if AI generation failed
    if (!recommendationData) {
      recommendationData = generateFallbackRecommendations(disease_name);
    }

    // Store in database (upsert)
    const { data: stored, error: storeError } = await supabase
      .from("disease_recommendations")
      .upsert(
        {
          disease_name: recommendationData.disease_name,
          user_recommendations: recommendationData.user_recommendations,
          medical_personnel_recommendations: recommendationData.medical_personnel_recommendations,
          summary: recommendationData.summary,
          is_active: true,
          generated_at: new Date().toISOString(),
        },
        {
          onConflict: "disease_name",
        }
      )
      .select()
      .single();

    if (storeError) {
      console.error("Error storing recommendations:", storeError);
      return new Response(
        JSON.stringify({ error: "Failed to store recommendations", details: storeError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: stored,
        cached: false,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error generating disease recommendations:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});










































