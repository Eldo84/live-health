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

/**
 * Translates text to English using DeepSeek AI
 * Strips HTML tags before translating to get clean text
 * @param text - The text to translate (may contain HTML)
 * @returns The translated English text (clean, no HTML)
 */
export async function translateToEnglish(text: string): Promise<string> {
  if (!text || text.trim() === "") {
    return text;
  }

  try {
    const openai = getOpenAIClient();
    
    // Strip HTML tags and extract clean text before translating
    const cleanText = stripHtmlTags(text);
    
    if (!cleanText || cleanText.trim() === "") {
      console.warn("No text content found after stripping HTML");
      return text; // Return original if no clean text found
    }
    
    // Limit text length to avoid token limits (keep it reasonable)
    const textToTranslate = cleanText.length > 3000 ? cleanText.substring(0, 3000) + "..." : cleanText;

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a professional translator. Translate the following text into clear, accurate English. Preserve the original meaning and context. Do not add commentary or explanations, just provide the translation. Return only the translated text, no HTML or formatting.",
        },
        {
          role: "user",
          content: `Translate the following text into English:\n\n${textToTranslate}`,
        },
      ],
      model: "deepseek-chat",
      temperature: 0.3, // Lower temperature for more consistent translations
    });

    const translatedText = completion.choices[0].message.content || cleanText;
    // Ensure no HTML in translated text (strip again just in case AI adds formatting)
    // This ensures we always return clean text
    const finalText = stripHtmlTags(translatedText);
    return finalText.trim();
  } catch (error) {
    console.error("Translation failed:", error);
    // If translation fails, return clean text (without HTML) instead of original HTML
    return stripHtmlTags(text);
  }
}
