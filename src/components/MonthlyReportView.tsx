import { useMemo, useState, type ReactNode } from "react";
import Card from "./Card";
import { formatRupiah } from "../lib/format";
import { useStore, type Transaction } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";
import { IconArrowDown, IconArrowUp, IconCalendar, IconWallet } from "../utils/icons";

interface Props { onAskAI: (month: string) => void; }

function monthLabel(month: string) {
  const [year, value] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" })
    .format(new Date(Date.UTC(year, value - 1, 1, 12)));
}
function shiftMonth(month: string, delta: number) {
  const [year, value] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, value - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
function dateLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" })
    .format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export default function MonthlyReportView({ onAskAI }: Props) {
  const { txs, walletBases } = useStore();
  const { isDark } = useTheme();
  const current = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" }).format(new Date());
  const [month, setMonth] = useState(current);
  const canGoNext = month < current;

  const report = useMemo(() => {
    const inMonth = txs.filter((t) => t.date.startsWith(month));
    const before = txs.filter((t) => !t.isCarryForward && t.date < `${month}-01`);
    const opening = walletBases.reduce((sum, wallet) => sum + wallet.balance, 0) + before.reduce((sum, t) => sum + (t.type === "in" ? t.amt : -t.amt), 0);
    const sorted = [...inMonth].sort((a, b) => a.date === b.date ? a.id - b.id : a.date.localeCompare(b.date));
    const isRealFlow = (t: Transaction) => !t.transferId && !t.isCarryForward && !(t.goalId && t.type === "out");
    const income = sorted.filter((t) => t.type === "in" && isRealFlow(t)).reduce((sum, t) => sum + t.amt, 0);
    const expense = sorted.filter((t) => t.type === "out" && isRealFlow(t)).reduce((sum, t) => sum + t.amt, 0);
    let running = opening;
    const rows = sorted.map((tx) => {
      if (!tx.isCarryForward) running += tx.type === "in" ? tx.amt : -tx.amt;
      return { tx, balance: running };
    });
    return { income, expense, net: income - expense, rows, opening };
  }, [month, txs, walletBases]);

  const panel = isDark ? "bg-slate-900/60 border border-white/10" : "bg-white border border-zinc-200 shadow-sm";
  const text = isDark ? "text-white" : "text-zinc-900";
  const muted = isDark ? "text-slate-400" : "text-zinc-500";
  const button = isDark ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50";

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className={`text-xs font-semibold tracking-widest ${muted}`}>MODE LAPORAN</p><h2 className={`mt-1 text-3xl font-extrabold tracking-tight ${text}`}>Laporan Keuangan</h2><p className={`mt-1 text-sm ${muted}`}>Rekap transaksi dan arus kas bulanan.</p></div>
      <button onClick={() => onAskAI(month)} className="rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 px-4 py-3 text-sm font-bold text-zinc-900 shadow-lg shadow-teal-500/20">✦ Tanya DUIT</button>
    </div>

    <div className={`flex items-center justify-between gap-3 rounded-2xl p-3 ${panel}`}>
      <button className={`rounded-xl border px-3 py-2 text-sm font-bold ${button}`} onClick={() => setMonth((value) => shiftMonth(value, -1))}>← Prev</button>
      <div className={`flex items-center gap-2 text-base font-extrabold ${text}`}><IconCalendar size={17} /> {monthLabel(month)}</div>
      <button disabled={!canGoNext} className={`rounded-xl border px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-35 ${button}`} onClick={() => setMonth((value) => shiftMonth(value, 1))}>Next →</button>
    </div>

    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      <Summary label="TOTAL PEMASUKAN" value={report.income} icon={<IconArrowUp size={16}/>} color="text-emerald-500" accent="linear-gradient(90deg,#10b981,#2dd4bf)" panel={panel}/>
      <Summary label="TOTAL PENGELUARAN" value={report.expense} icon={<IconArrowDown size={16}/>} color="text-rose-500" accent="linear-gradient(90deg,#f43f5e,#fb7185)" panel={panel}/>
      <Summary label="SALDO BERSIH" value={report.net} icon={<IconWallet size={16}/>} color={report.net >= 0 ? "text-blue-500" : "text-rose-500"} accent="linear-gradient(90deg,#3b82f6,#60a5fa)" panel={panel}/>
    </div>

    <Card accent="linear-gradient(90deg,#2dd4bf,#60a5fa)">
      <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1"><h3 className={`text-lg font-extrabold ${text}`}>Rincian Transaksi — {monthLabel(month)}</h3><span className={`text-sm ${muted}`}>{report.rows.length} transaksi · Saldo awal {formatRupiah(report.opening)}</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[830px] text-left"><thead className={`border-b ${isDark ? "border-white/10 text-slate-500" : "border-zinc-200 text-zinc-500"}`}><tr className="text-[10px] font-extrabold tracking-widest"><th className="px-2 py-3">NO</th><th className="px-2 py-3">TANGGAL</th><th className="px-2 py-3">KETERANGAN</th><th className="px-2 py-3">KATEGORI</th><th className="px-2 py-3 text-right">MASUK</th><th className="px-2 py-3 text-right">KELUAR</th><th className="px-2 py-3 text-right">SALDO</th></tr></thead><tbody>{report.rows.length ? report.rows.map(({ tx, balance }, index) => <Row key={tx.id} index={index} tx={tx} balance={balance} isDark={isDark}/>) : <tr><td colSpan={7} className={`px-2 py-14 text-center text-sm ${muted}`}>Belum ada transaksi pada bulan ini.</td></tr>}</tbody></table></div>
    </Card>
  </div>;
}

function Summary({ label, value, icon, color, accent, panel }: { label: string; value: number; icon: ReactNode; color: string; accent: string; panel: string }) { return <div className={`relative overflow-hidden rounded-2xl p-5 ${panel}`}><div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r" style={{ backgroundImage: accent }}/><p className="flex items-center gap-2 text-[10px] font-extrabold tracking-widest text-slate-500">{icon}{label}</p><p className={`mt-3 text-2xl font-extrabold ${color}`}>{value < 0 ? `-${formatRupiah(Math.abs(value))}` : formatRupiah(value)}</p></div> }
function Row({ tx, index, balance, isDark }: { tx: Transaction; index: number; balance: number; isDark: boolean }) { const line = isDark ? "border-white/10" : "border-zinc-100"; const category = tx.isCarryForward ? "Saldo Bulan Lalu" : tx.transferId ? "Transfer" : tx.goalId ? tx.type === "out" ? "Nabung Goal" : "Tarik Goal" : tx.cat; const isIn = tx.type === "in"; return <tr className={`border-b text-sm ${line}`}><td className={`px-2 py-4 ${isDark ? "text-slate-500" : "text-zinc-400"}`}>{index + 1}</td><td className="px-2 py-4 font-medium whitespace-nowrap">{dateLabel(tx.date)}</td><td className="max-w-[220px] truncate px-2 py-4 font-semibold">{tx.desc || tx.cat}</td><td className="px-2 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tx.isCarryForward ? isDark ? "bg-slate-700 text-slate-300" : "bg-zinc-100 text-zinc-600" : isIn ? "bg-teal-500/10 text-teal-600" : "bg-rose-500/10 text-rose-500"}`}>{category}</span></td><td className="px-2 py-4 text-right font-bold text-emerald-500">{isIn ? formatRupiah(tx.amt) : "–"}</td><td className="px-2 py-4 text-right font-bold text-rose-500">{!isIn ? formatRupiah(tx.amt) : "–"}</td><td className="px-2 py-4 text-right font-extrabold">{formatRupiah(balance)}</td></tr> }
