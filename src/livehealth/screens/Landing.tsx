import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Logo } from "../components/Logo";
import { StatusPill } from "../components/StatusPill";
import { ThemeToggle } from "../components/ThemeToggle";
import { LanguageSelector } from "../components/LanguageSelector";
import { DonateDialog } from "../components/DonateDialog";
import { NewsletterDialog } from "../components/NewsletterDialog";
import { Sparkline } from "../components/Sparkline";
import { WorldMap } from "../components/WorldMap";
import { AdCard } from "../components/AdCard";
import { useLiveSponsored } from "../data/useLiveSponsored";
import { PARTNERS } from "../data/constants";
import { useLiveOutbreaks } from "../data/useLiveOutbreaks";
import { useLiveAlerts } from "../data/useLiveAlerts";
import { useLiveRegionRisk } from "../data/useLiveRegionRisk";
import { useLiveSeries } from "../data/useLiveSeries";
import { useDashboardStats } from "../../lib/useDashboardStats";
import { timeAgo, severityColor } from "../lib/utils";
import { PREDICTIONS } from "../data/predictions";
import { useBreakpoint } from "../lib/useBreakpoint";
import { useT } from "../lib/useT";

const ACCENT = "#4ee0c4";

export function LandingScreen() {
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
      <LandingNav />
      <LandingHero />
      <LandingMarquee />
      <LandingPartners />
      <LandingStats />
      <LandingModules />
      <LandingIntel />
      <LandingAccess />
      <LandingDonate />
      <LandingFooter />
    </div>
  );
}

function LandingNav() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const tSurveillance = useT("Surveillance");
  const tAnalytics = useT("Analytics");
  const tNews = useT("News");
  const tForecast = useT("Forecast");
  const tPricing = useT("Pricing");
  const tAbout = useT("About");
  const tSignIn = useT("Sign in");
  const tRequestAccess = useT("Request access");
  const tOpenMap = useT("Open map");
  const items = [
    { l: tSurveillance, to: "/map" },
    { l: tAnalytics, to: "/dashboard" },
    { l: tNews, to: "/news" },
    { l: tForecast, to: "/dashboard" },
    { l: tPricing, to: "/#access" },
    { l: tAbout, to: "/partnership" },
  ];
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: isMobile ? "12px 16px" : "18px 32px",
        borderBottom: "1px solid var(--ln-line)",
        background: "var(--ln-topbar)",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 14 : 36, minWidth: 0 }}>
        <Logo color={ACCENT} />
        <nav style={{ display: isMobile ? "none" : "flex", gap: 24 }}>
          {items.map((it) => (
            <Link
              key={it.to + it.l}
              to={it.to}
              style={{ fontSize: 13, color: "var(--ln-ink-2)", textDecoration: "none" }}
            >
              {it.l}
            </Link>
          ))}
        </nav>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {!isMobile && <StatusPill />}
        {!isMobile && <div style={{ width: 1, height: 18, background: "var(--ln-line)" }} />}
        <LanguageSelector />
        <ThemeToggle />
        {!isMobile && (
          <Link to="/map" className="ln-btn">
            {tSignIn}
          </Link>
        )}
        <Link to="/map" className="ln-btn is-primary">
          {isMobile ? tOpenMap : tRequestAccess} <Icon.ArrowR />
        </Link>
      </div>
    </header>
  );
}

function LandingHero() {
  const { outbreaks } = useLiveOutbreaks("30d", 60);
  const { regionRisk } = useLiveRegionRisk("30d");
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTabletDown = bp !== "desktop";
  const heroPad = isMobile ? "60px 18px 110px" : isTabletDown ? "64px 36px 96px" : "88px 64px 64px";
  const headlineSize = isMobile ? 44 : isTabletDown ? 68 : 104;
  const subSize = isMobile ? 15 : isTabletDown ? 17 : 19;
  const heroMin = isMobile ? 620 : 720;
  const statCols = isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)";

  const featured = outbreaks.find((o) => o.severity >= 4) || outbreaks[0];

  const tHeadlineStart = useT("When the next one starts");
  const tHeadlineYoull = useT("you'll");
  const tHeadlineKnow = useT("know first.");
  const tHeroBody = useT(
    "OutbreakNow ingests 1,200 health authorities, hospital networks, and open-source feeds in real time — turning a chaos of signals into a single, decision-grade outbreak picture."
  );
  const tOpenLiveMap = useT("Open live map");
  const tSeeAnalytics = useT("See the analytics");
  const tLag = useT("Avg. signal-to-alert lag");
  const tPathogens = useT("Pathogens tracked");
  const tCountries = useT("Countries covered");
  const tHindcast = useT("Hindcast F1");

  const stats = useMemo(
    () => [
      { l: tLag, v: "11", u: "min", c: "var(--ln-brand)" },
      { l: tPathogens, v: "184", u: "", c: "var(--ln-info)" },
      { l: tCountries, v: "193", u: "", c: "var(--ln-warn)" },
      { l: tHindcast, v: "0.83", u: "", c: "var(--ln-violet)" },
    ],
    [tLag, tPathogens, tCountries, tHindcast]
  );

  return (
    <section
      style={{
        position: "relative",
        minHeight: heroMin,
        borderBottom: "1px solid var(--ln-line)",
        overflow: "hidden",
        background: "var(--ln-bg)",
      }}
    >
      <HeroGlobe outbreaks={outbreaks} regionRisk={regionRisk} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 5,
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--ln-bg) 78%, transparent) 0%, color-mix(in oklab, var(--ln-bg) 40%, transparent) 35%, color-mix(in oklab, var(--ln-bg) 30%, transparent) 65%, color-mix(in oklab, var(--ln-bg) 92%, transparent) 100%), linear-gradient(90deg, color-mix(in oklab, var(--ln-bg) 70%, transparent) 0%, transparent 45%, transparent 60%, color-mix(in oklab, var(--ln-bg) 30%, transparent) 100%)",
        }}
      />

      <div style={{ position: "relative", zIndex: 10, padding: heroPad, maxWidth: 960 }}>
        {featured && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 12px 5px 8px",
              borderRadius: 999,
              background: "color-mix(in oklab, var(--ln-crit) 12%, transparent)",
              border: "1px solid color-mix(in oklab, var(--ln-crit) 38%, transparent)",
              backdropFilter: "blur(6px)",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--ln-crit)",
                boxShadow: "0 0 10px var(--ln-crit)",
                animation: "ln-pulse-soft 1.4s infinite",
              }}
            />
            <span
              style={{
                fontFamily: "var(--ln-font-mono)",
                fontSize: 11,
                letterSpacing: "0.1em",
                color: "var(--ln-crit)",
              }}
            >
              LIVE · {featured.country.toUpperCase()} · {featured.disease.toUpperCase()}
            </span>
            <span style={{ fontSize: 11, color: "var(--ln-ink-3)" }}>· {timeAgo(featured.updated)} ago</span>
          </div>
        )}

        <h1
          className="ln-display"
          style={{
            fontSize: headlineSize,
            lineHeight: 0.94,
            margin: isMobile ? "22px 0 18px" : "32px 0 28px",
            letterSpacing: "-0.03em",
            textWrap: "balance" as any,
            textShadow: "0 2px 24px rgba(0,0,0,0.4)",
          }}
        >
          {tHeadlineStart}
          <span style={{ color: "var(--ln-ink-4)" }}>,</span>
          <br />
          <span style={{ color: "var(--ln-ink-3)", fontStyle: "italic" }}>{tHeadlineYoull} </span>
          <span style={{ color: ACCENT, fontStyle: "italic" }}>{tHeadlineKnow}</span>
        </h1>

        <p
          style={{
            fontSize: subSize,
            lineHeight: 1.5,
            color: "var(--ln-ink-2)",
            maxWidth: 620,
            marginBottom: isMobile ? 24 : 36,
            textShadow: "0 2px 12px rgba(0,0,0,0.4)",
          }}
        >
          {tHeroBody}
        </p>

        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: isMobile ? 32 : 64,
            flexWrap: "wrap",
          }}
        >
          <Link
            to="/map"
            className="ln-btn is-primary"
            style={{
              padding: isMobile ? "10px 14px" : "12px 18px",
              fontSize: isMobile ? 13 : 14,
            }}
          >
            <Icon.Map /> {tOpenLiveMap}
          </Link>
          <Link
            to="/dashboard"
            className="ln-btn"
            style={{
              padding: isMobile ? "10px 14px" : "12px 18px",
              fontSize: isMobile ? 13 : 14,
              background: "color-mix(in oklab, var(--ln-bg) 70%, transparent)",
              backdropFilter: "blur(6px)",
            }}
          >
            {tSeeAnalytics} <Icon.ArrowR />
          </Link>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10,
          display: "grid",
          gridTemplateColumns: statCols,
          borderTop: "1px solid var(--ln-line)",
          background: "color-mix(in oklab, var(--ln-bg) 85%, transparent)",
          backdropFilter: "blur(10px)",
        }}
      >
        {stats.map((s, i, arr) => (
          <div
            key={s.l}
            style={{
              padding: "18px 20px",
              borderRight: i !== arr.length - 1 ? "1px solid var(--ln-line)" : "none",
              position: "relative",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, width: 32, height: 2, background: s.c }} />
            <div className="ln-eyebrow">{s.l}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 8 }}>
              <span className="ln-num" style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-0.03em" }}>
                {s.v}
              </span>
              <span className="ln-num" style={{ fontSize: 12, color: "var(--ln-ink-3)" }}>
                {s.u}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HeroGlobe({
  outbreaks,
  regionRisk,
}: {
  outbreaks: ReturnType<typeof useLiveOutbreaks>["outbreaks"];
  regionRisk: Record<string, number>;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const reveal = () => {
      if (v.videoWidth > 0) setHasVideo(true);
    };
    v.addEventListener("loadeddata", reveal);
    v.addEventListener("playing", reveal);
    v.addEventListener("canplay", reveal);
    v.play().catch(() => {});
    return () => {
      v.removeEventListener("loadeddata", reveal);
      v.removeEventListener("playing", reveal);
      v.removeEventListener("canplay", reveal);
    };
  }, []);

  const pins = outbreaks.filter((o) => o.severity >= 4).slice(0, 3);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
      <div className="ln-dotgrid" style={{ position: "absolute", inset: 0, background: "var(--ln-map-bg)", overflow: "hidden" }}>
        <video
          ref={videoRef}
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
        <div style={{ position: "absolute", inset: 0 }}>
          <WorldMap
            width={1440}
            height={720}
            outbreaks={outbreaks.map((o) => ({ id: o.id, lng: o.lng, lat: o.lat, severity: o.severity }))}
            regionRisk={regionRisk}
            showChoropleth
            pulse
            dotSpacing={10}
          />
        </div>

        <div style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none" }}>
          {pins.map((o, idx) => (
            <FloatingPin
              key={o.id}
              x={["78%", "68%", "82%"][idx] || "70%"}
              y={["36%", "62%", "78%"][idx] || "50%"}
              outbreak={o}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FloatingPin({ x, y, outbreak }: { x: string; y: string; outbreak: any }) {
  if (!outbreak) return null;
  const c = severityColor(outbreak.severity);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: "translate(-100%, -50%)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 32, height: 1, background: c, opacity: 0.6, order: 2 }} />
        <div style={{ position: "relative", width: 10, height: 10, order: 3 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: c, boxShadow: `0 0 12px ${c}` }} />
          <div
            style={{
              position: "absolute",
              inset: -4,
              borderRadius: "50%",
              background: c,
              opacity: 0.4,
              animation: "ln-pulse 2.4s infinite ease-out",
            }}
          />
        </div>
        <div
          style={{
            background: "var(--ln-elev-bg)",
            border: "1px solid var(--ln-line-2)",
            padding: "8px 10px",
            minWidth: 180,
            order: 1,
          }}
        >
          <div
            style={{
              fontFamily: "var(--ln-font-mono)",
              fontSize: 9,
              color: "var(--ln-ink-3)",
              letterSpacing: "0.12em",
            }}
          >
            {outbreak.country.toUpperCase()}
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>{outbreak.disease}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <span className="ln-num" style={{ fontSize: 11, color: "var(--ln-ink-2)" }}>
              {outbreak.cases.toLocaleString()}
            </span>
            <span style={{ fontSize: 10, color: "var(--ln-crit)", fontFamily: "var(--ln-font-mono)" }}>
              {outbreak.delta}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LandingMarquee() {
  const { alerts } = useLiveAlerts(20);
  const items = useMemo(() => alerts.concat(alerts), [alerts]);
  if (!alerts.length) return null;
  return (
    <div
      style={{
        borderBottom: "1px solid var(--ln-line)",
        background: "var(--ln-surface)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", padding: "10px 0" }}>
        <span
          style={{
            flex: "0 0 auto",
            padding: "0 20px",
            fontFamily: "var(--ln-font-mono)",
            fontSize: 10,
            letterSpacing: "0.14em",
            color: "var(--ln-crit)",
            borderRight: "1px solid var(--ln-line-2)",
          }}
        >
          ● LIVE STREAM
        </span>
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            position: "relative",
            maskImage: "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 48,
              animation: "ln-scroll 60s linear infinite",
              whiteSpace: "nowrap",
            }}
          >
            {items.map((a, i) => (
              <span key={`${a.id}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background:
                      a.level === "critical"
                        ? "var(--ln-crit)"
                        : a.level === "high"
                        ? "#ff7a3b"
                        : "var(--ln-warn)",
                  }}
                />
                <span style={{ fontFamily: "var(--ln-font-mono)", fontSize: 10, color: "var(--ln-ink-3)" }}>
                  {a.country.toUpperCase()}
                </span>
                <span style={{ color: "var(--ln-ink-2)" }}>{a.text}</span>
                <span style={{ color: "var(--ln-ink-4)", fontFamily: "var(--ln-font-mono)", fontSize: 10 }}>
                  · {a.src}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LandingStats() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const { stats } = useDashboardStats("7d");
  const fmt = (n: number | undefined) => (n === undefined ? "—" : n.toLocaleString());
  const tActive = useT("Active outbreaks");
  const tCountries = useT("Countries affected");
  const tCases = useT("Cases this week");
  const tDeaths = useT("Deaths reported");
  const rows = [
    {
      l: tActive,
      v: fmt(stats?.activeOutbreaks),
      d: stats?.activeOutbreaksChange ?? "+0%",
      spark: [180, 184, 191, 205, 212, 209, 221, 234, stats?.activeOutbreaks ?? 0],
      c: "var(--ln-crit)",
    },
    {
      l: tCountries,
      v: fmt(stats?.countriesAffected),
      d: stats?.countriesAffectedChange ?? "+0",
      spark: [58, 59, 61, 63, 64, 64, 66, 67, stats?.countriesAffected ?? 0],
      c: "var(--ln-warn)",
    },
    {
      l: tCases,
      v: fmt(stats?.totalCases),
      d: stats?.totalCasesChange ?? "+0%",
      spark: [62, 65, 70, 73, 78, 82, 86, 90, Math.round((stats?.totalCases ?? 0) / 1000) || 0],
      c: "var(--ln-info)",
    },
    {
      l: tDeaths,
      v: fmt(stats?.totalDeaths),
      d: stats?.totalDeathsChange ?? "+0%",
      spark: [12, 14, 13, 15, 18, 20, 22, 24, Math.round((stats?.totalDeaths ?? 0) / 100) || 0],
      c: "var(--ln-crit)",
    },
  ];
  return (
    <section style={{ padding: isMobile ? "28px 16px" : "40px 32px", borderBottom: "1px solid var(--ln-line)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 18,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <span className="ln-eyebrow">{useT("The world, right now")}</span>
          <h2
            className="ln-display"
            style={{ fontSize: isMobile ? 24 : 32, margin: "4px 0 0", letterSpacing: "-0.02em" }}
          >
            {useT("Today's vitals")}
          </h2>
        </div>
        <span style={{ fontFamily: "var(--ln-font-mono)", fontSize: 11, color: "var(--ln-ink-3)" }}>
          {useT("last updated 11s ago")}
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
          gap: 0,
          border: "1px solid var(--ln-line)",
        }}
      >
        {rows.map((s, i, arr) => (
          <div
            key={s.l}
            style={{
              padding: isMobile ? "14px 14px" : "20px 22px",
              borderRight:
                isMobile
                  ? i % 2 === 0
                    ? "1px solid var(--ln-line)"
                    : "none"
                  : i !== arr.length - 1
                  ? "1px solid var(--ln-line)"
                  : "none",
              borderTop: isMobile && i >= 2 ? "1px solid var(--ln-line)" : "none",
              position: "relative",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, width: 32, height: 2, background: s.c }} />
            <div className="ln-eyebrow">{s.l}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 10 }}>
              <span
                className="ln-num"
                style={{
                  fontSize: isMobile ? 28 : 44,
                  fontWeight: 500,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                }}
              >
                {s.v}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 14 }}>
              <span className="ln-num" style={{ fontSize: 12, color: s.c }}>
                ▲ {s.d} <span style={{ color: "var(--ln-ink-4)" }}>WoW</span>
              </span>
              <Sparkline data={s.spark} color={s.c} width={88} height={28} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function LandingModules() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTabletDown = bp !== "desktop";
  const { outbreaks } = useLiveOutbreaks("7d", 40);
  const { regionRisk } = useLiveRegionRisk("7d");
  const { series } = useLiveSeries("30d");

  return (
    <section
      style={{
        padding: isMobile ? "36px 16px 36px" : "64px 32px 56px",
        borderBottom: "1px solid var(--ln-line)",
      }}
    >
      <div style={{ maxWidth: 720, marginBottom: isMobile ? 24 : 40 }}>
        <span className="ln-eyebrow">The product</span>
        <h2
          className="ln-display"
          style={{
            fontSize: isMobile ? 30 : isTabletDown ? 42 : 56,
            lineHeight: 1.05,
            margin: "8px 0 16px",
            letterSpacing: "-0.025em",
          }}
        >
          Three surfaces<span style={{ color: "var(--ln-ink-4)" }}>,</span>{" "}
          <span style={{ fontStyle: "italic", color: "var(--ln-ink-3)" }}>one truth.</span>
        </h2>
        <p style={{ fontSize: isMobile ? 14 : 16, color: "var(--ln-ink-2)", lineHeight: 1.5 }}>
          The map shows you <b style={{ color: "var(--ln-ink)" }}>where</b>. Analytics tells you{" "}
          <b style={{ color: "var(--ln-ink)" }}>how big</b>. The forecast model tells you{" "}
          <b style={{ color: "var(--ln-ink)" }}>what next</b>. All from the same canonical feed.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : isTabletDown ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
          gap: 16,
        }}
      >
        <ModuleCard
          num="01"
          eyebrow="Surveillance"
          title="The map of right now"
          body="Every reported event in 193 countries, fused from authority feeds, dedup'd and signal-scored — under one cursor."
          to="/map"
          preview={
            <div style={{ position: "absolute", inset: 0 }} className="ln-dotgrid">
              <WorldMap
                width={420}
                height={200}
                outbreaks={outbreaks.map((o) => ({ id: o.id, lng: o.lng, lat: o.lat, severity: o.severity }))}
                regionRisk={regionRisk}
                showChoropleth
                pulse
                dotSpacing={10}
              />
            </div>
          }
          stats={[
            { l: "Events streamed", v: outbreaks.length.toString() },
            { l: "Sources", v: "1,204" },
            { l: "Latency", v: "11min" },
          ]}
        />
        <ModuleCard
          num="02"
          eyebrow="Analytics"
          title="The math behind the headlines"
          body="Incidence curves, doubling times, attack rates, regional roll-ups. Built for epidemiologists; legible for ministers."
          to="/dashboard"
          preview={<MiniChart series={series.slice(0, 3)} />}
          stats={[
            { l: "Pathogens", v: series.length.toString() || "—" },
            { l: "Metrics", v: "62" },
            { l: "Update", v: "4×/hr" },
          ]}
        />
        <ModuleCard
          num="03"
          eyebrow="Foresight"
          title="The forecast you can defend"
          body="A transparent ensemble — climate, mobility, syndromic search, prior incidence. Every prediction shows confidence and drivers."
          to="/dashboard"
          preview={<MiniForecast />}
          stats={[
            { l: "Horizon", v: "90d" },
            { l: "F1", v: "0.83" },
            { l: "Region", v: "sub-natl" },
          ]}
        />
      </div>
    </section>
  );
}

function ModuleCard({
  num,
  eyebrow,
  title,
  body,
  to,
  preview,
  stats,
}: {
  num: string;
  eyebrow: string;
  title: string;
  body: string;
  to: string;
  preview: React.ReactNode;
  stats: { l: string; v: string }[];
}) {
  return (
    <Link
      to={to}
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--ln-surface)",
        border: "1px solid var(--ln-line)",
        padding: 0,
        color: "inherit",
        textDecoration: "none",
        transition: "border-color .15s, transform .15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--ln-line-3)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--ln-line)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          height: 200,
          background: "var(--ln-surface-2)",
          borderBottom: "1px solid var(--ln-line)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {preview}
      </div>
      <div style={{ padding: "20px 22px 24px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <span className="ln-eyebrow">{eyebrow}</span>
          <span className="ln-num" style={{ fontSize: 11, color: "var(--ln-ink-4)" }}>
            {num} / 03
          </span>
        </div>
        <h3 style={{ fontSize: 20, lineHeight: 1.15, margin: "4px 0 8px", fontWeight: 500 }}>{title}</h3>
        <p style={{ fontSize: 13.5, color: "var(--ln-ink-2)", lineHeight: 1.5, flex: 1 }}>{body}</p>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid var(--ln-line)",
            marginTop: 18,
            paddingTop: 12,
          }}
        >
          {stats.map((s) => (
            <div key={s.l}>
              <div className="ln-eyebrow" style={{ fontSize: 9 }}>
                {s.l}
              </div>
              <div className="ln-num" style={{ fontSize: 16, marginTop: 2 }}>
                {s.v}
              </div>
            </div>
          ))}
          <span style={{ color: "var(--ln-brand)", alignSelf: "flex-end" }}>
            <Icon.ArrowR />
          </span>
        </div>
      </div>
    </Link>
  );
}

function MiniChart({ series }: { series: { id: string; color: string; data: number[] }[] }) {
  const W = 420;
  const H = 200;
  const padB = 16;
  const max = Math.max(1, ...series.flatMap((s) => s.data));
  return (
    <div style={{ position: "absolute", inset: 0, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span className="ln-eyebrow">Incidence · 28d</span>
        <span style={{ fontFamily: "var(--ln-font-mono)", fontSize: 9, color: "var(--ln-ink-4)" }}>
          {series.length} pathogens
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H - 30}`} width="100%" style={{ display: "block" }}>
        {[0, 0.5, 1].map((p) => (
          <line
            key={p}
            x1="0"
            y1={(H - 30 - padB) * (1 - p)}
            x2={W}
            y2={(H - 30 - padB) * (1 - p)}
            stroke="var(--ln-line)"
            strokeDasharray="2 4"
          />
        ))}
        {series.map((s) => {
          if (!s.data.length) return null;
          const path = s.data
            .map(
              (v, i) =>
                `${i ? "L" : "M"}${(i / (s.data.length - 1)) * W} ${
                  H - 30 - padB - (v / max) * (H - 30 - padB - 8)
                }`
            )
            .join(" ");
          return <path key={s.id} d={path} fill="none" stroke={s.color} strokeWidth="1.5" strokeLinecap="round" />;
        })}
      </svg>
    </div>
  );
}

function MiniForecast() {
  return (
    <div style={{ position: "absolute", inset: 0, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span className="ln-eyebrow">
          <Icon.Sparkles style={{ verticalAlign: -2, color: ACCENT }} /> AI Forecast
        </span>
        <span style={{ fontFamily: "var(--ln-font-mono)", fontSize: 9, color: "var(--ln-ink-4)" }}>
          v3.2 · 14d
        </span>
      </div>
      {PREDICTIONS.slice(0, 3).map((p) => {
        const c =
          p.risk >= 0.75 ? "var(--ln-crit)" : p.risk >= 0.55 ? "var(--ln-warn)" : "var(--ln-info)";
        return (
          <div key={p.id} style={{ marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
              <span style={{ color: "var(--ln-ink-2)" }}>
                {p.disease} · <span style={{ color: "var(--ln-ink-3)" }}>{p.region}</span>
              </span>
              <span className="ln-num" style={{ color: c }}>
                {(p.risk * 10).toFixed(1)}
              </span>
            </div>
            <div
              style={{ position: "relative", height: 4, background: "rgba(255,255,255,0.06)", marginTop: 4 }}
            >
              <div style={{ position: "absolute", inset: 0, width: `${p.risk * 100}%`, background: c }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LandingPartners() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTabletDown = bp !== "desktop";
  const cols = isMobile ? "repeat(2, 1fr)" : isTabletDown ? "repeat(3, 1fr)" : "repeat(5, 1fr)";
  return (
    <section
      style={{
        padding: isMobile ? "36px 16px" : "72px 32px",
        borderBottom: "1px solid var(--ln-line)",
        background: "var(--ln-surface)",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: isMobile ? 24 : 40 }}>
        <span className="ln-eyebrow">In partnership with</span>
        <h2
          className="ln-display"
          style={{
            fontSize: isMobile ? 26 : isTabletDown ? 34 : 44,
            margin: "10px 0 12px",
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
          }}
        >
          Built with the institutions{" "}
          <span style={{ color: "var(--ln-ink-3)", fontStyle: "italic" }}>that set the standard.</span>
        </h2>
        <p
          style={{
            fontSize: isMobile ? 13 : 15,
            color: "var(--ln-ink-2)",
            lineHeight: 1.55,
            maxWidth: 640,
            margin: "0 auto",
          }}
        >
          OutbreakNow is operated by EldoNova+ Technologies in partnership with the Global Health and Quality
          Alliance — a coalition of medical boards, foundations and research institutions.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: cols, gap: isMobile ? 10 : 16 }}>
        {PARTNERS.map((p) => (
          <a
            key={p.name}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 18,
              textDecoration: "none",
              color: "inherit",
              padding: 0,
              background: "transparent",
              border: "1px solid var(--ln-line-2)",
              transition: "border-color .15s, transform .15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--ln-line-3)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--ln-line-2)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div
              style={{
                width: "100%",
                height: isMobile ? 84 : 140,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: isMobile ? "12px 14px" : "18px 22px",
                background: "#ffffff",
                borderBottom: "1px solid var(--ln-line-2)",
              }}
            >
              <img src={p.logo} alt={p.full} style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
            </div>
            <div style={{ padding: isMobile ? "0 12px 14px" : "0 18px 22px" }}>
              <div
                style={{
                  fontFamily: "var(--ln-font-mono)",
                  fontSize: 12,
                  letterSpacing: "0.14em",
                  color: "var(--ln-ink)",
                  fontWeight: 500,
                }}
              >
                {p.name}
              </div>
              <div style={{ fontSize: 12, color: "var(--ln-ink-3)", lineHeight: 1.4, marginTop: 6 }}>{p.full}</div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function LandingIntel() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTabletDown = bp !== "desktop";
  const { alerts } = useLiveAlerts(5);
  const { ads } = useLiveSponsored({ location: "homepage", limit: 4 });
  return (
    <section
      style={{
        padding: isMobile ? "36px 16px" : "64px 32px",
        borderBottom: "1px solid var(--ln-line)",
        display: "grid",
        gridTemplateColumns: isTabletDown ? "1fr" : "1.4fr 1fr",
        gap: isTabletDown ? 28 : 40,
      }}
    >
      <div>
        <span className="ln-eyebrow">Latest signals</span>
        <h2
          className="ln-display"
          style={{
            fontSize: isMobile ? 26 : 40,
            margin: "8px 0 20px",
            letterSpacing: "-0.02em",
          }}
        >
          What broke <span style={{ color: "var(--ln-ink-3)", fontStyle: "italic" }}>this morning.</span>
        </h2>
        <div style={{ border: "1px solid var(--ln-line)" }}>
          {alerts.slice(0, 5).map((a, i, arr) => (
            <Link
              key={a.id}
              to="/map"
              style={{
                display: "grid",
                gridTemplateColumns: "90px 1fr auto",
                alignItems: "center",
                gap: 16,
                padding: "16px 20px",
                borderBottom: i !== arr.length - 1 ? "1px solid var(--ln-line)" : "none",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--ln-font-mono)",
                  fontSize: 10,
                  color: "var(--ln-ink-4)",
                  letterSpacing: "0.1em",
                }}
              >
                {timeAgo(a.ts).toUpperCase()} AGO
              </span>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--ln-font-mono)",
                    fontSize: 10,
                    color: "var(--ln-ink-3)",
                    letterSpacing: "0.08em",
                  }}
                >
                  {a.region} · {a.country.toUpperCase()}
                </div>
                <div style={{ fontSize: 14, color: "var(--ln-ink)", marginTop: 3 }}>{a.text}</div>
              </div>
              <span
                className={`ln-chip ${
                  a.level === "critical" ? "is-crit" : a.level === "high" ? "is-warn" : "is-info"
                }`}
              >
                {a.level.toUpperCase()}
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
            fontSize: 13,
            color: ACCENT,
            textDecoration: "none",
            marginTop: 14,
          }}
        >
          See full feed <Icon.ArrowR />
        </Link>
      </div>

      <aside>
        <span className="ln-eyebrow">Featured partner</span>
        <h2 className="ln-display" style={{ fontSize: 28, margin: "8px 0 14px", letterSpacing: "-0.02em" }}>
          Powering the people who answer.
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--ln-ink-2)", lineHeight: 1.5, marginBottom: 16 }}>
          Partner organisations get co-branded dashboards, alert hooks, and embedded data feeds.
        </p>
        {ads.length === 0 ? (
          <div
            style={{
              padding: 16,
              fontSize: 13,
              color: "var(--ln-ink-3)",
              border: "1px dashed var(--ln-line-2)",
            }}
          >
            No featured partner content right now. Visit{" "}
            <Link to="/partnership" style={{ color: "var(--ln-brand)" }}>
              the partnership page
            </Link>{" "}
            to learn more.
          </div>
        ) : (
          <>
            {ads.slice(0, 2).map((ad, i) => (
              <div key={ad.id} style={{ marginTop: i === 0 ? 0 : 12 }}>
                <AdCard ad={ad} variant="inline" />
              </div>
            ))}
          </>
        )}
        <div
          style={{
            marginTop: 14,
            padding: 14,
            border: "1px solid var(--ln-line)",
            background: "var(--ln-bg)",
          }}
        >
          <div className="ln-eyebrow" style={{ marginBottom: 6 }}>
            Reach the audience that watches outbreaks
          </div>
          <p style={{ fontSize: 12.5, color: "var(--ln-ink-3)", lineHeight: 1.5, margin: "0 0 10px" }}>
            Promote your study, vaccine programme, or relief campaign to ministers, researchers, and clinicians.
          </p>
          <Link
            to="/advertise"
            className="ln-btn"
            style={{ fontSize: 12, padding: "8px 12px" }}
          >
            Advertise with us <Icon.ArrowR />
          </Link>
        </div>
      </aside>
    </section>
  );
}

function LandingAccess() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTabletDown = bp !== "desktop";
  const tiers = [
    {
      tag: "OPEN",
      name: "Public",
      price: "Free, forever",
      desc: "The interactive map, news feed and weekly outbreak digest. Built so anyone curious can see the same picture epidemiologists do.",
      feats: ["Live outbreak map", "7-day analytics", "Weekly digest email", "Public API (rate-limited)"],
      cta: "Browse the map",
      to: "/map",
      featured: false,
    },
    {
      tag: "STANDARD",
      name: "Researcher",
      price: "$240 / seat / mo",
      desc: "Full-resolution dataset access, line-listing exports, forecast model outputs, and direct alert webhooks for academic and NGO use.",
      feats: ["Sub-national resolution", "Line-listing CSV/Parquet", "Forecast API (v3)", "Slack & webhook alerts", "Saved-view sharing"],
      cta: "Start trial",
      to: "/dashboard",
      featured: true,
    },
    {
      tag: "AGENCY",
      name: "Public Health Authority",
      price: "Custom",
      desc: "For ministries, regional bodies, and hospital networks. Private data ingestion, on-prem option, SLA, dedicated epi liaison.",
      feats: [
        "Private feed ingestion",
        "SSO, audit logs, RBAC",
        "On-prem / sovereign cloud",
        "SLA + 24/7 support",
        "Dedicated epidemiologist",
      ],
      cta: "Talk to us",
      to: "/partnership",
      featured: false,
    },
  ];
  return (
    <section
      id="access"
      style={{
        padding: isMobile ? "36px 16px" : "64px 32px",
        borderBottom: "1px solid var(--ln-line)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: isMobile ? 20 : 32,
          gap: 20,
        }}
      >
        <div>
          <span className="ln-eyebrow">Access</span>
          <h2
            className="ln-display"
            style={{
              fontSize: isMobile ? 28 : isTabletDown ? 36 : 48,
              margin: "6px 0 0",
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
            }}
          >
            The world's view{" "}
            <span style={{ color: "var(--ln-ink-3)", fontStyle: "italic" }}>shouldn't be locked up.</span>
          </h2>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : isTabletDown ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
          gap: 16,
        }}
      >
        {tiers.map((t) => (
          <div
            key={t.name}
            style={{
              background: t.featured ? "var(--ln-surface)" : "transparent",
              border: t.featured ? `1px solid ${ACCENT}` : "1px solid var(--ln-line)",
              padding: "24px 22px 22px",
              position: "relative",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {t.featured && (
              <span
                style={{
                  position: "absolute",
                  top: -10,
                  left: 22,
                  padding: "2px 8px",
                  background: ACCENT,
                  color: "var(--ln-brand-ink)",
                  fontFamily: "var(--ln-font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                }}
              >
                RECOMMENDED
              </span>
            )}
            <span className="ln-eyebrow">{t.tag}</span>
            <h3 className="ln-display" style={{ fontSize: 30, margin: "4px 0 6px", letterSpacing: "-0.02em" }}>
              {t.name}
            </h3>
            <div
              className="ln-num"
              style={{ fontSize: 15, color: t.featured ? ACCENT : "var(--ln-ink-2)", marginBottom: 14 }}
            >
              {t.price}
            </div>
            <p style={{ fontSize: 13, color: "var(--ln-ink-2)", lineHeight: 1.5, marginBottom: 18 }}>{t.desc}</p>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "0 0 22px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {t.feats.map((f) => (
                <li
                  key={f}
                  style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--ln-ink-2)" }}
                >
                  <span
                    style={{
                      marginTop: 6,
                      width: 4,
                      height: 4,
                      borderRadius: 1,
                      background: t.featured ? ACCENT : "var(--ln-ink-4)",
                    }}
                  />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to={t.to}
              className={`ln-btn ${t.featured ? "is-primary" : ""}`}
              style={{ width: "100%", justifyContent: "center", padding: "10px 0", fontSize: 13 }}
            >
              {t.cta} <Icon.ArrowR />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function LandingDonate() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const [open, setOpen] = useState(false);
  const tSupport = useT("Support the work");
  const tHead1 = useT("Open surveillance is");
  const tHead2 = useT("cheaper than the next outbreak.");
  const tBody = useT(
    "OutbreakNow is operated by EldoNova+ Technologies. Donations cover the ingestion pipeline, translations, hosting, and keep the API free for ministries and researchers."
  );
  const tDonate = useT("Donate");
  return (
    <section
      style={{
        padding: isMobile ? "32px 16px" : "56px 32px",
        borderBottom: "1px solid var(--ln-line)",
        background: "var(--ln-surface)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: 18,
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <div style={{ maxWidth: 620 }}>
          <span className="ln-eyebrow">{tSupport}</span>
          <h2
            className="ln-display"
            style={{
              fontSize: isMobile ? 24 : 36,
              margin: "8px 0 6px",
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
            }}
          >
            {tHead1}{" "}
            <span style={{ fontStyle: "italic", color: "var(--ln-ink-3)" }}>{tHead2}</span>
          </h2>
          <p style={{ fontSize: isMobile ? 13 : 14, color: "var(--ln-ink-2)", lineHeight: 1.55, margin: 0 }}>
            {tBody}
          </p>
        </div>
        <button
          className="ln-btn is-primary"
          onClick={() => setOpen(true)}
          style={{ padding: "12px 18px", fontSize: 14, flex: "0 0 auto" }}
        >
          {tDonate} <Icon.ArrowR />
        </button>
      </div>
      <DonateDialog open={open} onClose={() => setOpen(false)} />
    </section>
  );
}

function LandingFooter() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTabletDown = bp !== "desktop";
  const [newsletterOpen, setNewsletterOpen] = useState(false);

  type Item = { l: string; to?: string; href?: string };
  const cols: { h: string; items: Item[] }[] = [
    {
      h: useT("Product"),
      items: [
        { l: useT("Surveillance map"), to: "/map" },
        { l: useT("Analytics"), to: "/dashboard" },
        { l: useT("Forecast"), to: "/dashboard" },
        { l: useT("News stream"), to: "/news" },
        { l: useT("Global health index"), to: "/global-health-index" },
        { l: useT("Weekly report"), to: "/dashboard/weekly-report" },
      ],
    },
    {
      h: useT("Coverage"),
      items: [
        { l: useT("Pathogens"), to: "/dashboard" },
        { l: useT("Sources"), to: "/news" },
        { l: useT("Methodology"), to: "/partnership" },
        { l: useT("Confidence model"), to: "/dashboard" },
        { l: useT("Open data"), to: "/dashboard" },
      ],
    },
    {
      h: useT("Company"),
      items: [
        { l: useT("About"), to: "/partnership" },
        { l: useT("Partners"), to: "/partnership" },
        { l: useT("Advertise"), to: "/advertise" },
        { l: useT("Donate"), onClick: () => setOpen(true) },
        { l: useT("Contact"), href: "mailto:contact@theghqa.org" },
      ],
    },
    {
      h: useT("Legal"),
      items: [
        { l: useT("Privacy"), to: "/privacy" },
        { l: useT("Partnership"), to: "/partnership" },
        { l: useT("Security"), href: "mailto:security@theghqa.org" },
      ],
    },
  ];

  const socials: { l: string; href: string }[] = [
    { l: "GitHub", href: "https://github.com/" },
    { l: "Bluesky", href: "https://bsky.app/" },
    { l: "Email", href: "mailto:contact@theghqa.org" },
  ];

  return (
    <footer style={{ padding: isMobile ? "32px 16px 24px" : "56px 32px 32px", background: "var(--ln-surface)" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr"
            : isTabletDown
            ? "1fr 1fr"
            : "1.4fr repeat(4, 1fr)",
          gap: isMobile ? 22 : 36,
          marginBottom: isMobile ? 28 : 40,
        }}
      >
        <div>
          <Logo color={ACCENT} />
          <p
            style={{
              fontSize: 13,
              color: "var(--ln-ink-3)",
              lineHeight: 1.55,
              marginTop: 14,
              maxWidth: 320,
            }}
          >
            {useT(
              "OutbreakNow is an open surveillance infrastructure operated by EldoNova+ Technologies, based in New York."
            )}
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            {socials.map((s) => (
              <a
                key={s.l}
                href={s.href}
                target={s.href.startsWith("mailto:") ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="ln-btn"
              >
                {s.l}
              </a>
            ))}
            <button className="ln-btn" onClick={() => setNewsletterOpen(true)}>
              {useT("Newsletter")}
            </button>
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.h}>
            <span className="ln-eyebrow">{c.h}</span>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "12px 0 0",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {c.items.map((it) => (
                <li key={it.l}>
                  {it.to ? (
                    <Link to={it.to} style={{ fontSize: 13, color: "var(--ln-ink-2)", textDecoration: "none" }}>
                      {it.l}
                    </Link>
                  ) : it.onClick ? (
                    <button
                      onClick={it.onClick}
                      style={{
                        fontSize: 13,
                        color: "var(--ln-ink-2)",
                        textDecoration: "none",
                        background: "none",
                        border: "none",
                        padding: 0,
                        margin: 0,
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "inherit",
                      }}
                    >
                      {it.l}
                    </button>
                  ) : (
                    <a
                      href={it.href}
                      style={{ fontSize: 13, color: "var(--ln-ink-2)", textDecoration: "none" }}
                    >
                      {it.l}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div
        style={{
          borderTop: "1px solid var(--ln-line)",
          paddingTop: 20,
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          fontFamily: "var(--ln-font-mono)",
          fontSize: 11,
          color: "var(--ln-ink-4)",
        }}
      >
        <span>© {new Date().getFullYear()} EldoNova+ Technologies - New York, NY</span>
        <span>Version 2.0</span>
        <span>
          Status: <span style={{ color: "var(--ln-brand)" }}>● ALL SYSTEMS OPERATIONAL</span>
        </span>
      </div>
      <NewsletterDialog open={newsletterOpen} onClose={() => setNewsletterOpen(false)} />
    </footer>
  );
}
