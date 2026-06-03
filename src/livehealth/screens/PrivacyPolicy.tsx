import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Logo } from "../components/Logo";
import { LanguageSelector } from "../components/LanguageSelector";
import { ThemeToggle } from "../components/ThemeToggle";
import { StatusPill } from "../components/StatusPill";
import { useBreakpoint } from "../lib/useBreakpoint";
import { T } from "../components/T";

const ACCENT = "#4ee0c4";

// Themed Privacy Policy. Same chrome as the rest of LiveHealth+. Content kept
// verbatim — legal text shouldn't drift across redesigns.
export default function PrivacyPolicyScreen() {
  const location = useLocation();
  const canonical = `${window.location.origin}${location.pathname}`;
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTabletDown = bp !== "desktop";
  const updated = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="ln-app" style={{ minHeight: "100vh", background: "var(--ln-bg)", color: "var(--ln-ink)" }}>
      <Helmet>
        <title>Privacy Policy | OutbreakNow</title>
        <meta
          name="description"
          content="OutbreakNow Privacy Policy — how we collect, use, and protect your information."
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
                { l: "About", to: "/partnership" },
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

      <section
        style={{
          padding: isMobile ? "44px 18px 24px" : "64px 32px 32px",
          borderBottom: "1px solid var(--ln-line)",
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--ln-brand) 6%, transparent) 0%, transparent 100%)",
        }}
      >
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <span className="ln-eyebrow"><T>Legal</T></span>
          <h1
            className="ln-display"
            style={{
              fontSize: isMobile ? 36 : isTabletDown ? 52 : 64,
              lineHeight: 1.04,
              letterSpacing: "-0.03em",
              margin: "10px 0 12px",
            }}
          >
            <T>Privacy</T> <span style={{ color: "var(--ln-ink-3)", fontStyle: "italic" }}><T>policy.</T></span>
          </h1>
          <p
            style={{
              fontFamily: "var(--ln-font-mono)",
              fontSize: 11,
              letterSpacing: "0.1em",
              color: "var(--ln-ink-3)",
              margin: 0,
            }}
          >
            <T>LAST UPDATED ·</T> {updated.toUpperCase()}
          </p>
        </div>
      </section>

      <section style={{ padding: isMobile ? "32px 18px 56px" : "56px 32px 80px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 }}>
          <Block title="Introduction">
            <p>
              <T>OutbreakNow ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website</T>{" "}
              <a
                href="https://outbreaknow.org"
                style={{ color: "var(--ln-brand)", textDecoration: "underline" }}
              >
                https://outbreaknow.org
              </a>{" "}
              <T>and use our services.</T>
            </p>
          </Block>

          <Block title="Information we collect">
            <h3 style={subhead}><T>Personal information</T></h3>
            <p><T>We may collect personal information that you voluntarily provide to us when you:</T></p>
            <ul style={ul}>
              <li><T>Register for an account</T></li>
              <li><T>Subscribe to our newsletter</T></li>
              <li><T>Contact us via email or contact forms</T></li>
              <li><T>Make a donation</T></li>
              <li><T>Submit feedback or participate in surveys</T></li>
            </ul>
            <p>
              <T>This information may include your name, email address, organization, and any other information you choose to provide.</T>
            </p>

            <h3 style={subhead}><T>Automatically collected information</T></h3>
            <p><T>When you visit our website, we automatically collect certain information about your device, including:</T></p>
            <ul style={ul}>
              <li><T>IP address</T></li>
              <li><T>Browser type and version</T></li>
              <li><T>Operating system</T></li>
              <li><T>Pages you visit and time spent on pages</T></li>
              <li><T>Referring website addresses</T></li>
              <li><T>Date and time of access</T></li>
            </ul>
          </Block>

          <Block title="How we use your information">
            <p><T>We use the information we collect to:</T></p>
            <ul style={ul}>
              <li><T>Provide, maintain, and improve our services</T></li>
              <li><T>Process your donations and send receipts</T></li>
              <li><T>Send you newsletters and updates (with your consent)</T></li>
              <li><T>Respond to your inquiries and provide customer support</T></li>
              <li><T>Monitor and analyze usage patterns to improve user experience</T></li>
              <li><T>Detect, prevent, and address technical issues</T></li>
              <li><T>Comply with legal obligations</T></li>
            </ul>
          </Block>

          <Block title="Data protection">
            <p>
              <T>We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.</T>
            </p>
          </Block>

          <Block title="Data sharing and disclosure">
            <p>
              <T>We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</T>
            </p>
            <ul style={ul}>
              <li>
                <T>With service providers who assist us in operating our website and conducting our business (under strict confidentiality agreements)</T>
              </li>
              <li><T>When required by law or to respond to legal process</T></li>
              <li><T>To protect our rights, privacy, safety, or property</T></li>
              <li><T>In connection with a merger, acquisition, or sale of assets (with notice to users)</T></li>
            </ul>
          </Block>

          <Block title="Cookies and tracking technologies">
            <p>
              <T>We use cookies and similar tracking technologies to track activity on our website and store certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our website.</T>
            </p>
          </Block>

          <Block title="Your rights">
            <p><T>Depending on your location, you may have the following rights regarding your personal information:</T></p>
            <ul style={ul}>
              <li>
                <b><T>Access:</T></b> <T>Request access to your personal information</T>
              </li>
              <li>
                <b><T>Correction:</T></b> <T>Request correction of inaccurate information</T>
              </li>
              <li>
                <b><T>Deletion:</T></b> <T>Request deletion of your personal information</T>
              </li>
              <li>
                <b><T>Objection:</T></b> <T>Object to processing of your personal information</T>
              </li>
              <li>
                <b><T>Portability:</T></b> <T>Request transfer of your personal information</T>
              </li>
              <li>
                <b><T>Withdrawal:</T></b> <T>Withdraw consent where processing is based on consent</T>
              </li>
            </ul>
          </Block>

          <Block title="Children's privacy">
            <p>
              <T>Our services are not directed to individuals under the age of 13. We do not knowingly collect personal information from children under 13. If you become aware that a child has provided us with personal information, please contact us, and we will take steps to delete such information.</T>
            </p>
          </Block>

          <Block title="Changes to this privacy policy">
            <p>
              <T>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.</T>
            </p>
          </Block>

          <div
            style={{
              border: "1px solid var(--ln-line)",
              background: "var(--ln-surface)",
              padding: 22,
            }}
          >
            <h2
              style={{
                fontSize: 18,
                margin: "0 0 12px",
                letterSpacing: "-0.01em",
                fontWeight: 500,
              }}
            >
              <T>Contact us</T>
            </h2>
            <p style={{ fontSize: 13.5, color: "var(--ln-ink-2)", lineHeight: 1.6, margin: "0 0 12px" }}>
              <T>If you have any questions about this Privacy Policy, please contact us:</T>
            </p>
            <div style={{ fontSize: 13.5, color: "var(--ln-ink-2)", display: "flex", flexDirection: "column", gap: 6 }}>
              <span>
                <b><T>Email:</T></b>{" "}
                <a
                  href="mailto:contact@theghqa.org"
                  style={{ color: "var(--ln-brand)", textDecoration: "underline" }}
                >
                  contact@theghqa.org
                </a>
              </span>
              <span>
                <b><T>Website:</T></b>{" "}
                <a
                  href="https://outbreaknow.org"
                  style={{ color: "var(--ln-brand)", textDecoration: "underline" }}
                >
                  https://outbreaknow.org
                </a>
              </span>
            </div>
          </div>
        </div>
      </section>

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
    </div>
  );
}

const subhead: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: "-0.01em",
  margin: "16px 0 8px",
  color: "var(--ln-ink)",
};

const ul: React.CSSProperties = {
  margin: "8px 0 12px",
  paddingLeft: 22,
  display: "flex",
  flexDirection: "column",
  gap: 4,
  color: "var(--ln-ink-3)",
  fontSize: 14,
  lineHeight: 1.6,
};

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2
        style={{
          fontSize: 22,
          letterSpacing: "-0.015em",
          fontWeight: 500,
          margin: "0 0 12px",
          paddingBottom: 8,
          borderBottom: "1px solid var(--ln-line)",
        }}
      >
        <T>{title}</T>
      </h2>
      <div style={{ fontSize: 14, color: "var(--ln-ink-3)", lineHeight: 1.65 }}>{children}</div>
    </div>
  );
}
