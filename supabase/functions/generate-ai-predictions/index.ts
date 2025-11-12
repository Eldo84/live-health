import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface OutbreakSignal {
  id: string;
  disease_id: string;
  country_id: string | null;
  detected_at: string;
  case_count_mentioned: number | null;
  severity_assessment: string | null;
  confidence_score: number | null;
  diseases?: { name: string; severity_level: string | null };
  countries?: { name: string; code: string | null };
}

interface AIPrediction {
  disease: string;
  location: string;
  type: string;
  prediction: string;
  confidence: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  targetDate: string;
  color: string;
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
          predictions: [] 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if refresh is requested
    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get("refresh") === "true";

    // Check cache first (cache for 24 hours since we generate proactively)
    // Unless refresh is explicitly requested, always return stored predictions if available
    const cacheKey = "ai_predictions_cache";
    const cacheDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    if (!forceRefresh) {
      const { data: cacheData } = await supabase
        .from("app_settings")
        .select("value, updated_at")
        .eq("key", cacheKey)
        .single();

      if (cacheData && cacheData.updated_at) {
        const cacheAge = Date.now() - new Date(cacheData.updated_at).getTime();
        // Always return stored predictions if they exist (even if expired)
        // New predictions are generated proactively, so stored ones are always fresh enough
        try {
          const cachedPredictions = JSON.parse(cacheData.value);
          const isExpired = cacheAge >= cacheDuration;
          console.log(
            `Returning stored predictions (age: ${Math.round(cacheAge / 1000)}s, expired: ${isExpired})`
          );
          return new Response(
            JSON.stringify({ 
              predictions: cachedPredictions,
              cached: true,
              cacheAge: Math.round(cacheAge / 1000) // seconds
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        } catch (e) {
          console.error("Error parsing cache:", e);
          // Fall through to generate new predictions
        }
      }
    } else {
      console.log("Force refresh requested - bypassing cache");
    }

    // Fetch recent outbreak signals (last 30 days) with disease and country info
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: signals, error } = await supabase
      .from("outbreak_signals")
      .select(`
        id,
        disease_id,
        country_id,
        detected_at,
        case_count_mentioned,
        severity_assessment,
        confidence_score,
        diseases:disease_id(name, severity_level),
        countries:country_id(name, code)
      `)
      .gte("detected_at", thirtyDaysAgo.toISOString())
      .order("detected_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching signals:", error);
      throw error;
    }

    if (!signals || signals.length === 0) {
      return new Response(
        JSON.stringify({ predictions: [] }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Group signals by disease and location for analysis
    const diseaseLocationMap = new Map<string, {
      disease: string;
      location: string;
      signals: OutbreakSignal[];
      totalCases: number;
      latestDate: string;
      severity: string | null;
    }>();

    signals.forEach((signal: any) => {
      const disease = signal.diseases?.name || "Unknown Disease";
      const location = signal.countries?.name || "Unknown Location";
      const key = `${disease}|${location}`;
      
      if (!diseaseLocationMap.has(key)) {
        diseaseLocationMap.set(key, {
          disease,
          location,
          signals: [],
          totalCases: 0,
          latestDate: signal.detected_at,
          severity: signal.diseases?.severity_level || signal.severity_assessment,
        });
      }
      
      const entry = diseaseLocationMap.get(key)!;
      entry.signals.push(signal);
      entry.totalCases += signal.case_count_mentioned || 0;
      if (new Date(signal.detected_at) > new Date(entry.latestDate)) {
        entry.latestDate = signal.detected_at;
      }
    });

    // Prepare context for AI
    const topOutbreaks = Array.from(diseaseLocationMap.values())
      .sort((a, b) => b.totalCases - a.totalCases)
      .slice(0, 10);

    const contextData = topOutbreaks.map(entry => ({
      disease: entry.disease,
      location: entry.location,
      totalCases: entry.totalCases,
      signalCount: entry.signals.length,
      latestDate: entry.latestDate,
      severity: entry.severity,
    }));

    // Call DeepSeek API
    const prompt = `You are an expert epidemiologist analyzing disease outbreak data. Based on the following recent outbreak signals, generate 5-7 specific, actionable predictions about potential spread, risk levels, and case forecasts.

Recent Outbreak Data:
${JSON.stringify(contextData, null, 2)}

For each prediction, provide:
1. Disease name
2. Location (country/region)
3. Prediction type (one of: "Case Forecast", "Geographic Spread", "Risk Assessment", "Timeline Projection")
4. Specific prediction text (e.g., "X predicted cases in next Y days" or "Z% probability of spread to region W")
5. Confidence level (0-100)
6. Risk level (one of: "low", "medium", "high", "critical")
7. Target date (7-30 days from now, format: "MMM DD, YYYY")

Return ONLY a valid JSON array of predictions in this exact format:
[
  {
    "disease": "Disease Name",
    "location": "Country/Region",
    "type": "Case Forecast",
    "prediction": "Specific prediction text",
    "confidence": 85,
    "riskLevel": "high",
    "targetDate": "Nov 15, 2024"
  }
]

Make predictions realistic, data-driven, and specific. Focus on diseases with higher case counts and recent activity.`;

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
            content: "You are an expert epidemiologist. Always respond with valid JSON only, no additional text.",
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

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      console.error("DeepSeek API error:", errorText);
      throw new Error(`DeepSeek API error: ${deepseekResponse.status}`);
    }

    const deepseekData = await deepseekResponse.json();
    const aiResponse = deepseekData.choices[0]?.message?.content || "[]";

    // Parse AI response (might have markdown code blocks)
    let predictionsJson = aiResponse.trim();
    if (predictionsJson.startsWith("```json")) {
      predictionsJson = predictionsJson.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (predictionsJson.startsWith("```")) {
      predictionsJson = predictionsJson.replace(/```\n?/g, "");
    }

    let predictions: AIPrediction[] = [];
    try {
      predictions = JSON.parse(predictionsJson);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Raw response:", aiResponse);
      // Return empty predictions if parsing fails
      predictions = [];
    }

    // Add colors based on disease/risk level
    const colorMap: Record<string, string> = {
      critical: "#f87171",
      high: "#fbbf24",
      medium: "#66dbe1",
      low: "#4ade80",
    };

    const diseaseColors: Record<string, string> = {
      "Ebola": "#f87171",
      "Malaria": "#fbbf24",
      "COVID-19": "#66dbe1",
      "Cholera": "#a78bfa",
      "Dengue": "#fb923c",
      "Zika": "#ef4444",
      "Measles": "#10b981",
      "Meningitis": "#ec4899",
      "Yellow Fever": "#3b82f6",
      "Tuberculosis": "#f59e0b",
    };

    predictions = predictions.map((pred: AIPrediction) => ({
      ...pred,
      color: diseaseColors[pred.disease] || colorMap[pred.riskLevel] || "#66dbe1",
    }));

    // Cache the predictions in database
    try {
      await supabase
        .from("app_settings")
        .upsert({
          key: cacheKey,
          value: JSON.stringify(predictions),
          description: "Cached AI predictions (refreshes every hour)",
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "key"
        });
      console.log("Cached predictions for future requests");
    } catch (cacheError) {
      console.error("Error caching predictions:", cacheError);
      // Continue even if caching fails
    }

    return new Response(
      JSON.stringify({ predictions, cached: false }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error generating predictions:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        predictions: [] 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

