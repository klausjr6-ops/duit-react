import { useState } from "react";
import { motion } from "framer-motion";
import { useStore, type ScheduleItem } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";
import { useModalDialog } from "../hooks/useModalDialog";
import { toast } from "../hooks/useToast";
import { IconRepeat, IconClose } from "../utils/icons";
import { SCHEDULE_ICONS } from "../utils/icons";

interface Props { sched: ScheduleItem; onClose: () => void; }

export default function EditScheduleModal({ sched, onClose }: Props) {
  const { updateSched } = useStore();
  const { isDark } = useTheme();
  const [name, setName] = useState(sched.name);
  const [desc, setDesc] = useState(sched.desc || "");
  const [date, setDate] = useState(sched.date || "");
  const [start, setStart] = useState(sched.start);
  const [end, setEnd] = useState(sched.end || "");
  const [recurring, setRecurring] = useState(!!sched.recurring);
  const [untilDate, setUntilDate] = useState(sched.untilDate || "");
  const [icon, setIcon] = useState(sched.icon || SCHEDULE_ICONS[0].key);
  const [error, setError] = useState<string | null>(null);
  const { dialogRef, onDialogKeyDown } = useModalDialog(true, onClose);

  const handleSubmit = () => {
    setError(null);
    if (!name.trim()) { setError("Nama jadwal harus diisi."); return; }
    if (!date || !start) { setError("Tanggal dan jam mulai harus diisi."); return; }
    if (end && end <= start) { setError("Jam selesai harus setelah jam mulai."); return; }
    if (recurring && !untilDate) { setError("Isi tanggal batas pengulangan."); return; }
    if (recurring && untilDate < date) { setError("Tanggal batas tidak boleh sebelum tanggal mulai."); return; }
    const result = updateSched(sched.id, { name: name.trim(), desc: desc.trim() || undefined, date, start, end: end || undefined, recurring, untilDate: recurring ? untilDate : undefined, icon });
    if (!result.ok) { setError(result.message || "Jadwal belum berhasil diperbarui."); return; }
    toast.success(`Jadwal "${name.trim()}" berhasil diperbarui`);
    onClose();
  };

  const panel = isDark ? "bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto" : "bg-white border border-zinc-200 rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto shadow-xl";
  const labelCls = isDark ? "text-[11px] font-bold text-slate-500 uppercase tracking-wider" : "text-[11px] font-bold text-zinc-500 uppercase tracking-wider";
  const inputCls = isDark ? "w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-teal-400" : "w-full mt-1 bg-zinc-50 border border-zinc-300 rounded-lg p-3 text-sm text-zinc-900 focus:outline-none focus:border-teal-500";
  const titleCls = isDark ? "text-xl font-bold text-white" : "text-xl font-bold text-zinc-900";
  const closeCls = isDark ? "text-slate-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900";

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose} className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div ref={dialogRef} role="dialog" aria-modal="true" onKeyDown={onDialogKeyDown} initial={{scale:0.95,y:20}} animate={{scale:1,y:0}} exit={{scale:0.95,y:20}} onClick={e=>e.stopPropagation()} className={panel}>
        <div className="flex justify-between items-center mb-5"><h2 className={titleCls}>Edit Jadwal</h2><button onClick={onClose} className={closeCls}><IconClose size={20} /></button></div>
        <div className="space-y-4">
          <div><label className={labelCls}>Nama Kegiatan</label><input value={name} onChange={e=>setName(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Icon</label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {SCHEDULE_ICONS.map((ic) => (
                <button
                  key={ic.key}
                  type="button"
                  onClick={() => setIcon(ic.key)}
                  title={ic.label}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                    icon === ic.key
                      ? "border-teal-400 bg-teal-500/10 text-teal-500"
                      : isDark
                        ? "border-white/10 text-slate-400 hover:border-white/30"
                        : "border-zinc-200 text-zinc-500 hover:border-zinc-400 bg-white"
                  }`}
                >
                  {ic.icon}
                  <span className="text-[9px] font-semibold">{ic.label}</span>
                </button>
              ))}
            </div>
            {!SCHEDULE_ICONS.some((ic) => ic.key === icon) && (
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-xs ${isDark ? "text-slate-500" : "text-zinc-500"}`}>Icon lama:</span>
                <span className="text-xl">{icon}</span>
                <button type="button" onClick={() => setIcon(SCHEDULE_ICONS[0].key)} className="text-[10px] text-teal-500 font-semibold">Ganti ke baru</button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Tanggal</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Jam Mulai</label><input type="time" value={start} onChange={e=>setStart(e.target.value)} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Jam Selesai</label><input type="time" value={end} onChange={e=>setEnd(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Deskripsi</label><input value={desc} onChange={e=>setDesc(e.target.value)} className={inputCls} /></div>
          <label className={isDark?"flex items-center gap-3 cursor-pointer bg-white/5 rounded-xl p-3":"flex items-center gap-3 cursor-pointer bg-zinc-50 border border-zinc-200 rounded-xl p-3"}>
            <input type="checkbox" checked={recurring} onChange={e=>setRecurring(e.target.checked)} className="w-4 h-4 accent-teal-500" />
            <span className={isDark?"text-sm text-white font-medium":"text-sm text-zinc-900 font-medium"}><span className="inline-flex items-center gap-1.5"><IconRepeat size={14} /> Ulangi Setiap Minggu</span></span>
          </label>
          {recurring && <div><label className={labelCls}>Berulang Sampai</label><input type="date" value={untilDate} onChange={e=>setUntilDate(e.target.value)} min={date} className={inputCls} /></div>}
          {error && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-500">{error}</p>}
          <button onClick={handleSubmit} className="w-full bg-gradient-to-br from-teal-400 to-blue-500 text-zinc-900 font-bold py-3 rounded-xl hover:brightness-105">Simpan Perubahan</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
