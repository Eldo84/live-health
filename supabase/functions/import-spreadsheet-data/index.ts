import { createClient } from 'npm:@supabase/supabase-js@2';
import csv from "npm:csvtojson@2";
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1HU-AANvAkXXLqga2rsSMyy5Hhn3_uJ2ewVZ1UrNbC30/export?format=csv&gid=0';

interface SpreadsheetRow {
  Disease: string;
  Pathogen: string;
  "Outbreak Category": string;
  PathogenType: string;
  Keywords: string;
}

// Normalize category name to standard form
function normalizeCategoryName(categoryName: string): string {
  if (!categoryName || !categoryName.trim()) {
    return "Other";
  }
  
  let normalized = categoryName.trim();
  const lower = normalized.toLowerCase();
  
  // Handle composite categories - extract the first/primary category
  if (normalized.includes(',')) {
    const firstCategory = normalized.split(',')[0].trim();
    normalized = firstCategory;
  }
  
  // Map variations to standard category names
  const categoryMappings: Record<string, string> = {
    // Veterinary variations
    "veterinary outbreak": "Veterinary Outbreaks",
    "veterinary outbreaks": "Veterinary Outbreaks",
    
    // Sexually transmitted variations
    "sexually transmitted outbreaks": "Sexually Transmitted Infections",
    "sexually transmitted infections": "Sexually Transmitted Infections",
    
    // Emerging diseases variations
    "emerging & re-emerging disease outbreaks": "Emerging Infectious Diseases",
    "emerging and re-emerging disease outbreaks": "Emerging Infectious Diseases",
    "emerging infectious diseases": "Emerging Infectious Diseases",
    "emerging & re-emerging diseases": "Emerging Infectious Diseases",
    
    // Standardize common categories
    "foodborne outbreaks": "Foodborne Outbreaks",
    "waterborne outbreaks": "Waterborne Outbreaks",
    "vector-borne outbreaks": "Vector-Borne Outbreaks",
    "airborne outbreaks": "Airborne Outbreaks",
    "zoonotic outbreaks": "Zoonotic Outbreaks",
    "neurological outbreaks": "Neurological Outbreaks",
    "respiratory outbreaks": "Respiratory Outbreaks",
    "gastrointestinal outbreaks": "Gastrointestinal Outbreaks",
    "bloodborne outbreaks": "Bloodborne Outbreaks",
    "skin and soft tissue outbreaks": "Skin and Soft Tissue Outbreaks",
    "antimicrobial-resistant outbreaks": "Antimicrobial-Resistant Outbreaks",
  };
  
  // Check exact lowercase match first
  if (categoryMappings[lower]) {
    return categoryMappings[lower];
  }
  
  // Check if it contains key phrases for partial matching
  if (lower.includes("veterinary")) {
    return "Veterinary Outbreaks";
  }
  if (lower.includes("sexually transmitted")) {
    return "Sexually Transmitted Infections";
  }
  if (lower.includes("emerging") && (lower.includes("re-emerging") || lower.includes("reemerging"))) {
    return "Emerging Infectious Diseases";
  }
  
  // Capitalize properly for standard format: "Category Name"
  const words = normalized.toLowerCase().split(/\s+/);
  const capitalized = words.map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
  
  return capitalized;
}

// Helper function to get or create an outbreak category
async function getOrCreateCategory(
  supabase: SupabaseClient,
  categoryName: string
): Promise<string | null> {
  if (!categoryName || !categoryName.trim()) {
    return null;
  }
  
  // Normalize the category name to standard form
  const normalizedName = normalizeCategoryName(categoryName);
  
  // Check if category exists (case-insensitive match)
  const { data: existingCategory } = await supabase
    .from('outbreak_categories')
    .select('id, name')
    .ilike('name', normalizedName)
    .maybeSingle();
  
  if (existingCategory) {
    return existingCategory.id;
  }
  
  // Check for exact match (case-sensitive) as fallback
  const { data: exactMatch } = await supabase
    .from('outbreak_categories')
    .select('id')
    .eq('name', normalizedName)
    .maybeSingle();
  
  if (exactMatch) {
    return exactMatch.id;
  }
  
  // Create new category with default values
  // Use a color palette that cycles based on category name hash
  const defaultColors = [
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#f59e0b', // amber
    '#10b981', // green
    '#ec4899', // pink
    '#6366f1', // indigo
    '#14b8a6', // teal
    '#f97316', // orange
    '#ef4444', // red
    '#3b82f6', // blue
  ];
  
  // Use hash of name to consistently assign colors
  let hash = 0;
  for (let i = 0; i < normalizedName.length; i++) {
    hash = ((hash << 5) - hash) + normalizedName.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  const colorIndex = Math.abs(hash) % defaultColors.length;
  const defaultColor = defaultColors[colorIndex];
  
  const { data: newCategory, error } = await supabase
    .from('outbreak_categories')
    .insert({
      name: normalizedName,
      description: `Category: ${normalizedName}`,
      color: defaultColor,
      icon: 'alert-circle', // Default icon
    })
    .select('id')
    .single();
  
  if (error || !newCategory) {
    console.error(`Error creating category "${normalizedName}":`, error);
    return null;
  }
  
  console.log(`Created new category: "${normalizedName}" with color ${defaultColor}`);
  return newCategory.id;
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

    console.log('Fetching spreadsheet data...');
    const csvResponse = await fetch(SPREADSHEET_URL);
    const csvText = await csvResponse.text();
    
    console.log('Parsing CSV with csvtojson...');
    const rows: SpreadsheetRow[] = await csv().fromString(csvText);
    console.log(`Parsed ${rows.length} rows`);

    let processedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const row of rows) {
      try {
        // Validate required fields
        if (!row.Disease || !row.Disease.trim()) {
          console.warn('Skipping row with missing Disease name');
          skippedCount++;
          continue;
        }
        
        const diseaseName = row.Disease.trim();
        const pathogenName = row.Pathogen?.trim() || '';
        const categoryName = row["Outbreak Category"]?.trim() || '';
        const pathogenType = row.PathogenType?.trim() || '';
        const keywords = row.Keywords?.trim() || '';
        
        let diseaseId;
        const { data: existingDisease } = await supabase
          .from('diseases')
          .select('id')
          .eq('name', diseaseName)
          .maybeSingle();

        if (existingDisease) {
          diseaseId = existingDisease.id;
          // Update existing disease to ensure it's marked as from spreadsheet
          await supabase
            .from('diseases')
            .update({
              clinical_manifestation: diseaseName,
              spreadsheet_source: true,
            })
            .eq('id', diseaseId);
        } else {
          const severityMap: Record<string, string> = {
            'Emerging Infectious Diseases': 'critical',
            'Healthcare-Associated Infections': 'high',
            'Foodborne Outbreaks': 'medium',
            'Waterborne Outbreaks': 'high',
            'Vector-Borne Outbreaks': 'high',
            'Airborne Outbreaks': 'high',
          };
          
          const severity = severityMap[categoryName] || 'medium';
          const colorMap: Record<string, string> = {
            'critical': '#f87171',
            'high': '#fbbf24',
            'medium': '#66dbe1',
            'low': '#4ade80',
          };

          const { data: newDisease, error: diseaseError } = await supabase
            .from('diseases')
            .insert({
              name: diseaseName,
              description: pathogenName ? `${diseaseName} caused by ${pathogenName}` : diseaseName,
              severity_level: severity,
              color_code: colorMap[severity],
              clinical_manifestation: diseaseName,
              spreadsheet_source: true,
            })
            .select()
            .maybeSingle();

          if (diseaseError || !newDisease) {
            console.error(`Error creating disease ${diseaseName}:`, diseaseError);
            errors.push({ row: diseaseName, error: `Failed to create disease: ${diseaseError?.message || 'Unknown error'}` });
            skippedCount++;
            continue;
          }
          diseaseId = newDisease.id;
        }

        // Process pathogen if provided
        if (pathogenName) {
          const pathogenTypeMap: Record<string, string> = {
            'Bacteria': 'Bacteria',
            'Virus': 'Virus',
            'Fungus': 'Fungus',
            'other(parasite/protozoan or Helminth)': 'Protozoan',
            'Parasite': 'Parasite',
            'Helminth': 'Helminth',
          };
          const normalizedPathogenType = pathogenTypeMap[pathogenType] || 'Other';

          let pathogenId;
          const { data: existingPathogen } = await supabase
            .from('pathogens')
            .select('id')
            .eq('name', pathogenName)
            .maybeSingle();

          if (existingPathogen) {
            pathogenId = existingPathogen.id;
          } else {
            const { data: newPathogen } = await supabase
              .from('pathogens')
              .insert({
                name: pathogenName,
                type: normalizedPathogenType,
                description: `Causative agent of ${diseaseName}`,
              })
              .select()
              .maybeSingle();
            
            if (!newPathogen) {
              console.error(`Error creating pathogen ${pathogenName}`);
              errors.push({ row: diseaseName, error: `Failed to create pathogen: ${pathogenName}` });
            } else {
              pathogenId = newPathogen.id;
            }
          }

          if (pathogenId) {
            await supabase
              .from('disease_pathogens')
              .upsert({
                disease_id: diseaseId,
                pathogen_id: pathogenId,
                is_primary: true,
              }, { onConflict: 'disease_id,pathogen_id' });
          }
        }

        // Process category - only create if exists in spreadsheet, otherwise use "Other"
        let categoryId: string | null = null;
        if (categoryName) {
          // Try to find or create the category from spreadsheet
          categoryId = await getOrCreateCategory(supabase, categoryName);
          if (!categoryId) {
            console.warn(`Could not create or find category for "${categoryName}" (disease: ${diseaseName}), using "Other"`);
          }
        }
        
        // If no category from spreadsheet or category creation failed, use "Other"
        if (!categoryId) {
          const { data: otherCategory } = await supabase
            .from('outbreak_categories')
            .select('id')
            .eq('name', 'Other')
            .maybeSingle();
          
          if (otherCategory) {
            categoryId = otherCategory.id;
          } else {
            // Create "Other" category if it doesn't exist
            const { data: newOtherCategory } = await supabase
              .from('outbreak_categories')
              .insert({
                name: 'Other',
                description: 'Diseases without a specific outbreak category',
                color: '#66dbe1',
                icon: 'alert-circle',
              })
              .select('id')
              .single();
            
            if (newOtherCategory) {
              categoryId = newOtherCategory.id;
            }
          }
        }
        
        // Link disease to category (either from spreadsheet or "Other")
        if (categoryId) {
          await supabase
            .from('disease_categories')
            .upsert({
              disease_id: diseaseId,
              category_id: categoryId,
            }, { onConflict: 'disease_id,category_id' });
        }

        // Process keywords if provided
        if (keywords) {
          const keywordList = keywords.split(/[,;]/).map(k => k.trim()).filter(k => k);
          for (const keyword of keywordList) {
            await supabase
              .from('disease_keywords')
              .upsert({
                disease_id: diseaseId,
                keyword: keyword.toLowerCase(),
                keyword_type: 'primary',
                confidence_weight: 1.0,
              }, { onConflict: 'disease_id,keyword' });
          }
        }

        processedCount++;
      } catch (error) {
        const diseaseName = row.Disease || 'Unknown';
        console.error(`Error processing row for ${diseaseName}:`, error);
        errors.push({ row: diseaseName, error: error.message || String(error) });
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
