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
    ? "group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 p-6 pt-7 shadow-xl shadow-black/20 backdrop-blur-xl transition-shadow duration-300 hover:shadow-2xl hover:shadow-emerald-500/5"
    : "group relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-6 pt-7 shadow-sm shadow-zinc-200/60 backdrop-blur-xl transition-shadow duration-300 hover:shadow-lg hover:shadow-zinc-200/80";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`${baseClasses} ${className}`}
    >
      {accent && (
        <span
          className="absolute inset-x-0 top-0 h-1 rounded-t-3xl opacity-90"
          style={{ background: accent }}
        />
      )}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20"
        style={{ background: accent || "#2dd4bf", opacity: 0 }}
      />
      {/* hover glow – use CSS, not tailwind dynamic */}
      <style>{`
        .group:hover > div[style*="blur-3xl"] { opacity: ${isDark ? 0.2 : 0.1} !important; }
      `}</style>
      {children}
    </motion.div>
  );
}
