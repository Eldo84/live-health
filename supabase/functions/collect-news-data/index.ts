import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface NewsArticle {
  source: string;
  title: string;
  content: string;
  url: string;
  publishedAt: string;
  location?: {
    country?: string;
    city?: string;
    lat?: number;
    lng?: number;
  };
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

    const { articles } = await req.json() as { articles: NewsArticle[] };

    if (!articles || !Array.isArray(articles)) {
      return new Response(
        JSON.stringify({ error: 'Invalid input: articles array required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: sources } = await supabase
      .from('news_sources')
      .select('id, name');

    const { data: keywords } = await supabase
      .from('disease_keywords')
      .select('keyword, disease_id, confidence_weight');

    const { data: countries } = await supabase
      .from('countries')
      .select('id, name, code');

    const opencageKey = Deno.env.get('OPENCAGE_API_KEY');
    const processedArticles = [];

    // Function to extract city from article text
    function extractCity(text: string, country?: string): string | null {
      // Common city extraction patterns
      const cityPatterns = [
        // "outbreak in [City]" or "cases in [City]"
        /(?:outbreak|cases|reported|detected|confirmed|spread)\s+(?:in|at|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        // "[City], [Country]" format
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/i,
        // "in [City]" standalone
        /(?:in|at|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      ];

      for (const pattern of cityPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const potentialCity = match[1].trim();
          // Filter out common non-city words
          const nonCityWords = ['the', 'a', 'an', 'outbreak', 'cases', 'reported', 'detected', 'confirmed', 'spread'];
          if (potentialCity.length > 2 && !nonCityWords.includes(potentialCity.toLowerCase())) {
            // If country is known, filter out country names
            if (country && potentialCity.toLowerCase() === country.toLowerCase()) {
              continue;
            }
            return potentialCity;
          }
        }
      }
      return null;
    }

    // Function to geocode city
    async function geocodeCity(cityName: string, countryName?: string): Promise<[number, number] | null> {
      if (!opencageKey) return null;
      
      try {
        // Build query: city only or city + country
        const query = countryName 
          ? `${cityName}, ${countryName}`
          : cityName;
        
        // Rate limiting: wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const geocodeUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${opencageKey}&limit=1`;
        const geocodeRes = await fetch(geocodeUrl);
        
        if (geocodeRes.ok) {
          const geocodeData = await geocodeRes.json();
          const result = geocodeData.results?.[0];
          
          if (result?.geometry) {
            return [result.geometry.lat, result.geometry.lng];
          }
        }
      } catch (e) {
        console.error(`Geocoding failed for ${cityName}:`, e);
      }
      
      return null;
    }

    for (const article of articles) {
      const source = sources?.find(s => s.name.toLowerCase().includes(article.source.toLowerCase()));
      if (!source) continue;

      const detectedDiseases = [];
      const content = (article.title + ' ' + article.content).toLowerCase();
      const fullText = article.title + ' ' + article.content;

      for (const kw of keywords || []) {
        if (content.includes(kw.keyword.toLowerCase())) {
          if (!detectedDiseases.includes(kw.disease_id)) {
            detectedDiseases.push(kw.disease_id);
          }
        }
      }

      if (detectedDiseases.length === 0) continue;

      const diseaseKeywords = detectedDiseases.map(did => {
        const kw = keywords?.find(k => k.disease_id === did && k.keyword_type === 'primary');
        return kw?.keyword || 'unknown';
      });

      // Extract location information
      let locationData = article.location || null;
      let extractedCity: string | null = null;
      let cityCoords: [number, number] | null = null;

      // If location is provided but city is missing, try to extract it
      if (locationData?.country && !locationData.city) {
        extractedCity = extractCity(fullText, locationData.country);
        if (extractedCity && opencageKey) {
          cityCoords = await geocodeCity(extractedCity, locationData.country);
          if (cityCoords) {
            locationData = {
              ...locationData,
              city: extractedCity,
              lat: cityCoords[0],
              lng: cityCoords[1],
            };
          }
        }
      } else if (locationData?.city) {
        extractedCity = locationData.city;
      } else if (!locationData) {
        // Try to extract both city and country from text
        extractedCity = extractCity(fullText);
        if (extractedCity && opencageKey) {
          cityCoords = await geocodeCity(extractedCity);
          if (cityCoords) {
            // Try to get country from geocoding result
            try {
              const geocodeUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(extractedCity)}&key=${opencageKey}&limit=1`;
              const geocodeRes = await fetch(geocodeUrl);
              if (geocodeRes.ok) {
                const geocodeData = await geocodeRes.json();
                const result = geocodeData.results?.[0];
                if (result?.components?.country) {
                  locationData = {
                    country: result.components.country,
                    city: extractedCity,
                    lat: cityCoords[0],
                    lng: cityCoords[1],
                  };
                }
              }
            } catch (e) {
              // Use coordinates without country
              locationData = {
                city: extractedCity,
                lat: cityCoords[0],
                lng: cityCoords[1],
              };
            }
          }
        }
      }

      const { data: insertedArticle, error: articleError } = await supabase
        .from('news_articles')
        .insert({
          source_id: source.id,
          title: article.title,
          content: article.content,
          url: article.url,
          published_at: article.publishedAt,
          location_extracted: locationData,
          diseases_mentioned: diseaseKeywords,
          sentiment_score: -0.5,
          is_verified: false,
        })
        .select()
        .maybeSingle();

      if (articleError || !insertedArticle) continue;

      // Create outbreak signals if we have valid coordinates
      // Prioritize city-level coordinates over country-level
      const hasCityLocation = locationData?.city && locationData?.lat && locationData?.lng;
      const hasCountryLocation = locationData?.country && locationData?.lat && locationData?.lng;
      
      if (hasCityLocation || hasCountryLocation) {
        const matchedCountry = locationData?.country 
          ? countries?.find(c => 
              locationData.country?.toLowerCase().includes(c.name.toLowerCase()) ||
              c.name.toLowerCase().includes(locationData.country?.toLowerCase() || '')
            )
          : null;

        // Create signals even if country not matched, using city coordinates
        const countryId = matchedCountry?.id || null;
        const cityName = locationData?.city || null;

        for (const diseaseId of detectedDiseases) {
          await supabase.from('outbreak_signals').insert({
            article_id: insertedArticle.id,
            disease_id: diseaseId,
            country_id: countryId,
            city: cityName,
            latitude: locationData!.lat!,
            longitude: locationData!.lng!,
            confidence_score: hasCityLocation ? 0.90 : 0.85, // Higher confidence for city-level
            case_count_mentioned: 0,
            severity_assessment: 'medium',
            is_new_outbreak: true,
          });
        }
      }

      processedArticles.push({
        article_id: insertedArticle.id,
        diseases: diseaseKeywords,
        location: locationData || article.location,
        city: extractedCity || locationData?.city || null,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedArticles.length,
        articles: processedArticles,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
