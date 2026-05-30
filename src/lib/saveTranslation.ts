/**
 * Client-side utility to save article translations to the database
 * Calls the Supabase Edge Function to save translations
 */

export interface SaveTranslationResponse {
  success: boolean;
}

export interface SaveTranslationError {
  error: string;
}

export async function saveTranslation(
  articleId: string,
  translatedText: string,
  translatedTitle?: string
): Promise<SaveTranslationResponse> {
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing LiveHealth+ database configuration");
  }

  if (!articleId || !translatedText) {
    throw new Error("articleId and translatedText are required");
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/save-translation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey,
    },
    body: JSON.stringify({
      articleId,
      translatedText,
      translatedTitle,
    }),
  });

  if (!response.ok) {
    const errorData: SaveTranslationError = await response.json().catch(() => ({
      error: `Failed to save translation: ${response.status} ${response.statusText}`,
    }));
    throw new Error(errorData.error || `Failed to save translation: ${response.statusText}`);
  }

  const data: SaveTranslationResponse = await response.json();
  return data;
}






