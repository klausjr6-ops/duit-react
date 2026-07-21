import type { ReactNode } from "react";
import Card from "./Card";
import { formatRupiah, jakartaTimeParts } from "../lib/format";
import { dateKeyInJakarta, useStore } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";
import { IconCalendar, IconWallet, IconArrowDown, IconArrowUp } from "../utils/icons";

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
  onOpenSettings: () => void;
}

type Context = "morning" | "afternoon" | "evening" | "monthEnd";

export default function ContextualDashboard(props: Props) {
  const { isDark } = useTheme();
  const { wallets, goals, todaySchedules, settings } = useStore();
  const { hour } = jakartaTimeParts(props.now);
  const day = Number(dateKeyInJakarta(props.now).slice(-2));
  const context: Context = day >= 28 ? "monthEnd" : hour >= 18 || hour < 4 ? "evening" : hour >= 12 ? "afternoon" : "morning";
  const overspend = props.outMonth > props.inMonth;
  const topGoal = [...goals].sort((a, b) => (b.current / b.target) - (a.current / a.target))[0];
  const nextSchedule = todaySchedules[0];
  const title = context === "morning" ? "Mulai pelan, tetap punya arah."
    : context === "afternoon" ? "Kamu sudah melewati setengah hari."
    : context === "evening" ? "Hari ini sudah cukup."
    : overspend ? "Mari tutup bulan dengan lebih sadar." : "Kamu masih punya ruang untuk menutup bulan dengan tenang.";
  const detail = context === "morning" ? (todaySchedules.length ? `Ada ${todaySchedules.length} agenda hari ini. Pilih satu hal paling penting untuk dimulai.` : "Tidak ada agenda mendesak. Gunakan ruang hari ini sesuai ritmemu.")
    : context === "afternoon" ? `Hari ini tercatat ${formatRupiah(props.todayExpense)} pengeluaran${todaySchedules.length ? ` dan ${todaySchedules.length} agenda masih menunggu.` : "."}`
    : context === "evening" ? "Tidak semua harus selesai malam ini. Ambil satu menit untuk melihat hari yang sudah kamu jalani."
    : overspend ? "Pengeluaran bulan ini sudah melewati pemasukan. Lihat ringkasan sebelum menambah pengeluaran baru." : "Lihat arus kas dan siapkan hal kecil untuk bulan berikutnya.";
  const accent = context === "evening" ? "linear-gradient(90deg,#64748b,#475569,#334155)" : context === "monthEnd" ? "linear-gradient(90deg,#f59e0b,#f97316,#fb7185)" : context === "afternoon" ? "linear-gradient(90deg,#22d3ee,#3b82f6,#6366f1)" : "linear-gradient(90deg,#2dd4bf,#3b82f6,#6366f1)";
  const action = context === "morning" ? "Agenda hari ini" : context === "afternoon" ? "Lihat transaksi" : context === "evening" ? "Check-in malam" : "Lihat ringkasan";
  const actionClick = context === "morning" ? props.onScheduleClick : context === "afternoon" ? props.onExpenseClick : context === "evening" ? undefined : props.onGoalClick;

  const label = isDark ? "text-slate-500" : "text-zinc-500";
  const main = isDark ? "text-white" : "text-zinc-900";
  const muted = isDark ? "text-slate-400" : "text-zinc-500";
  const dayText = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(props.now).toUpperCase();
  const greeting = hour < 11 ? "Selamat pagi" : hour < 15 ? "Halo lagi" : hour < 18 ? "Selamat sore" : "Kamu sudah sampai di penghujung hari";

  return <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div className={`flex items-center gap-2 text-xl font-extrabold tracking-tight ${main}`}><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 text-lg text-white shadow-lg shadow-teal-500/20">D</span>DUIT</div>
      <button type="button" onClick={props.onOpenSettings} aria-label="Buka pengaturan akun" className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold ${isDark ? "bg-teal-400/15 text-teal-200" : "bg-teal-100 text-teal-700"}`}>{settings.name?.slice(0, 1).toUpperCase() || "K"}</button>
    </div>
    <header className="pt-1">
      <p className={`text-[10px] font-extrabold tracking-[0.16em] ${isDark ? "text-teal-300" : "text-teal-700"}`}>{dayText} · {context === "monthEnd" ? "PENUTUP BULAN" : context === "evening" ? "MALAM" : context === "afternoon" ? "SIANG" : "PAGI"}</p>
      <h1 className={`mt-2 text-3xl font-extrabold tracking-tight sm:text-[32px] ${main}`}>{greeting}{settings.name && settings.name !== "Kamu" && context !== "evening" ? `, ${settings.name}` : "."}</h1>
      <p className={`mt-1 text-sm ${muted}`}>{context === "morning" ? "Hari ini cukup padat. Mulai dari satu hal yang paling penting." : context === "afternoon" ? "Mari lihat apa yang sudah berjalan sebelum hari berakhir." : context === "evening" ? "Tidak semua harus selesai untuk membuat hari ini berarti." : "Lihat yang sudah berjalan, bukan hanya yang belum tercapai."}</p>
    </header>
    <section className={`relative overflow-hidden rounded-3xl border p-6 sm:p-7 ${isDark ? "border-white/10 bg-slate-900/70" : "border-teal-100 bg-white shadow-sm"}`}>
      <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${context === "evening" ? "from-slate-500 via-slate-600 to-slate-700" : context === "monthEnd" ? "from-amber-400 via-orange-500 to-rose-400" : context === "afternoon" ? "from-cyan-400 via-blue-500 to-indigo-500" : "from-teal-400 via-cyan-400 to-blue-500"}`} />
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-teal-400/15 blur-3xl" />
      <p className={`relative text-[10px] font-extrabold tracking-[0.16em] ${isDark ? "text-teal-300" : "text-teal-700"}`}>{context === "monthEnd" ? "MENJELANG AKHIR BULAN" : context === "evening" ? "PENUTUP HARI" : context === "afternoon" ? "KONTEKS SIANGMU" : "KONTEKS PAGIMU"}</p>
      <div className="relative mt-2 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div className="max-w-2xl"><h2 className={`text-2xl font-extrabold tracking-tight sm:text-3xl ${main}`}>{title}</h2><p className={`mt-2 text-sm leading-relaxed ${muted}`}>{detail}</p></div>
      <button type="button" onClick={actionClick} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${isDark ? "bg-teal-300 text-slate-950" : "bg-teal-600 text-white"}`}>{action} →</button></div>
    </section>

    {context === "morning" && <><div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><Card accent={accent}><p className={`text-xs font-semibold tracking-widest ${label}`}>SALDO AMAN HARI INI</p><p className={`mt-2 text-3xl font-extrabold ${main}`}>{formatRupiah(Math.max(0, props.balance - Math.max(props.todayExpense, 0)))}</p><p className={`mt-2 text-xs ${muted}`}>Saldo tersedia setelah transaksi yang sudah tercatat hari ini.</p></Card><Card accent="linear-gradient(90deg,#f59e0b,#f97316)"><p className={`text-xs font-semibold tracking-widest ${label}`}>AGENDA BERIKUTNYA</p>{nextSchedule ? <div className="mt-3 flex items-center gap-3"><span className="rounded-lg bg-teal-500/10 px-2 py-1 font-mono text-sm font-bold text-teal-600">{nextSchedule.start}</span><div><p className={`font-bold ${main}`}>{nextSchedule.name}</p><p className={`text-xs ${muted}`}>{nextSchedule.desc || "Jadwal hari ini"}</p></div></div> : <p className={`mt-3 text-sm ${muted}`}>Belum ada agenda hari ini.</p>}</Card></div><div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><Card><p className={`text-xs font-semibold tracking-widest ${label}`}>AKSI CEPAT</p><div className="mt-4 grid grid-cols-3 gap-3"><Quick icon={<IconArrowDown size={18}/>} label="Catat keluar" onClick={props.onExpenseClick}/><Quick icon={<IconArrowUp size={18}/>} label="Catat masuk" onClick={props.onIncomeClick}/><Quick icon={<IconCalendar size={18}/>} label="Agenda" onClick={props.onScheduleClick}/></div></Card><Card accent="linear-gradient(90deg,#2dd4bf,#60a5fa)"><p className={`text-xs font-semibold tracking-widest ${label}`}>SATU HAL KECIL</p><p className={`mt-3 text-lg font-bold leading-relaxed ${main}`}>“Jangan menambahkan terlalu banyak hal sebelum agenda pertama selesai.”</p></Card></div></>}

    {context === "afternoon" && <><div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><Card accent={accent}><p className={`text-xs font-semibold tracking-widest ${label}`}>RINGKASAN HARI INI</p><div className="mt-3 grid grid-cols-2 gap-4"><div><p className={`text-2xl font-extrabold ${main}`}>{formatRupiah(props.todayExpense)}</p><p className="text-xs text-rose-500">Pengeluaran hari ini</p></div><div><p className={`text-2xl font-extrabold ${main}`}>{formatRupiah(props.todayIncome)}</p><p className="text-xs text-emerald-500">Pemasukan hari ini</p></div></div><button onClick={props.onExpenseClick} className="mt-5 text-xs font-bold text-teal-600">+ Tambah transaksi →</button></Card><Card><p className={`text-xs font-semibold tracking-widest ${label}`}>SEBELUM MALAM</p>{nextSchedule ? <div className="mt-3"><p className={`text-lg font-bold ${main}`}>{nextSchedule.name}</p><p className={`mt-1 text-sm ${muted}`}>{nextSchedule.start}{nextSchedule.end ? `–${nextSchedule.end}` : ""} · Jadwal berikutnya</p></div> : <p className={`mt-3 text-sm ${muted}`}>Tidak ada agenda tersisa hari ini.</p>}</Card></div><div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><Card accent="linear-gradient(90deg,#38bdf8,#6366f1)"><p className={`text-xs font-semibold tracking-widest ${label}`}>PENGINGAT RINGAN</p><p className={`mt-3 text-lg font-bold leading-relaxed ${main}`}>“Sisakan ruang untuk pulang tanpa terburu-buru.”</p></Card><WalletSnapshot wallets={wallets} /></div></>}

    {context === "evening" && <><div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><Card accent={accent}><p className={`text-xs font-semibold tracking-widest ${label}`}>CHECK-IN MALAM</p><p className={`mt-3 text-lg font-bold ${main}`}>Bagaimana kamu ingin mengingat hari ini?</p><div className="mt-4 flex gap-2"><span className="rounded-xl bg-rose-500/10 p-2 text-xl">😣</span><span className="rounded-xl bg-amber-500/10 p-2 text-xl">😕</span><span className="rounded-xl bg-slate-500/10 p-2 text-xl">😐</span><span className="rounded-xl bg-teal-500/15 p-2 text-xl ring-2 ring-teal-400">🙂</span><span className="rounded-xl bg-violet-500/10 p-2 text-xl">✨</span></div><p className={`mt-3 text-xs ${muted}`}>Pilih suasana, tidak perlu menjelaskan semuanya.</p></Card><Card><p className={`text-xs font-semibold tracking-widest ${label}`}>HARI INI DALAM ANGKA</p><p className={`mt-2 text-3xl font-extrabold ${main}`}>{formatRupiah(props.todayExpense)}</p><p className={`mt-2 text-xs ${muted}`}>{props.todayExpense <= props.balance ? "Masih dalam saldo tersedia hari ini." : "Periksa transaksi hari ini sebelum menutup hari."}</p></Card></div><div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><Card accent="linear-gradient(90deg,#818cf8,#a78bfa)"><p className={`text-xs font-semibold tracking-widest ${label}`}>SATU PERTANYAAN</p><p className={`mt-3 text-lg font-bold ${main}`}>“Hal kecil apa yang ternyata cukup baik hari ini?”</p><div className={`mt-4 rounded-xl border px-3 py-3 text-xs ${isDark ? "border-white/10 text-slate-500" : "border-zinc-200 text-zinc-400"}`}>Tulis satu kalimat di card Mood…</div></Card><Card><p className={`text-xs font-semibold tracking-widest ${label}`}>BESOK</p><p className={`mt-3 text-lg font-bold ${main}`}>Siapkan diri tanpa harus mengerjakannya sekarang.</p><button onClick={props.onScheduleClick} className="mt-4 text-xs font-bold text-teal-600">Lihat jadwal →</button></Card></div></>}

    {context === "monthEnd" && <><div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><Card accent={accent}><p className={`text-xs font-semibold tracking-widest ${label}`}>ARUS KAS BULAN INI</p><p className={`mt-2 text-3xl font-extrabold ${main}`}>{formatRupiah(props.inMonth - props.outMonth)}</p><p className={`mt-2 text-xs ${muted}`}>Pemasukan {formatRupiah(props.inMonth)} · Pengeluaran {formatRupiah(props.outMonth)}</p></Card><Card><p className={`text-xs font-semibold tracking-widest ${label}`}>RUANG PENGELUARAN TERSISA</p><p className={`mt-2 text-3xl font-extrabold ${main}`}>{formatRupiah(Math.max(0, props.inMonth - props.outMonth))}</p><div className={`mt-4 h-2 overflow-hidden rounded-full ${isDark ? "bg-white/10" : "bg-zinc-100"}`}><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{width:`${Math.min(100, props.inMonth ? props.outMonth / props.inMonth * 100 : 100)}%`}} /></div></Card></div><div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><Card accent="linear-gradient(90deg,#f59e0b,#fb7185)"><p className={`text-xs font-semibold tracking-widest ${label}`}>PERSIAPAN BULAN BARU</p><p className={`mt-3 text-lg font-bold leading-relaxed ${main}`}>“Ada goal dan transaksi yang bisa kamu siapkan sebelum bulan berganti.”</p><button onClick={props.onGoalClick} className="mt-4 text-xs font-bold text-teal-600">Lihat goals →</button></Card>{topGoal ? <Card><p className={`text-xs font-semibold tracking-widest ${label}`}>GOAL TERDEKAT</p><p className={`mt-3 text-lg font-bold ${main}`}>{topGoal.name}</p><div className={`mt-3 h-2 overflow-hidden rounded-full ${isDark ? "bg-white/10" : "bg-zinc-100"}`}><div className="h-full rounded-full bg-blue-500" style={{width:`${Math.min(100, topGoal.current / topGoal.target * 100)}%`}} /></div><p className={`mt-2 text-xs ${muted}`}>{formatRupiah(topGoal.current)} dari {formatRupiah(topGoal.target)}</p></Card> : <WalletSnapshot wallets={wallets} />}</div></>}
  </div>;
}

function Quick({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) { const { isDark } = useTheme(); return <button type="button" onClick={onClick} className={`flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-xs font-bold transition-colors ${isDark ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"}`}><span className="text-teal-500">{icon}</span>{label}</button>; }
function WalletSnapshot({ wallets }: { wallets: ReturnType<typeof useStore>["wallets"] }) { const { isDark } = useTheme(); const main = isDark ? "text-white" : "text-zinc-900"; const muted = isDark ? "text-slate-400" : "text-zinc-500"; return <Card><p className={`text-xs font-semibold tracking-widest ${muted}`}>SALDO SEKARANG</p><div className="mt-3 space-y-3">{wallets.slice(0,3).map(w=><div key={w.id} className="flex items-center gap-3"><span className="rounded-lg bg-teal-500/10 p-2 text-teal-600"><IconWallet size={16}/></span><span className={`flex-1 text-sm font-bold ${main}`}>{w.name}</span><span className={`text-sm font-bold ${main}`}>{formatRupiah(w.balance)}</span></div>)}</div></Card>; }
