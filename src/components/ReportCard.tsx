import { motion } from "framer-motion";
import Card from "./Card";
import MultiDonut from "./MultiDonut";
import { formatRupiah } from "../lib/format";

interface ReportCardProps {
  income: number;
  expense: number;
  savingsPct: number;
}

export default function ReportCard({ income, expense, savingsPct }: ReportCardProps) {
  const total = income + expense || 1;
  const incomePct = (income / total) * 100;
  const expensePct = (expense / total) * 100;
  const remainderPct = Math.max(100 - incomePct - expensePct, 0);

  const rows = [
    {
      icon: "⬇️",
      iconBg: "bg-blue-500/15 text-blue-400",
      label: "Pemasukan",
      value: income,
      color: "text-emerald-400",
      barColor: "from-cyan-400 to-emerald-400",
      pct: incomePct,
    },
    {
      icon: "⬆️",
      iconBg: "bg-rose-500/15 text-rose-400",
      label: "Pengeluaran",
      value: expense,
      color: "text-rose-400",
      barColor: "from-rose-500 to-orange-400",
      pct: expensePct,
    },
  ];

  return (
    <Card accent="linear-gradient(90deg,#60a5fa,#34d399,#fb7185)" delay={0.2}>
      <p className="mb-6 text-xs font-semibold tracking-widest text-slate-400">LAPORAN HARIAN</p>
      <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center">
        <MultiDonut
          segments={[
            { value: incomePct, color: "#3b82f6" },
            { value: remainderPct, color: "#22c55e" },
            { value: expensePct, color: "#fb7185" },
          ]}
        >
          <div className="flex flex-col items-center">
            <span className="text-3xl font-extrabold text-white">{Math.round(savingsPct)}%</span>
            <span className="text-xs text-slate-400">tabungan</span>
          </div>
        </MultiDonut>

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
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm ${row.iconBg}`}>
                    {row.icon}
                  </span>
                  <span className="text-sm text-slate-300">{row.label}</span>
                </div>
                <span className={`font-bold ${row.color}`}>{formatRupiah(row.value)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
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
