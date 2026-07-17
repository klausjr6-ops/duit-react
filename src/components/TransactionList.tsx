import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatRupiah } from "../lib/format";
import { useStore, type Transaction } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";
import { toast } from "../hooks/useToast";
import ConfirmDialog from "./ConfirmDialog";
import EditTransactionModal from "./EditTransactionModal";
import EmptyState from "./EmptyState";
import { IconArrowUp, IconArrowDown, IconTarget, IconEdit, IconTrash, IconTransfer, IconWallet, IconCalendar } from "../utils/icons";

interface Props {
  filterWallet?: string;
  onAddClick?: () => void;
}

export default function TransactionList({ filterWallet = "all", onAddClick }: Props) {
  const { txs, wallets, delTx } = useStore();
  const { isDark } = useTheme();
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);

  const filtered =
    filterWallet === "all" ? txs : txs.filter((t) => t.walletId === parseInt(filterWallet));

  const sorted = [...filtered].sort((a, b) => {
    // Tanggal terbaru di atas; untuk tanggal sama, pertahankan urutan array
    // (addTx prepend = transaksi baru di awal = paling atas)
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return 0;
  });

  const getWalletName = (id?: number) => wallets.find((w) => w.id === id)?.name || "—";

  const formatDate = (d: string) => {
    // Date keys are already in Asia/Jakarta; parse as UTC noon to avoid
    // timezone shifts, then format explicitly in Asia/Jakarta.
    const [year, month, day] = d.split("-").map(Number);
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(new Date(Date.UTC(year, month - 1, day, 12)));
  };

  const panel = isDark
    ? "bg-slate-900/60 p-6 rounded-3xl border border-white/10"
    : "bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm";
  const heading = isDark ? "text-sm font-bold text-slate-400 uppercase tracking-widest mb-4" : "text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4";
  const rowBase = isDark ? "flex justify-between items-center p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors" : "flex justify-between items-center p-3 bg-zinc-50 rounded-xl hover:bg-zinc-100 transition-colors border border-zinc-100";
  const titleText = isDark ? "text-white font-semibold text-sm truncate" : "text-zinc-900 font-semibold text-sm truncate";
  const subText = isDark ? "text-xs text-slate-400 truncate" : "text-xs text-zinc-500 truncate";

  return (
    <>
      <div className={panel}>
      <h3 className={heading}>Transaksi Terbaru</h3>
      {sorted.length === 0 ? (
        <EmptyState
          compact
          icon={<IconWallet size={32} />}
          title={filterWallet === "all" ? "Belum ada transaksi" : "Belum ada transaksi di dompet ini"}
          description={filterWallet === "all"
            ? "Catat pemasukan atau pengeluaran pertama supaya laporan, grafik, dan saldo DUIT mulai hidup."
            : "Coba pilih dompet lain atau catat transaksi baru untuk dompet ini."
          }
          tips={["Makan", "Transport", "Gaji", "Tagihan"]}
          actionLabel={onAddClick ? "Catat Transaksi" : undefined}
          onAction={onAddClick}
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {sorted.map((t) => {
              const isGoal = Boolean(t.goalId);
              const isGoalWithdrawal = Boolean(t.goalId && t.type === "in");
              const isGoalFunding = Boolean(t.goalId && t.type === "out");
              const isTransfer = Boolean(t.transferId);
              const isCF = Boolean(t.isCarryForward);
              const goalLabel = t.type === "in" ? "Tarik dari Goal" : "Nabung Goal";
              const transferLabel = t.type === "in" ? "Transfer masuk" : "Transfer keluar";
              const cfLabel = "Saldo Bulan Lalu";
              const typeIcon = isGoalFunding
                ? <IconTarget size={18} />
                : isGoalWithdrawal
                  ? <IconArrowUp size={18} />
                  : isTransfer
                    ? <IconTransfer size={18} />
                    : isCF
                      ? <IconCalendar size={18} />
                      : t.type === "in"
                        ? <IconArrowUp size={18} />
                        : <IconArrowDown size={18} />;
              const typeClass = isGoalFunding
                ? isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600"
                : isGoalWithdrawal
                  ? isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                  : isTransfer
                    ? isDark ? "bg-violet-500/20 text-violet-400" : "bg-violet-50 text-violet-600"
                    : isCF
                      ? isDark ? "bg-teal-500/20 text-teal-400" : "bg-teal-50 text-teal-600"
                      : t.type === "in"
                        ? isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                        : isDark ? "bg-rose-500/20 text-rose-400" : "bg-rose-50 text-rose-600";
              const amountClass = isGoalFunding
                ? isDark ? "text-blue-400" : "text-blue-600"
                : isGoalWithdrawal
                  ? isDark ? "text-emerald-400" : "text-emerald-600"
                  : isTransfer
                    ? isDark ? "text-violet-400" : "text-violet-600"
                    : isCF
                      ? isDark ? "text-teal-400" : "text-teal-600"
                      : t.type === "in"
                        ? isDark ? "text-emerald-400" : "text-emerald-600"
                        : isDark ? "text-rose-400" : "text-rose-600";

              return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={rowBase}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeClass}`}>
                    {typeIcon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={titleText}>{t.desc}</p>
                    <p className={subText}>
                      {formatDate(t.date)} · {isGoal ? goalLabel : isTransfer ? transferLabel : isCF ? cfLabel : t.cat} · {getWalletName(t.walletId)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`font-bold text-sm ${amountClass}`}>
                    {isGoalFunding ? "→ " : isGoalWithdrawal ? "+" : isTransfer ? (t.type === "in" ? "← " : "→ ") : isCF ? "↗ " : t.type === "in" ? "+" : "-"}
                    {formatRupiah(t.amt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTransactionToEdit(t)}
                    disabled={isGoal || isTransfer || isCF}
                    className={isDark ? "text-slate-500 hover:text-teal-400 transition-colors p-1 disabled:opacity-30 disabled:cursor-not-allowed" : "text-zinc-400 hover:text-teal-600 transition-colors p-1 disabled:opacity-30 disabled:cursor-not-allowed"}
                    aria-label={`Edit transaksi ${t.desc}`}
                    title={isGoal || isTransfer || isCF ? "Transaksi ini tidak bisa diedit" : "Edit"}
                  >
                    <IconEdit size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionToDelete(t)}
                    disabled={isCF}
                    className={isDark ? "text-slate-500 hover:text-rose-400 transition-colors p-1 disabled:opacity-30 disabled:cursor-not-allowed" : "text-zinc-400 hover:text-rose-500 transition-colors p-1 disabled:opacity-30 disabled:cursor-not-allowed"}
                    aria-label={`Hapus transaksi ${t.desc}`}
                    title={isCF ? "Transaksi ini tidak bisa dihapus" : "Hapus"}
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
      </div>
      <AnimatePresence>{transactionToEdit && <EditTransactionModal tx={transactionToEdit} onClose={()=>setTransactionToEdit(null)} />}</AnimatePresence>
      <ConfirmDialog
        open={Boolean(transactionToDelete)}
        title="Hapus Transaksi?"
        message={transactionToDelete ? (() => {
          const isTransfer = Boolean(transactionToDelete.transferId);
          const isGoal = Boolean(transactionToDelete.goalId);
          const isCF = Boolean(transactionToDelete.isCarryForward);
          let msg = `Transaksi "${transactionToDelete.desc}" sebesar ${formatRupiah(transactionToDelete.amt)} akan dihapus.`;
          if (isTransfer) msg += " Pasangan transfer juga akan dihapus.";
          if (isGoal) msg += " Saldo goal akan dikoreksi otomatis.";
          if (isCF) msg = "Transaksi Saldo Bulan Lalu tidak bisa dihapus. Entri ini dibuat otomatis.";
          return msg;
        })() : ""}
        confirmLabel="Ya, Hapus"
        onClose={() => setTransactionToDelete(null)}
        onConfirm={() => {
          if (transactionToDelete) {
            if (transactionToDelete.isCarryForward) {
              toast.error("Transaksi Saldo Bulan Lalu tidak bisa dihapus. Entri ini dibuat otomatis.");
            } else {
              delTx(transactionToDelete.id);
              toast.success("Transaksi dihapus");
            }
          }
          setTransactionToDelete(null);
        }}
        isDark={isDark}
      />
    </>
  );
}
