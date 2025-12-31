# 🌍 Comprehensive Multi-Country, Multi-Year Data Collection Plan

## 🎯 **Objective**

Generate and store comprehensive epidemiological data for:
- **100+ health conditions** (from spreadsheet structure)
- **200+ countries** (global coverage)
- **5 years** (2020, 2021, 2022, 2023, 2024)
- **Total: ~100,000+ records** with full metrics

---

## 📊 **Data Requirements**

### **For Each Record:**
- Condition name
- Category
- Country
- Year (2020-2024)
- Age group affected
- Prevalence (per 100,000)
- Incidence (per 100,000)
- Mortality rate (%)
- Female rate
- Male rate
- All sexes rate
- YLDs (per 100,000)
- DALYs (per 100,000)
- Risk factors (array)
- Equity score (0-100)
- Intervention score (0-100)
- Data source attribution

### **Scale Calculation:**
```
100 conditions × 200 countries × 5 years = 100,000 base records
+ Age group variations = ~200,000 total records
+ Each with 15+ metrics = ~3,000,000 data points
```

---

## 🏗️ **System Architecture**

### **Phase 1: Spreadsheet Structure Extraction**
**Goal**: Extract template to guide data generation

**Process**:
1. Read Google Sheets CSV for each tab
2. Extract condition names by category
3. Extract age groups per condition
4. Extract existing risk factors
5. Create structured seed data for DeepSeek

**Output**: 
```json
{
  "conditions": [
    {
      "name": "Diabetes (Type 2)",
      "category": "Cardiovascular and Metabolic Disorders",
      "ageGroups": ["18–35", "36–60", "60+"],
      "riskFactors": ["Obesity", "Physical inactivity", "Poor diet", ...]
    }
  ]
}
```

---

### **Phase 2: Multi-Country, Multi-Year Data Generation**

#### **2.1 Country List**
**Priority Countries (24)** - Generate first:
- United States, China, India, Germany, United Kingdom, France
- Japan, Brazil, Canada, Russia, Australia, South Korea
- Italy, Spain, Mexico, Indonesia, Netherlands, Switzerland
- Saudi Arabia, Turkey, Poland, Sweden, Belgium, Norway

**Extended Countries (176+)** - Generate in batches:
- All UN member states
- Major territories and dependencies
- Regional groupings for efficiency

#### **2.2 Year Coverage**
- **2020**: COVID-19 impact year
- **2021**: Post-pandemic recovery
- **2022**: Recent data
- **2023**: Latest available
- **2024**: Current year (projections if needed)

#### **2.3 Generation Strategy**

**Option A: Condition-First Approach** (Recommended)
```
For each condition:
  For each country:
    For each year (2020-2024):
      Generate comprehensive data
      Store in database
```

**Option B: Country-First Approach**
```
For each country:
  For each condition:
    For each year (2020-2024):
      Generate comprehensive data
      Store in database
```

**Option C: Year-First Approach**
```
For each year:
  For each condition:
    For each country:
      Generate comprehensive data
      Store in database
```

**Recommended: Option A (Condition-First)**
- Better for DeepSeek prompts (condition-specific context)
- Easier to track progress per condition
- Better error recovery (can retry specific conditions)

---

## 🤖 **DeepSeek AI Integration**

### **Enhanced Prompt Structure**

```typescript
const prompt = `
As an expert epidemiologist with access to the latest global health data, 
provide comprehensive epidemiological data for:

CONDITION: ${conditionName}
CATEGORY: ${category}
COUNTRY: ${country}
YEAR: ${year}
AGE GROUPS: ${ageGroups.join(', ')}
KNOWN RISK FACTORS: ${riskFactors.join(', ')}

Please provide age-standardized rates per 100,000 population for:

1. PREVALENCE: Total cases per 100,000
2. INCIDENCE: New cases per year per 100,000
3. MORTALITY RATE: Deaths per 100,000 (or percentage)
4. SEX-SPECIFIC RATES:
   - Female rate per 100,000
   - Male rate per 100,000
   - All sexes rate per 100,000
5. DISABILITY METRICS:
   - YLDs (Years Lived with Disability per 100,000)
   - DALYs (Disability-Adjusted Life Years per 100,000)
6. AI ANALYSIS:
   - Equity Score (0-100): Healthcare access and socioeconomic equity
   - Intervention Score (0-100): Treatment availability and feasibility

Base your estimates on:
- IHME Global Burden of Disease Study ${year}
- WHO Global Health Observatory
- National health surveillance systems
- Peer-reviewed epidemiological studies

Format as JSON:
{
  "prevalence": 1234.56,
  "incidence": 567.89,
  "mortalityRate": 89.12,
  "femaleRate": 1200.00,
  "maleRate": 1269.12,
  "allSexesRate": 1234.56,
  "ylds": 345.67,
  "dalys": 2345.67,
  "equityScore": 72,
  "interventionScore": 85,
  "dataSource": "IHME GBD ${year}, WHO GHO"
}
`;
```

---

## 💾 **Database Storage Strategy**

### **Table Structure** (Already Created)
```sql
health_conditions (
  condition_name,
  category,
  country,
  year,
  age_group_affected,
  prevalence_per_100k,
  incidence_per_100k,
  mortality_rate_percent,
  female_rate,
  male_rate,
  all_sexes_rate,
  ylds_per_100k,
  dalys_per_100k,
  risk_factors[],
  equity_score,
  intervention_score,
  data_source,
  created_at,
  updated_at
)
```

### **Unique Constraint**
```sql
UNIQUE(condition_name, category, country, year, age_group_affected)
```

### **Indexes for Performance**
- `(country, year, category)` - For dashboard filtering
- `(condition_name, country, year)` - For condition-specific queries
- `(category, year)` - For category aggregations

---

## ⚡ **Processing Strategy**

### **Batch Processing**

**Batch Size**: 50 records per batch
**Rate Limiting**: 2 seconds between API calls
**Parallel Processing**: 3 concurrent requests (to avoid rate limits)

**Estimated Time**:
```
100,000 records × 2 seconds = 200,000 seconds
= ~55 hours of processing time
With 3 parallel: ~18 hours
With overnight runs: 2-3 days total
```

### **Progress Tracking**

**Sync Log Table**:
```sql
data_sync_log (
  sync_type: 'full' | 'incremental' | 'country' | 'year',
  target_country: string,
  target_year: integer,
  records_processed: integer,
  records_updated: integer,
  records_failed: integer,
  started_at: timestamp,
  completed_at: timestamp,
  status: 'running' | 'completed' | 'failed'
)
```

### **Incremental Updates**

**Strategy**:
1. Check existing records before generation
2. Skip if data already exists and is recent
3. Only generate missing combinations
4. Update if newer data available

**Query**:
```sql
SELECT condition_name, country, year 
FROM health_conditions 
WHERE country = ? AND year = ?
```

---

## 🔄 **Workflow Implementation**

### **Step 1: Extract Spreadsheet Structure**
```typescript
// Read Google Sheets
const conditions = await extractConditionsFromSpreadsheet();
// Returns: Array of {name, category, ageGroups, riskFactors}
```

### **Step 2: Generate Data in Batches**
```typescript
// Process in batches
for (const condition of conditions) {
  for (const country of countries) {
    for (const year of [2020, 2021, 2022, 2023, 2024]) {
      // Check if exists
      const exists = await checkExisting(condition, country, year);
      if (exists && !forceRegenerate) continue;
      
      // Generate with DeepSeek
      const data = await generateWithDeepSeek(condition, country, year);
      
      // Validate
      const validated = validateData(data);
      
      // Store
      await storeInDatabase(validated);
      
      // Rate limiting
      await sleep(2000);
    }
  }
}
```

### **Step 3: Generate Aggregates**
```typescript
// After all data is stored, generate aggregates
await updateHealthAggregates();
// Creates category totals, country totals, top conditions, etc.
```

---

## 📈 **Cost Estimation**

### **DeepSeek API Costs**
- **Price**: ~$0.14 per 1M input tokens, $0.28 per 1M output tokens
- **Average prompt**: ~500 tokens
- **Average response**: ~1000 tokens
- **Cost per record**: ~$0.0004
- **Total records**: 100,000
- **Total cost**: ~$40-50

### **Processing Time**
- **Sequential**: ~55 hours
- **With 3 parallel**: ~18 hours
- **With overnight runs**: 2-3 days

---

## 🛡️ **Error Handling & Recovery**

### **Retry Strategy**
- **Max retries**: 3 attempts per record
- **Backoff**: Exponential (2s, 4s, 8s)
- **Skip on failure**: Log and continue

### **Validation Rules**
```typescript
function validateData(data) {
  // Prevalence should be > 0
  if (data.prevalence <= 0) throw new Error('Invalid prevalence');
  
  // Incidence should be <= Prevalence
  if (data.incidence > data.prevalence) throw new Error('Incidence > Prevalence');
  
  // Mortality should be reasonable
  if (data.mortalityRate > 100) throw new Error('Mortality > 100%');
  
  // DALYs should be > YLDs
  if (data.dalys < data.ylds) throw new Error('DALYs < YLDs');
  
  // Scores should be 0-100
  if (data.equityScore < 0 || data.equityScore > 100) throw new Error('Invalid equity score');
  if (data.interventionScore < 0 || data.interventionScore > 100) throw new Error('Invalid intervention score');
  
  return data;
}
```

### **Failed Records Logging**
```sql
CREATE TABLE data_generation_errors (
  id uuid PRIMARY KEY,
  condition_name text,
  country text,
  year integer,
  error_message text,
  retry_count integer,
  created_at timestamptz
);
```

---

## 🚀 **Implementation Phases**

### **Phase 1: Setup & Testing** (Day 1)
- ✅ Database schema (already done)
- ✅ Edge Function structure (already done)
- 🔄 Test with 1 condition × 5 countries × 5 years (25 records)
- 🔄 Validate data quality
- 🔄 Test dashboard integration

### **Phase 2: Priority Countries** (Day 2-3)
- Generate data for 24 priority countries
- 100 conditions × 24 countries × 5 years = 12,000 records
- Monitor costs and performance
- Fix any issues

### **Phase 3: Extended Countries** (Day 4-7)
- Generate data for remaining 176+ countries
- Process in batches of 20 countries
- Continue monitoring and optimization

### **Phase 4: Aggregation & Dashboard** (Day 8)
- Generate aggregate tables
- Update dashboard to use real data
- Add country/year filtering
- Test all visualizations

### **Phase 5: Production & Monitoring** (Day 9-10)
- Deploy to production
- Set up automated updates (monthly/quarterly)
- Monitor data quality
- User acceptance testing

---

## 📊 **Dashboard Updates Required**

### **New Filtering Capabilities**
1. **Country Selector**: Dropdown with 200+ countries
2. **Year Range Selector**: 2020-2024 (multi-select)
3. **Category Filter**: All 9 categories
4. **Condition Search**: Search by condition name

### **New Visualizations**
1. **Time Series Charts**: Show trends 2020-2024
2. **Country Comparison**: Side-by-side country metrics
3. **Equity vs Intervention**: Bubble chart with scores
4. **Risk Factor Networks**: Interactive network graphs
5. **Geographic Heatmaps**: Country-level disease burden

### **Export Features**
1. **Country Reports**: PDF export per country
2. **CSV Export**: Full dataset or filtered
3. **Chart Exports**: PNG/PDF of visualizations

---

## ✅ **Success Criteria**

1. **Data Coverage**:
   - ✅ 100+ conditions
   - ✅ 200+ countries
   - ✅ 5 years (2020-2024)
   - ✅ All metrics populated

2. **Data Quality**:
   - ✅ All records pass validation
   - ✅ Cross-country consistency
   - ✅ Year-over-year trends make sense
   - ✅ Risk factors properly attributed

3. **Performance**:
   - ✅ Dashboard loads in < 3 seconds
   - ✅ Filters work smoothly
   - ✅ Charts render quickly
   - ✅ Exports complete successfully

4. **User Experience**:
   - ✅ Country selection works
   - ✅ Year filtering works
   - ✅ All visualizations display correctly
   - ✅ Data source attribution visible

---

## 🎯 **Next Steps**

1. **Update DeepSeek Function**: Enhance to handle multi-country, multi-year generation
2. **Create Batch Processor**: Handle large-scale data generation
3. **Test with Small Sample**: 1 condition × 5 countries × 5 years
4. **Scale Up**: Process all conditions and countries
5. **Update Dashboard**: Connect to real data
6. **Deploy & Monitor**: Production launch

---

## 📝 **Notes**

- **Data Freshness**: Plan for quarterly updates to keep data current
- **Cost Management**: Monitor API usage and optimize prompts
- **Quality Assurance**: Regular validation and cross-checks
- **Scalability**: Design for future years and conditions
- **Documentation**: Maintain clear data source attribution

This plan will transform your dashboard into a comprehensive, research-grade global health analytics platform! 🌍📊




























