import type { ReactNode } from "react";
import Card from "./Card";
import ReportCard from "./ReportCard";
import MoodCard from "./MoodCard";
import FinancialInsights from "./FinancialInsights";
import { formatRupiah, jakartaTimeParts } from "../lib/format";
import { addDaysToDateKey, dateKeyInJakarta, useStore } from "../lib/store";
import { getFinancialInsights } from "../lib/insights";
import { useTheme } from "../lib/ThemeContext";
import { IconArrowDown, IconArrowUp, IconCalendar, IconWallet } from "../utils/icons";

interface Props {
  now: Date;
  balance: number;
  inMonth: number;
  outMonth: number;
  todayIncome: number;
  todayExpense: number;
  onIncomeClick: () => void;
  onExpenseClick: () => void;
  onScheduleClick: () => void;
  onGoalClick: () => void;
  onFinanceClick: () => void;
}

type Context = "morning" | "afternoon" | "evening" | "monthEnd";

export default function ContextualDashboardContent(props: Props) {
  const { isDark } = useTheme();
  const { wallets, goals, txs, todaySchedules, todayMood, moods } = useStore();
  const { hour } = jakartaTimeParts(props.now);
  const todayKey = dateKeyInJakarta(props.now);
  const previousNightMood = moods[addDaysToDateKey(todayKey, -1)];
  const day = Number(todayKey.slice(-2));
  const context: Context = day >= 28 ? "monthEnd" : hour >= 18 || hour < 4 ? "evening" : hour >= 12 ? "afternoon" : "morning";
  const label = isDark ? "text-slate-500" : "text-zinc-500";
  const main = isDark ? "text-white" : "text-zinc-900";
  const muted = isDark ? "text-slate-400" : "text-zinc-500";
  const next = todaySchedules[0];
  const topGoal = [...goals].sort((a, b) => (b.current / b.target) - (a.current / a.target))[0];
  const accent = context === "monthEnd" ? "linear-gradient(90deg,#f59e0b,#f97316,#fb7185)" : context === "evening" ? "linear-gradient(90deg,#818cf8,#a78bfa,#64748b)" : context === "afternoon" ? "linear-gradient(90deg,#22d3ee,#3b82f6,#6366f1)" : "linear-gradient(90deg,#2dd4bf,#22d3ee,#3b82f6)";

  const contextTitle = context === "morning" ? "PAGI · MULAI HARI" : context === "afternoon" ? "SIANG · LANJUTKAN DENGAN SADAR" : context === "evening" ? "MALAM · TUTUP HARI" : "AKHIR BULAN · LIHAT GAMBAR BESAR";
  const contextText = context === "morning" ? "Prioritasmu adalah ritme, agenda, dan ruang aman hari ini." : context === "afternoon" ? "Fokus pada apa yang sudah berjalan dan yang masih tersisa hari ini." : context === "evening" ? "Tidak perlu mengejar semuanya. Lihat hari ini dengan tenang." : "Fokus pada arus kas, ruang yang tersisa, dan langkah bulan berikutnya.";
  const motivation = getContextualMotivation({ context, dateKey: todayKey, scheduleCount: todaySchedules.length, todayExpense: props.todayExpense, inMonth: props.inMonth, outMonth: props.outMonth, moodLabel: todayMood?.label, previousMoodLabel: previousNightMood?.label });

  const todayTransactions = txs
    .filter((transaction) => transaction.date === todayKey && !transaction.isCarryForward)
    .slice(0, 3);
  const heroAction = context === "morning" || context === "afternoon"
    ? (next ? "Lihat agenda" : "Catat pengeluaran")
    : context === "evening" ? "Lihat jadwal" : "Buka laporan";
  const onHeroAction = context === "morning" || context === "afternoon"
    ? (next ? props.onScheduleClick : props.onExpenseClick)
    : context === "evening" ? props.onScheduleClick : props.onFinanceClick;
  const insights = getFinancialInsights({
    txs,
    wallets,
    goals,
    todayKey,
    inMonth: props.inMonth,
    outMonth: props.outMonth,
  });

  return <div className="space-y-6">
    <ContextHero
      contextTitle={contextTitle}
      contextText={contextText}
      motivation={motivation}
      next={next}
      actionLabel={heroAction}
      onAction={onHeroAction}
      onExpenseClick={props.onExpenseClick}
      showExpenseAction={heroAction !== "Catat pengeluaran"}
      isDark={isDark}
    />

    <FinancialInsights insights={insights} onFinanceClick={props.onFinanceClick} onGoalClick={props.onGoalClick} />

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <InteractiveStat label="MASUK HARI INI" value={props.todayIncome} accent="bg-emerald-500" detail="Buka transaksi" onClick={props.onFinanceClick} isDark={isDark}/>
      <InteractiveStat label="KELUAR HARI INI" value={props.todayExpense} accent="bg-rose-500" detail="Buka transaksi" onClick={props.onFinanceClick} isDark={isDark}/>
      <InteractiveStat label="TOTAL SALDO" value={props.balance} accent="bg-blue-500" detail={`${wallets.length} dompet`} onClick={props.onFinanceClick} isDark={isDark}/>
      <InteractiveStat label="TABUNGAN GOAL" value={goals.reduce((sum, goal) => sum + goal.current, 0)} accent="bg-amber-500" detail={`${goals.length} goal aktif`} onClick={props.onGoalClick} isDark={isDark}/>
    </div>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_0.75fr]">
      <ActivityToday transactions={todayTransactions} next={next} main={main} muted={muted} isDark={isDark} onFinanceClick={props.onFinanceClick} onScheduleClick={props.onScheduleClick}/>
      <Card><p className={`text-xs font-semibold tracking-widest ${label}`}>AKSI CEPAT</p><div className="mt-4 grid grid-cols-2 gap-3"><Action icon={<IconArrowDown size={18}/>} label="Catat keluar" onClick={props.onExpenseClick}/><Action icon={<IconArrowUp size={18}/>} label="Catat masuk" onClick={props.onIncomeClick}/><Action icon={<IconCalendar size={18}/>} label="Buka agenda" onClick={props.onScheduleClick}/><Action icon={<IconWallet size={18}/>} label="Kelola dompet" onClick={props.onFinanceClick}/></div></Card>
    </div>

    {context === "morning" && <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card accent={accent}><p className={`text-xs font-semibold tracking-widest ${label}`}>SALDO AMAN HARI INI</p><p className={`mt-2 text-3xl font-extrabold ${main}`}>{formatRupiah(Math.max(0, props.balance - props.todayExpense))}</p><p className={`mt-2 text-xs ${muted}`}>Saldo tersedia setelah transaksi yang sudah dicatat hari ini.</p></Card>
        <Card accent="linear-gradient(90deg,#f59e0b,#f97316)"><p className={`text-xs font-semibold tracking-widest ${label}`}>AGENDA BERIKUTNYA</p>{next ? <Agenda item={next} main={main} muted={muted}/> : <p className={`mt-3 text-sm ${muted}`}>Belum ada agenda untuk hari ini.</p>}</Card>
      </div>
      <Insight label="MOTIVASI PAGI" text={motivation} accent="linear-gradient(90deg,#2dd4bf,#60a5fa)" />
    </>}

    {context === "afternoon" && <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card accent={accent}><p className={`text-xs font-semibold tracking-widest ${label}`}>RINGKASAN TRANSAKSI HARI INI</p><div className="mt-4 grid grid-cols-2 gap-5"><div><p className={`text-2xl font-extrabold ${main}`}>{formatRupiah(props.todayExpense)}</p><p className="mt-1 text-xs font-semibold text-rose-500">Pengeluaran</p></div><div><p className={`text-2xl font-extrabold ${main}`}>{formatRupiah(props.todayIncome)}</p><p className="mt-1 text-xs font-semibold text-emerald-500">Pemasukan</p></div></div><button onClick={props.onExpenseClick} className="mt-5 text-xs font-bold text-teal-600">+ Tambah transaksi →</button></Card>
        <Card><p className={`text-xs font-semibold tracking-widest ${label}`}>AGENDA TERSISA</p>{next ? <Agenda item={next} main={main} muted={muted}/> : <p className={`mt-3 text-sm ${muted}`}>Tidak ada agenda tersisa hari ini.</p>}</Card>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><Insight label="MOTIVASI SIANG" text={motivation} accent="linear-gradient(90deg,#38bdf8,#6366f1)"/><Wallets wallets={wallets} main={main} muted={muted}/></div>
    </>}

    {context === "evening" && <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><MoodCard/><Card accent={accent}><p className={`text-xs font-semibold tracking-widest ${label}`}>RINGKASAN ANGKA HARI INI</p><p className={`mt-2 text-3xl font-extrabold ${main}`}>{formatRupiah(props.todayExpense)}</p><p className={`mt-2 text-xs ${muted}`}>Pengeluaran hari ini · pemasukan {formatRupiah(props.todayIncome)}</p></Card></div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><Insight label="REFLEKSI MALAM" text={motivation} accent="linear-gradient(90deg,#818cf8,#a78bfa)"/><Card><p className={`text-xs font-semibold tracking-widest ${label}`}>PERSIAPAN BESOK</p><p className={`mt-3 text-lg font-bold ${main}`}>Lihat jadwal besok tanpa harus mengerjakannya sekarang.</p><button onClick={props.onScheduleClick} className="mt-4 text-xs font-bold text-teal-600">Lihat jadwal →</button></Card></div>
    </>}

    {context === "monthEnd" && <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><Card accent={accent}><p className={`text-xs font-semibold tracking-widest ${label}`}>ARUS KAS BULAN INI</p><p className={`mt-2 text-3xl font-extrabold ${main}`}>{formatRupiah(props.inMonth - props.outMonth)}</p><p className={`mt-2 text-xs ${muted}`}>Masuk {formatRupiah(props.inMonth)} · Keluar {formatRupiah(props.outMonth)}</p></Card><ReportCard income={props.inMonth} expense={props.outMonth} /></div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><Insight label="PENUTUP BULAN" text={motivation} accent="linear-gradient(90deg,#f59e0b,#fb7185)"/>{topGoal ? <Card><p className={`text-xs font-semibold tracking-widest ${label}`}>GOAL TERDEKAT</p><p className={`mt-3 text-lg font-bold ${main}`}>{topGoal.name}</p><div className={`mt-3 h-2 overflow-hidden rounded-full ${isDark ? "bg-white/10" : "bg-zinc-100"}`}><div className="h-full rounded-full bg-blue-500" style={{width:`${Math.min(100,topGoal.current/topGoal.target*100)}%`}}/></div><p className={`mt-2 text-xs ${muted}`}>{formatRupiah(topGoal.current)} dari {formatRupiah(topGoal.target)}</p><button onClick={props.onGoalClick} className="mt-4 text-xs font-bold text-teal-600">Buka goal →</button></Card> : <Wallets wallets={wallets} main={main} muted={muted}/>}</div>
    </>}
  </div>;
}

function ContextHero({ contextTitle, contextText, motivation, next, actionLabel, onAction, onExpenseClick, showExpenseAction, isDark }: { contextTitle: string; contextText: string; motivation: string; next?: { start: string; name: string; desc?: string }; actionLabel: string; onAction: () => void; onExpenseClick: () => void; showExpenseAction: boolean; isDark: boolean }) {
  return <section className={`relative overflow-hidden rounded-3xl border p-6 sm:p-7 ${isDark ? "border-teal-400/15 bg-gradient-to-br from-teal-400/10 via-slate-900 to-blue-500/10" : "border-teal-100 bg-gradient-to-br from-teal-50 via-white to-blue-50 shadow-sm"}`}>
    <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-teal-400/15 blur-3xl" />
    <p className={`relative text-[10px] font-extrabold tracking-[0.16em] ${isDark ? "text-teal-300" : "text-teal-700"}`}>{contextTitle}</p>
    <h2 className={`relative mt-2 max-w-2xl text-2xl font-extrabold tracking-tight sm:text-3xl ${isDark ? "text-white" : "text-zinc-900"}`}>{motivation.split(". ")[0]}.</h2>
    <p className={`relative mt-2 max-w-2xl text-sm leading-relaxed ${isDark ? "text-slate-300" : "text-zinc-600"}`}>{contextText}</p>
    {next && <div className={`relative mt-4 inline-flex items-center gap-3 rounded-xl border px-3 py-2 text-xs ${isDark ? "border-white/10 bg-black/10 text-slate-200" : "border-teal-100 bg-white/80 text-zinc-700"}`}><span className="h-2 w-2 rounded-full bg-teal-400 shadow-[0_0_0_4px_rgba(45,212,191,.15)]"/><b>{next.start} · {next.name}</b><span className="hidden sm:inline">{next.desc || "Agenda berikutnya"}</span></div>}
    <div className="relative mt-5 flex flex-wrap gap-3"><button type="button" onClick={onAction} className={`${isDark ? "bg-teal-300 text-slate-950" : "bg-teal-600 text-white"} rounded-xl px-4 py-2.5 text-sm font-bold transition-transform hover:scale-[1.02]`}>{actionLabel} →</button>{showExpenseAction && <button type="button" onClick={onExpenseClick} className={`${isDark ? "bg-white/10 text-slate-100" : "bg-white text-teal-700 border border-teal-100"} rounded-xl px-4 py-2.5 text-sm font-bold`}>↓ Catat pengeluaran</button>}</div>
  </section>;
}
function InteractiveStat({ label, value, detail, accent, onClick, isDark }: { label: string; value: number; detail: string; accent: string; onClick: () => void; isDark: boolean }) { return <button type="button" onClick={onClick} className={`${isDark ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-zinc-200 bg-white hover:border-teal-200 hover:shadow-md"} relative overflow-hidden rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5`}><span className={`absolute inset-x-0 top-0 h-1 ${accent}`}/><p className={`${isDark ? "text-slate-500" : "text-zinc-500"} text-[10px] font-extrabold tracking-widest`}>{label}</p><p className={`${isDark ? "text-white" : "text-zinc-900"} mt-2 text-xl font-extrabold tracking-tight sm:text-2xl`}>{formatRupiah(value)}</p><p className="mt-2 text-[11px] font-semibold text-teal-600">{detail} →</p></button>; }
function ActivityToday({ transactions, next, main, muted, isDark, onFinanceClick, onScheduleClick }: { transactions: ReturnType<typeof useStore>["txs"]; next?: { start: string; name: string; desc?: string }; main: string; muted: string; isDark: boolean; onFinanceClick: () => void; onScheduleClick: () => void }) { return <Card><div className="flex items-center justify-between"><p className={`text-xs font-semibold tracking-widest ${muted}`}>AKTIVITAS HARI INI</p><button type="button" onClick={onFinanceClick} className="text-xs font-bold text-teal-600">Lihat semua →</button></div><div className={`mt-3 divide-y ${isDark ? "divide-white/10" : "divide-zinc-100"}`}>{transactions.length === 0 && !next ? <p className={`py-6 text-sm ${muted}`}>Belum ada aktivitas hari ini.</p> : <>{transactions.map((transaction) => <button type="button" key={transaction.id} onClick={onFinanceClick} className="flex w-full items-center gap-3 py-3 text-left"><span className={`h-2.5 w-2.5 rounded-full ${transaction.type === "in" ? "bg-emerald-500" : "bg-rose-500"}`}/><span className={`min-w-0 flex-1 truncate text-sm font-bold ${main}`}>{transaction.desc || transaction.cat}</span><span className={`text-xs font-bold ${transaction.type === "in" ? "text-emerald-500" : "text-rose-500"}`}>{transaction.type === "in" ? "+" : "−"}{formatRupiah(transaction.amt)}</span></button>)}{next && <button type="button" onClick={onScheduleClick} className="flex w-full items-center gap-3 py-3 text-left"><span className="h-2.5 w-2.5 rounded-full bg-amber-400"/><span className={`min-w-0 flex-1 truncate text-sm font-bold ${main}`}>{next.name}</span><span className={`text-xs font-bold ${muted}`}>{next.start}</span></button>}</>}</div></Card>; }

function Agenda({ item, main, muted }: { item: { start: string; name: string; desc?: string }; main: string; muted: string }) { return <div className="mt-4 flex items-center gap-3"><span className="rounded-lg bg-teal-500/10 px-2.5 py-1.5 font-mono text-sm font-bold text-teal-600">{item.start}</span><div><p className={`font-bold ${main}`}>{item.name}</p><p className={`text-xs ${muted}`}>{item.desc || "Jadwal hari ini"}</p></div></div>; }
function Action({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) { const { isDark } = useTheme(); return <button type="button" onClick={onClick} className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-bold ${isDark ? "border-white/10 bg-white/5 text-slate-200" : "border-zinc-200 bg-zinc-50 text-zinc-700"}`}><span className="text-teal-500">{icon}</span>{label}</button>; }
function Insight({ label, text, accent }: { label: string; text: string; accent: string }) { const { isDark } = useTheme(); return <Card accent={accent}><p className={`text-xs font-semibold tracking-widest ${isDark ? "text-slate-500" : "text-zinc-500"}`}>{label}</p><p className={`mt-3 text-lg font-bold leading-relaxed ${isDark ? "text-white" : "text-zinc-900"}`}>“{text}”</p></Card>; }
function Wallets({ wallets, main, muted }: { wallets: ReturnType<typeof useStore>["wallets"]; main: string; muted: string }) { return <Card><p className={`text-xs font-semibold tracking-widest ${muted}`}>SNAPSHOT WALLET</p><div className="mt-4 space-y-3">{wallets.slice(0,3).map(w=><div key={w.id} className="flex items-center gap-3"><span className="rounded-lg bg-teal-500/10 p-2 text-teal-600"><IconWallet size={16}/></span><span className={`flex-1 text-sm font-bold ${main}`}>{w.name}</span><span className={`text-sm font-bold ${main}`}>{formatRupiah(w.balance)}</span></div>)}</div></Card>; }


function getContextualMotivation({ context, dateKey, scheduleCount, todayExpense, inMonth, outMonth, moodLabel, previousMoodLabel }: { context: Context; dateKey: string; scheduleCount: number; todayExpense: number; inMonth: number; outMonth: number; moodLabel?: string; previousMoodLabel?: string }) {
  const seed = [...dateKey].reduce((total, char) => total + char.charCodeAt(0), 0);
  const choose = (items: string[]) => items[seed % items.length];
  if (context === "morning") {
    // Mood malam sebelumnya menjadi nada motivasi pagi, bukan diagnosis.
    if (previousMoodLabel === "Ngantuk" || previousMoodLabel === "Lesu") {
      return choose([
        "Tadi malam kamu merasa cukup lelah. Pagi ini tidak harus luar biasa—mulai pelan dan jaga energimu.",
        "Tidak apa-apa bila kamu butuh ritme yang lebih ringan hari ini. Satu hal kecil yang selesai sudah cukup baik.",
        "Bawa dirimu pelan-pelan pagi ini. Fokus pada yang penting, bukan pada banyaknya hal yang harus dilakukan.",
      ]);
    }
    if (previousMoodLabel === "Baik" || previousMoodLabel === "Semangat") {
      return choose([
        "Kamu menutup kemarin dengan energi yang baik. Pilih satu langkah nyata untuk membawa momentum itu ke hari ini.",
        "Ada ritme baik yang kamu bawa dari kemarin. Gunakan untuk memulai, tanpa perlu memaksa diri terlalu jauh.",
        "Kemarin kamu punya ruang yang cukup baik. Hari ini, coba jaga satu hal yang membuatmu tetap bertumbuh.",
      ]);
    }
    if (scheduleCount >= 3) return "Harimu cukup penuh. Kamu tidak harus mengerjakan semuanya sekaligus—mulai dari satu hal yang paling penting.";
    return choose(["Kamu tidak perlu mengejar pagi yang sempurna. Satu langkah kecil yang selesai tetap berarti.", "Jaga ritmemu, bukan hanya daftar tugasmu. Hari yang tenang juga bisa menjadi hari yang baik.", "Mulai dengan yang penting, lalu biarkan sisanya menemukan tempatnya sendiri."]);
  }
  if (context === "afternoon") {
    if (todayExpense > 0) return "Apa pun yang sudah terjadi pagi ini, kamu masih bisa memilih ritme yang lebih baik untuk sisa harimu.";
    return choose(["Kamu sudah sampai di tengah hari. Tarik napas, lalu lanjutkan tanpa harus terburu-buru.", "Siang bukan tanda kamu terlambat. Ini kesempatan kedua untuk menjalani hari dengan sadar.", "Cukup periksa arahmu sebentar—kamu tidak harus mempercepat langkah."]);
  }
  if (context === "evening") {
    if (moodLabel) return `Kamu menandai harimu sebagai “${moodLabel}”. Terima dulu apa yang kamu rasakan, tanpa perlu menyelesaikannya malam ini.`;
    return choose(["Tidak semua hari harus produktif untuk tetap layak dihargai.", "Sebelum tidur, ingat satu hal kecil yang berhasil kamu lewati hari ini.", "Kamu boleh menutup hari tanpa jawaban untuk semua hal."]);
  }
  if (outMonth > inMonth) return "Bulan ini mungkin belum berjalan sesuai rencana. Yang penting sekarang bukan menyalahkan diri, melainkan memberi bulan berikutnya arah yang lebih baik.";
  return choose(["Kamu sudah membangun sesuatu bulan ini, bahkan lewat langkah-langkah yang terlihat kecil.", "Penutup bulan bukan ujian. Ini hanya ruang untuk melihat apa yang ingin kamu bawa ke bulan berikutnya.", "Tidak semua kemajuan terlihat besar. Lihat kembali hal yang sudah kamu jaga bulan ini."]);
}
