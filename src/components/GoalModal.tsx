import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "../lib/store";

interface Props {
  onClose: () => void;
}

export default function GoalModal({ onClose }: Props) {
  const { addGoal } = useStore();

  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [deadline, setDeadline] = useState("");

  const formatInputRupiah = (val: string) => {
    const num = val.replace(/\D/g, "");
    return num ? parseInt(num).toLocaleString("id-ID") : "";
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      alert("Nama goal harus diisi!");
      return;
    }
    const targetNum = parseInt(target.replace(/\D/g, ""));
    if (isNaN(targetNum) || targetNum <= 0) {
      alert("Target tabungan tidak valid!");
      return;
    }
    const currentNum = parseInt(current.replace(/\D/g, "") || "0");

    addGoal({
      name: name.trim(),
      target: targetNum,
      current: currentNum,
      deadline: deadline || undefined,
      icon: "🎯",
    });

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
        className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Tambah Goal</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-3xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Nama Goal
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Misal: Liburan ke Bali"
              className="w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Target Tabungan (Rp)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={target ? `Rp ${formatInputRupiah(target)}` : ""}
              onChange={(e) => setTarget(e.target.value.replace(/\D/g, ""))}
              placeholder="Rp 0"
              className="w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tabungan Awal (opsional)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={current ? `Rp ${formatInputRupiah(current)}` : ""}
              onChange={(e) => setCurrent(e.target.value.replace(/\D/g, ""))}
              placeholder="Rp 0"
              className="w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Target Tanggal (opsional)
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-400"
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-emerald-400 text-slate-900 font-bold py-3 rounded-xl hover:bg-emerald-500 transition-colors"
          >
            Simpan Goal
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}