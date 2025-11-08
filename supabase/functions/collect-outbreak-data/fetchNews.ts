import type { NormalizedArticle } from "./types.ts";
import { parseRSSFeedArticles } from "./rss.ts";

export async function fetchArticles(): Promise<NormalizedArticle[]> {
  const articles: NormalizedArticle[] = [];

  // WHO
  // try {
  //   const whoArticles = await parseRSSFeed(
  //     "https://www.who.int/feeds/entity/csr/don/en/rss.xml",
  //     "WHO",
  //     20
  //   );
  //   articles.push(...whoArticles);
  // } catch (e) {
  //   console.warn("WHO fetch failed:", e);
  // }

  // // CDC
  // try {
  //   const cdcBaseUrl = "https://data.cdc.gov/resource/9mfq-cb36.json";
  //   const cdcUrl = `${cdcBaseUrl}?$limit=100&$order=${encodeURIComponent(
  //     "submission_date DESC"
  //   )}`;

  //   let cdcResponse: Response | null = null;
  //   let lastError: string | null = null;

  //   try {
  //     cdcResponse = await fetch(cdcUrl);
  //     if (!cdcResponse.ok) {
  //       lastError = `Direct fetch: ${cdcResponse.status}`;
  //       cdcResponse = null;
  //     }
  //   } catch (directError: any) {
  //     lastError = `Direct fetch error: ${directError.message}`;
  //   }

  //   if (!cdcResponse) {
  //     try {
  //       const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
  //         cdcUrl
  //       )}`;
  //       cdcResponse = await fetch(proxyUrl);
  //       if (!cdcResponse.ok) {
  //         lastError = `Proxy allorigins: ${cdcResponse.status}`;
  //         cdcResponse = null;
  //       }
  //     } catch (proxyError: any) {
  //       lastError = `Proxy allorigins error: ${proxyError.message}`;
  //     }
  //   }

  //   if (!cdcResponse) {
  //     try {
  //       const proxyUrl2 = `https://cors.isomorphic-git.org/${cdcUrl}`;
  //       cdcResponse = await fetch(proxyUrl2);
  //       if (!cdcResponse.ok) {
  //         lastError = `Proxy isomorphic-git: ${cdcResponse.status}`;
  //         cdcResponse = null;
  //       }
  //     } catch (proxyError2: any) {
  //       lastError = `Proxy isomorphic-git error: ${proxyError2.message}`;
  //     }
  //   }

  //   if (cdcResponse && cdcResponse.ok) {
  //     const cdcData = (await cdcResponse.json()) as Array<{
  //       submission_date?: string;
  //       state?: string;
  //       new_case?: string;
  //       tot_cases?: string;
  //       new_death?: string;
  //       tot_death?: string;
  //       [key: string]: any;
  //     }>;

  //     const thirtyDaysAgo = new Date();
  //     thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  //     cdcData.forEach((record) => {
  //       if (!record.submission_date) return;
  //       const recordDate = new Date(record.submission_date);
  //       if (recordDate < thirtyDaysAgo) return;
  //       const title = `CDC Update: ${record.state || "Unknown State"} - ${
  //         record.new_case || 0
  //       } new cases`;
  //       const content = `State: ${record.state || "Unknown"}, New Cases: ${
  //         record.new_case || "0"
  //       }, Total Cases: ${record.tot_cases || "0"}, New Deaths: ${
  //         record.new_death || "0"
  //       }, Total Deaths: ${record.tot_death || "0"}`;
  //       articles.push({
  //         title,
  //         content,
  //         url: `https://data.cdc.gov/resource/9mfq-cb36.json?submission_date=${
  //           record.submission_date
  //         }&state=${record.state || ""}`,
  //         publishedAt: record.submission_date,
  //         source: "CDC",
  //       });
  //     });
  //   } else {
  //     console.warn(`CDC fetch failed: ${lastError || "Unknown error"}`);
  //   }
  // } catch (e: any) {
  //   console.warn(
  //     `CDC fetch failed with unexpected error: ${e?.message || String(e)}`
  //   );
  // }

  // // BBC
  // try {
  //   const bbcArticles = await parseRSSFeed(
  //     "https://feeds.bbci.co.uk/news/health/rss.xml",
  //     "BBC Health",
  //     20
  //   );
  //   articles.push(...bbcArticles);
  // } catch (e) {
  //   console.warn("BBC Health fetch failed:", e);
  // }

  // // Reuters
  // try {
  //   const reutersArticles = await parseRSSFeed(
  //     "https://www.reutersagency.com/feed/?best-topics=health&post_type=best",
  //     "Reuters Health",
  //     20
  //   );
  //   articles.push(...reutersArticles);
  // } catch (e) {
  //   try {
  //     const reutersArticles2 = await parseRSSFeed(
  //       "https://www.reuters.com/rssFeed/health",
  //       "Reuters Health",
  //       20
  //     );
  //     articles.push(...reutersArticles2);
  //   } catch (e2) {
  //     console.warn("Reuters Health fetch failed:", e2);
  //   }
  // }

  // // ProMED
  // try {
  //   const promadArticles = await parseRSSFeed(
  //     "https://promedmail.org/wp-json/promed/v1/posts",
  //     "ProMED-mail",
  //     20
  //   );
  //   if (promadArticles.length === 0) {
  //     const promadResponse = await fetch(
  //       "https://promedmail.org/wp-json/promed/v1/posts?per_page=20"
  //     );
  //     if (promadResponse.ok) {
  //       const promadData = await promadResponse.json();
  //       if (Array.isArray(promadData)) {
  //         promadData.forEach((post: any) => {
  //           if (!post.title || !post.link) return;
  //           articles.push({
  //             title: post.title.rendered || post.title,
  //             content: post.content?.rendered || post.excerpt?.rendered || "",
  //             url: post.link || post.url,
  //             publishedAt: post.date || new Date().toISOString(),
  //             source: "ProMED-mail",
  //           });
  //         });
  //       }
  //     }
  //   } else {
  //     articles.push(...promadArticles);
  //   }
  // } catch (e) {
  //   console.warn("ProMED-mail fetch failed:", e);
  // }

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
