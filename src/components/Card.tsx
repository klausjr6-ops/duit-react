import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useTheme } from "../lib/ThemeContext";

interface CardProps {
  children: ReactNode;
  className?: string;
  accent?: string;
  delay?: number;
}

export default function Card({ children, className = "", accent, delay = 0 }: CardProps) {
  const { isDark } = useTheme();

  const baseClasses = isDark
    ? "group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl shadow-black/20 backdrop-blur-xl transition-all hover:shadow-2xl hover:shadow-emerald-500/5"
    : "group relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm shadow-zinc-200/60 backdrop-blur-xl transition-all hover:shadow-lg hover:shadow-zinc-200/80";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4 }}
      className={`${baseClasses} ${className}`}
    >
      {accent && (
        <span
          className="absolute inset-x-0 top-0 h-1 rounded-t-3xl opacity-90"
          style={{ background: accent }}
        />
      )}
      <div
        className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-${isDark ? "20" : "10"}`}
        style={{ background: accent || "#2dd4bf" }}
      />
      {children}
    </motion.div>
  );
}
