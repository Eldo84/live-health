import { Outlet, Link, useLocation } from "react-router-dom";
import { Icon } from "./components/Icon";
import { Logo } from "./components/Logo";
import { ThemeToggle } from "./components/ThemeToggle";
import { LanguageSelector } from "./components/LanguageSelector";
import { HeaderUser } from "./components/HeaderUser";
import { ThemeProvider } from "./lib/useTheme";
import { useBreakpoint } from "./lib/useBreakpoint";
import { T } from "./components/T";
import { useT } from "./lib/useT";
import "./styles.css";

const ACCENT = "#4ee0c4";

const ADMIN_TABS: { label: string; to: string; match: string[] }[] = [
  { label: "Overview", to: "/admin", match: ["/admin"] },
  { label: "Alerts", to: "/admin/alerts", match: ["/admin/alerts"] },
  { label: "Advertising", to: "/admin/advertising", match: ["/admin/advertising"] },
  { label: "Feedback", to: "/admin/feedback", match: ["/admin/feedback"] },
  { label: "Notifications", to: "/admin/notifications", match: ["/admin/notifications"] },
];

// LiveHealth+ chrome for admin routes. Same header as the redesign, with an
// admin-specific subnav row so the panels behave like a unified admin section
// rather than scattered legacy pages.
export function AdminShell() {
  return (
    <ThemeProvider defaultTheme="dark">
      <div
        className="ln-app"
        style={{ minHeight: "100vh", background: "var(--ln-bg)", color: "var(--ln-ink)" }}
      >
        <AdminHeader />
        <AdminTabs />
        <main style={{ padding: 0, maxWidth: 1400, margin: "0 auto", width: "100%" }}>
          <Outlet />
        </main>
      </div>
    </ThemeProvider>
  );
}

function AdminHeader() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const tBackToMap = useT("Back to map");
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: isMobile ? "12px 16px" : "16px 28px",
        borderBottom: "1px solid var(--ln-line)",
        background: "var(--ln-topbar)",
        gap: 12,
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
        <Link to="/" style={{ display: "inline-flex" }}>
          <Logo color={ACCENT} />
        </Link>
        <span
          style={{
            fontFamily: "var(--ln-font-mono)",
            fontSize: 10,
            letterSpacing: "0.14em",
            color: "var(--ln-ink-3)",
            padding: "3px 8px",
            border: "1px solid var(--ln-line-2)",
            borderRadius: 4,
          }}
        >
          <T>ADMIN</T>
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link to="/map" className="ln-btn" title={tBackToMap}>
          <Icon.Map /> {!isMobile && <T>Map</T>}
        </Link>
        <LanguageSelector />
        <ThemeToggle />
        <HeaderUser />
      </div>
    </header>
  );
}

function AdminTabs() {
  const location = useLocation();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  return (
    <nav
      style={{
        display: "flex",
        gap: isMobile ? 4 : 8,
        padding: isMobile ? "10px 14px" : "10px 28px",
        borderBottom: "1px solid var(--ln-line)",
        background: "var(--ln-surface)",
        overflowX: "auto",
      }}
    >
      {ADMIN_TABS.map((t) => {
        const active =
          t.to === "/admin"
            ? location.pathname === "/admin"
            : t.match.some((m) => location.pathname.startsWith(m));
        return (
          <Link
            key={t.to}
            to={t.to}
            style={{
              padding: "7px 14px",
              fontSize: 12.5,
              color: active ? "var(--ln-ink)" : "var(--ln-ink-3)",
              textDecoration: "none",
              borderBottom: active ? `1.5px solid ${ACCENT}` : "1.5px solid transparent",
              whiteSpace: "nowrap",
            }}
          >
            <T>{t.label}</T>
          </Link>
        );
      })}
    </nav>
  );
}
