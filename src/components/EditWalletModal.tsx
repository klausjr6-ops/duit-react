import { useState } from "react";
import { motion } from "framer-motion";
import { useStore, type Wallet } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";
import { useModalDialog } from "../hooks/useModalDialog";

interface Props { wallet: Wallet; onClose: () => void; }

const ICONS = ["💳","💵","🏦","💰","👛","💎","📱","🪙"];
const COLORS = [
  "from-emerald-500/20 to-emerald-500/5",
  "from-blue-500/20 to-blue-500/5",
  "from-amber-500/20 to-amber-500/5",
  "from-rose-500/20 to-rose-500/5",
  "from-violet-500/20 to-violet-500/5",
  "from-teal-500/20 to-teal-500/5",
];

export default function EditWalletModal({ wallet, onClose }: Props) {
  const { updateWallet, txs } = useStore();
  const { isDark } = useTheme();
  const [name, setName] = useState(wallet.name);
  const [icon, setIcon] = useState(wallet.icon);
  const [color, setColor] = useState(wallet.color);
  const [initialBalance, setInitialBalance] = useState(String(wallet.balance - txs.filter(t=>t.walletId===wallet.id).reduce((s,t)=> s + (t.type==="in"?t.amt:-t.amt),0)));
  const [error, setError] = useState<string|null>(null);
  const { dialogRef, onDialogKeyDown } = useModalDialog(true, onClose);

  const handleSubmit = () => {
    setError(null);
    if (!name.trim()) { setError("Nama dompet harus diisi."); return; }
    const bal = parseInt(initialBalance.replace(/\D/g,"")||"0",10);
    if (Number.isNaN(bal) || bal < 0) { setError("Saldo awal tidak valid."); return; }
    updateWallet(wallet.id, { name: name.trim(), icon, color, balance: bal });
    onClose();
  };

  const inputCls = isDark ? "w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-teal-400" : "w-full mt-1 bg-zinc-50 border border-zinc-300 rounded-lg p-3 text-sm text-zinc-900 focus:outline-none focus:border-teal-500";
  const labelCls = isDark ? "text-[11px] font-bold text-slate-500 uppercase tracking-wider" : "text-[11px] font-bold text-zinc-500 uppercase tracking-wider";
  const panel = isDark ? "bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full" : "bg-white border border-zinc-200 rounded-3xl p-6 max-w-md w-full shadow-xl";

  const formatRp = (v:string)=>{ const n=v.replace(/\D/g,""); return n?parseInt(n).toLocaleString("id-ID"):""; };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose} className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div ref={dialogRef} role="dialog" aria-modal="true" onKeyDown={onDialogKeyDown} initial={{scale:0.95,y:20}} animate={{scale:1,y:0}} exit={{scale:0.95,y:20}} onClick={e=>e.stopPropagation()} className={panel}>
        <div className="flex justify-between items-center mb-5"><h2 className={isDark?"text-xl font-bold text-white":"text-xl font-bold text-zinc-900"}>Edit Dompet</h2><button onClick={onClose} className={isDark?"text-slate-400 hover:text-white text-3xl":"text-zinc-500 hover:text-zinc-900 text-3xl"}>×</button></div>
        <div className="space-y-4">
          <div><label className={labelCls}>Nama Dompet</label><input value={name} onChange={e=>setName(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Icon</label>
            <div className="mt-2 grid grid-cols-8 gap-2">{ICONS.map(ic=><button type="button" key={ic} onClick={()=>setIcon(ic)} className={`rounded-lg border p-2 text-lg ${icon===ic ? "border-teal-400 bg-teal-400/10":"border-white/10 hover:bg-white/5"} ${!isDark && icon!==ic ? "border-zinc-200 hover:bg-zinc-50":""}`}>{ic}</button>)}</div>
          </div>
          <div><label className={labelCls}>Warna</label>
            <div className="mt-2 grid grid-cols-3 gap-2">{COLORS.map(c=><button type="button" key={c} onClick={()=>setColor(c)} className={`h-8 rounded-lg bg-gradient-to-br ${c} border ${color===c ? "border-teal-400 ring-2 ring-teal-400/30":"border-white/10"} ${!isDark ? "border-zinc-200":""}`} />)}</div>
          </div>
          <div><label className={labelCls}>Saldo Awal</label>
            <input type="text" inputMode="numeric" value={initialBalance ? `Rp ${formatRp(initialBalance)}`:""} onChange={e=>setInitialBalance(e.target.value.replace(/\D/g,""))} className={inputCls} />
            <p className={isDark?"text-xs text-slate-500 mt-1":"text-xs text-zinc-500 mt-1"}>Mengubah saldo awal akan mempengaruhi Total Saldo historis.</p>
          </div>
          {error && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-500">{error}</p>}
          <button onClick={handleSubmit} className="w-full bg-gradient-to-br from-teal-400 to-blue-500 text-zinc-900 font-bold py-3 rounded-xl hover:brightness-105">Simpan Perubahan</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
