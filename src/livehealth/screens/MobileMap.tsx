import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { LiveMap } from "../components/LiveMap";
import { ThemeToggle } from "../components/ThemeToggle";
import { LanguageSelector } from "../components/LanguageSelector";
import { AlertTicker } from "../components/AlertTicker";
import { AdCard } from "../components/AdCard";
import { useLiveOutbreaks, type LiveOutbreak } from "../data/useLiveOutbreaks";
import { useLiveAlerts } from "../data/useLiveAlerts";
import { useLiveSponsored } from "../data/useLiveSponsored";
import { useUserLocation } from "../../lib/useUserLocation";
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
  const [sheetMode, setSheetMode] = useState<SheetMode>("half");
  const [tab, setTab] = useState<Tab>("nearby");
  const [chip, setChip] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<LiveOutbreak | null>(null);

  const { outbreaks, loading } = useLiveOutbreaks("7d", 300);
  const { alerts } = useLiveAlerts(20, "24h");
  const { ads } = useLiveSponsored({ location: "map" });
  const { location: userLocation } = useUserLocation();

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
      { id: "all", label: "All", count: outbreaks.length },
      { id: "crit", label: "● Critical", count: outbreaks.filter((o) => o.severity >= 4).length },
      ...top,
    ];
  }, [outbreaks]);

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

  const sheetHeight =
    sheetMode === "peek"
      ? 220
      : sheetMode === "half"
      ? "clamp(220px, 50vh, 360px)"
      : "clamp(360px, calc(100vh - 60px), 720px)";

  const topPrediction = useMemo(() => [...PREDICTIONS].sort((a, b) => b.risk - a.risk)[0], []);
  const featuredAd = ads[0];

  const cycleSheet = () =>
    setSheetMode(sheetMode === "peek" ? "half" : sheetMode === "half" ? "full" : "peek");

  return (
    <div
      className="ln-app"
      style={{
        width: "100%",
        height: "100vh",
        background: "var(--ln-bg)",
        color: "var(--ln-ink)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Header */}
      <header
        style={{
          flex: "0 0 auto",
          padding: "14px 16px 10px",
          background: "var(--ln-topbar)",
          borderBottom: "1px solid var(--ln-line)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <div style={{ position: "relative", width: 14, height: 14 }}>
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
                fontSize: 12,
                letterSpacing: "0.16em",
                fontWeight: 500,
                color: "var(--ln-ink)",
              }}
            >
              <span>LIVE</span>
              <span style={{ color: ACCENT }}>HEALTH</span>
              <span style={{ color: "var(--ln-ink-3)" }}>/+</span>
            </div>
          </Link>
          <div style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--ln-ink-2)" }}>
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

        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--ln-ink-4)",
            }}
          >
            <Icon.Search />
          </span>
          <input
            className="ln-input"
            placeholder="Search countries, diseases, cities…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 10,
            fontFamily: "var(--ln-font-mono)",
            fontSize: 10,
            color: "var(--ln-ink-3)",
            letterSpacing: "0.1em",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: ACCENT,
              boxShadow: `0 0 8px ${ACCENT}`,
              animation: "ln-pulse-soft 1.4s infinite",
            }}
          />
          <span style={{ color: ACCENT }}>{loading ? "LOADING" : "LIVE"}</span>
          <span style={{ color: "var(--ln-ink-4)" }}>·</span>
          <span>
            {filtered.length} EVENTS · {new Set(filtered.map((o) => o.country)).size} COUNTRIES
          </span>
        </div>
      </header>

      {/* Filter chips */}
      <div
        className="ln-pane"
        style={{
          flex: "0 0 auto",
          display: "flex",
          gap: 6,
          padding: isNarrow ? "10px 12px" : "10px 14px",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          borderBottom: "1px solid var(--ln-line)",
          background: "var(--ln-topbar)",
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
              padding: isNarrow ? "5px 8px" : "5px 10px",
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

      {/* Map */}
      <div
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          background: "var(--ln-map-bg)",
        }}
      >
        <LiveMap
          outbreaks={filtered}
          selectedId={selected?.id ?? null}
          pulse
          cluster
          onSelect={(o) => setSelected(o)}
          focusOn={userLocation?.coordinates ? (userLocation.coordinates as [number, number]) : null}
          focusRadiusKm={3000}
        />

        {/* AI signal banner — top */}
        {topPrediction && (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              right: 12,
              background: "var(--ln-overlay-bg)",
              backdropFilter: "blur(6px)",
              border: "1px solid var(--ln-line-2)",
              padding: "10px 12px",
              display: "flex",
              flexDirection: isNarrow ? "column" : "row",
              gap: isNarrow ? 6 : 10,
              alignItems: isNarrow ? "flex-start" : "center",
              zIndex: 500,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: isNarrow ? "100%" : "auto",
                justifyContent: "space-between",
              }}
            >
              <Icon.Sparkles style={{ color: ACCENT, flex: "0 0 14px" }} />
              {isNarrow && <Icon.ArrowR style={{ color: "var(--ln-ink-3)" }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0, width: isNarrow ? "100%" : undefined }}>
              <div
                style={{
                  fontFamily: "var(--ln-font-mono)",
                  fontSize: 9,
                  color: "var(--ln-ink-3)",
                  letterSpacing: "0.1em",
                }}
              >
                AI FORECAST · {topPrediction.horizon}
              </div>
              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.3,
                  marginTop: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: isNarrow ? "normal" : "nowrap",
                  wordBreak: isNarrow ? "break-word" : undefined,
                }}
              >
                {topPrediction.disease} surge · {topPrediction.region}
              </div>
            </div>
            {!isNarrow && <Icon.ArrowR style={{ color: "var(--ln-ink-3)" }} />}
          </div>
        )}
      </div>

      {/* Pull-up sheet */}
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
              { id: "nearby", label: "Nearby", count: nearbySorted.length },
              { id: "alerts", label: "Alerts", count: alerts.length },
              { id: "news", label: "News", count: filtered.filter((o) => o.url).length },
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
              {userLocation?.country ? `Near ${userLocation.country}` : "By recency"}
            </span>
            <span style={{ fontSize: 11, color: "var(--ln-ink-3)" }}>
              {nearbySorted.length} signal{nearbySorted.length === 1 ? "" : "s"}
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

        {sheetMode !== "full" && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              borderTop: "1px solid var(--ln-line)",
              padding: "8px 0 14px",
              background: "var(--ln-bg)",
            }}
          >
            {[
              { to: "/map", icon: <Icon.Map />, label: "Map", active: true },
              { to: "/dashboard", icon: <Icon.Chart />, label: "Trends" },
              { to: "/news", icon: <Icon.News />, label: "Feed" },
              { to: "/dashboard?tab=predictions", icon: <Icon.Bell />, label: "Alerts" },
              { to: "/", icon: <Icon.Globe />, label: "Home" },
            ].map((b) => (
              <Link
                key={b.label}
                to={b.to}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  color: b.active ? ACCENT : "var(--ln-ink-3)",
                  fontSize: 10,
                  fontFamily: "var(--ln-font-mono)",
                  letterSpacing: "0.08em",
                  textDecoration: "none",
                }}
              >
                {b.icon}
                <span>{b.label.toUpperCase()}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

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
              padding: "16px 18px 24px",
              maxHeight: "70vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <span className="ln-eyebrow" style={{ color: severityColor(selected.severity) }}>
                  ● {selected.severityLabel.toUpperCase()}
                </span>
                <div className="ln-display" style={{ fontSize: 22, lineHeight: 1.05, marginTop: 4 }}>
                  {selected.disease}
                </div>
                <div style={{ fontSize: 12, color: "var(--ln-ink-3)", marginTop: 4 }}>
                  {selected.city || selected.country} · {selected.source}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="ln-btn"
                style={{ padding: 6 }}
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
                }}
              >
                "{selected.title}"
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
              <Metric label="Cases" value={selected.cases > 0 ? selected.cases.toLocaleString() : "—"} />
              <Metric
                label="Deaths"
                value={selected.deaths > 0 ? selected.deaths.toLocaleString() : "—"}
                tone={selected.deaths > 0 ? "crit" : undefined}
              />
              <Metric label="Confidence" value={`${Math.round(selected.confidence * 100)}%`} />
            </div>
            {selected.url && (
              <a
                href={selected.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ln-btn is-primary"
                style={{
                  marginTop: 16,
                  width: "100%",
                  justifyContent: "center",
                  padding: "12px 0",
                }}
              >
                Read full article <Icon.ArrowR />
              </a>
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
