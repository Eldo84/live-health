import React, { useEffect, useState } from "react";

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
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase configuration");
      }

      // Calculate one month ago date (used for filtering)
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const oneMonthAgoISO = oneMonthAgo.toISOString();
      
      // Fetch news articles with source information
      // Filter to only show articles published within the last month
      // Order by published_at desc to show newest articles first
      const queryParams = new URLSearchParams();
      queryParams.set('select', '*,news_sources!source_id(name)');
      // Filter: only articles published in the last month (PostgREST syntax: column.gte.value)
      queryParams.set('published_at', `gte.${oneMonthAgoISO}`);
      queryParams.set('order', 'published_at.desc'); // Newest first
      queryParams.set('limit', '20');
      
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
      console.log('Date filter:', oneMonthAgoISO);
      if (data.length > 0) {
        console.log('Sample article dates:', data.slice(0, 3).map((a: any) => ({
          title: a.title?.substring(0, 50),
          published_at: a.published_at
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
        let sourceName = 'Unknown Source';
        if (item.news_sources) {
          if (Array.isArray(item.news_sources) && item.news_sources.length > 0) {
            sourceName = item.news_sources[0]?.name || 'Unknown Source';
          } else if (typeof item.news_sources === 'object' && item.news_sources.name) {
            sourceName = item.news_sources.name;
          }
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
      
      // Additional client-side filter to ensure we only show articles published within the last month
      transformed = transformed.filter(article => {
        if (!article.published_at) return false;
        const publishedDate = new Date(article.published_at);
        return publishedDate >= oneMonthAgo;
      });
      
      console.log('Transformed news articles (within last month):', transformed.length);
      return transformed;
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

    // Poll for new articles every 2 minutes (matching the cron schedule)
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
    }, 120000); // 2 minutes = 120000ms

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
    <div className="w-[300px] rounded-lg border border-[#EAEBF024] bg-[#FFFFFF14] shadow-lg flex flex-col overflow-hidden" style={{ height: '380px' }}>
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
                    <span className="text-[10px] text-[#67DBE2] font-medium">
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

