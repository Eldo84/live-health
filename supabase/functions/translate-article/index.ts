import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { translateToEnglish } from "../_shared/utils.ts";

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
    const { text, language } = await req.json();

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

    console.log(`Translating text (language: ${language || "unknown"}, length: ${text.length})`);

    const translatedText = await translateToEnglish(text);

    return new Response(
      JSON.stringify({
        translatedText,
        originalLanguage: language || "unknown",
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
        details: error?.toString() 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

