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

    const processedArticles = [];

    for (const article of articles) {
      const source = sources?.find(s => s.name.toLowerCase().includes(article.source.toLowerCase()));
      if (!source) continue;

      const detectedDiseases = [];
      const content = (article.title + ' ' + article.content).toLowerCase();

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

      const { data: insertedArticle, error: articleError } = await supabase
        .from('news_articles')
        .insert({
          source_id: source.id,
          title: article.title,
          content: article.content,
          url: article.url,
          published_at: article.publishedAt,
          location_extracted: article.location || null,
          diseases_mentioned: diseaseKeywords,
          sentiment_score: -0.5,
          is_verified: false,
        })
        .select()
        .maybeSingle();

      if (articleError || !insertedArticle) continue;

      // Only create outbreak signals if we have a valid location
      // Articles without location are still stored in news_articles for the news feed
      const hasLocation = article.location?.country && article.location?.lat && article.location?.lng;
      
      if (hasLocation) {
        const matchedCountry = countries?.find(c => 
          article.location?.country?.toLowerCase().includes(c.name.toLowerCase())
        );

        // Only create signals if we have a country match
        if (matchedCountry) {
          for (const diseaseId of detectedDiseases) {
            await supabase.from('outbreak_signals').insert({
              article_id: insertedArticle.id,
              disease_id: diseaseId,
              country_id: matchedCountry.id,
              latitude: article.location.lat!,
              longitude: article.location.lng!,
              confidence_score: 0.85,
              case_count_mentioned: 0,
              severity_assessment: 'medium',
              is_new_outbreak: true,
            });
          }
        }
      }

      processedArticles.push({
        article_id: insertedArticle.id,
        diseases: diseaseKeywords,
        location: article.location,
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
