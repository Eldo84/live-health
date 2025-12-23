import { serve } from "https://deno.land/std/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js"

function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing env var: ${name}`)
  return value
}

const supabase = createClient(
  requireEnv("SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY")
)

const COUNTRIES = ["USA", "UK", "India", "Nigeria", "Brazil"]
const YEARS = [2020, 2021, 2022, 2023, 2024]

// Authoritative condition → category mapping (no drift)
const CONDITION_CATEGORY_MAP: Record<string, string> = {
  // Sensory Disorders
  "Hearing Loss": "Sensory Disorders",
  "Glaucoma": "Sensory Disorders",
  "Age-related Macular Degeneration (AMD)": "Sensory Disorders",
  "Cataracts": "Sensory Disorders",

  // Infectious & Parasitic Diseases
  "Schistosomiasis": "Infectious & Parasitic Diseases",
  "Chagas Disease": "Infectious & Parasitic Diseases",
  "Lymphatic Filariasis": "Infectious & Parasitic Diseases",
  "Onchocerciasis": "Infectious & Parasitic Diseases",
  "Leishmaniasis": "Infectious & Parasitic Diseases",
  "Soil-transmitted helminths": "Infectious & Parasitic Diseases",

  // Injuries & Trauma
  "Road Traffic Accidents": "Injuries & Trauma",
  "Falls": "Injuries & Trauma",
  "Firearm-related Injuries": "Injuries & Trauma",
  "Burns": "Injuries & Trauma",
  "Drowning": "Injuries & Trauma",
  "Occupational Injuries": "Injuries & Trauma",
  "Natural Disaster-related Injuries": "Injuries & Trauma",

  // Violence & Self-Harm
  "Suicide": "Violence & Self-Harm",
  "Domestic Violence": "Violence & Self-Harm",
  "Child Abuse": "Violence & Self-Harm",
  "Gender-Based Violence (GBV)": "Violence & Self-Harm",

  // Maternal, Neonatal & Child Health
  "Maternal Mortality": "Maternal, Neonatal & Child Health",
  "Postpartum Hemorrhage": "Maternal, Neonatal & Child Health",
  "Preeclampsia / Eclampsia": "Maternal, Neonatal & Child Health",
  "Preterm Birth": "Maternal, Neonatal & Child Health",
  "Neonatal Sepsis": "Maternal, Neonatal & Child Health",
  "Low Birth Weight": "Maternal, Neonatal & Child Health",
  "Congenital Anomalies": "Maternal, Neonatal & Child Health",

  // Environmental & Occupational Health
  "Lead Poisoning": "Environmental & Occupational Health",
  "Heavy Metal Toxicity": "Environmental & Occupational Health",
  "Pesticide-Related Illnesses": "Environmental & Occupational Health",
  "Occupational Lung Diseases": "Environmental & Occupational Health",
  "Heat-Related Illnesses": "Environmental & Occupational Health",
  "Radiation Exposure Disorders": "Environmental & Occupational Health"
}

// Expected rows per category for completeness tracking
const EXPECTED_CONDITIONS_BY_CATEGORY: Record<string, string[]> = {
  "Sensory Disorders": [
    "Hearing Loss",
    "Glaucoma",
    "Age-related Macular Degeneration (AMD)",
    "Cataracts"
  ],
  "Infectious & Parasitic Diseases": [
    "Schistosomiasis",
    "Chagas Disease",
    "Lymphatic Filariasis",
    "Onchocerciasis",
    "Leishmaniasis",
    "Soil-transmitted helminths"
  ],
  "Injuries & Trauma": [
    "Road Traffic Accidents",
    "Falls",
    "Firearm-related Injuries",
    "Burns",
    "Drowning",
    "Occupational Injuries",
    "Natural Disaster-related Injuries"
  ],
  "Violence & Self-Harm": [
    "Suicide",
    "Domestic Violence",
    "Child Abuse",
    "Gender-Based Violence (GBV)"
  ],
  "Maternal, Neonatal & Child Health": [
    "Maternal Mortality",
    "Postpartum Hemorrhage",
    "Preeclampsia / Eclampsia",
    "Preterm Birth",
    "Neonatal Sepsis",
    "Low Birth Weight",
    "Congenital Anomalies"
  ],
  "Environmental & Occupational Health": [
    "Lead Poisoning",
    "Heavy Metal Toxicity",
    "Pesticide-Related Illnesses",
    "Occupational Lung Diseases",
    "Heat-Related Illnesses",
    "Radiation Exposure Disorders"
  ]
}

const CONDITIONS = Object.keys(CONDITION_CATEGORY_MAP)

const REQUIRED_FIELDS = [
  "prevalence_per_100k",
  "incidence_per_100k",
  "mortality_rate",
  "all_sexes_est_total",
  "ylds_per_100k",
  "dalys_per_100k"
]

const FALLBACK_VALUES: Record<string, any> = {
  prevalence_per_100k: 0,
  incidence_per_100k: 0,
  mortality_rate: 0,
  all_sexes_est_total: 0,
  ylds_per_100k: 0,
  dalys_per_100k: 0
}

const SYSTEM_PROMPT = `
You are a public health data synthesis engine.
Return structured epidemiological data only.
No explanations.
No markdown.
No commentary.
Maintain internal consistency.
`

function buildPrompt(
  country: string,
  year: number,
  category: string,
  conditions: string[]
) {
  return `
Generate epidemiological data in JSON ARRAY format.

Country: ${country}
Year: ${year}
Category: ${category}

Conditions:
${conditions.map(c => `- ${c}`).join("\n")}

Rules:
- Use per 100,000 population where applicable
- Imported diseases must reflect immigration-related burden
- DALYs must be consistent with YLDs and mortality
- Equity and interventions must be concise and realistic
- Use CDC, WHO, GBD, NIH, NHTSA where applicable
- Each condition MUST be one of the list above (exact spelling). Do NOT invent new names.
- Categories are pre-defined; do not change them or add new ones.
- Output JSON only.
- Output valid JSON only
`
}

async function alreadySeeded(country: string, year: number) {
  const { data, error } = await supabase
    .from("country_year_seeds")
    .select("is_complete")
    .eq("country", country)
    .eq("year", year)
    .maybeSingle()

  if (error && error.code !== "PGRST116") {
    // PGRST116 = row not found for maybeSingle
    throw error
  }

  return data?.is_complete === true
}

function parseQueryParams(req: Request) {
  const url = new URL(req.url)
  const countryParam = url.searchParams.get("country")
  const yearParam = url.searchParams.get("year")

  const countries = countryParam
    ? countryParam.split(",").map(c => c.trim()).filter(Boolean)
    : null

  const years = yearParam
    ? yearParam
        .split(",")
        .map(y => Number(y.trim()))
        .filter(n => Number.isFinite(n))
    : null

  return { countries, years }
}

async function fetchCountriesFromDb(): Promise<string[]> {
  const { data, error } = await supabase
    .from("countries")
    .select("name")

  if (error) throw error
  const names = (data ?? []).map((row: any) => row.name).filter(Boolean)
  return names.length ? names : COUNTRIES
}

async function generateData(
  country: string,
  year: number,
  category: string,
  conditions: string[]
) {
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${requireEnv("DEEPSEEK_API_KEY")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildPrompt(country, year, category, conditions) }
      ]
    })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`AI request failed (${response.status}): ${text}`)
  }

  const json = await response.json()
  const content = json?.choices?.[0]?.message?.content
  if (!content) throw new Error("AI response missing content")

  let normalized = content.trim()
  if (normalized.startsWith("```")) {
    normalized = normalized.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim()
  }

  try {
    return JSON.parse(normalized)
  } catch (err) {
    throw new Error(`AI response was not valid JSON: ${err}`)
  }
}

function validateRow(row: any) {
  if (!row || typeof row.condition !== "string") {
    throw new Error("Row missing condition")
  }
  const category = CONDITION_CATEGORY_MAP[row.condition]
  if (!category) {
    throw new Error(`Unknown condition: ${row.condition}`)
  }

  for (const key of REQUIRED_FIELDS) {
    if (row[key] === undefined || row[key] === null) {
      console.warn(`Warning: ${key} missing for ${row.condition}, setting fallback`)
      row[key] = FALLBACK_VALUES[key]
    }
  }

  // Optional but if present must be simple (string/number) not objects/arrays
  const optionalStringish = [
    "female_percentage",
    "male_percentage",
    "age_group_affected",
    "data_source",
    "risk_factors",
    "equity",
    "interventions"
  ]

  for (const key of optionalStringish) {
    if (row[key] !== undefined && row[key] !== null) {
      const t = typeof row[key]
      const isOk = t === "string" || t === "number"
      if (!isOk) {
        console.warn(`Warning: invalid ${key} for ${row.condition}, converting to string`)
        row[key] = String(row[key])
      }
    }
  }

  return category
}

async function storeRows(rows: any[]) {
  const { error } = await supabase
    .from("health_data")
    .upsert(rows, { onConflict: "country,year,condition" })
  if (error) throw error
}

function logMissingFields(
  country: string,
  year: number,
  category: string,
  row: any
) {
  const missing = REQUIRED_FIELDS.filter(
    key => row[key] === FALLBACK_VALUES[key]
  )
  if (missing.length > 0) {
    console.warn(
      `Missing fields filled with fallbacks | country=${country} year=${year} category=${category} condition=${row.condition} missing=${missing.join(",")}`
    )
  }
}

serve(async (req: Request) => {
  const seedSecret = Deno.env.get("SEED_SECRET")
  if (seedSecret && req.headers.get("x-seed-secret") !== seedSecret) {
    return new Response("Unauthorized", { status: 401 })
  }

  const results: string[] = []

  try {
    const { countries: paramCountries, years: paramYears } = parseQueryParams(req)
    const countries = paramCountries ?? await fetchCountriesFromDb()
    const years = paramYears ?? YEARS

    for (const country of countries) {
      for (const year of years) {
        try {
          const exists = await alreadySeeded(country, year)
          if (exists) {
            results.push(`${country} ${year}: skipped`)
            continue
          }

          const expectedRows = Object.values(EXPECTED_CONDITIONS_BY_CATEGORY)
            .reduce((sum, arr) => sum + arr.length, 0)

          await supabase
            .from("country_year_seeds")
            .upsert(
              { country, year, expected_rows: expectedRows },
              { onConflict: "country,year" }
            )

          for (const [category, conditions] of Object.entries(
            EXPECTED_CONDITIONS_BY_CATEGORY
          )) {
            const data = await generateData(
              country,
              year,
              category,
              conditions
            )

            const formatted = data.map((row: any) => {
              if (!conditions.includes(row.condition)) {
                throw new Error(
                  `Condition ${row.condition} does not belong to category ${category}`
                )
              }

              const validatedCategory = validateRow(row)
              logMissingFields(country, year, category, row)
              return {
                country,
                year,
                category: validatedCategory,
                condition: row.condition,
                age_group_affected: row.age_group_affected,
                prevalence_per_100k: row.prevalence_per_100k,
                incidence_per_100k: row.incidence_per_100k,
                mortality_rate: row.mortality_rate,
                female_percentage: row.female_percentage,
                male_percentage: row.male_percentage,
                all_sexes_est_total: row.all_sexes_est_total,
                ylds_per_100k: row.ylds_per_100k,
                dalys_per_100k: row.dalys_per_100k,
                data_source: row.data_source,
                risk_factors: row.risk_factors,
                equity: row.equity,
                interventions: row.interventions
              }
            })

            await storeRows(formatted)

            await supabase.rpc("increment_seed_progress", {
              p_country: country,
              p_year: year,
              p_rows_added: formatted.length
            })
          }

          results.push(`${country} ${year}: stored`)
        } catch (err) {
          results.push(`${country} ${year}: failed (${err instanceof Error ? err.message : String(err)})`)
        }
      }
    }
  } catch (err) {
    results.push(`global: failed (${err instanceof Error ? err.message : String(err)})`)
  }

  return new Response(
    JSON.stringify({ status: "done", results }),
    { headers: { "Content-Type": "application/json" } }
  )
})
