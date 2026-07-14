import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useStore, type Transaction } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";
import { useModalDialog } from "../hooks/useModalDialog";

interface Props {
  tx: Transaction;
  onClose: () => void;
}

const CATEGORIES: Record<"in" | "out", string[]> = {
  in: ["Gaji", "Bonus", "Hadiah", "Investasi", "Lainnya"],
  out: ["Makan", "Transport", "Belanja", "Tagihan", "Hiburan", "Kesehatan", "Lainnya"],
};

export default function EditTransactionModal({ tx, onClose }: Props) {
  const { wallets, updateTx } = useStore();
  const { isDark } = useTheme();
  const [type, setType] = useState<"in" | "out">(tx.type);
  const [cat, setCat] = useState(tx.cat);
  const [walletId, setWalletId] = useState(String(tx.walletId ?? ""));
  const [amt, setAmt] = useState(String(tx.amt));
  const [desc, setDesc] = useState(tx.desc);
  const [date, setDate] = useState(tx.date);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { dialogRef, onDialogKeyDown } = useModalDialog(true, onClose, inputRef);

  const isGoalTx = Boolean(tx.goalId);

  const formatInputRupiah = (val: string) => {
    const num = val.replace(/\D/g, "");
    return num ? parseInt(num).toLocaleString("id-ID") : "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isGoalTx) { setError("Transaksi Goal tidak bisa diedit di sini. Gunakan menu Tarik/Nabung Goal."); return; }
    if (!type || !cat || !walletId || !amt) { setError("Lengkapi semua field."); return; }
    const numAmt = parseInt(amt.replace(/\D/g, ""), 10);
    if (Number.isNaN(numAmt) || numAmt <= 0) { setError("Jumlah tidak valid."); return; }
    updateTx(tx.id, { type, cat, desc: desc || cat, amt: numAmt, date, walletId: parseInt(walletId, 10) });
    onClose();
  };

  const panel = isDark ? "bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full" : "bg-white border border-zinc-200 rounded-3xl p-6 max-w-md w-full shadow-xl";
  const labelCls = isDark ? "text-[11px] font-bold text-slate-500 uppercase tracking-wider" : "text-[11px] font-bold text-zinc-500 uppercase tracking-wider";
  const inputCls = isDark ? "w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-teal-400" : "w-full mt-1 bg-zinc-50 border border-zinc-300 rounded-lg p-3 text-sm text-zinc-900 focus:outline-none focus:border-teal-500";
  const titleCls = isDark ? "text-xl font-bold text-white" : "text-xl font-bold text-zinc-900";
  const closeCls = isDark ? "text-slate-400 hover:text-white text-3xl leading-none" : "text-zinc-500 hover:text-zinc-900 text-3xl leading-none";

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose} className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div ref={dialogRef} role="dialog" aria-modal="true" onKeyDown={onDialogKeyDown} initial={{scale:0.95,y:20}} animate={{scale:1,y:0}} exit={{scale:0.95,y:20}} onClick={e=>e.stopPropagation()} className={panel}>
        <div className="flex justify-between items-center mb-5"><h2 className={titleCls}>Edit Transaksi</h2><button aria-label="Tutup" onClick={onClose} className={closeCls}>×</button></div>
        {isGoalTx ? (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-700 dark:text-amber-300">
            Transaksi Goal ({tx.desc}) tidak bisa diedit manual.<br/>Gunakan menu Nabung / Tarik Goal untuk koreksi.
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Tipe</label>
              <select value={type} onChange={e=>{setType(e.target.value as any); setCat("");}} className={inputCls}>
                <option value="in">Pemasukan</option><option value="out">Pengeluaran</option>
              </select>
            </div>
            <div><label className={labelCls}>Kategori</label>
              <select value={cat} onChange={e=>setCat(e.target.value)} className={inputCls}>
                <option value="">-- Pilih --</option>
                {CATEGORIES[type].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div><label className={labelCls}>Dompet</label>
            <select value={walletId} onChange={e=>setWalletId(e.target.value)} className={inputCls}>
              <option value="">-- Pilih --</option>
              {wallets.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Jumlah</label>
            <input ref={inputRef} type="text" inputMode="numeric" value={amt ? `Rp ${formatInputRupiah(amt)}` : ""} onChange={e=>setAmt(e.target.value.replace(/\D/g,""))} className={inputCls} />
          </div>
          <div><label className={labelCls}>Keterangan</label>
            <input type="text" value={desc} onChange={e=>setDesc(e.target.value)} className={inputCls} />
          </div>
          <div><label className={labelCls}>Tanggal</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} className={inputCls} />
          </div>
          {error && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-500">{error}</p>}
          <button type="submit" className="w-full bg-gradient-to-br from-teal-400 to-blue-500 text-zinc-900 font-bold py-3 rounded-xl hover:brightness-105">Simpan Perubahan</button>
        </form>
        )}
      </motion.div>
    </motion.div>
  );
}
