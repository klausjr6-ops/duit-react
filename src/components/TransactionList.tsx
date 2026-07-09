import { motion, AnimatePresence } from "framer-motion";
import { formatRupiah } from "../lib/format";
import { useStore } from "../lib/store";

interface Props {
  filterWallet?: string;
}

export default function TransactionList({ filterWallet = "all" }: Props) {
  const { txs, wallets, delTx } = useStore();

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

  return (
    <div className="bg-slate-900/60 p-6 rounded-3xl border border-white/10">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
        Transaksi Terbaru
      </h3>
      {sorted.length === 0 ? (
        <p className="text-center text-slate-500 py-8 text-sm">Belum ada transaksi</p>
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
                className="flex justify-between items-center p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                      t.type === "in"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-rose-500/20 text-rose-400"
                    }`}
                  >
                    {t.type === "in" ? "⬆️" : "⬇️"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-semibold text-sm truncate">{t.desc}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {formatDate(t.date)} · {t.cat} · {getWalletIcon(t.walletId)}{" "}
                      {getWalletName(t.walletId)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`font-bold text-sm ${
                      t.type === "in" ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {t.type === "in" ? "+" : "-"}
                    {formatRupiah(t.amt)}
                  </span>
                  <button
                    onClick={() => {
                      if (confirm("Hapus transaksi ini?")) delTx(t.id);
                    }}
                    className="text-slate-500 hover:text-rose-400 transition-colors p-1"
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
  );
}