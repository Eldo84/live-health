# Spreadsheet Data Integration Guide

## Overview

This guide explains how to import and use data from the Google Spreadsheet disease database in your Live Health monitoring system.

**Spreadsheet URL**: https://docs.google.com/spreadsheets/d/1HU-AANvAkXXLqga2rsSMyy5Hhn3_uJ2ewVZ1UrNbC30/edit

---

## Spreadsheet Structure

The spreadsheet contains comprehensive disease data with the following columns:

| Column | Description | Example |
|--------|-------------|---------|
| **Disease** | Disease name or clinical manifestation | "Malaria", "Hepatitis A" |
| **Pathogen** | Causative microorganism | "Plasmodium spp.", "Hepatitis A virus (HAV)" |
| **Outbreak Category** | Transmission method | "Vector-Borne Outbreaks", "Foodborne Outbreaks" |
| **Pathogen Type** | Biological classification | "Bacteria", "Virus", "Parasite" |
| **Keywords** | Search/reference terms | "Malaria", "Hepatitis A" |

---

## Database Schema Extensions

### New Tables Created

#### 1. `pathogens`
Stores causative microorganisms
```sql
- id (uuid, primary key)
- name (text, unique) - Pathogen name
- type (text) - Bacteria, Virus, Fungus, Parasite, etc.
- description (text)
- created_at (timestamptz)
```

#### 2. `outbreak_categories`
Categorizes diseases by transmission method
```sql
- id (uuid, primary key)
- name (text, unique) - Category name
- description (text)
- icon (text) - UI icon identifier
- color (text) - Hex color code
- created_at (timestamptz)
```

#### 3. `disease_pathogens`
Links diseases to pathogens (many-to-many)
```sql
- id (uuid, primary key)
- disease_id (uuid, foreign key)
- pathogen_id (uuid, foreign key)
- is_primary (boolean)
- created_at (timestamptz)
```

#### 4. `disease_categories`
Links diseases to outbreak categories (many-to-many)
```sql
- id (uuid, primary key)
- disease_id (uuid, foreign key)
- category_id (uuid, foreign key)
- created_at (timestamptz)
```

### Existing Table Updates

#### `diseases` table
Added columns:
- `clinical_manifestation` (text) - Detailed clinical description
- `spreadsheet_source` (boolean) - Flag for imported data

---

## Pre-Configured Outbreak Categories

The system includes 10 outbreak categories:

1. **Foodborne Outbreaks** - Red (#f87171)
2. **Waterborne Outbreaks** - Cyan (#66dbe1)
3. **Vector-Borne Outbreaks** - Yellow (#fbbf24)
4. **Airborne Outbreaks** - Purple (#a78bfa)
5. **Contact Transmission** - Orange (#fb923c)
6. **Healthcare-Associated Infections** - Red (#ef4444)
7. **Zoonotic Outbreaks** - Green (#10b981)
8. **Sexually Transmitted Infections** - Pink (#ec4899)
9. **Vaccine-Preventable Diseases** - Blue (#3b82f6)
10. **Emerging Infectious Diseases** - Amber (#f59e0b)

---

## Importing Data

### Method 1: Using the Dashboard UI

1. Navigate to the Dashboard
2. Click on the "Data Management" tab
3. Click the "Import Now" button
4. Wait for the import to complete
5. Review the import results

The UI shows:
- Total rows processed
- Successfully imported count
- Skipped rows
- Error details (if any)

### Method 2: Using the API

```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/import-spreadsheet-data`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  }
);

const result = await response.json();
console.log(result);
// {
//   success: true,
//   processed: 245,
//   skipped: 3,
//   total: 248,
//   errors: []
// }
```

---

## What Happens During Import

### 1. Data Fetching
- Fetches the CSV export from Google Sheets
- Parses rows into structured data

### 2. Disease Processing
For each row:
- Checks if disease already exists
- Creates new disease if not found
- Updates existing disease with spreadsheet data
- Assigns severity level based on outbreak category
- Assigns color code for visualization

### 3. Pathogen Processing
- Normalizes pathogen type (Bacteria, Virus, etc.)
- Creates new pathogen if not found
- Links pathogen to disease via `disease_pathogens` table

### 4. Category Assignment
- Finds matching outbreak category
- Links disease to category via `disease_categories` table

### 5. Keyword Extraction
- Splits keywords by comma or semicolon
- Creates entries in `disease_keywords` table
- Enables better disease detection from news articles

---

## Using Imported Data

### Query Diseases with Pathogens

```sql
SELECT
  d.name as disease_name,
  d.severity_level,
  p.name as pathogen_name,
  p.type as pathogen_type
FROM diseases d
JOIN disease_pathogens dp ON dp.disease_id = d.id
JOIN pathogens p ON p.id = dp.pathogen_id
WHERE d.spreadsheet_source = true
ORDER BY d.name;
```

### Query Diseases by Outbreak Category

```sql
SELECT
  oc.name as category,
  COUNT(DISTINCT d.id) as disease_count,
  oc.color
FROM outbreak_categories oc
LEFT JOIN disease_categories dc ON dc.category_id = oc.id
LEFT JOIN diseases d ON d.id = dc.disease_id
GROUP BY oc.id, oc.name, oc.color
ORDER BY disease_count DESC;
```

### Find Diseases by Pathogen Type

```sql
SELECT
  p.type as pathogen_type,
  COUNT(DISTINCT d.id) as disease_count,
  array_agg(DISTINCT d.name) as diseases
FROM pathogens p
JOIN disease_pathogens dp ON dp.pathogen_id = p.id
JOIN diseases d ON d.id = dp.disease_id
GROUP BY p.type
ORDER BY disease_count DESC;
```

---

## Dashboard Visualizations

### Outbreak Categories Tab
Displays:
- Grid of all outbreak categories
- Disease count per category
- Color-coded cards with descriptions
- Top 5 categories by disease count

### Data Management Tab
Provides:
- Import button with status indicator
- Real-time import progress
- Success/error reporting
- Link to source spreadsheet

---

## Map Integration (Future)

The imported data will be used for:

### Category-Based Clustering
When zoomed out on the map:
- Group outbreak signals by category
- Display pie charts showing category distribution per region
- Use category colors for visual differentiation

### Disease Icons Below Map
- Show icons for each outbreak category present in the region
- Click icon to filter map to show only that category
- Count of active outbreaks per category

### Detailed Markers
When zoomed in:
- Show individual outbreak locations
- Color-code by disease severity
- Display pathogen information in tooltip
- Link to related news articles

---

## Data Quality & Maintenance

### Automatic Deduplication
The import function handles duplicates:
- Checks for existing diseases by name
- Updates existing records instead of creating duplicates
- Uses UPSERT for junction tables

### Data Validation
During import:
- Validates pathogen types
- Normalizes outbreak category names
- Ensures color codes are valid
- Logs errors for manual review

### Regular Updates
To keep data current:
1. Update the Google Spreadsheet
2. Run the import function again
3. New data will be added
4. Existing data will be updated

---

## API Reference

### Edge Function: `import-spreadsheet-data`

**Endpoint**: `POST /functions/v1/import-spreadsheet-data`

**Authentication**: Required (JWT)

**Request**: No body needed (fetches from spreadsheet directly)

**Response**:
```typescript
{
  success: boolean;
  processed: number;      // Successfully imported
  skipped: number;        // Rows with errors
  total: number;          // Total rows in spreadsheet
  errors: Array<{         // First 10 errors (if any)
    row: string;          // Disease name
    error: string;        // Error message
  }>;
}
```

**Error Codes**:
- 401: Unauthorized (invalid JWT)
- 500: Server error (check logs)

---

## Example Queries for Dashboard

### Get Top Diseases by Category

```typescript
const { data } = await supabase
  .from('diseases')
  .select(`
    id,
    name,
    severity_level,
    disease_categories!inner (
      outbreak_categories (
        name,
        color
      )
    )
  `)
  .eq('spreadsheet_source', true)
  .limit(20);
```

### Get Pathogen Distribution

```typescript
const { data } = await supabase
  .from('pathogens')
  .select(`
    type,
    disease_pathogens (count)
  `)
  .order('disease_pathogens.count', { ascending: false });
```

### Search Diseases by Keyword

```typescript
const { data } = await supabase
  .from('disease_keywords')
  .select(`
    keyword,
    diseases (
      name,
      severity_level,
      color_code
    )
  `)
  .ilike('keyword', '%malaria%');
```

---

## Troubleshooting

### Import Fails

**Problem**: Import returns errors

**Solutions**:
1. Check Edge Function logs in Supabase dashboard
2. Verify spreadsheet is publicly accessible
3. Ensure database has proper permissions
4. Check for duplicate disease names

### Missing Data

**Problem**: Some diseases not imported

**Solutions**:
1. Check spreadsheet formatting (CSV structure)
2. Verify all required columns are present
3. Look for special characters in disease names
4. Review error details in import response

### Performance Issues

**Problem**: Import takes too long

**Solutions**:
1. Import processes sequentially (by design for data integrity)
2. Large spreadsheets (>500 rows) may take 30-60 seconds
3. Consider breaking into smaller batches if needed
4. Check Supabase project limits

---

## Future Enhancements

### Planned Features

1. **Scheduled Imports**
   - Automatic daily/weekly imports
   - Change detection and notifications
   - Import history tracking

2. **Data Validation**
   - Pre-import validation rules
   - Duplicate detection UI
   - Manual review queue

3. **Advanced Filtering**
   - Filter map by pathogen type
   - Filter alerts by outbreak category
   - Multi-category selection

4. **Export Capabilities**
   - Export filtered data to CSV
   - Generate reports by category
   - API for third-party integrations

---

## Support

For issues or questions:
- Check Edge Function logs: Supabase Dashboard > Edge Functions > Logs
- Review database migrations: `supabase/migrations/`
- Consult implementation guide: `IMPLEMENTATION_GUIDE.md`

**Last Updated**: October 29, 2024
