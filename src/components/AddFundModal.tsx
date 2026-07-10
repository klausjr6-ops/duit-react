import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";
import type { Goal } from "../lib/store";
import { useModalDialog } from "../hooks/useModalDialog";

interface Props {
  goal: Goal;
  onClose: () => void;
}

export default function AddFundModal({ goal, onClose }: Props) {
  const { addToGoal } = useStore();
  const { isDark } = useTheme();
  const [amt, setAmt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { dialogRef, onDialogKeyDown } = useModalDialog(true, onClose, inputRef);

  const formatInputRupiah = (val: string) => {
    const num = val.replace(/\D/g, "");
    return num ? parseInt(num).toLocaleString("id-ID") : "";
  };

  const handleSubmit = () => {
    const num = parseInt(amt.replace(/\D/g, ""));
    if (isNaN(num) || num <= 0) { alert("Jumlah tidak valid!"); return; }
    addToGoal(goal.id, num);
    onClose();
  };

  const panel = isDark ? "bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full" : "bg-white border border-zinc-200 rounded-3xl p-6 max-w-sm w-full shadow-xl";
  const titleCls = isDark ? "text-lg font-bold text-white" : "text-lg font-bold text-zinc-900";
  const closeCls = isDark ? "text-slate-400 hover:text-white text-3xl leading-none w-8 h-8 flex items-center justify-center" : "text-zinc-500 hover:text-zinc-900 text-3xl leading-none w-8 h-8 flex items-center justify-center";
  const labelCls = isDark ? "text-[11px] font-bold text-slate-500 uppercase tracking-wider" : "text-[11px] font-bold text-zinc-500 uppercase tracking-wider";
  const inputCls = isDark ? "w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-teal-400" : "w-full mt-1 bg-zinc-50 border border-zinc-300 rounded-lg p-3 text-sm text-zinc-900 focus:outline-none focus:border-teal-500 focus:bg-white";
  const muted = isDark ? "text-sm text-slate-400 mb-4" : "text-sm text-zinc-500 mb-4";
  const strong = isDark ? "text-white font-semibold" : "text-zinc-900 font-semibold";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-fund-dialog-title"
        onKeyDown={onDialogKeyDown}
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className={panel}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="add-fund-dialog-title" className={titleCls}>Tambah Tabungan</h2>
          <button aria-label="Tutup modal tambah tabungan" onClick={onClose} className={closeCls}>×</button>
        </div>
        <p className={muted}>Untuk goal <span className={strong}>{goal.name}</span></p>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Jumlah (Rp)</label>
            <input ref={inputRef} type="text" inputMode="numeric" value={amt ? `Rp ${formatInputRupiah(amt)}` : ""} onChange={(e) => setAmt(e.target.value.replace(/\D/g, ""))} placeholder="Rp 0" className={inputCls} />
          </div>
          <button onClick={handleSubmit} className="w-full bg-gradient-to-br from-teal-400 to-blue-500 text-zinc-900 font-bold py-3 rounded-xl hover:brightness-105 transition-all">
            Tambahkan
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
