import { useEffect, useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { translateArticle } from "../../lib/translateArticle";

interface NewsArticle {
  id: string;
  title: string;
  content: string;
  original_text?: string | null;
  translated_text?: string | null;
  language?: string | null;
  url: string;
  published_at: string;
  source: {
    name: string;
  };
  // Client-side translation state
  isTranslated?: boolean;
  translatedTitle?: string;
  translatedContent?: string;
  isTranslating?: boolean;
  translationError?: string | null;
}

export const News = (): JSX.Element => {
  const { t } = useLanguage();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = async (): Promise<NewsArticle[]> => {
    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
    const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing LiveHealth+ database configuration");
    }

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const queryParams = new URLSearchParams({
      select: '*,news_sources!source_id(name),outbreak_signals(count),original_text',
      published_at: `gte.${oneMonthAgo.toISOString()}`,
      order: 'published_at.desc',
      limit: '1000'
    });

    const response = await fetch(`${supabaseUrl}/rest/v1/news_articles?${queryParams.toString()}`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch news: ${response.status} ${errorText}`);
    }

    const data: any[] = await response.json();

    const stripHtmlTags = (html: string): string => {
      if (!html) return '';
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      return (tmp.textContent || tmp.innerText || '').trim();
    };

    const transformed: NewsArticle[] = data
      .map((item: any) => {
        const sourceName = Array.isArray(item.news_sources) && item.news_sources.length > 0
          ? item.news_sources[0]?.name || 'Unknown Source'
          : item.news_sources?.name || 'Unknown Source';

        // Determine original content - prefer original_text, fallback to content
        const originalContent = item.original_text || item.content || '';
        // If translated_text exists, content might be translated, so use original_text for original
        const displayContent = item.translated_text ? originalContent : (item.content || '');
        
        return {
          id: item.id,
          title: stripHtmlTags(item.title || ''),
          content: displayContent, // Original content for display
          original_text: originalContent,
          translated_text: item.translated_text || null,
          language: item.language || null,
          url: item.url || '#',
          published_at: item.published_at || new Date().toISOString(),
          source: { name: sourceName },
          isTranslated: false, // Start with original content
          isTranslating: false,
        };
      })
      .filter(article => {
        const publishedDate = new Date(article.published_at);
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return publishedDate >= threeMonthsAgo;
      });

    // Remove exact duplicates based on URL and sort by date
    const uniqueArticlesByUrl = new Map<string, NewsArticle>();
    const finalArticles: NewsArticle[] = [];

    transformed.forEach(article => {
      if (!uniqueArticlesByUrl.has(article.url)) {
        uniqueArticlesByUrl.set(article.url, article);
        finalArticles.push(article);
      }
    });

    // Sort by publication date (newest first)
    finalArticles.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

    return finalArticles;
  };

  useEffect(() => {
    let active = true;
    let intervalId: number | null = null;

    const loadNews = async () => {
      try {
        setLoading(true);
        const fetchedArticles = await fetchNews();
        if (active) {
          setArticles(fetchedArticles);
          setError(null);
        }
      } catch (e: any) {
        if (active) {
          setError(e.message || "Failed to load news");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadNews();

    intervalId = window.setInterval(() => {
      if (active) {
        loadNews();
      }
    }, 600000); // 10 minutes

    return () => {
      active = false;
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, []);

  const formatTimeAgo = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
      });
    } catch {
      return 'Unknown';
    }
  };

  const stripHtml = (html: string): string => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const truncateContent = (content: string, maxLength: number = 200): string => {
    const cleanContent = stripHtml(content);
    if (cleanContent.length <= maxLength) return cleanContent;
    return cleanContent.substring(0, maxLength).trim() + '...';
  };

  const handleTranslate = async (article: NewsArticle) => {
    // If already translated, toggle back to original
    if (article.isTranslated) {
      setArticles(prev => prev.map(a => 
        a.id === article.id 
          ? { ...a, isTranslated: false, translatedTitle: undefined, translatedContent: undefined }
          : a
      ));
      return;
    }

    // If translation already exists in database, use it
    if (article.translated_text) {
      setArticles(prev => prev.map(a => {
        if (a.id === article.id) {
          // Use the stored translation
          return {
            ...a, 
            isTranslated: true,
            translatedTitle: a.title, // Title stays same, only content translates
            translatedContent: a.translated_text,
          };
        }
        return a;
      }));
      return;
    }

    // Set translating state
    setArticles(prev => prev.map(a => 
      a.id === article.id 
        ? { ...a, isTranslating: true, translationError: null }
        : a
    ));

    try {
      // Use original_text for translation (the actual original content)
      const originalText = article.original_text || article.content || '';
      
      if (!originalText || originalText.trim() === '') {
        throw new Error('No content to translate');
      }
      
      console.log('Translating article:', article.id, 'Language:', article.language, 'Content length:', originalText.length);
      
      // Translate only the content, not the title (title usually doesn't need translation)
      const result = await translateArticle(
        originalText,
        article.language || undefined
      );

      console.log('Translation result:', result.translatedText?.substring(0, 100));

      if (!result.translatedText || result.translatedText.trim() === '') {
        throw new Error('Translation returned empty result');
      }

      // Update article with translation
      setArticles(prev => prev.map(a => {
        if (a.id === article.id) {
          const updated = {
            ...a, 
            isTranslated: true,
            translatedTitle: a.title, // Keep original title
            translatedContent: result.translatedText, // Use translated content
            isTranslating: false,
            translationError: null,
          };
          console.log('Updated article state:', { 
            id: updated.id, 
            isTranslated: updated.isTranslated, 
            hasTranslatedContent: !!updated.translatedContent,
            translatedContentLength: updated.translatedContent?.length 
          });
          return updated;
        }
        return a;
      }));
    } catch (error: any) {
      console.error('Translation error:', error);
      // Handle error
      setArticles(prev => prev.map(a => 
        a.id === article.id 
          ? { 
              ...a, 
              isTranslating: false,
              translationError: error.message || 'Translation failed',
            }
          : a
      ));
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#2a4149] pb-20">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="[font-family:'Roboto',Helvetica] font-bold text-white text-2xl tracking-[-0.2px]">
            {t("news.outbreakNews")}
          </h1>
          <p className="text-[#a7a7a7] text-sm mt-2">
            Latest outbreak and health news from around the world
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-[#a7a7a7] text-sm">{t("news.loadingNews")}</div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-12">
            <div className="text-red-400 text-sm">{error}</div>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            {articles.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#a7a7a7] text-sm">{t("news.noNewsAvailable")}</p>
              </div>
            ) : (
              articles.map((article) => (
                <div
                  key={article.id}
                  className="w-full rounded-lg bg-[#23313c] p-4 hover:bg-[#28424f] transition-all duration-200 border border-transparent hover:border-[#67DBE2]/30 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs text-[#a7a7a7]">
                      {formatTimeAgo(article.published_at)}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {article.language && article.language !== 'en' && (
                        <>
                          <span className="text-[10px] text-[#a7a7a7] bg-[#2a4149] px-2 py-1 rounded">
                            {article.language.toUpperCase()}
                          </span>
                          <button
                            onClick={() => handleTranslate(article)}
                            disabled={article.isTranslating}
                            className="text-xs text-[#67DBE2] hover:text-[#5bc5cb] hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            title={article.isTranslated ? "Show original" : "Translate to English"}
                          >
                            {article.isTranslating ? (
                              <>⏳ Translating...</>
                            ) : article.isTranslated ? (
                              <>Show Original</>
                            ) : (
                              <>Translate</>
                            )}
                          </button>
                        </>
                      )}
                      <span className="text-xs text-[#67DBE2] font-medium">
                        {article.source.name}
                      </span>
                    </div>
                  </div>
                  {article.translationError && (
                    <div className="text-xs text-red-400 mb-2">
                      {article.translationError}
                    </div>
                  )}
                  <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-white text-base leading-tight mb-2">
                    {stripHtml(article.title)}
                  </h3>
                  <p className="text-sm text-[#ffffff90] leading-relaxed mb-3">
                    {truncateContent(
                      article.isTranslated && article.translatedContent 
                        ? article.translatedContent 
                        : (article.original_text || article.content), 
                      200
                    )}
                  </p>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#67DBE2] hover:text-[#5bc5cb] hover:underline transition-colors inline-flex items-center gap-1"
                  >
                    {t("news.readMore")} →
                  </a>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};


