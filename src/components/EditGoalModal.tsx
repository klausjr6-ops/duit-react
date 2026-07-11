import { useState } from "react";
import { motion } from "framer-motion";
import { useStore, type Goal } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";
import { useModalDialog } from "../hooks/useModalDialog";

interface Props { goal: Goal; onClose: () => void; }

export default function EditGoalModal({ goal, onClose }: Props) {
  const { updateGoal } = useStore();
  const { isDark } = useTheme();
  const [name, setName] = useState(goal.name);
  const [target, setTarget] = useState(String(goal.target));
  const [deadline, setDeadline] = useState(goal.deadline || "");
  const [icon, setIcon] = useState(goal.icon || "🎯");
  const [error, setError] = useState<string | null>(null);
  const { dialogRef, onDialogKeyDown } = useModalDialog(true, onClose);

  const formatInputRupiah = (val: string) => { const num = val.replace(/\D/g, ""); return num ? parseInt(num).toLocaleString("id-ID") : ""; };

  const handleSubmit = () => {
    setError(null);
    if (!name.trim()) { setError("Nama goal harus diisi."); return; }
    const targetNum = parseInt(target.replace(/\D/g, ""), 10);
    if (Number.isNaN(targetNum) || targetNum <= 0) { setError("Target tidak valid."); return; }
    if (targetNum < goal.current) { setError(`Target tidak boleh kurang dari tabungan terkumpul (${goal.current.toLocaleString("id-ID")}).`); return; }
    updateGoal(goal.id, { name: name.trim(), target: targetNum, deadline: deadline || undefined, icon });
    onClose();
  };

  const panel = isDark ? "bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full" : "bg-white border border-zinc-200 rounded-3xl p-6 max-w-md w-full shadow-xl";
  const labelCls = isDark ? "text-[11px] font-bold text-slate-500 uppercase tracking-wider" : "text-[11px] font-bold text-zinc-500 uppercase tracking-wider";
  const inputCls = isDark ? "w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-teal-400" : "w-full mt-1 bg-zinc-50 border border-zinc-300 rounded-lg p-3 text-sm text-zinc-900 focus:outline-none focus:border-teal-500";
  const titleCls = isDark ? "text-xl font-bold text-white" : "text-xl font-bold text-zinc-900";

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose} className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div ref={dialogRef} role="dialog" aria-modal="true" onKeyDown={onDialogKeyDown} initial={{scale:0.95,y:20}} animate={{scale:1,y:0}} exit={{scale:0.95,y:20}} onClick={e=>e.stopPropagation()} className={panel}>
        <div className="flex justify-between items-center mb-5"><h2 className={titleCls}>Edit Goal</h2><button onClick={onClose} className={isDark ? "text-slate-400 hover:text-white text-3xl":"text-zinc-500 hover:text-zinc-900 text-3xl"}>×</button></div>
        <div className="space-y-4">
          <div><label className={labelCls}>Nama Goal</label><input value={name} onChange={e=>setName(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Target (Rp)</label><input type="text" inputMode="numeric" value={target ? `Rp ${formatInputRupiah(target)}` : ""} onChange={e=>setTarget(e.target.value.replace(/\D/g,""))} className={inputCls} /></div>
          <div><label className={labelCls}>Icon</label><input value={icon} onChange={e=>setIcon(e.target.value)} className={inputCls} maxLength={2} /></div>
          <div><label className={labelCls}>Deadline</label><input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} className={inputCls} /></div>
          <p className={isDark ? "text-xs text-slate-400":"text-xs text-zinc-500"}>Tabungan terkumpul saat ini: Rp {goal.current.toLocaleString("id-ID")} (tidak bisa diedit manual)</p>
          {error && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-500">{error}</p>}
          <button onClick={handleSubmit} className="w-full bg-gradient-to-br from-teal-400 to-blue-500 text-zinc-900 font-bold py-3 rounded-xl hover:brightness-105">Simpan Perubahan</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
