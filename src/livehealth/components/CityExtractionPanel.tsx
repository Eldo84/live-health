import { useEffect, useState } from "react";
import { Icon } from "./Icon";

interface ExtractedSignal {
  signal_id: string;
  article_title: string | null;
  article_url: string | null;
  city: string | null;
  country: string | null;
  disease: string;
  source: string;
  detected_at: string;
  cases: number | null;
  deaths: number | null;
}

interface Stats {
  total: number;
  withCity: number;
  uniqueCities: number;
  topCities: { city: string; count: number }[];
}

interface Props {
  isMobile: boolean;
}

// Surfaces how well our pipeline extracts city-level locations from news
// articles. Lighter port of the old CityExtractionStatus — keeps stats + recent
// signal table, drops the disease-summary dialog (that's a separate flow now).
export function CityExtractionPanel({ isMobile }: Props) {
  const [signals, setSignals] = useState<ExtractedSignal[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase configuration");

        const params = new URLSearchParams();
        params.set(
          "select",
          "id,city,detected_at,case_count_mentioned,mortality_count_mentioned,detected_disease_name,countries!country_id(name),news_articles!article_id(title,url,news_sources!source_id(name)),diseases!disease_id(name)"
        );
        params.set("city", "not.is.null");
        params.set("order", "detected_at.desc");
        params.set("limit", "30");

        const res = await fetch(`${supabaseUrl}/rest/v1/outbreak_signals?${params.toString()}`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        });
        if (!res.ok) throw new Error(`Fetch failed: ${res.statusText}`);
        const rows: any[] = await res.json();

        const transformed: ExtractedSignal[] = rows.map((r) => {
          const a = Array.isArray(r.news_articles) ? r.news_articles[0] : r.news_articles;
          const d = Array.isArray(r.diseases) ? r.diseases[0] : r.diseases;
          const c = Array.isArray(r.countries) ? r.countries[0] : r.countries;
          const src = a?.news_sources
            ? Array.isArray(a.news_sources)
              ? a.news_sources[0]
              : a.news_sources
            : null;
          const diseaseName = d?.name || "Unknown";
          const display =
            diseaseName.toUpperCase() === "OTHER" && r.detected_disease_name
              ? r.detected_disease_name
              : diseaseName;
          return {
            signal_id: r.id,
            article_title: a?.title || null,
            article_url: a?.url || null,
            city: r.city || null,
            country: c?.name || null,
            disease: display,
            source: src?.name?.trim() || "Unknown",
            detected_at: r.detected_at,
            cases: r.case_count_mentioned ?? null,
            deaths: r.mortality_count_mentioned ?? null,
          };
        });

        // Coverage stats — separate light query so we don't over-fetch.
        const totalRes = await fetch(
          `${supabaseUrl}/rest/v1/outbreak_signals?select=id&limit=1`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              Prefer: "count=exact",
            },
          }
        );
        const withCityRes = await fetch(
          `${supabaseUrl}/rest/v1/outbreak_signals?select=id&city=not.is.null&limit=1`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              Prefer: "count=exact",
            },
          }
        );

        const parseCount = (resp: Response) => {
          const cr = resp.headers.get("content-range");
          const m = cr?.match(/\/(\d+)/);
          return m ? parseInt(m[1], 10) : 0;
        };

        const total = parseCount(totalRes);
        const withCity = parseCount(withCityRes);

        const counts = new Map<string, number>();
        transformed.forEach((t) => {
          if (t.city) counts.set(t.city, (counts.get(t.city) || 0) + 1);
        });
        const topCities = Array.from(counts.entries())
          .map(([city, count]) => ({ city, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);

        if (cancelled) return;
        setSignals(transformed);
        setStats({ total, withCity, uniqueCities: counts.size, topCities });
        setError(null);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "Failed to load extraction data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pct = stats && stats.total > 0 ? Math.round((stats.withCity / stats.total) * 100) : 0;

  return (
    <div style={{ borderBottom: "1px solid var(--ln-line)" }}>
      <div
        style={{
          padding: isMobile ? "18px 14px 12px" : "22px 22px 14px",
          borderBottom: "1px solid var(--ln-line)",
        }}
      >
        <span className="ln-eyebrow">Pipeline · location extraction</span>
        <h2
          className="ln-display"
          style={{ fontSize: isMobile ? 20 : 24, margin: "6px 0 4px", letterSpacing: "-0.02em" }}
        >
          City resolution{" "}
          <span style={{ fontStyle: "italic", color: "var(--ln-ink-3)" }}>quality.</span>
        </h2>
        <p style={{ fontSize: 12.5, color: "var(--ln-ink-3)", margin: 0, lineHeight: 1.5 }}>
          How well downstream signals carry a city-level location. Improves map precision and
          country dossiers.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
          borderBottom: "1px solid var(--ln-line)",
        }}
      >
        <KPI label="Total signals" value={stats ? stats.total.toLocaleString() : "—"} mono />
        <KPI
          label="With city"
          value={stats ? stats.withCity.toLocaleString() : "—"}
          sub={stats ? `${pct}% of total` : undefined}
          accent="var(--ln-brand)"
          mono
        />
        <KPI
          label="Missing city"
          value={stats ? (stats.total - stats.withCity).toLocaleString() : "—"}
          accent="var(--ln-warn)"
          mono
        />
        <KPI
          label="Unique cities (recent)"
          value={stats ? stats.uniqueCities.toLocaleString() : "—"}
          accent="var(--ln-info)"
          mono
        />
      </div>

      {stats && stats.topCities.length > 0 && (
        <div
          style={{
            padding: isMobile ? "10px 14px" : "12px 22px",
            borderBottom: "1px solid var(--ln-line)",
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span className="ln-eyebrow" style={{ marginRight: 6 }}>
            Top cities (recent)
          </span>
          {stats.topCities.map((c) => (
            <span
              key={c.city}
              style={{
                padding: "4px 10px",
                background: "var(--ln-surface)",
                border: "1px solid var(--ln-line-2)",
                borderRadius: 4,
                fontSize: 11.5,
                color: "var(--ln-ink-2)",
                fontFamily: "var(--ln-font-mono)",
              }}
            >
              {c.city.toUpperCase()} · {c.count}
            </span>
          ))}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "12px 22px",
            color: "var(--ln-crit)",
            fontSize: 12.5,
            borderBottom: "1px solid var(--ln-line)",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: isMobile ? 720 : "auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1.4fr 1fr 80px 80px 100px",
              alignItems: "center",
              gap: 12,
              padding: "10px 22px",
              borderBottom: "1px solid var(--ln-line-2)",
              fontFamily: "var(--ln-font-mono)",
              fontSize: 10,
              letterSpacing: "0.08em",
              color: "var(--ln-ink-4)",
              background: "var(--ln-surface)",
            }}
          >
            <span>LOCATION</span>
            <span>DISEASE / HEADLINE</span>
            <span>SOURCE</span>
            <span style={{ textAlign: "right" }}>CASES</span>
            <span style={{ textAlign: "right" }}>DEATHS</span>
            <span>DETECTED</span>
          </div>
          {loading && (
            <div style={{ padding: "16px 22px", fontSize: 12, color: "var(--ln-ink-3)" }}>Loading…</div>
          )}
          {!loading && signals.length === 0 && !error && (
            <div style={{ padding: "16px 22px", fontSize: 12, color: "var(--ln-ink-3)" }}>
              No city-resolved signals yet.
            </div>
          )}
          {signals.map((s) => (
            <div
              key={s.signal_id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1.4fr 1fr 80px 80px 100px",
                alignItems: "center",
                gap: 12,
                padding: "8px 22px",
                borderBottom: "1px solid var(--ln-line)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12.5,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.city || "—"}
                </div>
                <div
                  style={{
                    fontFamily: "var(--ln-font-mono)",
                    fontSize: 10,
                    color: "var(--ln-ink-4)",
                  }}
                >
                  {(s.country || "").toUpperCase()}
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ln-ink-2)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={s.disease}
                >
                  {s.disease}
                </div>
                {s.article_url ? (
                  <a
                    href={s.article_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      color: "var(--ln-ink-4)",
                      textDecoration: "none",
                      maxWidth: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={s.article_title || ""}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 220,
                      }}
                    >
                      {s.article_title || "(article)"}
                    </span>
                    <Icon.ArrowR />
                  </a>
                ) : (
                  <span style={{ fontSize: 11, color: "var(--ln-ink-4)" }}>{s.article_title || "—"}</span>
                )}
              </div>
              <span
                style={{
                  fontFamily: "var(--ln-font-mono)",
                  fontSize: 11,
                  color: "var(--ln-ink-3)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={s.source}
              >
                {s.source}
              </span>
              <span className="ln-num" style={{ fontSize: 12, textAlign: "right" }}>
                {s.cases && s.cases > 0 ? s.cases.toLocaleString() : "—"}
              </span>
              <span
                className="ln-num"
                style={{
                  fontSize: 12,
                  textAlign: "right",
                  color: s.deaths && s.deaths > 0 ? "var(--ln-crit)" : "var(--ln-ink-4)",
                }}
              >
                {s.deaths && s.deaths > 0 ? s.deaths.toLocaleString() : "—"}
              </span>
              <span
                style={{
                  fontFamily: "var(--ln-font-mono)",
                  fontSize: 11,
                  color: "var(--ln-ink-3)",
                }}
              >
                {timeAgoShort(s.detected_at)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPI({
  label,
  value,
  sub,
  accent,
  mono,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        padding: "14px 18px",
        borderRight: "1px solid var(--ln-line)",
        position: "relative",
      }}
    >
      {accent && (
        <div style={{ position: "absolute", top: 0, left: 0, width: 24, height: 2, background: accent }} />
      )}
      <div className="ln-eyebrow" style={{ fontSize: 9 }}>
        {label}
      </div>
      <div
        className={mono ? "ln-num" : undefined}
        style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", marginTop: 6 }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 10.5, color: "var(--ln-ink-4)", marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

function timeAgoShort(iso: string): string {
  const t = new Date(iso).getTime();
  if (!t) return "—";
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}
