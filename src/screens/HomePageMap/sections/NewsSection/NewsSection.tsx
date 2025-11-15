import { useEffect, useState } from "react";

interface NewsArticle {
  id: string;
  title: string;
  content: string;
  url: string;
  published_at: string;
  source: {
    name: string;
  };
}

export const NewsSection = (): JSX.Element => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch news articles function
  const fetchNews = async () => {
    try {
      const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
      const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase configuration");
      }

      // Calculate three months ago date (used for filtering) - more flexible than 1 month
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const threeMonthsAgoISO = threeMonthsAgo.toISOString();
      
      // Fetch news articles with source information
      // Filter to show articles published within the last 1 month (reduced from 3 months to save bandwidth)
      // Order by published_at desc to show most recently published articles first
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const oneMonthAgoISO = oneMonthAgo.toISOString();
      
      // Fetch articles from the last month, sorted by date (newest first)
      // We fetch a reasonable number to ensure we capture articles from all sources
      // If CDC publishes a new article today, it will be in the results and sorted by date naturally
      const queryParams = new URLSearchParams();
      // PostgREST join syntax: news_sources!source_id(name) - returns nested object with source name
      // Also join outbreak_signals to prioritize articles with signals
      queryParams.set('select', '*,news_sources!source_id(name),outbreak_signals(count)');
      // PostgREST filter syntax: use the operator in the parameter name, not the value
      queryParams.set('published_at', `gte.${oneMonthAgoISO}`);
      queryParams.set('order', 'published_at.desc');
      // Increased limit to 1000 to ensure articles with signals aren't cut off
      // This ensures we get CDC/WHO/BBC articles even if Google News has many recent articles
      queryParams.set('limit', '1000');
      
      // Build the query URL - PostgREST expects filters in the format: column=operator.value
      const query = `${supabaseUrl}/rest/v1/news_articles?${queryParams.toString()}`;

      const response = await fetch(query, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch news:', response.status, errorText);
        throw new Error(`Failed to fetch news: ${response.status} ${response.statusText}`);
      }

      const data: any[] = await response.json();
      console.log('Fetched news articles:', data.length, 'items');
      console.log('Date filter (1 month):', oneMonthAgoISO);
      console.log('Date filter (3 months):', threeMonthsAgoISO);
      
      // Debug: Check sources in the response
      const sourcesInResponse = new Set<string>();
      const sourceCountsInResponse = new Map<string, number>();
      data.forEach((item: any) => {
        let sourceName = 'Unknown';
        if (item.news_sources) {
          if (Array.isArray(item.news_sources) && item.news_sources.length > 0) {
            sourceName = item.news_sources[0]?.name || 'Unknown';
          } else if (typeof item.news_sources === 'object' && item.news_sources.name) {
            sourceName = item.news_sources.name;
          }
        }
        sourcesInResponse.add(sourceName);
        sourceCountsInResponse.set(sourceName, (sourceCountsInResponse.get(sourceName) || 0) + 1);
      });
      console.log('Sources in API response:', Array.from(sourcesInResponse));
      console.log('Source counts in API response:', Object.fromEntries(sourceCountsInResponse));
      
      // Debug: Check for CDC/WHO/BBC articles specifically
      const authoritativeArticles = data.filter((item: any) => {
        let sourceName = '';
        if (item.news_sources) {
          if (Array.isArray(item.news_sources) && item.news_sources.length > 0) {
            sourceName = item.news_sources[0]?.name || '';
          } else if (typeof item.news_sources === 'object' && item.news_sources.name) {
            sourceName = item.news_sources.name;
          }
        }
        const nameLower = sourceName.toLowerCase();
        return nameLower.includes('cdc') || 
               nameLower.includes('who') || 
               nameLower.includes('bbc health') ||
               nameLower.includes('world health organization') ||
               nameLower.includes('centers for disease control');
      });
      console.log('Authoritative articles in API response:', authoritativeArticles.length);
      if (authoritativeArticles.length > 0) {
        console.log('Authoritative article samples:', authoritativeArticles.slice(0, 5).map((a: any) => ({
          title: a.title?.substring(0, 60),
          published_at: a.published_at,
          source: Array.isArray(a.news_sources) ? a.news_sources[0]?.name : a.news_sources?.name
        })));
      }
      
      if (data.length > 0) {
        console.log('Sample article dates:', data.slice(0, 3).map((a: any) => ({
          title: a.title?.substring(0, 50),
          published_at: a.published_at,
          source: Array.isArray(a.news_sources) ? a.news_sources[0]?.name : a.news_sources?.name
        })));
      }
      
      // Helper to strip HTML tags
      const stripHtmlTags = (html: string): string => {
        if (!html) return '';
        // Create temporary div to parse and extract text content
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return (tmp.textContent || tmp.innerText || '').trim();
      };
      
      // Transform data to handle nested source object and clean HTML
      let transformed: NewsArticle[] = data.map((item: any) => {
        // Handle both nested object and array formats from PostgREST
        // PostgREST returns joined data as: { news_sources: { name: "..." } }
        let sourceName = 'Unknown Source';
        if (item.news_sources) {
          if (Array.isArray(item.news_sources) && item.news_sources.length > 0) {
            sourceName = item.news_sources[0]?.name || 'Unknown Source';
          } else if (typeof item.news_sources === 'object' && item.news_sources.name) {
            sourceName = item.news_sources.name;
          }
        }
        
        // Debug: Log if source is missing or unknown
        if (sourceName === 'Unknown Source' && item.source_id) {
          console.warn('Article missing source name:', {
            id: item.id,
            title: item.title?.substring(0, 50),
            source_id: item.source_id,
            news_sources: item.news_sources
          });
        }
        
        return {
          id: item.id,
          title: stripHtmlTags(item.title || ''),
          content: item.content || '',
          url: item.url || '#',
          published_at: item.published_at || new Date().toISOString(),
          source: {
            name: sourceName,
          },
        };
      });
      
      // Additional client-side filter to ensure we only show articles published within the last 3 months
      transformed = transformed.filter(article => {
        if (!article.published_at) return false;
        const publishedDate = new Date(article.published_at);
        return publishedDate >= threeMonthsAgo;
      });
      
      // Source priority: authoritative sources should be preferred over Google News
      // Higher number = higher priority
      const getSourcePriority = (sourceName: string): number => {
        const name = sourceName.toLowerCase();
        if (name.includes('world health organization') || name === 'who') return 100;
        if (name.includes('cdc') || name.includes('centers for disease control')) return 90;
        if (name.includes('promed')) return 85;
        if (name.includes('bbc health')) return 80;
        if (name.includes('reuters')) return 75;
        if (name.includes('google news')) return 50;
        return 60; // Default priority for unknown sources
      };
      
      // Normalize title for comparison (removes source suffixes and normalizes)
      const normalizeTitle = (title: string): string => {
        return title
          .toLowerCase()
          .trim()
          // Remove common source suffixes that don't affect story identity
          .replace(/\s*-\s*(tribune india|ani news|msn|aol\.com|bernama|crispng\.com|reuters|bbc|who|cdc|promed)$/i, '')
          .replace(/\s*[….]+\s*$/g, '') // Remove trailing ellipses
          .replace(/\s+/g, ' ') // Normalize whitespace
          .replace(/[^\w\s-]/g, '') // Remove special characters
          .trim();
      };
      
      // Sort articles by source priority FIRST (authoritative sources first)
      // This ensures authoritative sources are processed before Google News
      // Then within each priority level, sort by date (newer first)
      transformed.sort((a, b) => {
        const priorityA = getSourcePriority(a.source.name);
        const priorityB = getSourcePriority(b.source.name);
        if (priorityA !== priorityB) {
          return priorityB - priorityA; // Higher priority first
        }
        // If same priority, sort by date (newer first)
        return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
      });
      
      // Debug: Log the first 20 articles after sorting to verify source diversity
      console.log('First 20 articles after priority sorting:', transformed.slice(0, 20).map(a => ({
        source: a.source.name,
        priority: getSourcePriority(a.source.name),
        title: a.title.substring(0, 50),
        published_at: a.published_at
      })));
      
      // Helper function to calculate title similarity (simple word overlap)
      function calculateTitleSimilarity(title1: string, title2: string): number {
        const words1 = new Set(title1.split(/\s+/).filter(w => w.length > 2));
        const words2 = new Set(title2.split(/\s+/).filter(w => w.length > 2));
        if (words1.size === 0 && words2.size === 0) return 1;
        if (words1.size === 0 || words2.size === 0) return 0;
        const intersection = new Set([...words1].filter(w => words2.has(w)));
        const union = new Set([...words1, ...words2]);
        return intersection.size / union.size;
      }
      
      // Remove duplicates based on article URL (exact duplicates only)
      // We'll keep ALL articles from authoritative sources, even if Google News has similar titles
      const uniqueArticlesByUrl = new Map<string, NewsArticle>();
      const finalArticles: NewsArticle[] = [];
      
      transformed.forEach(article => {
        const sourcePriority = getSourcePriority(article.source.name);
        const isAuthoritativeSource = sourcePriority >= 75; // WHO, CDC, ProMED, BBC, Reuters
        
        // Debug: Log CDC articles specifically
        if (article.source.name.toLowerCase().includes('cdc') || 
            article.source.name.toLowerCase().includes('centers for disease control')) {
          console.log('Processing CDC article:', {
            title: article.title.substring(0, 60),
            source: article.source.name,
            priority: sourcePriority,
            isAuthoritative: isAuthoritativeSource,
            published_at: article.published_at
          });
        }
        
        // For authoritative sources, always include them (no title-based deduplication)
        if (isAuthoritativeSource) {
          // Only check URL duplicates for authoritative sources
          if (!uniqueArticlesByUrl.has(article.url)) {
            uniqueArticlesByUrl.set(article.url, article);
            finalArticles.push(article);
          } else {
            // If URL exists, keep the one with higher priority or more recent date
            const existing = uniqueArticlesByUrl.get(article.url)!;
            const existingPriority = getSourcePriority(existing.source.name);
            if (sourcePriority > existingPriority || 
                (sourcePriority === existingPriority && 
                 new Date(article.published_at) > new Date(existing.published_at))) {
              // Replace in map and update in finalArticles
              uniqueArticlesByUrl.set(article.url, article);
              const existingIndex = finalArticles.findIndex(a => a.url === article.url);
              if (existingIndex >= 0) {
                finalArticles[existingIndex] = article;
              } else {
                finalArticles.push(article);
              }
            }
          }
        } else {
          // For Google News and other non-authoritative sources, do title-based deduplication
          // But only remove if an authoritative source already has a similar article
          const normalizedTitle = normalizeTitle(article.title);
          const hasAuthoritativeDuplicate = finalArticles.some(existing => {
            const existingPriority = getSourcePriority(existing.source.name);
            if (existingPriority < 75) return false; // Not authoritative
            const existingNormalized = normalizeTitle(existing.title);
            // Check if titles are very similar (at least 80% match)
            const similarity = calculateTitleSimilarity(normalizedTitle, existingNormalized);
            return similarity > 0.8;
          });
          
          // Only add Google News article if no authoritative source has a similar article
          if (!hasAuthoritativeDuplicate) {
            // Check URL duplicates
            if (!uniqueArticlesByUrl.has(article.url)) {
              uniqueArticlesByUrl.set(article.url, article);
              finalArticles.push(article);
            }
          }
        }
      });
      
      // Sort by date (newest first) - all articles sorted together
      finalArticles.sort((a, b) => 
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      );
      
      // Debug logging
      const sourceCounts = new Map<string, number>();
      finalArticles.forEach(article => {
        const sourceName = article.source.name;
        sourceCounts.set(sourceName, (sourceCounts.get(sourceName) || 0) + 1);
      });
      console.log('Final articles:', finalArticles.length);
      console.log('Sources in final list:', Object.fromEntries(sourceCounts));
      
      // Show the first 20 articles to verify source diversity
      const first20Sources = finalArticles.slice(0, 20).map(a => a.source.name);
      console.log('First 20 article sources:', first20Sources);
      
      // Debug: Check for CDC articles specifically in final list
      const cdcArticles = finalArticles.filter(a => 
        a.source.name.toLowerCase().includes('cdc') || 
        a.source.name.toLowerCase().includes('centers for disease control')
      );
      console.log('CDC articles in final list:', cdcArticles.length);
      if (cdcArticles.length > 0) {
        console.log('CDC article samples:', cdcArticles.slice(0, 5).map(a => ({
          title: a.title.substring(0, 60),
          published_at: a.published_at,
          source: a.source.name
        })));
      } else {
        console.warn('⚠️ No CDC articles in final list!');
        // Debug: Check if CDC articles were in the original data but filtered out
        const cdcInOriginal = data.filter((item: any) => {
          let sourceName = '';
          if (item.news_sources) {
            if (Array.isArray(item.news_sources) && item.news_sources.length > 0) {
              sourceName = item.news_sources[0]?.name || '';
            } else if (typeof item.news_sources === 'object' && item.news_sources.name) {
              sourceName = item.news_sources.name;
            }
          }
          const nameLower = sourceName.toLowerCase();
          return nameLower.includes('cdc') || nameLower.includes('centers for disease control');
        });
        console.warn('CDC articles in original API response:', cdcInOriginal.length);
        if (cdcInOriginal.length > 0) {
          console.warn('CDC articles that were filtered out:', cdcInOriginal.slice(0, 3).map((a: any) => ({
            title: a.title?.substring(0, 60),
            published_at: a.published_at,
            source: Array.isArray(a.news_sources) ? a.news_sources[0]?.name : a.news_sources?.name
          })));
        }
      }
      
      return finalArticles;
    } catch (e: any) {
      console.error('Error fetching news:', e);
      throw e;
    }
  };

  useEffect(() => {
    let active = true;
    let intervalId: number | null = null;

    // Initial fetch
    (async () => {
      try {
        setLoading(true);
        const transformed = await fetchNews();
        if (!active) return;
        setArticles(transformed);
        setError(null);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message ?? "Failed to load news");
      } finally {
        if (active) setLoading(false);
      }
    })();

    // Poll for new articles every 10 minutes (reduced from 2 minutes to save bandwidth)
    // Cron runs every 2 hours, so 10 minutes is sufficient for updates
    intervalId = window.setInterval(async () => {
      if (!active) return;
      try {
        // Don't show loading spinner on refresh, just update silently
        const transformed = await fetchNews();
        if (!active) return;
        setArticles(transformed);
        setError(null);
      } catch (e: any) {
        // Silent fail on refresh to avoid disrupting user
        console.error('Error refreshing news:', e);
      }
    }, 600000); // 10 minutes = 600000ms

    return () => {
      active = false;
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, []);

  // Format time ago
  const formatTimeAgo = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
      
      // Format as date if older than a week
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    } catch {
      return 'Unknown';
    }
  };

  // Strip HTML tags from text
  const stripHtml = (html: string): string => {
    if (!html) return '';
    // Create a temporary DOM element to parse HTML and extract text
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Clean and truncate content with ellipses
  const truncateContent = (content: string, maxLength: number = 120): string => {
    if (!content) return '';
    // Strip HTML first
    const cleanContent = stripHtml(content);
    if (cleanContent.length <= maxLength) return cleanContent;
    return cleanContent.substring(0, maxLength).trim() + '...';
  };

  // Clean title by stripping HTML
  const cleanTitle = (title: string): string => {
    if (!title) return '';
    return stripHtml(title).trim();
  };

  return (
    <div className="w-[240px] rounded-lg border border-[#EAEBF024] bg-[#FFFFFF14] shadow-lg flex flex-col overflow-hidden" style={{ height: '380px', boxSizing: 'border-box' }}>
      <div className="px-4 pt-4 pb-3 border-b border-[#EAEBF024]/50">
        <h2 className="[font-family:'Roboto',Helvetica] font-bold text-white text-base tracking-[-0.2px]">
          Outbreak News
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar px-4 py-3">
        {loading && (
          <div className="text-xs text-[#a7a7a7] text-center py-3">Loading news…</div>
        )}
        {error && (
          <div className="text-xs text-red-400 text-center py-3">{error}</div>
        )}
        {!loading && !error && (
          <div className="space-y-2.5">
            {articles.length === 0 ? (
              <div className="text-xs text-[#a7a7a7] text-center py-6">No news available</div>
            ) : (
              articles.map((article) => (
                <div
                  key={article.id}
                  className="flex flex-col gap-1.5 w-full rounded-md bg-[#23313c] p-2.5 hover:bg-[#28424f] transition-all duration-200 border border-transparent hover:border-[#67DBE2]/30 hover:shadow-sm"
                >
                  {/* Date/Time (top left) and Source (top right) */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-[#a7a7a7]">
                      {formatTimeAgo(article.published_at)}
                    </span>
                    <span className="text-[10px] text-[#67DBE2] font-medium truncate max-w-[100px]">
                      {article.source.name}
                    </span>
                  </div>
                  
                  {/* Title */}
                  <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-white text-xs leading-tight line-clamp-1">
                    {cleanTitle(article.title)}
                  </h3>
                  
                  {/* Content with Read More on same line */}
                  <div className="flex items-end gap-2">
                    <p className="text-[10px] text-[#ffffff90] leading-snug line-clamp-2 flex-1">
                      {truncateContent(article.content, 80)}
                    </p>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#67DBE2] hover:text-[#5bc5cb] hover:underline transition-colors flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Read More
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

