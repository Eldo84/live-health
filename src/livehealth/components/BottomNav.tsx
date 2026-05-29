import { Link, useLocation } from "react-router-dom";
import { Icon } from "./Icon";
import { useBreakpoint, useMobileSize } from "../lib/useBreakpoint";
import { useT } from "../lib/useT";

const ACCENT = "#4ee0c4";

// Bottom navigation for mobile + tablet (mirrors the mobile design's tab bar).
// Hidden on desktop because the TopBar already exposes the same routes there.
// Active item is matched by pathname; the Alerts tab is a deep-link into
// /dashboard?tab=predictions so it's matched specially.
export const BOTTOM_NAV_HEIGHT = 60;

export function BottomNav() {
  const location = useLocation();
  const bp = useBreakpoint();
  const mobileSize = useMobileSize();
  const isNarrow = mobileSize === "narrow";

  // useT() is a hook — call them all unconditionally before any early return,
  // otherwise the hook count changes between breakpoints (rules-of-hooks).
  const tHome = useT("Home");
  const tMap = useT("Map");
  const tTrends = useT("Trends");
  const tFeed = useT("Feed");
  const tAlerts = useT("Alerts");

  if (bp === "desktop") return null;

  const items = [
    { to: "/", label: tHome, icon: <Icon.Globe />, match: (p: string) => p === "/" },
    {
      to: "/map",
      label: tMap,
      icon: <Icon.Map />,
      match: (p: string) => p === "/map" || p.startsWith("/map/"),
    },
    {
      to: "/dashboard",
      label: tTrends,
      icon: <Icon.Chart />,
      match: (p: string, s: string) => p === "/dashboard" && !s.includes("tab=predictions"),
    },
    {
      to: "/news",
      label: tFeed,
      icon: <Icon.News />,
      match: (p: string) => p === "/news" || p.startsWith("/news/"),
    },
    {
      to: "/dashboard?tab=predictions",
      label: tAlerts,
      icon: <Icon.Bell />,
      match: (_p: string, s: string) => s.includes("tab=predictions"),
    },
  ];

  return (
    <nav
      aria-label="Primary navigation"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 750,
        display: "flex",
        justifyContent: "space-around",
        padding: "8px 0 12px",
        background: "color-mix(in oklab, var(--ln-bg) 92%, transparent)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid var(--ln-line)",
        height: BOTTOM_NAV_HEIGHT,
        boxSizing: "border-box",
      }}
    >
      {items.map((it) => {
        const active = it.match(location.pathname, location.search);
        return (
          <Link
            key={it.label}
            to={it.to}
            aria-label={it.label}
            aria-current={active ? "page" : undefined}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              color: active ? ACCENT : "var(--ln-ink-3)",
              fontSize: 10,
              fontFamily: "var(--ln-font-mono)",
              letterSpacing: "0.08em",
              textDecoration: "none",
              flex: 1,
              minWidth: 0,
            }}
          >
            {it.icon}
            {!isNarrow && <span>{it.label.toUpperCase()}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
