import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "./Card";
import TransactionList from "./TransactionList";
import WeeklyChart from "./WeeklyChart";
import WalletManager from "./WalletManager";
import EditWalletModal from "./EditWalletModal";
import { formatRupiah } from "../lib/format";
import { useStore, todayStr, type Wallet } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";
import { walletCardStyle, walletCardHoverBorder, getWalletHex } from "../utils/walletColors";
import { getWalletIcon } from "../utils/icons";

const CATEGORIES: Record<"in" | "out", string[]> = {
  in: ["Gaji", "Bonus", "Hadiah", "Investasi", "Lainnya"],
  out: ["Makan", "Transport", "Belanja", "Tagihan", "Hiburan", "Kesehatan", "Lainnya"],
};

interface KeuanganViewProps {
  quickType?: "in" | "out";
  quickNonce?: number;
  onQuickDone?: () => void;
}

export default function KeuanganView({ quickType, quickNonce, onQuickDone }: KeuanganViewProps) {
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
  const [walletToEdit, setWalletToEdit] = useState<Wallet | null>(null);
  const [hoveredWallet, setHoveredWallet] = useState<number | null>(null);
  const transactionFormRef = useRef<HTMLDivElement>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!quickType) return;
    setType(quickType);
    setCat("");
    setDate(todayStr());
    setFormError(null);

    window.setTimeout(() => {
      transactionFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, [quickNonce, quickType]);

  const scrollToTransactionForm = () => {
    transactionFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!type || !cat || !walletId || !amt) {
      setFormError("Lengkapi tipe, kategori, dompet, dan jumlah transaksi.");
      return;
    }
    const numAmt = parseInt(amt.replace(/\D/g, ""), 10);
    if (Number.isNaN(numAmt) || numAmt <= 0) {
      setFormError("Jumlah transaksi tidak valid.");
      return;
    }
    const selectedWallet = wallets.find((wallet) => wallet.id === parseInt(walletId, 10));
    if (type === "out" && selectedWallet && numAmt > selectedWallet.balance) {
      setFormError("Saldo dompet tidak mencukupi untuk pengeluaran ini.");
      return;
    }
    const result = addTx({
      type,
      cat,
      desc: desc || cat,
      amt: numAmt,
      date,
      walletId: parseInt(walletId),
    });
    if (!result.ok) {
      setFormError(result.message || "Transaksi gagal.");
      return;
    }
    setType(""); setCat(""); setWalletId(""); setAmt(""); setDesc(""); setDate(todayStr());
    onQuickDone?.();
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
          <p className={`text-xs font-semibold tracking-widest ${isDark ? "text-blue-400" : "text-blue-600"}`}>TOTAL SALDO</p>
          <p className={`text-3xl font-extrabold mt-2 ${isDark ? "text-white" : "text-zinc-900"}`}>{formatRupiah(balance)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {wallets.map((w, i) => {
          const hex = getWalletHex(w.color);
          return (
          <motion.div
            key={w.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onClick={() => setWalletToEdit(w)}
            style={{
              ...walletCardStyle(w.color, isDark),
              ...(hoveredWallet === w.id ? walletCardHoverBorder(w.color) : {}),
            }}
            onMouseEnter={() => setHoveredWallet(w.id)}
            onMouseLeave={() => setHoveredWallet(null)}
            className="rounded-2xl p-4 transition-shadow duration-300 cursor-pointer hover:shadow-md"
          >
            <div className="w-7 h-7 mb-2" style={{ color: hex }}>{getWalletIcon(w.icon, 28)}</div>
            <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-300" : "text-zinc-600"}`}>{w.name}</p>
            <p className="text-lg font-extrabold mt-1" style={{ color: hex }}>{formatRupiah(w.balance)}</p>
          </motion.div>
          );
        })}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: wallets.length * 0.05, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="h-full"
        >
        <button
          onClick={() => setShowWalletManager(true)}
          className={isDark
            ? "w-full h-full min-h-[110px] border-2 border-dashed border-white/20 rounded-2xl p-4 flex flex-col items-center justify-center hover:border-emerald-400 hover:bg-emerald-500/5 transition-all group"
            : "w-full h-full min-h-[110px] border-2 border-dashed border-zinc-300 rounded-2xl p-4 flex flex-col items-center justify-center hover:border-emerald-400 hover:bg-emerald-50 transition-all group bg-white"
          }
        >
          <div className="w-7 h-7 mb-1 group-hover:scale-110 transition-transform flex items-center justify-center">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-teal-500 group-hover:text-emerald-500 transition-colors">
              <rect x="2" y="10" width="36" height="24" rx="5" className="fill-current" />
              <rect x="2" y="10" width="36" height="24" rx="5" stroke="currentColor" strokeWidth="1.5" className="stroke-teal-700 group-hover:stroke-emerald-700 transition-colors" />
              <rect x="4" y="6" width="32" height="8" rx="3" className="fill-current opacity-50" />
              <circle cx="31" cy="22" r="3.5" fill="#fff" />
              <circle cx="31" cy="22" r="2" className="fill-teal-700 group-hover:fill-emerald-700 transition-colors" />
            </svg>
          </div>
          <p className={`text-xs font-semibold ${isDark ? "text-slate-400 group-hover:text-emerald-400" : "text-zinc-500 group-hover:text-emerald-600"}`}>Dompet</p>
        </button>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div ref={transactionFormRef}>
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
                {wallets.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
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

            {formError && (
              <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-500">{formError}</p>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-br from-teal-400 to-blue-500 text-zinc-900 font-bold py-3 rounded-xl hover:brightness-105 transition-all shadow-lg shadow-teal-500/10"
            >
              Simpan Transaksi
            </button>
          </form>
        </Card>
        </div>

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
          <option value="all">Semua Dompet</option>
          {wallets.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
        </select>
      </Card>

      <TransactionList filterWallet={filterWallet} onAddClick={scrollToTransactionForm} />

      <AnimatePresence>
        {showWalletManager && <WalletManager onClose={() => setShowWalletManager(false)} />}
      </AnimatePresence>

      {walletToEdit && <EditWalletModal wallet={walletToEdit} onClose={() => setWalletToEdit(null)} />}
    </motion.div>
  );
}
