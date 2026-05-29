import { OpenAI } from "npm:openai@6";

const normalize = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export const isLikelySameString = (s1: string, s2: string) =>
  normalize(s1) === normalize(s2);

/**
 * Strips HTML tags and extracts clean text content
 * @param html - HTML string to clean
 * @returns Clean text without HTML tags
 */
export function stripHtmlTags(html: string): string {
  if (!html || html.trim() === "") {
    return html;
  }

  let text = html;
  
  // Remove HTML tags (including nested tags)
  // This regex handles tags like <a href="...">, <font color="...">, etc.
  text = text.replace(/<[^>]*>/g, " ");
  
  // Decode common HTML entities (do this after removing tags to avoid issues)
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&hellip;/gi, "...")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"');
  
  // Decode numeric HTML entities (&#123; format)
  text = text.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(parseInt(dec, 10));
  });
  
  // Decode hex HTML entities (&#x1F; format)
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  // Replace multiple whitespace/newlines with single space
  text = text.replace(/[\s\n\r\t]+/g, " ").trim();
  
  return text;
}

// Lazy initialization of OpenAI client
let openaiInstance: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY environment variable is not set");
    }
    openaiInstance = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey: apiKey,
    });
  }
  return openaiInstance;
}

// ISO 639-1 → full language name. Used to build a DeepSeek prompt that
// instructs the model to translate INTO the target language.
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
  ar: "Arabic",
  de: "German",
  pt: "Portuguese",
  it: "Italian",
  ru: "Russian",
  ja: "Japanese",
  zh: "Chinese (Simplified)",
};

function nameForCode(code: string | undefined | null): string {
  if (!code) return "English";
  const lower = code.toLowerCase().split(/[-_]/)[0];
  return LANGUAGE_NAMES[lower] || "English";
}

/**
 * Translates text to the requested target language using DeepSeek.
 * Strips HTML tags before translating to get clean text.
 * @param text - The text to translate (may contain HTML)
 * @param targetLanguage - ISO 639-1 code (en, fr, es, ar, de, pt, it, ru, ja, zh). Defaults to English.
 */
export async function translateText(
  text: string,
  targetLanguage: string = "en"
): Promise<string> {
  if (!text || text.trim() === "") {
    return text;
  }

  try {
    const openai = getOpenAIClient();
    const cleanText = stripHtmlTags(text);

    if (!cleanText || cleanText.trim() === "") {
      console.warn("No text content found after stripping HTML");
      return text;
    }

    const textToTranslate =
      cleanText.length > 2000 ? cleanText.substring(0, 2000) + "..." : cleanText;
    const targetName = nameForCode(targetLanguage);

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a professional translator. Translate the user's text into clear, accurate ${targetName}. Preserve the original meaning, names, and context. Do not add commentary or explanations. Return only the translated text, no HTML, markdown, or formatting.`,
        },
        {
          role: "user",
          content: `Translate the following text into ${targetName}:\n\n${textToTranslate}`,
        },
      ],
      model: "deepseek-chat",
      temperature: 0.3,
    });

    const translatedText = completion.choices[0].message.content || cleanText;
    const finalText = stripHtmlTags(translatedText);
    return finalText.trim();
  } catch (error) {
    console.error("Translation failed:", error);
    return stripHtmlTags(text);
  }
}

/**
 * Backwards-compatible English-only wrapper retained for callers that have not
 * been updated to specify a target language.
 */
export async function translateToEnglish(text: string): Promise<string> {
  return translateText(text, "en");
}

