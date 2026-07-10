import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "./Card";
import TransactionList from "./TransactionList";
import WeeklyChart from "./WeeklyChart";
import WalletManager from "./WalletManager";
import { formatRupiah } from "../lib/format";
import { useStore, todayStr } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";

const CATEGORIES: Record<"in" | "out", string[]> = {
  in: ["Gaji", "Bonus", "Hadiah", "Investasi", "Lainnya"],
  out: ["Makan", "Transport", "Belanja", "Tagihan", "Hiburan", "Kesehatan", "Lainnya"],
};

export default function KeuanganView() {
  const { wallets, addTx, inMonth, outMonth, balance } = useStore();
  const { isDark } = useTheme();

  const [type, setType] = useState<"" | "in" | "out">("");
  const [cat, setCat] = useState("");
  const [walletId, setWalletId] = useState<string>("");
  const [amt, setAmt] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(todayStr());
  const [filterWallet, setFilterWallet] = useState<string>("all");
  const [showWalletManager, setShowWalletManager] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !cat || !walletId || !amt) {
      alert("Lengkapi semua field!");
      return;
    }
    const numAmt = parseInt(amt.replace(/\D/g, ""));
    if (isNaN(numAmt) || numAmt <= 0) {
      alert("Jumlah tidak valid!");
      return;
    }
    addTx({
      type,
      cat,
      desc: desc || cat,
      amt: numAmt,
      date,
      walletId: parseInt(walletId),
    });
    setType(""); setCat(""); setWalletId(""); setAmt(""); setDesc(""); setDate(todayStr());
  };

  const formatInputRupiah = (val: string) => {
    const num = val.replace(/\D/g, "");
    return num ? parseInt(num).toLocaleString("id-ID") : "";
  };

  const inputCls = isDark
    ? "w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-teal-400"
    : "w-full mt-1 bg-white border border-zinc-300 rounded-lg p-3 text-sm text-zinc-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20";
  const labelCls = isDark ? "text-[11px] font-bold text-slate-500 uppercase tracking-wider" : "text-[11px] font-bold text-zinc-500 uppercase tracking-wider";
  const titleCls = isDark ? "text-3xl font-bold text-white" : "text-3xl font-bold text-zinc-900";
  const subCls = isDark ? "text-slate-400 text-sm" : "text-zinc-500 text-sm";
  const mutedSmall = isDark ? "text-[10px] text-slate-500 mt-1" : "text-[10px] text-zinc-500 mt-1";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={titleCls}>Keuangan</h1>
          <p className={subCls}>Lacak setiap rupiah</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card accent="linear-gradient(90deg,#10b981,#059669)">
          <p className={`text-xs font-semibold tracking-widest ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>PEMASUKAN</p>
          <p className={`text-3xl font-extrabold mt-2 ${isDark ? "text-white" : "text-zinc-900"}`}>{formatRupiah(inMonth)}</p>
        </Card>
        <Card accent="linear-gradient(90deg,#f43f5e,#e11d48)">
          <p className={`text-xs font-semibold tracking-widest ${isDark ? "text-rose-400" : "text-rose-600"}`}>PENGELUARAN</p>
          <p className={`text-3xl font-extrabold mt-2 ${isDark ? "text-white" : "text-zinc-900"}`}>{formatRupiah(outMonth)}</p>
        </Card>
        <Card accent="linear-gradient(90deg,#3b82f6,#2563eb)">
          <p className={`text-xs font-semibold tracking-widest ${isDark ? "text-blue-400" : "text-blue-600"}`}>SALDO BULAN INI</p>
          <p className={`text-3xl font-extrabold mt-2 ${isDark ? "text-white" : "text-zinc-900"}`}>{formatRupiah(balance)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {wallets.map((w, i) => (
          <motion.div
            key={w.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -4 }}
            className={isDark
              ? "bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30 rounded-2xl p-4 hover:border-emerald-400 transition-shadow duration-300 shadow-lg shadow-black/5 cursor-pointer"
              : "bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-200 rounded-2xl p-4 hover:border-emerald-400 transition-shadow duration-300 shadow-sm hover:shadow-md cursor-pointer"
            }
          >
            <div className="text-2xl mb-2">{w.icon}</div>
            <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-300" : "text-zinc-600"}`}>{w.name}</p>
            <p className="text-lg font-extrabold text-emerald-600 mt-1">{formatRupiah(w.balance)}</p>
          </motion.div>
        ))}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: wallets.length * 0.05 }}
          whileHover={{ y: -4, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowWalletManager(true)}
          className={isDark
            ? "border-2 border-dashed border-white/20 rounded-2xl p-4 flex flex-col items-center justify-center hover:border-emerald-400 hover:bg-emerald-500/5 transition-all group min-h-[110px]"
            : "border-2 border-dashed border-zinc-300 rounded-2xl p-4 flex flex-col items-center justify-center hover:border-emerald-400 hover:bg-emerald-50 transition-all group min-h-[110px] bg-white"
          }
        >
          <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">👛</div>
          <p className={`text-xs font-semibold ${isDark ? "text-slate-400 group-hover:text-emerald-400" : "text-zinc-500 group-hover:text-emerald-600"}`}>Kelola Dompet</p>
        </motion.button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <p className={`text-xs font-semibold mb-6 uppercase tracking-widest ${isDark ? "text-slate-400" : "text-zinc-500"}`}>Tambah Transaksi</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Tipe</label>
                <select
                  value={type}
                  onChange={(e) => { setType(e.target.value as "in" | "out"); setCat(""); }}
                  className={inputCls}
                >
                  <option value="">-- Pilih Tipe --</option>
                  <option value="in">Pemasukan</option>
                  <option value="out">Pengeluaran</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Kategori</label>
                <select
                  value={cat}
                  onChange={(e) => setCat(e.target.value)}
                  disabled={!type}
                  className={inputCls + " disabled:opacity-50"}
                >
                  <option value="">-- Pilih --</option>
                  {type && CATEGORIES[type].map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Dompet / Rekening</label>
              <select value={walletId} onChange={(e) => setWalletId(e.target.value)} className={inputCls}>
                <option value="">-- Pilih Dompet --</option>
                {wallets.map((w) => (<option key={w.id} value={w.id}>{w.icon} {w.name}</option>))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Jumlah (Rp)</label>
              <input
                type="text"
                inputMode="numeric"
                value={amt ? `Rp ${formatInputRupiah(amt)}` : ""}
                onChange={(e) => setAmt(e.target.value.replace(/\D/g, ""))}
                placeholder="Rp 0"
                className={inputCls}
              />
              <p className={mutedSmall}>Contoh: 1.250.000 (titik = ribuan)</p>
            </div>

            <div>
              <label className={labelCls}>Keterangan</label>
              <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Misal: makan siang di warteg"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Tanggal</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-br from-teal-400 to-blue-500 text-zinc-900 font-bold py-3 rounded-xl hover:brightness-105 transition-all shadow-lg shadow-teal-500/10"
            >
              Simpan Transaksi
            </button>
          </form>
        </Card>

        <Card>
          <p className={`text-xs font-semibold mb-6 uppercase tracking-widest ${isDark ? "text-slate-400" : "text-zinc-500"}`}>7 Hari Terakhir</p>
          <WeeklyChart />
        </Card>
      </div>

      <Card>
        <label className={labelCls}>Filter Transaksi per Dompet</label>
        <select
          value={filterWallet}
          onChange={(e) => setFilterWallet(e.target.value)}
          className={inputCls.replace(" mt-1", " mt-2")}
        >
          <option value="all">💼 Semua Dompet</option>
          {wallets.map((w) => (<option key={w.id} value={w.id}>{w.icon} {w.name}</option>))}
        </select>
      </Card>

      <TransactionList filterWallet={filterWallet} />

      <AnimatePresence>
        {showWalletManager && <WalletManager onClose={() => setShowWalletManager(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}
