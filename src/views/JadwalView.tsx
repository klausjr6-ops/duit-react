import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "../components/Card";
import ScheduleModal from "../components/ScheduleModal";
import { useStore, todayStr, type ScheduleItem } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function dayIndex(dateStr: string): number {
  return new Date(dateStr + "T00:00:00").getDay();
}
function getNextOccurrence(s: ScheduleItem): string | null {
  const today = todayStr();
  if (!s.date) return null;
  if (!s.recurring) {
    return s.date >= today ? s.date : null;
  }
  const targetDow = dayIndex(s.date);
  const searchFrom = s.date > today ? s.date : today;
  for (let i = 0; i < 7; i++) {
    const candidate = addDays(searchFrom, i);
    if (candidate < s.date) continue;
    if (dayIndex(candidate) === targetDow) {
      if (s.untilDate && candidate > s.untilDate) return null;
      return candidate;
    }
  }
  return null;
}
function formatDateBox(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.toLocaleDateString("en-US", { day: "2-digit" });
  const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const year = d.getFullYear();
  return { day, monthYear: `${month} ${year}` };
}
function formatFullDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default function JadwalView() {
  const { scheds, delSched } = useStore();
  const { isDark } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const today = todayStr();

  const enriched = useMemo(() => {
    return scheds
      .map((s) => ({ ...s, nextDate: getNextOccurrence(s) }))
      .filter((s) => s.nextDate !== null)
      .sort((a, b) => {
        if (a.nextDate! !== b.nextDate!) return a.nextDate! < b.nextDate! ? -1 : 1;
        return a.start > b.start ? 1 : -1;
      });
  }, [scheds]);

  const todayCount = enriched.filter((s) => s.nextDate === today).length;
  const upcomingCount = enriched.filter((s) => s.nextDate! > today).length;

  const titleCls = isDark ? "text-3xl font-bold text-white" : "text-3xl font-bold text-zinc-900";
  const subCls = isDark ? "text-slate-400 text-sm mt-1" : "text-zinc-500 text-sm mt-1";
  const listWrap = isDark
    ? "bg-slate-900/60 p-6 rounded-3xl border border-white/10"
    : "bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm";
  const rowBase = isDark
    ? "flex items-center gap-4 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"
    : "flex items-center gap-4 p-4 bg-zinc-50 rounded-2xl hover:bg-zinc-100 transition-colors border border-zinc-100";
  const muted = isDark ? "text-slate-400" : "text-zinc-500";
  const mainText = isDark ? "text-white" : "text-zinc-900";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className={titleCls}>Jadwal</h1>
          <p className={subCls}>Kelola kegiatan dan agenda Anda</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-br from-teal-400 to-blue-500 text-zinc-900 font-bold px-5 py-3 rounded-xl hover:brightness-105 transition-all shadow-lg shadow-teal-500/20"
        >
          + Tambah Jadwal
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card accent="linear-gradient(90deg,#10b981,#059669)">
          <p className={`text-xs font-semibold tracking-widest ${muted}`}>JADWAL HARI INI</p>
          <p className={`text-5xl font-extrabold mt-2 ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>{todayCount}</p>
        </Card>
        <Card accent="linear-gradient(90deg,#3b82f6,#2563eb)">
          <p className={`text-xs font-semibold tracking-widest ${muted}`}>JADWAL MENDATANG</p>
          <p className={`text-5xl font-extrabold mt-2 ${isDark ? "text-blue-400" : "text-blue-600"}`}>{upcomingCount}</p>
        </Card>
      </div>

      <div className={listWrap}>
        {enriched.length === 0 ? (
          <div className="text-center py-16">
            <p className={`text-sm ${muted}`}>Belum ada jadwal, yuk tambahkan!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {enriched.map((s) => {
                const { day, monthYear } = formatDateBox(s.nextDate!);
                const isToday = s.nextDate === today;
                return (
                  <motion.div
                    key={s.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={rowBase}
                  >
                    <div
                      className={`flex flex-col items-center justify-center w-20 h-20 rounded-xl shrink-0 ${
                        isToday
                          ? isDark
                            ? "bg-emerald-500/10 border border-emerald-500/30"
                            : "bg-emerald-50 border border-emerald-200"
                          : isDark
                          ? "bg-slate-800 border border-white/10"
                          : "bg-zinc-100 border border-zinc-200"
                      }`}
                    >
                      <span className={`text-2xl font-extrabold ${isToday ? "text-emerald-600" : mainText}`}>{day}</span>
                      <span className={`text-[10px] font-semibold tracking-wider ${muted}`}>{monthYear}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold ${mainText}`}>{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-1.5">
                        <span className={`flex items-center gap-1 text-sm ${isDark ? "text-slate-300" : "text-zinc-700"}`}>
                          🕐 {s.start}{s.end ? ` - ${s.end}` : ""}
                        </span>
                        {s.recurring && (
                          <>
                            <span className={isDark ? "flex items-center gap-1 bg-purple-500/15 text-purple-300 text-xs font-semibold px-2.5 py-1 rounded-full" : "flex items-center gap-1 bg-purple-50 text-purple-700 text-xs font-semibold px-2.5 py-1 rounded-full"}>
                              🔄 Setiap Minggu
                            </span>
                            {s.untilDate && (
                              <span className={`text-xs ${muted}`}>s/d {formatFullDate(s.untilDate)}</span>
                            )}
                          </>
                        )}
                      </div>
                      {s.desc && (<p className={`text-sm mt-1.5 truncate ${muted}`}>{s.desc}</p>)}
                    </div>

                    <button
                      onClick={() => { if (confirm(`Hapus jadwal "${s.name}"?`)) delSched(s.id); }}
                      className={isDark ? "shrink-0 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-semibold text-sm px-4 py-2 rounded-lg transition-colors" : "shrink-0 bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"}
                    >
                      Hapus
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && <ScheduleModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}
