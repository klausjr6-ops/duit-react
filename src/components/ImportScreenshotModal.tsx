import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useStore, todayStr, type Transaction, type Wallet } from "../lib/store";
import { useAuth } from "../lib/AuthContext";
import { useTheme } from "../lib/ThemeContext";
import { useModalDialog } from "../hooks/useModalDialog";
import { toast } from "../hooks/useToast";
import { formatRupiah } from "../lib/format";
import {
  findDuplicateIndexes,
  isValidDateKey,
  MAX_EXTRACTED_PER_STATEMENT,
  normalizeExtractedTransactions,
  parseRupiahAmount,
  TX_CATEGORIES,
} from "../lib/importParse";
import { IconAlertTriangle, IconCamera, IconClose } from "../utils/icons";

interface Props {
  onClose: () => void;
}

interface PickedDoc {
  base64: string;
  bytes: number;
  mediaType: "image/jpeg" | "application/pdf";
  isStatement: boolean;
  /** Pratinjau data URL — hanya untuk gambar. */
  dataUrl: string | null;
  name: string;
}

interface ReviewRow {
  key: number;
  date: string;
  type: "in" | "out";
  amtInput: string;
  desc: string;
  cat: string;
  include: boolean;
  duplicate: boolean;
}

interface ImportSummary {
  imported: number;
  failed: number;
  firstMessage: string | null;
}

const MAX_SOURCE_FILE_BYTES = 12 * 1024 * 1024;
const MAX_STATEMENT_BYTES = 2_600_000; // aman di bawah batas body Vercel 4,5 MB setelah base64
const MAX_COMPRESSED_BYTES = 1_800_000;
const COMPRESS_ATTEMPTS: { maxSide: number; quality: number }[] = [
  { maxSide: 1600, quality: 0.85 },
  { maxSide: 1280, quality: 0.72 },
  { maxSide: 1024, quality: 0.6 },
];

let nextRowKey = 1;

function formatInputRupiah(digits: string): string {
  return digits ? parseInt(digits, 10).toLocaleString("id-ID") : "";
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const CHUNK = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
  }
  return btoa(binary);
}

async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Lanjut ke fallback <img> di bawah.
    }
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Gagal membaca berkas gambar."));
    reader.readAsDataURL(file);
  });
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Gambar tidak bisa dibaca."));
    image.src = dataUrl;
  });
}

/** Kompres gambar di sisi klien supaya muat di batas body Vercel (4,5 MB). */
async function prepareImage(file: File): Promise<PickedDoc> {
  const source = await decodeImage(file);
  const width = "width" in source ? source.width : 0;
  const height = "height" in source ? source.height : 0;
  if (!width || !height) throw new Error("Gambar tidak bisa dibaca.");

  let lastResult: Omit<PickedDoc, "isStatement" | "name" | "mediaType"> & { mediaType: "image/jpeg" } | null = null;
  for (const { maxSide, quality } of COMPRESS_ATTEMPTS) {
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Peramban tidak mendukung pemrosesan gambar.");
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) throw new Error("Gagal mengompres gambar.");
    const base64 = await blobToBase64(blob);
    lastResult = { base64, dataUrl: `data:image/jpeg;base64,${base64}`, bytes: blob.size, mediaType: "image/jpeg" };
    if (blob.size <= MAX_COMPRESSED_BYTES) break;
  }
  if (source instanceof ImageBitmap) source.close();
  if (!lastResult || lastResult.bytes > MAX_COMPRESSED_BYTES) {
    throw new Error("Ukuran gambar masih terlalu besar. Coba pangkas area riwayat transaksinya saja.");
  }
  return { ...lastResult, isStatement: false, name: file.name };
}

/** Validasi + encode PDF e-Statement (tanpa kompres, PDF diteruskan apa adanya). */
async function prepareStatement(file: File): Promise<PickedDoc> {
  if (file.size > MAX_STATEMENT_BYTES) {
    throw new Error("Ukuran PDF terlalu besar (maks ±2,5 MB). Coba unduh ulang e-Statement satu bulan saja.");
  }
  const base64 = await blobToBase64(file);
  if (!base64.startsWith("JVBERi")) {
    throw new Error("Berkas ini bukan PDF yang valid.");
  }
  return { base64, bytes: file.size, mediaType: "application/pdf", isStatement: true, dataUrl: null, name: file.name };
}

function buildRow(draft: { date: string; type: "in" | "out"; amt: number; desc: string; cat: string }, duplicate: boolean): ReviewRow {
  return {
    key: nextRowKey++,
    date: draft.date,
    type: draft.type,
    amtInput: String(draft.amt),
    desc: draft.desc,
    cat: draft.cat,
    include: !duplicate,
    duplicate,
  };
}

export default function ImportScreenshotModal({ onClose }: Props) {
  const { wallets, addTx, txs } = useStore();
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [step, setStep] = useState<"pick" | "review">("pick");
  const [processing, setProcessing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [picked, setPicked] = useState<PickedDoc | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [droppedCount, setDroppedCount] = useState(0);
  const [walletIdInput, setWalletIdInput] = useState<string>(wallets[0] ? String(wallets[0].id) : "");
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const busy = processing || importing;
  const guardedClose = () => { if (!busy) onClose(); };
  const { dialogRef, onDialogKeyDown } = useModalDialog(true, guardedClose);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const txsRef = useRef<Transaction[]>(txs);
  useEffect(() => { txsRef.current = txs; }, [txs]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const todayKey = useMemo(() => todayStr(), []);

  const rowIsValid = (row: ReviewRow): boolean => {
    if (!isValidDateKey(row.date) || row.date > todayKey) return false;
    if (parseRupiahAmount(row.amtInput) === null) return false;
    const desc = row.desc.trim();
    return desc.length > 0 && desc.length <= 240 && row.cat.length > 0;
  };

  const selectedRows = rows.filter((row) => row.include && rowIsValid(row));
  const wallet: Wallet | null = wallets.find((w) => w.id === parseInt(walletIdInput, 10)) ?? null;
  const selectedOutTotal = selectedRows.reduce((sum, row) => (row.type === "out" ? sum + (parseRupiahAmount(row.amtInput) ?? 0) : sum), 0);
  const balanceShort = wallet !== null && selectedOutTotal > wallet.balance;

  const updateRow = (key: number, patch: Partial<ReviewRow>) => {
    setRows((previous) => previous.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const handleFile = async (file: File | null | undefined) => {
    setError(null);
    setSummary(null);
    if (!file) return;
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf && !file.type.startsWith("image/")) {
      setError("Berkas harus berupa gambar (JPG, PNG, WEBP) atau PDF e-Statement.");
      return;
    }
    if (isPdf && file.size > MAX_STATEMENT_BYTES) {
      setError("Ukuran PDF terlalu besar (maks ±2,5 MB). Coba unduh ulang e-Statement satu bulan saja.");
      return;
    }
    if (!isPdf && file.size > MAX_SOURCE_FILE_BYTES) {
      setError("Ukuran berkas terlalu besar. Pangkas area riwayat transaksi lalu coba lagi.");
      return;
    }
    let prepared: PickedDoc;
    try {
      prepared = isPdf ? await prepareStatement(file) : await prepareImage(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Berkas tidak bisa diproses. Coba format JPG, PNG, atau PDF.");
      return;
    }
    setPicked(prepared);
    await runExtraction(prepared);
  };

  const runExtraction = async (doc: PickedDoc) => {
    setProcessing(true);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const idToken = await user?.getIdToken();
      const response = await fetch("/api/import-screenshot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        signal: controller.signal,
        body: JSON.stringify({ bank: "bca", image: { mediaType: doc.mediaType, data: doc.base64 } }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(typeof payload?.error === "string" ? payload.error : "Server sedang bermasalah. Coba lagi nanti.");
        return;
      }
      const maxItems = doc.isStatement ? MAX_EXTRACTED_PER_STATEMENT : undefined;
      const { items, dropped } = normalizeExtractedTransactions(payload?.transactions, todayKey, maxItems);
      const duplicates = findDuplicateIndexes(items, txsRef.current);
      setRows(items.map((draft, index) => buildRow(draft, duplicates.has(index))));
      setDroppedCount(dropped);
      setStep("review");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Gagal terhubung ke server. Periksa koneksi lalu coba lagi.");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setProcessing(false);
    }
  };

  const cancelProcessing = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setProcessing(false);
  };

  const resetToPick = () => {
    if (busy) return;
    setStep("pick");
    setRows([]);
    setDroppedCount(0);
    setSummary(null);
    setError(null);
    setPicked(null);
    setImportProgress(null);
  };

  const importSelected = async () => {
    const ready = rows.filter((row) => row.include && rowIsValid(row));
    if (ready.length === 0 || importing) return;
    if (wallets.length > 0 && !wallet) {
      setError("Pilih dompet tujuan terlebih dahulu.");
      return;
    }
    setError(null);
    setSummary(null);
    setImporting(true);
    setImportProgress({ done: 0, total: ready.length });

    const failures: { key: number; message: string }[] = [];
    let imported = 0;
    let done = 0;
    for (const row of ready) {
      const amt = parseRupiahAmount(row.amtInput);
      if (amt === null) {
        failures.push({ key: row.key, message: "Nominal tidak valid." });
        done += 1;
        setImportProgress({ done, total: ready.length });
        continue;
      }
      try {
        const result = await addTx({
          type: row.type,
          cat: row.cat,
          desc: row.desc.trim(),
          amt,
          date: row.date,
          walletId: wallet ? wallet.id : undefined,
        });
        if (result.ok) {
          imported += 1;
          setRows((previous) => previous.filter((item) => item.key !== row.key));
        } else {
          failures.push({ key: row.key, message: result.message || "Gagal disimpan." });
        }
      } catch {
        failures.push({ key: row.key, message: "Gagal disimpan." });
      }
      done += 1;
      setImportProgress({ done, total: ready.length });
    }

    setImporting(false);
    setImportProgress(null);
    setSummary({ imported, failed: failures.length, firstMessage: failures[0]?.message ?? null });

    if (failures.length === 0) {
      toast.success(`${imported} transaksi berhasil diimpor`);
      onClose();
    } else {
      toast.error(`${imported} transaksi tersimpan, ${failures.length} gagal. Periksa kembali baris yang tersisa.`);
    }
  };

  const panel = isDark
    ? "bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-2xl w-full max-h-[88vh] overflow-y-auto"
    : "bg-white border border-zinc-200 rounded-3xl p-6 max-w-2xl w-full max-h-[88vh] overflow-y-auto shadow-xl";
  const titleCls = isDark ? "text-xl font-bold text-white" : "text-xl font-bold text-zinc-900";
  const closeCls = isDark ? "text-slate-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900";
  const inputCls = isDark
    ? "w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-teal-400"
    : "w-full bg-white border border-zinc-300 rounded-lg p-2 text-xs text-zinc-900 focus:outline-none focus:border-teal-500";
  const labelCls = isDark ? "text-[11px] font-bold text-slate-500 uppercase tracking-wider" : "text-[11px] font-bold text-zinc-500 uppercase tracking-wider";
  const mutedCls = isDark ? "text-xs text-slate-500" : "text-xs text-zinc-500";
  const dangerBox = "rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-500";
  const warnBox = isDark
    ? "rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-300"
    : "rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={guardedClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Impor transaksi dari tangkapan layar"
        onKeyDown={onDialogKeyDown}
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(event) => event.stopPropagation()}
        className={panel}
      >
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className={titleCls}>Impor Transaksi</h2>
            <p className={mutedCls}>Dari screenshot m-banking atau PDF e-Statement BCA, dibaca memakai AI</p>
          </div>
          <button aria-label="Tutup" onClick={guardedClose} disabled={busy} className={`${closeCls} disabled:cursor-not-allowed disabled:opacity-40`}>
            <IconClose size={20} />
          </button>
        </div>

        {step === "pick" && (
          <div className="space-y-4">
            <label
              onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                if (processing) return;
                void handleFile(event.dataTransfer.files?.[0]);
              }}
              className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors cursor-pointer ${
                dragOver
                  ? "border-teal-400 bg-teal-400/10"
                  : isDark
                    ? "border-white/20 hover:border-teal-400 hover:bg-teal-500/5"
                    : "border-zinc-300 hover:border-teal-500 hover:bg-teal-50"
              } ${processing ? "pointer-events-none opacity-70" : ""}`}
            >
              <IconCamera size={32} className="text-teal-500" />
              {processing ? (
                <>
                  <p className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                    DUIT sedang membaca {picked?.isStatement ? "PDF e-Statement" : "tangkapan layar"}…
                  </p>
                  <p className={mutedCls}>{picked?.isStatement ? "Dokumen banyak halaman bisa memakan 15–30 detik" : "Biasanya sekitar 5–15 detik"}</p>
                  <div className="h-1.5 w-40 overflow-hidden rounded-full bg-zinc-500/20">
                    <motion.div
                      className="h-full w-1/3 rounded-full bg-teal-400"
                      animate={{ x: ["-120%", "360%"] }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                    Pilih tangkapan layar atau PDF e-Statement
                  </p>
                  <p className={mutedCls}>Seret berkas ke sini atau klik untuk memilih (JPG / PNG / WEBP / PDF)</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                disabled={processing}
                onChange={(event) => {
                  void handleFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>

            {picked && processing && (
              <div className="flex items-center gap-3">
                {picked.dataUrl ? (
                  <img src={picked.dataUrl} alt="Pratinjau tangkapan layar" className="h-16 w-16 rounded-lg object-cover border border-white/10" />
                ) : (
                  <span className={`inline-flex max-w-full items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${isDark ? "border-white/10 bg-slate-950 text-slate-300" : "border-zinc-200 bg-zinc-50 text-zinc-700"}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-teal-500">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span className="truncate">{picked.name}</span>
                  </span>
                )}
                <p className={mutedCls}>Ukuran terkirim ± {(picked.bytes / 1024).toFixed(0)} KB</p>
              </div>
            )}

            {processing ? (
              <button
                type="button"
                onClick={cancelProcessing}
                className={isDark
                  ? "w-full rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-slate-300 hover:border-rose-400 hover:text-rose-300 transition-colors"
                  : "w-full rounded-xl border border-zinc-200 py-2.5 text-sm font-semibold text-zinc-600 hover:border-rose-400 hover:text-rose-600 transition-colors"}
              >
                Batalkan
              </button>
            ) : (
              <div className={isDark ? "rounded-xl bg-teal-500/5 border border-teal-400/15 px-3 py-2.5 text-xs text-slate-400" : "rounded-xl bg-teal-50 border border-teal-100 px-3 py-2.5 text-xs text-zinc-500"}>
                Berkas dikirim satu kali ke AI (Gemini) untuk dibaca, lalu dibuang — <span className="font-semibold">tidak disimpan di server</span>. Transaksi hanya tercatat setelah kamu memeriksa dan menekan tombol Impor. Tips: pangkas gambar agar tanggal dan nominal terlihat jelas. PDF e-Statement yang terproteksi kata sandi perlu disimpan ulang tanpa kata sandi dulu (Cetak → Simpan sebagai PDF).
              </div>
            )}

            {error && <p role="alert" className={dangerBox}>{error}</p>}
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <div className={warnBox}>
              Periksa kembali hasil bacaan AI — angka atau tanggal bisa salah terbaca. Baris bertanda
              <span className="font-semibold"> kemungkinan duplikat</span> sudah dinonaktifkan otomatis agar tidak tercatat dua kali.
            </div>

            {droppedCount > 0 && (
              <p className={mutedCls}>{droppedCount} baris dilewati karena tidak terbaca jelas, tanggalnya di masa depan, atau ganda di gambar yang sama.</p>
            )}

            {summary && summary.failed > 0 && (
              <div className={dangerBox} role="alert">
                {summary.imported} transaksi tersimpan, {summary.failed} gagal
                {summary.firstMessage ? ` — contoh penyebab: ${summary.firstMessage}` : ""}.
                Baris yang gagal masih dicentang; perbaiki lalu tekan Impor lagi.
              </div>
            )}

            {rows.length === 0 && summary === null && (
              <div className={`rounded-2xl border px-6 py-10 text-center ${isDark ? "border-white/10 text-slate-400" : "border-zinc-200 text-zinc-500"}`}>
                <p className="text-sm font-semibold">Tidak ada transaksi yang terbaca dari berkas ini.</p>
                <p className={`${mutedCls} mt-1`}>Coba tangkapan layar yang lebih tajam, atau e-Statement resmi dari myBCA.</p>
              </div>
            )}

            {wallets.length > 0 && rows.length > 0 && (
              <div>
                <label htmlFor="import-target-wallet" className={labelCls}>Dompet Tujuan</label>
                <select
                  id="import-target-wallet"
                  value={walletIdInput}
                  disabled={importing}
                  onChange={(event) => setWalletIdInput(event.target.value)}
                  className={inputCls + " mt-1 p-3 text-sm"}
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>{w.name} — {formatRupiah(w.balance)}</option>
                  ))}
                </select>
              </div>
            )}

            {balanceShort && wallet && (
              <div className={warnBox}>
                Saldo {wallet.name} saat ini {formatRupiah(wallet.balance)} lebih kecil dari total pengeluaran terpilih ({formatRupiah(selectedOutTotal)}).
                Sebagian transaksi bisa gagal disimpan — perbarui saldo dompet dulu atau batalkan sebagian baris.
              </div>
            )}

            <div className="space-y-3">
              {rows.map((row) => {
                const valid = rowIsValid(row);
                return (
                  <div
                    key={row.key}
                    className={`grid grid-cols-[auto_1fr] items-start gap-3 rounded-2xl border p-3 transition-opacity ${
                      row.include
                        ? isDark ? "border-white/10 bg-slate-950/40" : "border-zinc-200 bg-zinc-50"
                        : isDark ? "border-white/5 opacity-50" : "border-zinc-100 opacity-60"
                    } ${!valid && row.include ? "border-rose-400/50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      aria-label="Sertakan transaksi ini"
                      checked={row.include}
                      disabled={importing}
                      onChange={(event) => updateRow(row.key, { include: event.target.checked })}
                      className="mt-1 h-4 w-4 accent-teal-500"
                    />
                    <div className="space-y-2 min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="date"
                          aria-label="Tanggal transaksi"
                          value={row.date}
                          max={todayKey}
                          disabled={importing}
                          onChange={(event) => updateRow(row.key, { date: event.target.value })}
                          className={inputCls + " w-36"}
                        />
                        <select
                          aria-label="Tipe transaksi"
                          value={row.type}
                          disabled={importing}
                          onChange={(event) => {
                            const nextType = event.target.value as "in" | "out";
                            updateRow(row.key, { type: nextType, cat: "Lainnya" });
                          }}
                          className={inputCls + " w-32"}
                        >
                          <option value="out">Pengeluaran</option>
                          <option value="in">Pemasukan</option>
                        </select>
                        <select
                          aria-label="Kategori"
                          value={row.cat}
                          disabled={importing}
                          onChange={(event) => updateRow(row.key, { cat: event.target.value })}
                          className={inputCls + " w-32"}
                        >
                          {TX_CATEGORIES[row.type].map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                        </select>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          aria-label="Nominal rupiah"
                          placeholder="Rp 0"
                          value={row.amtInput ? `Rp ${formatInputRupiah(row.amtInput)}` : ""}
                          disabled={importing}
                          onChange={(event) => updateRow(row.key, { amtInput: event.target.value.replace(/\D/g, "") })}
                          className={inputCls + " w-36"}
                        />
                        <input
                          type="text"
                          aria-label="Keterangan"
                          placeholder="Keterangan transaksi"
                          maxLength={240}
                          value={row.desc}
                          disabled={importing}
                          onChange={(event) => updateRow(row.key, { desc: event.target.value })}
                          className={inputCls + " flex-1 min-w-[160px]"}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {row.duplicate && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 text-[11px] font-semibold text-amber-500">
                            <IconAlertTriangle size={12} /> Kemungkinan duplikat
                          </span>
                        )}
                        {!valid && row.include && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-400/10 border border-rose-400/30 px-2 py-0.5 text-[11px] font-semibold text-rose-500">
                            Data belum valid — tidak akan diimpor
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={resetToPick}
                disabled={importing}
                className={isDark
                  ? "rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:border-teal-400 hover:text-teal-300 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  : "rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:border-teal-500 hover:text-teal-600 transition-colors disabled:cursor-not-allowed disabled:opacity-40"}
              >
                Ganti Gambar
              </button>
              {rows.length > 0 && (
                <button
                  type="button"
                  onClick={importSelected}
                  disabled={importing || selectedRows.length === 0}
                  className="rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 px-5 py-2.5 text-sm font-bold text-zinc-900 hover:brightness-105 transition-all shadow-lg shadow-teal-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {importing
                    ? importProgress
                      ? `Menyimpan ${importProgress.done}/${importProgress.total}…`
                      : "Menyimpan…"
                    : `Impor ${selectedRows.length} Transaksi`}
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
