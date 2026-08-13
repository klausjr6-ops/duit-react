import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { FinancialInsight } from "../lib/insights";
import { useTheme } from "../lib/ThemeContext";

interface Props {
  insights: FinancialInsight[];
  onFinanceClick: () => void;
  onGoalClick: () => void;
}

const DISMISSED_INSIGHTS_KEY = "duit_dismissed_insights_v1";
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000;

function readDismissedInsights(): Record<string, number> {
  try {
    const value = JSON.parse(localStorage.getItem(DISMISSED_INSIGHTS_KEY) || "{}") as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const now = Date.now();
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([, timestamp]) => typeof timestamp === "number" && now - timestamp < DISMISS_DURATION_MS)
      .map(([id, timestamp]) => [id, timestamp as number]));
  } catch {
    return {};
  }
}

export default function FinancialInsights({ insights, onFinanceClick, onGoalClick }: Props) {
  const { isDark } = useTheme();
  const [dismissed, setDismissed] = useState<Record<string, number>>(readDismissedInsights);
  const visibleInsights = useMemo(() => insights.filter((insight) => !dismissed[insight.id]), [dismissed, insights]);
  if (visibleInsights.length === 0) return null;

  const dismiss = (id: string) => {
    const next = { ...dismissed, [id]: Date.now() };
    setDismissed(next);
    try { localStorage.setItem(DISMISSED_INSIGHTS_KEY, JSON.stringify(next)); } catch { /* Penyimpanan lokal tidak wajib. */ }
  };
  const styles = {
    attention: isDark ? "border-rose-400/25 bg-rose-400/10" : "border-rose-200 bg-rose-50",
    warning: isDark ? "border-amber-400/25 bg-amber-400/10" : "border-amber-200 bg-amber-50",
    positive: isDark ? "border-emerald-400/25 bg-emerald-400/10" : "border-emerald-200 bg-emerald-50",
  };
  const icons = { attention: "⚠️", warning: "💡", positive: "✨" };
  const label = { attention: "PERLU PERHATIAN", warning: "INSIGHT DUIT", positive: "KABAR BAIK" };

  return <section aria-label="Insight keuangan DUIT" className="space-y-3">
    {visibleInsights.map((insight, index) => (
      <motion.article key={insight.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${styles[insight.tone]} `}>
        <div className="flex min-w-0 gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/50 text-lg dark:bg-black/10">{icons[insight.tone]}</span><div><p className={`text-[10px] font-extrabold tracking-[0.13em] ${isDark ? "text-slate-400" : "text-zinc-500"}`}>{label[insight.tone]}</p><h3 className={`mt-1 text-sm font-extrabold ${isDark ? "text-white" : "text-zinc-900"}`}>{insight.title}</h3><p className={`mt-1 text-xs leading-relaxed ${isDark ? "text-slate-300" : "text-zinc-600"}`}>{insight.message}</p></div></div>
        <div className="flex shrink-0 items-center gap-2"><button type="button" onClick={insight.action === "goal" ? onGoalClick : onFinanceClick} className={`${isDark ? "bg-white/10 text-teal-300 hover:bg-white/15" : "bg-white text-teal-700 hover:bg-teal-50"} rounded-xl px-3 py-2 text-xs font-bold transition-colors`}>{insight.actionLabel} →</button><button type="button" onClick={() => dismiss(insight.id)} aria-label={`Sembunyikan insight ${insight.title} selama satu hari`} className={`${isDark ? "text-slate-400 hover:bg-white/10" : "text-zinc-500 hover:bg-white/70"} rounded-xl px-2 py-2 text-xs font-bold transition-colors`}>Tutup</button></div>
      </motion.article>
    ))}
  </section>;
}
