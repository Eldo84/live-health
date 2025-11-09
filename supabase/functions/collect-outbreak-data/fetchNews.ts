import type { NormalizedArticle } from "./types.ts";
import { parseRSSFeedArticles } from "./rss.ts";

export async function fetchArticles(): Promise<NormalizedArticle[]> {
  const articles: NormalizedArticle[] = [];

  // WHO - World Health Organization Disease Outbreak News
  // Note: The specific DON feed URL doesn't exist, using general news RSS which includes health news
  try {
    const whoArticles = await parseRSSFeedArticles({
      url: "https://www.who.int/rss-feeds/news-english.xml",
      sourceName: "WHO",
      maxItems: 50,
    });
    if (whoArticles.length > 0) {
      console.log(`WHO fetched ${whoArticles.length} articles`);
      articles.push(...whoArticles);
    }
  } catch (e) {
    console.warn("WHO fetch failed:", e);
  }

  // CDC - Centers for Disease Control (JSON API, not RSS)
  // Note: CDC API requires authentication or has CORS restrictions
  // Temporarily disabled until we can find a working endpoint or API key
  // The CDC data.gov API appears to be blocked or requires API token
  // Uncomment when CDC API access is available

  // BBC Health
  try {
    const bbcArticles = await parseRSSFeedArticles({
      url: "https://feeds.bbci.co.uk/news/health/rss.xml",
      sourceName: "BBC Health",
      maxItems: 50,
    });
    if (bbcArticles.length > 0) {
      console.log(`BBC Health fetched ${bbcArticles.length} articles`);
      articles.push(...bbcArticles);
    }
  } catch (e) {
    console.warn("BBC Health fetch failed:", e);
  }

  // Reuters Health
  // Note: Reuters RSS feeds appear to require authentication or have changed
  // Trying alternative health news RSS feeds
  try {
    // Try Reuters health news via Google News search as fallback
    // The direct RSS feeds are not publicly accessible
    console.log("Reuters Health RSS feeds are not publicly accessible, skipping");
  } catch (e) {
    console.warn("Reuters Health fetch failed:", e);
  }

  // ProMED-mail (Program for Monitoring Emerging Diseases)
  try {
    // Try RSS feed first (with www prefix - redirects require it)
    const promadRssUrl = "https://www.promedmail.org/feed/";
    const promadArticles = await parseRSSFeedArticles({
      url: promadRssUrl,
      sourceName: "ProMED-mail",
      maxItems: 50,
    });
    if (promadArticles.length > 0) {
      console.log(`ProMED-mail (RSS) fetched ${promadArticles.length} articles`);
      articles.push(...promadArticles);
    } else {
      // Fallback to WordPress REST API (with www prefix)
      console.log("ProMED-mail RSS empty, trying WordPress API...");
      try {
        const promadResponse = await fetch(
          "https://www.promedmail.org/wp-json/promed/v1/posts?per_page=50"
        );
        if (promadResponse.ok) {
          const promadData = await promadResponse.json();
          if (Array.isArray(promadData)) {
            promadData.forEach((post: any) => {
              if (!post.title || !post.link) return;
              articles.push({
                title: post.title.rendered || post.title,
                content: post.content?.rendered || post.excerpt?.rendered || "",
                url: post.link || post.url,
                publishedAt: post.date || new Date().toISOString(),
                source: "ProMED-mail",
              });
            });
            console.log(`ProMED-mail (WordPress API) fetched ${promadData.length} posts`);
          }
        } else {
          console.warn(`ProMED-mail WordPress API returned ${promadResponse.status}`);
        }
      } catch (apiError: any) {
        console.warn("ProMED-mail WordPress API failed:", apiError?.message);
      }
    }
  } catch (e) {
    console.warn("ProMED-mail fetch failed:", e);
  }

  // Google News (results for outbreaks, in the past 24 hours) via RSS parser
  const searchQuery = encodeURIComponent("outbreak when:1d");
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${searchQuery}&hl=en`;
    let googleArticles = await parseRSSFeedArticles({
      url: rssUrl,
      sourceName: "Google News",
      maxItems: 100,
    });
    if (googleArticles.length) {
      // // eliminate duplicates by title
      // const titles = new Set<string>();
      // googleArticles = googleArticles.filter((article) => {
      //   if (titles.has(article.title)) return false;
      //   titles.add(article.title);
      //   return true;
      // });
      console.log(
        `Google News fetched ${googleArticles.length} items for ${searchQuery}`
      );
      articles.push(...googleArticles);
    }
  } catch (e) {
    console.warn(`Google News fetch failed for ${searchQuery}:`, e);
  }

  return articles;
}
