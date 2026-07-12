import { motion } from "framer-motion";
import { useTheme } from "../lib/ThemeContext";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  tips?: string[];
  compact?: boolean;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  tips = [],
  compact = false,
}: EmptyStateProps) {
  const { isDark } = useTheme();

  const wrapperClass = isDark
    ? "rounded-3xl border border-dashed border-white/10 bg-white/[0.03] px-5 text-center"
    : "rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/80 px-5 text-center";
  const titleClass = isDark ? "text-white" : "text-zinc-900";
  const descriptionClass = isDark ? "text-slate-400" : "text-zinc-500";
  const tipClass = isDark
    ? "border border-white/10 bg-white/5 text-slate-300"
    : "border border-zinc-200 bg-white text-zinc-600";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`${wrapperClass} ${compact ? "py-8" : "py-14 sm:py-16"}`}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 16 }}
        className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-400/15 to-blue-500/15 text-4xl"
      >
        {icon}
      </motion.div>

      <p className={`text-base font-bold ${titleClass}`}>{title}</p>
      <p className={`mx-auto mt-1 max-w-sm text-sm leading-relaxed ${descriptionClass}`}>{description}</p>

      {tips.length > 0 && (
        <div className="mx-auto mt-4 flex max-w-md flex-wrap justify-center gap-2">
          {tips.map((tip) => (
            <span key={tip} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${tipClass}`}>
              {tip}
            </span>
          ))}
        </div>
      )}

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 px-5 py-3 text-sm font-bold text-zinc-900 shadow-lg shadow-teal-500/20 transition-all hover:brightness-105 active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
