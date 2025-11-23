export const SUPPORTED_LANGUAGES = [
  "en",
  "fr",
  "es",
  "ar",
  "de",
  "pt",
  "it",
  "ru",
  "ja"
];

// Optional: Map languages to news sources
export const LANGUAGE_NEWS_SOURCES: Record<string, string[]> = {
  en: ["https://news.google.com/rss/search?q=disease"],
  fr: ["https://news.google.fr/rss/search?q=maladie"],
  es: ["https://news.google.es/rss/search?q=enfermedad"],
  ar: ["https://news.google.com/rss/search?q=%D9%85%D8%B1%D8%B6"],
  de: ["https://news.google.de/rss/search?q=krankheit"],
  pt: ["https://news.google.com/rss/search?q=doença"],
  it: ["https://news.google.it/rss/search?q=malattia"],
  ru: ["https://news.google.ru/rss/search?q=болезнь"],
  ja: ["https://news.google.co.jp/rss/search?q=病気"],
};

/**
 * Gets languages to process in this run based on rotation
 * Processes 3 languages per run, cycling through all languages
 * Uses database to track rotation state for reliable sequential processing
 * @param supabase - Supabase client for database access
 * @param languagesPerRun - Number of languages to process per run (default: 3)
 * @returns Array of language codes to process in this run
 */
export async function getLanguagesForThisRun(
  supabase: any,
  languagesPerRun: number = 3
): Promise<string[]> {
  const totalLanguages = SUPPORTED_LANGUAGES.length;
  
  try {
    // Get or create rotation state in database
    const { data: rotationState } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "language_rotation_index")
      .maybeSingle();
    
    let currentIndex = 0;
    if (rotationState && rotationState.value) {
      currentIndex = parseInt(rotationState.value) || 0;
    } else {
      // Create initial rotation state
      await supabase
        .from("app_settings")
        .insert({
          key: "language_rotation_index",
          value: "0",
          description: "Current rotation index for language processing (0-based)",
        })
        .onConflict("key")
        .ignore();
    }
    
    // Calculate which languages to process
    // With 9 languages and 3 per run:
    // Run 0: indices 0-2 (en, fr, es)
    // Run 1: indices 3-5 (ar, de, pt)
    // Run 2: indices 6-8 (it, ru, ja)
    // Run 3: back to 0-2
    const startIndex = currentIndex * languagesPerRun;
    const languages: string[] = [];
    
    for (let i = 0; i < languagesPerRun; i++) {
      const index = (startIndex + i) % totalLanguages;
      languages.push(SUPPORTED_LANGUAGES[index]);
    }
    
    // Calculate number of rotation cycles needed
    // With 9 languages and 3 per run: numRotations = Math.ceil(9/3) = 3
    const numRotations = Math.ceil(totalLanguages / languagesPerRun);
    
    // Update rotation index for next run (cycles through 0, 1, 2, 0, 1, 2, ...)
    const nextIndex = (currentIndex + 1) % numRotations;
    
    console.log(`Language rotation: Current index=${currentIndex}, Processing languages: ${languages.join(", ")}, Next index=${nextIndex}`);
    
    await supabase
      .from("app_settings")
      .upsert({
        key: "language_rotation_index",
        value: nextIndex.toString(),
        description: `Current rotation index for language processing. Cycles: 0=en,fr,es | 1=ar,de,pt | 2=it,ru,ja`,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "key",
      });
    
    return languages;
  } catch (error) {
    console.warn("Failed to get rotation state from database, using time-based fallback:", error);
    // Fallback to time-based rotation if database fails
    const currentHour = new Date().getUTCHours();
    const rotationIndex = Math.floor(currentHour / 4);
    const startIndex = (rotationIndex * languagesPerRun) % totalLanguages;
    const languages: string[] = [];
    
    for (let i = 0; i < languagesPerRun; i++) {
      const index = (startIndex + i) % totalLanguages;
      languages.push(SUPPORTED_LANGUAGES[index]);
    }
    
    return languages;
  }
}

