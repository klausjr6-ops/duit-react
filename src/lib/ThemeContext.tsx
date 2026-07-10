import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { useStore, type Settings, type ThemeMode } from "./store";

export type { ThemeMode } from "./store";

interface ThemeContextValue {
  themeMode: ThemeMode;
  isDark: boolean;
  resolved: "light" | "dark";
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const LS_KEY = "duit_theme_mode";
const THEME_MODES: ThemeMode[] = ["system", "time", "light", "dark"];

function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return Boolean(value && THEME_MODES.includes(value as ThemeMode));
}

function getInitialMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(LS_KEY);
    return isThemeMode(stored) ? stored : "time";
  } catch {
    return "time";
  }
}

function getSystemIsDark(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
}

function getTimeIsDark(date = new Date()): boolean {
  const hour = date.getHours();
  // Light 06:00–17:59, dark 18:00–05:59.
  return hour < 6 || hour >= 18;
}

function resolveIsDark(mode: ThemeMode, now: Date, systemDark: boolean): boolean {
  switch (mode) {
    case "light":
      return false;
    case "dark":
      return true;
    case "system":
      return systemDark;
    case "time":
      return getTimeIsDark(now);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { settings, updateSettings, loading: storeLoading, loadedUserId } = useStore();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getInitialMode);
  const [now, setNow] = useState(() => new Date());
  const [systemDark, setSystemDark] = useState(getSystemIsDark);

  const remoteSettingsReady = Boolean(
    user && !storeLoading && loadedUserId === user.uid
  );

  // localStorage gives a fast first paint. Once the signed-in user's Firestore
  // document has loaded, it becomes the source of truth across devices.
  useEffect(() => {
    if (!remoteSettingsReady || !isThemeMode(settings.themeMode)) return;
    if (settings.themeMode !== themeMode) setThemeModeState(settings.themeMode);

    try {
      localStorage.setItem(LS_KEY, settings.themeMode);
    } catch {
      // localStorage is only a cache; Firestore remains the source of truth.
    }
  }, [remoteSettingsReady, settings.themeMode, themeMode]);

  useEffect(() => {
    if (themeMode !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    setSystemDark(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themeMode]);

  useEffect(() => {
    if (themeMode !== "time") return;

    setNow(new Date());
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, [themeMode]);

  const isDark = useMemo(
    () => resolveIsDark(themeMode, now, systemDark),
    [now, systemDark, themeMode]
  );
  const resolved: "light" | "dark" = isDark ? "dark" : "light";

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
    root.classList.toggle("dark", isDark);
    root.classList.toggle("light", !isDark);
  }, [isDark, resolved]);

  const setThemeMode = useCallback(
    (mode: ThemeMode) => {
      setThemeModeState(mode);

      try {
        localStorage.setItem(LS_KEY, mode);
      } catch {
        // localStorage is only a cache; Firestore remains the source of truth.
      }

      const patch: Partial<Settings> = { themeMode: mode };
      updateSettings(patch);
      if (mode === "time") setNow(new Date());
    },
    [updateSettings]
  );

  const value = useMemo(
    () => ({ themeMode, isDark, resolved, setThemeMode }),
    [isDark, resolved, setThemeMode, themeMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside <ThemeProvider>");
  return context;
}

export function th(isDark: boolean, dark: string, light: string) {
  return isDark ? dark : light;
}
