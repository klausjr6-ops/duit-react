import {
  createContext,
  useCallback,
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
    if (ls === "system") return "time"; // legacy: system → time
    if (ls && ["time", "light", "dark"].includes(ls)) return ls as ThemeMode;
    if (ls === "system") return "time";
  } catch {}
  return "time";
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
      // legacy "system" → treat as time-based auto
      return getTimeIsDark(now);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Pull themeMode from Firestore if available
  let storeSettingsMode: ThemeMode | undefined;
  let updateSettings: ((patch: any) => void) | undefined;
  try {
    const store = useStore();
    storeSettingsMode = store.settings?.themeMode as ThemeMode | undefined;
    updateSettings = store.updateSettings;
  } catch {
    // outside StoreProvider – SSR safe fallback
  }

  const [themeMode, setThemeModeState] = useState<ThemeMode>(getInitialMode);
  const [now, setNow] = useState(() => new Date());
  const [systemDark, setSystemDark] = useState(() => getSystemIsDark());
  const [hydrated, setHydrated] = useState(false);

  // Sync from Firestore ONCE
  useEffect(() => {
    if (!hydrated && storeSettingsMode && storeSettingsMode !== themeMode) {
      setThemeModeState(storeSettingsMode);
      try { localStorage.setItem(LS_KEY, storeSettingsMode); } catch {}
      setHydrated(true);
    }
    if (storeSettingsMode) setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeSettingsMode]);

  // system preference listener – only when mode === system
  useEffect(() => {
    if (themeMode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    setSystemDark(mq.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, [themeMode]);

  // time-based ticking – ONLY when mode === time
  useEffect(() => {
    if (themeMode !== "time") return;
    // tick immediately to avoid 1min drift
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, [themeMode]);

  const isDark = useMemo(
    () => resolveIsDark(themeMode, now, systemDark),
    [themeMode, now, systemDark]
  );

  const resolved = useMemo(() => (isDark ? "dark" as const : "light" as const), [isDark]);

  // Apply to <html> – no layout thrash
  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.theme !== resolved) root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
    root.classList.toggle("dark", isDark);
    root.classList.toggle("light", !isDark);
  }, [resolved, isDark]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    try { localStorage.setItem(LS_KEY, mode); } catch {}
    if (updateSettings) updateSettings({ themeMode: mode });
    // if switching to time mode, refresh now immediately
    if (mode === "time") setNow(new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateSettings]);

  const value = useMemo(() => ({
    themeMode,
    isDark,
    resolved,
    setThemeMode,
  }), [themeMode, isDark, resolved, setThemeMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

export function th(isDark: boolean, dark: string, light: string) {
  return isDark ? dark : light;
}
