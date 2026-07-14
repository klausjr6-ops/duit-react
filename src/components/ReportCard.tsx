import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Card from "./Card";
import PizzaChart, { HoveredSliceData } from "./PizzaChart";
import { formatRupiah } from "../lib/format";
import { useTheme } from "../lib/ThemeContext";
import { IconArrowDown, IconArrowUp, IconWallet, IconTrendingDown } from "../utils/icons";

interface ReportCardProps {
  income: number;
  expense: number;
}

export default function ReportCard({ income, expense }: ReportCardProps) {
  const deficit = expense - income;
  const isOverspend = deficit > 0;
  const balance = Math.max(income - expense, 0);
  const { isDark } = useTheme();
  const [hovered, setHovered] = useState<HoveredSliceData | null>(null);

  // Build chart slices — different for overspend vs normal
  const slices = isOverspend
    ? [
        { value: income, color: "#3b82f6", label: "Pemasukan", amount: income, formattedAmount: formatRupiah(income) },
        { value: expense, color: "#fb7185", label: "Pengeluaran", amount: expense, formattedAmount: formatRupiah(expense) },
      ]
    : [
        { value: income, color: "#3b82f6", label: "Pemasukan", amount: income, formattedAmount: formatRupiah(income) },
        { value: expense, color: "#fb7185", label: "Pengeluaran", amount: expense, formattedAmount: formatRupiah(expense) },
        { value: balance, color: "#10b981", label: "Sisa Saldo", amount: balance, formattedAmount: formatRupiah(balance) },
      ];

  const rows = isOverspend
    ? [
        {
          icon: <IconArrowDown size={16} />,
          iconBg: isDark ? "bg-blue-500/15 text-blue-400" : "bg-blue-50 text-blue-600",
          label: "Pemasukan",
          value: income,
          color: isDark ? "text-blue-400" : "text-blue-600",
          barColor: "from-blue-400 to-cyan-400",
          pct: income > 0 ? (income / (income + expense)) * 100 : 0,
          dotColor: "bg-blue-500",
        },
        {
          icon: <IconArrowUp size={16} />,
          iconBg: isDark ? "bg-rose-500/15 text-rose-400" : "bg-rose-50 text-rose-600",
          label: "Pengeluaran",
          value: expense,
          color: isDark ? "text-rose-400" : "text-rose-600",
          barColor: "from-rose-500 to-orange-400",
          pct: expense > 0 ? (expense / (income + expense)) * 100 : 0,
          dotColor: "bg-rose-500",
        },
        {
          icon: <IconTrendingDown size={16} />,
          iconBg: isDark ? "bg-amber-500/15 text-amber-400" : "bg-amber-50 text-amber-600",
          label: "Defisit",
          value: deficit,
          color: isDark ? "text-amber-400" : "text-amber-600",
          barColor: "from-amber-400 to-orange-400",
          pct: income > 0 ? (deficit / income) * 100 : 100,
          dotColor: "bg-amber-500",
        },
      ]
    : [
        {
          icon: <IconArrowDown size={16} />,
          iconBg: isDark ? "bg-blue-500/15 text-blue-400" : "bg-blue-50 text-blue-600",
          label: "Pemasukan",
          value: income,
          color: isDark ? "text-blue-400" : "text-blue-600",
          barColor: "from-blue-400 to-cyan-400",
          pct: (income / (income + expense + balance)) * 100,
          dotColor: "bg-blue-500",
        },
        {
          icon: <IconArrowUp size={16} />,
          iconBg: isDark ? "bg-rose-500/15 text-rose-400" : "bg-rose-50 text-rose-600",
          label: "Pengeluaran",
          value: expense,
          color: isDark ? "text-rose-400" : "text-rose-600",
          barColor: "from-rose-500 to-orange-400",
          pct: (expense / (income + expense + balance)) * 100,
          dotColor: "bg-rose-500",
        },
        {
          icon: <IconWallet size={16} />,
          iconBg: isDark ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-50 text-emerald-600",
          label: "Sisa Saldo",
          value: balance,
          color: isDark ? "text-emerald-400" : "text-emerald-600",
          barColor: "from-emerald-400 to-teal-400",
          pct: (balance / (income + expense + balance)) * 100,
          dotColor: "bg-emerald-500",
        },
      ];

  return (
    <Card accent={isOverspend ? "linear-gradient(90deg,#f59e0b,#f97316,#fb7185)" : "linear-gradient(90deg,#60a5fa,#2dd4bf,#fb7185)"} delay={0.2}>
      <div className="flex items-center justify-between mb-6">
        <p className={`text-xs font-semibold tracking-widest ${isDark ? "text-slate-400" : "text-zinc-500"}`}>LAPORAN BULANAN</p>
        {isOverspend && (
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${isDark ? "bg-amber-500/15 text-amber-400 border border-amber-400/30" : "bg-amber-50 text-amber-600 border border-amber-200"}`}>
            ⚠️ Overspend
          </span>
        )}
      </div>
      <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center">
        <div className="flex flex-col items-center gap-2">
          <PizzaChart
            slices={slices}
            onHoverSlice={setHovered}
          />
          <div className="h-14 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {hovered && (
                <motion.div
                  key={hovered.label}
                  initial={{ opacity: 0, y: -6, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2.5 rounded-xl px-4 py-2"
                  style={{ backgroundColor: hovered.color + "18" }}
                >
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: hovered.color }} />
                  <div className="flex flex-col">
                    <span className={`text-xs font-semibold leading-tight ${isDark ? "text-slate-200" : "text-zinc-800"}`}>
                      {hovered.label}
                    </span>
                    <span className="text-[11px] leading-tight" style={{ color: hovered.color }}>
                      {hovered.formattedAmount} · {hovered.pct}% dari total
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="w-full flex-1 space-y-5">
          {rows.map((row, i) => (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <div className="mb-2 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${row.iconBg}`}>
                    {row.icon}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${row.dotColor}`} />
                    <span className={`text-sm ${isDark ? "text-slate-300" : "text-zinc-700"}`}>{row.label}</span>
                  </div>
                </div>
                <span className={`font-bold ${row.color}`}>{formatRupiah(row.value)}</span>
              </div>
              <div className={`h-2 w-full overflow-hidden rounded-full ${isDark ? "bg-white/5" : "bg-zinc-100"}`}>
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${row.barColor}`}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${Math.max(row.pct, 4)}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.3 + i * 0.1, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Card>
  );
}
