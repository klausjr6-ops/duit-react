// src/components/ToastContainer.tsx
import { AnimatePresence, motion } from "framer-motion";
import { useToasts, toast, type ToastType } from "../hooks/useToast";
import { useTheme } from "../lib/ThemeContext";

const ICON_MAP: Record<ToastType, React.ReactNode> = {
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  warning: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

const STYLE_MAP: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-400/30",
    icon: "text-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  error: {
    bg: "bg-rose-500/10",
    border: "border-rose-400/30",
    icon: "text-rose-500",
    text: "text-rose-600 dark:text-rose-400",
  },
  warning: {
    bg: "bg-amber-500/10",
    border: "border-amber-400/30",
    icon: "text-amber-500",
    text: "text-amber-600 dark:text-amber-400",
  },
  info: {
    bg: "bg-blue-500/10",
    border: "border-blue-400/30",
    icon: "text-blue-500",
    text: "text-blue-600 dark:text-blue-400",
  },
};

export default function ToastContainer() {
  const toasts = useToasts();
  const { isDark } = useTheme();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((t) => {
          const s = STYLE_MAP[t.type];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-xl ${
                isDark
                  ? `${s.bg} ${s.border}`
                  : `${s.bg} ${s.border} bg-opacity-80`
              }`}
            >
              <span className={s.icon}>{ICON_MAP[t.type]}</span>
              <span className={`text-sm font-medium flex-1 ${isDark ? s.text.replace("dark:", "") : s.text.split(" ")[0]}`}>
                {t.message}
              </span>
              <button
                type="button"
                onClick={() => toast.dismiss(t.id)}
                className={`shrink-0 p-0.5 rounded-md transition-colors ${isDark ? "text-slate-500 hover:text-white" : "text-zinc-400 hover:text-zinc-900"}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
