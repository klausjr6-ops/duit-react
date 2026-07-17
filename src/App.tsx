import { lazy, Suspense } from "react";
import LoginScreen from "./components/LoginScreen";
import { useAuth } from "./lib/AuthContext";
import { useTheme } from "./lib/ThemeContext";

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
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;
  if (!user) return <LoginScreen />;

  return (
    <Suspense fallback={<FullScreenLoader />}>
      <AuthenticatedApp />
    </Suspense>
  );
}
