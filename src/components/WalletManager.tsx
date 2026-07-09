import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "../lib/store";
import { formatRupiah } from "../lib/format";

interface Props {
  onClose: () => void;
}

const ICONS = ["💳", "💵", "💰", "🏦", "📱", "💎", "🪙", "💸"];

export default function WalletManager({ onClose }: Props) {
  const { wallets, addWallet, delWallet } = useStore();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("💳");
  const [initBalance, setInitBalance] = useState("");

  const handleAdd = () => {
    if (!name.trim()) {
      alert("Nama dompet harus diisi!");
      return;
    }
    addWallet({
      name: name.trim(),
      balance: parseInt(initBalance.replace(/\D/g, "") || "0"),
      icon,
      color: "from-emerald-500/20 to-emerald-500/5",
    });
    setName("");
    setIcon("💳");
    setInitBalance("");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Kelola Dompet</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-3xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <div className="space-y-2 mb-6">
          {wallets.length === 0 ? (
            <p className="text-center text-slate-500 py-4 text-sm">Belum ada dompet</p>
          ) : (
            wallets.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{w.icon}</span>
                  <div>
                    <p className="font-semibold text-white text-sm">{w.name}</p>
                    <p className="text-xs text-emerald-400">{formatRupiah(w.balance)}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (
                      confirm(
                        `Hapus dompet "${w.name}"? Transaksi yang terhubung tidak akan dihapus.`
                      )
                    )
                      delWallet(w.id);
                  }}
                  className="text-slate-500 hover:text-rose-400 p-2"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-white/10 pt-4 space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Tambah Dompet Baru
          </p>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase">Nama</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Misal: Mandiri, GoPay, dll"
              className="w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase">Icon</label>
            <div className="grid grid-cols-8 gap-2 mt-1">
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={`text-xl p-2 rounded-lg border transition-all ${
                    icon === ic
                      ? "border-emerald-400 bg-emerald-500/10"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase">
              Saldo Awal (Rp)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={initBalance ? `Rp ${parseInt(initBalance).toLocaleString("id-ID")}` : ""}
              onChange={(e) => setInitBalance(e.target.value.replace(/\D/g, ""))}
              placeholder="Rp 0"
              className="w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-400"
            />
          </div>

          <button
            onClick={handleAdd}
            className="w-full bg-emerald-400 text-slate-900 font-bold py-3 rounded-xl hover:bg-emerald-500 transition-colors"
          >
            + Tambah Dompet
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}