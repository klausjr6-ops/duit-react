import type { ReactNode } from "react";
import Card from "./Card";
import MoodCard from "./MoodCard";
import { formatRupiah, jakartaTimeParts } from "../lib/format";
import { dateKeyInJakarta, useStore } from "../lib/store";
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
}

type Context = "morning" | "afternoon" | "evening" | "monthEnd";

export default function ContextualDashboardContent(props: Props) {
  const { isDark } = useTheme();
  const { wallets, goals, todaySchedules } = useStore();
  const { hour } = jakartaTimeParts(props.now);
  const day = Number(dateKeyInJakarta(props.now).slice(-2));
  const context: Context = day >= 28 ? "monthEnd" : hour >= 18 || hour < 4 ? "evening" : hour >= 12 ? "afternoon" : "morning";
  const label = isDark ? "text-slate-500" : "text-zinc-500";
  const main = isDark ? "text-white" : "text-zinc-900";
  const muted = isDark ? "text-slate-400" : "text-zinc-500";
  const next = todaySchedules[0];
  const topGoal = [...goals].sort((a, b) => (b.current / b.target) - (a.current / a.target))[0];
  const accent = context === "monthEnd" ? "linear-gradient(90deg,#f59e0b,#f97316,#fb7185)" : context === "evening" ? "linear-gradient(90deg,#818cf8,#a78bfa,#64748b)" : context === "afternoon" ? "linear-gradient(90deg,#22d3ee,#3b82f6,#6366f1)" : "linear-gradient(90deg,#2dd4bf,#22d3ee,#3b82f6)";

  const contextTitle = context === "morning" ? "PAGI · MULAI HARI" : context === "afternoon" ? "SIANG · LANJUTKAN DENGAN SADAR" : context === "evening" ? "MALAM · TUTUP HARI" : "AKHIR BULAN · LIHAT GAMBAR BESAR";
  const contextText = context === "morning" ? "Prioritasmu adalah ritme, agenda, dan ruang aman hari ini." : context === "afternoon" ? "Fokus pada apa yang sudah berjalan dan yang masih tersisa hari ini." : context === "evening" ? "Tidak perlu mengejar semuanya. Lihat hari ini dengan tenang." : "Fokus pada arus kas, ruang yang tersisa, dan langkah bulan berikutnya.";

  return <div className="space-y-6">
    <section className={`rounded-2xl border px-4 py-3 sm:px-5 ${isDark ? "border-white/10 bg-white/5" : "border-teal-100 bg-teal-50/70"}`}>
      <p className={`text-[10px] font-extrabold tracking-[0.14em] ${isDark ? "text-teal-300" : "text-teal-700"}`}>{contextTitle}</p>
      <p className={`mt-1 text-sm ${muted}`}>{contextText}</p>
    </section>

    {context === "morning" && <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card accent={accent}><p className={`text-xs font-semibold tracking-widest ${label}`}>SALDO AMAN HARI INI</p><p className={`mt-2 text-3xl font-extrabold ${main}`}>{formatRupiah(Math.max(0, props.balance - props.todayExpense))}</p><p className={`mt-2 text-xs ${muted}`}>Saldo tersedia setelah transaksi yang sudah dicatat hari ini.</p></Card>
        <Card accent="linear-gradient(90deg,#f59e0b,#f97316)"><p className={`text-xs font-semibold tracking-widest ${label}`}>AGENDA BERIKUTNYA</p>{next ? <Agenda item={next} main={main} muted={muted}/> : <p className={`mt-3 text-sm ${muted}`}>Belum ada agenda untuk hari ini.</p>}</Card>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card><p className={`text-xs font-semibold tracking-widest ${label}`}>AKSI CEPAT</p><div className="mt-4 grid grid-cols-3 gap-3"><Action icon={<IconArrowDown size={18}/>} label="Catat keluar" onClick={props.onExpenseClick}/><Action icon={<IconArrowUp size={18}/>} label="Catat masuk" onClick={props.onIncomeClick}/><Action icon={<IconCalendar size={18}/>} label="Buka agenda" onClick={props.onScheduleClick}/></div></Card>
        <Insight label="INSIGHT PAGI" text="Mulai dari satu hal yang paling penting. Sisanya bisa menunggu." accent="linear-gradient(90deg,#2dd4bf,#60a5fa)" />
      </div>
    </>}

    {context === "afternoon" && <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card accent={accent}><p className={`text-xs font-semibold tracking-widest ${label}`}>RINGKASAN TRANSAKSI HARI INI</p><div className="mt-4 grid grid-cols-2 gap-5"><div><p className={`text-2xl font-extrabold ${main}`}>{formatRupiah(props.todayExpense)}</p><p className="mt-1 text-xs font-semibold text-rose-500">Pengeluaran</p></div><div><p className={`text-2xl font-extrabold ${main}`}>{formatRupiah(props.todayIncome)}</p><p className="mt-1 text-xs font-semibold text-emerald-500">Pemasukan</p></div></div><button onClick={props.onExpenseClick} className="mt-5 text-xs font-bold text-teal-600">+ Tambah transaksi →</button></Card>
        <Card><p className={`text-xs font-semibold tracking-widest ${label}`}>AGENDA TERSISA</p>{next ? <Agenda item={next} main={main} muted={muted}/> : <p className={`mt-3 text-sm ${muted}`}>Tidak ada agenda tersisa hari ini.</p>}</Card>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><Insight label="PENGINGAT RINGAN" text="Sisakan ruang untuk pulang tanpa terburu-buru." accent="linear-gradient(90deg,#38bdf8,#6366f1)"/><Wallets wallets={wallets} main={main} muted={muted}/></div>
    </>}

    {context === "evening" && <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><MoodCard/><Card accent={accent}><p className={`text-xs font-semibold tracking-widest ${label}`}>RINGKASAN ANGKA HARI INI</p><p className={`mt-2 text-3xl font-extrabold ${main}`}>{formatRupiah(props.todayExpense)}</p><p className={`mt-2 text-xs ${muted}`}>Pengeluaran hari ini · pemasukan {formatRupiah(props.todayIncome)}</p></Card></div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><Insight label="SATU PERTANYAAN" text="Hal kecil apa yang ternyata cukup baik hari ini?" accent="linear-gradient(90deg,#818cf8,#a78bfa)"/><Card><p className={`text-xs font-semibold tracking-widest ${label}`}>PERSIAPAN BESOK</p><p className={`mt-3 text-lg font-bold ${main}`}>Lihat jadwal besok tanpa harus mengerjakannya sekarang.</p><button onClick={props.onScheduleClick} className="mt-4 text-xs font-bold text-teal-600">Lihat jadwal →</button></Card></div>
    </>}

    {context === "monthEnd" && <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><Card accent={accent}><p className={`text-xs font-semibold tracking-widest ${label}`}>ARUS KAS BULAN INI</p><p className={`mt-2 text-3xl font-extrabold ${main}`}>{formatRupiah(props.inMonth - props.outMonth)}</p><p className={`mt-2 text-xs ${muted}`}>Masuk {formatRupiah(props.inMonth)} · Keluar {formatRupiah(props.outMonth)}</p></Card><Card><p className={`text-xs font-semibold tracking-widest ${label}`}>RUANG PENGELUARAN TERSISA</p><p className={`mt-2 text-3xl font-extrabold ${main}`}>{formatRupiah(Math.max(0, props.inMonth - props.outMonth))}</p><div className={`mt-4 h-2 overflow-hidden rounded-full ${isDark ? "bg-white/10" : "bg-zinc-100"}`}><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{width:`${Math.min(100, props.inMonth ? props.outMonth / props.inMonth * 100 : 100)}%`}}/></div></Card></div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><Insight label="PERSIAPAN BULAN BARU" text="Ada goal dan transaksi yang bisa kamu siapkan sebelum bulan berganti." accent="linear-gradient(90deg,#f59e0b,#fb7185)"/>{topGoal ? <Card><p className={`text-xs font-semibold tracking-widest ${label}`}>GOAL TERDEKAT</p><p className={`mt-3 text-lg font-bold ${main}`}>{topGoal.name}</p><div className={`mt-3 h-2 overflow-hidden rounded-full ${isDark ? "bg-white/10" : "bg-zinc-100"}`}><div className="h-full rounded-full bg-blue-500" style={{width:`${Math.min(100,topGoal.current/topGoal.target*100)}%`}}/></div><p className={`mt-2 text-xs ${muted}`}>{formatRupiah(topGoal.current)} dari {formatRupiah(topGoal.target)}</p><button onClick={props.onGoalClick} className="mt-4 text-xs font-bold text-teal-600">Buka goal →</button></Card> : <Wallets wallets={wallets} main={main} muted={muted}/>}</div>
    </>}
  </div>;
}

function Agenda({ item, main, muted }: { item: { start: string; name: string; desc?: string }; main: string; muted: string }) { return <div className="mt-4 flex items-center gap-3"><span className="rounded-lg bg-teal-500/10 px-2.5 py-1.5 font-mono text-sm font-bold text-teal-600">{item.start}</span><div><p className={`font-bold ${main}`}>{item.name}</p><p className={`text-xs ${muted}`}>{item.desc || "Jadwal hari ini"}</p></div></div>; }
function Action({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) { const { isDark } = useTheme(); return <button type="button" onClick={onClick} className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-bold ${isDark ? "border-white/10 bg-white/5 text-slate-200" : "border-zinc-200 bg-zinc-50 text-zinc-700"}`}><span className="text-teal-500">{icon}</span>{label}</button>; }
function Insight({ label, text, accent }: { label: string; text: string; accent: string }) { const { isDark } = useTheme(); return <Card accent={accent}><p className={`text-xs font-semibold tracking-widest ${isDark ? "text-slate-500" : "text-zinc-500"}`}>{label}</p><p className={`mt-3 text-lg font-bold leading-relaxed ${isDark ? "text-white" : "text-zinc-900"}`}>“{text}”</p></Card>; }
function Wallets({ wallets, main, muted }: { wallets: ReturnType<typeof useStore>["wallets"]; main: string; muted: string }) { return <Card><p className={`text-xs font-semibold tracking-widest ${muted}`}>SNAPSHOT WALLET</p><div className="mt-4 space-y-3">{wallets.slice(0,3).map(w=><div key={w.id} className="flex items-center gap-3"><span className="rounded-lg bg-teal-500/10 p-2 text-teal-600"><IconWallet size={16}/></span><span className={`flex-1 text-sm font-bold ${main}`}>{w.name}</span><span className={`text-sm font-bold ${main}`}>{formatRupiah(w.balance)}</span></div>)}</div></Card>; }
