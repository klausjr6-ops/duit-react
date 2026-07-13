import { useState } from "react";
import { motion } from "framer-motion";
import { useStore, type Wallet } from "../lib/store";
import { formatRupiah } from "../lib/format";
import { useTheme } from "../lib/ThemeContext";
import { useModalDialog } from "../hooks/useModalDialog";
import ConfirmDialog from "./ConfirmDialog";
import EditWalletModal from "./EditWalletModal";
import TransferModal from "./TransferModal";

interface Props {
  onClose: () => void;
}

const ICONS = ["💳", "💵", "💰", "🏦", "📱", "💎", "🪙", "💸"];

export default function WalletManager({ onClose }: Props) {
  const { wallets, addWallet, delWallet } = useStore();
  const { isDark } = useTheme();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("💳");
  const [initBalance, setInitBalance] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [walletToDelete, setWalletToDelete] = useState<Wallet | null>(null);
  const [walletToEdit, setWalletToEdit] = useState<Wallet | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferFrom, setTransferFrom] = useState<Wallet | undefined>(undefined);
  const { dialogRef, onDialogKeyDown } = useModalDialog(true, onClose);

  const handleAdd = () => {
    setError(null);
    if (!name.trim()) {
      setError("Nama dompet harus diisi.");
      return;
    }
    if (wallets.some((wallet) => wallet.name.trim().toLowerCase() === name.trim().toLowerCase())) {
      setError("Nama dompet sudah digunakan.");
      return;
    }
    addWallet({
      name: name.trim(),
      balance: parseInt(initBalance.replace(/\D/g, "") || "0"),
      icon,
      color: "from-emerald-500/20 to-emerald-500/5",
    });
    setName(""); setIcon("💳"); setInitBalance("");
  };

  const openTransfer = (from?: Wallet) => {
    setTransferFrom(from);
    setShowTransfer(true);
  };

  const panel = isDark
    ? "bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto"
    : "bg-white border border-zinc-200 rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto shadow-xl";
  const titleCls = isDark ? "text-xl font-bold text-white" : "text-xl font-bold text-zinc-900";
  const closeCls = isDark ? "text-slate-400 hover:text-white text-3xl leading-none w-8 h-8 flex items-center justify-center" : "text-zinc-500 hover:text-zinc-900 text-3xl leading-none w-8 h-8 flex items-center justify-center";
  const itemCls = isDark ? "flex items-center justify-between p-3 bg-white/5 rounded-xl" : "flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl";
  const nameCls = isDark ? "font-semibold text-white text-sm" : "font-semibold text-zinc-900 text-sm";
  const labelCls = isDark ? "text-[11px] font-bold text-slate-500 uppercase" : "text-[11px] font-bold text-zinc-500 uppercase";
  const sectionLabel = isDark ? "text-xs font-bold text-slate-400 uppercase tracking-wider" : "text-xs font-bold text-zinc-500 uppercase tracking-wider";
  const inputCls = isDark
    ? "w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-teal-400"
    : "w-full mt-1 bg-white border border-zinc-300 rounded-lg p-3 text-sm text-zinc-900 focus:outline-none focus:border-teal-500";
  const divider = isDark ? "border-t border-white/10 pt-4 space-y-3" : "border-t border-zinc-200 pt-4 space-y-3";
  const iconBtn = (active: boolean) => active
    ? "text-xl p-2 rounded-lg border transition-all border-teal-400 bg-teal-500/10"
    : isDark
      ? "text-xl p-2 rounded-lg border transition-all border-white/10 hover:border-white/30"
      : "text-xl p-2 rounded-lg border transition-all border-zinc-200 hover:border-zinc-400 bg-white";

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-dialog-title"
        onKeyDown={onDialogKeyDown}
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className={panel}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="wallet-dialog-title" className={titleCls}>Dompet</h2>
          <button aria-label="Tutup dompet" onClick={onClose} className={closeCls}>×</button>
        </div>

        {/* Transfer button */}
        {wallets.length >= 2 && (
          <button
            type="button"
            onClick={() => openTransfer()}
            className="w-full mb-4 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-400/30 hover:border-violet-400 text-violet-400 font-semibold text-sm py-2.5 rounded-xl transition-all hover:brightness-110"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>
            Transfer Antar Dompet
          </button>
        )}

        <div className="space-y-2 mb-6">
          {wallets.length === 0 ? (
            <p className={`text-center py-4 text-sm ${isDark ? "text-slate-500" : "text-zinc-500"}`}>Belum ada dompet</p>
          ) : (
            wallets.map((w) => (
              <div key={w.id} className={itemCls}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{w.icon}</span>
                  <div>
                    <p className={nameCls}>{w.name}</p>
                    <p className="text-xs text-emerald-600 font-semibold">{formatRupiah(w.balance)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                {wallets.length >= 2 && (
                  <button
                    type="button"
                    aria-label={`Transfer dari ${w.name}`}
                    onClick={() => openTransfer(w)}
                    className={`${isDark ? "text-slate-500 hover:text-violet-400" : "text-zinc-400 hover:text-violet-500"} p-2`}
                    title="Transfer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Edit dompet ${w.name}`}
                  onClick={() => setWalletToEdit(w)}
                  className={`${isDark ? "text-slate-500 hover:text-teal-400" : "text-zinc-400 hover:text-teal-600"} p-2`}
                >✏️</button>
                <button
                  type="button"
                  aria-label={`Hapus dompet ${w.name}`}
                  onClick={() => setWalletToDelete(w)}
                  className={`${isDark ? "text-slate-500 hover:text-rose-400" : "text-zinc-400 hover:text-rose-500"} p-2`}
                >🗑️</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={divider}>
          <p className={sectionLabel}>Tambah Dompet Baru</p>
          <div>
            <label className={labelCls}>Nama</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Misal: Mandiri, GoPay, dll" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Icon</label>
            <div className="grid grid-cols-8 gap-2 mt-1">
              {ICONS.map((ic) => (
                <button key={ic} onClick={() => setIcon(ic)} className={iconBtn(icon === ic)}>{ic}</button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Saldo Awal (Rp)</label>
            <input type="text" inputMode="numeric" value={initBalance ? `Rp ${parseInt(initBalance).toLocaleString("id-ID")}` : ""} onChange={(e) => setInitBalance(e.target.value.replace(/\D/g, ""))} placeholder="Rp 0" className={inputCls} />
          </div>
          {error && (
            <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-500">{error}</p>
          )}
          <button type="button" onClick={handleAdd} className="w-full bg-gradient-to-br from-teal-400 to-blue-500 text-zinc-900 font-bold py-3 rounded-xl hover:brightness-105 transition-all">
            + Tambah Dompet
          </button>
        </div>
      </motion.div>
      </motion.div>
      {walletToEdit && <EditWalletModal wallet={walletToEdit} onClose={()=>setWalletToEdit(null)} />}
      {showTransfer && <TransferModal fromWallet={transferFrom} onClose={() => { setShowTransfer(false); setTransferFrom(undefined); }} />}
      <ConfirmDialog
        open={Boolean(walletToDelete)}
        title="Hapus Dompet?"
        message={walletToDelete ? `Dompet "${walletToDelete.name}" akan dihapus. Transaksi yang sudah tercatat tetap ada di riwayat.` : ""}
        confirmLabel="Ya, Hapus"
        onClose={() => setWalletToDelete(null)}
        onConfirm={() => {
          if (walletToDelete) delWallet(walletToDelete.id);
          setWalletToDelete(null);
        }}
        isDark={isDark}
      />
    </>
  );
}
