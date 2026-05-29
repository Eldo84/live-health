/**
 * Client-side utility to translate article text via the Supabase Edge Function.
 * Target language is the active app language so users see articles in their
 * chosen language instead of always-English.
 */

export interface TranslateResponse {
  translatedText: string;
  originalLanguage: string;
  targetLanguage?: string;
}

export interface TranslateError {
  error: string;
  details?: string;
}

export async function translateArticle(
  text: string,
  sourceLanguage?: string,
  targetLanguage: string = "en"
): Promise<TranslateResponse> {
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase configuration");
  }

  if (!text || !text.trim()) {
    throw new Error("Text is required for translation");
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/translate-article`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey,
    },
    body: JSON.stringify({
      text,
      language: sourceLanguage,
      targetLanguage,
    }),
  });

  if (!response.ok) {
    const errorData: TranslateError = await response.json().catch(() => ({
      error: `Translation failed: ${response.status} ${response.statusText}`,
    }));
    throw new Error(errorData.error || `Translation failed: ${response.statusText}`);
  }

  const data: TranslateResponse = await response.json();
  return data;
}

