import { useState } from "react";
import { motion } from "framer-motion";
import { useStore, type Wallet } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";
import { useModalDialog } from "../hooks/useModalDialog";
import { toast } from "../hooks/useToast";
import { WALLET_COLORS, resolveColorKey } from "../utils/walletColors";
import { WALLET_ICONS, IconClose } from "../utils/icons";

interface Props { wallet: Wallet; onClose: () => void; }

export default function EditWalletModal({ wallet, onClose }: Props) {
  const { updateWallet, txs } = useStore();
  const { isDark } = useTheme();
  const [name, setName] = useState(wallet.name);
  const [icon, setIcon] = useState(wallet.icon);
  const [colorKey, setColorKey] = useState(resolveColorKey(wallet.color));
  // NOTE: wallet.balance is derived (from walletsWithBalance: base balance + net tx amount).
  // To recover the original "initial balance", we subtract net tx amount.
  // This works but is fragile — if walletsWithBalance calculation ever changes, this breaks.
  const netTxAmount = txs.filter(t => t.walletId === wallet.id && !t.transferId).reduce((s, t) => s + (t.type === "in" ? t.amt : -t.amt), 0);
  const [initialBalance, setInitialBalance] = useState(String(wallet.balance - netTxAmount));
  const [error, setError] = useState<string | null>(null);
  const { dialogRef, onDialogKeyDown } = useModalDialog(true, onClose);

  const handleSubmit = () => {
    setError(null);
    if (!name.trim()) { setError("Nama dompet harus diisi."); return; }
    const bal = parseInt(initialBalance.replace(/\D/g, "") || "0", 10);
    if (Number.isNaN(bal) || bal < 0) { setError("Saldo awal tidak valid."); return; }
    updateWallet(wallet.id, { name: name.trim(), icon, color: colorKey, balance: bal });
    toast.success(`Dompet "${name.trim()}" berhasil diperbarui`);
    onClose();
  };

  const inputCls = isDark ? "w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-teal-400" : "w-full mt-1 bg-zinc-50 border border-zinc-300 rounded-lg p-3 text-sm text-zinc-900 focus:outline-none focus:border-teal-500";
  const labelCls = isDark ? "text-[11px] font-bold text-slate-500 uppercase tracking-wider" : "text-[11px] font-bold text-zinc-500 uppercase tracking-wider";
  const panel = isDark ? "bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full" : "bg-white border border-zinc-200 rounded-3xl p-6 max-w-md w-full shadow-xl";
  const closeCls = isDark ? "text-slate-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900";

  const formatRp = (v: string) => { const n = v.replace(/\D/g, ""); return n ? parseInt(n).toLocaleString("id-ID") : ""; };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div ref={dialogRef} role="dialog" aria-modal="true" onKeyDown={onDialogKeyDown} initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={e => e.stopPropagation()} className={panel}>
        <div className="flex justify-between items-center mb-5"><h2 className={isDark ? "text-xl font-bold text-white" : "text-xl font-bold text-zinc-900"}>Edit Dompet</h2><button onClick={onClose} className={closeCls}><IconClose size={20} /></button></div>
        <div className="space-y-4">
          <div><label className={labelCls}>Nama Dompet</label><input value={name} onChange={e => setName(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Icon</label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {WALLET_ICONS.map((ic) => (
                <button
                  key={ic.key}
                  type="button"
                  onClick={() => setIcon(ic.key)}
                  title={ic.label}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                    icon === ic.key
                      ? "border-teal-400 bg-teal-500/10 text-teal-500"
                      : isDark
                        ? "border-white/10 text-slate-400 hover:border-white/30"
                        : "border-zinc-200 text-zinc-500 hover:border-zinc-400 bg-white"
                  }`}
                >
                  {ic.icon}
                  <span className="text-[9px] font-semibold">{ic.label}</span>
                </button>
              ))}
            </div>
            {/* Fallback for legacy emoji icons not in the new list */}
            {!WALLET_ICONS.some((ic) => ic.key === icon) && (
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-xs ${isDark ? "text-slate-500" : "text-zinc-500"}`}>Icon lama:</span>
                <span className="text-xl">{icon}</span>
                <button
                  type="button"
                  onClick={() => setIcon(WALLET_ICONS[0].key)}
                  className="text-[10px] text-teal-500 font-semibold"
                >
                  Ganti ke baru
                </button>
              </div>
            )}
          </div>
          <div><label className={labelCls}>Warna</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {WALLET_COLORS.map((c) => {
                const hex = c.hex;
                const isActive = colorKey === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    title={c.label}
                    onClick={() => setColorKey(c.key)}
                    className={`h-8 w-8 rounded-full transition-all flex items-center justify-center ${
                      isActive
                        ? "ring-2 ring-offset-2 scale-110"
                        : "hover:scale-110 opacity-60 hover:opacity-100"
                    } ${isDark ? "ring-offset-slate-900" : "ring-offset-white"}`}
                    style={{ backgroundColor: hex }}
                  >
                    {isActive && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div><label className={labelCls}>Saldo Awal</label>
            <input type="text" inputMode="numeric" value={initialBalance ? `Rp ${formatRp(initialBalance)}` : ""} onChange={e => setInitialBalance(e.target.value.replace(/\D/g, ""))} className={inputCls} />
            <p className={isDark ? "text-xs text-slate-500 mt-1" : "text-xs text-zinc-500 mt-1"}>Mengubah saldo awal akan mempengaruhi Total Saldo historis.</p>
          </div>
          {error && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-500">{error}</p>}
          <button onClick={handleSubmit} className="w-full bg-gradient-to-br from-teal-400 to-blue-500 text-zinc-900 font-bold py-3 rounded-xl hover:brightness-105">Simpan Perubahan</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
