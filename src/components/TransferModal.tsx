import { useState } from "react";
import { motion } from "framer-motion";
import { useStore, type Wallet } from "../lib/store";
import { formatRupiah } from "../lib/format";
import { useTheme } from "../lib/ThemeContext";
import { useModalDialog } from "../hooks/useModalDialog";

interface Props {
  /** Pre-select source wallet. */
  fromWallet?: Wallet;
  onClose: () => void;
}

export default function TransferModal({ fromWallet, onClose }: Props) {
  const { wallets, transferWallet } = useStore();
  const { isDark } = useTheme();
  const [fromId, setFromId] = useState<string>(fromWallet ? String(fromWallet.id) : "");
  const [toId, setToId] = useState<string>("");
  const [amt, setAmt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { dialogRef, onDialogKeyDown } = useModalDialog(true, onClose);

  const handleTransfer = () => {
    setError(null);
    if (!fromId || !toId) {
      setError("Pilih dompet asal dan tujuan.");
      return;
    }
    if (fromId === toId) {
      setError("Dompet asal dan tujuan tidak boleh sama.");
      return;
    }
    const numAmt = parseInt(amt.replace(/\D/g, ""), 10);
    if (Number.isNaN(numAmt) || numAmt <= 0) {
      setError("Jumlah transfer tidak valid.");
      return;
    }
    const source = wallets.find((w) => w.id === parseInt(fromId, 10));
    if (source && numAmt > source.balance) {
      setError(`Saldo ${source.name} tidak mencukupi. Saldo: ${formatRupiah(source.balance)}`);
      return;
    }
    const result = transferWallet(parseInt(fromId, 10), parseInt(toId, 10), numAmt);
    if (!result.ok) {
      setError(result.message || "Transfer gagal.");
      return;
    }
    onClose();
  };

  const swapWallets = () => {
    setFromId(toId);
    setToId(fromId);
  };

  const panel = isDark
    ? "bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full"
    : "bg-white border border-zinc-200 rounded-3xl p-6 max-w-md w-full shadow-xl";
  const titleCls = isDark ? "text-xl font-bold text-white" : "text-xl font-bold text-zinc-900";
  const closeCls = isDark
    ? "text-slate-400 hover:text-white text-3xl leading-none w-8 h-8 flex items-center justify-center"
    : "text-zinc-500 hover:text-zinc-900 text-3xl leading-none w-8 h-8 flex items-center justify-center";
  const inputCls = isDark
    ? "w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-teal-400"
    : "w-full mt-1 bg-white border border-zinc-300 rounded-lg p-3 text-sm text-zinc-900 focus:outline-none focus:border-teal-500";
  const labelCls = isDark
    ? "text-[11px] font-bold text-slate-500 uppercase tracking-wider"
    : "text-[11px] font-bold text-zinc-500 uppercase tracking-wider";
  const mutedCls = isDark ? "text-xs text-slate-500" : "text-xs text-zinc-500";
  const swapBtnCls = isDark
    ? "mx-auto flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-slate-800 text-slate-400 hover:text-teal-400 hover:border-teal-400 transition-colors"
    : "mx-auto flex items-center justify-center w-10 h-10 rounded-full border border-zinc-200 bg-zinc-50 text-zinc-400 hover:text-teal-600 hover:border-teal-500 transition-colors";

  const formatInputRupiah = (val: string) => {
    const num = val.replace(/\D/g, "");
    return num ? parseInt(num).toLocaleString("id-ID") : "";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Transfer antar dompet"
        onKeyDown={onDialogKeyDown}
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className={panel}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className={titleCls}>Transfer Antar Dompet</h2>
          <button aria-label="Tutup" onClick={onClose} className={closeCls}>
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* From wallet */}
          <div>
            <label className={labelCls}>Dari Dompet</label>
            <select
              value={fromId}
              onChange={(e) => {
                setFromId(e.target.value);
                if (toId === e.target.value) setToId("");
              }}
              className={inputCls}
            >
              <option value="">-- Pilih Dompet --</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} — {formatRupiah(w.balance)}
                </option>
              ))}
            </select>
          </div>

          {/* Swap button */}
          <div className="flex items-center -my-1">
            <button
              type="button"
              onClick={swapWallets}
              className={swapBtnCls}
              aria-label="Tukar dompet asal dan tujuan"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 16V4m0 0L3 8m4-4l4 4" />
                <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          {/* To wallet */}
          <div>
            <label className={labelCls}>Ke Dompet</label>
            <select
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              className={inputCls}
            >
              <option value="">-- Pilih Dompet --</option>
              {wallets
                .filter((w) => !fromId || w.id !== parseInt(fromId, 10))
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} — {formatRupiah(w.balance)}
                  </option>
                ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className={labelCls}>Jumlah (Rp)</label>
            <input
              type="text"
              inputMode="numeric"
              value={amt ? `Rp ${formatInputRupiah(amt)}` : ""}
              onChange={(e) => setAmt(e.target.value.replace(/\D/g, ""))}
              placeholder="Rp 0"
              className={inputCls}
            />
            <p className={mutedCls}>Contoh: 500.000</p>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-500"
            >
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleTransfer}
            className="w-full bg-gradient-to-br from-teal-400 to-blue-500 text-zinc-900 font-bold py-3 rounded-xl hover:brightness-105 transition-all"
          >
            Transfer Sekarang
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
