import { lazy, Suspense, useEffect, useState } from "react";
import LoginScreen from "./components/LoginScreen";
import { useAuth } from "./lib/AuthContext";
import { useTheme } from "./lib/ThemeContext";
import { isSessionStale, stampActivity } from "./hooks/useAutoLogout";

const AuthenticatedApp = lazy(() => import("./AuthenticatedApp"));

function FullScreenLoader() {
  const { isDark } = useTheme();
  return (
    <div className={isDark
      ? "min-h-screen bg-slate-950 flex items-center justify-center"
      : "min-h-screen bg-[#f5f5f7] flex items-center justify-center"
    }>
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-2xl animate-pulse shadow-lg shadow-teal-500/20 overflow-hidden">
          <img src="/logo_d_ukuran_disesuaikan.svg" alt="DUIT" className="h-full w-full object-contain" />
        </div>
        <p className={isDark ? "text-slate-400 text-sm" : "text-slate-500 text-sm"}>Memuat...</p>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading, logout } = useAuth();
  // Prevent dashboard flicker: wait until the cross-session stale check
  // completes before rendering AuthenticatedApp. Without this guard,
  // the user briefly sees the dashboard (1 frame) before being logged out.
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // No user → login screen, no stale check needed
      setSessionReady(true);
      return;
    }

    // ── Cross-session stale check ──────────────────────────────
    // Firebase Auth persists across browser restarts. On mobile,
    // closing the browser kills JS but the session token survives.
    // When the app reopens, we check if the last activity timestamp
    // in localStorage is older than 5 min → force logout.
    if (isSessionStale()) {
      // Session expired while app was closed — force logout
      try {
        sessionStorage.setItem("duit_session_expired", "1");
      } catch {}
      logout();
      return;
    }

    // Session is fresh (user reopened within 5 min) — stamp current time
    stampActivity();
    setSessionReady(true);
  }, [loading, user, logout]);

  if (loading || !sessionReady) return <FullScreenLoader />;
  if (!user) return <LoginScreen />;

  return (
    <Suspense fallback={<FullScreenLoader />}>
      <AuthenticatedApp />
    </Suspense>
  );
}
