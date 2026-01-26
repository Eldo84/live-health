import { CSSProperties, useEffect, useState } from "react";
import { useLanguage } from "../../../../contexts/LanguageContext";
import { translateArticle } from "../../../../lib/translateArticle";

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

interface NewsSectionProps {
  width?: number;
  height?: number | string;
  maxHeight?: number | string;
  className?: string;
}

export const NewsSection = ({ width, height, maxHeight, className }: NewsSectionProps = {}): JSX.Element => {
  const { t } = useLanguage();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = async (): Promise<NewsArticle[]> => {
    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
    const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const queryParams = new URLSearchParams({
      select: '*,news_sources!source_id(name),outbreak_signals(count),original_text,translated_text,language',
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

    // Debug: Log sample articles to check for language and translated_text
    if (data.length > 0) {
      console.log('Sample articles from API:', data.slice(0, 3).map(item => ({
        id: item.id,
        language: item.language,
        hasTranslatedText: !!item.translated_text,
        hasOriginalText: !!item.original_text,
        title: item.title?.substring(0, 50)
      })));
    }

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
        
        const translatedText = item.translated_text || null;
        
        return {
          id: item.id,
          title: stripHtmlTags(item.title || ''),
          content: displayContent, // Original content for display
          original_text: originalContent,
          translated_text: translatedText,
          language: item.language || null,
          url: item.url || '#',
          published_at: item.published_at || new Date().toISOString(),
          source: { name: sourceName },
          isTranslated: false, // Start with original content
          isTranslating: false,
          translationError: null,
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

  const truncateContent = (content: string, maxLength: number = 120): string => {
    const cleanContent = stripHtml(content);
    if (cleanContent.length <= maxLength) return cleanContent;
    return cleanContent.substring(0, maxLength).trim() + '...';
  };

  // Simple check if text is in English
  const isEnglish = (text: string): boolean => {
    if (!text) return false;
    
    // Common English words
    const englishWords = /\b(the|and|to|of|a|in|is|it|you|that|was|for|on|are|as|with|his|they|i|at|be|this|have|from|or|one|had|by|but|not|what|all|were|we|when|your|can|said|there|each|which|she|do|how|their|if|will|up|other|about|out|many|then|them|these|so|some|her|would|make|like|into|him|has|two|more|very|after|long|than|first|been|call|who|its|now|find|down|day|did|get|come|made|may|part)\b/gi;
    
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (words.length === 0) return false;
    
    const englishMatches = text.match(englishWords) || [];
    const englishRatio = englishMatches.length / words.length;
    
    // If more than 15% of words are common English words, consider it English
    return englishRatio > 0.15;
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

    // Get the text to check
    const originalText = article.original_text || article.content || '';
    
    // If text is already in English, no need to translate
    if (isEnglish(originalText) && isEnglish(article.title)) {
      setArticles(prev => prev.map(a => 
        a.id === article.id 
          ? { ...a, translationError: 'Article is already in English' }
          : a
      ));
      return;
    }

    // Set translating state
    setArticles(prev => prev.map(a => 
      a.id === article.id 
        ? { ...a, isTranslating: true, translationError: null }
        : a
    ));

    try {
      if (!originalText || originalText.trim() === '') {
        throw new Error('No content to translate');
      }
      
      // Translate both title and content - let DeepSeek auto-detect language
      const [titleResult, contentResult] = await Promise.all([
        translateArticle(article.title).catch(err => {
          console.warn('Title translation failed, keeping original:', err);
          return { translatedText: article.title };
        }),
        translateArticle(originalText)
      ]);

      if (!contentResult || !contentResult.translatedText || contentResult.translatedText.trim() === '') {
        throw new Error('Translation returned empty result');
      }

      // Update article with translation
      setArticles(prev => prev.map(a => {
        if (a.id === article.id) {
          return {
            ...a, 
            isTranslated: true,
            translatedTitle: titleResult.translatedText || a.title,
            translatedContent: contentResult.translatedText,
            isTranslating: false,
            translationError: null,
          };
        }
        return a;
      }));
    } catch (error: any) {
      console.error('Translation error:', error);
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

  const rootClasses = [
    'w-full',
    width ? '' : 'lg:w-[240px]',
    'rounded-lg border border-[#EAEBF024] bg-[#FFFFFF14] shadow-lg flex flex-col overflow-hidden lg:h-[380px] h-[500px] max-h-[55vh] lg:max-h-[380px]',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  const sizeStyles: CSSProperties = {
    boxSizing: 'border-box',
    ...(width ? { width: `${width}px`, maxWidth: `${width}px`, minWidth: `${width}px` } : {}),
    ...(height ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
    ...(maxHeight ? { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } : {}),
  };

  return (
    <div className={rootClasses} style={sizeStyles}>
      <div className="px-4 pt-4 pb-3 border-b border-[#EAEBF024]/50">
        <h2 className="[font-family:'Roboto',Helvetica] font-bold text-white text-base tracking-[-0.2px]">
          {t("news.outbreakNews")}
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar px-4 py-3">
        {loading && (
          <div className="text-xs text-[#a7a7a7] text-center py-3">{t("news.loadingNews")}</div>
        )}
        {error && (
          <div className="text-xs text-red-400 text-center py-3">{error}</div>
        )}
        {!loading && !error && (
          <div className="space-y-2.5">
            {articles.length === 0 ? (
              <div className="text-xs text-[#a7a7a7] text-center py-6">{t("news.noNewsAvailable")}</div>
            ) : (
              articles.map((article) => (
                <div
                  key={article.id}
                  className="flex flex-col gap-1.5 w-full rounded-md bg-[#23313c] p-2.5 hover:bg-[#28424f] transition-all duration-200 border border-transparent hover:border-[#67DBE2]/30 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-[#a7a7a7]">
                      {formatTimeAgo(article.published_at)}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {article.language && article.language !== 'en' && (
                        <>
                          <span className="text-[9px] text-[#a7a7a7] bg-[#23313c] px-1 py-0.5 rounded">
                            {article.language.toUpperCase()}
                          </span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('Button clicked for article:', article.id);
                              handleTranslate(article);
                            }}
                            disabled={article.isTranslating}
                            className="text-[9px] text-[#67DBE2] hover:text-[#5bc5cb] hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-0.5 cursor-pointer"
                            title={article.isTranslated ? "Show original" : "Translate to English"}
                            type="button"
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
                      <span className="text-[10px] text-[#67DBE2] font-medium truncate max-w-[100px]">
                        {article.source.name}
                      </span>
                    </div>
                  </div>
                  {article.translationError && (
                    <div className="text-[9px] text-red-400">
                      {article.translationError}
                    </div>
                  )}
                  <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-white text-xs leading-tight line-clamp-1">
                    {stripHtml(
                      article.isTranslated && article.translatedTitle
                        ? article.translatedTitle
                        : article.title
                    )}
                  </h3>
                  <div className="flex items-end gap-2">
                    <p className="text-[10px] text-[#ffffff90] leading-snug line-clamp-2 flex-1">
                      {truncateContent(
                        article.isTranslated && article.translatedContent 
                          ? article.translatedContent 
                          : (article.original_text || article.content), 
                        80
                      )}
                    </p>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#67DBE2] hover:text-[#5bc5cb] hover:underline transition-colors flex-shrink-0"
                    >
                      {t("news.readMore")}
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