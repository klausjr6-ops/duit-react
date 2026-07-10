import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ClockCard from "./components/ClockCard";
import HealthCard from "./components/HealthCard";
import TodayCard from "./components/TodayCard";
import StatCard from "./components/StatCard";
import TimelineCard from "./components/TimelineCard";
import MoodCard from "./components/MoodCard";
import ReportCard from "./components/ReportCard";
import ChatWidget from "./components/ChatWidget";
import AccountModal from "./components/AccountModal";
import KeuanganView from "./components/KeuanganView";
import LoginScreen from "./components/LoginScreen";
import JadwalView from "./views/JadwalView";
import GoalsView from "./views/GoalsView";
import { useStore } from "./lib/store";
import { useAuth } from "./lib/AuthContext";
import { useTheme } from "./lib/ThemeContext";

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { isDark } = useTheme();
  const [now, setNow] = useState(new Date());
  const [active, setActive] = useState("home");
  const [showAccount, setShowAccount] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const {
    score,
    balance,
    outMonth,
    totalSaved,
    todayIncome,
    todayExpense,
    todaySchedules,
    inMonth,
    savingsPct,
  } = useStore();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [active]);

  // ── Loading state saat cek session pertama kali ──
  if (authLoading) {
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

  // ── Belum login → tampilkan Login Screen ──
  if (!user) {
    return <LoginScreen />;
  }

  // ── Sudah login → tampilkan app utama ──
  return (
    <div className={
      isDark
        ? "relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-100 transition-colors duration-300"
        : "relative min-h-screen overflow-x-hidden bg-[#f5f5f7] text-slate-900 transition-colors duration-300"
    }>
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

      <Sidebar
        active={active}
        setActive={setActive}
        onAvatarClick={() => setShowAccount(true)}
      />

      <main className="relative z-10 min-h-screen px-4 pb-28 pt-6 sm:px-8 sm:pt-8 md:ml-20 md:px-5 md:pb-24 lg:px-10">
        <div className="mx-auto max-w-7xl space-y-6">
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
                savingsPct={savingsPct}
              />
            </>
          )}

          {active === "wallet" && <KeuanganView />}
          {active === "calendar" && <JadwalView />}
          {active === "target" && <GoalsView />}
        </div>
      </main>

      {/* ── Floating Action Button (FAB) untuk buka Chat AI ── */}
      <button
        onClick={() => setShowChat(true)}
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-blue-500 text-zinc-900 shadow-lg shadow-teal-500/25 transition-transform hover:scale-105 active:scale-95 md:bottom-8 md:right-8 md:h-16 md:w-16"
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
      </button>

      {/* ── Modal Chat AI (popup) ── */}
      <ChatWidget open={showChat} onClose={() => setShowChat(false)} />

      {/* ── Modal Account (Profile) ── */}
      <AccountModal open={showAccount} onClose={() => setShowAccount(false)} />
    </div>
  );
}
