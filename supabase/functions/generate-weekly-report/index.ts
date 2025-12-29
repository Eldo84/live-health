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

interface WeeklyDiseaseRecommendations {
  disease_name: string;
  userRecommendations: string[];
  medicalPersonnelRecommendations: string[];
}

interface WeeklyReportRecommendations {
  userRecommendations: string[];
  medicalPersonnelRecommendations: string[];
  summary: string;
  diseaseSpecific: WeeklyDiseaseRecommendations[];
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

    // 1) First, try to load pre-generated weekly report from database
    // Try today's report first, then fall back to most recent active report
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reportDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Try to get today's report
    let { data: storedReport, error: fetchReportError } = await supabase
      .from("weekly_reports")
      .select("*")
      .eq("report_date", reportDate)
      .eq("is_active", true)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // If today's report not found, get the most recent active report
    if (fetchReportError || !storedReport) {
      const { data: recentReport, error: recentError } = await supabase
        .from("weekly_reports")
        .select("*")
        .eq("is_active", true)
        .order("report_date", { ascending: false })
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!recentError && recentReport) {
        storedReport = recentReport;
        fetchReportError = null;
      }
    }

    // If we have a stored report, return it immediately (fast path)
    if (!fetchReportError && storedReport) {
      console.log(`Returning pre-generated weekly report from database (report_date: ${storedReport.report_date})`);
      return new Response(
        JSON.stringify({
          diseases: storedReport.diseases,
          recommendations: storedReport.recommendations,
          cached: true,
          reportDate: storedReport.report_date,
          weekStartDate: storedReport.week_start_date,
          weekEndDate: storedReport.week_end_date,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2) If no stored report found, generate on-the-fly (fallback for when cron hasn't run yet)
    console.log("No stored report found, generating on-the-fly");
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

    // Helper to create simple, conservative per-disease recommendations
    const buildFallbackDiseaseSpecific = (diseases: WeeklyDiseaseSummary[]): WeeklyDiseaseRecommendations[] => {
      return diseases.map((disease) => {
        const name = disease.disease_name;
        const lowerName = name.toLowerCase();

        // Special case for COVID-19 to avoid incorrect vector-control advice
        const isCovid =
          lowerName.includes("covid") ||
          lowerName.includes("sars-cov-2") ||
          lowerName.includes("coronavirus");

        const userRecommendations: string[] = [];
        const medicalRecommendations: string[] = [];

        if (isCovid) {
          userRecommendations.push(
            "For COVID-19, focus on respiratory precautions: get vaccinated/boosted if eligible, wear a mask in crowded indoor spaces, improve ventilation, and practice hand hygiene.",
            "Stay home and arrange testing if you develop COVID-like symptoms (fever, cough, sore throat, loss of taste or smell), and follow local isolation guidance.",
            "Avoid close contact with high‑risk individuals when you are unwell; insect control does not prevent COVID-19 because it is transmitted mainly by respiratory droplets and aerosols."
          );

          medicalRecommendations.push(
            "Ensure access to COVID-19 testing, vaccination/boosters, and early treatment pathways for high‑risk groups.",
            "Maintain up‑to‑date clinical protocols for COVID-19 case management, including oxygen therapy and escalation criteria.",
            "Promote indoor ventilation, masking policies in high‑risk settings, and accurate communication that COVID-19 is not vector‑borne."
          );
        } else {
          userRecommendations.push(
            `Stay informed about ${name} activity in your area and follow guidance from health authorities.`,
            `Practice core prevention measures that reduce many infections, including ${name}: hand hygiene, staying home when sick, and seeking care early if symptoms worsen.`,
            `If vaccines or specific preventive measures exist for ${name} in your region, discuss them with a healthcare provider.`
          );

          medicalRecommendations.push(
            `Maintain appropriate surveillance and reporting for ${name}, especially in higher‑risk populations and settings.`,
            `Ensure diagnostic and treatment protocols for ${name} are available to frontline staff and aligned with current guidelines.`,
            `Review local capacity (staff, diagnostics, therapeutics) to respond to potential increases in ${name} cases.`
          );
        }

        return {
          disease_name: name,
          userRecommendations,
          medicalPersonnelRecommendations: medicalRecommendations,
        };
      });
    };

    // Basic safety filter to correct obviously wrong statements for key diseases (e.g. COVID)
    const sanitizeRecommendations = (
      recommendations: WeeklyReportRecommendations,
      diseases: WeeklyDiseaseSummary[]
    ): WeeklyReportRecommendations => {
      const covidNames = diseases
        .filter((d) => {
          const n = d.disease_name.toLowerCase();
          return n.includes("covid") || n.includes("sars-cov-2") || n.includes("coronavirus");
        })
        .map((d) => d.disease_name);

      if (covidNames.length === 0) return recommendations;

      const insectKeywords = ["mosquito", "insect", "fly", "flies", "vector", "bug", "pest"];

      const fixLine = (line: string): string => {
        const lower = line.toLowerCase();
        const mentionsInsects = insectKeywords.some((k) => lower.includes(k));
        const mentionsCovid = covidNames.some((name) =>
          lower.includes(name.toLowerCase()) || lower.includes("covid") || lower.includes("coronavirus")
        );

        if (mentionsCovid && mentionsInsects) {
          return "For COVID-19, focus on respiratory precautions such as vaccination, masking in crowded indoor spaces, ventilation, and hand hygiene; insect control does not eliminate COVID-19 because it is not spread by insects.";
        }

        return line;
      };

      const fixArray = (arr: string[] | undefined): string[] =>
        Array.isArray(arr) ? arr.map(fixLine) : [];

      return {
        summary: recommendations.summary,
        userRecommendations: fixArray(recommendations.userRecommendations),
        medicalPersonnelRecommendations: fixArray(recommendations.medicalPersonnelRecommendations),
        diseaseSpecific: (recommendations.diseaseSpecific || []).map((item) => ({
          ...item,
          userRecommendations: fixArray(item.userRecommendations),
          medicalPersonnelRecommendations: fixArray(item.medicalPersonnelRecommendations),
        })),
      };
    };

    // 2) Generate AI recommendations if API key is available
    let recommendations: WeeklyReportRecommendations = {
      userRecommendations: [],
      medicalPersonnelRecommendations: [],
      summary: "",
      diseaseSpecific: [],
    };

    if (deepseekApiKey) {
      try {
        const diseaseList = topDiseases
          .map((item, index) => `${index + 1}. ${item.disease_name} (${item.new_cases} new cases, ${item.total_cases} total cases)`)
          .join("\n");

        const currentDate = new Date().toISOString();
        const prompt = `You are an expert epidemiologist and public health advisor. Based on the following weekly top 10 diseases data, generate actionable, epidemiologically correct recommendations.

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

3. **Medical Personnel Recommendations** (5-7 actionable global items): Professional guidance for healthcare workers, public health officials, and medical professionals. Focus on:
   - Clinical considerations
   - Diagnostic approaches
   - Treatment protocols
   - Surveillance and monitoring
   - Infection control measures
   - Resource allocation
   - Public health interventions

4. **Disease-Specific Recommendations**: For EACH disease listed in "Weekly Top Diseases", provide:
   - 2-3 recommendations for the general public that are specific to that disease
   - 2-3 recommendations for medical personnel that are specific to that disease

IMPORTANT SCIENTIFIC CONSTRAINTS:
- COVID-19 (SARS-CoV-2, coronavirus) is NOT transmitted by insects or mosquitoes. It is primarily transmitted via respiratory droplets and aerosols. Do NOT recommend killing insects, mosquito control, or vector control as a way to eliminate or prevent COVID-19.
- Only vector-borne diseases (for example, malaria, dengue, chikungunya, Zika, yellow fever) should have recommendations about mosquito or insect control.
- Ensure all recommendations are consistent with established infectious disease transmission routes.

Return ONLY a valid JSON object in this exact format:
{
  "summary": "Brief 2-3 sentence summary of the weekly health situation",
  "userRecommendations": [
    "Global recommendation 1 for general public",
    "Global recommendation 2 for general public"
  ],
  "medicalPersonnelRecommendations": [
    "Global recommendation 1 for medical professionals",
    "Global recommendation 2 for medical professionals"
  ],
  "diseaseSpecific": [
    {
      "disease_name": "ExampleDisease1",
      "userRecommendations": [
        "Disease-specific recommendation 1 for general public about ExampleDisease1",
        "Disease-specific recommendation 2 for general public about ExampleDisease1"
      ],
      "medicalPersonnelRecommendations": [
        "Disease-specific recommendation 1 for medical professionals about ExampleDisease1",
        "Disease-specific recommendation 2 for medical professionals about ExampleDisease1"
      ]
    }
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
            const parsed = JSON.parse(jsonContent);

            // Ensure the parsed object has the expected shape and fill in any missing pieces
            recommendations = {
              summary: parsed.summary || "",
              userRecommendations: Array.isArray(parsed.userRecommendations) ? parsed.userRecommendations : [],
              medicalPersonnelRecommendations: Array.isArray(parsed.medicalPersonnelRecommendations)
                ? parsed.medicalPersonnelRecommendations
                : [],
              diseaseSpecific: Array.isArray(parsed.diseaseSpecific)
                ? parsed.diseaseSpecific.map((item: any) => ({
                    disease_name: String(item.disease_name || ""),
                    userRecommendations: Array.isArray(item.userRecommendations) ? item.userRecommendations : [],
                    medicalPersonnelRecommendations: Array.isArray(item.medicalPersonnelRecommendations)
                      ? item.medicalPersonnelRecommendations
                      : [],
                  }))
                : [],
            };
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
    // Check if we need to use fallback (if summary is empty OR userRecommendations is empty OR diseaseSpecific is empty)
    const needsFallback = 
      !recommendations.summary || 
      recommendations.summary.trim() === "" ||
      recommendations.userRecommendations.length === 0 ||
      !recommendations.diseaseSpecific || 
      recommendations.diseaseSpecific.length === 0;

    if (needsFallback) {
      console.log("Using fallback recommendations - AI generation may have failed or returned incomplete data");
      recommendations = {
        summary: `Top ${topDiseases.length} diseases detected in the past week. Stay informed and practice good hygiene.`,
        userRecommendations: [
          "Monitor for symptoms of the top diseases: " + topDiseases.slice(0, 3).map(d => d.disease_name).join(", "),
          "Practice good hand hygiene and respiratory etiquette.",
          "Stay up to date with local health advisories from official sources.",
          "Seek medical attention if you experience severe or worsening symptoms.",
          "Discuss vaccination or other preventive options with a healthcare provider when available.",
        ],
        medicalPersonnelRecommendations: [
          "Maintain heightened surveillance for: " + topDiseases.slice(0, 3).map(d => d.disease_name).join(", "),
          "Review diagnostic protocols for high-incidence diseases and ensure frontline staff are trained.",
          "Ensure adequate stock of relevant treatments, diagnostics, and personal protective equipment.",
          "Coordinate with public health authorities on timely case reporting and data sharing.",
          "Implement appropriate infection control measures tailored to each disease's transmission route.",
        ],
        diseaseSpecific: buildFallbackDiseaseSpecific(topDiseases),
      };
    }

    // Fetch disease-specific recommendations from database (only if we have stored ones)
    const diseaseNames = topDiseases.map((d) => d.disease_name);
    const { data: storedRecommendations, error: fetchError } = await supabase
      .from("disease_recommendations")
      .select("*")
      .in("disease_name", diseaseNames)
      .eq("is_active", true);

    // Only use stored recommendations if they exist and we're not using fallback
    // OR if we're using fallback but want to enhance it with stored data
    if (!fetchError && storedRecommendations && storedRecommendations.length > 0) {
      // Create a map of stored recommendations by disease name
      const storedMap = new Map(
        storedRecommendations.map((rec) => [
          rec.disease_name,
          {
            disease_name: rec.disease_name,
            userRecommendations: rec.user_recommendations || [],
            medicalPersonnelRecommendations: rec.medical_personnel_recommendations || [],
          }
        ])
      );

      // Merge stored recommendations with existing diseaseSpecific
      // For diseases with stored recommendations, use stored; otherwise keep existing
      recommendations.diseaseSpecific = topDiseases.map((disease) => {
        const stored = storedMap.get(disease.disease_name);
        if (stored && stored.userRecommendations.length > 0) {
          return stored;
        }
        // Find existing recommendation for this disease or create fallback
        const existing = recommendations.diseaseSpecific?.find(
          (rec) => rec.disease_name === disease.disease_name
        );
        return existing || {
          disease_name: disease.disease_name,
          userRecommendations: [
            `Stay informed about ${disease.disease_name} activity in your area and follow guidance from health authorities.`,
            `Practice core prevention measures: hand hygiene, staying home when sick, and seeking care early if symptoms worsen.`,
            `If vaccines or specific preventive measures exist for ${disease.disease_name} in your region, discuss them with a healthcare provider.`,
          ],
          medicalPersonnelRecommendations: [
            `Maintain appropriate surveillance and reporting for ${disease.disease_name}, especially in higher‑risk populations and settings.`,
            `Ensure diagnostic and treatment protocols for ${disease.disease_name} are available to frontline staff and aligned with current guidelines.`,
            `Review local capacity (staff, diagnostics, therapeutics) to respond to potential increases in ${disease.disease_name} cases.`,
          ],
        };
      });
    } else {
      // If no stored recommendations, ensure diseaseSpecific is populated for all diseases
      if (!recommendations.diseaseSpecific || recommendations.diseaseSpecific.length === 0) {
        recommendations.diseaseSpecific = buildFallbackDiseaseSpecific(topDiseases);
      } else {
        // Ensure all diseases have recommendations (fill in missing ones)
        const existingDiseaseNames = new Set(
          recommendations.diseaseSpecific.map((rec) => rec.disease_name)
        );
        const missingDiseases = topDiseases.filter(
          (d) => !existingDiseaseNames.has(d.disease_name)
        );
        if (missingDiseases.length > 0) {
          recommendations.diseaseSpecific.push(...buildFallbackDiseaseSpecific(missingDiseases));
        }
      }
    }

    // Apply safety sanitation (e.g. correcting COVID/insect misconceptions)
    recommendations = sanitizeRecommendations(recommendations, topDiseases);

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

