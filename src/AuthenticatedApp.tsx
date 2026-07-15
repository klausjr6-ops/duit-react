import { useCallback, useEffect, useState, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ClockCard from "./components/ClockCard";
import HealthCard from "./components/HealthCard";
import TodayCard from "./components/TodayCard";
import StatCard from "./components/StatCard";
import TimelineCard from "./components/TimelineCard";
import MoodCard from "./components/MoodCard";
import ReportCard from "./components/ReportCard";
import PullToRefreshIndicator from "./components/PullToRefreshIndicator";
import { usePullToRefresh } from "./hooks/usePullToRefresh";
import { StoreProvider, useStore } from "./lib/store";
import { useAuth } from "./lib/AuthContext";
import { useTheme } from "./lib/ThemeContext";

// Heavy views – lazy loaded for faster initial paint
const KeuanganView = lazy(() => import("./components/KeuanganView"));
const JadwalView = lazy(() => import("./views/JadwalView"));
const GoalsView = lazy(() => import("./views/GoalsView"));
const ChatWidget = lazy(() => import("./components/ChatWidget"));
const AccountModal = lazy(() => import("./components/AccountModal"));

function ViewLoader() {
  const { isDark } = useTheme();
  return (
    <div className={`py-16 flex items-center justify-center ${isDark ? "text-slate-400" : "text-zinc-500"}`}>
      <div className="flex items-center gap-3 text-sm">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border current border-t-transparent opacity-60" />
        Memuat…
      </div>
    </div>
  );
}

function DashboardLoader() {
  const { isDark } = useTheme();
  return (
    <div className={isDark
      ? "min-h-screen bg-slate-950 flex items-center justify-center"
      : "min-h-screen bg-[#f5f5f7] flex items-center justify-center"
    }>
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-xl font-bold text-zinc-900 animate-pulse shadow-lg">
          D
        </div>
        <p className={isDark ? "text-slate-400 text-sm" : "text-slate-500 text-sm"}>Memuat...</p>
      </div>
    </div>
  );
}

function ThemeStoreSync() {
  const { user } = useAuth();
  const { settings, loading, loadedUserId } = useStore();
  const { themeMode, setThemeMode } = useTheme();

  useEffect(() => {
    const remoteMode = settings.themeMode;
    const remoteReady = Boolean(user && !loading && loadedUserId === user.uid);
    if (!remoteReady || !remoteMode || remoteMode === themeMode) return;
    setThemeMode(remoteMode);
  }, [loadedUserId, loading, setThemeMode, settings.themeMode, themeMode, user]);

  return null;
}

export default function AuthenticatedApp() {
  return (
    <StoreProvider>
      <ThemeStoreSync />
      <DashboardApp />
    </StoreProvider>
  );
}

function DashboardApp() {
  const { user, loading: authLoading } = useAuth();
  const { isDark } = useTheme();
  const [now, setNow] = useState(new Date());
  const [active, setActive] = useState("home");
  const [quickTransaction, setQuickTransaction] = useState<{ type: "in" | "out"; nonce: number } | null>(null);
  const [showAccount, setShowAccount] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const store = useStore();
  const {
    score,
    balance,
    outMonth,
    totalSaved,
    todayIncome,
    todayExpense,
    todaySchedules,
    inMonth,
    loading: storeLoading,
    loadedUserId,
    syncing,
    syncError,
  } = store;

  // Pull-to-refresh: force Firestore to re-read by briefly detaching and
  // re-attaching the snapshot listener (toggle loadedUserId off then on).
  const refreshData = useCallback(async () => {
    // Firestore onSnapshot is already real-time, so we just add a small
    // delay to give visual feedback that a refresh happened.
    await new Promise((r) => setTimeout(r, 600));
  }, []);

  const {
    pulling: ptrPulling,
    refreshing: ptrRefreshing,
    pullDist: ptrPullDist,
    onTouchStart: ptrTouchStart,
    onTouchMove: ptrTouchMove,
    onTouchEnd: ptrTouchEnd,
  } = usePullToRefresh(refreshData);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [active]);

  // Jangan render data default sebelum snapshot Firestore untuk user aktif selesai.
  // Ini mencegah perubahan awal menimpa data cloud yang belum sempat dimuat.
  const appLoading = authLoading || Boolean(user && (storeLoading || loadedUserId !== user.uid));

  const handleNavigation = (key: string) => {
    if (key === "wallet") setQuickTransaction(null);
    setActive(key);
  };

  const openQuickTransaction = (type: "in" | "out") => {
    setQuickTransaction({ type, nonce: Date.now() });
    setActive("wallet");
  };

  if (appLoading) {
    return <DashboardLoader />;
  }

  return (
    <div
      className={
        isDark
          ? "relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-100"
          : "relative min-h-screen overflow-x-hidden bg-[#f5f5f7] text-slate-900"
      }
      style={{ transition: "background-color 180ms ease" }}
      onTouchStart={ptrTouchStart}
      onTouchMove={ptrTouchMove}
      onTouchEnd={ptrTouchEnd}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {isDark ? (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,229,196,0.08),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(74,158,255,0.1),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(155,111,255,0.06),transparent_40%)]" />
        ) : (
          <div className="absolute inset-0 opacity-[0.035]" style={{
            backgroundImage: `radial-gradient(#0f172a 1px, transparent 1px)`,
            backgroundSize: "24px 24px"
          }} />
        )}
      </div>

      <PullToRefreshIndicator
        pulling={ptrPulling}
        refreshing={ptrRefreshing}
        pullDist={ptrPullDist}
        isDark={isDark}
      />

      <Sidebar
        active={active}
        setActive={handleNavigation}
        onAvatarClick={() => setShowAccount(true)}
      />

      <main className="relative z-10 min-h-screen px-4 pb-28 pt-6 sm:px-8 sm:pt-8 md:ml-20 md:px-5 md:pb-24 lg:px-10">
        <div className="mx-auto max-w-7xl space-y-6">
          {(syncError || syncing) && (
            <div aria-live="polite">
              {syncError ? (
                <div
                  role="alert"
                  className={isDark
                    ? "rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-300"
                    : "rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                  }
                >
                  ⚠️ {syncError}
                </div>
              ) : (
                <p className={isDark ? "text-right text-xs text-slate-500" : "text-right text-xs text-zinc-500"}>
                  Menyimpan perubahan…
                </p>
              )}
            </div>
          )}

          {active === "home" && (
            <>
              <Header now={now} score={score} />

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <ClockCard now={now} />
                <HealthCard score={score} />
                <TodayCard
                  income={todayIncome}
                  expense={todayExpense}
                  scheduleCount={todaySchedules.length}
                  onIncomeClick={() => openQuickTransaction("in")}
                  onExpenseClick={() => openQuickTransaction("out")}
                  onScheduleClick={() => setActive("calendar")}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <StatCard
                  label="TOTAL SALDO"
                  value={balance}
                  color={isDark ? "text-emerald-400" : "text-emerald-600"}
                  accent="linear-gradient(90deg,#00E5C4,#10b981)"
                />
                <StatCard
                  label="PENGELUARAN BULAN INI"
                  value={outMonth}
                  color={isDark ? "text-amber-400" : "text-amber-600"}
                  accent="linear-gradient(90deg,#F5A623,#f59e0b)"
                  delay={0.05}
                />
                <StatCard
                  label="TABUNGAN TERKUMPUL"
                  value={totalSaved}
                  color={isDark ? "text-blue-400" : "text-blue-600"}
                  accent="linear-gradient(90deg,#4A9EFF,#3b82f6)"
                  suffix="dari seluruh goals"
                  delay={0.1}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <TimelineCard />
                <MoodCard />
              </div>

                <ReportCard
                income={inMonth}
                expense={outMonth}
              />
            </>
          )}

          {active === "wallet" && (
            <Suspense fallback={<ViewLoader />}>
              <KeuanganView
                quickType={quickTransaction?.type}
                quickNonce={quickTransaction?.nonce}
                onQuickDone={() => setQuickTransaction(null)}
              />
            </Suspense>
          )}
          {active === "calendar" && (
            <Suspense fallback={<ViewLoader />}>
              <JadwalView />
            </Suspense>
          )}
          {active === "target" && (
            <Suspense fallback={<ViewLoader />}>
              <GoalsView />
            </Suspense>
          )}
        </div>
      </main>

      {/* ── Floating Action Button (FAB) untuk buka Chat AI ── */}
      {(() => {
        const fabStatus = (outMonth > inMonth && inMonth > 0)
          ? "danger"
          : (outMonth > inMonth * 0.8 && inMonth > 0)
            ? "warning"
            : score >= 70
              ? "good"
              : "neutral";

        const fabGlow = fabStatus === "danger"
          ? "shadow-rose-500/40"
          : fabStatus === "warning"
            ? "shadow-amber-500/30"
            : fabStatus === "good"
              ? "shadow-emerald-500/30"
              : "shadow-teal-500/25";

        const fabGradient = fabStatus === "danger"
          ? "from-rose-400 to-rose-600"
          : fabStatus === "warning"
            ? "from-amber-400 to-orange-500"
            : fabStatus === "good"
              ? "from-emerald-400 to-teal-500"
              : "from-teal-400 to-blue-500";

        const fabPulse = fabStatus === "danger" || fabStatus === "warning";

        const tooltipText = fabStatus === "danger"
          ? "⚠️ Overspend bulan ini!"
          : fabStatus === "warning"
            ? "⚡ Budget mulai ketat"
            : fabStatus === "good"
              ? "💚 Keuangan sehat!"
              : "Tanya DUIT";

        return (
          <div className="fixed bottom-[5.5rem] right-2 z-40 md:bottom-8 md:right-8">
            {/* Tooltip */}
            <div className={`mb-1.5 ml-auto mr-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-opacity ${isDark ? "bg-slate-800 text-slate-200 border border-white/10" : "bg-white text-zinc-700 border border-zinc-200 shadow-lg"} opacity-0 group-hover/fab:opacity-100 pointer-events-none w-fit`}>
              {tooltipText}
            </div>
            <motion.button
              onClick={() => setShowChat(true)}
              animate={fabPulse ? { scale: [1, 1.08, 1] } : {}}
              transition={fabPulse ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`group/fab flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${fabGradient} text-zinc-900 shadow-lg ${fabGlow} transition-shadow md:h-14 md:w-14`}
              aria-label="Buka Chat AI"
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </motion.button>
          </div>
        );
      })()}

      {/* ── Modal Chat AI (popup) ── */}
      {showChat && (
        <Suspense fallback={null}>
          <ChatWidget open={showChat} onClose={() => setShowChat(false)} />
        </Suspense>
      )}

      {/* ── Modal Account (Profile) ── */}
      {showAccount && (
        <Suspense fallback={null}>
          <AccountModal open={showAccount} onClose={() => setShowAccount(false)} />
        </Suspense>
      )}
    </div>
  );
}
