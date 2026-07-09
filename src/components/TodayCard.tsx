import { motion } from "framer-motion";
import Card from "./Card";
import { formatRupiah } from "../lib/format";

interface TodayCardProps {
  income: number;
  expense: number;
  scheduleCount: number;
}

export default function TodayCard({ income, expense, scheduleCount }: TodayCardProps) {
  const rows = [
    {
      icon: "⬇️",
      iconBg: "bg-blue-500/15 text-blue-400",
      label: "Masuk Hari Ini",
      value: formatRupiah(income),
      valueColor: "text-emerald-400",
    },
    {
      icon: "⬆️",
      iconBg: "bg-rose-500/15 text-rose-400",
      label: "Keluar Hari Ini",
      value: formatRupiah(expense),
      valueColor: "text-rose-400",
    },
    {
      icon: "📅",
      iconBg: "bg-indigo-500/15 text-indigo-400",
      label: "Jadwal Aktif",
      value: `${scheduleCount} kegiatan`,
      valueColor: "text-slate-200",
    },
  ];

  return (
    <Card accent="linear-gradient(90deg,#818cf8,#6366f1)" delay={0.1}>
      <p className="mb-4 text-xs font-semibold tracking-widest text-slate-400">HARI INI</p>
      <div className="flex flex-col divide-y divide-white/5">
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
              <span className="text-sm text-slate-300">{row.label}</span>
            </div>
            <span className={`font-bold ${row.valueColor}`}>{row.value}</span>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}
