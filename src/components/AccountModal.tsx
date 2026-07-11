import { useRef, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sanitizeImportedUserData, useStore, type UserData } from "../lib/store";
import { useAuth } from "../lib/AuthContext";
import { useTheme, type ThemeMode } from "../lib/ThemeContext";
import { useModalDialog } from "../hooks/useModalDialog";
import ConfirmDialog from "./ConfirmDialog";

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
}

const MAX_AVATAR_SOURCE_BYTES = 5 * 1024 * 1024;
const MAX_AVATAR_OUTPUT_BYTES = 160 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

function dataUrlSize(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.floor((base64.length * 3) / 4);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Foto tidak dapat dibaca."));
    };
    image.src = objectUrl;
  });
}

function canvasToDataUrl(canvas: HTMLCanvasElement, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Foto tidak dapat dikompres."));
          return;
        }

        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Foto tidak dapat diproses."));
        reader.readAsDataURL(blob);
      },
      "image/jpeg",
      quality
    );
  });
}

async function prepareAvatar(file: File): Promise<string> {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    throw new Error("Gunakan foto berformat JPG, PNG, atau WebP.");
  }
  if (file.size > MAX_AVATAR_SOURCE_BYTES) {
    throw new Error("Ukuran foto maksimal 5 MB.");
  }

  const image = await loadImage(file);
  const sourceMax = Math.max(image.naturalWidth, image.naturalHeight);

  // Progressively reduce image dimensions/quality until it is safe to store
  // inside the user's single Firestore document.
  for (const maxDimension of [512, 420, 320, 256]) {
    const scale = Math.min(1, maxDimension / sourceMax);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Browser tidak mendukung pemrosesan foto.");

    // JPEG has no transparency; white is consistent with the light avatar UI.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    for (const quality of [0.82, 0.72, 0.62]) {
      const dataUrl = await canvasToDataUrl(canvas, quality);
      if (dataUrlSize(dataUrl) <= MAX_AVATAR_OUTPUT_BYTES) return dataUrl;
    }
  }

  throw new Error("Foto masih terlalu besar setelah dikompres. Coba foto lain.");
}

function createCalendarToken(): string {
  if (typeof crypto === "undefined") {
    throw new Error("Browser ini belum mendukung token kalender yang aman");
  }
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

type SubView = "main" | "calendar" | "backup" | "email" | "password";

export default function AccountModal({ open, onClose }: AccountModalProps) {
  const { settings, backupData, updateSettings, resetAll, replaceAll } = useStore();
  const { user, logout, changeEmail, changePassword } = useAuth();
  const { isDark, themeMode, setThemeMode } = useTheme();

  const [name, setName] = useState(settings.name);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);
  const [confirmCalendarReset, setConfirmCalendarReset] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [calendarCopied, setCalendarCopied] = useState(false);
  const [calendarNotice, setCalendarNotice] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<{ data: UserData; summary: string } | null>(null);
  const [subView, setSubView] = useState<SubView>("main");
  const fileRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  // Cek apakah user login pakai Google (gak bisa ganti email/pass)
  const isGoogleUser = user?.providerData[0]?.providerId === "google.com";

  useEffect(() => {
    if (open) setName(settings.name);
  }, [open, settings.name]);

  const handleAvatarPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarError(null);
    setAvatarSaving(true);
    try {
      const avatar = await prepareAvatar(file);
      updateSettings({ avatar });
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : "Foto gagal diproses.");
    } finally {
      setAvatarSaving(false);
      // Allow choosing the same photo again after a validation error.
      event.target.value = "";
    }
  };

  const saveName = () => {
    updateSettings({ name: name.trim() || "Kamu" });
  };

  const copyCalendarFeedUrl = async () => {
    if (!user) return;

    const token = settings.calendarToken || createCalendarToken();
    if (!settings.calendarToken) updateSettings({ calendarToken: token });

    const url = `${window.location.origin}/api/calendar.ics?uid=${encodeURIComponent(user.uid)}&token=${encodeURIComponent(token)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCalendarCopied(true);
      setCalendarNotice(null);
      window.setTimeout(() => setCalendarCopied(false), 2200);
    } catch {
      window.prompt("Salin link kalender pribadi ini. Jangan dibagikan.", url);
    }
  };

  const showCalendarNotice = (message: string) => {
    setCalendarNotice(message);
    setCalendarCopied(false);
    window.setTimeout(() => setCalendarNotice(null), 3200);
  };

  const regenerateCalendarFeedUrl = () => {
    updateSettings({ calendarToken: createCalendarToken() });
    setConfirmCalendarReset(false);
    showCalendarNotice("Link kalender lama sudah dicabut. Salin link baru untuk subscribe ulang.");
  };

  const showBackupNotice = (message: string) => {
    setBackupNotice(message);
    setBackupError(null);
    window.setTimeout(() => setBackupNotice(null), 2600);
  };

  const exportBackupJson = () => {
    const backup = {
      app: "DUIT",
      type: "full-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: backupData,
    };

    downloadTextFile(
      `duit-backup-${safeTimestamp()}.json`,
      JSON.stringify(backup, null, 2),
      "application/json;charset=utf-8"
    );
    showBackupNotice("Backup JSON berhasil diunduh.");
  };

  const exportTransactionsCsv = () => {
    const walletNames = new Map(backupData.wallets.map((wallet) => [wallet.id, wallet.name]));
    const header = ["Tanggal", "Jenis", "Nominal", "Kategori", "Deskripsi", "Dompet", "Goal ID", "Transaction ID"];
    const rows = backupData.txs.map((transaction) => [
      transaction.date,
      transaction.type === "in" ? "Pemasukan" : transaction.goalId ? "Transfer Goal" : "Pengeluaran",
      String(transaction.amt),
      transaction.cat,
      transaction.desc,
      transaction.walletId ? walletNames.get(transaction.walletId) || String(transaction.walletId) : "",
      transaction.goalId ? String(transaction.goalId) : "",
      String(transaction.id),
    ]);

    downloadTextFile(
      `duit-transaksi-${safeTimestamp()}.csv`,
      "\ufeff" + [header, ...rows].map(toCsvRow).join("\n"),
      "text/csv;charset=utf-8"
    );
    showBackupNotice("CSV transaksi berhasil diunduh.");
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBackupNotice(null);
    setBackupError(null);

    if (!file.name.toLowerCase().endsWith(".json") && file.type && file.type !== "application/json") {
      setBackupError("File backup harus berformat JSON.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setBackupError("File backup terlalu besar. Maksimum 5 MB.");
      return;
    }

    try {
      const importedData = parseBackupJson(await file.text());
      setPendingImport({
        data: importedData,
        summary: summarizeBackup(importedData),
      });
      setConfirmImport(true);
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : "Backup JSON tidak bisa dibaca.");
    }
  };

  const confirmImportBackup = () => {
    if (!pendingImport) return;
    replaceAll(pendingImport.data);
    setConfirmImport(false);
    setPendingImport(null);
    showBackupNotice("Backup berhasil diimport. Data sedang disinkronkan ke cloud.");
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
      setLoggingOut(false);
    }
  };

  const handleClose = () => {
    setSubView("main");
    setConfirmLogout(false);
    setConfirmReset(false);
    setConfirmImport(false);
    setConfirmCalendarReset(false);
    setPendingImport(null);
    setCalendarNotice(null);
    setBackupError(null);
    setBackupNotice(null);
    onClose();
  };

  const { dialogRef, onDialogKeyDown } = useModalDialog(open, handleClose);

  const modalBg = isDark
    ? "w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl max-h-[90vh] overflow-y-auto"
    : "w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto";

  const inputClass = isDark
    ? "flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-teal-400/50 focus:outline-none"
    : "flex-1 rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none focus:bg-white";

  const btnPrimary = "rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 px-3 py-2 text-sm font-semibold text-zinc-900 hover:brightness-105 transition-all";
  const btnSecondary = isDark
    ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-all"
    : "rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 transition-all";

  const cardBtn = isDark
    ? "flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-colors hover:bg-white/10"
    : "flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left transition-colors hover:bg-zinc-100";

  const themeOptions: { id: ThemeMode; label: string; icon: string }[] = [
    { id: "light", label: "Pagi", icon: "🌤️" },
    { id: "time", label: "Auto", icon: "🌓" },
    { id: "dark", label: "Malam", icon: "🌙" },
  ];

  // Keep old users with the legacy system choice visually aligned with Auto.
  const displayedThemeMode = themeMode === "system" ? "time" : themeMode;

  return (
    <>
      <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-dialog-title"
            onKeyDown={onDialogKeyDown}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className={modalBg}
          >
            {/* Header */}
            <div className={`mb-4 flex items-center justify-between border-b pb-3 ${isDark ? "border-white/10" : "border-zinc-200"}`}>
              <div className="flex items-center gap-2">
                {subView !== "main" && (
                  <button
                    onClick={() => setSubView("main")}
                    aria-label="Kembali ke pengaturan akun"
                    className={isDark ? "text-slate-400 hover:text-white -ml-1" : "text-zinc-500 hover:text-zinc-900 -ml-1"}
                  >
                    ←
                  </button>
                )}
                <div>
                  <p className="text-xs font-semibold text-teal-500">AKUN</p>
                  <p id="account-dialog-title" className={`text-sm font-medium ${isDark ? "text-white" : "text-zinc-900"}`}>
                    {subView === "main" && "Pengaturan Akun"}
                    {subView === "calendar" && "Kalender"}
                    {subView === "backup" && "Backup Data"}
                    {subView === "email" && "Ganti Email"}
                    {subView === "password" && "Ganti Password"}
                  </p>
                </div>
              </div>
              <button aria-label="Tutup pengaturan akun" onClick={handleClose} className={isDark ? "text-slate-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"}>
                ✕
              </button>
            </div>

            <AnimatePresence mode="wait">
              {/* ═══════════════ MAIN VIEW ═══════════════ */}
              {subView === "main" && (
                <motion.div
                  key="main"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Avatar */}
                  <div className="mb-5 flex flex-col items-center">
                    <button
                      type="button"
                      disabled={avatarSaving}
                      aria-label="Ganti foto avatar"
                      onClick={() => fileRef.current?.click()}
                      className="group relative h-20 w-20 overflow-hidden rounded-full ring-2 ring-teal-400/40 disabled:cursor-wait disabled:opacity-70"
                    >
                      {settings.avatar ? (
                        <img src={settings.avatar} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-xl font-bold text-white">
                          {name ? name[0].toUpperCase() : "?"}
                        </div>
                      )}
                      <div className={`absolute inset-0 flex items-center justify-center bg-black/40 text-lg transition-opacity ${avatarSaving ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                        {avatarSaving ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : "📷"}
                      </div>
                    </button>
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarPick} />
                    <p className={`mt-2 text-xs ${isDark ? "text-slate-500" : "text-zinc-500"}`}>
                      {avatarSaving ? "Menyiapkan foto..." : "Klik foto untuk ganti avatar"}
                    </p>
                    {avatarError && (
                      <p role="alert" className="mt-2 max-w-xs text-center text-xs text-rose-500">{avatarError}</p>
                    )}
                  </div>

                  {/* Nama */}
                  <div className="mb-4">
                    <label className={`mb-1 block text-xs font-medium ${isDark ? "text-slate-400" : "text-zinc-600"}`}>Nama</label>
                    <div className="flex gap-2">
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputClass}
                        placeholder="Nama kamu"
                      />
                      <button onClick={saveName} className={btnPrimary}>
                        Simpan
                      </button>
                    </div>
                  </div>

                  {/* THEME PICKER — pagi, auto, malam */}
                  <div className="mb-4">
                    <label className={`mb-2 block text-xs font-medium ${isDark ? "text-slate-400" : "text-zinc-600"}`}>
                      Tampilan
                    </label>
                    <div className={`grid grid-cols-3 gap-2 p-1 rounded-2xl ${isDark ? "bg-white/5 border border-white/10" : "bg-zinc-100 border border-zinc-200"}`}>
                      {themeOptions.map(opt => {
                        const active = displayedThemeMode === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => { setThemeMode(opt.id); updateSettings({ themeMode: opt.id }); }}
                            className={
                              active
                                ? "flex flex-col items-center justify-center gap-1 rounded-xl bg-white py-3 shadow-sm border border-zinc-200 text-zinc-900 transition-all " +
                                  (isDark ? "!bg-teal-400/15 !border-teal-400/50 !text-white" : "")
                                : `flex flex-col items-center justify-center gap-1 rounded-xl py-3 transition-all ${
                                    isDark
                                      ? "text-slate-300 hover:bg-white/5"
                                      : "text-zinc-600 hover:bg-white"
                                  }`
                            }
                            title={opt.label}
                            type="button"
                          >
                            <span className="text-xl leading-none">{opt.icon}</span>
                            <span className="text-[11px] font-semibold">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 mb-4 space-y-2">
                    <button
                      type="button"
                      onClick={() => setSubView("calendar")}
                      className={cardBtn}
                    >
                      <div>
                        <p className={`text-sm font-medium ${isDark ? "text-white" : "text-zinc-900"}`}>Kalender</p>
                        <p className={`text-xs ${isDark ? "text-slate-500" : "text-zinc-500"}`}>
                          Link pribadi jadwal DUIT
                        </p>
                      </div>
                      <span className={isDark ? "text-slate-500" : "text-zinc-400"}>›</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSubView("backup")}
                      className={cardBtn}
                    >
                      <div>
                        <p className={`text-sm font-medium ${isDark ? "text-white" : "text-zinc-900"}`}>Backup Data</p>
                        <p className={`text-xs ${isDark ? "text-slate-500" : "text-zinc-500"}`}>
                          Export / import JSON & CSV
                        </p>
                      </div>
                      <span className={isDark ? "text-slate-500" : "text-zinc-400"}>›</span>
                    </button>
                  </div>

                  <div className={`h-px w-full my-4 ${isDark ? "bg-white/10" : "bg-zinc-200"}`} />

                  {/* Ganti Email & Password (hanya untuk user email/password) */}
                  {!isGoogleUser && (
                    <div className="mb-4 space-y-2">
                      <button
                        onClick={() => setSubView("email")}
                        className={cardBtn}
                      >
                        <div>
                          <p className={`text-sm font-medium ${isDark ? "text-white" : "text-zinc-900"}`}>Ganti Email</p>
                          <p className={`text-xs truncate max-w-[220px] ${isDark ? "text-slate-500" : "text-zinc-500"}`}>
                            {user?.email}
                          </p>
                        </div>
                        <span className={isDark ? "text-slate-500" : "text-zinc-400"}>›</span>
                      </button>

                      <button
                        onClick={() => setSubView("password")}
                        className={cardBtn}
                      >
                        <div>
                          <p className={`text-sm font-medium ${isDark ? "text-white" : "text-zinc-900"}`}>Ganti Password</p>
                          <p className={`text-xs ${isDark ? "text-slate-500" : "text-zinc-500"}`}>Ubah kata sandi akun</p>
                        </div>
                        <span className={isDark ? "text-slate-500" : "text-zinc-400"}>›</span>
                      </button>
                    </div>
                  )}

                  {/* Info untuk Google user */}
                  {isGoogleUser && (
                    <div className={`mb-4 rounded-xl border px-4 py-3 ${isDark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-zinc-50"}`}>
                      <p className={`text-xs ${isDark ? "text-slate-400" : "text-zinc-600"}`}>
                        Kamu login dengan <span className={`font-semibold ${isDark ? "text-white" : "text-zinc-900"}`}>Google</span>.
                        Ganti email/password dilakukan lewat akun Google kamu.
                      </p>
                    </div>
                  )}

                  <div className={`h-px w-full ${isDark ? "bg-white/10" : "bg-zinc-200"}`} />

                  {/* Logout */}
                  <div className="mt-4">
                    {!confirmLogout ? (
                      <button
                        onClick={() => setConfirmLogout(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 py-2.5 text-sm font-semibold text-amber-600 hover:bg-amber-400/20 transition-colors"
                      >
                        <LogoutIcon />
                        <span>Keluar dari Akun</span>
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3"
                      >
                        <p className={`mb-3 text-center text-sm ${isDark ? "text-white" : "text-zinc-900"}`}>Yakin ingin keluar?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmLogout(false)}
                            disabled={loggingOut}
                            className={isDark ? "flex-1 rounded-lg bg-white/10 py-2 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50" : "flex-1 rounded-lg bg-zinc-200 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-300 disabled:opacity-50"}
                          >
                            Batal
                          </button>
                          <button
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-500 py-2 text-xs font-semibold text-zinc-900 hover:bg-amber-400 disabled:opacity-50"
                          >
                            {loggingOut ? (
                              <>
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-900/30 border-t-zinc-900" />
                                <span>Keluar...</span>
                              </>
                            ) : (
                              <span>Ya, Keluar</span>
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Hapus data */}
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="mt-3 w-full rounded-xl border border-rose-400/30 bg-rose-400/10 py-2.5 text-sm font-semibold text-rose-500 hover:bg-rose-400/20"
                  >
                    🗑️ Hapus Semua Data
                  </button>
                </motion.div>
              )}

              {/* ═══════════════ CALENDAR VIEW ═══════════════ */}
              {subView === "calendar" && (
                <motion.div
                  key="calendar"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  <div className={`rounded-xl border p-4 ${isDark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-zinc-50"}`}>
                    <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-zinc-900"}`}>Link Kalender Pribadi</p>
                    <p className={`mt-1 text-xs leading-relaxed ${isDark ? "text-slate-400" : "text-zinc-600"}`}>
                      Salin link ini untuk subscribe jadwal DUIT di Apple Calendar, Google Calendar, atau aplikasi kalender lain.
                    </p>
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button type="button" onClick={copyCalendarFeedUrl} className={btnPrimary}>
                        {calendarCopied ? "✓ Disalin" : "Salin Link"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmCalendarReset(true)}
                        className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm font-semibold text-amber-600 transition-all hover:bg-amber-400/20"
                      >
                        Buat Ulang Link
                      </button>
                    </div>
                    {calendarNotice && (
                      <p role="status" className="mt-3 text-xs text-emerald-500">{calendarNotice}</p>
                    )}
                  </div>
                  <p className={`text-[11px] leading-relaxed ${isDark ? "text-slate-500" : "text-zinc-500"}`}>
                    Link ini bersifat rahasia karena memberi akses baca ke jadwal kamu. Jika link pernah tersebar, klik Buat Ulang Link untuk mencabut link lama.
                  </p>
                </motion.div>
              )}

              {/* ═══════════════ BACKUP VIEW ═══════════════ */}
              {subView === "backup" && (
                <motion.div
                  key="backup"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  <div className={`rounded-xl border p-4 ${isDark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-zinc-50"}`}>
                    <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-zinc-900"}`}>Export & Import Data</p>
                    <p className={`mt-1 text-xs leading-relaxed ${isDark ? "text-slate-400" : "text-zinc-600"}`}>
                      Simpan backup data DUIT atau restore dari file JSON backup.
                    </p>
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <button type="button" onClick={exportBackupJson} className={btnPrimary}>
                        Export JSON
                      </button>
                      <button type="button" onClick={exportTransactionsCsv} className={btnSecondary}>
                        Export CSV
                      </button>
                      <button type="button" onClick={() => backupInputRef.current?.click()} className={btnSecondary}>
                        Import JSON
                      </button>
                    </div>
                    <input
                      ref={backupInputRef}
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={handleImportBackup}
                    />
                    {backupNotice && (
                      <p role="status" className="mt-3 text-xs text-emerald-500">{backupNotice}</p>
                    )}
                    {backupError && (
                      <p role="alert" className="mt-3 text-xs text-rose-500">{backupError}</p>
                    )}
                  </div>
                  <p className={`text-[11px] leading-relaxed ${isDark ? "text-slate-500" : "text-zinc-500"}`}>
                    Import JSON akan mengganti data akun saat ini setelah kamu konfirmasi. Simpan export JSON terbaru sebelum restore.
                  </p>
                </motion.div>
              )}

              {/* ═══════════════ CHANGE EMAIL ═══════════════ */}
              {subView === "email" && (
                <ChangeEmailForm
                  currentEmail={user?.email || ""}
                  onSubmit={changeEmail}
                  onDone={() => setSubView("main")}
                  isDark={isDark}
                />
              )}

              {/* ═══════════════ CHANGE PASSWORD ═══════════════ */}
              {subView === "password" && (
                <ChangePasswordForm
                  onSubmit={changePassword}
                  onDone={() => setSubView("main")}
                  isDark={isDark}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
      <ConfirmDialog
        open={open && confirmCalendarReset}
        title="Buat Ulang Link Kalender?"
        message="Link kalender lama akan langsung dicabut dan tidak bisa dipakai lagi. Kalender yang sudah subscribe dengan link lama perlu diganti memakai link baru."
        confirmLabel="Ya, Buat Ulang"
        tone="danger"
        onClose={() => setConfirmCalendarReset(false)}
        onConfirm={regenerateCalendarFeedUrl}
        isDark={isDark}
      />
      <ConfirmDialog
        open={open && confirmImport}
        title="Import Backup JSON?"
        message={pendingImport ? `Data akun saat ini akan diganti dengan isi backup: ${pendingImport.summary}. Tindakan ini tidak bisa dibatalkan otomatis.` : "Data akun saat ini akan diganti dengan isi backup."}
        confirmLabel="Ya, Import"
        tone="danger"
        onClose={() => {
          setConfirmImport(false);
          setPendingImport(null);
        }}
        onConfirm={confirmImportBackup}
        isDark={isDark}
      />
      <ConfirmDialog
        open={open && confirmReset}
        title="Reset Semua Data?"
        message="Semua transaksi, jadwal, goal, mood, dan dompet di akun cloud akan direset. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, Reset"
        tone="danger"
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetAll();
          handleClose();
        }}
        isDark={isDark}
      />
    </>
  );
}

function safeTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function toCsvRow(values: string[]): string {
  return values
    .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
    .join(",");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parseBackupJson(raw: string): UserData {
  const parsed = JSON.parse(raw) as unknown;
  const candidate = isPlainObject(parsed) && "data" in parsed ? parsed.data : parsed;
  return sanitizeImportedUserData(candidate);
}

function summarizeBackup(data: UserData): string {
  return `${data.txs.length} transaksi, ${data.wallets.length} dompet, ${data.goals.length} goal, ${data.scheds.length} jadwal, ${Object.keys(data.moods).length} mood`;
}

/* ══════════════════════════════════════════════════════════════
   CHANGE EMAIL FORM
   ══════════════════════════════════════════════════════════════ */
function ChangeEmailForm({
  currentEmail,
  onSubmit,
  onDone,
  isDark,
}: {
  currentEmail: string;
  onSubmit: (pw: string, newEmail: string) => Promise<void>;
  onDone: () => void;
  isDark: boolean;
}) {
  const [password, setPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const inputClass = isDark
    ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-teal-400/50 focus:outline-none"
    : "w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none focus:bg-white";

  const labelClass = isDark ? "mb-1 block text-xs font-medium text-slate-400" : "mb-1 block text-xs font-medium text-zinc-600";
  const textClass = isDark ? "text-white" : "text-zinc-900";
  const mutedClass = isDark ? "text-slate-400" : "text-zinc-500";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!password || !newEmail) return setError("Semua field wajib diisi");
    if (newEmail === currentEmail) return setError("Email baru sama dengan email lama");

    setLoading(true);
    try {
      await onSubmit(password, newEmail);
      setSuccess(true);
      setTimeout(onDone, 1800);
    } catch (err: any) {
      setError(mapAuthError(err.code));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="py-6 text-center"
      >
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/20 text-2xl">
          ✓
        </div>
        <p className={`text-sm font-medium ${textClass}`}>Email berhasil diubah!</p>
        <p className={`mt-1 text-xs ${mutedClass}`}>Cek inbox untuk verifikasi</p>
      </motion.div>
    );
  }

  return (
    <motion.form
      key="email"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.15 }}
      onSubmit={handleSubmit}
      className="space-y-3"
    >
      <div>
        <label className={labelClass}>
          Email Saat Ini
        </label>
        <input
          type="email"
          value={currentEmail}
          disabled
          className={inputClass + " opacity-60"}
        />
      </div>

      <div>
        <label className={labelClass}>
          Email Baru
        </label>
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="email-baru@domain.com"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>
          Password Saat Ini
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Untuk verifikasi identitas"
          className={inputClass}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-500">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 py-2.5 text-sm font-semibold text-zinc-900 hover:brightness-105 disabled:opacity-50"
      >
        {loading ? "Memproses..." : "Ganti Email"}
      </button>
    </motion.form>
  );
}

/* ══════════════════════════════════════════════════════════════
   CHANGE PASSWORD FORM
   ══════════════════════════════════════════════════════════════ */
function ChangePasswordForm({
  onSubmit,
  onDone,
  isDark,
}: {
  onSubmit: (currentPw: string, newPw: string) => Promise<void>;
  onDone: () => void;
  isDark: boolean;
}) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const inputClass = isDark
    ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-teal-400/50 focus:outline-none"
    : "w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none focus:bg-white";

  const labelClass = isDark ? "mb-1 block text-xs font-medium text-slate-400" : "mb-1 block text-xs font-medium text-zinc-600";
  const textClass = isDark ? "text-white" : "text-zinc-900";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!currentPw || !newPw || !confirmPw) return setError("Semua field wajib diisi");
    if (newPw.length < 6) return setError("Password baru minimal 6 karakter");
    if (newPw !== confirmPw) return setError("Konfirmasi password tidak cocok");
    if (currentPw === newPw) return setError("Password baru sama dengan password lama");

    setLoading(true);
    try {
      await onSubmit(currentPw, newPw);
      setSuccess(true);
      setTimeout(onDone, 1500);
    } catch (err: any) {
      setError(mapAuthError(err.code));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="py-6 text-center"
      >
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/20 text-2xl">
          ✓
        </div>
        <p className={`text-sm font-medium ${textClass}`}>Password berhasil diubah!</p>
      </motion.div>
    );
  }

  return (
    <motion.form
      key="password"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.15 }}
      onSubmit={handleSubmit}
      className="space-y-3"
    >
      <div>
        <label className={labelClass}>
          Password Saat Ini
        </label>
        <input
          type="password"
          value={currentPw}
          onChange={(e) => setCurrentPw(e.target.value)}
          placeholder="••••••••"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>
          Password Baru
        </label>
        <input
          type="password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          placeholder="Minimal 6 karakter"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>
          Konfirmasi Password Baru
        </label>
        <input
          type="password"
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          placeholder="Ulangi password baru"
          className={inputClass}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-500">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 py-2.5 text-sm font-semibold text-zinc-900 hover:brightness-105 disabled:opacity-50"
      >
        {loading ? "Memproses..." : "Ganti Password"}
      </button>
    </motion.form>
  );
}

/* ─── Icons & Helpers ────────────────────────────────────────── */
function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function mapAuthError(code: string): string {
  const map: Record<string, string> = {
    "auth/wrong-password": "Password saat ini salah",
    "auth/invalid-credential": "Password saat ini salah",
    "auth/invalid-email": "Format email tidak valid",
    "auth/email-already-in-use": "Email sudah digunakan akun lain",
    "auth/weak-password": "Password terlalu lemah (min 6 karakter)",
    "auth/requires-recent-login": "Sesi kadaluarsa, silakan logout & login ulang",
    "auth/too-many-requests": "Terlalu banyak percobaan, coba lagi nanti",
    "auth/operation-not-allowed": "Operasi tidak diizinkan",
  };
  return map[code] || "Terjadi kesalahan. Coba lagi.";
}
