import { AnimatePresence, motion } from "framer-motion";
import { jakartaTimeParts } from "../lib/format";
import { dateKeyInJakarta } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";

type TransitionKind = "dashboard" | "theme";
type ContextTarget = "default" | "morning" | "afternoon" | "evening" | "monthEnd";

interface Props {
  active: boolean;
  kind: TransitionKind;
  contextual: boolean;
  now: Date;
}

function getContextTarget(contextual: boolean, now: Date): ContextTarget {
  if (!contextual) return "default";
  const { hour } = jakartaTimeParts(now);
  const day = Number(dateKeyInJakarta(now).slice(-2));
  if (day >= 28) return "monthEnd";
  if (hour >= 18 || hour < 4) return "evening";
  return hour >= 12 ? "afternoon" : "morning";
}

const TARGETS: Record<ContextTarget, { eyebrow: string; copy: string; cards: string[] }> = {
  default: { eyebrow: "DASHBOARD DEFAULT", copy: "Menyusun kembali tampilan pilihanmu.", cards: ["RINGKASAN HARI", "TOTAL SALDO", "PENGELUARAN BULAN", "TABUNGAN"] },
  morning: { eyebrow: "PAGI · MULAI HARI", copy: "Menyusun fokus untuk memulai hari.", cards: ["SALDO AMAN", "AGENDA BERIKUTNYA", "AKSI CEPAT", "MOTIVASI PAGI"] },
  afternoon: { eyebrow: "SIANG · LANJUTKAN DENGAN SADAR", copy: "Merangkum yang sudah berjalan.", cards: ["TRANSAKSI HARI INI", "AGENDA TERSISA", "MOTIVASI SIANG", "SNAPSHOT WALLET"] },
  evening: { eyebrow: "MALAM · TUTUP HARI", copy: "Menyiapkan ruang untuk menutup hari.", cards: ["CHECK-IN MALAM", "RINGKASAN HARI", "REFLEKSI MALAM", "PERSIAPAN BESOK"] },
  monthEnd: { eyebrow: "AKHIR BULAN · LIHAT GAMBAR BESAR", copy: "Menata gambaran bulan ini.", cards: ["ARUS KAS BULAN", "RUANG PENGELUARAN", "PENUTUP BULAN", "GOAL TERDEKAT"] },
};

export default function ViewTransitionLoader({ active, kind, contextual, now }: Props) {
  const { isDark } = useTheme();
  const target = getContextTarget(contextual, now);
  const layout = TARGETS[target];
  const action = kind === "theme" ? "Menyesuaikan tema…" : "Menyesuaikan dashboard…";
  const surface = isDark ? "bg-slate-950/78" : "bg-[#f5f7f8]/78";
  const panel = isDark ? "border-white/10 bg-slate-900/75" : "border-white/80 bg-white/75";
  const skeleton = isDark ? "bg-white/10" : "bg-zinc-200";

  return <AnimatePresence>{active && (
    <motion.div key="context-aware-transition" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }} className={`pointer-events-none fixed inset-0 z-[90] flex items-center justify-center p-5 backdrop-blur-md ${surface}`} aria-live="polite" aria-label={action}>
      <motion.section initial={{ opacity: 0, scale: 0.975, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.985 }} transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }} className={`w-full max-w-2xl rounded-[28px] border p-5 shadow-2xl backdrop-blur-2xl sm:p-6 ${panel}`}>
        <div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 text-lg font-black text-white shadow-lg shadow-teal-500/20">D</span><div><p className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>{action}</p><p className={`mt-0.5 text-xs ${isDark ? "text-slate-400" : "text-zinc-500"}`}>{layout.copy}</p></div></div>
        <p className={`mb-3 text-[10px] font-extrabold tracking-[0.14em] ${isDark ? "text-teal-300" : "text-teal-700"}`}>{layout.eyebrow}</p>
        <div className="grid grid-cols-2 gap-3">{layout.cards.map((card, index) => <TargetSkeleton key={card} label={card} wide={index === 0} delay={index * 0.06} color={skeleton} />)}</div>
      </motion.section>
    </motion.div>
  )}</AnimatePresence>;
}

function TargetSkeleton({ label, wide, delay, color }: { label: string; wide: boolean; delay: number; color: string }) {
  return <motion.div initial={{ opacity: 0, scale: 0.94, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay, duration: 0.28, ease: [0.16, 1, 0.3, 1] }} className={`relative min-h-[104px] overflow-hidden rounded-2xl p-4 ${color} ${wide ? "col-span-2 min-h-[76px]" : ""}`}>
    <p className="relative z-10 text-[9px] font-extrabold tracking-[0.12em] text-teal-600/80 dark:text-teal-300/80">{label}</p>
    <div className="relative z-10 mt-3 h-4 w-3/5 rounded-full bg-white/50 dark:bg-white/15" /><div className="relative z-10 mt-2 h-2.5 w-4/5 rounded-full bg-white/35 dark:bg-white/10" />
    <motion.i className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent" animate={{ x: ["-140%", "310%"] }} transition={{ duration: 0.72, repeat: Infinity, ease: "linear", delay }} />
  </motion.div>;
}
