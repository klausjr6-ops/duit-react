import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Card from "./Card";
import { useStore, type ScheduleItem } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";
import { IconCalendar, getScheduleIcon } from "../utils/icons";
import { jakartaTimeParts } from "../lib/format";

function timeToHour(t?: string) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h + (m || 0) / 60;
}

export default function TimelineCard() {
  const { todaySchedules } = useStore();
  const { isDark } = useTheme();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const jakartaNow = jakartaTimeParts(now);
  const hour = jakartaNow.hour + jakartaNow.minute / 60;

  const closest =
    todaySchedules.length > 0
      ? todaySchedules.reduce((prev, curr) =>
          Math.abs(timeToHour(curr.start) - hour) < Math.abs(timeToHour(prev.start) - hour) ? curr : prev
        )
      : null;

  const muted = isDark ? "text-slate-400" : "text-zinc-500";
  const trackBg = isDark ? "bg-white/5" : "bg-zinc-200";
  const itemBorder = isDark ? "border-white/5 bg-white/[0.02] hover:bg-white/5" : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100";
  const textMain = isDark ? "text-white" : "text-zinc-900";

  return (
    <Card accent="linear-gradient(90deg,#2dd4bf,#22d3ee)" className="flex flex-col" delay={0.1}>
      <div className="flex items-center justify-between">
        <p className={`text-xs font-semibold tracking-widest ${muted}`}>TIMELINE HARI INI</p>
        {closest && (
          <span className={isDark 
            ? "rounded-full bg-teal-400/10 px-3 py-1 text-xs font-semibold text-teal-400"
            : "rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700"
          }>
            <IconCalendar size={12} /> {closest.name}
          </span>
        )}
      </div>

      <div className="relative mt-8 px-1">
        <div className={`relative h-1.5 w-full rounded-full ${trackBg}`}>
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-teal-400 to-blue-500"
            style={{ width: `${(hour / 24) * 100}%` }}
          />
          {todaySchedules.map((a: ScheduleItem) => (
            <div
              key={a.id}
              className={`absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 ${isDark ? "border-slate-900 bg-slate-500" : "border-white bg-zinc-400"}`}
              style={{ left: `${(timeToHour(a.start) / 24) * 100}%` }}
              title={`${a.start} ${a.name}`}
            />
          ))}
          <motion.div
            className={`absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 ${isDark ? "border-slate-900" : "border-white"} bg-teal-400 shadow-lg shadow-teal-400/40`}
            style={{ left: `${(hour / 24) * 100}%` }}
          />
        </div>
      </div>

      <div className={`mt-2 flex items-center justify-between text-sm ${muted}`}>
        <span>00:00</span>
        <span className={`font-mono font-semibold ${textMain}`}>
          {String(jakartaNow.hour).padStart(2, "0")}:{String(jakartaNow.minute).padStart(2, "0")}
        </span>
        <span>23:59</span>
      </div>

      <div className="mt-6 grid flex-1 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
        {todaySchedules.length === 0 && (
          <div className={`col-span-full flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-8 text-center ${isDark ? "border-white/10 text-slate-500" : "border-zinc-300 text-zinc-500"}`}>
            <span className="text-teal-500"><IconCalendar size={28} /></span>
            <span className="text-sm">Belum ada jadwal hari ini</span>
          </div>
        )}
        {todaySchedules.map((a) => {
          const isActive = closest?.id === a.id;
          return (
            <motion.div
              key={a.id}
              whileHover={{ scale: 1.02 }}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                isActive ? "border-teal-400/40 bg-teal-400/10" : itemBorder
              }`}
            >
              <span className="text-lg">{a.icon ? getScheduleIcon(a.icon, 18) : <IconCalendar size={18} />}</span>
              <div>
                <p className={`text-sm font-medium ${textMain}`}>{a.name}</p>
                <p className={`text-xs ${muted}`}>
                  {a.start}
                  {a.end ? `–${a.end}` : ""}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}
