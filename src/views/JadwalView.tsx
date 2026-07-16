import { IconCalendar, IconClock, IconRepeat, IconEdit, IconTrash, getScheduleIcon } from "../utils/icons";
import { toast } from "../hooks/useToast";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "../components/Card";
import ScheduleModal from "../components/ScheduleModal";
import EditScheduleModal from "../components/EditScheduleModal";
import { getNextScheduleOccurrence, todayStr, useStore } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import type { ScheduleItem } from "../lib/store";

function dateAtJakartaNoon(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 5));
}

function formatDateBox(dateKey: string) {
  const date = dateAtJakartaNoon(dateKey);
  const day = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
  const month = new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "Asia/Jakarta",
  })
    .format(date)
    .toUpperCase();
  const year = new Intl.DateTimeFormat("id-ID", {
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);

  return { day, monthYear: `${month} ${year}` };
}

function formatFullDate(dateKey: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(dateAtJakartaNoon(dateKey));
}

export default function JadwalView() {
  const { scheds, delSched } = useStore();
  const { isDark } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<ScheduleItem | null>(null);
  const [scheduleToEdit, setScheduleToEdit] = useState<ScheduleItem | null>(null);
  const today = todayStr();

  const enriched = useMemo(
    () =>
      scheds
        .map((schedule) => ({
          ...schedule,
          nextDate: getNextScheduleOccurrence(schedule, today),
        }))
        .filter((schedule): schedule is typeof schedule & { nextDate: string } => Boolean(schedule.nextDate))
        .sort((a, b) => {
          if (a.nextDate !== b.nextDate) return a.nextDate.localeCompare(b.nextDate);
          return a.start.localeCompare(b.start);
        }),
    [scheds, today]
  );

  const todayCount = enriched.filter((schedule) => schedule.nextDate === today).length;
  const upcomingCount = enriched.filter((schedule) => schedule.nextDate > today).length;

  const titleClass = isDark ? "text-3xl font-bold text-white" : "text-3xl font-bold text-zinc-900";
  const subtitleClass = isDark ? "mt-1 text-sm text-slate-400" : "mt-1 text-sm text-zinc-500";
  const listClass = isDark
    ? "rounded-3xl border border-white/10 bg-slate-900/60 p-6"
    : "rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm";
  const rowClass = isDark
    ? "flex items-center gap-4 rounded-2xl bg-white/5 p-4 transition-colors hover:bg-white/10"
    : "flex items-center gap-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 transition-colors hover:bg-zinc-100";
  const mutedClass = isDark ? "text-slate-400" : "text-zinc-500";
  const mainTextClass = isDark ? "text-white" : "text-zinc-900";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={titleClass}>Jadwal</h1>
          <p className={subtitleClass}>Kelola kegiatan dan agenda Anda</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowModal(true)}
          className="rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 px-5 py-3 font-bold text-zinc-900 shadow-lg shadow-teal-500/20 transition-all hover:brightness-105"
        >
          + Tambah Jadwal
        </motion.button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card accent="linear-gradient(90deg,#10b981,#059669)">
          <p className={`text-xs font-semibold tracking-widest ${mutedClass}`}>JADWAL HARI INI</p>
          <p className={`mt-2 text-5xl font-extrabold ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>{todayCount}</p>
        </Card>
        <Card accent="linear-gradient(90deg,#3b82f6,#2563eb)">
          <p className={`text-xs font-semibold tracking-widest ${mutedClass}`}>JADWAL MENDATANG</p>
          <p className={`mt-2 text-5xl font-extrabold ${isDark ? "text-blue-400" : "text-blue-600"}`}>{upcomingCount}</p>
        </Card>
      </div>

      <div className={listClass}>
        {enriched.length === 0 ? (
          <EmptyState
            compact
            icon={<IconCalendar size={32} />}
            title="Belum ada jadwal"
            description="Tambahkan jadwal tagihan, rutinitas mingguan, kelas, meeting, atau reminder penting supaya hari kamu lebih teratur."
            tips={["Bayar listrik", "Olahraga", "Meeting", "Mingguan"]}
            actionLabel="Tambah Jadwal"
            onAction={() => setShowModal(true)}
          />
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {enriched.map((schedule) => {
                const { day, monthYear } = formatDateBox(schedule.nextDate);
                const isToday = schedule.nextDate === today;

                return (
                  <motion.div
                    key={schedule.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={rowClass}
                  >
                    <div
                      className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl ${
                        isToday
                          ? isDark
                            ? "border border-emerald-500/30 bg-emerald-500/10"
                            : "border border-emerald-200 bg-emerald-50"
                          : isDark
                            ? "border border-white/10 bg-slate-800"
                            : "border border-zinc-200 bg-zinc-100"
                      }`}
                    >
                      <span className={`text-2xl font-extrabold ${isToday ? "text-emerald-600" : mainTextClass}`}>{day}</span>
                      <span className={`text-[10px] font-semibold tracking-wider ${mutedClass}`}>{monthYear}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={mutedClass}>{getScheduleIcon(schedule.icon ?? "pin", 16)}</span>
                        <span className={`font-bold ${mainTextClass}`}>{schedule.name}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className={`flex items-center gap-1 text-sm ${isDark ? "text-slate-300" : "text-zinc-700"}`}>
                          <IconClock size={14} /> {schedule.start}{schedule.end ? ` - ${schedule.end}` : ""}
                        </span>
                        {schedule.recurring && (
                          <>
                            <span className={`flex items-center gap-1 ${isDark ? "rounded-full bg-purple-500/15 px-2.5 py-1 text-xs font-semibold text-purple-300" : "rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700"}`}>
                              <IconRepeat size={12} /> Setiap Minggu
                            </span>
                            {schedule.untilDate && (
                              <span className={`text-xs ${mutedClass}`}>s/d {formatFullDate(schedule.untilDate)}</span>
                            )}
                          </>
                        )}
                      </div>
                      {schedule.desc && <p className={`mt-1.5 truncate text-sm ${mutedClass}`}>{schedule.desc}</p>}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setScheduleToEdit(schedule)}
                      className={isDark ? "p-2 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-white/10 transition-colors" : "p-2 rounded-lg text-zinc-400 hover:text-teal-600 hover:bg-zinc-100 transition-colors"}
                      aria-label={`Edit jadwal ${schedule.name}`}
                    >
                      <IconEdit size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleToDelete(schedule)}
                      className={isDark ? "p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors" : "p-2 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"}
                      aria-label={`Hapus jadwal ${schedule.name}`}
                    >
                      <IconTrash size={16} />
                    </button>
                    </div>
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
      <AnimatePresence>
        {scheduleToEdit && <EditScheduleModal sched={scheduleToEdit} onClose={() => setScheduleToEdit(null)} />}
      </AnimatePresence>
      <ConfirmDialog
        open={Boolean(scheduleToDelete)}
        title="Hapus Jadwal?"
        message={scheduleToDelete ? `Jadwal “${scheduleToDelete.name}” akan dihapus permanen.` : ""}
        confirmLabel="Ya, Hapus"
        onClose={() => setScheduleToDelete(null)}
        onConfirm={() => {
          if (scheduleToDelete) {
            delSched(scheduleToDelete.id);
            toast.success(`Jadwal "${scheduleToDelete.name}" dihapus`);
          }
          setScheduleToDelete(null);
        }}
        isDark={isDark}
      />
    </motion.div>
  );
}
