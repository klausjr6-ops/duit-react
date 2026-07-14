import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Card from "./Card";
import PizzaChart, { HoveredSliceData } from "./PizzaChart";
import { formatRupiah } from "../lib/format";
import { useTheme } from "../lib/ThemeContext";
import { IconArrowDown, IconArrowUp } from "../utils/icons";

interface ReportCardProps {
  income: number;
  expense: number;
  savingsPct: number;
}

export default function ReportCard({ income, expense, savingsPct: _savingsPct }: ReportCardProps) {
  const total = income + expense || 1;
  const incomePct = (income / total) * 100;
  const expensePct = (expense / total) * 100;
  const remainderPct = Math.max(100 - incomePct - expensePct, 0);
  const { isDark } = useTheme();
  const [hovered, setHovered] = useState<HoveredSliceData | null>(null);

  const rows = [
    {
      icon: <IconArrowDown size={16} />,
      iconBg: isDark ? "bg-blue-500/15 text-blue-400" : "bg-blue-50 text-blue-600",
      label: "Pemasukan",
      value: income,
      color: isDark ? "text-emerald-400" : "text-emerald-600",
      barColor: "from-cyan-400 to-emerald-400",
      pct: incomePct,
      dotColor: "bg-blue-500",
    },
    {
      icon: <IconArrowUp size={16} />,
      iconBg: isDark ? "bg-rose-500/15 text-rose-400" : "bg-rose-50 text-rose-600",
      label: "Pengeluaran",
      value: expense,
      color: isDark ? "text-rose-400" : "text-rose-600",
      barColor: "from-rose-500 to-orange-400",
      pct: expensePct,
      dotColor: "bg-rose-500",
    },
  ];

  return (
    <Card accent="linear-gradient(90deg,#60a5fa,#2dd4bf,#fb7185)" delay={0.2}>
      <p className={`mb-6 text-xs font-semibold tracking-widest ${isDark ? "text-slate-400" : "text-zinc-500"}`}>LAPORAN HARIAN</p>
      <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center">
        <div className="flex flex-col items-center gap-2">
          <PizzaChart
            slices={[
              { value: incomePct, color: "#3b82f6", label: "Pemasukan", amount: income, formattedAmount: formatRupiah(income) },
              { value: remainderPct, color: "#22c55e", label: "Selisih", amount: Math.max(income - expense, 0), formattedAmount: formatRupiah(Math.max(income - expense, 0)) },
              { value: expensePct, color: "#fb7185", label: "Pengeluaran", amount: expense, formattedAmount: formatRupiah(expense) },
            ]}
            onHoverSlice={setHovered}
          />
          <div className="h-10 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {hovered && (
                <motion.div
                  key={hovered.label}
                  initial={{ opacity: 0, y: -6, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2 rounded-full px-3 py-1"
                  style={{ backgroundColor: hovered.color + "18" }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: hovered.color }} />
                  <span className={`text-xs font-semibold ${isDark ? "text-slate-200" : "text-zinc-800"}`}>
                    {hovered.label}
                  </span>
                  <span className="text-xs font-bold" style={{ color: hovered.color }}>
                    {hovered.formattedAmount ?? `${hovered.pct}%`}
                  </span>
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
