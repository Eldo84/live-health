import { Icon } from "./Icon";
import { useTheme } from "../lib/useTheme";

interface Props {
  /** "icon" = compact square button (headers); "labeled" = icon + text. */
  variant?: "icon" | "labeled";
}

// Dark/light theme toggle. Flips the .ln-theme-* class on <html> via the
// ThemeProvider, which recolors every screen through the design's CSS vars.
export function ThemeToggle({ variant = "icon" }: Props) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  if (variant === "labeled") {
    return (
      <button
        className="ln-btn"
        onClick={toggleTheme}
        aria-label={label}
        title={label}
      >
        {isDark ? <Icon.Sun /> : <Icon.Moon />}
        {isDark ? "Light" : "Dark"}
      </button>
    );
  }

  return (
    <button
      className="ln-btn"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      style={{ width: 30, height: 30, justifyContent: "center", padding: 0 }}
    >
      {isDark ? <Icon.Sun /> : <Icon.Moon />}
    </button>
  );
}
