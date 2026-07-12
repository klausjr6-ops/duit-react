import { motion } from "framer-motion";
import Card from "./Card";
import { formatRupiah } from "../lib/format";
import { useTheme } from "../lib/ThemeContext";

interface TodayCardProps {
  income: number;
  expense: number;
  scheduleCount: number;
  onIncomeClick?: () => void;
  onExpenseClick?: () => void;
  onScheduleClick?: () => void;
}

export default function TodayCard({
  income,
  expense,
  scheduleCount,
  onIncomeClick,
  onExpenseClick,
  onScheduleClick,
}: TodayCardProps) {
  const { isDark } = useTheme();
  const rows = [
    {
      icon: "⬇️",
      iconBg: isDark ? "bg-blue-500/15 text-blue-400" : "bg-blue-50 text-blue-600",
      label: "Masuk Hari Ini",
      value: formatRupiah(income),
      valueColor: isDark ? "text-emerald-400" : "text-emerald-600",
      onClick: onIncomeClick,
      ariaLabel: "Catat pemasukan hari ini",
    },
    {
      icon: "⬆️",
      iconBg: isDark ? "bg-rose-500/15 text-rose-400" : "bg-rose-50 text-rose-600",
      label: "Keluar Hari Ini",
      value: formatRupiah(expense),
      valueColor: isDark ? "text-rose-400" : "text-rose-600",
      onClick: onExpenseClick,
      ariaLabel: "Catat pengeluaran hari ini",
    },
    {
      icon: "📅",
      iconBg: isDark ? "bg-indigo-500/15 text-indigo-400" : "bg-indigo-50 text-indigo-600",
      label: "Jadwal Aktif",
      value: `${scheduleCount} kegiatan`,
      valueColor: isDark ? "text-slate-200" : "text-zinc-800",
      onClick: onScheduleClick,
      ariaLabel: "Buka jadwal hari ini",
    },
  ];

  return (
    <Card accent="linear-gradient(90deg,#22d3ee,#3b82f6)" delay={0.1}>
      <p className={`mb-4 text-xs font-semibold tracking-widest ${isDark ? "text-slate-400" : "text-zinc-500"}`}>HARI INI</p>
      <div className={`flex flex-col divide-y ${isDark ? "divide-white/5" : "divide-zinc-100"}`}>
        {rows.map((row, i) => (
          <motion.button
            key={row.label}
            type="button"
            onClick={row.onClick}
            aria-label={row.ariaLabel}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            whileTap={row.onClick ? { scale: 0.98 } : undefined}
            viewport={{ once: true }}
            transition={{ delay: 0.15 + i * 0.08 }}
            className={`group flex w-full items-center justify-between gap-4 py-3.5 text-left first:pt-0 last:pb-0 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400/40 ${
              row.onClick
                ? isDark
                  ? "hover:bg-white/5 active:bg-white/10"
                  : "hover:bg-zinc-50 active:bg-zinc-100"
                : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-transform ${row.onClick ? "group-hover:scale-105" : ""} ${row.iconBg}`}>
                {row.icon}
              </span>
              <span className={`text-sm ${isDark ? "text-slate-300" : "text-zinc-700"}`}>{row.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-bold ${row.valueColor}`}>{row.value}</span>
              {row.onClick && (
                <span className={`text-lg leading-none ${isDark ? "text-slate-500 group-hover:text-slate-300" : "text-zinc-400 group-hover:text-zinc-600"}`}>
                  ›
                </span>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </Card>
  );
}
