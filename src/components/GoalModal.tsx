import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";
import { useModalDialog } from "../hooks/useModalDialog";
import { toast } from "../hooks/useToast";
import { IconClose, GOAL_ICONS } from "../utils/icons";

interface Props {
  onClose: () => void;
}

export default function GoalModal({ onClose }: Props) {
  const { addGoal } = useStore();
  const { isDark } = useTheme();

  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [deadline, setDeadline] = useState("");
  const [icon, setIcon] = useState(GOAL_ICONS[0].key);
  const [error, setError] = useState<string | null>(null);
  const { dialogRef, onDialogKeyDown } = useModalDialog(true, onClose);

  const formatInputRupiah = (val: string) => {
    const num = val.replace(/\D/g, "");
    return num ? parseInt(num).toLocaleString("id-ID") : "";
  };

  const handleSubmit = () => {
    setError(null);
    if (!name.trim()) {
      setError("Nama goal harus diisi.");
      return;
    }
    const targetNum = parseInt(target.replace(/\D/g, ""), 10);
    if (Number.isNaN(targetNum) || targetNum <= 0) {
      setError("Target tabungan tidak valid.");
      return;
    }
    const currentNum = parseInt(current.replace(/\D/g, "") || "0", 10);
    if (currentNum > targetNum) {
      setError("Tabungan awal tidak boleh melebihi target.");
      return;
    }

    addGoal({
      name: name.trim(),
      target: targetNum,
      current: currentNum,
      deadline: deadline || undefined,
      icon,
    });

    toast.success(`Goal "${name.trim()}" berhasil ditambahkan`);
    onClose();
  };

  const panel = isDark
    ? "bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto"
    : "bg-white border border-zinc-200 rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto shadow-xl";
  const labelCls = isDark ? "text-[11px] font-bold text-slate-500 uppercase tracking-wider" : "text-[11px] font-bold text-zinc-500 uppercase tracking-wider";
  const inputCls = isDark
    ? "w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-teal-400"
    : "w-full mt-1 bg-zinc-50 border border-zinc-300 rounded-lg p-3 text-sm text-zinc-900 focus:outline-none focus:border-teal-500 focus:bg-white";
  const titleCls = isDark ? "text-xl font-bold text-white" : "text-xl font-bold text-zinc-900";
  const closeCls = isDark ? "text-slate-400 hover:text-white text-3xl leading-none w-8 h-8 flex items-center justify-center" : "text-zinc-500 hover:text-zinc-900 text-3xl leading-none w-8 h-8 flex items-center justify-center";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-dialog-title"
        onKeyDown={onDialogKeyDown}
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className={panel}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="goal-dialog-title" className={titleCls}>Tambah Goal</h2>
          <button aria-label="Tutup modal tambah goal" onClick={onClose} className={closeCls}><IconClose size={20} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Nama Goal</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Misal: Liburan ke Bali" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Icon</label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {GOAL_ICONS.map((ic) => (
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
          </div>
          <div>
            <label className={labelCls}>Target Tabungan (Rp)</label>
            <input type="text" inputMode="numeric" value={target ? `Rp ${formatInputRupiah(target)}` : ""} onChange={(e) => setTarget(e.target.value.replace(/\D/g, ""))} placeholder="Rp 0" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tabungan Awal (opsional)</label>
            <input type="text" inputMode="numeric" value={current ? `Rp ${formatInputRupiah(current)}` : ""} onChange={(e) => setCurrent(e.target.value.replace(/\D/g, ""))} placeholder="Rp 0" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Target Tanggal (opsional)</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls} />
          </div>
          {error && (
            <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-500">{error}</p>
          )}
          <button type="button" onClick={handleSubmit} className="w-full bg-gradient-to-br from-teal-400 to-blue-500 text-zinc-900 font-bold py-3 rounded-xl hover:brightness-105 transition-all">
            Simpan Goal
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
