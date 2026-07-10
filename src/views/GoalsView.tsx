import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "../components/Card";
import GoalModal from "../components/GoalModal";
import AddFundModal from "../components/AddFundModal";
import { useStore } from "../lib/store";
import { formatRupiah } from "../lib/format";
import type { Goal } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";

export default function GoalsView() {
  const { goals, delGoal } = useStore();
  const { isDark } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [fundGoal, setFundGoal] = useState<Goal | null>(null);

  const formatDeadline = (d: string) => {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  };

  const titleCls = isDark ? "text-3xl font-bold text-white" : "text-3xl font-bold text-zinc-900";
  const subCls = isDark ? "text-slate-400 text-sm mt-1" : "text-zinc-500 text-sm mt-1";
  const emptyWrap = isDark ? "bg-slate-900/60 rounded-3xl border border-white/10 py-24 flex flex-col items-center justify-center" : "bg-white rounded-3xl border border-zinc-200 shadow-sm py-24 flex flex-col items-center justify-center";
  const muted = isDark ? "text-slate-400" : "text-zinc-500";
  const muted2 = isDark ? "text-slate-500" : "text-zinc-500";
  const mainText = isDark ? "text-white" : "text-zinc-900";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className={titleCls}>Goals & Tabungan</h1>
          <p className={subCls}>Pantau progress tabungan Anda</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-br from-teal-400 to-blue-500 text-zinc-900 font-bold px-5 py-3 rounded-xl hover:brightness-105 transition-all shadow-lg shadow-teal-500/20"
        >
          + Tambah Goal
        </motion.button>
      </div>

      {goals.length === 0 ? (
        <div className={emptyWrap}>
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} className="text-6xl mb-4">🎯</motion.div>
          <p className={`text-lg ${muted}`}>Belum ada goal</p>
          <p className={`text-sm mt-1 ${muted2}`}>Buat goal pertama Anda dan mulai menabung!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {goals.map((g) => {
              const pct = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
              const isDone = pct >= 100;
              return (
                <motion.div key={g.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
                  <Card accent={isDone ? "linear-gradient(90deg,#10b981,#059669)" : "linear-gradient(90deg,#3b82f6,#2563eb)"}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="min-w-0">
                        <p className={`font-bold truncate ${mainText}`}>{g.name}</p>
                        {g.deadline && (<p className={`text-xs mt-1 ${muted2}`}>🗓️ {formatDeadline(g.deadline)}</p>)}
                      </div>
                      <button onClick={() => { if (confirm(`Hapus goal "${g.name}"?`)) delGoal(g.id); }} className={`${isDark ? "text-slate-500 hover:text-rose-400" : "text-zinc-400 hover:text-rose-500"} transition-colors p-1 shrink-0`}>🗑️</button>
                    </div>

                    <div className="flex items-end justify-between mb-2">
                      <span className={`text-2xl font-extrabold ${mainText}`}>{formatRupiah(g.current)}</span>
                      <span className={`text-xs ${muted2}`}>dari {formatRupiah(g.target)}</span>
                    </div>

                    <div className={`w-full h-2.5 rounded-full overflow-hidden mb-4 ${isDark ? "bg-white/10" : "bg-zinc-100"}`}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className={`h-full rounded-full ${isDone ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-blue-400 to-blue-600"}`} />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isDone ? "text-emerald-600" : "text-blue-600"}`}>
                        {pct}% {isDone && "🎉 Tercapai!"}
                      </span>
                      {!isDone && (
                        <button onClick={() => setFundGoal(g)} className={isDark ? "text-xs font-semibold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors" : "text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white px-3 py-1.5 rounded-lg transition-colors"}>
                          + Nabung
                        </button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>{showModal && <GoalModal onClose={() => setShowModal(false)} />}</AnimatePresence>
      <AnimatePresence>{fundGoal && <AddFundModal goal={fundGoal} onClose={() => setFundGoal(null)} />}</AnimatePresence>
    </motion.div>
  );
}
