import { motion } from "framer-motion";
import { formatDayDate, getGreeting } from "../lib/format";

interface HeaderProps {
  now: Date;
  score: number;
}

function scoreLabel(score: number) {
  if (score >= 80) return { label: "Sangat Baik", color: "from-amber-400 to-orange-400", dot: "bg-emerald-400" };
  if (score >= 60) return { label: "Baik", color: "from-emerald-400 to-teal-400", dot: "bg-emerald-400" };
  if (score >= 40) return { label: "Cukup", color: "from-yellow-400 to-amber-400", dot: "bg-yellow-400" };
  return { label: "Perlu Perhatian", color: "from-rose-400 to-red-400", dot: "bg-rose-400" };
}

export default function Header({ now, score }: HeaderProps) {
  const greeting = getGreeting(now);
  const { day, full } = formatDayDate(now);
  const badge = scoreLabel(score);

  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="flex items-center gap-2 text-3xl font-bold text-white sm:text-4xl">
          {greeting.text}
          <motion.span
            animate={{ rotate: [0, 15, -10, 15, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="inline-block"
          >
            {greeting.icon}
          </motion.span>
        </h1>
        <p className="mt-1 text-slate-400">
          {day}, {full}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl"
      >
        <span className="text-sm text-slate-400">Skor keuangan</span>
        <span
          className={`flex items-center gap-2 rounded-full bg-gradient-to-r ${badge.color} px-4 py-1.5 text-sm font-bold text-slate-900 shadow-lg`}
        >
          {badge.label}
          <span className={`h-2.5 w-2.5 rounded-full ${badge.dot} shadow shadow-white/50`} />
        </span>
      </motion.div>
    </div>
  );
}
