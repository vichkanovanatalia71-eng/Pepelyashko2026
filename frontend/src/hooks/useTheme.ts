import { useEffect, useState } from "react";

type Theme = "dark" | "light";
const KEY = "app-theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  // Smooth transition class
  root.classList.add("theme-transitioning");
  if (theme === "light") {
    root.classList.add("light-theme");
  } else {
    root.classList.remove("light-theme");
  }
  // Remove transition class after animation completes
  setTimeout(() => root.classList.remove("theme-transitioning"), 300);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(KEY);
    return (saved === "light" || saved === "dark") ? saved : "dark";
  });

  // Apply on mount + whenever theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Sync on mount (in case SSR or initial render)
  useEffect(() => {
    applyTheme(theme);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = (t: Theme) => {
    localStorage.setItem(KEY, t);
    setThemeState(t);
  };

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return { theme, setTheme, toggle, isLight: theme === "light" };
}
