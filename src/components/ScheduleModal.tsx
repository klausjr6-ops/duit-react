import { useState } from "react";
import { motion } from "framer-motion";
import { useStore, todayStr } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";

interface Props {
  onClose: () => void;
}

export default function ScheduleModal({ onClose }: Props) {
  const { addSched } = useStore();
  const { isDark } = useTheme();

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(todayStr());
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [untilDate, setUntilDate] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) { alert("Nama jadwal harus diisi!"); return; }
    if (!date || !start) { alert("Tanggal dan jam mulai harus diisi!"); return; }
    if (recurring && !untilDate) { alert("Isi tanggal batas pengulangan!"); return; }
    addSched({ name: name.trim(), desc: desc.trim() || undefined, date, start, end: end || undefined, recurring, untilDate: recurring ? untilDate : undefined });
    onClose();
  };

  const panel = isDark
    ? "bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto"
    : "bg-white border border-zinc-200 rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto shadow-xl";
  const labelCls = isDark ? "text-[11px] font-bold text-slate-500 uppercase tracking-wider" : "text-[11px] font-bold text-zinc-500 uppercase tracking-wider";
  const inputCls = isDark
    ? "w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-teal-400"
    : "w-full mt-1 bg-zinc-50 border border-zinc-300 rounded-lg p-3 text-sm text-zinc-900 focus:outline-none focus:border-teal-500 focus:bg-white";
  const titleCls = isDark ? "text-xl font-bold text-white" : "text-xl font-bold text-zinc-900";
  const closeCls = isDark ? "text-slate-400 hover:text-white text-3xl leading-none w-8 h-8 flex items-center justify-center" : "text-zinc-500 hover:text-zinc-900 text-3xl leading-none w-8 h-8 flex items-center justify-center";
  const checkWrap = isDark ? "flex items-center gap-3 cursor-pointer bg-white/5 rounded-xl p-3" : "flex items-center gap-3 cursor-pointer bg-zinc-50 border border-zinc-200 rounded-xl p-3";
  const checkText = isDark ? "text-sm text-white font-medium" : "text-sm text-zinc-900 font-medium";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()} className={panel}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={titleCls}>Tambah Jadwal</h2>
          <button onClick={onClose} className={closeCls}>×</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Nama Kegiatan</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Misal: Meeting Tim" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tanggal</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Jam Mulai</label>
              <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Jam Selesai (opsional)</label>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Deskripsi (opsional)</label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Misal: Meeting Mingguan" className={inputCls} />
          </div>
          <label className={checkWrap}>
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="w-4 h-4 accent-teal-500" />
            <span className={checkText}>🔄 Ulangi Setiap Minggu</span>
          </label>
          {recurring && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
              <label className={labelCls}>Berulang Sampai Tanggal</label>
              <input type="date" value={untilDate} onChange={(e) => setUntilDate(e.target.value)} min={date} className={inputCls} />
            </motion.div>
          )}
          <button onClick={handleSubmit} className="w-full bg-gradient-to-br from-teal-400 to-blue-500 text-zinc-900 font-bold py-3 rounded-xl hover:brightness-105 transition-all">
            Simpan Jadwal
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
