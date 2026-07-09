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

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [now, setNow] = useState(new Date());
  const [active, setActive] = useState("home");
  const [showAccount, setShowAccount] = useState(false);

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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-xl font-bold text-slate-950 animate-pulse">
            D
          </div>
          <p className="text-slate-400 text-sm">Memuat...</p>
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
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,229,196,0.08),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(74,158,255,0.1),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(155,111,255,0.06),transparent_40%)]" />
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
                  color="text-emerald-400"
                  accent="linear-gradient(90deg,#00E5C4,#10b981)"
                />
                <StatCard
                  label="PENGELUARAN BULAN INI"
                  value={outMonth}
                  color="text-amber-400"
                  accent="linear-gradient(90deg,#F5A623,#f59e0b)"
                  delay={0.05}
                />
                <StatCard
                  label="TABUNGAN TERKUMPUL"
                  value={totalSaved}
                  color="text-blue-400"
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

      <ChatWidget />

      <AccountModal open={showAccount} onClose={() => setShowAccount(false)} />
    </div>
  );
}