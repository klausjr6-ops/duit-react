import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "../lib/store";
import { formatRupiah } from "../lib/format";
import type { Goal } from "../lib/store";

interface Props {
  goal: Goal;
  onClose: () => void;
}

export default function AddFundModal({ goal, onClose }: Props) {
  const { addToGoal } = useStore();
  const [amt, setAmt] = useState("");

  const formatInputRupiah = (val: string) => {
    const num = val.replace(/\D/g, "");
    return num ? parseInt(num).toLocaleString("id-ID") : "";
  };

  const handleSubmit = () => {
    const num = parseInt(amt.replace(/\D/g, ""));
    if (isNaN(num) || num <= 0) {
      alert("Jumlah tidak valid!");
      return;
    }
    addToGoal(goal.id, num);
    onClose();
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
        className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-white">Tambah Tabungan</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-3xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-slate-400 mb-4">
          Untuk goal <span className="text-white font-semibold">{goal.name}</span>
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Jumlah (Rp)
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={amt ? `Rp ${formatInputRupiah(amt)}` : ""}
              onChange={(e) => setAmt(e.target.value.replace(/\D/g, ""))}
              placeholder="Rp 0"
              className="w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-400"
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-emerald-400 text-slate-900 font-bold py-3 rounded-xl hover:bg-emerald-500 transition-colors"
          >
            Tambahkan
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}