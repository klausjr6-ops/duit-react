import { motion } from "framer-motion";
import Card from "./Card";
import { formatRupiah } from "../lib/format";
import { useTheme } from "../lib/ThemeContext";

interface TodayCardProps {
  income: number;
  expense: number;
  scheduleCount: number;
}

export default function TodayCard({ income, expense, scheduleCount }: TodayCardProps) {
  const { isDark } = useTheme();
  const rows = [
    {
      icon: "⬇️",
      iconBg: isDark ? "bg-blue-500/15 text-blue-400" : "bg-blue-50 text-blue-600",
      label: "Masuk Hari Ini",
      value: formatRupiah(income),
      valueColor: isDark ? "text-emerald-400" : "text-emerald-600",
    },
    {
      icon: "⬆️",
      iconBg: isDark ? "bg-rose-500/15 text-rose-400" : "bg-rose-50 text-rose-600",
      label: "Keluar Hari Ini",
      value: formatRupiah(expense),
      valueColor: isDark ? "text-rose-400" : "text-rose-600",
    },
    {
      icon: "📅",
      iconBg: isDark ? "bg-indigo-500/15 text-indigo-400" : "bg-indigo-50 text-indigo-600",
      label: "Jadwal Aktif",
      value: `${scheduleCount} kegiatan`,
      valueColor: isDark ? "text-slate-200" : "text-zinc-800",
    },
  ];

  return (
    <Card accent="linear-gradient(90deg,#22d3ee,#3b82f6)" delay={0.1}>
      <p className={`mb-4 text-xs font-semibold tracking-widest ${isDark ? "text-slate-400" : "text-zinc-500"}`}>HARI INI</p>
      <div className={`flex flex-col divide-y ${isDark ? "divide-white/5" : "divide-zinc-100"}`}>
        {rows.map((row, i) => (
          <motion.div
            key={row.label}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 + i * 0.08 }}
            className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
          >
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${row.iconBg}`}>
                {row.icon}
              </span>
              <span className={`text-sm ${isDark ? "text-slate-300" : "text-zinc-700"}`}>{row.label}</span>
            </div>
            <span className={`font-bold ${row.valueColor}`}>{row.value}</span>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}
