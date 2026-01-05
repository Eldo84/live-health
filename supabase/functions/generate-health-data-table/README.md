# Generate Health Data Table Function

This Edge Function generates comprehensive health statistics data using AI (DeepSeek) based on the provided prompt template structure.

## Features

- **Dynamic Countries**: Supports any number of countries (defaults to 5: US, GB, CA, AU, DE)
- **Dynamic Years**: Supports year ranges starting from 2020 (configurable)
- **Comprehensive Categories**: Covers all major health condition categories:
  - Cardiovascular and Metabolic Disorders
  - Cancers
  - Respiratory Diseases
  - Neurological Disorders
  - Musculoskeletal Disorders
  - Mental and Behavioral Disorders
  - Endocrine and Hematologic Disorders
  - High-Burden Infectious Diseases
  - Neglected Tropical Diseases
  - Injuries & Trauma
  - Violence & Self-Harm
  - Maternal, Neonatal, and Child Health
  - Environmental & Occupational Health
  - Sensory Disorders

## Usage

### Basic Usage (5 countries, 2020-2024)

```bash
curl -X POST https://your-project.supabase.co/functions/v1/generate-health-data-table \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Custom Countries and Years

```bash
curl -X POST https://your-project.supabase.co/functions/v1/generate-health-data-table \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "countries": ["US", "GB", "FR", "IT", "ES"],
    "startYear": 2020,
    "endYear": 2023,
    "forceRegenerate": false,
    "skipExisting": true
  }'
```

### Parameters

- `countries` (array, optional): Array of country codes (ISO alpha-2). Default: `["US", "GB", "CA", "AU", "DE"]`
- `startYear` (number, optional): Starting year for data generation. Default: `2020`
- `endYear` (number, optional): Ending year for data generation. Default: current year
- `forceRegenerate` (boolean, optional): Force regeneration even if data exists. Default: `false`
- `skipExisting` (boolean, optional): Skip existing data. Default: `true`

## Response Format

```json
{
  "success": true,
  "message": "Generated health data for 5 countries, years 2020-2024",
  "results": {
    "totalProcessed": 1500,
    "totalStored": 1450,
    "totalErrors": 50,
    "byCountry": {
      "US": {
        "processed": 300,
        "stored": 290,
        "errors": 10,
        "byYear": { ... }
      }
    },
    "byYear": {
      "2020": {
        "processed": 300,
        "stored": 290,
        "errors": 10
      }
    }
  }
}
```

## Data Storage

The function stores data in two tables:

1. **health_statistics**: Numeric health data
   - Prevalence, incidence, mortality rates
   - Sex-specific values
   - YLDs and DALYs
   - Country, year, category, condition, age group

2. **ai_health_enrichment**: AI-generated qualitative content
   - Risk factors
   - Equity considerations
   - Interventions

## Rate Limiting

The function includes a 2-second delay between API calls to respect rate limits and ensure reliable data generation.

## Error Handling

- Retries failed API calls up to 3 times with exponential backoff
- Continues processing even if individual records fail
- Provides detailed error reporting in the response

## Notes

- Uses DeepSeek AI API (requires `DEEPSEEK_API_KEY` environment variable)
- Data is generated based on epidemiological patterns and known health statistics
- All rates are age-standardized per 100,000 population
- Data source is marked as "AI-generated (DeepSeek)" when using AI fallback





























