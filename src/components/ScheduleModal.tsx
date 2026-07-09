import { useState } from "react";
import { motion } from "framer-motion";
import { useStore, todayStr } from "../lib/store";

interface Props {
  onClose: () => void;
}

export default function ScheduleModal({ onClose }: Props) {
  const { addSched } = useStore();

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(todayStr());
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [untilDate, setUntilDate] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) {
      alert("Nama jadwal harus diisi!");
      return;
    }
    if (!date || !start) {
      alert("Tanggal dan jam mulai harus diisi!");
      return;
    }
    if (recurring && !untilDate) {
      alert("Isi tanggal batas pengulangan!");
      return;
    }

    addSched({
      name: name.trim(),
      desc: desc.trim() || undefined,
      date,
      start,
      end: end || undefined,
      recurring,
      untilDate: recurring ? untilDate : undefined,
    });

    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Tambah Jadwal</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-3xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Nama Kegiatan
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Misal: Meeting Tim"
              className="w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Tanggal
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Jam Mulai
              </label>
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Jam Selesai (opsional)
            </label>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Deskripsi (opsional)
            </label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Misal: Meeting Mingguan"
              className="w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-400"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer bg-white/5 rounded-xl p-3">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="w-4 h-4 accent-emerald-400"
            />
            <span className="text-sm text-white font-medium">🔄 Ulangi Setiap Minggu</span>
          </label>

          {recurring && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Berulang Sampai Tanggal
              </label>
              <input
                type="date"
                value={untilDate}
                onChange={(e) => setUntilDate(e.target.value)}
                min={date}
                className="w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-400"
              />
            </motion.div>
          )}

          <button
            onClick={handleSubmit}
            className="w-full bg-emerald-400 text-slate-900 font-bold py-3 rounded-xl hover:bg-emerald-500 transition-colors"
          >
            Simpan Jadwal
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}