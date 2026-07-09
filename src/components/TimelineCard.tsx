import { motion } from "framer-motion";
import Card from "./Card";
import { useStore, type ScheduleItem } from "../lib/store";

function timeToHour(t?: string) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h + (m || 0) / 60;
}

export default function TimelineCard() {
  const { todaySchedules } = useStore();
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;

  const closest =
    todaySchedules.length > 0
      ? todaySchedules.reduce((prev, curr) =>
          Math.abs(timeToHour(curr.start) - hour) < Math.abs(timeToHour(prev.start) - hour) ? curr : prev
        )
      : null;

  return (
    <Card accent="linear-gradient(90deg,#34d399,#22d3ee)" className="flex flex-col" delay={0.1}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-widest text-slate-400">TIMELINE HARI INI</p>
        {closest && (
          <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            {closest.icon ?? "📌"} {closest.name}
          </span>
        )}
      </div>

      <div className="relative mt-8 px-1">
        <div className="relative h-1.5 w-full rounded-full bg-white/5">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
            style={{ width: `${(hour / 24) * 100}%` }}
          />
          {todaySchedules.map((a: ScheduleItem) => (
            <div
              key={a.id}
              className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-slate-900 bg-slate-500"
              style={{ left: `${(timeToHour(a.start) / 24) * 100}%` }}
              title={`${a.start} ${a.name}`}
            />
          ))}
          <motion.div
            className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-slate-900 bg-emerald-400 shadow-lg shadow-emerald-400/50"
            style={{ left: `${(hour / 24) * 100}%` }}
          />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-sm text-slate-400">
        <span>00:00</span>
        <span className="font-mono font-semibold text-white">
          {String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}
        </span>
        <span>23:59</span>
      </div>

      <div className="mt-6 grid flex-1 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
        {todaySchedules.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 py-8 text-center text-slate-500">
            <span className="text-2xl">📅</span>
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
                isActive ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/5 bg-white/[0.02] hover:bg-white/5"
              }`}
            >
              <span className="text-lg">{a.icon ?? "📌"}</span>
              <div>
                <p className="text-sm font-medium text-white">{a.name}</p>
                <p className="text-xs text-slate-400">
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
