import { motion } from "framer-motion";
import Card from "./Card";
import { formatDayDate, formatTime } from "../lib/format";
import { useTheme } from "../lib/ThemeContext";

interface ClockCardProps {
  now: Date;
}

export default function ClockCard({ now }: ClockCardProps) {
  const { day, full } = formatDayDate(now);
  const { isDark } = useTheme();

  return (
    <Card accent="linear-gradient(90deg,#22d3ee,#3b82f6)" className="flex flex-col justify-between">
      <div>
        <motion.div
          key={formatTime(now)}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          className={`font-mono text-5xl font-medium tracking-tight sm:text-6xl ${isDark ? "text-white drop-shadow-[0_0_15px_rgba(45,212,191,0.35)]" : "text-zinc-900"}`}
        >
          {formatTime(now)}
        </motion.div>
        <p className={`mt-4 text-lg font-semibold font-sans ${isDark ? "text-teal-400" : "text-teal-600"}`}>{day}</p>
        <p className={`font-sans ${isDark ? "text-slate-400" : "text-zinc-500"}`}>{full}</p>
      </div>
      <div className={`mt-6 h-1.5 w-full overflow-hidden rounded-full ${isDark ? "bg-white/5" : "bg-zinc-100"}`}>
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-teal-400 to-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${(now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400 * 100}%` }}
        />
      </div>
    </Card>
  );
}
