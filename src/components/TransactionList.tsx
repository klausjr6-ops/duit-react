import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatRupiah } from "../lib/format";
import { useStore, type Transaction } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
  filterWallet?: string;
}

export default function TransactionList({ filterWallet = "all" }: Props) {
  const { txs, wallets, delTx } = useStore();
  const { isDark } = useTheme();
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  const filtered =
    filterWallet === "all" ? txs : txs.filter((t) => t.walletId === parseInt(filterWallet));

  const sorted = [...filtered].sort((a, b) => (a.date < b.date ? 1 : -1));

  const getWalletName = (id?: number) => wallets.find((w) => w.id === id)?.name || "—";
  const getWalletIcon = (id?: number) => wallets.find((w) => w.id === id)?.icon || "💰";

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const panel = isDark
    ? "bg-slate-900/60 p-6 rounded-3xl border border-white/10"
    : "bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm";
  const heading = isDark ? "text-sm font-bold text-slate-400 uppercase tracking-widest mb-4" : "text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4";
  const emptyText = isDark ? "text-center text-slate-500 py-8 text-sm" : "text-center text-zinc-500 py-8 text-sm";
  const rowBase = isDark ? "flex justify-between items-center p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors" : "flex justify-between items-center p-3 bg-zinc-50 rounded-xl hover:bg-zinc-100 transition-colors border border-zinc-100";
  const titleText = isDark ? "text-white font-semibold text-sm truncate" : "text-zinc-900 font-semibold text-sm truncate";
  const subText = isDark ? "text-xs text-slate-400 truncate" : "text-xs text-zinc-500 truncate";

  return (
    <>
      <div className={panel}>
      <h3 className={heading}>Transaksi Terbaru</h3>
      {sorted.length === 0 ? (
        <p className={emptyText}>Belum ada transaksi</p>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {sorted.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={rowBase}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                      t.goalId
                        ? isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600"
                        : t.type === "in"
                          ? isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                          : isDark ? "bg-rose-500/20 text-rose-400" : "bg-rose-50 text-rose-600"
                    }`}
                  >
                    {t.goalId ? "🎯" : t.type === "in" ? "⬆️" : "⬇️"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={titleText}>{t.desc}</p>
                    <p className={subText}>
                      {formatDate(t.date)} · {t.goalId ? "Transfer ke Goal" : t.cat} · {getWalletIcon(t.walletId)}{" "}
                      {getWalletName(t.walletId)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`font-bold text-sm ${
                      t.goalId
                        ? isDark ? "text-blue-400" : "text-blue-600"
                        : t.type === "in"
                          ? isDark ? "text-emerald-400" : "text-emerald-600"
                          : isDark ? "text-rose-400" : "text-rose-600"
                    }`}
                  >
                    {t.goalId ? "→" : t.type === "in" ? "+" : "-"}
                    {formatRupiah(t.amt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTransactionToDelete(t)}
                    className={isDark ? "text-slate-500 hover:text-rose-400 transition-colors p-1" : "text-zinc-400 hover:text-rose-500 transition-colors p-1"}
                    aria-label={`Hapus transaksi ${t.desc}`}
                    title="Hapus"
                  >
                    🗑️
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      </div>
      <ConfirmDialog
        open={Boolean(transactionToDelete)}
        title="Hapus Transaksi?"
        message={transactionToDelete ? `Transaksi “${transactionToDelete.desc}” sebesar ${formatRupiah(transactionToDelete.amt)} akan dihapus.` : ""}
        confirmLabel="Ya, Hapus"
        onClose={() => setTransactionToDelete(null)}
        onConfirm={() => {
          if (transactionToDelete) delTx(transactionToDelete.id);
          setTransactionToDelete(null);
        }}
        isDark={isDark}
      />
    </>
  );
}
