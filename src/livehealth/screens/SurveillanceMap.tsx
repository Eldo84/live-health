import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LMap } from "leaflet";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Logo } from "../components/Logo";
import { StatusPill } from "../components/StatusPill";
import { Sparkline } from "../components/Sparkline";
import { SeverityBar } from "../components/SeverityBar";
import { AlertTicker, type TickerAlert } from "../components/AlertTicker";
import { AdCard } from "../components/AdCard";
import { useLiveSponsored } from "../data/useLiveSponsored";
import { LiveMap } from "../components/LiveMap";
import { HeaderAlerts } from "../components/HeaderAlerts";
import { HeaderUser } from "../components/HeaderUser";
import { ThemeToggle } from "../components/ThemeToggle";
import { LanguageSelector } from "../components/LanguageSelector";
import { DiseaseRecommendationsDialog } from "../components/DiseaseRecommendationsDialog";
import { useLiveOutbreaks, type LiveOutbreak } from "../data/useLiveOutbreaks";
import { useLiveAlerts } from "../data/useLiveAlerts";
import { useOutbreakCategoriesLive } from "../data/useOutbreakCategoriesLive";
import { useDashboardStats } from "../../lib/useDashboardStats";
import { useHealthMinistry } from "../../lib/useHealthMinistry";
import { useUserLocation } from "../../lib/useUserLocation";
import { haversineKm, severityColor, severityLabel, timeAgo } from "../lib/utils";
import { useT } from "../lib/useT";

const ACCENT = "#4ee0c4";

import { toDashboardRange, type TimeRange } from "../lib/timeRange";
import { PREDICTIONS } from "../data/predictions";
import { useBreakpoint } from "../lib/useBreakpoint";

type RangeKey = TimeRange;

type DiseaseTypeFilter = "all" | "human" | "zoonotic" | "veterinary";

export function SurveillanceMapScreen() {
  const [range, setRange] = useState<RangeKey>("7d");
  const [country, setCountry] = useState("");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [diseaseType, setDiseaseType] = useState<DiseaseTypeFilter>("all");
  const [disabledDiseases, setDisabledDiseases] = useState<Set<string>>(new Set());
  const [minSeverity, setMinSeverity] = useState(1);
  const [clusterMarkers, setClusterMarkers] = useState(true);
  const [pulse, setPulse] = useState(true);
  const [selected, setSelected] = useState<LiveOutbreak | null>(null);
  const [hovered, setHovered] = useState<LiveOutbreak | null>(null);
  const [tab, setTab] = useState<"alerts" | "news" | "sponsored">("alerts");
  const [nearMeOn, setNearMeOn] = useState(false);
  const [nearMeRadius, setNearMeRadius] = useState(2000);
  const [showLocBanner, setShowLocBanner] = useState(false);
  const [recsOpenFor, setRecsOpenFor] = useState<string | null>(null);

  // Responsive layout state. On tablet the left rail collapses into a drawer
  // toggled by a hamburger; on mobile the right rail tab strip slides to a
  // bottom sheet below the map.
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTabletDown = bp !== "desktop";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const { outbreaks, loading } = useLiveOutbreaks(range, 600);
  const { alerts } = useLiveAlerts(20, range);
  const { stats } = useDashboardStats(toDashboardRange(range));
  const { location: userLocation } = useUserLocation();
  const { categories, matchesCategory } = useOutbreakCategoriesLive();
  const { ads: sponsoredAds } = useLiveSponsored({ location: "map" });

  // Translated labels for the most visible map chrome.
  const tActive = useT("Active");
  const tCases = useT("Cases");
  const tDeaths = useT("Deaths");
  const tCritical = useT("Critical");
  const tGRI = useT("Global Risk Index");
  const tCountries = useT("countries");
  const tFromWeek = useT("↑ from 6.0 (week)");
  const tSevAtLeast4 = useT("Sev ≥ 4");
  const tReadFullArticle = useT("Read full article");
  const tViewDossier = useT("View dossier");
  const tRecs = useT("Recs");
  const tSubscribeAlerts = useT("Subscribe to alerts");
  const tAlertsTab = useT("Alerts");
  const tNewsTab = useT("News");
  const tSponsoredTab = useT("Sponsored");
  const tConfidence = useT("Confidence");
  const tAllCountries = useT("All countries");
  const tReset = useT("Reset");
  const tFilters = useT("Filters");
  const tMinimumSeverity = useT("Minimum Severity");
  const tNearMe = useT("Near me");
  const tCategories = useT("Categories");
  const tDiseaseType = useT("Disease type");
  const tHuman = useT("Human");
  const tZoonotic = useT("Zoonotic");
  const tVeterinary = useT("Veterinary");
  const tAll = useT("All");
  const tSearch = useT("Search");
  const tCluster = useT("Cluster");
  const tPulse = useT("Pulse");

  const mapInstance = useRef<LMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const flewToUserRef = useRef(false);

  // Top AI signal — picked from PREDICTIONS by risk so the banner reflects
  // something concrete and the Open button has a real target.
  const topPrediction = useMemo(
    () => [...PREDICTIONS].sort((a, b) => b.risk - a.risk)[0],
    []
  );

  // Auto-fly to the user's location the first time it becomes available after
  // the map mounts. Surface the "Zoomed to" banner only after we actually flew.
  useEffect(() => {
    if (flewToUserRef.current) return;
    if (!mapReady) return;
    if (!userLocation?.coordinates) return;
    const m = mapInstance.current;
    if (!m) return;
    flewToUserRef.current = true;
    m.flyTo(userLocation.coordinates as [number, number], 4, { duration: 0.9 });
    setShowLocBanner(true);
  }, [mapReady, userLocation?.coordinates]);

  const zoomBy = (delta: number) => {
    const m = mapInstance.current;
    if (m) m.setZoom(m.getZoom() + delta);
  };
  const recenter = () => {
    const m = mapInstance.current;
    if (!m) return;
    if (userLocation?.coordinates) {
      m.flyTo(userLocation.coordinates as [number, number], 4, { duration: 0.7 });
    } else {
      m.flyTo([15, 5], 2, { duration: 0.7 });
    }
  };

  // Filter to the disease in the top AI signal and fly the map to its region.
  const openAiSignal = () => {
    if (!topPrediction) return;
    setSearch(topPrediction.disease);
    setActiveCategory(null);
    setMinSeverity(1);
    setDisabledDiseases(new Set());
    const m = mapInstance.current;
    if (m) m.flyTo(topPrediction.center, 4, { duration: 0.9 });
  };

  const availableCountries = useMemo(
    () => Array.from(new Set(outbreaks.map((o) => o.country))).sort(),
    [outbreaks]
  );

  // Disease list (counts + canonical colour) derived from the live outbreaks payload.
  const diseaseList = useMemo(() => {
    const m = new Map<string, { color: string; count: number }>();
    for (const o of outbreaks) {
      const cur = m.get(o.disease) || { color: o.diseaseColor, count: 0 };
      cur.count += 1;
      if (!cur.color || cur.color === "#66dbe1") cur.color = o.diseaseColor;
      m.set(o.disease, cur);
    }
    return Array.from(m.entries())
      .map(([name, v]) => ({ name, color: v.color, count: v.count }))
      .sort((a, b) => b.count - a.count);
  }, [outbreaks]);

  const visibleOutbreaks = useMemo(() => {
    return outbreaks
      .filter((o) => !disabledDiseases.has(o.disease))
      .filter((o) => o.severity >= minSeverity)
      .filter((o) => !country || o.country === country)
      .filter((o) => diseaseType === "all" || o.diseaseType === diseaseType)
      .filter(
        (o) =>
          !search ||
          (o.disease + " " + o.city + " " + o.country + " " + o.title)
            .toLowerCase()
            .includes(search.toLowerCase())
      )
      .filter((o) => !activeCategory || matchesCategory(o.diseaseId, activeCategory))
      .filter((o) => {
        if (!nearMeOn || !userLocation?.coordinates) return true;
        return haversineKm([o.lat, o.lng], userLocation.coordinates) <= nearMeRadius;
      });
  }, [outbreaks, disabledDiseases, minSeverity, country, diseaseType, search, activeCategory, matchesCategory, nearMeOn, nearMeRadius, userLocation]);

  const totalCases = visibleOutbreaks.reduce((a, o) => a + o.cases, 0);
  const critCount = visibleOutbreaks.filter((o) => o.severity >= 4).length;
  const countryCount = new Set(visibleOutbreaks.map((o) => o.country)).size;
  const ghi = 6.4;

  const hasActiveFilters =
    !!country ||
    !!search ||
    !!activeCategory ||
    diseaseType !== "all" ||
    range !== "7d" ||
    nearMeOn ||
    minSeverity > 1 ||
    disabledDiseases.size > 0;

  const resetAll = () => {
    setCountry("");
    setSearch("");
    setActiveCategory(null);
    setDiseaseType("all");
    setDisabledDiseases(new Set());
    setMinSeverity(1);
    setRange("7d");
    setNearMeOn(false);
  };

  const tickerAlerts: TickerAlert[] = alerts;

  // Dedupe outbreak rows by article URL for the News tab (one row per article).
  const newsItems = useMemo(() => {
    const seen = new Set<string>();
    const items: LiveOutbreak[] = [];
    for (const o of outbreaks) {
      if (!o.url || !o.title) continue;
      if (seen.has(o.url)) continue;
      seen.add(o.url);
      items.push(o);
      if (items.length >= 30) break;
    }
    return items;
  }, [outbreaks]);

  const spark30 = useMemo(() => {
    const points = 28;
    const total = visibleOutbreaks.length || 1;
    return Array.from({ length: points }, (_, i) => {
      return Math.max(0, Math.round(total * (0.5 + Math.sin(i * 0.4) * 0.3 + (i / points) * 0.4)));
    });
  }, [visibleOutbreaks.length]);

  return (
    <div
      className="ln-app"
      style={{
        width: "100%",
        height: isTabletDown ? "calc(100vh - 60px)" : "100vh",
        background: "var(--ln-bg)",
        color: "var(--ln-ink)",
        display: "grid",
        gridTemplateRows: "52px 56px 1fr",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <TopBar active="map" />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "0 10px" : "0 20px",
          gap: 8,
          borderBottom: "1px solid var(--ln-line)",
          background: "var(--ln-topbar)",
          overflowX: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          {isTabletDown && (
            <button
              className="ln-btn"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open filters"
              style={{ padding: 6, flex: "0 0 auto" }}
            >
              <Icon.Menu />
            </button>
          )}
          <h1
            className="ln-display"
            style={{
              fontSize: isMobile ? 14 : 22,
              lineHeight: 1,
              margin: 0,
              letterSpacing: "-0.02em",
              color: ACCENT,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {isMobile ? (
              "Surveillance"
            ) : (
              <>
                Global Outbreak{" "}
                <span style={{ color: "var(--ln-ink-3)", fontStyle: "italic" }}>
                  & Disease Monitoring System
                </span>
              </>
            )}
          </h1>
          {!isMobile && (
            <span className="ln-num" style={{ fontSize: 11, color: "var(--ln-ink-4)" }}>
              {loading
                ? "loading…"
                : `${visibleOutbreaks.length} of ${outbreaks.length} events · last ${range}`}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{ display: "flex", border: "1px solid var(--ln-line-2)", borderRadius: 6, overflow: "hidden" }}
          >
            {(["24h", "7d", "14d", "30d", "6m", "1y"] as RangeKey[]).map((r, i, arr) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  padding: "5px 10px",
                  fontSize: 11,
                  background: range === r ? "var(--ln-surface-3)" : "transparent",
                  color: range === r ? "var(--ln-ink)" : "var(--ln-ink-3)",
                  border: "none",
                  cursor: "pointer",
                  borderRight: i !== arr.length - 1 ? "1px solid var(--ln-line-2)" : "none",
                  fontFamily: "var(--ln-font-mono)",
                }}
              >
                {r}
              </button>
            ))}
          </div>
          {!isMobile && (
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              style={{
                background: "var(--ln-surface-2)",
                border: "1px solid var(--ln-line-2)",
                padding: "5px 8px",
                fontSize: 12,
                color: "var(--ln-ink)",
                borderRadius: 6,
              }}
            >
              <option value="">{tAllCountries}</option>
              {availableCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          {hasActiveFilters && (
            <button onClick={resetAll} className="ln-btn">
              <Icon.Refresh /> {tReset}
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr"
            : isTabletDown
            ? "1fr 320px"
            : "280px 1fr 340px",
          height: "100%",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {isTabletDown && drawerOpen && (
          <div
            onClick={() => setDrawerOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              zIndex: 650,
            }}
          />
        )}
        <aside
          style={
            isTabletDown
              ? {
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: isMobile ? "min(86vw, 320px)" : 300,
                  background: "var(--ln-rail)",
                  borderRight: "1px solid var(--ln-line-2)",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
                  transition: "transform .25s ease-out",
                  zIndex: 700,
                  boxShadow: drawerOpen ? "8px 0 24px rgba(0,0,0,0.45)" : "none",
                }
              : {
                  borderRight: "1px solid var(--ln-line)",
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--ln-rail)",
                  overflow: "hidden",
                }
          }
        >
          {isTabletDown && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 12px",
                borderBottom: "1px solid var(--ln-line)",
              }}
            >
              <span className="ln-eyebrow">{tFilters}</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="ln-btn"
                style={{ padding: 6 }}
                aria-label="Close filters"
              >
                <Icon.X />
              </button>
            </div>
          )}
          <div className="ln-pane" style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ padding: "14px 14px 10px" }}>
              <span className="ln-eyebrow">Search</span>
              <div style={{ position: "relative", marginTop: 8 }}>
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
                  placeholder="Country, city, disease…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--ln-ink-3)",
                    }}
                  >
                    <Icon.X />
                  </button>
                )}
              </div>
            </div>

            <div style={{ padding: "8px 14px 14px", borderTop: "1px solid var(--ln-line)" }}>
              <span className="ln-eyebrow">{tDiseaseType}</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 4, marginTop: 8 }}>
                {(
                  [
                    { id: "all", label: tAll },
                    { id: "human", label: tHuman },
                    { id: "zoonotic", label: tZoonotic },
                    { id: "veterinary", label: tVeterinary },
                  ] as { id: DiseaseTypeFilter; label: string }[]
                ).map((t) => (
                  <button
                    key={t.id}
                    className={`ln-btn ${diseaseType === t.id ? "is-active" : ""}`}
                    onClick={() => setDiseaseType(t.id)}
                    style={{ padding: "5px 0", justifyContent: "center", fontSize: 11 }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                padding: "12px 14px 14px",
                borderTop: "1px solid var(--ln-line)",
                background: nearMeOn ? `color-mix(in oklab, ${ACCENT} 5%, transparent)` : "transparent",
              }}
            >
              <label
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  marginBottom: 8,
                }}
              >
                <span className="ln-eyebrow">{tNearMe}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--ln-ink-3)",
                      fontFamily: "var(--ln-font-mono)",
                    }}
                  >
                    {(userLocation?.country || "—").toUpperCase()}
                  </span>
                  <input
                    type="checkbox"
                    checked={nearMeOn}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setNearMeOn(on);
                      if (on) {
                        const m = mapInstance.current;
                        if (m && userLocation?.coordinates) {
                          const zoom =
                            nearMeRadius > 3000 ? 3 : nearMeRadius > 1500 ? 4 : nearMeRadius > 600 ? 5 : 6;
                          m.flyTo(userLocation.coordinates as [number, number], zoom, {
                            duration: 0.7,
                          });
                        }
                      }
                    }}
                  />
                </span>
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: nearMeOn ? 1 : 0.4 }}>
                <span className="ln-num" style={{ fontSize: 11, color: "var(--ln-ink-3)" }}>
                  100km
                </span>
                <input
                  type="range"
                  min={100}
                  max={5000}
                  step={100}
                  value={nearMeRadius}
                  onChange={(e) => setNearMeRadius(parseInt(e.target.value, 10))}
                  disabled={!nearMeOn}
                  style={{ flex: 1 }}
                />
                <span
                  className="ln-num"
                  style={{ fontSize: 11, color: nearMeOn ? ACCENT : "var(--ln-ink-3)" }}
                >
                  {nearMeRadius}km
                </span>
              </div>
              {nearMeOn && (
                <div style={{ marginTop: 8, fontSize: 11, color: "var(--ln-ink-3)" }}>
                  {visibleOutbreaks.length} outbreak{visibleOutbreaks.length === 1 ? "" : "s"} within{" "}
                  {nearMeRadius} km
                </div>
              )}
            </div>

            <div style={{ padding: "12px 14px 14px", borderTop: "1px solid var(--ln-line)" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span className="ln-eyebrow">{tMinimumSeverity}</span>
                <span className="ln-num" style={{ fontSize: 11, color: "var(--ln-ink-2)" }}>
                  ≥ {severityLabel(minSeverity).toUpperCase()}
                </span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setMinSeverity(s)}
                    style={{
                      flex: 1,
                      height: 22,
                      border: "none",
                      cursor: "pointer",
                      background: s >= minSeverity ? severityColor(s) : "rgba(255,255,255,0.06)",
                      opacity: s >= minSeverity ? 1 : 0.6,
                    }}
                    title={severityLabel(s)}
                  />
                ))}
              </div>
            </div>

            <div style={{ padding: "12px 14px 12px", borderTop: "1px solid var(--ln-line)" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span className="ln-eyebrow">{useT("Outbreak Categories")}</span>
                {activeCategory && (
                  <button
                    onClick={() => setActiveCategory(null)}
                    style={{
                      fontSize: 10,
                      color: "var(--ln-ink-3)",
                      cursor: "pointer",
                      background: "none",
                      border: "none",
                    }}
                  >
                    CLEAR
                  </button>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 240, overflowY: "auto" }}>
                {categories.length === 0 && (
                  <div style={{ fontSize: 11, color: "var(--ln-ink-4)", padding: "4px 8px" }}>
                    Loading categories…
                  </div>
                )}
                {categories.slice(0, 14).map((c) => {
                  const on = activeCategory === c.id;
                  const count = outbreaks.filter((o) => matchesCategory(o.diseaseId, c.id)).length;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveCategory(on ? null : c.id)}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "10px 1fr auto",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 8px",
                        textAlign: "left",
                        cursor: "pointer",
                        background: on ? "rgba(255,255,255,0.04)" : "transparent",
                        border: on ? `1px solid ${c.color}55` : "1px solid transparent",
                        color: "var(--ln-ink)",
                      }}
                    >
                      <span style={{ width: 8, height: 8, background: c.color, borderRadius: 2 }} />
                      <span style={{ fontSize: 12, color: "var(--ln-ink)" }}>{c.label}</span>
                      <span className="ln-num" style={{ fontSize: 10.5, color: "var(--ln-ink-3)" }}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ padding: "12px 14px 12px", borderTop: "1px solid var(--ln-line)" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span className="ln-eyebrow">Pathogens</span>
                <button
                  onClick={() => setDisabledDiseases(new Set())}
                  style={{
                    fontSize: 10,
                    color: "var(--ln-ink-3)",
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                  }}
                >
                  ALL
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 240, overflowY: "auto" }}>
                {diseaseList.slice(0, 30).map((d) => {
                  const on = !disabledDiseases.has(d.name);
                  return (
                    <button
                      key={d.name}
                      onClick={() => {
                        const ns = new Set(disabledDiseases);
                        if (on) ns.add(d.name);
                        else ns.delete(d.name);
                        setDisabledDiseases(ns);
                      }}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "12px 1fr auto",
                        alignItems: "center",
                        gap: 10,
                        padding: "6px 8px",
                        textAlign: "left",
                        cursor: "pointer",
                        background: "transparent",
                        border: "none",
                        color: "var(--ln-ink)",
                        opacity: on ? 1 : 0.4,
                      }}
                    >
                      <span style={{ width: 10, height: 10, background: d.color, borderRadius: 2 }} />
                      <span
                        style={{
                          fontSize: 12,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={d.name}
                      >
                        {d.name}
                      </span>
                      <span className="ln-num" style={{ fontSize: 11, color: "var(--ln-ink-3)" }}>
                        {d.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ padding: "12px 14px 16px", borderTop: "1px solid var(--ln-line)" }}>
              <span className="ln-eyebrow">Map Layers</span>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                <label
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 12,
                    padding: "4px 0",
                    cursor: "pointer",
                  }}
                >
                  <span>Cluster markers</span>
                  <input
                    type="checkbox"
                    checked={clusterMarkers}
                    onChange={(e) => setClusterMarkers(e.target.checked)}
                  />
                </label>
                <label
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 12,
                    padding: "4px 0",
                    cursor: "pointer",
                  }}
                >
                  <span>Outbreak pulses</span>
                  <input
                    type="checkbox"
                    checked={pulse}
                    onChange={(e) => setPulse(e.target.checked)}
                  />
                </label>
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "10px 14px 14px",
              borderTop: "1px solid var(--ln-line)",
              background: "var(--ln-surface)",
              flex: "0 0 auto",
            }}
          >
            <span className="ln-eyebrow">Featured Partner</span>
            {sponsoredAds[0] ? (
              <div style={{ marginTop: 8 }}>
                <AdCard ad={sponsoredAds[0]} variant="sidebar" dense />
              </div>
            ) : (
              <div
                style={{
                  marginTop: 8,
                  padding: 10,
                  fontSize: 11,
                  color: "var(--ln-ink-3)",
                  border: "1px dashed var(--ln-line-2)",
                }}
              >
                Featured partner spot is open. Reach the surveillance audience here.
              </div>
            )}
          </div>
        </aside>

        <main style={{ position: "relative", overflow: "hidden", background: "var(--ln-bg)" }}>
          {showLocBanner && userLocation?.country && (
            <div
              style={{
                position: "absolute",
                top: 14,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 600,
                background: ACCENT,
                color: "var(--ln-brand-ink)",
                padding: "7px 12px 7px 10px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                boxShadow: "0 6px 18px rgba(0,0,0,0.3)",
              }}
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <path d="M8 14s-5-4.4-5-8a5 5 0 0 1 10 0c0 3.6-5 8-5 8z" />
                <circle cx="8" cy="6" r="2" />
              </svg>
              <span>
                <strong>Zoomed to:</strong> {userLocation.country}{userLocation.city ? `, ${userLocation.city}` : ""}
              </span>
              <button
                onClick={() => setShowLocBanner(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "inherit",
                  marginLeft: 4,
                }}
              >
                <Icon.X />
              </button>
            </div>
          )}

          <div
            style={{
              position: "absolute",
              top: isMobile ? 8 : 14,
              left: isMobile ? 8 : 14,
              right: isMobile ? 8 : 14,
              display: "flex",
              gap: isMobile ? 6 : 10,
              zIndex: 500,
              pointerEvents: "none",
              flexWrap: "wrap",
            }}
          >
            <KPI
              label={tActive}
              value={visibleOutbreaks.length.toString()}
              sub={`${countryCount} ${tCountries}`}
              accent={ACCENT}
            />
            {!isMobile && (
              <KPI
                label={`${tCases} · ${range}`}
                value={totalCases.toLocaleString()}
                sub={stats?.totalCasesChange || "—"}
                tone="warn"
              />
            )}
            {!isMobile && (
              <KPI
                label={`${tDeaths} · ${range}`}
                value={(stats?.totalDeaths ?? 0).toLocaleString()}
                sub={stats?.totalDeathsChange || "—"}
                tone="crit"
              />
            )}
            <KPI label={tCritical} value={critCount.toString()} sub={tSevAtLeast4} tone="crit" />
            {!isTabletDown && (
              <KPI label={tGRI} value={ghi.toFixed(1)} sub={tFromWeek} tone="warn" spark={spark30} />
            )}
            <div style={{ flex: 1 }} />
            <div
              style={{
                pointerEvents: "auto",
                background: "var(--ln-overlay-bg)",
                border: "1px solid var(--ln-line-2)",
                backdropFilter: "blur(8px)",
                padding: isMobile ? "6px 8px" : "8px 12px",
                display: isMobile ? "none" : "flex",
                alignItems: "center",
                gap: 10,
                maxWidth: isTabletDown ? 320 : undefined,
              }}
            >
              <Icon.Sparkles style={{ color: ACCENT }} />
              {!isTabletDown && (
                <span style={{ fontSize: 11, color: "var(--ln-ink-2)" }}>AI signal:</span>
              )}
              <span
                style={{
                  fontSize: 12,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {topPrediction
                  ? `${topPrediction.disease} surge · ${topPrediction.region} · ${topPrediction.horizon}`
                  : "No active forecast"}
              </span>
              <button
                className="ln-btn"
                style={{ padding: "3px 8px" }}
                onClick={openAiSignal}
                disabled={!topPrediction}
              >
                Open
              </button>
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              inset: 0,
              padding: isMobile ? "60px 6px 70px" : "94px 14px 92px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                border: "1px solid var(--ln-line)",
                background: "var(--ln-map-bg)",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  fontFamily: "var(--ln-font-mono)",
                  fontSize: 10,
                  color: "var(--ln-ink-4)",
                  letterSpacing: "0.1em",
                  zIndex: 500,
                  pointerEvents: "none",
                }}
              >
                CARTO · WGS-84
              </span>
              <span
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  fontFamily: "var(--ln-font-mono)",
                  fontSize: 10,
                  color: "var(--ln-ink-4)",
                  zIndex: 500,
                  pointerEvents: "none",
                }}
              >
                {visibleOutbreaks.length} POINTS · {loading ? "LOADING" : "LIVE"}
              </span>

              <LiveMap
                outbreaks={visibleOutbreaks}
                selectedId={selected?.id ?? null}
                pulse={pulse}
                cluster={clusterMarkers}
                onHover={(o) => setHovered(o)}
                onSelect={(o) => setSelected(o)}
                focusOn={
                  nearMeOn && userLocation?.coordinates
                    ? [userLocation.coordinates[0], userLocation.coordinates[1]]
                    : null
                }
                focusRadiusKm={nearMeRadius}
                onReady={(m) => {
                  mapInstance.current = m;
                  setMapReady(true);
                }}
              />

              {/* Zoom + recenter controls */}
              <div
                style={{
                  position: "absolute",
                  right: 12,
                  top: 38,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  zIndex: 500,
                }}
              >
                <button
                  className="ln-btn"
                  style={{ width: 30, height: 30, justifyContent: "center", padding: 0 }}
                  title="Zoom in"
                  onClick={() => zoomBy(1)}
                >
                  +
                </button>
                <button
                  className="ln-btn"
                  style={{ width: 30, height: 30, justifyContent: "center", padding: 0 }}
                  title="Zoom out"
                  onClick={() => zoomBy(-1)}
                >
                  −
                </button>
                <button
                  className="ln-btn"
                  style={{ width: 30, height: 30, justifyContent: "center", padding: 0 }}
                  title="Recenter"
                  onClick={recenter}
                >
                  ⌖
                </button>
              </div>

              <div
                style={{
                  position: "absolute",
                  left: 14,
                  bottom: 14,
                  background: "var(--ln-overlay-bg)",
                  border: "1px solid var(--ln-line-2)",
                  padding: 10,
                  backdropFilter: "blur(6px)",
                  zIndex: 500,
                  display: isMobile ? "none" : "block",
                }}
              >
                <div className="ln-eyebrow" style={{ marginBottom: 6 }}>
                  Severity scale
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: 22,
                        height: 8,
                        background: [
                          "var(--ln-risk-0)",
                          "var(--ln-risk-1)",
                          "var(--ln-risk-2)",
                          "var(--ln-risk-3)",
                          "var(--ln-risk-4)",
                        ][i],
                      }}
                    />
                  ))}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontFamily: "var(--ln-font-mono)",
                    fontSize: 9,
                    color: "var(--ln-ink-4)",
                    marginTop: 4,
                  }}
                >
                  <span>LOW</span>
                  <span>CRITICAL</span>
                </div>
              </div>

              {hovered && (
                <div
                  style={{
                    position: "absolute",
                    left: 14,
                    bottom: 60,
                    background: "var(--ln-elev-bg)",
                    border: "1px solid var(--ln-line-3)",
                    padding: "10px 12px",
                    backdropFilter: "blur(6px)",
                    minWidth: 220,
                    zIndex: 500,
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      {hovered.city}
                      {hovered.country ? `, ${hovered.country}` : ""}
                    </span>
                    <SeverityBar s={hovered.severity} />
                  </div>
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, background: hovered.diseaseColor, borderRadius: 2 }} />
                    <span style={{ fontSize: 12, color: "var(--ln-ink-2)" }}>{hovered.disease}</span>
                    <span
                      style={{
                        fontFamily: "var(--ln-font-mono)",
                        fontSize: 9,
                        letterSpacing: "0.08em",
                        color: "var(--ln-ink-4)",
                        textTransform: "uppercase",
                      }}
                    >
                      {hovered.diseaseType !== "unknown" ? hovered.diseaseType : ""}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      fontFamily: "var(--ln-font-mono)",
                      fontSize: 11,
                      color: "var(--ln-ink-3)",
                    }}
                  >
                    {hovered.cases > 0 ? `${hovered.cases.toLocaleString()} cases` : "Signal"}
                    {hovered.deaths > 0 && (
                      <>
                        {" · "}
                        <span style={{ color: "var(--ln-crit)" }}>
                          {hovered.deaths.toLocaleString()} deaths
                        </span>
                      </>
                    )}
                    {" · "}
                    {timeAgo(hovered.updated)} ago
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              bottom: 14,
              left: 14,
              right: 14,
              background: "var(--ln-overlay-bg)",
              border: "1px solid var(--ln-line)",
              padding: "10px 14px",
              backdropFilter: "blur(8px)",
              zIndex: 500,
              display: isMobile ? "none" : "block",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <span className="ln-eyebrow">Outbreak Volume · {range}</span>
              <span className="ln-num" style={{ fontSize: 10, color: "var(--ln-ink-4)" }}>
                rolling 28d
              </span>
            </div>
            <div style={{ position: "relative", height: 38 }}>
              <Sparkline data={spark30} width={1000} height={38} color={ACCENT} fill strokeW={1.5} />
              <div
                style={{
                  position: "absolute",
                  right: "8%",
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: ACCENT,
                  boxShadow: `0 0 10px ${ACCENT}`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: "8%",
                  top: -2,
                  transform: "translateX(50%)",
                  fontFamily: "var(--ln-font-mono)",
                  fontSize: 10,
                  color: ACCENT,
                }}
              >
                NOW
              </div>
            </div>
          </div>
        </main>

        <aside
          style={
            isMobile
              ? {
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: mobileSheetOpen ? "min(70vh, 520px)" : 56,
                  background: "var(--ln-elev-bg)",
                  borderTop: "1px solid var(--ln-line-2)",
                  borderTopLeftRadius: 14,
                  borderTopRightRadius: 14,
                  boxShadow: "0 -16px 40px rgba(0,0,0,0.5)",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  transition: "height .25s ease-out",
                  zIndex: 700,
                }
              : {
                  borderLeft: "1px solid var(--ln-line)",
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--ln-rail)",
                  overflow: "hidden",
                }
          }
        >
          {isMobile && (
            <button
              onClick={() => setMobileSheetOpen((v) => !v)}
              style={{
                padding: "8px 0 4px",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                justifyContent: "center",
                flex: "0 0 auto",
              }}
              aria-label={mobileSheetOpen ? "Collapse panel" : "Expand panel"}
            >
              <span
                style={{
                  width: 32,
                  height: 4,
                  background: "var(--ln-line-3)",
                  borderRadius: 2,
                }}
              />
            </button>
          )}
          {selected && (
            <div
              style={{
                padding: "14px 14px 12px",
                borderBottom: "1px solid var(--ln-line)",
                background: "linear-gradient(180deg, color-mix(in oklab, var(--ln-crit) 7%, transparent), transparent)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <span className="ln-eyebrow" style={{ color: severityColor(selected.severity) }}>
                    ● {selected.severityLabel.toUpperCase()} EVENT
                    {selected.isNew && (
                      <span
                        className="ln-chip is-warn"
                        style={{ marginLeft: 8, fontSize: 9, padding: "1px 6px" }}
                      >
                        NEW
                      </span>
                    )}
                  </span>
                  <div className="ln-display" style={{ fontSize: 22, lineHeight: 1.05, marginTop: 4 }}>
                    {selected.disease} · {selected.city}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ln-ink-3)", marginTop: 2 }}>
                    {selected.country}
                    {selected.iso ? ` (${selected.iso})` : ""} · {selected.source}
                  </div>
                  {selected.title && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--ln-ink-2)",
                        marginTop: 8,
                        lineHeight: 1.4,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      "{selected.title}"
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--ln-ink-3)",
                  }}
                >
                  <Icon.X />
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
                <Metric
                  label={tCases}
                  value={selected.cases > 0 ? selected.cases.toLocaleString() : "—"}
                />
                <Metric
                  label={tDeaths}
                  value={selected.deaths > 0 ? selected.deaths.toLocaleString() : "—"}
                  tone={selected.deaths > 0 ? "crit" : undefined}
                />
                <Metric
                  label={tConfidence}
                  value={`${Math.round(selected.confidence * 100)}%`}
                />
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                {selected.url ? (
                  <a
                    href={selected.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ln-btn is-primary"
                    style={{ flex: 1, justifyContent: "center" }}
                  >
                    {tReadFullArticle}
                  </a>
                ) : (
                  <button className="ln-btn is-primary" style={{ flex: 1, justifyContent: "center" }}>
                    {tViewDossier}
                  </button>
                )}
                <button
                  className="ln-btn"
                  onClick={() => setRecsOpenFor(selected.disease)}
                  title="AI public-health recommendations for this disease"
                >
                  <Icon.Sparkles /> {tRecs}
                </button>
                <button className="ln-btn" title={tSubscribeAlerts}>
                  <Icon.Bell />
                </button>
              </div>
              <MinistryContact country={selected.country} />
            </div>
          )}

          <div style={{ display: "flex", borderBottom: "1px solid var(--ln-line)" }}>
            {[
              { id: "alerts" as const, l: tAlertsTab, n: tickerAlerts.length },
              { id: "news" as const, l: tNewsTab, n: newsItems.length },
              { id: "sponsored" as const, l: tSponsoredTab, n: sponsoredAds.length },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: tab === t.id ? "var(--ln-ink)" : "var(--ln-ink-3)",
                  borderBottom: tab === t.id ? `1.5px solid ${ACCENT}` : "1.5px solid transparent",
                  fontSize: 12.5,
                }}
              >
                {t.l}{" "}
                <span className="ln-num" style={{ color: "var(--ln-ink-4)", marginLeft: 4 }}>
                  {t.n}
                </span>
              </button>
            ))}
          </div>

          <div className="ln-pane" style={{ overflowY: "auto", flex: 1 }}>
            {tab === "alerts" && <AlertTicker items={tickerAlerts} />}
            {tab === "news" &&
              (newsItems.length === 0 ? (
                <div style={{ padding: "14px 14px", fontSize: 12, color: "var(--ln-ink-3)" }}>
                  No articles in this filter yet. Browse the{" "}
                  <Link to="/news" style={{ color: ACCENT }}>
                    full feed
                  </Link>
                  .
                </div>
              ) : (
                newsItems.map((n) => (
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
                        marginBottom: 4,
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
                    <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>{n.title}</div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 6,
                      }}
                    >
                      <span
                        style={{ width: 6, height: 6, background: n.diseaseColor, borderRadius: 1 }}
                      />
                      <span style={{ fontSize: 11, color: "var(--ln-ink-3)" }}>{n.disease}</span>
                    </div>
                  </a>
                ))
              ))}
            {tab === "sponsored" && (
              <div>
                <div
                  style={{
                    padding: "8px 14px",
                    fontFamily: "var(--ln-font-mono)",
                    fontSize: 9,
                    color: "var(--ln-ink-4)",
                    letterSpacing: "0.14em",
                    borderBottom: "1px solid var(--ln-line)",
                  }}
                >
                  PREMIUM ADVERTISEMENTS · {sponsoredAds.length} ADS
                </div>
                {sponsoredAds.length === 0 ? (
                  <div style={{ padding: 14, fontSize: 12, color: "var(--ln-ink-3)" }}>
                    No premium campaigns active right now.
                  </div>
                ) : (
                  sponsoredAds.map((ad) => (
                    <div
                      key={ad.id}
                      style={{ padding: 14, borderBottom: "1px solid var(--ln-line)" }}
                    >
                      <AdCard ad={ad} variant="sidebar" />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {sponsoredAds[1] && (
            <div style={{ borderTop: "1px solid var(--ln-line)", background: "var(--ln-surface)" }}>
              <AdCard ad={sponsoredAds[1]} variant="rail-strip" />
            </div>
          )}
        </aside>
      </div>
      <DiseaseRecommendationsDialog
        open={!!recsOpenFor}
        onClose={() => setRecsOpenFor(null)}
        diseaseName={recsOpenFor || ""}
      />
    </div>
  );
}

export function TopBar({ active }: { active: "map" | "dashboard" | "news" | "ghi" }) {
  const tMap = useT("Surveillance Map");
  const tAnalytics = useT("Analytics");
  const tNews = useT("News");
  const tGHI = useT("Global Health Index");
  const tabs = [
    { id: "map", label: tMap, icon: <Icon.Map />, to: "/map" },
    { id: "dashboard", label: tAnalytics, icon: <Icon.Chart />, to: "/dashboard" },
    { id: "news", label: tNews, icon: <Icon.News />, to: "/news" },
    { id: "ghi", label: tGHI, icon: <Icon.Globe />, to: "/global-health-index" },
  ];
  return (
    <header
      style={{
        display: "grid",
        gridTemplateColumns: "232px 1fr auto",
        alignItems: "center",
        borderBottom: "1px solid var(--ln-line)",
        background: "var(--ln-topbar)",
      }}
    >
      <Link
        to="/"
        style={{
          padding: "0 18px",
          borderRight: "1px solid var(--ln-line)",
          height: "100%",
          display: "flex",
          alignItems: "center",
          textDecoration: "none",
        }}
      >
        <Logo color={ACCENT} />
      </Link>
      <nav style={{ display: "flex", alignItems: "center", gap: 0, height: "100%" }}>
        {tabs.map((t) => (
          <Link
            key={t.id}
            to={t.to}
            style={{
              padding: "0 14px",
              height: "100%",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontSize: 12.5,
              color: active === t.id ? "var(--ln-ink)" : "var(--ln-ink-3)",
              borderBottom: active === t.id ? `1.5px solid ${ACCENT}` : "1.5px solid transparent",
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            {t.icon}
            {t.label}
          </Link>
        ))}
      </nav>
      <div style={{ display: "flex", alignItems: "center", gap: 14, paddingRight: 16 }}>
        <StatusPill />
        <div style={{ width: 1, height: 18, background: "var(--ln-line)" }} />
        <LanguageSelector />
        <ThemeToggle />
        <HeaderAlerts />
        <HeaderUser />
      </div>
    </header>
  );
}

function KPI({
  label,
  value,
  sub,
  tone,
  spark,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "warn" | "crit";
  spark?: number[];
  accent?: string;
}) {
  const color = tone === "crit" ? "var(--ln-crit)" : tone === "warn" ? "var(--ln-warn)" : "var(--ln-brand)";
  return (
    <div
      style={{
        background: "var(--ln-overlay-bg)",
        border: "1px solid var(--ln-line-2)",
        padding: "10px 14px",
        backdropFilter: "blur(8px)",
        minWidth: 180,
        pointerEvents: "auto",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {accent && (
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: accent }} />
      )}
      <div className="ln-eyebrow">{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
        <span className="ln-num" style={{ fontSize: 22, color: "var(--ln-ink)", fontWeight: 500 }}>
          {value}
        </span>
        {spark && <Sparkline data={spark} width={60} height={20} color={color} />}
      </div>
      <div style={{ fontSize: 10.5, color, fontFamily: "var(--ln-font-mono)", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "crit" }) {
  const color = tone === "crit" ? "var(--ln-crit)" : "var(--ln-ink)";
  return (
    <div style={{ background: "var(--ln-surface-2)", padding: "8px 10px" }}>
      <div className="ln-eyebrow">{label}</div>
      <div className="ln-num" style={{ fontSize: 16, color, marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

function MinistryContact({ country }: { country: string | null | undefined }) {
  const { ministry, loading } = useHealthMinistry(country || null);
  if (!country || loading) return null;
  if (!ministry) return null;
  return (
    <div
      style={{
        marginTop: 12,
        padding: "10px 12px",
        border: "1px solid var(--ln-line-2)",
        background: "var(--ln-surface)",
      }}
    >
      <div className="ln-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>
        Responsible authority
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ln-ink)", lineHeight: 1.3, fontWeight: 500 }}>
        {ministry.ministry_name}
      </div>
      <div
        style={{
          marginTop: 6,
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          fontSize: 11,
          fontFamily: "var(--ln-font-mono)",
        }}
      >
        {ministry.email_address && (
          <a
            href={`mailto:${ministry.email_address}`}
            style={{ color: "var(--ln-brand)", textDecoration: "none" }}
          >
            {ministry.email_address}
          </a>
        )}
        {ministry.phone_number && (
          <span style={{ color: "var(--ln-ink-3)" }}>{ministry.phone_number}</span>
        )}
      </div>
    </div>
  );
}

