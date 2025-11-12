import { createClient } from 'npm:@supabase/supabase-js@2';
import csv from "npm:csvtojson@2";
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

// Health ministry spreadsheet URL
const HEALTH_MINISTRY_SPREADSHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1HU-AANvAkXXLqga2rsSMyy5Hhn3_uJ2ewVZ1UrNbC30/export?format=csv&gid=1200992810";

// Load CSV from spreadsheet
async function loadHealthMinistryCSV(): Promise<string> {
  const csvResponse = await fetch(HEALTH_MINISTRY_SPREADSHEET_CSV_URL);
  const csvText = await csvResponse.text();
  return csvText;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface HealthMinistryRow {
  Country: string;
  "Health Ministry/Department": string;
  "Phone Number": string;
  "Email Address": string;
}

// Helper function to find or create country
async function findOrCreateCountry(
  supabase: SupabaseClient,
  countryName: string
): Promise<string | null> {
  if (!countryName || !countryName.trim()) {
    return null;
  }
  
  const normalizedName = countryName.trim();
  
  // Try to find existing country by name (case-insensitive)
  const { data: existingCountry } = await supabase
    .from('countries')
    .select('id')
    .ilike('name', normalizedName)
    .maybeSingle();
  
  if (existingCountry) {
    return existingCountry.id;
  }
  
  // Try exact match as fallback
  const { data: exactMatch } = await supabase
    .from('countries')
    .select('id')
    .eq('name', normalizedName)
    .maybeSingle();
  
  if (exactMatch) {
    return exactMatch.id;
  }
  
  // If country doesn't exist, create it
  // Generate a simple code from country name (first 2-3 uppercase letters)
  const code = normalizedName.length >= 2 
    ? normalizedName.substring(0, 3).toUpperCase().replace(/\s/g, '')
    : normalizedName.toUpperCase();
  
  const { data: newCountry, error } = await supabase
    .from('countries')
    .insert({
      name: normalizedName,
      code: code,
      continent: 'Unknown', // Default continent since we don't have this data
    })
    .select('id')
    .single();
  
  if (error || !newCountry) {
    console.error(`Error creating country "${normalizedName}":`, error);
    return null;
  }
  
  console.log(`Created new country: "${normalizedName}"`);
  return newCountry.id;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching health ministry spreadsheet data...');
    const csvText = await loadHealthMinistryCSV();
    console.log(`Fetched CSV, length: ${csvText.length}`);
    
    console.log('Parsing CSV with csvtojson...');
    const rows: HealthMinistryRow[] = await csv().fromString(csvText);
    console.log(`Parsed ${rows.length} rows`);
    
    // Log first few rows for debugging
    if (rows.length > 0) {
      console.log('First row sample:', JSON.stringify(rows[0]));
      console.log('First row keys:', Object.keys(rows[0]));
    }

    let processedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // Get country value - try multiple column name variations and also check all object keys
        let countryValue: any = '';
        const rowKeys = Object.keys(row);
        
        // Try common column name variations
        countryValue = row.Country || row.country || row.COUNTRY || 
                      (row as any)['Country'] || (row as any)['country'] ||
                      rowKeys.find(k => k.toLowerCase().includes('country')) ? 
                        (row as any)[rowKeys.find(k => k.toLowerCase().includes('country'))!] : '';
        
        // If still not found, try first column that looks like a country name
        if (!countryValue && rowKeys.length > 0) {
          const firstKey = rowKeys[0];
          const firstValue = (row as any)[firstKey];
          if (firstValue && typeof firstValue === 'string' && firstValue.trim().length > 2) {
            // Check if it's not a header-like value
            const lowerValue = firstValue.toLowerCase();
            if (!lowerValue.includes('country') && 
                !lowerValue.includes('template') && 
                !lowerValue.includes('ministry') &&
                !lowerValue.includes('department')) {
              countryValue = firstValue;
            }
          }
        }
        
        const countryName = countryValue ? countryValue.toString().trim() : '';
        
        // Skip header row or rows without valid country
        if (!countryName || 
            countryName.toLowerCase() === 'country' ||
            countryName.toLowerCase().includes('table template') ||
            countryName.toLowerCase().includes('health ministry') && countryName.toLowerCase().includes('department') ||
            countryName.length < 2) {
          console.warn(`Skipping row ${i + 1} with invalid Country: "${countryName}"`);
          skippedCount++;
          continue;
        }
        
        // Get other fields - try multiple column name variations
        const ministryValue = row["Health Ministry/Department"] || 
                             row["health ministry/department"] ||
                             (row as any)['Health Ministry/Department'] || '';
        const ministryName = ministryValue ? ministryValue.toString().trim() : '';
        
        const phoneValue = row["Phone Number"] || row["phone number"] ||
                          (row as any)['Phone Number'] || '';
        const phoneNumber = phoneValue ? phoneValue.toString().trim() : null;
        
        const emailValue = row["Email Address"] || row["email address"] ||
                          (row as any)['Email Address'] || '';
        const emailAddress = emailValue ? emailValue.toString().trim() : null;
        
        // Find or create country
        const countryId = await findOrCreateCountry(supabase, countryName);
        
        if (!countryId) {
          console.warn(`Could not find or create country for "${countryName}"`);
          errors.push({ row: countryName, error: 'Failed to find or create country' });
          skippedCount++;
          continue;
        }
        
        // Check if health ministry already exists for this country
        const { data: existingMinistry } = await supabase
          .from('health_ministries')
          .select('id')
          .eq('country_name', countryName)
          .maybeSingle();

        if (existingMinistry) {
          // Update existing ministry
          const { error: updateError } = await supabase
            .from('health_ministries')
            .update({
              country_id: countryId,
              ministry_name: ministryName,
              phone_number: phoneNumber,
              email_address: emailAddress,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingMinistry.id);
          
          if (updateError) {
            console.error(`Error updating health ministry for ${countryName}:`, updateError);
            errors.push({ row: countryName, error: `Update failed: ${updateError.message}` });
            skippedCount++;
            continue;
          }
        } else {
          // Create new ministry
          const { error: insertError } = await supabase
            .from('health_ministries')
            .insert({
              country_id: countryId,
              country_name: countryName,
              ministry_name: ministryName,
              phone_number: phoneNumber,
              email_address: emailAddress,
            });
          
          if (insertError) {
            console.error(`Error creating health ministry for ${countryName}:`, insertError);
            errors.push({ row: countryName, error: `Insert failed: ${insertError.message}` });
            skippedCount++;
            continue;
          }
        }

        processedCount++;
      } catch (error) {
        const countryName = row.Country || 'Unknown';
        console.error(`Error processing row for ${countryName}:`, error);
        errors.push({ row: countryName, error: error.message || String(error) });
        skippedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        skipped: skippedCount,
        total: rows.length,
        errors: errors.slice(0, 10),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

