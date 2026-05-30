import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const STORAGE_KEY = "ln-theme";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readInitial(fallback: Theme): Theme {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return fallback;
}

// Applies the design-system theme class to <html> and persists the choice.
// The LiveHealth+ CSS variable sets (.ln-theme-dark / .ln-theme-light) do the
// rest, so every screen recolors automatically.
export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: {
  children: ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(() => readInitial(defaultTheme));

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("ln-host");
    root.classList.remove("ln-theme-light", "ln-theme-dark");
    root.classList.add(theme === "light" ? "ln-theme-light" : "ln-theme-dark");
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore storage failures (private mode etc.) */
    }
    return () => {
      root.classList.remove("ln-host", "ln-theme-light", "ln-theme-dark");
    };
  }, [theme]);

  const value: ThemeContextValue = {
    theme,
    setTheme: setThemeState,
    toggleTheme: () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Graceful fallback if a component renders outside the provider.
    return { theme: "dark", toggleTheme: () => {}, setTheme: () => {} };
  }
  return ctx;
}
