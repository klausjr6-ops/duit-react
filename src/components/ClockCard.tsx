import { motion } from "framer-motion";
import Card from "./Card";
import { formatDayDate, formatTime } from "../lib/format";

interface ClockCardProps {
  now: Date;
}

export default function ClockCard({ now }: ClockCardProps) {
  const { day, full } = formatDayDate(now);

  return (
    <Card accent="linear-gradient(90deg,#22d3ee,#6366f1)" className="flex flex-col justify-between">
      <div>
        <motion.div
          key={formatTime(now)}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          className="font-mono text-5xl font-medium tracking-tight text-white sm:text-6xl drop-shadow-[0_0_15px_rgba(45,212,191,0.5)]"
        >
          {formatTime(now)}
        </motion.div>
        <p className="mt-4 text-lg font-semibold text-emerald-400 font-sans">{day}</p>
        <p className="text-slate-400 font-sans">{full}</p>
      </div>
      <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500"
          initial={{ width: 0 }}
          animate={{ width: `${(now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400 * 100}%` }}
        />
      </div>
    </Card>
  );
}
