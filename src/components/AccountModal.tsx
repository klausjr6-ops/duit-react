import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "../lib/store";
import { useAuth } from "../lib/AuthContext";

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type SubView = "main" | "email" | "password";

export default function AccountModal({ open, onClose }: AccountModalProps) {
  const { settings, updateSettings, resetAll } = useStore();
  const { user, logout, changeEmail, changePassword } = useAuth();

  const [name, setName] = useState(settings.name);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [subView, setSubView] = useState<SubView>("main");
  const fileRef = useRef<HTMLInputElement>(null);

  // Cek apakah user login pakai Google (gak bisa ganti email/pass)
  const isGoogleUser = user?.providerData[0]?.providerId === "google.com";

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await toBase64(file);
    updateSettings({ avatar: b64 });
  };

  const saveName = () => {
    updateSettings({ name: name.trim() || "Kamu" });
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
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                {subView !== "main" && (
                  <button
                    onClick={() => setSubView("main")}
                    className="text-slate-400 hover:text-white -ml-1"
                  >
                    ←
                  </button>
                )}
                <div>
                  <p className="text-xs font-semibold text-emerald-400">AKUN</p>
                  <p className="text-sm font-medium text-white">
                    {subView === "main" && "Pengaturan Akun"}
                    {subView === "email" && "Ganti Email"}
                    {subView === "password" && "Ganti Password"}
                  </p>
                </div>
              </div>
              <button onClick={handleClose} className="text-slate-400 hover:text-white">
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
                      onClick={() => fileRef.current?.click()}
                      className="group relative h-20 w-20 overflow-hidden rounded-full ring-2 ring-emerald-400/40"
                    >
                      {settings.avatar ? (
                        <img src={settings.avatar} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-xl font-bold text-white">
                          {name ? name[0].toUpperCase() : "?"}
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-lg opacity-0 transition-opacity group-hover:opacity-100">
                        📷
                      </div>
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
                    <p className="mt-2 text-xs text-slate-500">Klik foto untuk ganti avatar</p>
                  </div>

                  {/* Nama */}
                  <div className="mb-4">
                    <label className="mb-1 block text-xs font-medium text-slate-400">Nama</label>
                    <div className="flex gap-2">
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/50 focus:outline-none"
                        placeholder="Nama kamu"
                      />
                      <button
                        onClick={saveName}
                        className="rounded-xl bg-emerald-400 px-3 py-2 text-sm font-semibold text-slate-900 hover:brightness-105"
                      >
                        Simpan
                      </button>
                    </div>
                  </div>

                  {/* Ganti Email & Password (hanya untuk user email/password) */}
                  {!isGoogleUser && (
                    <div className="mb-4 space-y-2">
                      <button
                        onClick={() => setSubView("email")}
                        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-colors hover:bg-white/10"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">Ganti Email</p>
                          <p className="text-xs text-slate-500 truncate max-w-[220px]">
                            {user?.email}
                          </p>
                        </div>
                        <span className="text-slate-500">›</span>
                      </button>

                      <button
                        onClick={() => setSubView("password")}
                        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-colors hover:bg-white/10"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">Ganti Password</p>
                          <p className="text-xs text-slate-500">Ubah kata sandi akun</p>
                        </div>
                        <span className="text-slate-500">›</span>
                      </button>
                    </div>
                  )}

                  {/* Info untuk Google user */}
                  {isGoogleUser && (
                    <div className="mb-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      <p className="text-xs text-slate-400">
                        Kamu login dengan <span className="font-semibold text-white">Google</span>.
                        Ganti email/password dilakukan lewat akun Google kamu.
                      </p>
                    </div>
                  )}

                  <div className="h-px w-full bg-white/10" />

                  {/* Logout */}
                  <div className="mt-4">
                    {!confirmLogout ? (
                      <button
                        onClick={() => setConfirmLogout(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 py-2.5 text-sm font-semibold text-amber-400 hover:bg-amber-400/20 transition-colors"
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
                        <p className="mb-3 text-center text-sm text-white">Yakin ingin keluar?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmLogout(false)}
                            disabled={loggingOut}
                            className="flex-1 rounded-lg bg-white/10 py-2 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50"
                          >
                            Batal
                          </button>
                          <button
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-500 py-2 text-xs font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
                          >
                            {loggingOut ? (
                              <>
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" />
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
                    onClick={() => {
                      if (confirm("Yakin mau hapus semua data lokal?")) {
                        resetAll();
                        handleClose();
                      }
                    }}
                    className="mt-3 w-full rounded-xl border border-rose-400/30 bg-rose-400/10 py-2.5 text-sm font-semibold text-rose-400 hover:bg-rose-400/20"
                  >
                    🗑️ Hapus Semua Data
                  </button>
                </motion.div>
              )}

              {/* ═══════════════ CHANGE EMAIL ═══════════════ */}
              {subView === "email" && (
                <ChangeEmailForm
                  currentEmail={user?.email || ""}
                  onSubmit={changeEmail}
                  onDone={() => setSubView("main")}
                />
              )}

              {/* ═══════════════ CHANGE PASSWORD ═══════════════ */}
              {subView === "password" && (
                <ChangePasswordForm
                  onSubmit={changePassword}
                  onDone={() => setSubView("main")}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ══════════════════════════════════════════════════════════════
   CHANGE EMAIL FORM
   ══════════════════════════════════════════════════════════════ */
function ChangeEmailForm({
  currentEmail,
  onSubmit,
  onDone,
}: {
  currentEmail: string;
  onSubmit: (pw: string, newEmail: string) => Promise<void>;
  onDone: () => void;
}) {
  const [password, setPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
        <p className="text-sm font-medium text-white">Email berhasil diubah!</p>
        <p className="mt-1 text-xs text-slate-400">Cek inbox untuk verifikasi</p>
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
        <label className="mb-1 block text-xs font-medium text-slate-400">
          Email Saat Ini
        </label>
        <input
          type="email"
          value={currentEmail}
          disabled
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">
          Email Baru
        </label>
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="email-baru@domain.com"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/50 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">
          Password Saat Ini
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Untuk verifikasi identitas"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/50 focus:outline-none"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-emerald-400 py-2.5 text-sm font-semibold text-slate-900 hover:brightness-105 disabled:opacity-50"
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
}: {
  onSubmit: (currentPw: string, newPw: string) => Promise<void>;
  onDone: () => void;
}) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
        <p className="text-sm font-medium text-white">Password berhasil diubah!</p>
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
        <label className="mb-1 block text-xs font-medium text-slate-400">
          Password Saat Ini
        </label>
        <input
          type="password"
          value={currentPw}
          onChange={(e) => setCurrentPw(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/50 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">
          Password Baru
        </label>
        <input
          type="password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          placeholder="Minimal 6 karakter"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/50 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">
          Konfirmasi Password Baru
        </label>
        <input
          type="password"
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          placeholder="Ulangi password baru"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/50 focus:outline-none"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-emerald-400 py-2.5 text-sm font-semibold text-slate-900 hover:brightness-105 disabled:opacity-50"
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