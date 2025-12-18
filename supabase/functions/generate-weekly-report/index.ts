import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WeeklyDiseaseSummary {
  disease_name: string;
  total_cases: number;
  new_cases: number;
}

interface WeeklyReportRecommendations {
  userRecommendations: string[];
  medicalPersonnelRecommendations: string[];
  summary: string;
}

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

    // Get auth header
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

    // 1) Get weekly top 10 diseases from SQL helper
    const { data: summary, error: summaryError } = await supabase
      .rpc<WeeklyDiseaseSummary>("get_weekly_top_diseases");

    if (summaryError) {
      throw new Error(`Failed to compute weekly top diseases: ${summaryError.message}`);
    }

    const topDiseases = summary || [];

    if (topDiseases.length === 0) {
      return new Response(
        JSON.stringify({
          diseases: [],
          recommendations: {
            userRecommendations: [
              "No significant disease activity detected in the past week. Continue practicing good hygiene and staying informed.",
            ],
            medicalPersonnelRecommendations: [
              "No significant disease activity detected. Maintain standard surveillance protocols.",
            ],
            summary: "No disease activity recorded in the last 7 days.",
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2) Generate AI recommendations if API key is available
    let recommendations: WeeklyReportRecommendations = {
      userRecommendations: [],
      medicalPersonnelRecommendations: [],
      summary: "",
    };

    if (deepseekApiKey) {
      try {
        const diseaseList = topDiseases
          .map((item, index) => `${index + 1}. ${item.disease_name} (${item.new_cases} new cases, ${item.total_cases} total cases)`)
          .join("\n");

        const currentDate = new Date().toISOString();
        const prompt = `You are an expert epidemiologist and public health advisor. Based on the following weekly top 10 diseases data, generate actionable recommendations.

Current Date: ${currentDate}

Weekly Top Diseases:
${diseaseList}

Generate a comprehensive weekly health report with the following structure:

1. **Summary** (2-3 sentences): A brief overview of the current disease situation and overall health landscape.

2. **User Recommendations** (5-7 actionable items): Specific, practical advice for the general public. Focus on:
   - Preventive measures they can take
   - Symptoms to watch for
   - When to seek medical attention
   - Hygiene and safety practices
   - Travel considerations if relevant
   - Community health practices

3. **Medical Personnel Recommendations** (5-7 actionable items): Professional guidance for healthcare workers, public health officials, and medical professionals. Focus on:
   - Clinical considerations
   - Diagnostic approaches
   - Treatment protocols
   - Surveillance and monitoring
   - Infection control measures
   - Resource allocation
   - Public health interventions

Return ONLY a valid JSON object in this exact format:
{
  "summary": "Brief 2-3 sentence summary of the weekly health situation",
  "userRecommendations": [
    "Recommendation 1 for general public",
    "Recommendation 2 for general public",
    "..."
  ],
  "medicalPersonnelRecommendations": [
    "Recommendation 1 for medical professionals",
    "Recommendation 2 for medical professionals",
    "..."
  ]
}

Make recommendations specific, actionable, and based on the actual diseases listed. Prioritize diseases with higher case counts.`;

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
                content: "You are an expert epidemiologist and public health advisor. Always respond with valid JSON only, no additional text or markdown formatting.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });

        if (deepseekResponse.ok) {
          const deepseekData = await deepseekResponse.json();
          const content = deepseekData.choices?.[0]?.message?.content || "";

          // Extract JSON from response (handle markdown code blocks)
          let jsonContent = content.trim();
          if (jsonContent.startsWith("```json")) {
            jsonContent = jsonContent.replace(/^```json\n?/, "").replace(/\n?```$/, "");
          } else if (jsonContent.startsWith("```")) {
            jsonContent = jsonContent.replace(/^```\n?/, "").replace(/\n?```$/, "");
          }

          try {
            recommendations = JSON.parse(jsonContent);
          } catch (parseError) {
            console.error("Failed to parse AI response:", parseError);
            // Fall back to default recommendations
          }
        } else {
          console.error("DeepSeek API error:", await deepseekResponse.text());
        }
      } catch (aiError) {
        console.error("Error generating AI recommendations:", aiError);
        // Continue with default recommendations
      }
    }

    // 3) Fallback recommendations if AI generation failed or API key not available
    if (recommendations.userRecommendations.length === 0) {
      recommendations = {
        summary: `Top ${topDiseases.length} diseases detected in the past week. Stay informed and practice good hygiene.`,
        userRecommendations: [
          "Monitor for symptoms of the top diseases: " + topDiseases.slice(0, 3).map(d => d.disease_name).join(", "),
          "Practice good hand hygiene and respiratory etiquette",
          "Stay up to date with local health advisories",
          "Seek medical attention if you experience severe symptoms",
          "Consider vaccination if available for prevalent diseases",
        ],
        medicalPersonnelRecommendations: [
          "Maintain heightened surveillance for: " + topDiseases.slice(0, 3).map(d => d.disease_name).join(", "),
          "Review diagnostic protocols for high-incidence diseases",
          "Ensure adequate stock of relevant treatments and supplies",
          "Coordinate with public health authorities on case reporting",
          "Implement appropriate infection control measures",
        ],
      };
    }

    return new Response(
      JSON.stringify({
        diseases: topDiseases,
        recommendations,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error generating weekly report:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

