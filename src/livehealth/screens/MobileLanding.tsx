import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import { LanguageSelector } from "../components/LanguageSelector";
import { DonateDialog } from "../components/DonateDialog";
import { Sparkline } from "../components/Sparkline";
import { WorldMap } from "../components/WorldMap";
import { AdCard } from "../components/AdCard";
import { PARTNERS } from "../data/constants";
import { useLiveOutbreaks } from "../data/useLiveOutbreaks";
import { useLiveAlerts } from "../data/useLiveAlerts";
import { useLiveRegionRisk } from "../data/useLiveRegionRisk";
import { useLiveSponsored } from "../data/useLiveSponsored";
import { useDashboardStats } from "../../lib/useDashboardStats";
import { timeAgo } from "../lib/utils";
import { useMobileSize } from "../lib/useBreakpoint";

const ACCENT = "#4ee0c4";

// Dedicated mobile-first Landing matching screen-landing-mobile.jsx from the
// design bundle. Distinct UX from the responsive desktop variant:
//  - full-bleed globe hero with translucent header floating over it
//  - LIVE alert marquee right under the hero
//  - sponsors moved up and prominent (1 featured card + 4 in a 2-col grid)
//  - 2-stat strip pinned to the bottom of the hero
//  - access tiers compressed to single-row pricing rows
export function MobileLandingScreen() {
  const mobileSize = useMobileSize();
  const isNarrow = mobileSize === "narrow";
  const { outbreaks } = useLiveOutbreaks("30d", 40);
  const { alerts } = useLiveAlerts(12, "24h");
  const { regionRisk } = useLiveRegionRisk("30d");
  const { ads } = useLiveSponsored({ location: "homepage", limit: 2 });
  const { stats } = useDashboardStats("7d");
  const [donateOpen, setDonateOpen] = useState(false);

  const featured = useMemo(() => outbreaks.find((o) => o.severity >= 4) || outbreaks[0], [outbreaks]);

  return (
    <div className="ln-app" style={{ width: "100%", minHeight: "100vh", background: "var(--ln-bg)", color: "var(--ln-ink)" }}>
      {/* Top bar — translucent over hero */}
      <header
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "color-mix(in oklab, var(--ln-bg) 60%, transparent)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid var(--ln-line)",
        }}
      >
        <Logo color={ACCENT} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--ln-ink-2)" }}>
          <LanguageSelector />
          <ThemeToggle />
          <Link to="/map" style={{ color: "inherit" }} aria-label="Search">
            <Icon.Search />
          </Link>
          <Link to="/dashboard" style={{ color: "inherit" }} aria-label="Menu">
            <Icon.Menu />
          </Link>
        </div>
      </header>

      <MobileHero outbreaks={outbreaks} regionRisk={regionRisk} featured={featured} />

      {/* Live alert ticker */}
      {alerts.length > 0 && (
        <section
          style={{
            padding: "10px 0",
            borderBottom: "1px solid var(--ln-line)",
            background: "var(--ln-surface)",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <span
              style={{
                flex: "0 0 auto",
                padding: "0 12px",
                fontFamily: "var(--ln-font-mono)",
                fontSize: 9,
                letterSpacing: "0.14em",
                color: "var(--ln-crit)",
                borderRight: "1px solid var(--ln-line-2)",
              }}
            >
              ● LIVE
            </span>
            <div
              style={{
                flex: 1,
                overflow: "hidden",
                position: "relative",
                maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 32,
                  whiteSpace: "nowrap",
                  animation: "ln-scroll 50s linear infinite",
                }}
              >
                {alerts.concat(alerts).map((a, i) => (
                  <span
                    key={`${a.id}-${i}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11 }}
                  >
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background:
                          a.level === "critical"
                            ? "var(--ln-crit)"
                            : a.level === "high"
                            ? "#ff7a3b"
                            : "var(--ln-warn)",
                      }}
                    />
                    <span
                      style={{ fontFamily: "var(--ln-font-mono)", fontSize: 9, color: "var(--ln-ink-3)" }}
                    >
                      {a.country.toUpperCase()}
                    </span>
                    <span style={{ color: "var(--ln-ink-2)" }}>{a.text}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Sponsors — early & prominent: 1 featured + 4 in a 2-col grid */}
      <section
        style={{
          padding: "32px clamp(18px, 5vw, 36px) 36px",
          borderBottom: "1px solid var(--ln-line)",
          background: "var(--ln-surface)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <span className="ln-eyebrow">In partnership with</span>
          <h2
            className="ln-display"
            style={{ fontSize: "clamp(22px, 5.5vw, 28px)", margin: "8px 0 8px", letterSpacing: "-0.02em", lineHeight: 1.1 }}
          >
            Built with the institutions{" "}
            <span style={{ fontStyle: "italic", color: "var(--ln-ink-3)" }}>that set the standard.</span>
          </h2>
          <p
            style={{
              fontSize: 12.5,
              color: "var(--ln-ink-2)",
              lineHeight: 1.5,
              maxWidth: "100%",
              margin: "0 auto",
            }}
          >
            OutbreakNow is operated by EldoNova+ in partnership with the Global Health and Quality Alliance.
          </p>
        </div>

        <a
          href={PARTNERS[0].url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            border: "1px solid var(--ln-line-2)",
            marginBottom: 10,
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "22px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "clamp(84px, 22vw, 110px)",
            }}
          >
            <img
              src={PARTNERS[0].logo}
              alt={PARTNERS[0].full}
              style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
            />
          </div>
          <div style={{ padding: "12px 16px 14px", textAlign: "center" }}>
            <div
              style={{
                fontFamily: "var(--ln-font-mono)",
                fontSize: 11,
                letterSpacing: "0.14em",
                color: "var(--ln-ink)",
                fontWeight: 500,
              }}
            >
              {PARTNERS[0].name}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ln-ink-3)", marginTop: 4 }}>{PARTNERS[0].full}</div>
          </div>
        </a>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {PARTNERS.slice(1).map((p) => (
            <a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "block", border: "1px solid var(--ln-line-2)", textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  background: "#fff",
                  padding: "14px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "clamp(58px, 16vw, 78px)",
                }}
              >
                <img
                  src={p.logo}
                  alt={p.full}
                  style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
                />
              </div>
              <div style={{ padding: "8px 10px 10px", textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: "var(--ln-font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    color: "var(--ln-ink)",
                  }}
                >
                  {p.name}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--ln-ink-3)", lineHeight: 1.3, marginTop: 3 }}>
                  {p.full}
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Live stats */}
      <section style={{ padding: "28px 18px", borderBottom: "1px solid var(--ln-line)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 14,
          }}
        >
          <span className="ln-eyebrow">The world, right now</span>
          <span style={{ fontFamily: "var(--ln-font-mono)", fontSize: 10, color: "var(--ln-ink-4)" }}>
            11s ago
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
            border: "1px solid var(--ln-line)",
          }}
        >
          {[
            {
              l: "Active outbreaks",
              v: stats?.activeOutbreaks?.toLocaleString() || "—",
              d: stats?.activeOutbreaksChange || "+0%",
              c: "var(--ln-crit)",
              sp: [180, 184, 191, 205, 212, 209, 221, 234, stats?.activeOutbreaks ?? 0],
            },
            {
              l: "Countries",
              v: stats?.countriesAffected?.toLocaleString() || "—",
              d: stats?.countriesAffectedChange || "+0",
              c: "var(--ln-warn)",
              sp: [58, 59, 61, 63, 64, 64, 66, 67, stats?.countriesAffected ?? 0],
            },
            {
              l: "Cases / week",
              v: stats ? stats.totalCases.toLocaleString() : "—",
              d: stats?.totalCasesChange || "+0%",
              c: "var(--ln-info)",
              sp: [62, 65, 70, 73, 78, 82, 86, 90, Math.round((stats?.totalCases ?? 0) / 1000) || 0],
            },
            {
              l: "AI risk index",
              v: "6.4",
              d: "+0.4",
              c: ACCENT,
              sp: [5.6, 5.7, 5.8, 5.9, 6.0, 6.1, 6.2, 6.3, 6.4],
            },
          ].map((s, i, arr) => (
            <div
              key={s.l}
              style={{
                padding: "14px 14px",
                borderRight: !isNarrow && i % 2 === 0 ? "1px solid var(--ln-line)" : "none",
                borderBottom: isNarrow
                  ? i !== arr.length - 1
                    ? "1px solid var(--ln-line)"
                    : "none"
                  : i < 2
                  ? "1px solid var(--ln-line)"
                  : "none",
                position: "relative",
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, width: 22, height: 2, background: s.c }} />
              <div className="ln-eyebrow" style={{ fontSize: 9 }}>
                {s.l}
              </div>
              <div
                className="ln-num"
                style={{ fontSize: 24, fontWeight: 500, marginTop: 6, letterSpacing: "-0.03em" }}
              >
                {s.v}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  marginTop: 2,
                }}
              >
                <span style={{ fontSize: 10.5, color: s.c, fontFamily: "var(--ln-font-mono)" }}>▲ {s.d}</span>
                <Sparkline data={s.sp} color={s.c} width={50} height={18} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Three modules — stacked */}
      <section style={{ padding: "36px 18px", borderBottom: "1px solid var(--ln-line)" }}>
        <span className="ln-eyebrow">The product</span>
        <h2
          className="ln-display"
          style={{ fontSize: "clamp(24px, 6.5vw, 32px)", margin: "8px 0 6px", letterSpacing: "-0.02em", lineHeight: 1.05 }}
        >
          Three surfaces, <span style={{ fontStyle: "italic", color: "var(--ln-ink-3)" }}>one truth.</span>
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--ln-ink-2)", lineHeight: 1.5, marginBottom: 18 }}>
          The map shows you <b style={{ color: "var(--ln-ink)" }}>where</b>. Analytics tells you{" "}
          <b style={{ color: "var(--ln-ink)" }}>how big</b>. The forecast tells you{" "}
          <b style={{ color: "var(--ln-ink)" }}>what next</b>.
        </p>
        {[
          { n: "01", e: "Surveillance", t: "The map of right now", b: "Every event in 193 countries, fused from authority feeds.", to: "/map" },
          { n: "02", e: "Analytics", t: "The math behind the headlines", b: "Incidence curves, doubling times, regional roll-ups.", to: "/dashboard" },
          { n: "03", e: "Foresight", t: "The forecast you can defend", b: "Transparent ensemble with confidence and drivers.", to: "/dashboard" },
        ].map((m, i, arr) => (
          <Link
            key={m.n}
            to={m.to}
            style={{
              display: "grid",
              gridTemplateColumns: "36px 1fr auto",
              gap: 14,
              padding: "20px 0",
              borderBottom: i !== arr.length - 1 ? "1px solid var(--ln-line)" : "none",
              alignItems: "flex-start",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <span className="ln-num" style={{ fontSize: 12, color: "var(--ln-ink-4)" }}>
              {m.n}
            </span>
            <div>
              <span className="ln-eyebrow">{m.e}</span>
              <h3 style={{ fontSize: 17, margin: "4px 0 6px", fontWeight: 500 }}>{m.t}</h3>
              <p style={{ fontSize: 13, color: "var(--ln-ink-3)", lineHeight: 1.45 }}>{m.b}</p>
            </div>
            <Icon.ArrowR style={{ color: ACCENT, marginTop: 26 }} />
          </Link>
        ))}
      </section>

      {/* Latest signals */}
      <section style={{ padding: "36px 18px", borderBottom: "1px solid var(--ln-line)" }}>
        <span className="ln-eyebrow">Latest signals</span>
        <h2 className="ln-display" style={{ fontSize: "clamp(24px, 6vw, 30px)", margin: "8px 0 16px", letterSpacing: "-0.02em" }}>
          What broke <span style={{ color: "var(--ln-ink-3)", fontStyle: "italic" }}>this morning.</span>
        </h2>
        <div style={{ border: "1px solid var(--ln-line)" }}>
          {alerts.slice(0, 5).map((a, i, arr) => (
            <Link
              key={a.id}
              to="/map"
              style={{
                padding: "12px 14px",
                borderBottom: i !== arr.length - 1 ? "1px solid var(--ln-line)" : "none",
                display: "grid",
                gridTemplateColumns: "8px 1fr auto",
                gap: 10,
                alignItems: "flex-start",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <span
                style={{
                  marginTop: 5,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background:
                    a.level === "critical"
                      ? "var(--ln-crit)"
                      : a.level === "high"
                      ? "#ff7a3b"
                      : "var(--ln-warn)",
                }}
              />
              <div>
                <div
                  style={{
                    fontFamily: "var(--ln-font-mono)",
                    fontSize: 9,
                    color: "var(--ln-ink-3)",
                    letterSpacing: "0.1em",
                  }}
                >
                  {a.region} · {a.country.toUpperCase()}
                </div>
                <div style={{ fontSize: 13, color: "var(--ln-ink)", lineHeight: 1.4, marginTop: 3 }}>
                  {a.text}
                </div>
              </div>
              <span style={{ fontFamily: "var(--ln-font-mono)", fontSize: 9, color: "var(--ln-ink-4)" }}>
                {timeAgo(a.ts)}
              </span>
            </Link>
          ))}
        </div>
        <Link
          to="/news"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12.5,
            color: ACCENT,
            textDecoration: "none",
            marginTop: 14,
          }}
        >
          See full feed <Icon.ArrowR />
        </Link>
      </section>

      {/* Featured ad */}
      {ads[1] && (
        <section style={{ padding: "24px 18px", borderBottom: "1px solid var(--ln-line)" }}>
          <AdCard ad={ads[1]} variant="sidebar" />
        </section>
      )}

      {/* Access tiers — compact */}
      <section style={{ padding: "36px 18px", borderBottom: "1px solid var(--ln-line)" }}>
        <span className="ln-eyebrow">Access</span>
        <h2
          className="ln-display"
          style={{ fontSize: "clamp(24px, 6vw, 30px)", margin: "8px 0 22px", letterSpacing: "-0.025em", lineHeight: 1 }}
        >
          The world's view <span style={{ fontStyle: "italic", color: "var(--ln-ink-3)" }}>shouldn't be locked up.</span>
        </h2>
        {[
          { tag: "OPEN", name: "Public", price: "Free, forever", featured: false, blurb: "Map, weekly digest, rate-limited API.", to: "/map" },
          { tag: "STANDARD", name: "Researcher", price: "$240 / mo", featured: true, blurb: "Sub-national resolution, forecast API, alerts.", to: "/dashboard" },
          { tag: "AGENCY", name: "Authority", price: "Custom", featured: false, blurb: "Private feeds, SSO, on-prem, dedicated epi.", to: "/partnership" },
        ].map((t) => (
          <div
            key={t.name}
            style={{
              border: t.featured ? `1px solid ${ACCENT}` : "1px solid var(--ln-line)",
              background: t.featured ? "var(--ln-surface)" : "transparent",
              padding: "16px 16px",
              marginBottom: 10,
              position: "relative",
            }}
          >
            {t.featured && (
              <span
                style={{
                  position: "absolute",
                  top: -8,
                  left: 14,
                  padding: "2px 7px",
                  background: ACCENT,
                  color: "var(--ln-brand-ink)",
                  fontFamily: "var(--ln-font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.12em",
                }}
              >
                RECOMMENDED
              </span>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <span className="ln-eyebrow">{t.tag}</span>
                <div className="ln-display" style={{ fontSize: 22, marginTop: 2, letterSpacing: "-0.02em" }}>
                  {t.name}
                </div>
                <div className="ln-num" style={{ fontSize: 13, color: t.featured ? ACCENT : "var(--ln-ink-2)" }}>
                  {t.price}
                </div>
              </div>
              <Link to={t.to} className={`ln-btn ${t.featured ? "is-primary" : ""}`} style={{ flex: "0 0 auto" }}>
                <Icon.ArrowR />
              </Link>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--ln-ink-3)", lineHeight: 1.45, margin: "10px 0 0" }}>
              {t.blurb}
            </p>
          </div>
        ))}
      </section>

      {/* Donate CTA */}
      <section
        style={{ padding: "32px 18px", borderBottom: "1px solid var(--ln-line)", background: "var(--ln-surface)" }}
      >
        <span className="ln-eyebrow">Support the work</span>
        <h2
          className="ln-display"
          style={{ fontSize: "clamp(20px, 5.5vw, 24px)", margin: "8px 0 6px", letterSpacing: "-0.02em", lineHeight: 1.1 }}
        >
          Open surveillance is{" "}
          <span style={{ fontStyle: "italic", color: "var(--ln-ink-3)" }}>cheaper than the next outbreak.</span>
        </h2>
        <p style={{ fontSize: 13, color: "var(--ln-ink-2)", lineHeight: 1.5, margin: "0 0 14px" }}>
          OutbreakNow is operated by EldoNova+ Technologies. Donations keep the pipeline and API free.
        </p>
        <button
          className="ln-btn is-primary"
          onClick={() => setDonateOpen(true)}
          style={{ width: "100%", justifyContent: "center", padding: "12px 0", fontSize: 13 }}
        >
          Donate <Icon.ArrowR />
        </button>
        <DonateDialog open={donateOpen} onClose={() => setDonateOpen(false)} />
      </section>

      {/* Footer */}
      <footer style={{ padding: "32px 18px 28px", background: "var(--ln-surface)" }}>
        <Logo color={ACCENT} />
        <p
          style={{
            fontSize: 12.5,
            color: "var(--ln-ink-3)",
            lineHeight: 1.5,
            margin: "14px 0 18px",
          }}
        >
          OutbreakNow is operated by EldoNova+ Technologies in partnership with the Global Health and
          Quality Alliance.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
            gap: isNarrow ? 14 : 18,
            marginBottom: 20,
          }}
        >
          {[
            { h: "Product", items: ["Map", "Analytics", "Forecast", "API"] },
            { h: "Coverage", items: ["Pathogens", "Sources", "Methodology"] },
            { h: "Company", items: ["About", "Partners", "Press"] },
            { h: "Legal", items: ["Privacy", "Terms", "Data licence"] },
          ].map((c) => (
            <div key={c.h}>
              <span className="ln-eyebrow">{c.h}</span>
              <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
                {c.items.map((it) => (
                  <li
                    key={it}
                    style={{ fontSize: 12.5, color: "var(--ln-ink-2)", padding: "4px 0" }}
                  >
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div
          style={{
            borderTop: "1px solid var(--ln-line)",
            paddingTop: 14,
            fontFamily: "var(--ln-font-mono)",
            fontSize: 10,
            color: "var(--ln-ink-4)",
          }}
        >
          © {new Date().getFullYear()} EldoNova+ Technologies - New York, NY
        </div>
      </footer>
    </div>
  );
}

function MobileHero({
  outbreaks,
  regionRisk,
  featured,
}: {
  outbreaks: ReturnType<typeof useLiveOutbreaks>["outbreaks"];
  regionRisk: Record<string, number>;
  featured: ReturnType<typeof useLiveOutbreaks>["outbreaks"][number] | undefined;
}) {
  const mobileSize = useMobileSize();
  const isNarrow = mobileSize === "narrow";
  const vRef = useRef<HTMLVideoElement | null>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const mapWrapRef = useRef<HTMLDivElement | null>(null);
  const [mapW, setMapW] = useState(420);

  useEffect(() => {
    const el = mapWrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.max(280, Math.round(e.contentRect.width));
        setMapW(w);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const v = vRef.current;
    if (!v) return;
    const reveal = () => {
      if (v.videoWidth > 0) setHasVideo(true);
    };
    v.addEventListener("loadeddata", reveal);
    v.addEventListener("playing", reveal);
    v.play().catch(() => {});
    return () => {
      v.removeEventListener("loadeddata", reveal);
      v.removeEventListener("playing", reveal);
    };
  }, []);

  return (
    <section
      style={{ position: "relative", minHeight: 620, borderBottom: "1px solid var(--ln-line)", overflow: "hidden" }}
    >
      <div
        className="ln-dotgrid"
        style={{ position: "absolute", inset: 0, background: "var(--ln-map-bg)" }}
      >
        <video
          ref={vRef}
          autoPlay
          loop
          muted
          playsInline
          src="/livehealth/globevideo.mp4"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: hasVideo ? 0.85 : 0,
            transition: "opacity .6s",
            zIndex: 2,
          }}
        />
        <div ref={mapWrapRef} style={{ position: "absolute", inset: 0 }}>
          <WorldMap
            width={mapW}
            height={Math.round(mapW * (620 / 420))}
            outbreaks={outbreaks.map((o) => ({ id: o.id, lng: o.lng, lat: o.lat, severity: o.severity }))}
            regionRisk={regionRisk}
            showChoropleth
            pulse
            dotSpacing={9}
          />
        </div>
      </div>

      {/* Scrim for readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 5,
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--ln-bg) 70%, transparent) 0%, color-mix(in oklab, var(--ln-bg) 25%, transparent) 38%, color-mix(in oklab, var(--ln-bg) 35%, transparent) 65%, color-mix(in oklab, var(--ln-bg) 96%, transparent) 100%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          padding: "60px 18px 90px",
          minHeight: 620,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {featured && (
          <div
            style={{
              display: "inline-flex",
              alignSelf: "flex-start",
              alignItems: "center",
              flexWrap: "wrap",
              maxWidth: "100%",
              gap: 7,
              padding: "4px 10px 4px 8px",
              borderRadius: 999,
              background: "color-mix(in oklab, var(--ln-crit) 14%, transparent)",
              border: "1px solid color-mix(in oklab, var(--ln-crit) 38%, transparent)",
              backdropFilter: "blur(6px)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--ln-crit)",
                boxShadow: "0 0 8px var(--ln-crit)",
                animation: "ln-pulse-soft 1.4s infinite",
              }}
            />
            <span
              style={{
                fontFamily: "var(--ln-font-mono)",
                fontSize: 10,
                letterSpacing: "0.1em",
                color: "var(--ln-crit)",
              }}
            >
              LIVE · {featured.country.toUpperCase()} · {featured.disease.toUpperCase()}
            </span>
          </div>
        )}

        <h1
          className="ln-display"
          style={{
            fontSize: "clamp(32px, 8vw, 52px)",
            lineHeight: 0.94,
            margin: "20px 0 18px",
            letterSpacing: "-0.03em",
            textShadow: "0 2px 16px rgba(0,0,0,0.5)",
          }}
        >
          When the next one starts<span style={{ color: "var(--ln-ink-4)" }}>,</span>
          <br />
          <span style={{ color: "var(--ln-ink-3)", fontStyle: "italic" }}>you'll </span>
          <span style={{ color: ACCENT, fontStyle: "italic" }}>know first.</span>
        </h1>

        <p
          style={{
            fontSize: 14.5,
            lineHeight: 1.5,
            color: "var(--ln-ink-2)",
            marginBottom: 22,
            textShadow: "0 1px 8px rgba(0,0,0,0.4)",
          }}
        >
          Real-time outbreak intelligence from{" "}
          <b style={{ color: "var(--ln-ink)" }}>1,200 health authorities</b>, fused into one decision-grade
          picture.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: isNarrow ? "column" : "row",
            gap: 8,
            marginBottom: "auto",
          }}
        >
          <Link
            to="/map"
            className="ln-btn is-primary"
            style={{
              flex: isNarrow ? "0 0 auto" : 1,
              width: isNarrow ? "100%" : undefined,
              justifyContent: "center",
              padding: "12px 12px",
              fontSize: 13,
            }}
          >
            Open live map
          </Link>
          <Link
            to="/dashboard"
            className="ln-btn"
            style={{
              padding: "12px 14px",
              fontSize: 13,
              width: isNarrow ? "100%" : undefined,
              justifyContent: isNarrow ? "center" : undefined,
              background: "color-mix(in oklab, var(--ln-bg) 60%, transparent)",
              backdropFilter: "blur(6px)",
            }}
          >
            Analytics
          </Link>
        </div>
      </div>

      {/* Bottom 2-stat strip */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10,
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          borderTop: "1px solid var(--ln-line)",
          background: "color-mix(in oklab, var(--ln-bg) 88%, transparent)",
          backdropFilter: "blur(10px)",
        }}
      >
        {[
          { l: "Signal lag", v: "11", u: "min", c: "var(--ln-brand)" },
          { l: "Pathogens", v: "184", u: "", c: "var(--ln-info)" },
        ].map((s, i) => (
          <div
            key={s.l}
            style={{
              padding: "12px 14px",
              borderRight: i === 0 ? "1px solid var(--ln-line)" : "none",
              position: "relative",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, width: 22, height: 2, background: s.c }} />
            <div className="ln-eyebrow" style={{ fontSize: 9 }}>
              {s.l}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 4 }}>
              <span className="ln-num" style={{ fontSize: 22, fontWeight: 500 }}>
                {s.v}
              </span>
              <span className="ln-num" style={{ fontSize: 10, color: "var(--ln-ink-3)" }}>
                {s.u}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
