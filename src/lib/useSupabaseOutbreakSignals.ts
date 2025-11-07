import { useEffect, useState } from "react";

export interface OutbreakSignal {
  id: string;
  disease: string;
  location: string;
  city?: string;
  category: string;
  pathogen?: string;
  keywords: string;
  position: [number, number];
  date?: string;
  url?: string;
  title?: string;
  severity?: string;
  confidence?: number;
}

interface SupabaseSignal {
  id: string;
  latitude: number;
  longitude: number;
  confidence_score: number;
  severity_assessment: string;
  detected_at: string;
  case_count_mentioned: number;
  disease: {
    name: string;
    color_code: string;
  };
  country: {
    name: string;
    code: string;
  };
  article: {
    title: string;
    url: string;
    published_at: string;
  };
  category?: {
    outbreak_category: {
      name: string;
      color: string;
    };
  };
}

export function useSupabaseOutbreakSignals(categoryFilter?: string | null) {
  const [signals, setSignals] = useState<OutbreakSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let intervalId: number | null = null;

    async function fetchSignals(isInitial = false) {
      try {
        if (isInitial) {
          setLoading(true);
        }
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          throw new Error("Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
        }

        // Build query using PostgREST syntax
        // For foreign key joins, use: table!foreign_key_column(fields)
        // Explicitly include city field to ensure it's returned
        const selectClause = `*,city,diseases!disease_id(name,color_code),countries!country_id(name,code),news_articles!article_id(title,url,published_at)`;
        
        // Build query string - URLSearchParams handles encoding properly
        const queryParams = new URLSearchParams();
        queryParams.set('select', selectClause);
        queryParams.set('latitude', 'not.is.null');
        queryParams.set('longitude', 'not.is.null');
        queryParams.set('detected_at', `gte.${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}`);
        queryParams.set('order', 'detected_at.desc');
        // Remove limit to get all outbreak signals, or use a very high limit if needed
        queryParams.set('limit', '10000');
        
        let query = `${supabaseUrl}/rest/v1/outbreak_signals?${queryParams.toString()}`;

        const response = await fetch(query, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Supabase query error:', errorText);
          throw new Error(`Failed to fetch outbreak signals: ${response.statusText}`);
        }

        const data: any[] = await response.json();
        
        console.log('Raw signals fetched from API:', data.length);
        console.log('Sample signals:', data.slice(0, 3).map((s: any) => ({
          id: s.id,
          lat: s.latitude,
          lng: s.longitude,
          detected_at: s.detected_at
        })));

        // Get disease categories mapping (fetch separately for simplicity)
        const categoryParams = new URLSearchParams();
        categoryParams.set('select', 'disease_id,outbreak_categories!category_id(name,color)');
        const categoryUrl = `${supabaseUrl}/rest/v1/disease_categories?${categoryParams.toString()}`;
        
        const categoryResponse = await fetch(categoryUrl, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });
        
        let diseaseCategoryMap: Record<string, { name: string; color: string }> = {};
        if (categoryResponse.ok) {
          const categoryData: any[] = await categoryResponse.json();
          // Build a map: disease_id -> category
          categoryData.forEach((cat: any) => {
            // Handle different response formats
            const catObj = cat.outbreak_categories;
            let categoryName: string | undefined;
            let categoryColor: string | undefined;
            
            if (Array.isArray(catObj) && catObj.length > 0) {
              categoryName = catObj[0]?.name;
              categoryColor = catObj[0]?.color;
            } else if (catObj && typeof catObj === 'object') {
              categoryName = catObj.name;
              categoryColor = catObj.color;
            }
            
            if (categoryName && cat.disease_id) {
              diseaseCategoryMap[cat.disease_id] = {
                name: categoryName,
                color: categoryColor || '#66dbe1',
              };
            }
          });
        }

        // Get pathogen information mapping
        const pathogenParams = new URLSearchParams();
        pathogenParams.set('select', 'disease_id,pathogens!pathogen_id(name,type)');
        pathogenParams.set('is_primary', 'eq.true');
        const pathogenUrl = `${supabaseUrl}/rest/v1/disease_pathogens?${pathogenParams.toString()}`;
        
        const pathogenResponse = await fetch(pathogenUrl, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });
        
        let diseasePathogenMap: Record<string, string> = {};
        if (pathogenResponse.ok) {
          const pathogenData: any[] = await pathogenResponse.json();
          // Build a map: disease_id -> pathogen name
          pathogenData.forEach((p: any) => {
            const pathogenObj = p.pathogens;
            let pathogenName: string | undefined;
            
            if (Array.isArray(pathogenObj) && pathogenObj.length > 0) {
              pathogenName = pathogenObj[0]?.name;
            } else if (pathogenObj && typeof pathogenObj === 'object') {
              pathogenName = pathogenObj.name;
            }
            
            if (pathogenName && p.disease_id) {
              diseasePathogenMap[p.disease_id] = pathogenName;
            }
          });
        }
        
        // Debug: log category map
        console.log('Category map loaded:', Object.keys(diseaseCategoryMap).length, 'diseases mapped');

        // Debug: log raw data
        console.log('Raw signals fetched:', data.length);
        console.log('Sample signal:', data[0]);
        
        // Transform to map format
        const transformed: OutbreakSignal[] = data
          .filter((s: any) => {
            // Ensure we have valid coordinates
            const lat = typeof s.latitude === 'string' ? parseFloat(s.latitude) : s.latitude;
            const lng = typeof s.longitude === 'string' ? parseFloat(s.longitude) : s.longitude;
            return lat && lng && !isNaN(lat) && !isNaN(lng);
          })
          .map((signal: any) => {
            // Extract nested data from PostgREST format
            // PostgREST returns joined data as nested objects with the table name
            const disease = Array.isArray(signal.diseases) ? signal.diseases[0] : signal.diseases;
            const country = Array.isArray(signal.countries) ? signal.countries[0] : signal.countries;
            const article = Array.isArray(signal.news_articles) ? signal.news_articles[0] : signal.news_articles;
            
            // Parse coordinates properly
            const lat = typeof signal.latitude === 'string' ? parseFloat(signal.latitude) : signal.latitude;
            const lng = typeof signal.longitude === 'string' ? parseFloat(signal.longitude) : signal.longitude;
            
            // Get category from mapping - use disease_id if available
            const diseaseId = signal.disease_id || disease?.id;
            const category = diseaseId && diseaseCategoryMap[diseaseId] 
              ? diseaseCategoryMap[diseaseId] 
              : { name: "Other", color: "#66dbe1" };
            
            // Get pathogen from mapping
            const pathogen = diseaseId && diseasePathogenMap[diseaseId] 
              ? diseasePathogenMap[diseaseId] 
              : "";

            // Build location string: city, country or just country
            let locationString = country?.name || "Unknown";
            if (signal.city) {
              locationString = `${signal.city}, ${locationString}`;
            }

            return {
              id: signal.id,
              disease: disease?.name || "Unknown Disease",
              location: locationString,
              city: signal.city || undefined,
              category: category.name,
              pathogen: pathogen,
              keywords: disease?.name || "", // Simplified
              position: [lat, lng] as [number, number],
              date: signal.detected_at || article?.published_at,
              url: article?.url,
              title: article?.title,
              severity: signal.severity_assessment,
              confidence: signal.confidence_score,
            };
          });
        
        console.log('Transformed signals:', transformed.length);
        console.log('Categories found:', [...new Set(transformed.map(s => s.category))]);
        console.log('Signals with cities:', transformed.filter(s => s.city).length);
        console.log('Sample signals with cities:', transformed.filter(s => s.city).slice(0, 3).map(s => ({ city: s.city, location: s.location })));

        // Filter by category if provided
        const filtered = categoryFilter
          ? transformed.filter(s => s.category === categoryFilter)
          : transformed;

        if (!active) return;
        
        // Log if new data detected (compare with previous signals)
        if (!isInitial && signals.length > 0) {
          const newCount = filtered.length - signals.length;
          if (newCount > 0) {
            console.log(`🆕 ${newCount} new outbreak signals detected!`);
          } else {
            console.log(`✓ Refreshed: ${filtered.length} signals (no new data)`);
          }
        }
        
        setSignals(filtered);
        setError(null);
      } catch (err: any) {
        if (!active) return;
        console.error("Error fetching outbreak signals:", err);
        setError(err.message || "Failed to load outbreak data");
        setSignals([]); // Fallback to empty array
      } finally {
        if (isInitial) {
          setLoading(false);
        }
      }
    }

    // Initial fetch
    fetchSignals(true);

    // Poll for new signals every 2 minutes (matching the cron schedule)
    intervalId = window.setInterval(async () => {
      if (!active) return;
      try {
        // Don't show loading spinner on refresh, just update silently
        await fetchSignals(false);
      } catch (e) {
        // Silent fail on refresh to avoid disrupting user
        console.error('Error refreshing outbreak signals:', e);
      }
    }, 120000); // 2 minutes = 120000ms

    return () => {
      active = false;
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [categoryFilter]);

  return { signals, loading, error };
}

