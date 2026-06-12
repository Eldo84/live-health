import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { LiveMap } from "../components/LiveMap";
import { ThemeToggle } from "../components/ThemeToggle";
import { LanguageSelector } from "../components/LanguageSelector";
import { AlertTicker } from "../components/AlertTicker";
import { AdCard } from "../components/AdCard";
import { useLiveOutbreaks, type LiveOutbreak } from "../data/useLiveOutbreaks";
import { useOutbreakCategoriesLive } from "../data/useOutbreakCategoriesLive";
import { getCategoryColor } from "../lib/categoryColors";
import { useLiveAlerts } from "../data/useLiveAlerts";
import { useLiveSponsored } from "../data/useLiveSponsored";
import { useUserLocation } from "../../lib/useUserLocation";
import { useHealthMinistry } from "../../lib/useHealthMinistry";
import { useT } from "../lib/useT";
import { severityColor, timeAgo, haversineKm } from "../lib/utils";
import { PREDICTIONS } from "../data/predictions";
import { useMobileSize } from "../lib/useBreakpoint";

const ACCENT = "#4ee0c4";

type SheetMode = "peek" | "half" | "full";
type Tab = "nearby" | "alerts" | "news";

// Native-feeling mobile map screen modeled on screen-mobile.jsx from the
// design bundle: full-bleed map, scrolling filter chips, 3-stop pull-up sheet,
// bottom tab nav. Replaces the responsive SurveillanceMap below ~720px.
export function MobileMapScreen() {
  const mobileSize = useMobileSize();
  const isNarrow = mobileSize === "narrow";
  const [sheetMode, setSheetMode] = useState<SheetMode>("peek");
  const [tab, setTab] = useState<Tab>("nearby");
  const [chip, setChip] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<LiveOutbreak | null>(null);
  // Immersive mode: hides header/chips/banner/sheet so the map gets the whole
  // screen — the direct fix for "can't view the map" on small phones.
  const [immersive, setImmersive] = useState(false);
  const [aiBannerOpen, setAiBannerOpen] = useState(true);

  const { outbreaks, loading } = useLiveOutbreaks("7d", 300);
  const { alerts } = useLiveAlerts(20, "24h");
  const { ads } = useLiveSponsored({ location: "map" });
  const { location: userLocation } = useUserLocation();
  const { categories } = useOutbreakCategoriesLive();

  // diseaseId → category label, so map cluster donuts color each point with the
  // curated palette. Largest category wins when a disease spans more than one.
  const categoryLabelByDisease = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) {
      for (const did of c.diseaseIds) {
        if (!m.has(did)) m.set(did, c.label);
      }
    }
    return m;
  }, [categories]);

  // Translated UI labels.
  const tAll = useT("All");
  const tCritical = useT("● Critical");
  const tSearchPlaceholder = useT("Search countries, diseases, cities…");
  const tLive = useT("LIVE");
  const tLoading = useT("LOADING");
  const tEvents = useT("EVENTS");
  const tCountries = useT("COUNTRIES");
  const tNearby = useT("Nearby");
  const tAlertsTab = useT("Alerts");
  const tNewsTab = useT("News");
  const tNear = useT("Near");
  const tByRecency = useT("By recency");
  const tSignal = useT("signal");
  const tSignals = useT("signals");
  const tAIForecast = useT("AI FORECAST");

  // Build chips dynamically — All + Critical + top diseases by count
  const chips = useMemo(() => {
    const byDisease = new Map<string, number>();
    for (const o of outbreaks) {
      byDisease.set(o.disease, (byDisease.get(o.disease) || 0) + 1);
    }
    const top = Array.from(byDisease.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ id: name, label: name.split(" ")[0], count }));
    return [
      { id: "all", label: tAll, count: outbreaks.length },
      { id: "crit", label: tCritical, count: outbreaks.filter((o) => o.severity >= 4).length },
      ...top,
    ];
  }, [outbreaks, tAll, tCritical]);

  const filtered = useMemo(() => {
    return outbreaks
      .filter((o) => {
        if (chip === "all") return true;
        if (chip === "crit") return o.severity >= 4;
        return o.disease === chip;
      })
      .filter((o) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          o.disease.toLowerCase().includes(q) ||
          o.country.toLowerCase().includes(q) ||
          (o.city || "").toLowerCase().includes(q)
        );
      });
  }, [outbreaks, chip, search]);

  // Sort "nearby" tab by distance from user when we have a location, else by recency.
  const nearbySorted = useMemo(() => {
    const list = filtered.slice();
    if (userLocation?.coordinates) {
      const me = userLocation.coordinates as [number, number];
      list.sort((a, b) => {
        const da = haversineKm([a.lat, a.lng], me);
        const db = haversineKm([b.lat, b.lng], me);
        return da - db;
      });
    } else {
      list.sort((a, b) => b.updated - a.updated);
    }
    return list.slice(0, 25);
  }, [filtered, userLocation]);

  // Peek shows just the handle + tabs (~120px) so the map keeps most of the
  // screen by default; half/full are for actually reading the lists.
  const sheetHeight =
    sheetMode === "peek"
      ? 120
      : sheetMode === "half"
      ? "clamp(220px, 48%, 360px)"
      : "calc(100% - 72px)";
  const sheetCss = typeof sheetHeight === "number" ? `${sheetHeight}px` : sheetHeight;

  const topPrediction = useMemo(() => [...PREDICTIONS].sort((a, b) => b.risk - a.risk)[0], []);
  const featuredAd = ads[0];

  const cycleSheet = () =>
    setSheetMode(sheetMode === "peek" ? "half" : sheetMode === "half" ? "full" : "peek");

  return (
    <div
      className="ln-app ln-shell-subnav"
      style={{
        width: "100%",
        background: "var(--ln-bg)",
        color: "var(--ln-ink)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Map — fills the entire viewport so it's always painted at full height
          regardless of header/sheet sizing. Header and sheet float on top. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--ln-map-bg)",
          zIndex: 0,
        }}
      >
        <LiveMap
          outbreaks={filtered}
          selectedId={selected?.id ?? null}
          pulse
          cluster
          popup={false}
          onSelect={(o) => setSelected(o)}
          focusOn={userLocation?.coordinates ? (userLocation.coordinates as [number, number]) : null}
          focusRadiusKm={3000}
          clusterCategoryFor={(o) => {
            const label = (o.diseaseId ? categoryLabelByDisease.get(o.diseaseId) : null) || "Other";
            return { label, color: getCategoryColor(label) };
          }}
        />
      </div>

      {/* Top chrome — header, chips and AI strip stacked in one flow container
          (no hardcoded offsets) and kept as slim as possible: every pixel of
          chrome here is map the user can't see. */}
      {!immersive && (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 600,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            background: "color-mix(in oklab, var(--ln-topbar) 88%, transparent)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid var(--ln-line)",
          }}
        >
        <header style={{ padding: "8px 12px 0" }}>
          {/* Row 1: brand · live counts · actions — the old separate LIVE row
              is folded in here to save a full line of chrome. */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none" }}>
              <div style={{ position: "relative", width: 12, height: 12 }}>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: ACCENT,
                    animation: "ln-pulse-soft 2.4s infinite ease-in-out",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: ACCENT,
                    opacity: 0.35,
                    animation: "ln-pulse 2.4s infinite ease-out",
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: "var(--ln-font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  fontWeight: 500,
                  color: "var(--ln-ink)",
                }}
              >
                <span>OUTBREAK</span>
                <span style={{ color: ACCENT }}>NOW</span>
              </div>
            </Link>
            <span
              title={`${filtered.length} ${tEvents} · ${new Set(filtered.map((o) => o.country)).size} ${tCountries}`}
              style={{
                flex: 1,
                minWidth: 0,
                textAlign: "right",
                fontFamily: "var(--ln-font-mono)",
                fontSize: 9.5,
                letterSpacing: "0.08em",
                color: "var(--ln-ink-3)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <span style={{ color: ACCENT }}>{loading ? tLoading : tLive}</span>
              {" · "}
              {filtered.length} · {new Set(filtered.map((o) => o.country)).size}
            </span>
            <div style={{ display: "flex", gap: 9, alignItems: "center", color: "var(--ln-ink-2)", flex: "0 0 auto" }}>
              <LanguageSelector />
              <ThemeToggle />
              <span style={{ position: "relative", display: "inline-block" }}>
                <Icon.Bell />
                {alerts.filter((a) => a.level === "critical" || a.level === "high").length > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -6,
                      background: "var(--ln-crit)",
                      color: "#fff",
                      fontSize: 9,
                      borderRadius: 999,
                      padding: "0 4px",
                      fontFamily: "var(--ln-font-mono)",
                    }}
                  >
                    {alerts.filter((a) => a.level === "critical" || a.level === "high").length}
                  </span>
                )}
              </span>
              <Link to="/dashboard" style={{ color: "inherit" }}>
                <Icon.Menu />
              </Link>
            </div>
          </div>

          {/* Row 2: compact search */}
          <div style={{ position: "relative", marginTop: 7 }}>
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
              style={{ padding: "5px 10px 5px 30px", fontSize: 12.5 }}
              placeholder={tSearchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </header>

        {/* Filter chips */}
        <div
          className="ln-pane"
          style={{
            display: "flex",
            gap: 6,
            padding: isNarrow ? "7px 12px 8px" : "7px 14px 8px",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {chips.map((c) => (
            <button
              key={c.id}
              onClick={() => setChip(c.id)}
              className={`ln-chip ${chip === c.id ? "is-ok" : ""}`}
              style={{
                flex: "0 0 auto",
                cursor: "pointer",
                padding: isNarrow ? "4px 8px" : "4px 10px",
                borderRadius: 999,
              }}
            >
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: isNarrow ? 90 : 120,
                  display: "inline-block",
                }}
                title={c.label}
              >
                {c.label}
              </span>
              <span style={{ color: "var(--ln-ink-4)", marginLeft: 4 }}>{c.count}</span>
            </button>
          ))}
        </div>
        </div>

        {/* AI signal strip — single compact translucent line below the chrome */}
        {topPrediction && aiBannerOpen && (
        <div
          style={{
            margin: "6px 10px 0",
            background: "var(--ln-overlay-bg)",
            backdropFilter: "blur(6px)",
            border: "1px solid var(--ln-line-2)",
            borderRadius: 8,
            padding: "5px 8px",
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <Icon.Sparkles style={{ color: ACCENT, flex: "0 0 13px" }} />
          <span
            style={{
              fontFamily: "var(--ln-font-mono)",
              fontSize: 9,
              color: "var(--ln-ink-3)",
              letterSpacing: "0.08em",
              flex: "0 0 auto",
            }}
          >
            {tAIForecast} · {topPrediction.horizon}
          </span>
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 11.5,
              lineHeight: 1.3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {topPrediction.disease} surge · {topPrediction.region}
          </span>
          <button
            onClick={() => setAiBannerOpen(false)}
            aria-label="Dismiss forecast"
            style={{
              background: "none",
              border: "none",
              color: "var(--ln-ink-3)",
              padding: 2,
              cursor: "pointer",
              flex: "0 0 auto",
            }}
          >
            <Icon.X />
          </button>
        </div>
        )}
      </div>
      )}

      {/* Fullscreen-map toggle — floats above the sheet (or bottom-right when
          immersive). Hidden while the sheet is fully expanded since the map
          isn't visible behind it. */}
      {(immersive || sheetMode !== "full") && (
        <button
          onClick={() => setImmersive(!immersive)}
          aria-label={immersive ? "Exit full map" : "Full map"}
          style={{
            position: "absolute",
            right: 12,
            bottom: immersive ? 16 : `calc(${sheetCss} + 14px)`,
            zIndex: 710,
            width: 42,
            height: 42,
            borderRadius: "50%",
            border: "1px solid var(--ln-line-3)",
            background: "var(--ln-overlay-bg)",
            backdropFilter: "blur(8px)",
            color: "var(--ln-ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
            transition: "bottom .3s cubic-bezier(.2,.7,.3,1)",
          }}
        >
          {immersive ? (
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M6 2v4H2M10 14v-4h4M14 6h-4V2M2 10h4v4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M2 6V2h4M14 10v4h-4M10 2h4v4M6 14H2v-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      )}

      {/* Pull-up sheet */}
      {!immersive && (
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: sheetHeight,
          transition: "height .3s cubic-bezier(.2,.7,.3,1)",
          background: "var(--ln-elev-bg)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid var(--ln-line-2)",
          borderRadius: "14px 14px 0 0",
          boxShadow: "0 -16px 40px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          zIndex: 700,
        }}
      >
        <button
          onClick={cycleSheet}
          style={{
            padding: "10px 0 6px",
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            justifyContent: "center",
            flex: "0 0 auto",
          }}
          aria-label="Cycle sheet height"
        >
          <span style={{ width: 32, height: 4, background: "var(--ln-line-3)", borderRadius: 2 }} />
        </button>

        <div style={{ display: "flex", padding: "0 14px", borderBottom: "1px solid var(--ln-line)" }}>
          {(
            [
              { id: "nearby", label: tNearby, count: nearbySorted.length },
              { id: "alerts", label: tAlertsTab, count: alerts.length },
              { id: "news", label: tNewsTab, count: filtered.filter((o) => o.url).length },
            ] as { id: Tab; label: string; count: number }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                if (sheetMode === "peek") setSheetMode("half");
              }}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "10px 0",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: tab === t.id ? "var(--ln-ink)" : "var(--ln-ink-3)",
                borderBottom: tab === t.id ? `1.5px solid ${ACCENT}` : "1.5px solid transparent",
                fontSize: isNarrow ? 11 : 13,
                whiteSpace: "nowrap",
              }}
            >
              {t.label}{" "}
              <span
                className="ln-num"
                style={{
                  color: "var(--ln-ink-4)",
                  marginLeft: isNarrow ? 2 : 3,
                  fontSize: isNarrow ? 10 : undefined,
                }}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {tab === "nearby" && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 14px",
              borderBottom: "1px solid var(--ln-line)",
            }}
          >
            <span className="ln-eyebrow">
              {userLocation?.country ? `${tNear} ${userLocation.country}` : tByRecency}
            </span>
            <span style={{ fontSize: 11, color: "var(--ln-ink-3)" }}>
              {nearbySorted.length} {nearbySorted.length === 1 ? tSignal : tSignals}
            </span>
          </div>
        )}

        <div className="ln-pane" style={{ flex: 1, overflowY: "auto" }}>
          {tab === "nearby" &&
            nearbySorted.map((o, idx) => (
              <NearbyRow key={o.id} o={o} userLoc={userLocation?.coordinates as [number, number] | undefined}>
                {/* Insert featured ad after 4 items */}
                {idx === 4 && featuredAd && <AdCard ad={featuredAd} variant="mobile" />}
              </NearbyRow>
            ))}
          {tab === "alerts" && <AlertTicker items={alerts} />}
          {tab === "news" &&
            filtered
              .filter((o) => o.url && o.title)
              .slice(0, 20)
              .map((n) => (
                <a
                  key={n.id}
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    padding: "12px 14px",
                    borderBottom: "1px solid var(--ln-line)",
                    color: "inherit",
                    textDecoration: "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontFamily: "var(--ln-font-mono)",
                      fontSize: 10,
                      color: "var(--ln-ink-3)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    <span>
                      {n.source.toUpperCase()} · {n.country.toUpperCase()}
                    </span>
                    <span>{timeAgo(n.updated)} ago</span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.35, marginTop: 4 }}>{n.title}</div>
                </a>
              ))}
        </div>

      </div>
      )}

      {/* Selected outbreak quick-view modal */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 800,
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              background: "var(--ln-elev-bg)",
              borderTopLeftRadius: 14,
              borderTopRightRadius: 14,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "16px 18px 16px", overflowY: "auto", flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span className="ln-eyebrow" style={{ color: severityColor(selected.severity) }}>
                    ● {selected.severityLabel.toUpperCase()}
                  </span>
                  <div
                    className="ln-display"
                    style={{
                      fontSize: "clamp(18px, 5vw, 22px)",
                      lineHeight: 1.1,
                      marginTop: 4,
                      wordBreak: "break-word",
                    }}
                  >
                    {selected.disease}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ln-ink-3)", marginTop: 4 }}>
                    {selected.city || selected.country} · {selected.source}
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="ln-btn"
                  style={{ padding: 6, flex: "0 0 auto" }}
                  aria-label="Close"
                >
                  <Icon.X />
                </button>
              </div>
              {selected.title && (
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--ln-ink-2)",
                    marginTop: 14,
                    lineHeight: 1.4,
                    wordBreak: "break-word",
                  }}
                >
                  "{selected.title}"
                </div>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isNarrow ? "1fr 1fr" : "1fr 1fr 1fr",
                  gap: 8,
                  marginTop: 14,
                }}
              >
                <Metric label="Cases" value={selected.cases > 0 ? selected.cases.toLocaleString() : "—"} />
                <Metric
                  label="Deaths"
                  value={selected.deaths > 0 ? selected.deaths.toLocaleString() : "—"}
                  tone={selected.deaths > 0 ? "crit" : undefined}
                />
                <Metric label="Confidence" value={`${Math.round(selected.confidence * 100)}%`} />
              </div>
              <MinistryContact country={selected.country} />
            </div>
            {selected.url && (
              <div
                style={{
                  padding: "12px 18px 18px",
                  borderTop: "1px solid var(--ln-line)",
                  background: "var(--ln-elev-bg)",
                  flex: "0 0 auto",
                }}
              >
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ln-btn is-primary"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    padding: "12px 0",
                  }}
                >
                  Read full article <Icon.ArrowR />
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NearbyRow({
  o,
  userLoc,
  children,
}: {
  o: LiveOutbreak;
  userLoc?: [number, number];
  children?: React.ReactNode;
}) {
  const dist = userLoc ? Math.round(haversineKm([o.lat, o.lng], userLoc)) : null;
  return (
    <>
      {children}
      <button
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          borderBottom: "1px solid var(--ln-line)",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: severityColor(o.severity),
            boxShadow: o.severity >= 4 ? `0 0 8px ${severityColor(o.severity)}` : "none",
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13.5, color: "var(--ln-ink)" }}>{o.city || o.country}</span>
            {o.city && <span style={{ fontSize: 11, color: "var(--ln-ink-4)" }}>· {o.country}</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span style={{ width: 7, height: 7, background: o.diseaseColor, borderRadius: 1 }} />
            <span style={{ fontSize: 11, color: "var(--ln-ink-3)" }}>{o.disease}</span>
            <span
              style={{
                fontSize: 11,
                color: "var(--ln-ink-4)",
                fontFamily: "var(--ln-font-mono)",
              }}
            >
              · {timeAgo(o.updated)} ago
            </span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          {o.cases > 0 ? (
            <div className="ln-num" style={{ fontSize: 13 }}>
              {o.cases.toLocaleString()}
            </div>
          ) : null}
          {dist !== null && (
            <div
              style={{
                fontSize: 10,
                color: "var(--ln-ink-4)",
                fontFamily: "var(--ln-font-mono)",
              }}
            >
              {dist.toLocaleString()} km
            </div>
          )}
        </div>
      </button>
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "crit" }) {
  return (
    <div style={{ background: "var(--ln-surface-2)", padding: "8px 10px" }}>
      <div className="ln-eyebrow">{label}</div>
      <div
        className="ln-num"
        style={{ fontSize: 16, color: tone === "crit" ? "var(--ln-crit)" : "var(--ln-ink)", marginTop: 2 }}
      >
        {value}
      </div>
    </div>
  );
}
