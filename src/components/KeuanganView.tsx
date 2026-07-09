import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "./Card";
import TransactionList from "./TransactionList";
import WeeklyChart from "./WeeklyChart";
import WalletManager from "./WalletManager";
import { formatRupiah } from "../lib/format";
import { useStore, todayStr } from "../lib/store";

const CATEGORIES: Record<"in" | "out", string[]> = {
  in: ["Gaji", "Bonus", "Hadiah", "Investasi", "Lainnya"],
  out: ["Makan", "Transport", "Belanja", "Tagihan", "Hiburan", "Kesehatan", "Lainnya"],
};

export default function KeuanganView() {
  const { wallets, addTx, inMonth, outMonth, balance } = useStore();

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
    setType("");
    setCat("");
    setWalletId("");
    setAmt("");
    setDesc("");
    setDate(todayStr());
  };

  const formatInputRupiah = (val: string) => {
    const num = val.replace(/\D/g, "");
    return num ? parseInt(num).toLocaleString("id-ID") : "";
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Keuangan</h1>
          <p className="text-slate-400 text-sm">Lacak setiap rupiah</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card accent="linear-gradient(90deg,#10b981,#059669)">
          <p className="text-xs font-semibold tracking-widest text-emerald-400">PEMASUKAN</p>
          <p className="text-3xl font-extrabold text-white mt-2">{formatRupiah(inMonth)}</p>
        </Card>
        <Card accent="linear-gradient(90deg,#f43f5e,#e11d48)">
          <p className="text-xs font-semibold tracking-widest text-rose-400">PENGELUARAN</p>
          <p className="text-3xl font-extrabold text-white mt-2">{formatRupiah(outMonth)}</p>
        </Card>
        <Card accent="linear-gradient(90deg,#3b82f6,#2563eb)">
          <p className="text-xs font-semibold tracking-widest text-blue-400">SALDO BULAN INI</p>
          <p className="text-3xl font-extrabold text-white mt-2">{formatRupiah(balance)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {wallets.map((w) => (
          <div
            key={w.id}
            className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30 rounded-2xl p-4 hover:border-emerald-400 transition-all"
          >
            <div className="text-2xl mb-2">{w.icon}</div>
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">{w.name}</p>
            <p className="text-lg font-extrabold text-emerald-400 mt-1">{formatRupiah(w.balance)}</p>
          </div>
        ))}
        <button
          onClick={() => setShowWalletManager(true)}
          className="border-2 border-dashed border-white/20 rounded-2xl p-4 flex flex-col items-center justify-center hover:border-emerald-400 hover:bg-emerald-500/5 transition-all group min-h-[110px]"
        >
          <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">👛</div>
          <p className="text-xs font-semibold text-slate-400 group-hover:text-emerald-400">Kelola Dompet</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <p className="text-xs font-semibold text-slate-400 mb-6 uppercase tracking-wider">Tambah Transaksi</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tipe</label>
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value as "in" | "out");
                    setCat("");
                  }}
                  className="w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="">-- Pilih Tipe --</option>
                  <option value="in">Pemasukan</option>
                  <option value="out">Pengeluaran</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kategori</label>
                <select
                  value={cat}
                  onChange={(e) => setCat(e.target.value)}
                  disabled={!type}
                  className="w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-400 disabled:opacity-40"
                >
                  <option value="">-- Pilih --</option>
                  {type &&
                    CATEGORIES[type].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dompet / Rekening</label>
              <select
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-400"
              >
                <option value="">-- Pilih Dompet --</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.icon} {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Jumlah (Rp)</label>
              <input
                type="text"
                inputMode="numeric"
                value={amt ? `Rp ${formatInputRupiah(amt)}` : ""}
                onChange={(e) => setAmt(e.target.value.replace(/\D/g, ""))}
                placeholder="Rp 0"
                className="w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-400"
              />
              <p className="text-[10px] text-slate-500 mt-1">Contoh: 1.250.000 (titik = ribuan)</p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Keterangan</label>
              <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Misal: makan siang di warteg"
                className="w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tanggal</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-400 text-slate-900 font-bold py-3 rounded-xl hover:bg-emerald-500 transition-colors"
            >
              Simpan Transaksi
            </button>
          </form>
        </Card>

        <Card>
          <p className="text-xs font-semibold text-slate-400 mb-6 uppercase tracking-wider">7 Hari Terakhir</p>
          <WeeklyChart />
        </Card>
      </div>

      <Card>
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Filter Transaksi per Dompet
        </label>
        <select
          value={filterWallet}
          onChange={(e) => setFilterWallet(e.target.value)}
          className="w-full mt-2 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-400"
        >
          <option value="all">💼 Semua Dompet</option>
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.icon} {w.name}
            </option>
          ))}
        </select>
      </Card>

      <TransactionList filterWallet={filterWallet} />

      <AnimatePresence>
        {showWalletManager && <WalletManager onClose={() => setShowWalletManager(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}