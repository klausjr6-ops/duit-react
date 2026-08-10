import { lazy, Suspense, useEffect, useState } from "react";
import LoginScreen from "./components/LoginScreen";
import NetworkStatusBanner from "./components/NetworkStatusBanner";
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

function SessionEndError({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  const { isDark } = useTheme();
  return <div className={isDark ? "min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-6" : "min-h-screen bg-[#f5f5f7] text-zinc-800 flex items-center justify-center p-6"}>
    <div className="max-w-sm text-center"><h1 className="text-xl font-bold">Sesi perlu diakhiri</h1><p className={isDark ? "mt-2 text-sm text-slate-400" : "mt-2 text-sm text-zinc-500"}>DUIT tidak dapat mengakhiri sesi lama dengan aman. Coba keluar lagi sebelum memuat ulang halaman.</p><div className="mt-5 flex justify-center gap-3"><button type="button" onClick={onRetry} disabled={retrying} className="rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 px-4 py-2.5 text-sm font-bold text-zinc-900 disabled:opacity-60">{retrying ? "Mengakhiri sesi…" : "Coba Keluar Lagi"}</button><button type="button" onClick={() => window.location.reload()} className={isDark ? "rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white" : "rounded-xl bg-zinc-200 px-4 py-2.5 text-sm font-bold text-zinc-800"}>Muat Ulang</button></div></div>
  </div>;
}

export default function App() {
  const { user, loading, logout } = useAuth();
  // Prevent dashboard flicker: wait until the cross-session stale check
  // completes before rendering AuthenticatedApp. Without this guard,
  // the user briefly sees the dashboard (1 frame) before being logged out.
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionEndError, setSessionEndError] = useState(false);
  const [sessionEndRetrying, setSessionEndRetrying] = useState(false);

  const retryStaleLogout = async () => {
    setSessionEndRetrying(true);
    try {
      await logout();
      setSessionEndError(false);
    } catch (error) {
      console.error("Retry stale session logout error:", error);
    } finally {
      setSessionEndRetrying(false);
    }
  };

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
      void logout().catch((error) => {
        console.error("Stale session logout error:", error);
        // Never render authenticated content after a stale-session failure.
        setSessionEndError(true);
        setSessionReady(true);
      });
      return;
    }

    // Session is fresh (user reopened within 5 min) — stamp current time
    stampActivity();
    setSessionReady(true);
  }, [loading, user, logout]);

  if (loading || !sessionReady) return <><NetworkStatusBanner /><FullScreenLoader /></>;
  if (sessionEndError) return <><NetworkStatusBanner /><SessionEndError onRetry={() => { void retryStaleLogout(); }} retrying={sessionEndRetrying} /></>;
  if (!user) return <><NetworkStatusBanner /><LoginScreen /></>;

  return <>
    <NetworkStatusBanner />
    <Suspense fallback={<FullScreenLoader />}>
      <AuthenticatedApp />
    </Suspense>
  </>;
}
