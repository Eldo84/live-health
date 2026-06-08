import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Logo } from "../components/Logo";
import { LanguageSelector } from "../components/LanguageSelector";
import { ThemeToggle } from "../components/ThemeToggle";
import { StatusPill } from "../components/StatusPill";
import { useBreakpoint } from "../lib/useBreakpoint";
import { T } from "../components/T";
import drLufulwabo from "@/assets/dr-lufulwabo.jpeg";

const ACCENT = "#4ee0c4";

// Founder bio — copy mirrors the existing landing.about.founder* locale strings.
const FOUNDERS = [
  {
    name: "Dr. Aimé Lufulwabo, MD, MPH",
    tagline: "Medical doctor • Epidemiologist • Public Health Informatics Specialist",
    photo: drLufulwabo,
    linkedin: "https://www.linkedin.com/in/aim%C3%A9-m-lufulwabo-md-mph-cph-57020023",
    bio: [
      "OutbreakNow was founded by Dr. Aimé Lufulwabo, a physician informatician and public health specialist whose career spans clinical medicine, epidemiology, health technology, and innovation.",
      "He completed his medical education at the University of Lubumbashi in the Democratic Republic of Congo, where early training in microbiology sparked his passion for infectious diseases and disease surveillance.",
      "He went on to earn a Master of Public Health from Yale University, specializing in epidemiology and public health informatics, and later pursued postgraduate medical education at Harvard University in patient safety, quality improvement, clinical informatics, and healthcare leadership.",
      "He is the founder and Chairman of the Global Health and Quality Alliance (GHQA) and the American Board of Digital Medicine. OutbreakNow is the culmination of his multidisciplinary expertise — uniting microbiology, epidemiology, informatics, and quality improvement to transform how the world detects and responds to outbreaks.",
    ],
  },
];

// Dedicated About page — standalone landing-adjacent surface that rides the same
// chrome as Partnership/Privacy (its own header + SimpleFooter) rather than the
// app shell. Copy mirrors the brand/mission language used on the landing page.
export default function AboutScreen() {
  const location = useLocation();
  const canonical = `${window.location.origin}${location.pathname}`;
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTabletDown = bp !== "desktop";

  const stats = [
    { l: "Avg. signal-to-alert lag", v: "11", u: "min" },
    { l: "Pathogens tracked", v: "184", u: "" },
    { l: "Countries covered", v: "193", u: "" },
    { l: "Health sources ingested", v: "1,200", u: "" },
  ];

  const values = [
    {
      icon: <Icon.Pulse />,
      title: "Speed saves lives",
      body: "Every hour a signal sits unseen is an hour a response is delayed. We compress signal-to-alert lag to minutes, not days.",
    },
    {
      icon: <Icon.Globe />,
      title: "Open by default",
      body: "Outbreak intelligence shouldn't sit behind a paywall. Our core surveillance picture is public so anyone can act on it.",
    },
    {
      icon: <Icon.Chart />,
      title: "Decision-grade, not noise",
      body: "We turn a chaos of feeds into a single, confidence-scored picture — built to be trusted by the people making the call.",
    },
    {
      icon: <Icon.Layers />,
      title: "Built with the institutions",
      body: "We work alongside medical boards, universities, and public-health agencies rather than around them.",
    },
  ];

  return (
    <div className="ln-app" style={{ minHeight: "100vh", background: "var(--ln-bg)", color: "var(--ln-ink)" }}>
      <Helmet>
        <title>About | OutbreakNow</title>
        <meta
          name="description"
          content="OutbreakNow is real-time global outbreak intelligence, operated by EldoNova+ Technologies in partnership with the Global Health and Quality Alliance."
        />
        <link rel="canonical" href={canonical} />
      </Helmet>

      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "12px 16px" : "18px 32px",
          borderBottom: "1px solid var(--ln-line)",
          background: "var(--ln-topbar)",
          gap: 12,
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 14 : 36, minWidth: 0 }}>
          <Link to="/" style={{ display: "inline-flex" }}>
            <Logo color={ACCENT} />
          </Link>
          {!isMobile && (
            <nav style={{ display: "flex", gap: 24 }}>
              {[
                { l: "Surveillance", to: "/map" },
                { l: "Analytics", to: "/dashboard" },
                { l: "News", to: "/news" },
                { l: "About", to: "/about" },
                { l: "Become a partner", to: "/partnership" },
              ].map((it) => (
                <Link
                  key={it.l}
                  to={it.to}
                  style={{ fontSize: 13, color: "var(--ln-ink-2)", textDecoration: "none" }}
                >
                  <T>{it.l}</T>
                </Link>
              ))}
            </nav>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!isMobile && <StatusPill />}
          {!isMobile && <div style={{ width: 1, height: 18, background: "var(--ln-line)" }} />}
          <LanguageSelector />
          <ThemeToggle />
          <Link to="/map" className="ln-btn is-primary">
            <T>Open map</T> <Icon.ArrowR />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section
        style={{
          padding: isMobile ? "48px 18px 28px" : "72px 32px 36px",
          borderBottom: "1px solid var(--ln-line)",
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--ln-brand) 8%, transparent) 0%, transparent 100%)",
        }}
      >
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <span className="ln-eyebrow"><T>About OutbreakNow</T></span>
          <h1
            className="ln-display"
            style={{
              fontSize: isMobile ? 36 : isTabletDown ? 56 : 72,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              margin: "10px 0 18px",
            }}
          >
            <T>Outbreaks, visible before they become emergencies.</T>
          </h1>
          <p
            style={{
              fontSize: isMobile ? 16 : 20,
              color: "var(--ln-ink-2)",
              lineHeight: 1.45,
              margin: "0 0 12px",
              maxWidth: 760,
            }}
          >
            <T>
              OutbreakNow ingests 1,200 health authorities, hospital networks, and open-source feeds in real time —
              turning a chaos of signals into a single, decision-grade outbreak picture.
            </T>
          </p>
          <p
            style={{
              fontSize: isMobile ? 13.5 : 15,
              color: "var(--ln-ink-3)",
              lineHeight: 1.6,
              margin: 0,
              maxWidth: 760,
            }}
          >
            <T>
              We exist to close the gap between the first signal of an outbreak and the moment decision-makers can act
              on it — for public-health agencies, hospitals, researchers, and the public alike.
            </T>
          </p>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: isMobile ? "32px 18px" : "48px 32px", borderBottom: "1px solid var(--ln-line)" }}>
        <div
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          {stats.map((s) => (
            <div
              key={s.l}
              style={{
                border: "1px solid var(--ln-line)",
                background: "var(--ln-surface)",
                padding: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span className="ln-display" style={{ fontSize: isMobile ? 32 : 40, color: "var(--ln-brand)" }}>
                  {s.v}
                </span>
                {s.u && <span style={{ fontSize: 14, color: "var(--ln-ink-3)" }}>{s.u}</span>}
              </div>
              <span style={{ fontSize: 12, color: "var(--ln-ink-3)", lineHeight: 1.35 }}><T>{s.l}</T></span>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section
        style={{
          padding: isMobile ? "36px 18px" : "56px 32px",
          borderBottom: "1px solid var(--ln-line)",
          background: "var(--ln-surface)",
        }}
      >
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ marginBottom: isMobile ? 22 : 32 }}>
            <span className="ln-eyebrow"><T>What we believe</T></span>
            <h2
              className="ln-display"
              style={{ fontSize: isMobile ? 26 : 36, margin: "6px 0 0", letterSpacing: "-0.02em" }}
            >
              <T>The principles behind the platform</T>
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : isTabletDown ? "repeat(2, 1fr)" : "repeat(2, 1fr)",
              gap: 14,
            }}
          >
            {values.map((v) => (
              <div
                key={v.title}
                style={{
                  border: "1px solid var(--ln-line)",
                  background: "var(--ln-bg)",
                  padding: 20,
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                }}
              >
                <span style={{ color: "var(--ln-brand)", marginTop: 2 }}>{v.icon}</span>
                <div>
                  <h3 style={{ fontSize: 16, margin: "0 0 8px", fontWeight: 500 }}><T>{v.title}</T></h3>
                  <p style={{ fontSize: 13, color: "var(--ln-ink-3)", lineHeight: 1.55, margin: 0 }}><T>{v.body}</T></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founders */}
      <section style={{ padding: isMobile ? "36px 18px" : "56px 32px", borderBottom: "1px solid var(--ln-line)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ marginBottom: isMobile ? 22 : 32 }}>
            <span className="ln-eyebrow"><T>The people behind it</T></span>
            <h2
              className="ln-display"
              style={{ fontSize: isMobile ? 26 : 36, margin: "6px 0 0", letterSpacing: "-0.02em" }}
            >
              <T>Founders</T>
            </h2>
          </div>

          {FOUNDERS.map((f) => (
            <div
              key={f.name}
              style={{
                border: "1px solid var(--ln-line)",
                background: "var(--ln-surface)",
                padding: isMobile ? 18 : 28,
                display: "grid",
                gridTemplateColumns: isTabletDown ? "1fr" : "300px 1fr",
                gap: isMobile ? 18 : 32,
                alignItems: "start",
              }}
            >
              <img
                src={f.photo}
                alt={f.name}
                style={{
                  width: "100%",
                  maxWidth: isTabletDown ? 280 : "100%",
                  aspectRatio: "4 / 5",
                  objectFit: "cover",
                  borderRadius: 8,
                  border: "1px solid var(--ln-line)",
                }}
              />
              <div>
                <h3 style={{ fontSize: isMobile ? 22 : 26, margin: "0 0 4px", fontWeight: 600 }}>{f.name}</h3>
                <p style={{ fontSize: 13.5, color: "var(--ln-brand)", margin: "0 0 16px", fontWeight: 500 }}>
                  <T>{f.tagline}</T>
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {f.bio.map((p, i) => (
                    <p key={i} style={{ fontSize: 13.5, color: "var(--ln-ink-2)", lineHeight: 1.6, margin: 0 }}>
                      <T>{p}</T>
                    </p>
                  ))}
                </div>
                <a
                  href={f.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 18,
                    fontSize: 13,
                    color: "var(--ln-brand)",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  <T>Contact on LinkedIn</T>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Who we are */}
      <section style={{ padding: isMobile ? "36px 18px" : "56px 32px", borderBottom: "1px solid var(--ln-line)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <span className="ln-eyebrow"><T>Who we are</T></span>
          <h2
            className="ln-display"
            style={{ fontSize: isMobile ? 24 : 32, margin: "6px 0 14px", letterSpacing: "-0.02em" }}
          >
            <T>Built with the institutions that set the standard.</T>
          </h2>
          <p style={{ fontSize: isMobile ? 14 : 16, color: "var(--ln-ink-2)", lineHeight: 1.6, margin: "0 0 24px" }}>
            <T>
              OutbreakNow is operated by EldoNova+ Technologies in partnership with the Global Health and Quality
              Alliance — a coalition of medical boards, foundations and research institutions committed to making
              outbreak intelligence open, fast, and trustworthy.
            </T>
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/partnership" className="ln-btn is-primary">
              <T>Become a partner</T> <Icon.ArrowR />
            </Link>
            <Link to="/map" className="ln-btn">
              <T>Explore the live map</T>
            </Link>
          </div>
        </div>
      </section>

      <SimpleFooter />
    </div>
  );
}

function SimpleFooter() {
  return (
    <footer
      style={{
        padding: "32px 32px 28px",
        background: "var(--ln-surface)",
        borderTop: "1px solid var(--ln-line)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
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
        <span>
          <Link to="/privacy" style={{ color: "var(--ln-ink-3)", textDecoration: "none", marginRight: 14 }}>
            <T>Privacy</T>
          </Link>
          <Link to="/partnership" style={{ color: "var(--ln-ink-3)", textDecoration: "none" }}>
            <T>Partnership</T>
          </Link>
        </span>
      </div>
    </footer>
  );
}
