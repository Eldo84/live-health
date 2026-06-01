import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Logo } from "../components/Logo";
import { LanguageSelector } from "../components/LanguageSelector";
import { ThemeToggle } from "../components/ThemeToggle";
import { StatusPill } from "../components/StatusPill";
import { useBreakpoint } from "../lib/useBreakpoint";

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
                  {it.l}
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
            Open map <Icon.ArrowR />
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
          <span className="ln-eyebrow">Legal</span>
          <h1
            className="ln-display"
            style={{
              fontSize: isMobile ? 36 : isTabletDown ? 52 : 64,
              lineHeight: 1.04,
              letterSpacing: "-0.03em",
              margin: "10px 0 12px",
            }}
          >
            Privacy <span style={{ color: "var(--ln-ink-3)", fontStyle: "italic" }}>policy.</span>
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
            LAST UPDATED · {updated.toUpperCase()}
          </p>
        </div>
      </section>

      <section style={{ padding: isMobile ? "32px 18px 56px" : "56px 32px 80px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 }}>
          <Block title="Introduction">
            <p>
              OutbreakNow ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you visit our website{" "}
              <a
                href="https://outbreaknow.org"
                style={{ color: "var(--ln-brand)", textDecoration: "underline" }}
              >
                https://outbreaknow.org
              </a>{" "}
              and use our services.
            </p>
          </Block>

          <Block title="Information we collect">
            <h3 style={subhead}>Personal information</h3>
            <p>We may collect personal information that you voluntarily provide to us when you:</p>
            <ul style={ul}>
              <li>Register for an account</li>
              <li>Subscribe to our newsletter</li>
              <li>Contact us via email or contact forms</li>
              <li>Make a donation</li>
              <li>Submit feedback or participate in surveys</li>
            </ul>
            <p>
              This information may include your name, email address, organization, and any other information you
              choose to provide.
            </p>

            <h3 style={subhead}>Automatically collected information</h3>
            <p>When you visit our website, we automatically collect certain information about your device, including:</p>
            <ul style={ul}>
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Operating system</li>
              <li>Pages you visit and time spent on pages</li>
              <li>Referring website addresses</li>
              <li>Date and time of access</li>
            </ul>
          </Block>

          <Block title="How we use your information">
            <p>We use the information we collect to:</p>
            <ul style={ul}>
              <li>Provide, maintain, and improve our services</li>
              <li>Process your donations and send receipts</li>
              <li>Send you newsletters and updates (with your consent)</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Monitor and analyze usage patterns to improve user experience</li>
              <li>Detect, prevent, and address technical issues</li>
              <li>Comply with legal obligations</li>
            </ul>
          </Block>

          <Block title="Data protection">
            <p>
              We implement appropriate technical and organizational security measures to protect your personal
              information against unauthorized access, alteration, disclosure, or destruction. However, no method
              of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee
              absolute security.
            </p>
          </Block>

          <Block title="Data sharing and disclosure">
            <p>
              We do not sell, trade, or rent your personal information to third parties. We may share your
              information only in the following circumstances:
            </p>
            <ul style={ul}>
              <li>
                With service providers who assist us in operating our website and conducting our business (under
                strict confidentiality agreements)
              </li>
              <li>When required by law or to respond to legal process</li>
              <li>To protect our rights, privacy, safety, or property</li>
              <li>In connection with a merger, acquisition, or sale of assets (with notice to users)</li>
            </ul>
          </Block>

          <Block title="Cookies and tracking technologies">
            <p>
              We use cookies and similar tracking technologies to track activity on our website and store certain
              information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being
              sent. However, if you do not accept cookies, you may not be able to use some portions of our website.
            </p>
          </Block>

          <Block title="Your rights">
            <p>Depending on your location, you may have the following rights regarding your personal information:</p>
            <ul style={ul}>
              <li>
                <b>Access:</b> Request access to your personal information
              </li>
              <li>
                <b>Correction:</b> Request correction of inaccurate information
              </li>
              <li>
                <b>Deletion:</b> Request deletion of your personal information
              </li>
              <li>
                <b>Objection:</b> Object to processing of your personal information
              </li>
              <li>
                <b>Portability:</b> Request transfer of your personal information
              </li>
              <li>
                <b>Withdrawal:</b> Withdraw consent where processing is based on consent
              </li>
            </ul>
          </Block>

          <Block title="Children's privacy">
            <p>
              Our services are not directed to individuals under the age of 13. We do not knowingly collect
              personal information from children under 13. If you become aware that a child has provided us with
              personal information, please contact us, and we will take steps to delete such information.
            </p>
          </Block>

          <Block title="Changes to this privacy policy">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the
              new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this
              Privacy Policy periodically for any changes.
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
              Contact us
            </h2>
            <p style={{ fontSize: 13.5, color: "var(--ln-ink-2)", lineHeight: 1.6, margin: "0 0 12px" }}>
              If you have any questions about this Privacy Policy, please contact us:
            </p>
            <div style={{ fontSize: 13.5, color: "var(--ln-ink-2)", display: "flex", flexDirection: "column", gap: 6 }}>
              <span>
                <b>Email:</b>{" "}
                <a
                  href="mailto:contact@theghqa.org"
                  style={{ color: "var(--ln-brand)", textDecoration: "underline" }}
                >
                  contact@theghqa.org
                </a>
              </span>
              <span>
                <b>Website:</b>{" "}
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
              Privacy
            </Link>
            <Link to="/partnership" style={{ color: "var(--ln-ink-3)", textDecoration: "none" }}>
              Partnership
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
        {title}
      </h2>
      <div style={{ fontSize: 14, color: "var(--ln-ink-3)", lineHeight: 1.65 }}>{children}</div>
    </div>
  );
}
