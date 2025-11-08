import { OpenAI } from "npm:openai@6";
import type { NormalizedArticle } from "./types.ts";
import { getAllCountryNames, getNormalizedCountryName } from "./countries.ts";
import { loadHumanDiseaseCSV } from "./spreadsheet.ts";

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: Deno.env.get("DEEPSEEK_API_KEY"),
});

const generateSystemPrompt = (humanDiseaseCSV: string) => {
  return `
You are a helpful assistant whose role is to classify human disease outbreak news reports into outbreak signals
using the data provided in the CSV content below. The CSV content contains diseases and their properties (including alternative keywords that can indicate the disease).

The CSV contains the following columns in order:
- Disease: the name of a disease
- Pathogen: the pathogen of the disease
- Outbreak Category: the category of the disease
- PathogenType: the type of the pathogen
- Keywords: the keywords that can indicate the disease

\`\`\`csv
${humanDiseaseCSV}
\`\`\`

The CSV is not perfectly formatted, so ignore anything that is does not fit the format above.

The user will provide a json array of news report titles and their ids (eg. "1 => New York Times: COVID-19 outbreak in New York"), which you need to classify into outbreak signals.
Outbreak signals are signals that indicate a new outbreak of a disease in a specific country and/or city.
Each news report should be classified into one or more outbreak signals, depending on the locations mentioned in the news report.

News reports that are not related health-related, should be ignored.
You should however try to find the most relevant disease for the news report matching the diseases (Disease column) in the CSV.
If the news report mentions a disease that is not in the CSV, you should ignore it.
If a news report mentions mulitple countries or cities, you should create multiple outbreak signals, one for each country or city. With the same id as the news report.

You are required to match the following fields for each news report:
- id: string - the same id of the news report from the user's input array. This field is required.
- diseases: string[] - the diseases that the news report matches from the "Disease" (first) column of the CSV content above. This field is required and must be an array of valid disease names from the matching record in the CSV. This is very important, as we'll assume the diseases are the same as the diseases in the first column of the CSV.
- country: string - a valid country name from the countries list below. Even if the news report doesn't mention a country, you should try to find the most relevant country for the news report. As a last resort, you can determine the country from the news provider, or your best guess is also fine. This field is required, cannot be null, and must be a valid country name from the countries list below.
- city: string - the city/state/province of the outbreak, if any. Even if the news report doesn't mention a city, you should try to find the most relevant city for the news report. If you can't find a city, you should set the city to null. This field is optional.
- case_count_mentioned: number - the number of cases mentioned in the news report. If the news report doesn't mention a number of cases, you should set the case_count_mentioned to null. This field is optional.
- confidence_score: number - the confidence score for the match, between 0 and 1. This field is required.

Countries list:
\`\`\`json
${JSON.stringify(getAllCountryNames())}
\`\`\`

The response should be a valid json array (wrapped in square brackets) of outbreak signals formatted in a long string with "=>" as a separator.

The format should be:
"id => diseases ( | separated) => country => city => case_count_mentioned => confidence_score"

Example:
[
"1 => COVID-19 | Influenza => United States => New York => 100 => 0.5",
"2 => Rabies => United Kingdom => null => null => 0.8"
]

`;
};

export async function deepseekMatchArticles(opts: {
  articles: NormalizedArticle[];
}): Promise<NormalizedArticle[]> {
  const { articles } = opts;
  const humanDiseaseCSV = await loadHumanDiseaseCSV();

  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: generateSystemPrompt(humanDiseaseCSV) },
      {
        role: "user",
        content: JSON.stringify(articles.map((a) => `${a.id} => ${a.title}`)),
      },
    ],
    model: "deepseek-chat",
    response_format: { type: "json_object" },
  });

  console.log(
    `DEEPSEEK MATCH COMPLETION TOKENS: total=${completion.usage?.total_tokens}, prompt=${completion.usage?.prompt_tokens}, completion=${completion.usage?.completion_tokens}`
  );

  let matches: string[] = [];
  try {
    matches = JSON.parse(completion.choices[0].message.content || "[]");
  } catch (error) {
    console.error("Error parsing DeepSeek match completion:", error);
  }

  const articleMatches = matches
    .map((match) => {
      const [
        id,
        diseases,
        country,
        city,
        case_count_mentioned,
        confidence_score,
      ] = match.split(" => ");

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

      return {
        ...article,
        location: {
          country: getNormalizedCountryName(country ?? ""),
          city: city ?? undefined,
        },
        diseases: diseasesArray,
        case_count_mentioned: case_count_mentioned
          ? parseInt(case_count_mentioned)
          : undefined,
        confidence_score: confidence_score ? parseFloat(confidence_score) : 0.5,
      };
    })
    .filter((article) => article !== null)
    .filter((article) => article.diseases && article.diseases.length > 0) // must match at least one disease
    .filter((article) => article.location?.country); // must match a country

  return articleMatches;
}
