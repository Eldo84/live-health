# Output Data Format

This document shows exactly what the output data will look like at each stage of the process.

## Stage 1: AI Response (Markdown Table)

The AI returns data as a markdown table like this:

```markdown
| Condition | Age Group Affected | Prevalence (total cases per 100,000) | Incidence (new cases per year per 100,000) | Mortality Rate (%) | Female (%) | Male (%) | All sexes (estimated total cases) | YLDs (per 100,000) | DALYs (per 100,000) | Year | Location (country) | Data source | Risk Factors | Equity (AI-generated) | Interventions (AI-generated) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Diabetes (Type 2) | 18–35, 36–60, 60+ | 9,800 | 640 | 20.3 | 49 | 51 | 34.2 million (10.5% of pop.) | 739.1 | 2,091.5 | 2020 | United States | AI-modeled (DeepSeek, literature-informed estimates) | Obesity, physical inactivity, poor diet, genetics, hypertension, high cholesterol, age, ethnicity | Higher prevalence in African American and Hispanic populations due to socioeconomic factors, limited access to preventive care, and genetic predisposition. Rural areas show lower screening rates. | Comprehensive diabetes prevention programs, community health worker interventions, improved access to affordable healthy foods, regular screening in high-risk populations, culturally tailored education programs |
| Hypertension | 18–35, 36–60, 60+ | 47,300 | N/A | 12.5 | 45 | 55 | 116 million adults (47% of adults) | 119.3 | 952.9 | 2020 | United States | AI-modeled (DeepSeek, literature-informed estimates) | Age, family history, obesity, physical inactivity, high salt intake, excessive alcohol consumption, smoking, stress | Disparities exist across racial and ethnic groups, with higher rates in African American populations. Lower-income communities have reduced access to monitoring and treatment. | Population-wide salt reduction initiatives, regular blood pressure screening, lifestyle modification programs, improved access to antihypertensive medications, workplace wellness programs |
```

## Stage 2: Parsed Structured Data

The markdown table gets parsed into JavaScript objects:

```javascript
[
  {
    condition: "Diabetes (Type 2)",
    age_group: "18–35, 36–60, 60+",
    prevalence_per_100k: 9800.0,
    incidence_per_100k: 640.0,
    mortality_rate: 20.3,
    female: 49.0,
    male: 51.0,
    all_sexes: 34200000,  // Parsed from "34.2 million"
    ylds: 739.1,
    dalys: 2091.5,
    year: 2020,
    location: "United States",
    data_source: "AI-modeled (DeepSeek, literature-informed estimates)",
    risk_factors: "Obesity, physical inactivity, poor diet, genetics, hypertension, high cholesterol, age, ethnicity",
    equity: "Higher prevalence in African American and Hispanic populations due to socioeconomic factors, limited access to preventive care, and genetic predisposition. Rural areas show lower screening rates.",
    interventions: "Comprehensive diabetes prevention programs, community health worker interventions, improved access to affordable healthy foods, regular screening in high-risk populations, culturally tailored education programs"
  },
  {
    condition: "Hypertension",
    age_group: "18–35, 36–60, 60+",
    prevalence_per_100k: 47300.0,
    incidence_per_100k: null,  // N/A for chronic conditions
    mortality_rate: 12.5,
    female: 45.0,
    male: 55.0,
    all_sexes: 116000000,  // Parsed from "116 million"
    ylds: 119.3,
    dalys: 952.9,
    year: 2020,
    location: "United States",
    data_source: "AI-modeled (DeepSeek, literature-informed estimates)",
    risk_factors: "Age, family history, obesity, physical inactivity, high salt intake, excessive alcohol consumption, smoking, stress",
    equity: "Disparities exist across racial and ethnic groups, with higher rates in African American populations. Lower-income communities have reduced access to monitoring and treatment.",
    interventions: "Population-wide salt reduction initiatives, regular blood pressure screening, lifestyle modification programs, improved access to antihypertensive medications, workplace wellness programs"
  }
]
```

## Stage 3: Database Storage

### Table: `health_statistics`

Each condition gets stored as a row with these fields:

```sql
INSERT INTO health_statistics (
  country_code,      -- 'US'
  year,              -- 2020
  category,          -- 'Cardiovascular and Metabolic Disorders'
  condition,         -- 'Diabetes (Type 2)'
  age_group,         -- '18–35, 36–60, 60+'
  location_name,     -- 'United States'
  data_source,       -- 'AI-modeled (DeepSeek, literature-informed estimates)'
  
  -- Numeric fields (for calculations)
  prevalence_per_100k,    -- 9800.0
  incidence_per_100k,      -- 640.0
  mortality_rate,          -- 20.3
  female_value,            -- 49.0
  male_value,              -- 51.0
  all_sexes_value,        -- 34200000.0
  ylds_per_100k,          -- 739.1
  dalys_per_100k          -- 2091.5
) VALUES (...);
```

**Example Query Result:**

```json
{
  "id": "uuid-here",
  "country_code": "US",
  "year": 2020,
  "category": "Cardiovascular and Metabolic Disorders",
  "condition": "Diabetes (Type 2)",
  "age_group": "18–35, 36–60, 60+",
  "location_name": "United States",
  "prevalence_per_100k": 9800.0,
  "incidence_per_100k": 640.0,
  "mortality_rate": 20.3,
  "female_value": 49.0,
  "male_value": 51.0,
  "all_sexes_value": 34200000.0,
  "ylds_per_100k": 739.1,
  "dalys_per_100k": 2091.5,
  "data_source": "AI-modeled (DeepSeek, literature-informed estimates)",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### Table: `ai_health_enrichment`

Qualitative AI-generated content stored separately:

```sql
INSERT INTO ai_health_enrichment (
  country_code,      -- 'US'
  year,              -- 2020
  condition,         -- 'Diabetes (Type 2)'
  age_group,         -- '18–35, 36–60, 60+'
  risk_factors,      -- 'Obesity, physical inactivity, poor diet...'
  equity_notes,      -- 'Higher prevalence in African American...'
  interventions,     -- 'Comprehensive diabetes prevention programs...'
  model_used,        -- 'deepseek-chat'
  prompt_version     -- '2.0'
) VALUES (...);
```

**Example Query Result:**

```json
{
  "id": "uuid-here",
  "country_code": "US",
  "year": 2020,
  "condition": "Diabetes (Type 2)",
  "age_group": "18–35, 36–60, 60+",
  "risk_factors": "Obesity, physical inactivity, poor diet, genetics, hypertension, high cholesterol, age, ethnicity",
  "equity_notes": "Higher prevalence in African American and Hispanic populations due to socioeconomic factors, limited access to preventive care, and genetic predisposition. Rural areas show lower screening rates.",
  "interventions": "Comprehensive diabetes prevention programs, community health worker interventions, improved access to affordable healthy foods, regular screening in high-risk populations, culturally tailored education programs",
  "model_used": "deepseek-chat",
  "prompt_version": "2.0",
  "generated_at": "2024-01-15T10:30:00Z"
}
```

## Stage 4: API Response Format

When you query the function, you get a summary response:

```json
{
  "success": true,
  "message": "Generated health data for 5 countries, years 2020-2024",
  "results": {
    "totalProcessed": 1500,
    "totalStored": 1450,
    "totalErrors": 50,
    "totalBatches": 150,
    "byCountry": {
      "US": {
        "processed": 300,
        "stored": 290,
        "errors": 10,
        "batches": 30,
        "byYear": {
          "2020": {
            "processed": 60,
            "stored": 58,
            "errors": 2,
            "batches": 6,
            "byCategory": {
              "Cardiovascular and Metabolic Disorders": {
                "stored": 7,
                "errors": 0,
                "batches": 1
              },
              "Cancers": {
                "stored": 8,
                "errors": 0,
                "batches": 1
              }
            }
          }
        }
      }
    },
    "byYear": {
      "2020": {
        "processed": 300,
        "stored": 290,
        "errors": 10,
        "batches": 30
      }
    }
  }
}
```

## Stage 5: Querying the Data

After generation, you can query the data like this:

### Get all conditions for a country/year:

```sql
SELECT 
  condition,
  category,
  prevalence_per_100k,
  incidence_per_100k,
  mortality_rate,
  ylds_per_100k,
  dalys_per_100k
FROM health_statistics
WHERE country_code = 'US'
  AND year = 2020
ORDER BY dalys_per_100k DESC;
```

### Join with enrichment data:

```sql
SELECT 
  hs.condition,
  hs.category,
  hs.prevalence_per_100k,
  hs.dalys_per_100k,
  ahe.risk_factors,
  ahe.equity_notes,
  ahe.interventions
FROM health_statistics hs
LEFT JOIN ai_health_enrichment ahe
  ON hs.country_code = ahe.country_code
  AND hs.year = ahe.year
  AND hs.condition = ahe.condition
WHERE hs.country_code = 'US'
  AND hs.year = 2020
  AND hs.category = 'Cardiovascular and Metabolic Disorders';
```

### Example Result (Joined):

```json
{
  "condition": "Diabetes (Type 2)",
  "category": "Cardiovascular and Metabolic Disorders",
  "prevalence_per_100k": 9800.0,
  "dalys_per_100k": 2091.5,
  "risk_factors": "Obesity, physical inactivity, poor diet, genetics, hypertension, high cholesterol, age, ethnicity",
  "equity_notes": "Higher prevalence in African American and Hispanic populations due to socioeconomic factors, limited access to preventive care, and genetic predisposition. Rural areas show lower screening rates.",
  "interventions": "Comprehensive diabetes prevention programs, community health worker interventions, improved access to affordable healthy foods, regular screening in high-risk populations, culturally tailored education programs"
}
```

## Data Validation Rules

Before storing, the data is validated:

1. **DALYs >= YLDs**: If DALYs < YLDs, DALYs is adjusted to equal YLDs
2. **Sex percentages sum to ~100%**: If female + male doesn't sum to 100%, values are normalized
3. **Required fields**: Condition name must be present
4. **Numeric parsing**: Handles commas, "N/A", and various formats

## Notes

- **Numeric values** are stored as `DECIMAL(10,2)` for precision
- **Text fields** (equity, interventions) are stored as `TEXT` with no length limit
- **Age groups** are stored as comma-separated strings (e.g., "18–35, 36–60, 60+")
- **Data source** always includes "AI-modeled" to indicate these are estimates
- **Timestamps** track when data was created/updated












