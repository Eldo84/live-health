import { useMemo, useState, type ReactNode } from "react";
import { Icon } from "../components/Icon";
import { AlertTicker } from "../components/AlertTicker";
import { AdCard } from "../components/AdCard";
import { TopBar } from "./SurveillanceMap";
import { useLiveNews, type LiveNewsArticle } from "../data/useLiveNews";
import { useLiveAlerts } from "../data/useLiveAlerts";
import { useLiveSponsored } from "../data/useLiveSponsored";
import { useLiveOutbreaks } from "../data/useLiveOutbreaks";
import { useBreakpoint } from "../lib/useBreakpoint";
import { timeAgo } from "../lib/utils";
import { colorForDisease } from "../data/diseaseColors";
import { translateArticle } from "../../lib/translateArticle";
import { saveTranslation } from "../../lib/saveTranslation";
import { useLanguage, SUPPORTED_LANGUAGES } from "../../contexts/LanguageContext";
import { T } from "../components/T";
import { useT } from "../lib/useT";

const ACCENT = "#4ee0c4";

type Tab = "all" | "featured" | "breaking";

const FEATURED_SOURCES = new Set(["Reuters", "BBC", "Bloomberg", "WHO", "Google News"]);

export function NewsScreen() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTabletDown = bp !== "desktop";

  const { language } = useLanguage();

  const tSearchStories = useT("Search stories…");
  const tEmailPlaceholder = useT("you@example.com");
  const tTranslating = useT("Translating…");
  const tShowOriginal = useT("Show original");
  const tShowIn = useT("Show in");

  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [sources, setSources] = useState<Set<string>>(new Set());
  // Per-article translation state, keyed by `${articleId}::${targetLanguage}`
  // so users can flip languages and we don't return stale translations.
  type TState = {
    showing: "translated" | "original";
    title?: string;
    body?: string;
    loading?: boolean;
    error?: string;
  };
  const [translations, setTranslations] = useState<Record<string, TState>>({});

  const translationKey = (articleId: string) => `${articleId}::${language}`;

  const toggleTranslate = async (article: LiveNewsArticle) => {
    const key = translationKey(article.id);
    const cur = translations[key];
    // If we already have a fetched translation for this language, just flip the
    // displayed version (translated ↔ original).
    if (cur && cur.title) {
      setTranslations((m) => ({
        ...m,
        [key]: { ...cur, showing: cur.showing === "translated" ? "original" : "translated" },
      }));
      return;
    }
    setTranslations((m) => ({ ...m, [key]: { showing: "translated", loading: true } }));
    try {
      const src = article.language || undefined;
      const titlePromise = translateArticle(article.title, src, language);
      const bodyPromise = article.body
        ? translateArticle(article.body, src, language).catch(() => null)
        : Promise.resolve(null);
      const [titleRes, bodyRes] = await Promise.all([titlePromise, bodyPromise]);
      const newState: TState = {
        showing: "translated",
        title: titleRes.translatedText,
        body: bodyRes?.translatedText,
        loading: false,
      };
      setTranslations((m) => ({ ...m, [key]: newState }));
      // Persist so we don't re-translate next time (best-effort, fire-and-forget).
      // Only cache English server-side; other languages stay client-side per session.
      if (language === "en") {
        saveTranslation(
          article.id,
          bodyRes?.translatedText || titleRes.translatedText,
          titleRes.translatedText
        ).catch(() => {});
      }
    } catch (e: any) {
      setTranslations((m) => ({
        ...m,
        [key]: { showing: "original", loading: false, error: e?.message || "Translation failed" },
      }));
    }
  };

  const { articles, loading } = useLiveNews(60);
  const { alerts } = useLiveAlerts(8, "24h");
  const { ads } = useLiveSponsored({ location: "homepage" });
  const { outbreaks } = useLiveOutbreaks("7d", 200);

  const allSources = useMemo(
    () => Array.from(new Set(articles.map((a) => a.src))).sort(),
    [articles]
  );
  const allRegions = useMemo(
    () => Array.from(new Set(articles.map((a) => a.region))).sort(),
    [articles]
  );

  const filtered = useMemo(() => {
    return articles
      .filter((n) => sources.size === 0 || sources.has(n.src))
      .filter((n) => !region || n.region === region)
      .filter(
        (n) =>
          !search ||
          (n.title + " " + n.body + " " + n.src).toLowerCase().includes(search.toLowerCase())
      )
      .filter((n) => tab !== "featured" || FEATURED_SOURCES.has(n.src))
      .filter((n) => tab !== "breaking" || Date.now() - n.ts < 4 * 3600 * 1000);
  }, [articles, sources, region, search, tab]);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  // Sidebar: top diseases by article count
  const topDiseases = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of articles) {
      if (Date.now() - a.ts > 24 * 60 * 60 * 1000) continue;
      for (const d of a.diseases) {
        counts.set(d, (counts.get(d) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [articles]);

  const languageCount = useMemo(() => new Set(articles.map((a) => a.lang)).size, [articles]);
  const translatedCount = useMemo(() => articles.filter((a) => a.translated).length, [articles]);

  return (
    <div
      className="ln-app"
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "var(--ln-bg)",
        color: "var(--ln-ink)",
        overflow: "hidden",
      }}
    >
      <TopBar active="news" />

      {/* Masthead */}
      <section
        style={{
          padding: isMobile ? "20px 16px 14px" : "24px 28px 18px",
          borderBottom: "1px solid var(--ln-line)",
          background: "var(--ln-topbar)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "flex-end",
            gap: isMobile ? 12 : 24,
          }}
        >
          <div>
            <span className="ln-eyebrow"><T>News · open-source health intelligence</T></span>
            <h1
              className="ln-display"
              style={{
                fontSize: isMobile ? 32 : isTabletDown ? 44 : 56,
                lineHeight: 0.98,
                margin: "8px 0 0",
                letterSpacing: "-0.03em",
              }}
            >
              <T>The</T> <span style={{ color: "var(--ln-ink-3)", fontStyle: "italic" }}><T>day in</T></span> <T>outbreaks.</T>
            </h1>
            <p
              style={{
                fontSize: isMobile ? 13 : 14,
                color: "var(--ln-ink-2)",
                marginTop: 10,
                maxWidth: 620,
                lineHeight: 1.55,
              }}
            >
              <T>Curated from</T> {allSources.length || "1,200+"} <T>sources, deduplicated, machine-translated where
              available. Every story links back to its outbreak signal on the map.</T>
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: isMobile ? "flex-start" : "flex-end", gap: 6 }}>
            <span
              style={{
                fontFamily: "var(--ln-font-mono)",
                fontSize: 11,
                color: "var(--ln-ink-4)",
                letterSpacing: "0.12em",
              }}
            >
              {new Date().toUTCString().slice(0, 16).toUpperCase()}
            </span>
            <span style={{ fontFamily: "var(--ln-font-mono)", fontSize: 11, color: "var(--ln-ink-3)" }}>
              {loading ? (
                <T>loading…</T>
              ) : (
                <>
                  {filtered.length} <T>stories ·</T> {allSources.length} <T>sources</T>
                </>
              )}
            </span>
          </div>
        </div>
      </section>

      {/* Filter strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: isMobile ? "10px 12px" : "12px 28px",
          borderBottom: "1px solid var(--ln-line)",
          background: "var(--ln-topbar)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 0 }}>
          {(
            [
              { id: "all", l: <T>All stories</T>, n: articles.length },
              { id: "featured", l: <T>Featured</T>, n: articles.filter((a) => FEATURED_SOURCES.has(a.src)).length },
              { id: "breaking", l: <T>Breaking</T>, n: articles.filter((a) => Date.now() - a.ts < 4 * 3600 * 1000).length },
            ] as { id: Tab; l: ReactNode; n: number }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "10px 14px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: tab === t.id ? "var(--ln-ink)" : "var(--ln-ink-3)",
                borderBottom: tab === t.id ? `1.5px solid ${ACCENT}` : "1.5px solid transparent",
                fontSize: 13,
                whiteSpace: "nowrap",
              }}
            >
              {t.l}{" "}
              <span className="ln-num" style={{ color: "var(--ln-ink-4)", marginLeft: 4 }}>
                {t.n}
              </span>
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200, maxWidth: 360 }}>
          <span
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--ln-ink-4)",
            }}
          >
            <Icon.Search />
          </span>
          <input
            className="ln-input"
            placeholder={tSearchStories}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {!isMobile && (
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            style={{
              background: "var(--ln-surface-2)",
              border: "1px solid var(--ln-line-2)",
              padding: "7px 10px",
              fontSize: 12.5,
              color: "var(--ln-ink)",
              borderRadius: 6,
            }}
          >
            <option value=""><T>All regions</T></option>
            {allRegions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Body */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isTabletDown ? "1fr" : "1fr 360px",
        }}
      >
        <main>
          {/* Featured */}
          {featured && (
            <article
              style={{
                borderBottom: "1px solid var(--ln-line)",
                padding: isMobile ? "20px 16px" : "32px 28px",
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr",
                gap: isMobile ? 18 : 32,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className="ln-chip is-crit">
                    <span className="ln-blink">●</span> <T>TOP STORY</T>
                  </span>
                  <span className="ln-eyebrow">
                    {featured.src.toUpperCase()} · {featured.region.toUpperCase()}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--ln-font-mono)",
                      fontSize: 10,
                      color: "var(--ln-ink-4)",
                    }}
                  >
                    {timeAgo(featured.ts)} <T>AGO</T>
                  </span>
                </div>
                {(() => {
                  const t = translations[translationKey(featured.id)];
                  const showTranslated = t?.showing === "translated" && t.title;
                  return (
                    <>
                      <h2
                        className="ln-display"
                        style={{
                          fontSize: isMobile ? 26 : 38,
                          lineHeight: 1.05,
                          margin: "14px 0 12px",
                          letterSpacing: "-0.025em",
                        }}
                      >
                        {showTranslated ? t!.title : featured.title}
                      </h2>
                      {(showTranslated ? t!.body || featured.body : featured.body) && (
                        <p
                          style={{
                            fontSize: 15.5,
                            color: "var(--ln-ink-2)",
                            lineHeight: 1.55,
                            marginBottom: 18,
                          }}
                        >
                          {showTranslated ? t!.body || featured.body : featured.body}
                        </p>
                      )}
                    </>
                  );
                })()}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  {featured.url ? (
                    <a
                      href={featured.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ln-btn is-primary"
                    >
                      <T>Read full story</T> <Icon.ArrowR />
                    </a>
                  ) : (
                    <button className="ln-btn is-primary" disabled>
                      <T>Read full story</T> <Icon.ArrowR />
                    </button>
                  )}
                  {(() => {
                    // Show the toggle whenever the source language differs from
                    // the active app language. Hide it if they match (no point
                    // translating English → English).
                    const src = (featured.lang || "en").toLowerCase();
                    if (src === language) return null;
                    const t = translations[translationKey(featured.id)];
                    const targetName =
                      SUPPORTED_LANGUAGES.find((l) => l.code === language)?.nativeName ||
                      language.toUpperCase();
                    return (
                      <button
                        className="ln-btn"
                        onClick={() => toggleTranslate(featured)}
                        disabled={t?.loading}
                      >
                        🌐{" "}
                        {t?.loading
                          ? tTranslating
                          : t?.showing === "translated"
                          ? `${tShowOriginal} (${featured.lang.toUpperCase()})`
                          : `${tShowIn} ${targetName}`}
                      </button>
                    );
                  })()}
                  <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                    {featured.diseases.slice(0, 3).map((d) => (
                      <span
                        key={d}
                        className="ln-chip"
                        style={{ borderColor: `${colorForDisease(d)}55` }}
                      >
                        <span
                          style={{ width: 6, height: 6, background: colorForDisease(d), borderRadius: 1 }}
                        />
                        {d}
                      </span>
                    ))}
                  </span>
                </div>
              </div>
              <FeaturedSignal article={featured} outbreaks={outbreaks} />
            </article>
          )}

          {/* Section heading */}
          <div style={{ padding: isMobile ? "16px 16px 8px" : "20px 28px 10px" }}>
            <span className="ln-eyebrow"><T>More stories</T></span>
            <div style={{ fontSize: 12, color: "var(--ln-ink-3)", marginTop: 4 }}>
              {rest.length} <T>stories · last 24h</T>
            </div>
          </div>

          {/* Story grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              borderTop: "1px solid var(--ln-line)",
            }}
          >
            {rest.map((n, i, arr) => {
              const t = translations[translationKey(n.id)];
              return (
                <StoryCard
                  key={n.id}
                  story={n}
                  isMobile={isMobile}
                  translation={t}
                  activeLanguage={language}
                  onTranslate={() => toggleTranslate(n)}
                  borderRight={!isMobile && i % 2 === 0}
                  borderBottom={isMobile ? i < arr.length - 1 : i < arr.length - 2 + (arr.length % 2)}
                />
              );
            })}
          </div>

          {ads[1] && (
            <div style={{ borderTop: "1px solid var(--ln-line)" }}>
              <AdCard ad={ads[1]} variant="inline" />
            </div>
          )}

          {rest.length === 0 && !loading && (
            <div style={{ padding: 32, fontSize: 13, color: "var(--ln-ink-3)", textAlign: "center" }}>
              <T>No more stories match these filters.</T>
            </div>
          )}
        </main>

        {!isTabletDown && (
          <aside
            style={{ borderLeft: "1px solid var(--ln-line)", background: "var(--ln-rail)" }}
            className="ln-pane"
          >
            <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid var(--ln-line)" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <span className="ln-eyebrow"><T>Sources</T></span>
                {sources.size > 0 && (
                  <button
                    onClick={() => setSources(new Set())}
                    style={{
                      fontSize: 10,
                      color: "var(--ln-ink-3)",
                      cursor: "pointer",
                      background: "none",
                      border: "none",
                    }}
                  >
                    <T>CLEAR</T>
                  </button>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 240, overflowY: "auto" }}>
                {allSources.slice(0, 15).map((s) => {
                  const on = sources.has(s);
                  const count = articles.filter((a) => a.src === s).length;
                  return (
                    <button
                      key={s}
                      onClick={() => {
                        const ns = new Set(sources);
                        if (on) ns.delete(s);
                        else ns.add(s);
                        setSources(ns);
                      }}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "14px 1fr auto",
                        alignItems: "center",
                        gap: 10,
                        padding: "6px 6px",
                        background: on ? "rgba(255,255,255,0.04)" : "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "inherit",
                        textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          border: `1px solid ${on ? ACCENT : "var(--ln-line-3)"}`,
                          background: on ? ACCENT : "transparent",
                        }}
                      />
                      <span
                        style={{
                          fontSize: 12.5,
                          fontFamily: "var(--ln-font-mono)",
                          letterSpacing: "0.04em",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.toUpperCase()}
                      </span>
                      <span className="ln-num" style={{ fontSize: 11, color: "var(--ln-ink-3)" }}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {topDiseases.length > 0 && (
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ln-line)" }}>
                <span className="ln-eyebrow"><T>Most-discussed pathogens · 24h</T></span>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
                  {topDiseases.map(([name, n]) => {
                    const max = topDiseases[0][1];
                    const color = colorForDisease(name);
                    return (
                      <div
                        key={name}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "120px 1fr auto",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={name}
                        >
                          <span style={{ width: 7, height: 7, background: color, borderRadius: 1 }} />
                          {name}
                        </span>
                        <div style={{ height: 8, background: "rgba(255,255,255,0.04)", position: "relative" }}>
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              width: `${(n / max) * 100}%`,
                              background: color,
                              opacity: 0.7,
                            }}
                          />
                        </div>
                        <span className="ln-num" style={{ fontSize: 11, color: "var(--ln-ink-3)" }}>
                          {n}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ln-line)" }}>
              <span className="ln-eyebrow"><T>Translation status</T></span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, fontSize: 12, marginTop: 8 }}>
                <span style={{ color: "var(--ln-ink-2)" }}><T>Foreign-language</T></span>
                <span className="ln-num" style={{ color: "var(--ln-brand)" }}>
                  {translatedCount}
                </span>
                <span style={{ color: "var(--ln-ink-2)" }}><T>English-only</T></span>
                <span className="ln-num">{articles.length - translatedCount}</span>
                <span style={{ color: "var(--ln-ink-2)" }}><T>Languages</T></span>
                <span className="ln-num">{languageCount}</span>
              </div>
            </div>

            <div style={{ padding: "14px 18px 10px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <span className="ln-eyebrow"><T>Live alerts</T></span>
                <span className="ln-chip is-crit">
                  <span className="ln-blink">●</span> <T>LIVE</T>
                </span>
              </div>
            </div>
            <AlertTicker items={alerts.slice(0, 4)} />

            <div style={{ padding: "18px", borderTop: "1px solid var(--ln-line)", background: "var(--ln-surface)" }}>
              <span className="ln-eyebrow"><T>Newsletter</T></span>
              <h3 style={{ fontSize: 14, fontWeight: 500, margin: "6px 0 8px" }}>
                <T>The daily outbreak briefing</T>
              </h3>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--ln-ink-3)",
                  lineHeight: 1.5,
                  margin: "0 0 12px",
                }}
              >
                <T>One email each morning · what changed overnight, by region.</T>
              </p>
              <div style={{ display: "flex", gap: 6 }}>
                <input className="ln-input" placeholder={tEmailPlaceholder} style={{ paddingLeft: 10 }} />
                <button className="ln-btn is-primary">
                  <Icon.ArrowR />
                </button>
              </div>
            </div>

            {ads[0] && (
              <div style={{ padding: "14px 18px", borderTop: "1px solid var(--ln-line)" }}>
                <AdCard ad={ads[0]} variant="sidebar" dense />
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

function FeaturedSignal({
  article,
  outbreaks,
}: {
  article: LiveNewsArticle;
  outbreaks: ReturnType<typeof useLiveOutbreaks>["outbreaks"];
}) {
  // Try to find a real outbreak from the same country + a mentioned disease.
  const linked = useMemo(() => {
    if (!outbreaks.length) return null;
    for (const o of outbreaks) {
      if (o.country === article.country && article.diseases.some((d) => o.disease.includes(d) || d.includes(o.disease))) {
        return o;
      }
    }
    // Fall back to disease match only.
    for (const o of outbreaks) {
      if (article.diseases.some((d) => o.disease.includes(d) || d.includes(o.disease))) {
        return o;
      }
    }
    return null;
  }, [outbreaks, article]);

  return (
    <div
      style={{
        background: "var(--ln-surface)",
        border: "1px solid var(--ln-line)",
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="ln-eyebrow"><T>Linked signal</T></span>
        <span style={{ fontFamily: "var(--ln-font-mono)", fontSize: 10, color: "var(--ln-ink-4)" }}>
          {linked ? linked.id.slice(0, 8).toUpperCase() : <T>NEW</T>}
        </span>
      </div>
      {linked ? (
        <>
          <div>
            <div className="ln-display" style={{ fontSize: 22, lineHeight: 1.05 }}>
              {linked.disease}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ln-ink-3)", marginTop: 2 }}>
              {linked.city}
              {linked.city ? `, ${linked.country}` : linked.country}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <Mini label={<T>Cases</T>} value={linked.cases > 0 ? linked.cases.toLocaleString() : "—"} />
            <Mini
              label={<T>Deaths</T>}
              value={linked.deaths > 0 ? linked.deaths.toLocaleString() : "—"}
              tone={linked.deaths > 0 ? "crit" : undefined}
            />
            <Mini label={<T>Severity</T>} value={`${linked.severity}/5`} />
          </div>
          <div style={{ height: 1, background: "var(--ln-line)" }} />
          <a href="/map" className="ln-btn" style={{ justifyContent: "center" }}>
            <T>Open on map</T> <Icon.Map />
          </a>
        </>
      ) : (
        <div style={{ fontSize: 12.5, color: "var(--ln-ink-3)", lineHeight: 1.5 }}>
          <T>No active map signal linked yet. Story may relate to early reporting before geolocation.</T>
        </div>
      )}
    </div>
  );
}

function Mini({ label, value, tone }: { label: ReactNode; value: string; tone?: "crit" }) {
  return (
    <div style={{ background: "var(--ln-surface-2)", padding: "8px 10px" }}>
      <div className="ln-eyebrow" style={{ fontSize: 9 }}>
        {label}
      </div>
      <div
        className="ln-num"
        style={{
          fontSize: 15,
          color: tone === "crit" ? "var(--ln-crit)" : "var(--ln-ink)",
          marginTop: 2,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StoryCard({
  story,
  isMobile,
  translation,
  onTranslate,
  activeLanguage,
  borderRight,
  borderBottom,
}: {
  story: LiveNewsArticle;
  isMobile: boolean;
  translation?: { showing: "translated" | "original"; title?: string; body?: string; loading?: boolean; error?: string };
  onTranslate: () => void;
  activeLanguage: string;
  borderRight: boolean;
  borderBottom: boolean;
}) {
  const tShowOriginal = useT("Show original");
  const tTranslateTo = useT("Translate to");
  const tTranslating = useT("Translating…");
  const tOriginal = useT("Original");
  const tTranslate = useT("Translate");
  const handleOpen = () => {
    if (story.url) window.open(story.url, "_blank", "noopener,noreferrer");
  };
  const showTranslated = translation?.showing === "translated" && !!translation?.title;
  const title = showTranslated ? translation!.title! : story.title;
  const body = showTranslated ? translation!.body || story.body : story.body;
  return (
    <article
      onClick={handleOpen}
      style={{
        padding: isMobile ? "16px 16px" : "20px 22px",
        borderRight: borderRight ? "1px solid var(--ln-line)" : "none",
        borderBottom: borderBottom ? "1px solid var(--ln-line)" : "none",
        cursor: story.url ? "pointer" : "default",
        transition: "background .12s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ln-surface)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <span
          style={{
            fontFamily: "var(--ln-font-mono)",
            fontSize: 10,
            color: "var(--ln-ink-3)",
            letterSpacing: "0.1em",
          }}
        >
          {story.src.toUpperCase()}
        </span>
        <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--ln-ink-4)" }} />
        <span
          style={{
            fontFamily: "var(--ln-font-mono)",
            fontSize: 10,
            color: "var(--ln-ink-3)",
            letterSpacing: "0.1em",
          }}
        >
          {story.region.toUpperCase()}
        </span>
        <div style={{ flex: 1 }} />
        <span
          style={{
            fontFamily: "var(--ln-font-mono)",
            fontSize: 10,
            color: "var(--ln-ink-4)",
          }}
        >
          {timeAgo(story.ts)} <T>AGO</T>
        </span>
      </div>
      <h3
        style={{
          fontSize: 17,
          lineHeight: 1.25,
          margin: "0 0 8px",
          fontWeight: 500,
        }}
      >
        {title}
      </h3>
      {body && (
        <p
          style={{
            fontSize: 13,
            color: "var(--ln-ink-2)",
            lineHeight: 1.5,
            margin: "0 0 12px",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {body}
        </p>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {story.diseases.slice(0, 2).map((d) => (
          <span key={d} className="ln-chip" style={{ fontSize: 10 }}>
            <span style={{ width: 6, height: 6, background: colorForDisease(d), borderRadius: 1 }} />
            {d}
          </span>
        ))}
        {(story.lang || "en").toLowerCase() !== activeLanguage && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTranslate();
            }}
            className="ln-chip is-info"
            style={{ cursor: "pointer", fontSize: 10 }}
            disabled={translation?.loading}
            title={
              translation?.error ||
              (showTranslated
                ? `${tShowOriginal} (${story.lang.toUpperCase()})`
                : `${tTranslateTo} ${
                    SUPPORTED_LANGUAGES.find((l) => l.code === activeLanguage)?.nativeName ||
                    activeLanguage.toUpperCase()
                  }`)
            }
          >
            🌐{" "}
            {translation?.loading
              ? tTranslating
              : showTranslated
              ? `${tOriginal} ${story.lang.toUpperCase()}`
              : tTranslate}
          </button>
        )}
      </div>
    </article>
  );
}
