import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";
import { formatRupiah } from "../lib/format";
import type { Goal } from "../lib/store";
import { useModalDialog } from "../hooks/useModalDialog";
import { toast } from "../hooks/useToast";
import { IconClose, getGoalIcon } from "../utils/icons";

interface Props {
  goal: Goal;
  onClose: () => void;
}

export default function WithdrawFundModal({ goal, onClose }: Props) {
  const { wallets, withdrawGoal } = useStore();
  const { isDark } = useTheme();
  const [walletId, setWalletId] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { dialogRef, onDialogKeyDown } = useModalDialog(true, onClose, inputRef);

  const available = Math.max(goal.current, 0);

  const formatInputRupiah = (value: string) => {
    const number = value.replace(/\D/g, "");
    return number ? parseInt(number, 10).toLocaleString("id-ID") : "";
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const parsedAmount = parseInt(amount.replace(/\D/g, ""), 10);
    if (!walletId) {
      setError("Pilih dompet tujuan terlebih dahulu.");
      return;
    }
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Jumlah penarikan tidak valid.");
      return;
    }
    if (parsedAmount > available) {
      setError(`Maksimal penarikan adalah ${formatRupiah(available)}.`);
      return;
    }

    setSaving(true);
    const result = await withdrawGoal(goal.id, parseInt(walletId, 10), parsedAmount);
    setSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    toast.success("Dana berhasil ditarik dari goal");
    onClose();
  };

  const panelClass = isDark
    ? "w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-xl"
    : "w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl";
  const titleClass = isDark ? "text-lg font-bold text-white" : "text-lg font-bold text-zinc-900";
  const closeClass = isDark
    ? "flex h-8 w-8 items-center justify-center text-3xl leading-none text-slate-400 hover:text-white disabled:opacity-40"
    : "flex h-8 w-8 items-center justify-center text-3xl leading-none text-zinc-500 hover:text-zinc-900 disabled:opacity-40";
  const labelClass = isDark
    ? "text-[11px] font-bold uppercase tracking-wider text-slate-500"
    : "text-[11px] font-bold uppercase tracking-wider text-zinc-500";
  const inputClass = isDark
    ? "mt-1 w-full rounded-lg border border-white/10 bg-slate-950 p-3 text-sm text-white focus:border-teal-400 focus:outline-none"
    : "mt-1 w-full rounded-lg border border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-900 focus:border-teal-500 focus:bg-white focus:outline-none";
  const mutedClass = isDark ? "text-sm text-slate-400" : "text-sm text-zinc-500";
  const infoClass = isDark
    ? "rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-slate-300"
    : "rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-zinc-600";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="withdraw-fund-dialog-title"
        onKeyDown={onDialogKeyDown}
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(event) => event.stopPropagation()}
        className={panelClass}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-500">TARIK DANA GOAL</p>
            <h2 id="withdraw-fund-dialog-title" className={titleClass}>Tarik dari Goal</h2>
          </div>
          <button
            type="button"
            aria-label="Tutup modal tarik dari goal"
            onClick={onClose}
            disabled={saving}
            className={closeClass}
          >
            <IconClose size={20} />
          </button>
        </div>

        <div className={infoClass}>
          <p className="font-semibold">{getGoalIcon(goal.icon, 16)} {goal.name}</p>
          <p className="mt-1">
            Tersedia {formatRupiah(available)} · target {formatRupiah(goal.target)}
          </p>
        </div>

        <p className={`mb-4 mt-4 ${mutedClass}`}>
          Dana akan dikembalikan ke dompet pilihanmu. Saldo Goal berkurang dan dicatat sebagai pemasukan di dompet.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="withdraw-wallet" className={labelClass}>Dompet Tujuan</label>
            <select
              id="withdraw-wallet"
              value={walletId}
              onChange={(event) => setWalletId(event.target.value)}
              disabled={saving}
              className={inputClass}
            >
              <option value="">-- Pilih Dompet --</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name} · {formatRupiah(wallet.balance)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="withdraw-amount" className={labelClass}>Jumlah Penarikan</label>
            <input
              ref={inputRef}
              id="withdraw-amount"
              type="text"
              inputMode="numeric"
              value={amount ? `Rp ${formatInputRupiah(amount)}` : ""}
              onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))}
              placeholder="Rp 0"
              disabled={saving || available <= 0}
              className={inputClass}
            />
            {available > 0 && (
              <button
                type="button"
                onClick={() => setAmount(String(available))}
                className={isDark ? "mt-1 text-xs text-amber-400 hover:underline" : "mt-1 text-xs text-amber-600 hover:underline"}
              >
                Tarik semua ({formatRupiah(available)})
              </button>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-500">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving || available <= 0 || wallets.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 py-3 font-bold text-zinc-900 transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-900/30 border-t-zinc-900" />
                Memproses...
              </>
            ) : available <= 0 ? (
              "Saldo Goal Kosong"
            ) : (
              "Tarik ke Dompet"
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
