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
const SHEET_TABS = {
  "Cardiovascular and Metabolic Disorders": "0", // First tab
  "Cancers": "2113403558", // gid=2113403558 from URL
  // Add other tabs as needed - we'll detect them automatically
};

interface HealthRecord {
  condition_name: string;
  category: string;
  age_group_affected: string;
  prevalence_per_100k: number | null;
  incidence_per_100k: number | null;
  mortality_rate_percent: number | null;
  female_rate: number | null;
  male_rate: number | null;
  all_sexes_rate: number | null;
  ylds_per_100k: number | null;
  dalys_per_100k: number | null;
  year: number | null;
  country: string;
  data_source: string;
  risk_factors: string[];
  equity_score: number | null;
  intervention_score: number | null;
}

// Function to get CSV URL for a specific sheet
function getSheetCsvUrl(sheetName: string, gid?: string): string {
  const baseUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv`;
  if (gid) {
    return `${baseUrl}&gid=${gid}`;
  }
  return baseUrl; // Default to first sheet
}

// Function to detect and map sheet tabs dynamically
async function detectSheetTabs(): Promise<Record<string, string>> {
  // For now, we'll use the known tabs. In production, you might want to
  // use Google Sheets API to list all tabs programmatically
  return SHEET_TABS;
}

// Parse risk factors string into array
function parseRiskFactors(riskFactorsStr: string): string[] {
  if (!riskFactorsStr || riskFactorsStr.trim() === '') return [];

  // Split by common delimiters and clean up
  return riskFactorsStr
    .split(/[;,]/)
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .map(item => item.replace(/^[-•*]\s*/, '')) // Remove bullets
    .filter(item => item.length > 2); // Filter out very short items
}

// Parse numeric values safely
function parseNumeric(value: string): number | null {
  if (!value || value.trim() === '' || value === '--' || value === 'N/A') return null;

  // Handle percentage signs
  const cleanValue = value.replace('%', '').trim();

  // Handle ranges like "10.5% of adults (approx. 10,500)"
  const match = cleanValue.match(/([\d,]+\.?\d*)/);
  if (match) {
    return parseFloat(match[1].replace(',', ''));
  }

  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? null : parsed;
}

// Parse age groups
function parseAgeGroup(ageStr: string): string {
  if (!ageStr || ageStr.trim() === '') return 'All ages';

  // Clean up common formats
  return ageStr.trim()
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/–/g, '-') // Normalize dashes
    .replace(/,/g, ', '); // Add space after commas
}

// Extract data from a sheet tab
async function extractSheetData(sheetName: string, gid: string): Promise<HealthRecord[]> {
  const csvUrl = getSheetCsvUrl(sheetName, gid);
  console.log(`Fetching data from ${sheetName} (GID: ${gid})`);

  try {
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${sheetName}: ${response.status}`);
    }

    const csvText = await response.text();
    const rows = await csv().fromString(csvText);

    const records: HealthRecord[] = [];
    let dataStarted = false;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Skip empty rows or header rows
      const firstCell = Object.values(row)[0]?.toString().trim();
      if (!firstCell) continue;

      // Detect data rows (skip headers and section titles)
      if (firstCell.toLowerCase().includes('condition') && firstCell.toLowerCase().includes('age group')) {
        dataStarted = true;
        continue; // Skip header row
      }

      if (!dataStarted) continue;

      // Skip section headers (all caps or specific patterns)
      if (firstCell === firstCell.toUpperCase() && firstCell.length > 10) continue;
      if (firstCell.toLowerCase().includes('condition') && firstCell.toLowerCase().includes('age group')) continue;

      try {
        const record: HealthRecord = {
          condition_name: row['Condition'] || row['condition_name'] || firstCell,
          category: sheetName,
          age_group_affected: parseAgeGroup(row['Age Group Affected'] || row['age_group_affected'] || ''),
          prevalence_per_100k: parseNumeric(row['Prevalence (total cases per 100,000)'] || row['prevalence_per_100k'] || ''),
          incidence_per_100k: parseNumeric(row['Incidence (new cases per year per 100,000)'] || row['incidence_per_100k'] || ''),
          mortality_rate_percent: parseNumeric(row['Mortality Rate (%)'] || row['mortality_rate_percent'] || ''),
          female_rate: parseNumeric(row['Female'] || row['female_rate'] || ''),
          male_rate: parseNumeric(row['Male'] || row['male_rate'] || ''),
          all_sexes_rate: parseNumeric(row['All sexes'] || row['all_sexes_rate'] || ''),
          ylds_per_100k: parseNumeric(row['YLDs'] || row['ylds_per_100k'] || ''),
          dalys_per_100k: parseNumeric(row['DALYs'] || row['dalys_per_100k'] || ''),
          year: parseNumeric(row['Year'] || row['year'] || '2020'), // Default to 2020 if not specified
          country: row['Location (country)'] || row['country'] || 'Global',
          data_source: row['data source'] || row['Data Source'] || 'Unknown',
          risk_factors: parseRiskFactors(row['Risk Factors'] || row['risk_factors'] || ''),
          equity_score: parseNumeric(row['Equity(Ai generated content)'] || row['equity_score'] || ''),
          intervention_score: parseNumeric(row['Interventions(AI generated content)'] || row['intervention_score'] || '')
        };

        // Validate required fields
        if (record.condition_name && record.condition_name.trim().length > 2) {
          records.push(record);
        }
      } catch (error) {
        console.warn(`Error parsing row ${i} in ${sheetName}:`, error);
      }
    }

    console.log(`Extracted ${records.length} records from ${sheetName}`);
    return records;

  } catch (error) {
    console.error(`Error extracting data from ${sheetName}:`, error);
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
    const { forceFullSync = false, specificTabs = null } = await req.json().catch(() => ({}));

    // Start sync logging
    const { data: syncLog, error: logError } = await supabase
      .from('data_sync_log')
      .insert({
        sync_type: forceFullSync ? 'full' : 'incremental',
        spreadsheet_url: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`,
        status: 'running'
      })
      .select()
      .single();

    if (logError) {
      console.error('Error creating sync log:', logError);
    }

    const syncId = syncLog?.id;

    try {
      // Detect available sheet tabs
      const availableTabs = await detectSheetTabs();
      const tabsToProcess = specificTabs || Object.keys(availableTabs);

      console.log(`Processing ${tabsToProcess.length} sheet tabs:`, tabsToProcess);

      let totalProcessed = 0;
      let totalErrors = 0;
      const results = [];

      // Process each sheet tab
      for (const tabName of tabsToProcess) {
        try {
          const gid = availableTabs[tabName];
          const records = await extractSheetData(tabName, gid);

          if (records.length > 0) {
            // Insert/update records in batches
            const batchSize = 50;
            for (let i = 0; i < records.length; i += batchSize) {
              const batch = records.slice(i, i + batchSize);

              const { error } = await supabase
                .from('health_conditions')
                .upsert(batch, {
                  onConflict: 'condition_name,category,country,year,age_group_affected'
                });

              if (error) {
                console.error(`Error inserting batch for ${tabName}:`, error);
                totalErrors += batch.length;
              } else {
                totalProcessed += batch.length;
                console.log(`Inserted ${batch.length} records for ${tabName}`);
              }
            }

            results.push({
              tab: tabName,
              records: records.length,
              status: 'success'
            });
          } else {
            results.push({
              tab: tabName,
              records: 0,
              status: 'no_data'
            });
          }
        } catch (error) {
          console.error(`Error processing tab ${tabName}:`, error);
          totalErrors++;
          results.push({
            tab: tabName,
            records: 0,
            status: 'error',
            error: error.message
          });
        }
      }

      // Update sync log as completed
      if (syncId) {
        await supabase
          .from('data_sync_log')
          .update({
            records_processed: totalProcessed,
            records_failed: totalErrors,
            completed_at: new Date().toISOString(),
            status: 'completed'
          })
          .eq('id', syncId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          syncId,
          totalProcessed,
          totalErrors,
          tabsProcessed: results,
          message: `Successfully imported ${totalProcessed} health records from ${tabsToProcess.length} sheet tabs`
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

    } catch (error) {
      // Update sync log as failed
      if (syncId) {
        await supabase
          .from('data_sync_log')
          .update({
            error_message: error.message,
            completed_at: new Date().toISOString(),
            status: 'failed'
          })
          .eq('id', syncId);
      }

      throw error;
    }

  } catch (error) {
    console.error("Import function error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});






























