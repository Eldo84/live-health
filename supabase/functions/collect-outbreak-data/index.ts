import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface NormalizedArticle {
  title: string;
  content: string;
  url: string;
  publishedAt: string;
  source: 'CDC' | 'WHO' | 'Google News' | 'BBC Health' | 'Reuters Health' | 'ProMED-mail';
  location?: {
    country?: string;
    city?: string;
    lat?: number;
    lng?: number;
  };
}

interface KeywordMatch {
  keyword: string;
  diseaseId: string;
  diseaseName: string;
  category?: string;
  confidence: number;
}

// Google Sheets URL
const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1HU-AANvAkXXLqga2rsSMyy5Hhn3_uJ2ewVZ1UrNbC30/export?format=csv&gid=0';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const opencageKey = Deno.env.get('OPENCAGE_API_KEY');

    console.log('Starting outbreak data collection...');

    // STEP 1: Load disease data from spreadsheet (including pathogen, category, and keywords)
    console.log('Step 1: Fetching spreadsheet data...');
    const csvResponse = await fetch(SPREADSHEET_URL);
    const csvText = await csvResponse.text();
    const keywordMap = new Map<string, Array<{ diseaseId: string; diseaseName: string; category?: string }>>();

    // Parse CSV with all columns: Disease, Pathogen, Outbreak Category, Pathogen Type, Keywords
    const lines = csvText.split(/\r?\n/).filter(l => l.trim());
    if (lines.length > 0) {
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const diseaseIdx = headers.findIndex(h => h.toLowerCase().includes('disease'));
      const pathogenIdx = headers.findIndex(h => h.toLowerCase().includes('pathogen'));
      const categoryIdx = headers.findIndex(h => h.toLowerCase().includes('outbreak category') || h.toLowerCase().includes('category'));
      const pathogenTypeIdx = headers.findIndex(h => h.toLowerCase().includes('pathogen type') || h.toLowerCase().includes('pathogentype'));
      const keywordIdx = headers.findIndex(h => h.toLowerCase().includes('keyword'));

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const disease = values[diseaseIdx]?.trim();
        const pathogen = values[pathogenIdx]?.trim();
        const outbreakCategory = values[categoryIdx]?.trim();
        const pathogenType = values[pathogenTypeIdx]?.trim();
        const keywords = values[keywordIdx]?.split(/[,;]/).map(k => k.trim()).filter(Boolean) || [];

        if (disease && keywords.length > 0) {
          // Find or create disease in DB
          let { data: existingDisease } = await supabase
            .from('diseases')
            .select('id, name')
            .eq('name', disease)
            .maybeSingle();

          if (!existingDisease) {
            // Determine severity based on category
            const severityMap: Record<string, string> = {
              'Emerging Infectious Diseases': 'critical',
              'Healthcare-Associated Infections': 'high',
              'Foodborne Outbreaks': 'medium',
              'Waterborne Outbreaks': 'high',
              'Vector-Borne Outbreaks': 'high',
              'Airborne Outbreaks': 'high',
            };
            const severity = severityMap[outbreakCategory] || 'medium';
            const colorMap: Record<string, string> = {
              'critical': '#f87171',
              'high': '#fbbf24',
              'medium': '#66dbe1',
              'low': '#4ade80',
            };

            const { data: newDisease } = await supabase
              .from('diseases')
              .insert({
                name: disease,
                description: pathogen ? `${disease} caused by ${pathogen}` : disease,
                severity_level: severity,
                color_code: colorMap[severity],
                clinical_manifestation: disease,
                spreadsheet_source: true,
              })
              .select()
              .single();
            existingDisease = newDisease;
          } else {
            // Update existing disease with clinical manifestation if needed
            await supabase
              .from('diseases')
              .update({
                clinical_manifestation: disease,
                spreadsheet_source: true,
              })
              .eq('id', existingDisease.id);
          }

          if (existingDisease) {
            // Save pathogen if provided
            if (pathogen) {
              const pathogenTypeMap: Record<string, string> = {
                'Bacteria': 'Bacteria',
                'Virus': 'Virus',
                'Fungus': 'Fungus',
                'other(parasite/protozoan or Helminth)': 'Protozoan',
                'Parasite': 'Parasite',
                'Helminth': 'Helminth',
              };
              const normalizedPathogenType = pathogenTypeMap[pathogenType] || pathogenType || 'Other';

              // Find or create pathogen
              let { data: existingPathogen } = await supabase
                .from('pathogens')
                .select('id')
                .eq('name', pathogen)
                .maybeSingle();

              if (!existingPathogen) {
                const { data: newPathogen } = await supabase
                  .from('pathogens')
                  .insert({
                    name: pathogen,
                    type: normalizedPathogenType,
                    description: `Causative agent of ${disease}`,
                  })
                  .select()
                  .maybeSingle();
                existingPathogen = newPathogen;
              }

              // Link disease to pathogen
              if (existingPathogen) {
                await supabase
                  .from('disease_pathogens')
                  .upsert({
                    disease_id: existingDisease.id,
                    pathogen_id: existingPathogen.id,
                    is_primary: true,
                  }, { onConflict: 'disease_id,pathogen_id' });
              }
            }

            // Link disease to outbreak category
            if (outbreakCategory) {
              const { data: category } = await supabase
                .from('outbreak_categories')
                .select('id')
                .eq('name', outbreakCategory)
                .maybeSingle();

              if (category) {
                await supabase
                  .from('disease_categories')
                  .upsert({
                    disease_id: existingDisease.id,
                    category_id: category.id,
                  }, { onConflict: 'disease_id,category_id' });
              }
            }

            // Use keywords for matching (only store in memory for article matching)
            for (const keyword of keywords) {
              const key = keyword.toLowerCase().trim();
              if (!key) continue;
              
              // Add to in-memory map for matching articles
              if (!keywordMap.has(key)) {
                keywordMap.set(key, []);
              }
              keywordMap.get(key)!.push({
                diseaseId: existingDisease.id,
                diseaseName: disease,
                category: outbreakCategory,
              });
            }
          }
        }
      }
    }

    // Also load existing keywords from database (for diseases already imported)
    const { data: dbKeywords } = await supabase
      .from('disease_keywords')
      .select('keyword, disease_id, diseases!inner(name, id)');
    
    // Get category info for each disease
    const diseaseIds = [...new Set(dbKeywords?.map(kw => kw.disease_id) || [])];
    const { data: diseaseCategories } = await supabase
      .from('disease_categories')
      .select('disease_id, outbreak_categories!inner(name)')
      .in('disease_id', diseaseIds);
    
    const categoryMap = new Map<string, string>();
    diseaseCategories?.forEach(dc => {
      const catName = (dc.outbreak_categories as any)?.name;
      if (catName) {
        categoryMap.set(dc.disease_id, catName);
      }
    });
    
    dbKeywords?.forEach(kw => {
      const key = kw.keyword.toLowerCase();
      if (!keywordMap.has(key)) {
        keywordMap.set(key, []);
      }
      keywordMap.get(key)!.push({
        diseaseId: kw.disease_id,
        diseaseName: (kw.diseases as any).name,
        category: categoryMap.get(kw.disease_id),
      });
    });

    console.log(`Loaded ${keywordMap.size} unique keywords`);

    // STEP 2: Fetch news from multiple sources
    console.log('Step 2: Fetching news articles...');
    const articles: NormalizedArticle[] = [];

    // Helper function to parse RSS feed
    async function parseRSSFeed(url: string, sourceName: string, maxItems = 20): Promise<NormalizedArticle[]> {
      const feedArticles: NormalizedArticle[] = [];
      try {
        let response = await fetch(url);
        // If direct fetch fails, try with CORS proxy
        if (!response.ok) {
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
          response = await fetch(proxyUrl);
        }
        
        if (!response.ok) {
          const proxyUrl2 = `https://cors.isomorphic-git.org/${url}`;
          response = await fetch(proxyUrl2);
        }
        
        if (!response.ok) {
          console.warn(`${sourceName}: Failed to fetch RSS feed (${response.status})`);
          return feedArticles;
        }
        
        const feedText = await response.text();
        
        // Parse RSS XML manually (DOMParser not available in Deno Edge Runtime)
        const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
        const items: Array<{ title: string; description: string; link: string; pubDate: string }> = [];
        
        let match;
        while ((match = itemRegex.exec(feedText)) !== null && items.length < maxItems) {
          const itemContent = match[1];
          
          // Extract fields using regex
          const titleMatch = itemContent.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>|<title[^>]*>(.*?)<\/title>/i);
          const descriptionMatch = itemContent.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description[^>]*>([\s\S]*?)<\/description>/i);
          const linkMatch = itemContent.match(/<link[^>]*>(.*?)<\/link>/i);
          const pubDateMatch = itemContent.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i);
          
          const title = (titleMatch?.[1] || titleMatch?.[2] || '').trim().replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
          const description = (descriptionMatch?.[1] || descriptionMatch?.[2] || '').trim().replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
          const link = (linkMatch?.[1] || '').trim();
          const pubDate = (pubDateMatch?.[1] || new Date().toISOString()).trim();
          
          if (title && link) {
            items.push({ title, description, link, pubDate });
          }
        }
        
        items.forEach(item => {
          feedArticles.push({
            title: item.title,
            content: item.description,
            url: item.link,
            publishedAt: item.pubDate,
            source: sourceName as any,
          });
        });
        
        console.log(`${sourceName}: Added ${items.length} articles from RSS feed`);
      } catch (e) {
        console.warn(`${sourceName} RSS fetch failed:`, e);
      }
      return feedArticles;
    }

    // Fetch WHO Disease Outbreak News (DON) RSS - use the correct feed URL
    try {
      const whoArticles = await parseRSSFeed('https://www.who.int/feeds/entity/csr/don/en/rss.xml', 'WHO', 20);
      articles.push(...whoArticles);
    } catch (e) {
      console.warn('WHO fetch failed:', e);
    }

    // Fetch CDC outbreak data
    try {
      const cdcUrl = 'https://data.cdc.gov/resource/9mfq-cb36.json?$limit=100&$order=submission_date DESC';
      const cdcResponse = await fetch(cdcUrl);
      
      if (cdcResponse.ok) {
        const cdcData = await cdcResponse.json() as Array<{
          submission_date?: string;
          state?: string;
          new_case?: string;
          tot_cases?: string;
          new_death?: string;
          tot_death?: string;
          [key: string]: any;
        }>;
        
        // Convert CDC data to articles format
        // Only include recent records (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        cdcData.forEach(record => {
          if (record.submission_date) {
            const recordDate = new Date(record.submission_date);
            if (recordDate >= thirtyDaysAgo) {
              const title = `CDC Update: ${record.state || 'Unknown State'} - ${record.new_case || 0} new cases`;
              const content = `State: ${record.state || 'Unknown'}, New Cases: ${record.new_case || '0'}, Total Cases: ${record.tot_cases || '0'}, New Deaths: ${record.new_death || '0'}, Total Deaths: ${record.tot_death || '0'}`;
              articles.push({
                title,
                content,
                url: `https://data.cdc.gov/resource/9mfq-cb36.json?submission_date=${record.submission_date}&state=${record.state || ''}`,
                publishedAt: record.submission_date,
                source: 'CDC',
              });
            }
          }
        });
        console.log(`CDC: Added ${cdcData.filter(r => r.submission_date && new Date(r.submission_date) >= thirtyDaysAgo).length} articles from CDC data`);
      } else {
        console.warn('CDC fetch failed:', cdcResponse.status);
      }
    } catch (e) {
      console.warn('CDC fetch failed:', e);
    }

    // Fetch BBC Health RSS
    try {
      const bbcArticles = await parseRSSFeed('https://feeds.bbci.co.uk/news/health/rss.xml', 'BBC Health', 20);
      articles.push(...bbcArticles);
    } catch (e) {
      console.warn('BBC Health fetch failed:', e);
    }

    // Fetch Reuters Health RSS
    try {
      const reutersArticles = await parseRSSFeed('https://www.reutersagency.com/feed/?best-topics=health&post_type=best', 'Reuters Health', 20);
      articles.push(...reutersArticles);
    } catch (e) {
      // Try alternative Reuters health RSS feed
      try {
        const reutersArticles2 = await parseRSSFeed('https://www.reuters.com/rssFeed/health', 'Reuters Health', 20);
        articles.push(...reutersArticles2);
      } catch (e2) {
        console.warn('Reuters Health fetch failed:', e2);
      }
    }

    // Fetch ProMED-mail RSS
    try {
      const promadArticles = await parseRSSFeed('https://promedmail.org/wp-json/promed/v1/posts', 'ProMED-mail', 20);
      // ProMED might use JSON API instead of RSS, handle both
      if (promadArticles.length === 0) {
        // Try JSON API format
        const promadResponse = await fetch('https://promedmail.org/wp-json/promed/v1/posts?per_page=20');
        if (promadResponse.ok) {
          const promadData = await promadResponse.json();
          if (Array.isArray(promadData)) {
            promadData.forEach((post: any) => {
              if (post.title && post.link) {
                articles.push({
                  title: post.title.rendered || post.title,
                  content: post.content?.rendered || post.excerpt?.rendered || '',
                  url: post.link || post.url,
                  publishedAt: post.date || new Date().toISOString(),
                  source: 'ProMED-mail',
                });
              }
            });
            console.log(`ProMED-mail: Added ${promadData.length} articles from JSON API`);
          }
        }
      } else {
        articles.push(...promadArticles);
      }
    } catch (e) {
      console.warn('ProMED-mail fetch failed:', e);
    }

    // Fetch Google News for top keywords (limit to avoid rate limits)
    // Use global search instead of US-only to get international coverage
    const topKeywords = Array.from(keywordMap.keys()).slice(0, 15); // Reduced to 15 to avoid rate limits
    console.log(`Fetching Google News for ${topKeywords.length} keywords: ${topKeywords.join(', ')}`);
    for (let i = 0; i < topKeywords.length; i++) {
      const keyword = topKeywords[i];
      try {
        // Increased delay to 3 seconds between requests to respect RSS2JSON rate limits
        // Also add exponential backoff if we hit rate limits
        const delay = i === 0 ? 0 : 3000; // No delay for first request, 3 seconds for others
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Build Google News RSS URL - use global search for international coverage
        const searchQuery = encodeURIComponent(keyword + ' outbreak');
        // Remove gl=US and ceid=US:en to get global results
        const rssUrl = `https://news.google.com/rss/search?q=${searchQuery}&hl=en`;
        // Double-encode the RSS URL for the proxy
        const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
        
        let response = await fetch(proxyUrl);
        let retries = 0;
        const maxRetries = 2;
        
        // Retry logic for rate limit errors
        while (response.status === 429 && retries < maxRetries) {
          retries++;
          const backoffDelay = Math.pow(2, retries) * 5000; // Exponential backoff: 10s, 20s
          console.warn(`Google News (${keyword}): Rate limited (429). Retrying after ${backoffDelay/1000}s (attempt ${retries}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          response = await fetch(proxyUrl);
        }
        
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'ok' && data.items && Array.isArray(data.items)) {
            // Keep 5 articles per keyword but reduce total keywords to avoid rate limits
            const itemsAdded = data.items.slice(0, 5).forEach((item: any) => {
              if (item.title && item.link) {
                articles.push({
                  title: item.title || '',
                  content: item.description || item.content || '',
                  url: item.link || '',
                  publishedAt: item.pubDate || new Date().toISOString(),
                  source: 'Google News',
                });
              }
            });
            console.log(`Google News (${keyword}): Added ${Math.min(5, data.items.length)} articles`);
          } else {
            console.warn(`Google News (${keyword}): Invalid response format`, data.status);
          }
        } else {
          const errorText = await response.text();
          console.warn(`Google News (${keyword}): HTTP ${response.status} - ${errorText.substring(0, 100)}`);
          // If we still get rate limited after retries, skip remaining keywords to avoid more failures
          if (response.status === 429) {
            console.warn(`Google News: Rate limit still active after retries. Skipping remaining ${topKeywords.length - i - 1} keywords to avoid further rate limits.`);
            break; // Stop fetching more keywords to avoid hitting rate limit repeatedly
          }
        }
      } catch (e) {
        console.warn(`Google News fetch failed for ${keyword}:`, e);
      }
    }

    console.log(`Fetched ${articles.length} articles`);
    
    // Log sample of fetched articles for debugging
    if (articles.length > 0) {
      console.log(`Sample articles: ${articles.slice(0, 3).map(a => a.title.substring(0, 60)).join('; ')}`);
    }

    // STEP 3: Match articles to keywords
    console.log('Step 3: Matching articles to diseases...');
    const matchedArticles: Array<NormalizedArticle & { matches: KeywordMatch[] }> = [];
    
    console.log(`Sample keywords for matching: ${Array.from(keywordMap.keys()).slice(0, 10).join(', ')}`);

    // Patterns to identify academic/research papers that should be excluded
    const academicPatterns = [
      /^(Combining|Using|Application of|Novel|Development of|Evaluation of|Assessment of|Analysis of)/i,
      /(machine learning|deep learning|neural network|algorithm|modeling|simulation|optimization|methodology|research methodology)/i,
      /(journal of|journal|nature|science|bmc|pubmed|arxiv|doi:|peer reviewed|peer-reviewed)/i,
      /(within-host|phylogenetic|genomic analysis|sequencing|evolution|virulence factors|molecular)/i,
      /(study|research|paper|article|publication|manuscript)/i,
      /(patients were|we examined|we investigated|we analyzed|we developed|we propose)/i,
    ];
    
    // Keywords that indicate active outbreak reporting (not research)
    const activeOutbreakIndicators = [
      /(cases|outbreak|confirmed|reported|detected|declared|emergency|alert)/i,
      /(death|deaths|fatal|fatality|hospitalized|patients|infected)/i,
      /(spread|surge|increase|rise|spike|epidemic|pandemic)/i,
      /(country:|state:|city:|region:|location:|in [A-Z][a-z]+)/, // Location mentions
    ];

    for (const article of articles) {
      const searchText = (article.title + ' ' + article.content).toLowerCase();
      const titleLower = article.title.toLowerCase();
      
      // Skip academic/research papers
      let isAcademic = false;
      for (const pattern of academicPatterns) {
        if (pattern.test(article.title) || pattern.test(article.content.substring(0, 500))) {
          // Check if it also lacks active outbreak indicators (likely pure research)
          const hasActiveIndicators = activeOutbreakIndicators.some(indicator => 
            indicator.test(article.title) || indicator.test(article.content.substring(0, 1000))
          );
          
          // If it's clearly academic/research AND lacks strong active outbreak language, skip it
          if (!hasActiveIndicators) {
            console.log(`Skipping academic/research paper: "${article.title.substring(0, 80)}"`);
            isAcademic = true;
            break;
          }
        }
      }
      
      if (isAcademic) continue;

      const matches: KeywordMatch[] = [];

      for (const [keyword, diseases] of keywordMap.entries()) {
        if (searchText.includes(keyword)) {
          // Calculate confidence
          const occurrences = (searchText.match(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
          const inTitle = article.title.toLowerCase().includes(keyword);
          let confidence = 0.5;
          if (inTitle) confidence += 0.2;
          if (occurrences > 1) confidence += 0.15;
          if (keyword.length > 6) confidence += 0.15;
          confidence = Math.min(confidence, 0.95);

          diseases.forEach(disease => {
            matches.push({
              keyword,
              diseaseId: disease.diseaseId,
              diseaseName: disease.diseaseName,
              category: disease.category,
              confidence,
            });
          });
        }
      }

      if (matches.length > 0) {
        matchedArticles.push({ ...article, matches });
      }
    }

    console.log(`Matched ${matchedArticles.length} articles`);

    // STEP 4: Extract locations and geocode
    console.log('Step 4: Extracting and geocoding locations...');
    
    // Load comprehensive countries dataset from reliable JSON source
    // This gives us many more countries than what's in the database
    let comprehensiveCountries: Array<{ name: string; code: string }> = [];
    try {
      // Using a reliable countries dataset (ISO 3166 standard)
      const countriesResponse = await fetch('https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json');
      if (countriesResponse.ok) {
        const countriesData = await countriesResponse.json() as Array<{ name: string; 'alpha-2': string }>;
        comprehensiveCountries = countriesData.map(c => ({
          name: c.name,
          code: c['alpha-2'],
        }));
        console.log(`Loaded ${comprehensiveCountries.length} countries from comprehensive dataset`);
      }
    } catch (e) {
      console.warn('Failed to load comprehensive countries dataset, using database countries only:', e);
    }
    
    // Also load all countries from database to build patterns dynamically
    const { data: dbCountries } = await supabase
      .from('countries')
      .select('name, code');
    
    // Merge comprehensive dataset with database countries (database takes priority for names)
    const allCountries = new Map<string, { name: string; code: string }>();
    
    // First add database countries
    dbCountries?.forEach(c => {
      allCountries.set(c.name.toLowerCase(), { name: c.name, code: c.code });
    });
    
    // Then add comprehensive dataset countries (skip if already in database)
    comprehensiveCountries.forEach(c => {
      const key = c.name.toLowerCase();
      if (!allCountries.has(key)) {
        allCountries.set(key, c);
      }
    });
    
    const allCountriesArray = Array.from(allCountries.values());
    console.log(`Total countries available for matching: ${allCountriesArray.length}`);
    
    const countryPatterns: Record<string, RegExp> = {};
    const countryNameMap: Record<string, string> = {}; // Maps variations to canonical name
    
    // Build patterns from all countries (comprehensive + database)
    allCountriesArray.forEach(c => {
      const name = c.name;
      const code = c.code;
      const nameLower = name.toLowerCase();
      
      // Create pattern variations
      const variations: string[] = [name];
      
      // Add common variations
      if (name === 'United States') {
        variations.push('USA', 'US', 'United States of America');
      } else if (name === 'Democratic Republic of the Congo' || name === 'Democratic Republic of Congo') {
        variations.push('DRC', 'Congo', 'DR Congo');
      } else if (name === 'United Kingdom') {
        variations.push('UK', 'Britain', 'Great Britain', 'England');
      } else if (name === 'Russian Federation') {
        variations.push('Russia');
      } else if (name === 'South Korea') {
        variations.push('Korea', 'South Korea');
      } else if (name === 'North Korea') {
        variations.push('North Korea', 'DPRK');
      }
      
      // Create regex pattern
      const pattern = new RegExp(`\\b(${variations.join('|')})\\b`, 'i');
      countryPatterns[name] = pattern;
      
      // Map all variations to canonical name
      variations.forEach(v => {
        countryNameMap[v.toLowerCase()] = name;
      });
      
      // Also map by country code
      if (code) {
        countryNameMap[code.toLowerCase()] = name;
      }
    });

    async function extractAndGeocode(article: NormalizedArticle): Promise<{ country?: string; lat?: number; lng?: number; countryCode?: string }> {
      const text = article.title + ' ' + article.content;
      let country: string | undefined;
      let countryCode: string | undefined;
      let lat: number | undefined;
      let lng: number | undefined;

      // Strategy 0: Recognize US states and Canadian provinces and map to their countries
      // Only trigger if state is mentioned in proximity to outbreak-related keywords
      const usStates: Record<string, boolean> = {
        'alabama': true, 'alaska': true, 'arizona': true, 'arkansas': true, 'california': true,
        'colorado': true, 'connecticut': true, 'delaware': true, 'florida': true, 'georgia': true,
        'hawaii': true, 'idaho': true, 'illinois': true, 'indiana': true, 'iowa': true,
        'kansas': true, 'kentucky': true, 'louisiana': true, 'maine': true, 'maryland': true,
        'massachusetts': true, 'michigan': true, 'minnesota': true, 'mississippi': true, 'missouri': true,
        'montana': true, 'nebraska': true, 'nevada': true, 'new hampshire': true, 'new jersey': true,
        'new mexico': true, 'new york': true, 'north carolina': true, 'north dakota': true, 'ohio': true,
        'oklahoma': true, 'oregon': true, 'pennsylvania': true, 'rhode island': true, 'south carolina': true,
        'south dakota': true, 'tennessee': true, 'texas': true, 'utah': true, 'vermont': true,
        'virginia': true, 'washington': true, 'west virginia': true, 'wisconsin': true, 'wyoming': true,
        'district of columbia': true, 'washington dc': true, 'dc': true,
      };
      
      const textLowerForState = text.toLowerCase();
      let detectedState: string | undefined;
      // Only set US as country if state appears near outbreak keywords (in title or within 50 chars)
      // This prevents false positives when state is mentioned but outbreak is elsewhere
      const outbreakKeywords = ['outbreak', 'cases', 'confirmed', 'reported', 'detected', 'cases'];
      const hasOutbreakContext = outbreakKeywords.some(keyword => textLowerForState.includes(keyword));
      
      for (const [stateName, _] of Object.entries(usStates)) {
        if (textLowerForState.includes(stateName)) {
          // Check if state appears in title (more reliable) or near outbreak keywords
          const stateIndex = textLowerForState.indexOf(stateName);
          const titleLower = article.title.toLowerCase();
          const inTitle = titleLower.includes(stateName);
          
          // If state is in title or near outbreak keyword, it's likely the location
          if (inTitle || hasOutbreakContext) {
            // Additional check: look for context around the state mention
            const stateContext = textLowerForState.substring(Math.max(0, stateIndex - 30), Math.min(textLowerForState.length, stateIndex + stateName.length + 30));
            const hasLocationContext = /(?:in|at|near|confirmed|reported|outbreak|cases)\s+/.test(stateContext);
            
            if (hasLocationContext || inTitle) {
              country = 'United States';
              countryCode = 'US';
              detectedState = stateName;
              // We'll try to geocode the city/state combination later for better coordinates
              break;
            }
          }
        }
      }
      
      // If we found a US state, try to geocode the full location (city + state) for better coordinates
      if (country === 'United States' && detectedState && opencageKey) {
        // Try to extract city name from patterns like "outbreak in Fort Collins" or "in [City]"
        // Prioritize patterns that come after keywords like "outbreak", "in", etc.
        const cityPatterns = [
          /(?:outbreak|cases|reported|detected|confirmed)\s+(?:in|at|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
          /(?:in|at|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        ];
        
        for (const pattern of cityPatterns) {
          const match = text.match(pattern);
          if (match) {
            const potentialCity = match[1]?.trim();
            if (potentialCity && 
                potentialCity.toLowerCase() !== detectedState.toLowerCase() &&
                potentialCity.length > 2) {
              // Try geocoding city with state for better results
              try {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const locationQuery = `${potentialCity}, ${detectedState.charAt(0).toUpperCase() + detectedState.slice(1)}, USA`;
                const geocodeUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(locationQuery)}&key=${opencageKey}&limit=1`;
                const geocodeRes = await fetch(geocodeUrl);
                if (geocodeRes.ok) {
                  const geocodeData = await geocodeRes.json();
                  const result = geocodeData.results?.[0];
                  if (result?.geometry && result.components?.country_code?.toUpperCase() === 'US') {
                    lat = result.geometry.lat;
                    lng = result.geometry.lng;
                    console.log(`Geocoded "${locationQuery}" to ${lat}, ${lng}`);
                    break;
                  }
                }
              } catch (e) {
                // Continue trying other patterns
                continue;
              }
            }
          }
          if (lat && lng) break;
        }
      }

      // Strategy 1: Enhanced country matching - prioritize title patterns
      const titleLower = article.title.toLowerCase();
      
      // Priority 1: Check for "Country:" or "Country -" pattern at start of title (very common in outbreak news)
      // Pattern examples: "Mexico: Brucellosis cases increase" or "Mexico - Dengue outbreak"
      const titlePrefixPattern = /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)[:\-]/;
      const titlePrefixMatch = article.title.match(titlePrefixPattern);
      if (titlePrefixMatch) {
        const potentialCountry = titlePrefixMatch[1].trim();
        // Check if this matches any country from comprehensive dataset (case-insensitive, substring match)
        for (const c of allCountriesArray) {
          const countryLower = c.name.toLowerCase();
          const potentialLower = potentialCountry.toLowerCase();
          
          // Exact match or country name contains the potential (for cases like "Mexico" matching "Mexico")
          if (potentialLower === countryLower || 
              countryLower.includes(potentialLower) || 
              potentialLower.includes(countryLower)) {
            country = c.name;
            countryCode = c.code;
            console.log(`Found country from title prefix pattern: "${potentialCountry}" -> ${c.name}`);
            break;
          }
        }
      }
      
      // Priority 2: Use regex patterns from database countries (check title first)
      if (!country) {
        for (const [countryName, pattern] of Object.entries(countryPatterns)) {
          // If country appears in title, it's likely the primary location - override US state if needed
          if (pattern.test(titleLower)) {
            if (countryName !== 'United States' || !country) {
              country = countryName;
              break;
            }
          } else if (pattern.test(text.toLowerCase())) {
            // If in body text, only use if we don't have a country yet, or if it's not US
            if (!country || (country === 'United States' && countryName !== 'United States')) {
              country = countryName;
              break;
            }
          }
        }
      }
      
      // Priority 3: Case-insensitive substring matching for country names (more aggressive)
      // Check title first for highest priority - using comprehensive dataset
      if (!country) {
        for (const c of allCountriesArray) {
          const countryLower = c.name.toLowerCase();
          
          // Check if country name appears anywhere in title (substring match - more lenient)
          // Also check for whole word match for better accuracy
          const wholeWordPattern = new RegExp(`\\b${countryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (titleLower.includes(countryLower) || wholeWordPattern.test(titleLower)) {
            country = c.name;
            countryCode = c.code;
            console.log(`Found country from title substring match: ${c.name}`);
            break;
          }
        }
      }
      
      // Priority 4: Check body text if title didn't yield results - using comprehensive dataset
      if (!country) {
        for (const c of allCountriesArray) {
          const countryLower = c.name.toLowerCase();
          // Check if country name appears in text (substring match - more lenient than before)
          const wholeWordPattern = new RegExp(`\\b${countryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (text.toLowerCase().includes(countryLower) || wholeWordPattern.test(text.toLowerCase())) {
            country = c.name;
            countryCode = c.code;
            console.log(`Found country from body text match: ${c.name}`);
            break;
          }
        }
      }

      // Strategy 2: Try "outbreak in [Location]" pattern - improved regex with comma support
      // Check for international locations even if we've found a US state (may override)
      // Also extract city names like "Jalisco" that might be in the title
      if (true) {
        // Match patterns like "outbreak in [Country]", "cases in [Country]", "reported in [Country]"
        // Also handle comma-separated locations like "in El Fasher, Sudan" or "in Mumbai, India"
        // Enhanced to catch patterns like "increase in Jalisco" or "cases in Jalisco"
        const locationPatterns = [
          // Pattern for "in [City], [Country]" - extract the whole location including country (prioritize this)
          /(?:in|at|near|of)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
          // Pattern for "in [City], [Country]" - single pattern with comma
          /(?:in|at|near|of)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
          // Pattern for "outbreak in [Location]" or "cases in [Location]" (may include comma)
          /(?:outbreak|cases|reported|detected|confirmed|declared|increase)\s+(?:in|at|near|of)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)?)/i,
          // Pattern for "[Location] outbreak" or "[Location] confirms"
          /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+(?:outbreak|cases|reports|confirms)/i,
        ];
        
        let location: string | undefined;
        let extractedCity: string | undefined;
        
        for (const pattern of locationPatterns) {
          const match = text.match(pattern);
          if (match) {
            // Handle patterns that capture both city and country separately
            if (match[2] && match[1]) {
              // Pattern matched "in [City], [Country]" format
              extractedCity = match[1].trim();
              location = `${extractedCity}, ${match[2].trim()}`;
              const possibleCountry = match[2].trim();
              
              // Check if this matches a country from comprehensive dataset
              // Priority: exact match > whole-word match > substring (only if both are single words)
              for (const c of allCountriesArray) {
                const countryNameLower = c.name.toLowerCase();
                const possibleCountryLower = possibleCountry.toLowerCase();
                
                // Priority 1: Exact match (highest priority)
                if (possibleCountryLower === countryNameLower) {
                  if (c.name !== 'United States') {
                    country = c.name;
                    countryCode = c.code;
                  } else if (!country) {
                    country = c.name;
                    countryCode = c.code;
                  }
                  break;
                }
                
                // Priority 2: Whole-word match (more precise)
                const wholeWordPattern = new RegExp(`\\b${possibleCountry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                if (wholeWordPattern.test(c.name)) {
                  // Special case: prevent "Sudan" from matching "South Sudan"
                  // Only accept if it's not a substring of a longer country name
                  if (possibleCountryLower === 'sudan' && countryNameLower.includes('south')) {
                    continue; // Skip "South Sudan" when we have just "Sudan"
                  }
                  if (c.name !== 'United States') {
                    country = c.name;
                    countryCode = c.code;
                  } else if (!country) {
                    country = c.name;
                    countryCode = c.code;
                  }
                  break;
                }
                
                // Priority 3: Substring match (only if both are single words to avoid false matches)
                // Skip if either contains spaces (to avoid "Sudan" matching "South Sudan")
                if (!possibleCountryLower.includes(' ') && !countryNameLower.includes(' ') &&
                    countryNameLower.includes(possibleCountryLower)) {
                  if (c.name !== 'United States') {
                    country = c.name;
                    countryCode = c.code;
                  } else if (!country) {
                    country = c.name;
                    countryCode = c.code;
                  }
                  break;
                }
              }
            } else {
              // Single match group - could be "City, Country" or just "City"
              location = match[1].trim();
              
              // If location contains a comma, try to extract country part
              if (location.includes(',')) {
                const parts = location.split(',').map(p => p.trim());
                extractedCity = parts[0];
                const possibleCountry = parts[parts.length - 1];
                
                // Check if this matches a country from comprehensive dataset
                // Priority: exact match > whole-word match > substring (only if both are single words)
                for (const c of allCountriesArray) {
                  const countryNameLower = c.name.toLowerCase();
                  const possibleCountryLower = possibleCountry.toLowerCase();
                  
                  // Priority 1: Exact match (highest priority)
                  if (possibleCountryLower === countryNameLower) {
                    if (c.name !== 'United States') {
                      country = c.name;
                      countryCode = c.code;
                    } else if (!country) {
                      country = c.name;
                      countryCode = c.code;
                    }
                    break;
                  }
                  
                  // Priority 2: Whole-word match (more precise)
                  const wholeWordPattern = new RegExp(`\\b${possibleCountry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                  if (wholeWordPattern.test(c.name)) {
                    // Special case: prevent "Sudan" from matching "South Sudan"
                    if (possibleCountryLower === 'sudan' && countryNameLower.includes('south')) {
                      continue; // Skip "South Sudan" when we have just "Sudan"
                    }
                    if (c.name !== 'United States') {
                      country = c.name;
                      countryCode = c.code;
                    } else if (!country) {
                      country = c.name;
                      countryCode = c.code;
                    }
                    break;
                  }
                  
                  // Priority 3: Substring match (only if both are single words to avoid false matches)
                  if (!possibleCountryLower.includes(' ') && !countryNameLower.includes(' ') &&
                      countryNameLower.includes(possibleCountryLower)) {
                    if (c.name !== 'United States') {
                      country = c.name;
                      countryCode = c.code;
                    } else if (!country) {
                      country = c.name;
                      countryCode = c.code;
                    }
                    break;
                  }
                }
              } else {
                // Just a city name - store it for later geocoding
                extractedCity = location;
              }
            }
            break;
          }
        }
        
        if (location || extractedCity) {
          // If we found a city but no country yet, try to match country from the full location string
          if (!country && location) {
            // First try exact country matches from comprehensive dataset
            // Priority: exact match > whole-word match > substring
            for (const c of allCountriesArray) {
              const countryLower = c.name.toLowerCase();
              const locationLower = location.toLowerCase();
              
              // Priority 1: Exact match (if location is just the country name)
              if (locationLower === countryLower) {
                country = c.name;
                countryCode = c.code;
                break;
              }
              
              // Priority 2: Whole-word match (more precise)
              const wholeWordPattern = new RegExp(`\\b${countryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
              if (wholeWordPattern.test(locationLower)) {
                // Special case: prevent "Sudan" in location from matching "South Sudan"
                if (locationLower.includes(' sudan') && countryLower.includes('south')) {
                  continue; // Skip "South Sudan" when location has just "Sudan"
                }
                country = c.name;
                countryCode = c.code;
                break;
              }
              
              // Priority 3: Substring match (as last resort, but careful with "Sudan" vs "South Sudan")
              if (locationLower.includes(countryLower)) {
                // Prevent "Sudan" from matching "South Sudan" when location mentions just "Sudan"
                if (locationLower.includes(' sudan') && !locationLower.includes('south') && countryLower.includes('south')) {
                  continue; // Location has "Sudan" but not "South", skip "South Sudan"
                }
                country = c.name;
                countryCode = c.code;
                break;
              }
            }
            
            // Then try pattern matching
            if (!country) {
              for (const [canonicalName, pattern] of Object.entries(countryPatterns)) {
                if (pattern.test(location) || location.toLowerCase().includes(canonicalName.toLowerCase()) || 
                    canonicalName.toLowerCase().includes(location.toLowerCase())) {
                  country = canonicalName;
                  break;
                }
              }
            }
          }
          
          // If we have a city name but no country, and we already detected a country from title prefix, use that
          // Example: "Mexico: Brucellosis cases increase in Jalisco" - Mexico from prefix, Jalisco from this pattern
          if (extractedCity && country && location && !location.includes(',')) {
            // Reconstruct location with country for better geocoding
            location = `${extractedCity}, ${country}`;
          }
          
          // If we found an international location (or any location with comma), geocode it for accurate coordinates
          const isInternationalLocation = country && country !== 'United States';
          if (country && location && (location.includes(',') || isInternationalLocation) && opencageKey && (!lat || !lng)) {
            try {
              await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
              const geocodeUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(location)}&key=${opencageKey}&limit=1`;
              const geocodeRes = await fetch(geocodeUrl);
              if (geocodeRes.ok) {
                const geocodeData = await geocodeRes.json();
                const result = geocodeData.results?.[0];
                if (result?.geometry) {
                  const components = result.components || {};
                  const detectedCountry = components.country;
                  const detectedCountryCode = components.country_code?.toUpperCase();
                  
                  // Verify the geocoded country matches what we extracted
                  if (detectedCountry && detectedCountry.toLowerCase().includes(country.toLowerCase()) ||
                      country.toLowerCase().includes(detectedCountry.toLowerCase())) {
                    lat = result.geometry.lat;
                    lng = result.geometry.lng;
                    if (!countryCode && detectedCountryCode) {
                      countryCode = detectedCountryCode;
                    }
                    console.log(`Geocoded location "${location}" to ${country} (${countryCode}) at ${lat}, ${lng}`);
                  }
                }
              }
            } catch (e) {
              console.warn(`Geocoding failed for location ${location}:`, e);
            }
          }
          
          // If no country match yet, try geocoding the location directly to extract country
          // This is especially useful for locations like "Jalisco" (Mexican state) or "Mexico City"
          // which aren't countries but can be geocoded to get the country
          if (!country && opencageKey && location && location.length > 0) {
            try {
              await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
              const geocodeUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(location)}&key=${opencageKey}&limit=1`;
              const geocodeRes = await fetch(geocodeUrl);
              if (geocodeRes.ok) {
                const geocodeData = await geocodeRes.json();
                const result = geocodeData.results?.[0];
                if (result?.geometry) {
                  // Extract country from geocoding result - OpenCage returns country as a string in components.country
                  const components = result.components || {};
                  const detectedCountry = components.country;
                  const detectedCountryCode = components.country_code?.toUpperCase();
                  
                  if (detectedCountry) {
                    // Check if we have this country in comprehensive dataset first
                    const matchingCountry = allCountriesArray.find(
                      c => c.name.toLowerCase() === detectedCountry.toLowerCase() ||
                           c.code?.toLowerCase() === detectedCountry.toLowerCase() ||
                           c.code?.toLowerCase() === detectedCountryCode?.toLowerCase()
                    );
                    
                    // Use matching country from dataset if found, otherwise use geocoded country name
                    // (it will be created in the database later if needed)
                    country = matchingCountry?.name || detectedCountry;
                    countryCode = matchingCountry?.code || detectedCountryCode;
                    lat = result.geometry.lat;
                    lng = result.geometry.lng;
                    
                    console.log(`Geocoded location "${location}" to ${country} (${countryCode}) at ${lat}, ${lng}`);
                  } else if (detectedCountryCode) {
                    // If we have country code but not name, try to find country by code
                    const matchingCountry = allCountriesArray.find(
                      c => c.code?.toLowerCase() === detectedCountryCode.toLowerCase()
                    );
                    if (matchingCountry) {
                      country = matchingCountry.name;
                      countryCode = matchingCountry.code;
                      lat = result.geometry.lat;
                      lng = result.geometry.lng;
                      console.log(`Geocoded location "${location}" to ${country} (${countryCode}) at ${lat}, ${lng}`);
                    } else {
                      // We have a country code but country doesn't exist in DB yet
                      // Will be created later when we process the country
                      countryCode = detectedCountryCode;
                      lat = result.geometry.lat;
                      lng = result.geometry.lng;
                      // Try to get country name from OpenCage's formatted address
                      country = components.country || components.country_code?.toUpperCase() || undefined;
                      console.log(`Geocoded location "${location}" to unknown country (${countryCode}) at ${lat}, ${lng}`);
                    }
                  }
                }
              }
            } catch (e) {
              console.warn(`Geocoding failed for location ${location}:`, e);
            }
          }
        }
      }

      // Strategy 3: Extract potential location mentions (capitalized words)
      // This helps catch city/region names like "Jalisco" that appear in titles
      if (!country) {
        // First, try to extract capitalized words from title (higher priority)
        const titleWords = article.title.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g) || [];
        // Then from body text
        const bodyWords = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g) || [];
        
        // Combine and prioritize title words, but remove duplicates
        const allLocationWords = [...new Set([...titleWords, ...bodyWords])];
        
        if (allLocationWords.length > 0 && opencageKey) {
          // Try geocoding the first few potential location mentions (prioritize title words)
          // Limit to 3 to avoid too many API calls
          for (const potentialLocation of allLocationWords.slice(0, 3)) {
            try {
              await new Promise(resolve => setTimeout(resolve, 1200)); // Rate limit
              const geocodeUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(potentialLocation)}&key=${opencageKey}&limit=1`;
              const geocodeRes = await fetch(geocodeUrl);
              if (geocodeRes.ok) {
                const geocodeData = await geocodeRes.json();
                const result = geocodeData.results?.[0];
                if (result?.geometry) {
                  const components = result.components || {};
                  const detectedCountry = components.country;
                  const detectedCountryCode = components.country_code?.toUpperCase();
                  // Check if this looks like a valid country result
                  // OpenCage returns confidence as a number, but we'll be lenient
                  const confidence = result.confidence || 0;
                  if (detectedCountry && confidence >= 5) {
                    // Only use if we have a country and reasonable confidence
                    const matchingCountry = allCountriesArray.find(
                      c => c.name.toLowerCase() === detectedCountry.toLowerCase() ||
                           c.code?.toLowerCase() === detectedCountry.toLowerCase() ||
                           c.code?.toLowerCase() === detectedCountryCode?.toLowerCase()
                    );
                    
                    country = matchingCountry?.name || detectedCountry;
                    countryCode = matchingCountry?.code || detectedCountryCode;
                    lat = result.geometry.lat;
                    lng = result.geometry.lng;
                    console.log(`Geocoded location "${potentialLocation}" to ${country} (${countryCode}) at ${lat}, ${lng}`);
                    break;
                  } else if (detectedCountryCode && confidence >= 5) {
                    // Try to find country by code if we have it
                    const matchingCountry = allCountriesArray.find(
                      c => c.code?.toLowerCase() === detectedCountryCode.toLowerCase()
                    );
                    if (matchingCountry) {
                      country = matchingCountry.name;
                      countryCode = matchingCountry.code;
                      lat = result.geometry.lat;
                      lng = result.geometry.lng;
                      console.log(`Geocoded location "${potentialLocation}" to ${country} (${countryCode}) at ${lat}, ${lng}`);
                      break;
                    }
                  }
                }
              }
            } catch (e) {
              // Continue to next potential location
              continue;
            }
          }
        }
      }

      // Strategy 4: Geocode the country if we found it but don't have coordinates
      if (country && (!lat || !lng) && opencageKey) {
        try {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
          const geocodeUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(country)}&key=${opencageKey}&limit=1`;
          const geocodeRes = await fetch(geocodeUrl);
          if (geocodeRes.ok) {
            const geocodeData = await geocodeRes.json();
            const result = geocodeData.results?.[0];
            if (result?.geometry) {
              lat = result.geometry.lat;
              lng = result.geometry.lng;
              if (!countryCode) {
                const components = result.components;
                countryCode = components?.country_code?.toUpperCase();
              }
            }
          }
        } catch (e) {
          console.warn(`Geocoding failed for ${country}:`, e);
        }
      }

      // If we still don't have coordinates but have a country, try to get coordinates from country name
      if (country && (!lat || !lng)) {
        // Try one more time to geocode the country name
        if (opencageKey) {
          try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const geocodeUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(country)}&key=${opencageKey}&limit=1`;
            const geocodeRes = await fetch(geocodeUrl);
            if (geocodeRes.ok) {
              const geocodeData = await geocodeRes.json();
              const result = geocodeData.results?.[0];
              if (result?.geometry) {
                lat = result.geometry.lat;
                lng = result.geometry.lng;
                if (!countryCode) {
                  const components = result.components;
                  countryCode = components?.country_code?.toUpperCase();
                }
              }
            }
          } catch (e) {
            console.warn(`Final geocoding attempt failed for ${country}:`, e);
          }
        }
        
        // If still no coordinates, use approximate country center coordinates
        if (!lat || !lng) {
          const approximateCoords: Record<string, [number, number]> = {
            'United States': [39.8283, -98.5795],
            'India': [20.5937, 78.9629],
            'Brazil': [-14.2350, -51.9253],
            'China': [35.8617, 104.1954],
            'Nigeria': [9.0820, 8.6753],
            'Bangladesh': [23.6850, 90.3563],
            'Russia': [61.5240, 105.3188],
            'Indonesia': [-0.7893, 113.9213],
            'Pakistan': [30.3753, 69.3451],
            'Mexico': [23.6345, -102.5528],
            'Philippines': [12.8797, 121.7740],
            'Vietnam': [14.0583, 108.2772],
            'Ethiopia': [9.1450, 38.7667],
            'Egypt': [26.8206, 30.8025],
            'Iran': [32.4279, 53.6880],
            'Turkey': [38.9637, 35.2433],
            'Germany': [51.1657, 10.4515],
            'Thailand': [15.8700, 100.9925],
            'United Kingdom': [55.3781, -3.4360],
            'France': [46.2276, 2.2137],
            'Italy': [41.8719, 12.5674],
            'Spain': [40.4637, -3.7492],
            'Sudan': [12.8628, 30.2176],
            'Yemen': [15.5527, 48.5164],
            'Kenya': [-0.0236, 37.9062],
            'South Africa': [-30.5595, 22.9375],
            'Singapore': [1.3521, 103.8198],
            'Democratic Republic of Congo': [-4.0383, 21.7587],
            'Uganda': [1.3733, 32.2903],
            'Tanzania': [-6.3690, 34.8888],
            'Ghana': [7.9465, -1.0232],
            'Algeria': [28.0339, 1.6596],
            'Morocco': [31.7917, -7.0926],
            'Iraq': [33.2232, 43.6793],
            'Afghanistan': [33.9391, 67.7100],
            'Saudi Arabia': [23.8859, 45.0792],
            'Argentina': [-38.4161, -63.6167],
            'Peru': [-9.1900, -75.0152],
            'Colombia': [4.5709, -74.2973],
            'Chile': [-35.6751, -71.5430],
            'Venezuela': [6.4238, -66.5897],
            'Ukraine': [48.3794, 31.1656],
            'Poland': [51.9194, 19.1451],
            'Malaysia': [4.2105, 101.9758],
            'Myanmar': [21.9162, 95.9560],
            'Cambodia': [12.5657, 104.9910],
            'Laos': [19.8563, 102.4955],
            'Mozambique': [-18.6657, 35.5296],
            'Madagascar': [-18.7669, 46.8691],
            'Cameroon': [7.3697, 12.3547],
            'Ivory Coast': [7.5400, -5.5471],
            'Mali': [17.5707, -3.9962],
            'Burkina Faso': [12.2383, -1.5616],
            'Niger': [17.6078, 8.0817],
            'Zambia': [-13.1339, 27.8493],
            'Malawi': [-13.2543, 34.3015],
            'Zimbabwe': [-19.0154, 29.1549],
            'Angola': [-11.2027, 17.8739],
            'Senegal': [14.4974, -14.4524],
            'Guinea': [9.9456, -9.6966],
            'Benin': [9.3077, 2.3158],
            'Rwanda': [-1.9403, 29.8739],
            'Burundi': [-3.3731, 29.9189],
            'Tunisia': [33.8869, 9.5375],
            'Libya': [26.3351, 17.2283],
            'Jordan': [30.5852, 36.2384],
            'Lebanon': [33.8547, 35.8623],
            'Syria': [34.8021, 38.9968],
            'Oman': [21.5126, 55.9233],
            'United Arab Emirates': [23.4241, 53.8478],
            'Kuwait': [29.3117, 47.4818],
            'Qatar': [25.3548, 51.1839],
            'Bahrain': [25.9304, 50.6378],
            'Israel': [31.0461, 34.8516],
            'Palestine': [31.9522, 35.2332],
            'Kazakhstan': [48.0196, 66.9237],
            'Uzbekistan': [41.3775, 64.5853],
            'Azerbaijan': [40.1431, 47.5769],
            'Georgia': [42.3154, 43.3569],
            'Armenia': [40.0691, 45.0382],
            'Sri Lanka': [7.8731, 80.7718],
            'Nepal': [28.3949, 84.1240],
            'Bhutan': [27.5142, 90.4336],
            'Mongolia': [46.8625, 103.8467],
            'North Korea': [40.3399, 127.5101],
            'South Korea': [35.9078, 127.7669],
            'Japan': [36.2048, 138.2529],
            'Taiwan': [23.6978, 120.9605],
            'Australia': [-25.2744, 133.7751],
            'New Zealand': [-40.9006, 174.8860],
            'Papua New Guinea': [-6.3150, 143.9555],
            'Fiji': [-16.7784, 178.0650],
            'Haiti': [18.9712, -72.2852],
            'Dominican Republic': [18.7357, -70.1627],
            'Cuba': [21.5218, -77.7812],
            'Jamaica': [18.1096, -77.2975],
            'Guatemala': [15.7835, -90.2308],
            'Honduras': [15.2000, -86.2419],
            'El Salvador': [13.7942, -88.8965],
            'Nicaragua': [12.2650, -85.2072],
            'Costa Rica': [9.7489, -83.7534],
            'Panama': [8.5380, -80.7821],
            'Ecuador': [-1.8312, -78.1834],
            'Bolivia': [-16.2902, -63.5887],
            'Paraguay': [-23.4425, -58.4438],
            'Uruguay': [-32.5228, -55.7658],
            'Guyana': [4.8604, -58.9302],
            'Suriname': [3.9193, -56.0278],
            'Trinidad and Tobago': [10.6918, -61.2225],
            'Belize': [17.1899, -88.4976],
            'Congo': [-0.2280, 15.8277],
            'Gabon': [-0.8037, 11.6094],
            'Equatorial Guinea': [1.6508, 10.2679],
            'Central African Republic': [6.6111, 20.9394],
            'Chad': [15.4542, 18.7322],
            'Mauritania': [21.0079, -10.9408],
            'Gambia': [13.4432, -15.3101],
            'Guinea-Bissau': [11.8037, -15.1804],
            'Sierra Leone': [8.4606, -11.7799],
            'Liberia': [6.4281, -9.4295],
            'Togo': [8.6195, 0.8248],
            'Eritrea': [15.1794, 39.7823],
            'Djibouti': [11.8251, 42.5903],
            'Somalia': [5.1521, 46.1996],
            'Comoros': [-11.6455, 43.3333],
            'Mauritius': [-20.3484, 57.5522],
            'Seychelles': [-4.6796, 55.4920],
            'Botswana': [-22.3285, 24.6849],
            'Namibia': [-22.9576, 18.4904],
            'Lesotho': [-29.6100, 28.2336],
            'Swaziland': [-26.5225, 31.4659],
            'Albania': [41.1533, 20.1683],
            'Bosnia and Herzegovina': [43.9159, 17.6791],
            'Croatia': [45.1000, 15.2000],
            'Serbia': [44.0165, 21.0059],
            'Montenegro': [42.7087, 19.3744],
            'North Macedonia': [41.6086, 21.7453],
            'Kosovo': [42.6026, 20.9030],
            'Slovenia': [46.1512, 14.9955],
            'Slovakia': [48.6690, 19.6990],
            'Czech Republic': [49.8175, 15.4730],
            'Hungary': [47.1625, 19.5033],
            'Romania': [45.9432, 24.9668],
            'Bulgaria': [42.7339, 25.4858],
            'Greece': [39.0742, 21.8243],
            'Moldova': [47.4116, 28.3699],
            'Belarus': [53.7098, 27.9534],
            'Lithuania': [55.1694, 23.8813],
            'Latvia': [56.8796, 24.6032],
            'Estonia': [58.5953, 25.0136],
            'Finland': [61.9241, 25.7482],
            'Sweden': [60.1282, 18.6435],
            'Norway': [60.4720, 8.4689],
            'Denmark': [56.2639, 9.5018],
            'Iceland': [64.9631, -19.0208],
            'Ireland': [53.4129, -8.2439],
            'Portugal': [39.3999, -8.2245],
            'Switzerland': [46.8182, 8.2275],
            'Austria': [47.5162, 14.5501],
            'Belgium': [50.5039, 4.4699],
            'Netherlands': [52.1326, 5.2913],
            'Luxembourg': [49.8153, 6.1296],
            'Cyprus': [35.1264, 33.4299],
            'Malta': [35.9375, 14.3754],
            'Monaco': [43.7384, 7.4246],
            'Andorra': [42.5462, 1.6016],
            'San Marino': [43.9424, 12.4578],
            'Liechtenstein': [47.1660, 9.5554],
            'Vatican City': [41.9029, 12.4534],
            'Gaza': [31.3547, 34.3088],
            'West Bank': [31.9522, 35.2332],
            'South Sudan': [6.8770, 31.3070],
            'Congo-Brazzaville': [-0.2280, 15.8277],
            'DRC': [-4.0383, 21.7587],
            'Brunei': [4.5353, 114.7277],
            'Macau': [22.1987, 113.5439],
            'Hong Kong': [22.3193, 114.1694],
            'Maldives': [3.2028, 73.2207],
            'Réunion': [-21.1151, 55.5364],
            'Mayotte': [-12.8275, 45.1662],
            'French Southern Territories': [-49.2804, 69.3486],
            'Saint Helena': [-24.1434, -10.0307],
            'Ascension Island': [-7.9467, -14.3559],
            'Tristan da Cunha': [-37.0686, -12.2777],
          };
          
          if (country) {
            // Try exact match first
            let coords = approximateCoords[country];
            // If no exact match, try case-insensitive match
            if (!coords) {
              const countryLower = country.toLowerCase();
              for (const [key, value] of Object.entries(approximateCoords)) {
                if (key.toLowerCase() === countryLower) {
                  coords = value as [number, number];
                  break;
                }
              }
            }
            
            if (coords) {
              lat = coords[0];
              lng = coords[1];
              console.log(`Using approximate coordinates for ${country}`);
            } else {
              // Last resort: log warning but still try to use country name for geocoding
              console.warn(`No approximate coordinates found for ${country}, geocoding may have failed`);
            }
          }
        }
      }

      // Return location data even if incomplete - we'll still store the article
      if (!country || !lat || !lng) {
        // Log why we couldn't extract location for debugging, but note that article will still be stored
        if (!country) {
          console.log(`Article stored without location: "${article.title.substring(0, 80)}" - Could not identify country (will still be stored)`);
        } else if (!lat || !lng) {
          console.log(`Article stored without coordinates: "${article.title.substring(0, 80)}" - Country: ${country} but no lat/lng (will still be stored)`);
        }
        // Return partial location data - we'll still use this to store the article
        return { country: country || undefined, lat, lng, countryCode };
      }

      return { country, lat, lng, countryCode };
    }

    // STEP 5: Store in database
    console.log('Step 5: Storing data in database...');
    let processedCount = 0;
    let signalCount = 0;
    let skippedNoLocation = 0;
    let skippedNoSource = 0;
    let skippedDuplicate = 0;

    // Get news sources
    const { data: sources } = await supabase.from('news_sources').select('id, name');
    console.log(`Found ${sources?.length || 0} news sources in database`);

    for (const article of matchedArticles) {
      const location = await extractAndGeocode(article);
      const hasLocation = location.country && location.lat && location.lng;
      
      if (!hasLocation) {
        skippedNoLocation++;
        // Continue to store article in news_articles even without location, but skip outbreak signal creation
        console.log(`Storing article without location (no signals will be created): "${article.title.substring(0, 80)}"`);
      }

      // Find or create source
      const sourceName = article.source === 'WHO' ? 'WHO - World Health Organization' :
                        article.source === 'CDC' ? 'CDC - Centers for Disease Control' :
                        article.source === 'BBC Health' ? 'BBC Health' :
                        article.source === 'Reuters Health' ? 'Reuters Health' :
                        article.source === 'ProMED-mail' ? 'ProMED-mail' :
                        'Google News';
      const source = sources?.find(s => {
        // Match source name more flexibly
        const sourceLower = article.source.toLowerCase();
        const dbNameLower = s.name.toLowerCase();
        return dbNameLower.includes(sourceLower) || sourceLower.includes(dbNameLower.split(' ')[0]);
      });
      if (!source) {
        console.warn(`Skipping article - source not found for: ${article.source}`);
        skippedNoSource++;
        continue;
      }

      let country: { id: string; name: string; code: string } | null = null;
      
      // Only process location/country if we have a valid location
      if (hasLocation) {
        // Find or create country
        // Try matching by name first, then by code if available
        let { data: foundCountry } = await supabase
          .from('countries')
          .select('id, name, code')
          .eq('name', location.country!)
          .maybeSingle();
        
        // If not found by name and we have a country code, try matching by code
        if (!foundCountry && location.countryCode) {
          const { data: countryByCode } = await supabase
            .from('countries')
            .select('id, name, code')
            .eq('code', location.countryCode.toUpperCase())
            .maybeSingle();
          foundCountry = countryByCode || undefined;
        }
        
        // Create new country if it doesn't exist
        if (!foundCountry) {
          // Generate a reasonable country code if not provided
          let countryCode = location.countryCode;
          if (!countryCode) {
            // Try to extract from country name (first 2 letters, but only if it makes sense)
            const nameWords = location.country!.split(' ');
            if (nameWords.length === 1 && nameWords[0].length >= 2) {
              countryCode = nameWords[0].substring(0, 2).toUpperCase();
            } else {
              // Use first letters of first two words
              countryCode = nameWords.slice(0, 2).map(w => w[0]).join('').toUpperCase().substring(0, 2);
            }
          }
          
          const { data: newCountry } = await supabase
            .from('countries')
          .insert({
            name: location.country!,
            code: countryCode.toUpperCase(),
              continent: 'Unknown',
              population: 0,
            })
            .select()
            .single();
          foundCountry = newCountry;
          
          if (foundCountry) {
            console.log(`Created new country: ${location.country} (${countryCode})`);
            // Add to dbCountries array for future lookups in this run (if it's an array)
            if (Array.isArray(dbCountries) && location.country) {
              dbCountries.push({ name: location.country, code: countryCode.toUpperCase() });
              // Also update patterns for this new country
              const pattern = new RegExp(`\\b${location.country.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
              countryPatterns[location.country] = pattern;
            }
          }
        }

        country = foundCountry;
      }

      // Store article even without location (deduplicate by URL)
      const { data: newsArticle, error: articleError } = await supabase
        .from('news_articles')
        .upsert({
          source_id: source.id,
          title: article.title,
          content: article.content,
          url: article.url,
          published_at: article.publishedAt,
          location_extracted: hasLocation ? location : null,
          diseases_mentioned: article.matches.map(m => m.diseaseName),
          sentiment_score: -0.5,
          is_verified: false,
        }, {
          onConflict: 'url',
          ignoreDuplicates: false,
        })
        .select()
        .maybeSingle();

      if (articleError || !newsArticle) continue;

      // Only create outbreak signals if we have a valid location and country
      // Articles without location are still stored in news_articles for the news feed
      if (hasLocation && country) {
        // Create outbreak signals for each match
        for (const match of article.matches) {
          // Check for duplicate (same disease + country + within 24h)
          const { data: existing } = await supabase
            .from('outbreak_signals')
            .select('id')
            .eq('disease_id', match.diseaseId)
            .eq('country_id', country.id)
            .gte('detected_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .maybeSingle();

          if (existing) {
            skippedDuplicate++;
            continue;
          }

          // Determine severity based on confidence
          const severity = match.confidence > 0.9 ? 'critical' :
                          match.confidence > 0.75 ? 'high' :
                          match.confidence > 0.6 ? 'medium' : 'low';

          // Extract case count if mentioned
          const caseMatch = article.content.match(/(\d+)\s*(?:case|cases|infection|infections)/i);
          const caseCount = caseMatch ? parseInt(caseMatch[1]) : 0;

          await supabase.from('outbreak_signals').insert({
            article_id: newsArticle.id,
            disease_id: match.diseaseId,
            country_id: country.id,
            latitude: location.lat,
            longitude: location.lng,
            confidence_score: match.confidence,
            case_count_mentioned: caseCount,
            severity_assessment: severity,
            is_new_outbreak: true,
            detected_at: article.publishedAt,
          });

          signalCount++;
        }
      }

      processedCount++;
    }

    console.log(`Processing complete: ${processedCount} articles, ${signalCount} signals created`);

    // Log detailed summary for debugging
    console.log('=== COLLECTION SUMMARY ===');
    console.log(`Total articles fetched: ${articles.length}`);
    console.log(`Articles matched to keywords: ${matchedArticles.length}`);
    console.log(`Articles stored in database: ${processedCount}`);
    console.log(`Articles without location (stored in news only, no signals): ${skippedNoLocation}`);
    console.log(`Articles skipped - no source: ${skippedNoSource}`);
    console.log(`Signals skipped - duplicates: ${skippedDuplicate}`);
    console.log(`Outbreak signals created: ${signalCount}`);
    console.log(`Keywords loaded: ${keywordMap.size}`);
    console.log('========================');

    return new Response(
      JSON.stringify({
        success: true,
        articlesProcessed: processedCount,
        signalsCreated: signalCount,
        keywordsLoaded: keywordMap.size,
        totalArticlesFetched: articles.length,
        articlesMatched: matchedArticles.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

