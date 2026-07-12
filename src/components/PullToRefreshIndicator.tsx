import { motion } from "framer-motion";

interface PullToRefreshIndicatorProps {
  pulling: boolean;
  refreshing: boolean;
  pullDist: number;
  isDark: boolean;
}

export default function PullToRefreshIndicator({
  pulling,
  refreshing,
  pullDist,
  isDark,
}: PullToRefreshIndicatorProps) {
  const show = pulling || refreshing;
  if (!show) return null;

  const progress = Math.min(pullDist / 70, 1); // 0..1
  const spin = refreshing;

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-[max-height] duration-200"
      style={{ maxHeight: refreshing ? 48 : Math.max(pullDist * 0.6, 0) }}
    >
      <motion.div
        className="flex items-center justify-center"
        animate={
          spin
            ? { rotate: 360 }
            : { rotate: progress * 360 }
        }
        transition={
          spin
            ? { duration: 0.8, repeat: Infinity, ease: "linear" }
            : { duration: 0 }
        }
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={
            isDark
              ? "text-teal-400"
              : "text-teal-600"
          }
          style={{ opacity: refreshing ? 1 : 0.3 + progress * 0.7 }}
        >
          <path d="M21.5 2v6h-6" />
          <path d="M2.5 22v-6h6" />
          <path d="M2.5 11.5a10 10 0 0 1 18.4-4.5" />
          <path d="M21.5 12.5a10 10 0 0 1-18.4 4.5" />
        </svg>
      </motion.div>
    </div>
  );
}
