import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "../components/Card";
import GoalModal from "../components/GoalModal";
import AddFundModal from "../components/AddFundModal";
import WithdrawFundModal from "../components/WithdrawFundModal";
import EditGoalModal from "../components/EditGoalModal";
import { useStore } from "../lib/store";
import { formatRupiah } from "../lib/format";
import type { Goal } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";

export default function GoalsView() {
  const { goals, delGoal } = useStore();
  const { isDark } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [fundGoal, setFundGoal] = useState<Goal | null>(null);
  const [withdrawGoalState, setWithdrawGoalState] = useState<Goal | null>(null);
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  const formatDeadline = (d: string) => {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  };

  const titleCls = isDark ? "text-3xl font-bold text-white" : "text-3xl font-bold text-zinc-900";
  const subCls = isDark ? "text-slate-400 text-sm mt-1" : "text-zinc-500 text-sm mt-1";
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
        <EmptyState
          icon="🎯"
          title="Belum ada goal"
          description="Buat target pertama agar tabungan punya arah. Kamu bisa mulai dari dana darurat, liburan, gadget, atau cicilan impian."
          tips={["🚨 Dana darurat", "🏝️ Liburan", "💻 Laptop", "🏠 Rumah"]}
          actionLabel="Buat Goal Pertama"
          onAction={() => setShowModal(true)}
        />
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
                      <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        aria-label={`Edit goal ${g.name}`}
                        onClick={() => setGoalToEdit(g)}
                        className={`${isDark ? "text-slate-500 hover:text-teal-400" : "text-zinc-400 hover:text-teal-600"} p-1 transition-colors`}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        aria-label={`Hapus goal ${g.name}`}
                        onClick={() => setGoalToDelete(g)}
                        className={`${isDark ? "text-slate-500 hover:text-rose-400" : "text-zinc-400 hover:text-rose-500"} p-1 transition-colors`}
                      >
                        🗑️
                      </button>
                      </div>
                    </div>

                    <div className="flex items-end justify-between mb-2">
                      <span className={`text-2xl font-extrabold ${mainText}`}>{formatRupiah(g.current)}</span>
                      <span className={`text-xs ${muted2}`}>dari {formatRupiah(g.target)}</span>
                    </div>

                    <div className={`w-full h-2.5 rounded-full overflow-hidden mb-4 ${isDark ? "bg-white/10" : "bg-zinc-100"}`}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className={`h-full rounded-full ${isDone ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-blue-400 to-blue-600"}`} />
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className={`text-xs font-bold ${isDone ? "text-emerald-600" : "text-blue-600"}`}>
                        {pct}% {isDone && "🎉 Tercapai!"}
                      </span>
                      <div className="flex items-center gap-2">
                        {g.current > 0 && (
                          <button
                            onClick={() => setWithdrawGoalState(g)}
                            className={isDark
                              ? "text-xs font-semibold border border-white/15 hover:bg-white/10 text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                              : "text-xs font-semibold border border-zinc-300 hover:bg-zinc-50 text-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
                            }
                          >
                            Tarik
                          </button>
                        )}
                        {!isDone && (
                          <button onClick={() => setFundGoal(g)} className={isDark ? "text-xs font-semibold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors" : "text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white px-3 py-1.5 rounded-lg transition-colors"}>
                            + Nabung
                          </button>
                        )}
                      </div>
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
      <AnimatePresence>{withdrawGoalState && <WithdrawFundModal goal={withdrawGoalState} onClose={() => setWithdrawGoalState(null)} />}</AnimatePresence>
      <AnimatePresence>{goalToEdit && <EditGoalModal goal={goalToEdit} onClose={() => setGoalToEdit(null)} />}</AnimatePresence>
      <ConfirmDialog
        open={Boolean(goalToDelete)}
        title="Hapus Goal?"
        message={goalToDelete ? `Goal “${goalToDelete.name}” akan dihapus. Transfer tabungan terkait dibatalkan dan saldo dompet sumber dikembalikan.` : ""}
        confirmLabel="Ya, Hapus"
        onClose={() => setGoalToDelete(null)}
        onConfirm={() => {
          if (goalToDelete) delGoal(goalToDelete.id);
          setGoalToDelete(null);
        }}
        isDark={isDark}
      />
    </motion.div>
  );
}
