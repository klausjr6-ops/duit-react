import { useState } from "react";
import { motion } from "framer-motion";
import { useStore, type Wallet } from "../lib/store";
import { formatRupiah } from "../lib/format";
import { useTheme } from "../lib/ThemeContext";
import { useModalDialog } from "../hooks/useModalDialog";
import { toast } from "../hooks/useToast";
import ConfirmDialog from "./ConfirmDialog";
import EditWalletModal from "./EditWalletModal";
import TransferModal from "./TransferModal";
import { getWalletHex, WALLET_COLORS } from "../utils/walletColors";
import { WALLET_ICONS, getWalletIcon, IconTransfer, IconTrash, IconClose } from "../utils/icons";

interface Props {
  onClose: () => void;
}

export default function WalletManager({ onClose }: Props) {
  const { wallets, addWallet, delWallet } = useStore();
  const { isDark } = useTheme();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(WALLET_ICONS[0].key);
  const [color, setColor] = useState<string>(WALLET_COLORS[0].key);
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
      color,
    });
    toast.success(`Dompet "${name.trim()}" berhasil ditambahkan`);
    setName(""); setIcon(WALLET_ICONS[0].key); setColor(WALLET_COLORS[0].key); setInitBalance("");
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
  const labelCls = isDark ? "text-[11px] font-bold text-slate-500 uppercase" : "text-[11px] font-bold text-zinc-500 uppercase";
  const sectionLabel = isDark ? "text-xs font-bold text-slate-400 uppercase tracking-wider" : "text-xs font-bold text-zinc-500 uppercase tracking-wider";
  const inputCls = isDark
    ? "w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-teal-400"
    : "w-full mt-1 bg-white border border-zinc-300 rounded-lg p-3 text-sm text-zinc-900 focus:outline-none focus:border-teal-500";
  const divider = isDark ? "border-t border-white/10 pt-4 space-y-3" : "border-t border-zinc-200 pt-4 space-y-3";

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
          <button aria-label="Tutup dompet" onClick={onClose} className={closeCls}><IconClose size={20} /></button>
        </div>

        {wallets.length >= 2 && (
          <button
            type="button"
            onClick={() => openTransfer()}
            className="w-full mb-4 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-400/30 hover:border-violet-400 text-violet-400 font-semibold text-sm py-2.5 rounded-xl transition-all hover:brightness-110"
          >
            <IconTransfer size={16} />
            Transfer Antar Dompet
          </button>
        )}

        <div className="space-y-2 mb-6">
          {wallets.length === 0 ? (
            <p className={`text-center py-4 text-sm ${isDark ? "text-slate-500" : "text-zinc-500"}`}>Belum ada dompet</p>
          ) : (
            wallets.map((w) => {
              const hex = getWalletHex(w.color);
              return (
              <div
                key={w.id}
                onClick={() => setWalletToEdit(w)}
                className="flex items-center justify-between p-3 rounded-xl cursor-pointer hover:brightness-110 transition-all"
                style={{
                  background: isDark ? `linear-gradient(135deg, ${hex}14, ${hex}08)` : `linear-gradient(135deg, ${hex}10, ${hex}06)`,
                  border: `1px solid ${hex}30`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="text-xl" style={{ color: hex }}>{getWalletIcon(w.icon, 24)}</div>
                  <div>
                    <p className={isDark ? "font-semibold text-white text-sm" : "font-semibold text-zinc-900 text-sm"}>{w.name}</p>
                    <p className="text-xs font-semibold" style={{ color: hex }}>{formatRupiah(w.balance)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                {wallets.length >= 2 && (
                  <button
                    type="button"
                    aria-label={`Transfer dari ${w.name}`}
                    onClick={(e) => { e.stopPropagation(); openTransfer(w); }}
                    className={`${isDark ? "text-slate-500 hover:text-violet-400" : "text-zinc-400 hover:text-violet-500"} p-2`}
                    title="Transfer"
                  >
                    <IconTransfer size={16} />
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Hapus dompet ${w.name}`}
                  onClick={(e) => { e.stopPropagation(); setWalletToDelete(w); }}
                  className={`${isDark ? "text-slate-500 hover:text-rose-400" : "text-zinc-400 hover:text-rose-500"} p-2`}
                >
                  <IconTrash size={16} />
                </button>
                </div>
              </div>
              );
            })
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
            <div className="grid grid-cols-4 gap-2 mt-1">
              {WALLET_ICONS.map((ic) => (
                <button
                  key={ic.key}
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
          </div>
          <div>
            <label className={labelCls}>Warna</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {WALLET_COLORS.map((c) => {
                const hex = c.hex;
                const isActive = color === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    title={c.label}
                    onClick={() => setColor(c.key)}
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
        message={walletToDelete ? `Dompet "${walletToDelete.name}" dan semua transaksinya akan dihapus. Transfer & tabungan terkait juga akan dikoreksi.` : ""}
        confirmLabel="Ya, Hapus"
        onClose={() => setWalletToDelete(null)}
        onConfirm={() => {
          if (walletToDelete) {
            delWallet(walletToDelete.id);
            toast.success(`Dompet "${walletToDelete.name}" dihapus`);
          }
          setWalletToDelete(null);
        }}
        isDark={isDark}
      />
    </>
  );
}
