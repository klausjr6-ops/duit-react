import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useStore } from "./store";

export type ThemeMode = "system" | "time" | "light" | "dark";

interface ThemeContextValue {
  themeMode: ThemeMode;
  isDark: boolean;
  resolved: "light" | "dark";
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const LS_KEY = "duit_theme_mode";

function getInitialMode(): ThemeMode {
  try {
    const ls = localStorage.getItem(LS_KEY) as ThemeMode | null;
    if (ls && ["system", "time", "light", "dark"].includes(ls)) return ls;
  } catch {}
  return "system";
}

function getSystemIsDark(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
}

function getTimeIsDark(date = new Date()): boolean {
  const h = date.getHours();
  // light 06:00 - 17:59, dark 18:00 - 05:59
  return h < 6 || h >= 18;
}

function resolveIsDark(mode: ThemeMode, now: Date, systemDark: boolean): boolean {
  switch (mode) {
    case "light":
      return false;
    case "dark":
      return true;
    case "time":
      return getTimeIsDark(now);
    case "system":
    default:
      return systemDark;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // settings may be undefined during early load – useStore is safe inside StoreProvider
  let storeSettingsMode: ThemeMode | undefined;
  let updateSettings: ((patch: any) => void) | undefined;
  try {
    const store = useStore();
    storeSettingsMode = store.settings?.themeMode as ThemeMode | undefined;
    updateSettings = store.updateSettings;
  } catch {
    // useStore outside provider – fallback to local only
  }

  const [themeMode, setThemeModeState] = useState<ThemeMode>(getInitialMode);
  const [now, setNow] = useState(() => new Date());
  const [systemDark, setSystemDark] = useState(() => getSystemIsDark());

  // Sync from Firestore -> local once settings load
  useEffect(() => {
    if (storeSettingsMode && storeSettingsMode !== themeMode) {
      setThemeModeState(storeSettingsMode);
      try {
        localStorage.setItem(LS_KEY, storeSettingsMode);
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeSettingsMode]);

  // Listen system preference
  useEffect(() => {
    if (themeMode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    setSystemDark(mq.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, [themeMode]);

  // Tick for time-based mode (check every 30s)
  useEffect(() => {
    if (themeMode !== "time") return;
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, [themeMode]);

  // Also update `now` at least every minute globally so time-mode stays accurate
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const isDark = useMemo(
    () => resolveIsDark(themeMode, now, systemDark),
    [themeMode, now, systemDark]
  );

  const resolved = isDark ? "dark" : "light";

  // Apply to <html> for any global CSS that needs it
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
    // Tailwind v4 compatible: toggle .dark class if people want it
    root.classList.toggle("dark", isDark);
    root.classList.toggle("light", !isDark);
  }, [resolved, isDark]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      localStorage.setItem(LS_KEY, mode);
    } catch {}
    // Sync to Firestore if store is ready
    if (updateSettings) {
      updateSettings({ themeMode: mode });
    }
    // Update `now` immediately so time mode resolves instantly
    setNow(new Date());
  };

  const value: ThemeContextValue = {
    themeMode,
    isDark,
    resolved,
    setThemeMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

// Optional helper: pick classNames
export function th(isDark: boolean, dark: string, light: string) {
  return isDark ? dark : light;
}
