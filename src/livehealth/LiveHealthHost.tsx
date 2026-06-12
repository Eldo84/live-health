import { Outlet } from "react-router-dom";
import "./styles.css";
import { ThemeProvider, type Theme } from "./lib/useTheme";
import { BottomNav, BOTTOM_NAV_HEIGHT } from "./components/BottomNav";
import { InstallPrompt } from "./components/InstallPrompt";
import { useBreakpoint } from "./lib/useBreakpoint";

interface LiveHealthHostProps {
  theme?: Theme;
}

// Wraps the LiveHealth+ screens in a ThemeProvider that tags <html> with the
// theme + host class so the design's CSS variables resolve. The theme is
// user-toggleable (see ThemeToggle) and persisted to localStorage. Mounts the
// shared BottomNav as a fixed bar on tablet/mobile only — desktop already has
// the TopBar nav so the bottom bar is redundant there.
export function LiveHealthHost({ theme = "dark" }: LiveHealthHostProps) {
  return (
    <ThemeProvider defaultTheme={theme}>
      <LiveHealthShell />
    </ThemeProvider>
  );
}

function LiveHealthShell() {
  const bp = useBreakpoint();
  const reserveBottom = bp !== "desktop";
  return (
    <>
      <div style={{ paddingBottom: reserveBottom ? BOTTOM_NAV_HEIGHT : 0 }}>
        <Outlet />
      </div>
      <BottomNav />
      <InstallPrompt />
    </>
  );
}
