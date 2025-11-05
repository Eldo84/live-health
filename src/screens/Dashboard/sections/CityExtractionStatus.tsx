import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

interface CityExtractionData {
  article_id: string;
  article_title: string;
  city: string | null;
  location_extracted: any;
  disease_name: string;
  published_at: string;
}

interface CityStats {
  total_articles: number;
  articles_with_cities: number;
  articles_without_cities: number;
  unique_cities: number;
  cities_list: Array<{ city: string; count: number }>;
}

export const CityExtractionStatus: React.FC = () => {
  const [cityData, setCityData] = useState<CityExtractionData[]>([]);
  const [stats, setStats] = useState<CityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCityData() {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          throw new Error("Missing Supabase configuration");
        }

        // Fetch articles with city information from outbreak_signals
        const queryParams = new URLSearchParams();
        queryParams.set(
          'select',
          '*,news_articles!article_id(title,location_extracted,published_at),diseases!disease_id(name)'
        );
        queryParams.set('city', 'not.is.null');
        queryParams.set('order', 'detected_at.desc');
        queryParams.set('limit', '50');

        const query = `${supabaseUrl}/rest/v1/outbreak_signals?${queryParams.toString()}`;

        const response = await fetch(query, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const data: any[] = await response.json();

        // Transform the data
        const transformed: CityExtractionData[] = data.map((item: any) => {
          const article = Array.isArray(item.news_articles) 
            ? item.news_articles[0] 
            : item.news_articles;
          const disease = Array.isArray(item.diseases) 
            ? item.diseases[0] 
            : item.diseases;

          return {
            article_id: item.article_id,
            article_title: article?.title || 'Unknown',
            city: item.city,
            location_extracted: article?.location_extracted || null,
            disease_name: disease?.name || 'Unknown',
            published_at: article?.published_at || item.detected_at,
          };
        });

        // Calculate statistics
        const cityCounts: Record<string, number> = {};
        transformed.forEach((item) => {
          if (item.city) {
            cityCounts[item.city] = (cityCounts[item.city] || 0) + 1;
          }
        });

        const citiesList = Object.entries(cityCounts)
          .map(([city, count]) => ({ city, count }))
          .sort((a, b) => b.count - a.count);

        // Also fetch articles that might have cities in location_extracted but not in signals
        const articlesQueryParams = new URLSearchParams();
        articlesQueryParams.set('select', 'id,title,location_extracted,published_at');
        articlesQueryParams.set('location_extracted->city', 'not.is.null');
        articlesQueryParams.set('order', 'published_at.desc');
        articlesQueryParams.set('limit', '100');

        const articlesQuery = `${supabaseUrl}/rest/v1/news_articles?${articlesQueryParams.toString()}`;
        const articlesResponse = await fetch(articlesQuery, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });

        let articlesWithCity = 0;
        if (articlesResponse.ok) {
          const articlesData: any[] = await articlesResponse.json();
          articlesWithCity = articlesData.length;
        }

        // Get total articles count
        const totalQuery = `${supabaseUrl}/rest/v1/news_articles?select=id&limit=1`;
        const totalResponse = await fetch(totalQuery, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Prefer': 'count=exact',
          },
        });

        let totalArticles = 0;
        if (totalResponse.ok) {
          const contentRange = totalResponse.headers.get('content-range');
          if (contentRange) {
            const match = contentRange.match(/\/(\d+)/);
            if (match) {
              totalArticles = parseInt(match[1], 10);
            }
          }
        }

        setStats({
          total_articles: totalArticles,
          articles_with_cities: articlesWithCity,
          articles_without_cities: totalArticles - articlesWithCity,
          unique_cities: citiesList.length,
          cities_list: citiesList,
        });

        setCityData(transformed);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load city data');
        console.error('Error fetching city data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCityData();
  }, []);

  if (loading) {
    return (
      <Card className="bg-[#23313c] border-[#EAEBF024]">
        <CardHeader>
          <CardTitle className="text-white">City Extraction Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-white/70">Loading city data...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-[#23313c] border-[#EAEBF024]">
        <CardHeader>
          <CardTitle className="text-white">City Extraction Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-400">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#23313c] border-[#EAEBF024]">
      <CardHeader>
        <CardTitle className="text-white text-lg">City Extraction Status</CardTitle>
        <p className="text-sm text-white/70 mt-1">
          Shows cities extracted from news articles and stored in outbreak signals
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#2a4149] p-3 rounded">
              <div className="text-xs text-white/70">Total Articles</div>
              <div className="text-2xl font-bold text-[#67DBE2]">{stats.total_articles}</div>
            </div>
            <div className="bg-[#2a4149] p-3 rounded">
              <div className="text-xs text-white/70">Articles with Cities</div>
              <div className="text-2xl font-bold text-[#67DBE2]">{stats.articles_with_cities}</div>
            </div>
            <div className="bg-[#2a4149] p-3 rounded">
              <div className="text-xs text-white/70">Unique Cities</div>
              <div className="text-2xl font-bold text-[#67DBE2]">{stats.unique_cities}</div>
            </div>
            <div className="bg-[#2a4149] p-3 rounded">
              <div className="text-xs text-white/70">Extraction Rate</div>
              <div className="text-2xl font-bold text-[#67DBE2]">
                {stats.total_articles > 0
                  ? `${Math.round((stats.articles_with_cities / stats.total_articles) * 100)}%`
                  : '0%'}
              </div>
            </div>
          </div>
        )}

        {stats && stats.cities_list.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">Cities Found ({stats.cities_list.length})</h3>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {stats.cities_list.map((item, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-[#67DBE2]/20 text-[#67DBE2] rounded text-xs border border-[#67DBE2]/30"
                >
                  {item.city} ({item.count})
                </span>
              ))}
            </div>
          </div>
        )}

        {cityData.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">
              Recent Articles with Cities ({cityData.length})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {cityData.slice(0, 10).map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[#2a4149] p-3 rounded border border-[#EAEBF024]/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-white line-clamp-2">
                        {item.article_title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-[#67DBE2]/20 text-[#67DBE2] rounded text-[10px] font-medium">
                          {item.city}
                        </span>
                        <span className="text-[10px] text-white/70">{item.disease_name}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-white/50">
                      {new Date(item.published_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {cityData.length === 0 && (
          <div className="text-center py-8 text-white/70">
            <p>No cities found in outbreak signals yet.</p>
            <p className="text-xs mt-2">
              Cities will appear here once news articles are processed with city extraction enabled.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

