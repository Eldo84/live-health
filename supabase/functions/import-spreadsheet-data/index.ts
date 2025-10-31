import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1HU-AANvAkXXLqga2rsSMyy5Hhn3_uJ2ewVZ1UrNbC30/export?format=csv&gid=0';

interface SpreadsheetRow {
  disease: string;
  pathogen: string;
  outbreakCategory: string;
  pathogenType: string;
  keywords: string;
}

function parseCSV(csv: string): SpreadsheetRow[] {
  const lines = csv.split('\n');
  const rows: SpreadsheetRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    if (values.length >= 5) {
      rows.push({
        disease: values[0],
        pathogen: values[1],
        outbreakCategory: values[2],
        pathogenType: values[3],
        keywords: values[4],
      });
    }
  }
  
  return rows;
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
    
    console.log('Parsing CSV...');
    const rows = parseCSV(csvText);
    console.log(`Parsed ${rows.length} rows`);

    let processedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const row of rows) {
      try {
        let diseaseId;
        const { data: existingDisease } = await supabase
          .from('diseases')
          .select('id')
          .eq('name', row.disease)
          .maybeSingle();

        if (existingDisease) {
          diseaseId = existingDisease.id;
          await supabase
            .from('diseases')
            .update({
              clinical_manifestation: row.disease,
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
          
          const severity = severityMap[row.outbreakCategory] || 'medium';
          const colorMap: Record<string, string> = {
            'critical': '#f87171',
            'high': '#fbbf24',
            'medium': '#66dbe1',
            'low': '#4ade80',
          };

          const { data: newDisease, error: diseaseError } = await supabase
            .from('diseases')
            .insert({
              name: row.disease,
              description: `${row.disease} caused by ${row.pathogen}`,
              severity_level: severity,
              color_code: colorMap[severity],
              clinical_manifestation: row.disease,
              spreadsheet_source: true,
            })
            .select()
            .maybeSingle();

          if (diseaseError || !newDisease) {
            console.error(`Error creating disease ${row.disease}:`, diseaseError);
            skippedCount++;
            continue;
          }
          diseaseId = newDisease.id;
        }

        const pathogenTypeMap: Record<string, string> = {
          'Bacteria': 'Bacteria',
          'Virus': 'Virus',
          'Fungus': 'Fungus',
          'other(parasite/protozoan or Helminth)': 'Protozoan',
          'Parasite': 'Parasite',
          'Helminth': 'Helminth',
        };
        const normalizedPathogenType = pathogenTypeMap[row.pathogenType] || 'Other';

        let pathogenId;
        const { data: existingPathogen } = await supabase
          .from('pathogens')
          .select('id')
          .eq('name', row.pathogen)
          .maybeSingle();

        if (existingPathogen) {
          pathogenId = existingPathogen.id;
        } else {
          const { data: newPathogen } = await supabase
            .from('pathogens')
            .insert({
              name: row.pathogen,
              type: normalizedPathogenType,
              description: `Causative agent of ${row.disease}`,
            })
            .select()
            .maybeSingle();
          
          if (!newPathogen) {
            console.error(`Error creating pathogen ${row.pathogen}`);
            continue;
          }
          pathogenId = newPathogen.id;
        }

        await supabase
          .from('disease_pathogens')
          .upsert({
            disease_id: diseaseId,
            pathogen_id: pathogenId,
            is_primary: true,
          }, { onConflict: 'disease_id,pathogen_id' });

        const { data: category } = await supabase
          .from('outbreak_categories')
          .select('id')
          .eq('name', row.outbreakCategory)
          .maybeSingle();

        if (category) {
          await supabase
            .from('disease_categories')
            .upsert({
              disease_id: diseaseId,
              category_id: category.id,
            }, { onConflict: 'disease_id,category_id' });
        }

        if (row.keywords) {
          const keywords = row.keywords.split(/[,;]/).map(k => k.trim()).filter(k => k);
          for (const keyword of keywords) {
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
        console.error(`Error processing row:`, error);
        errors.push({ row: row.disease, error: error.message });
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
