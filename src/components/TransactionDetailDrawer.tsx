import { AnimatePresence, motion } from "framer-motion";
import { useRef } from "react";
import type { Transaction } from "../lib/store";
import { formatRupiah } from "../lib/format";
import { useTheme } from "../lib/ThemeContext";
import { useModalDialog } from "../hooks/useModalDialog";
import { IconArrowDown, IconArrowUp, IconCalendar, IconClose, IconEdit, IconTarget, IconTransfer, IconTrash } from "../utils/icons";

interface Props {
  tx: Transaction | null;
  walletName: string;
  onClose: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export default function TransactionDetailDrawer({ tx, walletName, onClose, onEdit, onDelete }: Props) {
  const { isDark } = useTheme();
  const closeRef = useRef<HTMLButtonElement>(null);
  const { dialogRef, onDialogKeyDown } = useModalDialog(Boolean(tx), onClose, closeRef);
  if (!tx) return null;

  const isCF = Boolean(tx.isCarryForward);
  const isTransfer = Boolean(tx.transferId);
  const isGoal = Boolean(tx.goalId);
  const locked = isCF || isTransfer || isGoal;
  const label = isCF ? "Saldo Bulan Lalu" : isTransfer ? (tx.type === "in" ? "Transfer Masuk" : "Transfer Keluar") : isGoal ? (tx.type === "in" ? "Penarikan Goal" : "Tabungan Goal") : tx.type === "in" ? "Pemasukan" : "Pengeluaran";
  const icon = isCF ? <IconCalendar size={22} /> : isTransfer ? <IconTransfer size={22} /> : isGoal ? <IconTarget size={22} /> : tx.type === "in" ? <IconArrowUp size={22} /> : <IconArrowDown size={22} />;
  const accent = tx.type === "in" ? "text-emerald-500" : "text-rose-500";
  const panel = isDark ? "border-white/10 bg-slate-900 text-white" : "border-zinc-200 bg-white text-zinc-900";
  const muted = isDark ? "text-slate-400" : "text-zinc-500";

  return <AnimatePresence>{tx && <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[75] bg-slate-950/55 backdrop-blur-sm" />
    <motion.aside ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="transaction-detail-title" onKeyDown={onDialogKeyDown} initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 280 }} className={`fixed inset-x-0 bottom-0 z-[76] max-h-[88vh] overflow-y-auto rounded-t-[28px] border p-6 shadow-2xl sm:inset-y-0 sm:left-auto sm:w-full sm:max-w-md sm:rounded-none ${panel}`}>
      <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-current opacity-15 sm:hidden" />
      <div className="flex items-start justify-between gap-4"><div><p className={`text-[10px] font-extrabold tracking-[0.14em] ${muted}`}>DETAIL TRANSAKSI</p><h2 id="transaction-detail-title" className="mt-1 text-xl font-extrabold">{label}</h2></div><button ref={closeRef} onClick={onClose} aria-label="Tutup detail transaksi" className={`rounded-xl p-2 ${isDark ? "text-slate-400 hover:bg-white/10 hover:text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"}`}><IconClose size={20}/></button></div>
      <div className={`mt-6 rounded-2xl border p-5 ${isDark ? "border-white/10 bg-white/5" : "border-zinc-100 bg-zinc-50"}`}><div className={`flex items-center gap-3 ${accent}`}><span className="rounded-xl bg-current/10 p-3">{icon}</span><div><p className="text-2xl font-extrabold">{tx.type === "in" ? "+" : "-"}{formatRupiah(tx.amt)}</p><p className={`mt-1 text-xs ${muted}`}>{tx.desc || tx.cat}</p></div></div></div>
      <dl className={`mt-6 divide-y ${isDark ? "divide-white/10" : "divide-zinc-100"}`}><Detail label="Tanggal" value={formatDate(tx.date)} muted={muted}/><Detail label="Kategori" value={tx.cat || "Lainnya"} muted={muted}/><Detail label="Dompet" value={walletName} muted={muted}/><Detail label="Status" value={label} muted={muted}/>{tx.desc && <Detail label="Keterangan" value={tx.desc} muted={muted}/>}</dl>
      {locked ? <div className={`mt-6 rounded-2xl border p-4 text-sm leading-relaxed ${isDark ? "border-amber-400/20 bg-amber-400/10 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{isCF ? "Entri Saldo Bulan Lalu dibuat otomatis sebagai informasi saldo awal bulan dan tidak dapat diedit." : isTransfer ? "Transaksi transfer dikelola sebagai pasangan antar-dompet. Kelola atau koreksi lewat menu dompet." : "Transaksi goal dikelola melalui fitur Nabung atau Tarik Goal agar saldo goal tetap akurat."}</div> : <div className="mt-7 grid grid-cols-2 gap-3"><button onClick={() => onEdit(tx)} className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold ${isDark ? "border-white/10 bg-white/5 text-white hover:bg-white/10" : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"}`}><IconEdit size={16}/>Edit</button><button onClick={() => onDelete(tx)} className="flex items-center justify-center gap-2 rounded-xl bg-rose-500 py-3 text-sm font-bold text-white hover:bg-rose-400"><IconTrash size={16}/>Hapus</button></div>}
    </motion.aside>
  </>}</AnimatePresence>;
}
function Detail({ label, value, muted }: { label: string; value: string; muted: string }) { return <div className="flex gap-5 py-3.5"><dt className={`w-28 shrink-0 text-xs ${muted}`}>{label}</dt><dd className="text-sm font-semibold">{value}</dd></div>; }
