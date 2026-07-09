import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "../components/Card";
import ScheduleModal from "../components/ScheduleModal";
import { useStore, todayStr, type ScheduleItem } from "../lib/store";

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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Jadwal</h1>
          <p className="text-slate-400 text-sm mt-1">Kelola kegiatan dan agenda Anda</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowModal(true)}
          className="bg-emerald-400 text-slate-900 font-bold px-5 py-3 rounded-xl hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-500/20"
        >
          + Tambah Jadwal
        </motion.button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card accent="linear-gradient(90deg,#10b981,#059669)">
          <p className="text-xs font-semibold tracking-widest text-slate-400">JADWAL HARI INI</p>
          <p className="text-5xl font-extrabold text-emerald-400 mt-2">{todayCount}</p>
        </Card>
        <Card accent="linear-gradient(90deg,#3b82f6,#2563eb)">
          <p className="text-xs font-semibold tracking-widest text-slate-400">JADWAL MENDATANG</p>
          <p className="text-5xl font-extrabold text-blue-400 mt-2">{upcomingCount}</p>
        </Card>
      </div>

      {/* List Jadwal */}
      <div className="bg-slate-900/60 p-6 rounded-3xl border border-white/10">
        {enriched.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-sm">Belum ada jadwal, yuk tambahkan!</p>
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
                    className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"
                  >
                    {/* Date Box */}
                    <div
                      className={`flex flex-col items-center justify-center w-20 h-20 rounded-xl shrink-0 ${
                        isToday
                          ? "bg-emerald-500/10 border border-emerald-500/30"
                          : "bg-slate-800 border border-white/10"
                      }`}
                    >
                      <span
                        className={`text-2xl font-extrabold ${
                          isToday ? "text-emerald-400" : "text-white"
                        }`}
                      >
                        {day}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 tracking-wider">
                        {monthYear}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-1.5">
                        <span className="flex items-center gap-1 text-sm text-slate-300">
                          🕐 {s.start}
                          {s.end ? ` - ${s.end}` : ""}
                        </span>
                        {s.recurring && (
                          <>
                            <span className="flex items-center gap-1 bg-purple-500/15 text-purple-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                              🔄 Setiap Minggu
                            </span>
                            {s.untilDate && (
                              <span className="text-xs text-slate-500">
                                s/d {formatFullDate(s.untilDate)}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      {s.desc && (
                        <p className="text-sm text-slate-500 mt-1.5 truncate">{s.desc}</p>
                      )}
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => {
                        if (confirm(`Hapus jadwal "${s.name}"?`)) delSched(s.id);
                      }}
                      className="shrink-0 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
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