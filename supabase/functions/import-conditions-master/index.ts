import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import csv from "npm:csvtojson@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Google Sheets configuration
const SPREADSHEET_ID = "1HU-AANvAkXXLqga2rsSMyy5Hhn3_uJ2ewVZ1UrNbC30";

// Sheet tabs and their GIDs (from URL parameters)
// Note: The health statistics data is in gid=2113403558 which contains multiple sections
const SHEET_TABS: Record<string, string> = {
  "Health Statistics": "2113403558", // This tab contains both "Cardiovascular and Metabolic Disorders" and "Cancers" sections
};

interface ConditionMasterRecord {
  category: string;
  condition: string;
  age_group: string | null;
  needs_prevalence: boolean;
  needs_incidence: boolean;
  needs_mortality: boolean;
  needs_sex_split: boolean;
  needs_ylds: boolean;
  needs_dalys: boolean;
  risk_factors_template: string | null;
  equity_ai_content: string | null;
  interventions_ai_content: string | null;
}

// Function to get CSV URL for a specific sheet
function getSheetCsvUrl(sheetName: string, gid?: string): string {
  const baseUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv`;
  if (gid) {
    return `${baseUrl}&gid=${gid}`;
  }
  return baseUrl; // Default to first sheet
}

// Parse age groups - preserve en-dash format from spreadsheet
function parseAgeGroup(ageStr: string): string | null {
  if (!ageStr || ageStr.trim() === '') return null;

  // Clean up but preserve en-dash (keep – not convert to -)
  return ageStr.trim()
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/-/g, '–') // Convert hyphens to en-dashes to match spreadsheet format
    .replace(/,/g, ', '); // Add space after commas
}

// Detect which columns exist in the spreadsheet
function detectColumnNeeds(row: Record<string, any>): {
  needs_prevalence: boolean;
  needs_incidence: boolean;
  needs_mortality: boolean;
  needs_sex_split: boolean;
  needs_ylds: boolean;
  needs_dalys: boolean;
} {
  const hasPrevalence = !!(
    row['Prevalence (total cases per 100,000)'] ||
    row['prevalence_per_100k'] ||
    row['Prevalence']
  );
  
  const hasIncidence = !!(
    row['Incidence (new cases per year per 100,000)'] ||
    row['incidence_per_100k'] ||
    row['Incidence']
  );
  
  const hasMortality = !!(
    row['Mortality Rate (%)'] ||
    row['mortality_rate_percent'] ||
    row['Mortality'] ||
    row['Mortality Rate']
  );
  
  const hasSexSplit = !!(
    row['Female'] ||
    row['Male'] ||
    row['All sexes'] ||
    row['female_rate'] ||
    row['male_rate'] ||
    row['all_sexes_rate']
  );
  
  const hasYlds = !!(
    row['YLDs'] ||
    row['ylds_per_100k'] ||
    row['YLDs per 100k']
  );
  
  const hasDalys = !!(
    row['DALYs'] ||
    row['dalys_per_100k'] ||
    row['DALYs per 100k']
  );

  return {
    needs_prevalence: hasPrevalence,
    needs_incidence: hasIncidence,
    needs_mortality: hasMortality,
    needs_sex_split: hasSexSplit,
    needs_ylds: hasYlds,
    needs_dalys: hasDalys,
  };
}

// Extract conditions from a sheet tab (handles multiple sections within one tab)
async function extractConditionsFromSheet(
  sheetName: string,
  gid: string
): Promise<ConditionMasterRecord[]> {
  const csvUrl = getSheetCsvUrl(sheetName, gid);
  console.log(`Fetching conditions from ${sheetName} (GID: ${gid})`);

  try {
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${sheetName}: ${response.status}`);
    }

    const csvText = await response.text();
    // Parse CSV manually to handle dynamic headers
    const lines = csvText.split('\n').filter(line => line.trim());
    
    const records: ConditionMasterRecord[] = [];
    const seenConditions = new Set<string>();
    
    let currentCategory: string | null = null;
    let headerRowFound = false;
    let headerMap: Record<string, number> = {};

    // Known category names that appear as section headers
    // Order matters - more specific matches should come first
    const categoryNames = [
      "Cardiovascular and Metabolic Disorders",
      "Cancers",
      "Respiratory Diseases",
      "Neurological Disorders",
      "Mental and Behavioral Disorders",
      "Mental Disorders",
      "Diabetes & Kidney Diseases",
      "Digestive Diseases",
      "Musculoskeletal Disorders",
      "Endocrine and Hematologic Disorders",
      "Endocrine Disorders",
      "High-Burden Infectious Diseases",
      "Neglected Tropical Diseases",
      "Infectious Diseases",
      "Injuries & Trauma",
      "Violence & Self-Harm",
      "Maternal, Neonatal, and Child Health",
      "Environmental & Occupational Health",
      "Sensory Disorders",
      "Skin Diseases",
      "Eye Diseases",
      "Ear Diseases",
      "Oral Health",
      "Blood Disorders",
      "Immune System Disorders",
    ];

    for (let i = 0; i < lines.length; i++) {
      // Parse CSV line manually (handle quoted fields)
      const parseCsvLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const cells = parseCsvLine(lines[i]);
      const firstCell = cells[0] || '';
      const secondCell = cells[1] || '';

      // Skip empty rows
      if (!firstCell && !secondCell) continue;

      // Check if this is a section header (category name)
      // A section header is typically:
      // 1. Matches a known category name exactly
      // 2. First cell matches category, second cell is empty or same
      // 3. First cell contains category keywords and rest of row is mostly empty
      const matchedCategory = categoryNames.find(cat => {
        const firstLower = firstCell.toLowerCase().trim();
        const catLower = cat.toLowerCase();
        
        // Exact match
        if (firstCell === cat) return true;
        
        // First cell contains category name and second cell is empty or same
        if (firstLower === catLower && (!secondCell || secondCell === firstCell)) return true;
        
        // First cell contains category keywords and row is mostly empty (section header pattern)
        if (firstLower.includes(catLower) || catLower.includes(firstLower)) {
          // Check if this looks like a section header (most cells are empty)
          const nonEmptyCells = cells.filter(c => c && c.trim()).length;
          if (nonEmptyCells <= 2) return true; // Section headers typically have 1-2 non-empty cells
        }
        
        return false;
      });

      if (matchedCategory) {
        currentCategory = matchedCategory;
        headerRowFound = false;
        headerMap = {};
        console.log(`Found section: ${currentCategory} at row ${i}`);
        continue;
      }

      // Check if this is the column header row
      if (firstCell === 'Condition' && secondCell.includes('Age Group')) {
        // Build header map
        cells.forEach((cell, idx) => {
          if (cell) headerMap[cell] = idx;
        });
        headerRowFound = true;
        console.log(`Found header row at ${i} for category: ${currentCategory}`);
        continue;
      }

      // Only process data rows after we've found a category and header
      if (!currentCategory || !headerRowFound) continue;

      // Get condition name from first cell (or Condition column if header map exists)
      const conditionName = (headerMap['Condition'] !== undefined 
        ? cells[headerMap['Condition']] 
        : firstCell).trim();

      // Skip if condition name is empty or matches a category name
      if (!conditionName || conditionName.length < 2) continue;
      
      if (categoryNames.some(cat => conditionName === cat || conditionName.toLowerCase() === cat.toLowerCase())) {
        continue;
      }

      try {
        // Get age group from Age Group Affected column
        const ageGroupStr = (headerMap['Age Group Affected'] !== undefined
          ? cells[headerMap['Age Group Affected']]
          : secondCell).trim() || '';
        
        // Create unique key to avoid duplicates
        const uniqueKey = `${currentCategory}::${conditionName}::${ageGroupStr}`;
        if (seenConditions.has(uniqueKey)) continue;
        seenConditions.add(uniqueKey);

        // Extract risk factors template
        const riskFactorsStr = (headerMap['Risk Factors'] !== undefined
          ? cells[headerMap['Risk Factors']]
          : '').trim() || '';
        const riskFactorsTemplate = riskFactorsStr || null;

        // Extract AI-generated content
        const equityStr = (headerMap['Equity(Ai generated content)'] !== undefined
          ? cells[headerMap['Equity(Ai generated content)']]
          : headerMap['Equity'] !== undefined
          ? cells[headerMap['Equity']]
          : '').trim() || '';
        const equityAiContent = equityStr || null;

        const interventionsStr = (headerMap['Interventions(AI generated content)'] !== undefined
          ? cells[headerMap['Interventions(AI generated content)']]
          : headerMap['Interventions'] !== undefined
          ? cells[headerMap['Interventions']]
          : '').trim() || '';
        const interventionsAiContent = interventionsStr || null;

        const record: ConditionMasterRecord = {
          category: currentCategory,
          condition: conditionName,
          age_group: parseAgeGroup(ageGroupStr),
          needs_prevalence: true,
          needs_incidence: true,
          needs_mortality: true,
          needs_sex_split: true,
          needs_ylds: true,
          needs_dalys: true,
          risk_factors_template: riskFactorsTemplate,
          equity_ai_content: equityAiContent,
          interventions_ai_content: interventionsAiContent,
        };

        records.push(record);
        console.log(`Extracted: ${currentCategory} - ${conditionName} (${ageGroupStr || 'no age group'})`);
      } catch (error) {
        console.warn(`Error parsing row ${i} in ${sheetName}:`, error);
      }
    }

    console.log(`Extracted ${records.length} conditions from ${sheetName}`);
    return records;
  } catch (error) {
    console.error(`Error extracting conditions from ${sheetName}:`, error);
    return [];
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body for optional parameters
    const { forceFullSync = false, specificTabs = null } = await req
      .json()
      .catch(() => ({}));

    console.log("Starting conditions_master import...");

    // Get available sheet tabs
    const availableTabs = SHEET_TABS;
    const tabsToProcess = specificTabs || Object.keys(availableTabs);

    console.log(`Processing ${tabsToProcess.length} sheet tabs:`, tabsToProcess);

    let totalImported = 0;
    let totalErrors = 0;
    const results: Array<{
      tab: string;
      conditions: number;
      status: string;
      error?: string;
    }> = [];

    // Process each sheet tab
    for (const tabName of tabsToProcess) {
      try {
        const gid = availableTabs[tabName];
        if (!gid) {
          console.warn(`No GID found for tab: ${tabName}`);
          results.push({
            tab: tabName,
            conditions: 0,
            status: "error",
            error: "No GID found",
          });
          totalErrors++;
          continue;
        }

        const records = await extractConditionsFromSheet(tabName, gid);

        if (records.length > 0) {
          // Upsert records in batches
          const batchSize = 50;
          for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);

            const { error } = await supabase
              .from("conditions_master")
              .upsert(batch, {
                onConflict: "category,condition,age_group",
              });

            if (error) {
              console.error(`Error upserting batch for ${tabName}:`, error);
              totalErrors += batch.length;
            } else {
              totalImported += batch.length;
              console.log(`Upserted ${batch.length} conditions for ${tabName}`);
            }
          }

          results.push({
            tab: tabName,
            conditions: records.length,
            status: "success",
          });
        } else {
          results.push({
            tab: tabName,
            conditions: 0,
            status: "no_data",
          });
        }
      } catch (error) {
        console.error(`Error processing tab ${tabName}:`, error);
        totalErrors++;
        results.push({
          tab: tabName,
          conditions: 0,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Get summary of imported conditions
    const { data: summary, error: summaryError } = await supabase
      .from("conditions_master")
      .select("category, condition", { count: "exact" });

    return new Response(
      JSON.stringify({
        success: true,
        totalImported,
        totalErrors,
        tabsProcessed: results,
        totalConditionsInMaster: summary?.length || 0,
        message: `Successfully imported ${totalImported} conditions into conditions_master from ${tabsToProcess.length} sheet tabs`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Import function error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

