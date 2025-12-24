# Spreadsheet Format Analysis

Based on the user's example, here is the EXACT format required:

## Column Structure (in order):

1. **Category Header**: "Cardiovascular and Metabolic Disorders in the United States (2020)"
   - Format: `{Category} in {Country Full Name} ({Year})`
   - This appears as a section header, not a data column

2. **Condition** - e.g., "Diabetes (Type 2)", "Hypertension"
   - Full condition name, may include type/subtype

3. **Age Group Affected** - e.g., "18–35, 36–60, 60+"
   - Multiple age ranges separated by commas
   - Format: "18–35, 36–60, 60+" or "0–17, 18–35, 36–60"
   - Uses en-dash (–) not hyphen (-)

4. **Prevalence (total cases per 100,000)** - e.g., "~9,800 (34.2M total)"
   - Format: Can include both per-100k and total population
   - May have "~" prefix for estimates
   - May include total in parentheses: "~9,800 (34.2M total)"

5. **Incidence (new cases per year per 100,000)** - e.g., "~640 (new Dx)"
   - Format: Per 100k value
   - May include descriptive text in parentheses

6. **Mortality Rate (%)** - e.g., "Not directly applicable (chronic condition). Annual mortality among diagnosed adults: ~20.3 per 1,000."
   - Format: Can be:
     - A percentage number
     - A descriptive text explaining why not applicable
     - A detailed description with specific rates
   - NOT just a simple number - can be full sentences

7. **Female** - e.g., "~49%"
   - Format: Percentage or rate
   - May include "~" for estimates

8. **Male** - e.g., "~51%"
   - Format: Percentage or rate
   - May include "~" for estimates

9. **All sexes (est. total)** - e.g., "34.2 million (10.5% of pop.)"
   - Format: Can be:
     - Total number with units (million, thousand)
     - Percentage of population
     - Both combined: "34.2 million (10.5% of pop.)"

10. **YLDs (per 100k)** - e.g., "739.1"
    - Format: Numeric value per 100,000
    - Can be null/empty for some conditions

11. **DALYs (per 100k)** - e.g., "2,091.5"
    - Format: Numeric value per 100,000
    - Can be null/empty for some conditions

12. **Year** - e.g., "2020"
    - Format: 4-digit year
    - Should increment: 2020, 2021, 2022, 2023, 2024...

13. **Location (country)** - e.g., "USA"
    - Format: Full country name or code
    - Examples: "USA", "United States", "United Kingdom", "GB"

14. **data source** - e.g., "CDC NIDDK; GBD 2019"
    - Format: Source names separated by semicolons
    - Examples: "CDC NIDDK; GBD 2019", "AHA Heart & Stroke Stats; CDC; GBD 2019"

15. **Risk Factors** - e.g., "Obesity, physical inactivity, poor diet, genetics, hypertension, high cholesterol, age, ethnicity (e.g., African American, Hispanic)"
    - Format: Comma-separated list
    - Can be detailed descriptions
    - AI-generated or from spreadsheet template

16. **Equity(AI generated content)** - e.g., "Higher prevalence and complication rates among Black, Hispanic, and Native American populations linked to systemic inequities in healthcare access, food environments, and socioeconomic factors."
    - Format: Full descriptive text
    - AI-generated qualitative content
    - Describes disparities and equity considerations

17. **Interventions(AI generated content)** - e.g., "Lifestyle modification (diet/exercise), metformin and other glucose-lowering drugs, weight loss surgery, patient education, regular A1c screening for at-risk groups."
    - Format: Comma-separated list or full sentences
    - AI-generated qualitative content
    - Describes evidence-based interventions

## Key Observations:

1. **Age Groups**: Must be stored as comma-separated ranges like "18–35, 36–60, 60+"
   - NOT NULL
   - Uses en-dash (–) character

2. **Mortality Rate**: Can be TEXT, not just a number
   - Examples:
     - "Not directly applicable (chronic condition). Annual mortality among diagnosed adults: ~20.3 per 1,000."
     - "Contributing factor in ~516,000 deaths in 2019."
     - "30-Day Case Fatality Rate: Ischemic ~8%, Hemorrhagic ~40%."

3. **Prevalence/Incidence**: Can include descriptive text in parentheses
   - "~9,800 (34.2M total)"
   - "~640 (new Dx)"
   - "N/A (chronic)"

4. **All sexes value**: Can include both total and percentage
   - "34.2 million (10.5% of pop.)"
   - "116 million adults (47% of adults)"

5. **YLDs/DALYs**: Should always have values when applicable
   - Currently stored as NULL but should have numeric values

6. **Years**: Should increment automatically
   - Same condition structure for 2020, 2021, 2022, 2023, 2024...
   - Each year is a separate row

7. **Data Source**: Multiple sources separated by semicolons
   - "CDC NIDDK; GBD 2019"
   - "AHA Heart & Stroke Stats; CDC; GBD 2019"

8. **AI Content**: Risk Factors, Equity, Interventions are stored separately
   - Currently in `ai_health_enrichment` table
   - Need to be joined with `health_statistics` for display

## Current Database vs Required Format:

| Field | Current | Required |
|-------|---------|----------|
| age_group | NULL | "18–35, 36–60, 60+" |
| mortality_rate | Numeric (150.30) | TEXT ("Not directly applicable...") |
| prevalence_per_100k | Numeric (32000.50) | TEXT ("~9,800 (34.2M total)") |
| incidence_per_100k | Numeric (2500.20) | TEXT ("~640 (new Dx)") |
| all_sexes_value | Numeric (32000.00) | TEXT ("34.2 million (10.5% of pop.)") |
| ylds_per_100k | NULL | Numeric (739.1) |
| dalys_per_100k | NULL | Numeric (2,091.5) |
| female_value | Numeric (31000.00) | TEXT ("~49%") or Numeric |
| male_value | Numeric (33000.00) | TEXT ("~51%") or Numeric |
| risk_factors | NULL (separate table) | TEXT (joined) |
| equity_notes | NULL (separate table) | TEXT (joined) |
| interventions | NULL (separate table) | TEXT (joined) |

## Required Changes:

1. **Database Schema Updates**:
   - Change `mortality_rate` from NUMERIC to TEXT
   - Change `prevalence_per_100k` to TEXT (or add `prevalence_text`)
   - Change `incidence_per_100k` to TEXT (or add `incidence_text`)
   - Change `all_sexes_value` to TEXT (or add `all_sexes_text`)
   - Ensure `age_group` is never NULL
   - Ensure `ylds_per_100k` and `dalys_per_100k` are populated

2. **Collection Function Updates**:
   - AI prompt must generate descriptive mortality rates (not just numbers)
   - AI prompt must generate prevalence/incidence with descriptive text
   - AI prompt must generate all_sexes_value with both total and percentage
   - AI prompt must always generate YLDs and DALYs values
   - Must extract age groups from spreadsheet or generate appropriate ones

3. **Frontend Display**:
   - Join `health_statistics` with `ai_health_enrichment` table
   - Display all fields in the exact spreadsheet format
   - Support multiple years (incrementing)












