import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "./Card";
import { useStore } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";
import { toast } from "../hooks/useToast";

const moods = [
  { key: "😴", icon: "😴", label: "Ngantuk" },
  { key: "😕", icon: "😕", label: "Lesu" },
  { key: "😐", icon: "😐", label: "Biasa" },
  { key: "😊", icon: "😊", label: "Baik" },
  { key: "🔥", icon: "🔥", label: "Semangat" },
];

export default function MoodCard() {
  const { todayMood, setTodayMood, setTodayNote } = useStore();
  const { isDark } = useTheme();
  const [selected, setSelected] = useState(todayMood?.mood ?? "😊");
  const [note, setNote] = useState(todayMood?.note ?? "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (todayMood) {
      setSelected(todayMood.mood);
      setNote(todayMood.note);
    }
  }, [todayMood]);

  const pickMood = (key: string, label: string) => {
    setSelected(key);
    setTodayMood(key, label);
  };

  const handleSave = () => {
    setTodayNote(note);
    setSaved(true);
    toast.success("Catatan tersimpan");
    setTimeout(() => setSaved(false), 2000);
  };

  const muted = isDark ? "text-slate-400" : "text-zinc-500";
  const btnBase = isDark
    ? "border-white/5 bg-white/[0.02] hover:bg-white/5"
    : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100";

  return (
    <Card accent="linear-gradient(90deg,#f472b6,#f59e0b)" className="flex flex-col" delay={0.15}>
      <p className={`text-xs font-semibold tracking-widest ${muted}`}>SUASANA HATI HARI INI</p>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {moods.map((m) => (
          <motion.button
            key={m.key}
            onClick={() => pickMood(m.key, m.label)}
            whileHover={{ scale: 1.08, y: -2 }}
            whileTap={{ scale: 0.94 }}
            className={`flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 transition-colors ${
              selected === m.key
                ? "border-teal-400/50 bg-teal-400/10 shadow-lg shadow-teal-400/10"
                : btnBase
            }`}
          >
            <motion.span
              animate={selected === m.key ? { scale: [1, 1.25, 1] } : {}}
              transition={{ duration: 0.4 }}
              className="text-2xl"
            >
              {m.icon}
            </motion.span>
            <span className={`text-[11px] ${muted}`}>{m.label}</span>
          </motion.button>
        ))}
      </div>

      <p className={`mb-2 mt-6 text-xs font-semibold tracking-widest ${muted}`}>CATATAN SINGKAT</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Apa yang terjadi hari ini..."
        rows={4}
        className={
          isDark
            ? "w-full flex-1 resize-none rounded-xl border border-white/5 bg-white/[0.03] p-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-teal-400/40 focus:outline-none focus:ring-1 focus:ring-teal-400/30"
            : "w-full flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/30 focus:bg-white"
        }
      />

      <motion.button
        onClick={handleSave}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="relative mt-4 overflow-hidden rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 py-3 font-bold text-zinc-900 shadow-lg shadow-teal-500/20"
      >
        <AnimatePresence mode="wait">
          {saved ? (
            <motion.span
              key="saved"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center justify-center gap-2"
            >
              ✅ Tersimpan!
            </motion.span>
          ) : (
            <motion.span
              key="save"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              Simpan Catatan
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </Card>
  );
}
