/**
 * Client-side utility to translate article text to English
 * Calls the Supabase Edge Function for translation
 */

export interface TranslateResponse {
  translatedText: string;
  originalLanguage: string;
}

export interface TranslateError {
  error: string;
  details?: string;
}

export async function translateArticle(
  text: string,
  language?: string // Optional, not passed to let DeepSeek auto-detect
): Promise<TranslateResponse> {
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase configuration");
  }

  if (!text || !text.trim()) {
    throw new Error("Text is required for translation");
  }

  // Don't pass language - let DeepSeek auto-detect
  const response = await fetch(`${supabaseUrl}/functions/v1/translate-article`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey,
    },
    body: JSON.stringify({ text }), // No language parameter
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

