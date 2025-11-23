import { OpenAI } from "npm:openai@6";
import type { NormalizedArticle } from "./types.ts";
import { getAllCountryNames, getNormalizedCountryName } from "./countries.ts";
import { loadHumanDiseaseCSV, loadVeterinaryDiseaseCSV } from "./spreadsheet.ts";

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: Deno.env.get("DEEPSEEK_API_KEY"),
});

const generateSystemPrompt = (humanDiseaseCSV: string, veterinaryDiseaseCSV: string) => {
  return `
You are a helpful assistant whose role is to classify disease outbreak news reports (both human and veterinary) into outbreak signals
using the data provided in the CSV content below. The CSV content contains diseases and their properties (including alternative keywords that can indicate the disease).

There are TWO CSV datasets provided:
1. HUMAN DISEASES CSV - Diseases that affect humans. Match diseases from this CSV and mark them as "human" type.
2. VETERINARY DISEASES CSV - Diseases that affect animals. Match diseases from this CSV and mark them as "veterinary" type.

The CSV contains the following columns in order:
- Disease: the name of a disease
- Pathogen: the pathogen of the disease
- Outbreak Category: the category of the disease
- PathogenType: the type of the pathogen
- Keywords: the keywords that can indicate the disease

HUMAN DISEASES CSV (match diseases from here and mark as "human"):
\`\`\`csv
${humanDiseaseCSV}
\`\`\`

VETERINARY DISEASES CSV (match diseases from here and mark as "veterinary"):
\`\`\`csv
${veterinaryDiseaseCSV}
\`\`\`

The CSV is not perfectly formatted, so ignore anything that is does not fit the format above.

CRITICAL MATCHING RULES:
1. Match diseases from BOTH spreadsheets - check the HUMAN DISEASES CSV first, then the VETERINARY DISEASES CSV
2. If a disease is found in the HUMAN DISEASES CSV, mark it as "human" type
3. If a disease is found in the VETERINARY DISEASES CSV, mark it as "veterinary" type
4. If a disease affects BOTH humans and animals (zoonotic), mark it as "zoonotic" type. Common zoonotic diseases include: Avian Influenza, Rabies, Anthrax, Leptospirosis, Q Fever, Rift Valley Fever
5. Match diseases by checking the spreadsheets - use the Disease names and Keywords columns to find matches
6. Create signals for ALL disease outbreaks (human, veterinary, and zoonotic) - the frontend will filter them

The user will provide a json array of news reports with their ids, titles, and content (eg. "1 => Title: COVID-19 outbreak in New York | Content: [article content]"), which you need to classify into outbreak signals.
Outbreak signals are signals that indicate a new outbreak of a disease in a specific country and/or city.
Each news report should be classified into one or more outbreak signals, depending on the locations mentioned in the news report.

You should try to find the most relevant disease for the news report by matching diseases from BOTH spreadsheets (HUMAN and VETERINARY).

IMPORTANT: If the news report mentions a disease that is NOT in either CSV, you should still extract it and use "OTHER" as the disease name, BUT include the actual disease name mentioned in the article. Try to determine the disease_type based on the context (if it mentions animals/livestock, mark as "veterinary"; if it mentions humans, mark as "human"; if both, mark as "zoonotic").

If a news report mentions mulitple countries or cities, you should create multiple outbreak signals, one for each country or city. With the same id as the news report.

CRITICAL: You MUST extract numerical data from the article CONTENT, not just the title. Look for:
- Case counts: numbers followed by words like "cases", "infected", "sickened", "hospitalized", "affected"
- Deaths/mortality: numbers followed by words like "deaths", "died", "fatalities", "mortality", "killed"
- Extract the actual numbers mentioned in the article content. If no numbers are mentioned, use null.

You are required to match the following fields for each news report:
- id: string - the same id of the news report from the user's input array. This field is required.
- diseases: string[] - the diseases that the news report matches from the "Disease" (first) column of the CSV content above. If the disease mentioned is NOT in the CSV, use "OTHER" but try to identify the actual disease name mentioned. This field is required.
- detected_disease_name: string - OPTIONAL field. If the disease is not in the CSV and you used "OTHER", provide the actual disease name mentioned in the article here (e.g., "Rift Valley Fever"). If the disease is in the CSV, you can omit this field or set it to null.
- disease_type: string - OPTIONAL field. If you can determine the disease type, provide "human", "veterinary", or "zoonotic". If unsure, omit this field and it will be determined from spreadsheet matching. This field is optional.
- country: string - a valid country name from the countries list below. Try to find the most relevant country for the news report. If you cannot determine the country (even from the news provider), you may set this to "null". This field should be a valid country name from the countries list below, or "null" if no country can be determined.
- city: string - the city/state/province of the outbreak, if any. Even if the news report doesn't mention a city, you should try to find the most relevant city for the news report. If you can't find a city, you should set the city to null. This field is optional.
- case_count_mentioned: number - the number of cases mentioned in the news report CONTENT. Extract this from the article body, not just the title. Look for phrases like "X cases", "X people infected", "X hospitalized". If the news report doesn't mention a number of cases, you should set the case_count_mentioned to null. This field is optional.
- mortality_count_mentioned: number - the number of deaths/mortalities mentioned in the news report CONTENT. Extract this from the article body. Look for phrases like "X deaths", "X died", "X fatalities", "X killed". If the news report doesn't mention deaths, you should set the mortality_count_mentioned to null. This field is optional.
- confidence_score: number - the confidence score for the match, between 0 and 1. This field is required.

Countries list:
\`\`\`json
${JSON.stringify(getAllCountryNames())}
\`\`\`

The response should be a valid json array (wrapped in square brackets) of outbreak signals formatted in a long string with "=>" as a separator.

The format should be:
"id => diseases ( | separated) => detected_disease_name => disease_type => country => city => case_count_mentioned => mortality_count_mentioned => confidence_score"

If detected_disease_name is not applicable (disease is in CSV), use "null" for that field.
If disease_type cannot be determined, use "null" for that field (it will be determined from spreadsheet matching).
If case_count_mentioned is not mentioned in the article, use "null" for that field.
If mortality_count_mentioned is not mentioned in the article, use "null" for that field.

Example:
[
"1 => COVID-19 | Influenza => null => human => United States => New York => 100 => 5 => 0.5",
"2 => Rabies => null => zoonotic => United Kingdom => null => null => null => 0.8",
"3 => OTHER => Rift Valley Fever => zoonotic => Senegal => null => 42 => 3 => 0.9",
"4 => OTHER => Goat Plague => veterinary => Uganda => Kikuube District => null => null => 0.7",
"5 => Dengue => null => human => Bangladesh => Dhaka => 310 => 310 => 0.95"
]

`;
};

export async function deepseekMatchArticles(opts: {
  articles: NormalizedArticle[];
}): Promise<NormalizedArticle[]> {
  const { articles } = opts;
  const [humanDiseaseCSV, veterinaryDiseaseCSV] = await Promise.all([
    loadHumanDiseaseCSV(),
    loadVeterinaryDiseaseCSV(),
  ]);

  // Prepare article data with title and content (limit content to 2000 chars to avoid token limits)
  // Strip HTML tags and clean up whitespace for better AI processing
  // Use translated text if available, otherwise use original content
  const articleData = articles.map((a) => {
    // Prefer translated text for AI matching (it's in English)
    let contentPreview = a.translatedText || a.content || "";
    // Remove HTML tags
    contentPreview = contentPreview.replace(/<[^>]*>/g, " ");
    // Replace multiple spaces/newlines with single space
    contentPreview = contentPreview.replace(/\s+/g, " ").trim();
    // Limit to 2000 characters
    contentPreview = contentPreview.substring(0, 2000);
    
    // Include language info if available for context
    const languageInfo = a.language && a.language !== "en" 
      ? ` [Original language: ${a.language}]` 
      : "";
    
    return `${a.id} => Title: ${a.title}${languageInfo} | Content: ${contentPreview || "No content available"}`;
  });

  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: generateSystemPrompt(humanDiseaseCSV, veterinaryDiseaseCSV) },
      {
        role: "user",
        content: JSON.stringify(articleData),
      },
    ],
    model: "deepseek-chat",
    response_format: { type: "json_object" },
  });

  console.log(
    `DEEPSEEK MATCH COMPLETION TOKENS: total=${completion.usage?.total_tokens}, prompt=${completion.usage?.prompt_tokens}, completion=${completion.usage?.completion_tokens}`
  );

  // Log raw AI response for debugging
  const rawResponse = completion.choices[0].message.content || "[]";
  console.log(`AI RAW RESPONSE (first 500 chars): ${rawResponse.substring(0, 500)}`);

  let matches: string[] = [];
  try {
    const parsed = JSON.parse(rawResponse);
    // Handle both array and object responses
    if (Array.isArray(parsed)) {
      matches = parsed;
    } else if (parsed && typeof parsed === "object" && parsed.matches && Array.isArray(parsed.matches)) {
      matches = parsed.matches;
    } else if (parsed && typeof parsed === "object") {
      // Try to find any array property
      const arrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]));
      if (arrayKey) {
        matches = parsed[arrayKey];
      }
    }
  } catch (error) {
    console.error("Error parsing DeepSeek match completion:", error);
  }

  const articleMatches = matches
    .filter((match) => typeof match === "string") // Only process string matches
    .map((match) => {
      const parts = match.split(" => ");
      // Parse fields: id => diseases => detected_disease_name => disease_type => country => city => case_count_mentioned => mortality_count_mentioned => confidence_score
      // Handle different formats for backward compatibility
      const [
        id,
        diseases,
        detected_disease_name,
        disease_type,
        country,
        city,
        case_count_mentioned,
        mortality_count_mentioned,
        confidence_score,
      ] = parts.length === 9 
        ? parts // New format with mortality_count_mentioned
        : parts.length === 8
        ? [...parts.slice(0, 7), null, parts[7]] // Old format without mortality (add null for mortality)
        : parts.length === 7
        ? [parts[0], parts[1], null, null, parts[2], parts[3], parts[4], null, parts[5]] // Very old format
        : [parts[0], parts[1], null, null, parts[2], parts[3], parts[4], null, parts[5]]; // Fallback

      const article = articles.find(
        (a) => id && a.id && a.id.toString() === id.toString()
      );
      if (!article) return null;

      // cleanup diseases array from AI response
      const diseasesArray = (diseases?.split("|") ?? [])
        .map((d) => d.trim())
        .filter(
          (d) =>
            typeof d === "string" &&
            d.trim() !== "" &&
            d !== "null" &&
            d !== "undefined"
        );

      // Normalize "null" string to actual null/undefined
      const normalizedCity = city && city !== "null" && city.trim() !== "" ? city : undefined;
      const normalizedDetectedDisease = detected_disease_name && 
                                        detected_disease_name !== "null" && 
                                        detected_disease_name.trim() !== "" 
                                        ? detected_disease_name.trim() 
                                        : undefined;
      const normalizedDiseaseType = disease_type && 
                                     disease_type !== "null" && 
                                     disease_type.trim() !== "" &&
                                     ["human", "veterinary", "zoonotic"].includes(disease_type.trim().toLowerCase())
                                     ? disease_type.trim().toLowerCase() as "human" | "veterinary" | "zoonotic"
                                     : undefined;

      // Note: The AI can optionally provide disease_type. If provided, it will be used.
      // Otherwise, the spreadsheet matching in storage.ts will determine disease_type
      // based on which spreadsheet the disease is found in.

      // Normalize country - handle "null" strings and empty values
      // Only normalize if country exists and is not "null"
      const normalizedCountry = country && 
                                country !== "null" && 
                                country.trim() !== "" 
                                ? getNormalizedCountryName(country) 
                                : undefined;
      
      return {
        ...article,
        location: normalizedCountry ? {
          country: normalizedCountry,
          city: normalizedCity,
        } : undefined,
        diseases: diseasesArray,
        detected_disease_name: normalizedDetectedDisease,
        disease_type: normalizedDiseaseType,
        case_count_mentioned: case_count_mentioned && case_count_mentioned !== "null"
          ? parseInt(case_count_mentioned)
          : undefined,
        mortality_count_mentioned: mortality_count_mentioned && mortality_count_mentioned !== "null"
          ? parseInt(mortality_count_mentioned)
          : undefined,
        confidence_score: confidence_score ? parseFloat(confidence_score) : 0.5,
      };
    })
    .filter((article) => article !== null)
    .filter((article) => article.diseases && article.diseases.length > 0); // must match at least one disease
    // Note: We no longer filter out articles without countries - they'll be stored but won't create signals

  return articleMatches;
}
