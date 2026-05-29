import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { translateText } from "../_shared/utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, language, targetLanguage } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!text.trim()) {
      return new Response(
        JSON.stringify({ error: "Text cannot be empty" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const target = (typeof targetLanguage === "string" && targetLanguage.trim()) || "en";
    console.log(
      `Translating text (source: ${language || "unknown"}, target: ${target}, length: ${text.length})`
    );

    const translatedText = await translateText(text, target);

    return new Response(
      JSON.stringify({
        translatedText,
        originalLanguage: language || "unknown",
        targetLanguage: target,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({
        error: error?.message || "Translation failed",
        details: error?.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

