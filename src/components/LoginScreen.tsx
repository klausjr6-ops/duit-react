// src/components/LoginScreen.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../lib/AuthContext";
import { useTheme } from "../lib/ThemeContext";
import { consumeSessionExpired } from "../hooks/useAutoLogout";

type Screen = "login" | "register";

export default function LoginScreen() {
  const [screen, setScreen] = useState<Screen>("login");
  const [sessionExpired, setSessionExpired] = useState(false);
  const { isDark } = useTheme();

  useEffect(() => {
    if (consumeSessionExpired()) {
      setSessionExpired(true);
    }
  }, []);

  return (
    <div className={isDark
      ? "min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center p-4 transition-colors"
      : "min-h-screen bg-[#f5f5f7] text-zinc-900 flex items-center justify-center p-4 transition-colors"
    }>
      <div className="w-full max-w-md">
        <AnimatePresence>
          {sessionExpired && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className={`mb-5 flex items-center gap-3 rounded-xl px-4 py-3 ${isDark ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" : "bg-amber-50 border border-amber-200 text-amber-700"}`}
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="text-sm font-medium">Sesi telah berakhir. Login untuk melanjutkan.</span>
              <button
                type="button"
                onClick={() => setSessionExpired(false)}
                className={`ml-auto flex-shrink-0 p-0.5 rounded-full transition-colors ${isDark ? "hover:bg-amber-500/20" : "hover:bg-amber-100"}`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          {screen === "login" ? (
            <LoginForm key="login" onSwitchToRegister={() => setScreen("register")} />
          ) : (
            <RegisterForm key="register" onSwitchToLogin={() => setScreen("login")} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ═══════════════════ LOGO DUIT ═══════════════════ */
function DuitLogo() {
  const { isDark } = useTheme();
  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      <div className="w-14 h-14 rounded-2xl shadow-lg shadow-teal-500/20 overflow-hidden">
        <img src="/logo_d_ukuran_disesuaikan.svg" alt="DUIT" className="h-full w-full object-cover" />
      </div>
      <span className={`text-4xl font-black tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>DUIT</span>
    </div>
  );
}

/* ═══════════════════ LOGIN FORM ═══════════════════ */
function LoginForm({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const { loginEmail, loginGoogle, resetPassword } = useAuth();
  const { isDark } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!email || !password) return setError("Email dan password wajib diisi");
    setLoading(true);
    try { await loginEmail(email, password); } 
    catch (err: any) { setError(mapFirebaseError(err.code)); }
    finally { setLoading(false); }
  }
  async function handleGoogle() {
    setError(null); setSuccess(null); setGoogleLoading(true);
    try { await loginGoogle(); } catch (err: any) { setError(mapFirebaseError(err.code)); }
    finally { setGoogleLoading(false); }
  }

  async function handleResetPassword() {
    setError(null);
    setSuccess(null);
    const cleanEmail = email.trim();
    if (!cleanEmail) return setError("Isi email dulu untuk reset password");
    setResetLoading(true);
    try {
      await resetPassword(cleanEmail);
      setSuccess("Link reset password sudah dikirim. Cek inbox atau folder spam email kamu.");
    } catch (err: any) {
      setError(mapFirebaseError(err.code));
    } finally {
      setResetLoading(false);
    }
  }

  const cardCls = isDark
    ? "bg-[#1a1a1a] border border-zinc-800 rounded-2xl p-6 shadow-xl"
    : "bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm";
  const titleCls = isDark ? "text-xl font-bold text-white" : "text-xl font-bold text-zinc-900";
  const subCls = isDark ? "text-sm text-zinc-400 mt-1" : "text-sm text-zinc-500 mt-1";
  const dividerLine = isDark ? "flex-1 h-px bg-zinc-800" : "flex-1 h-px bg-zinc-200";
  const switchText = isDark ? "text-center text-sm text-zinc-500 mt-5" : "text-center text-sm text-zinc-500 mt-5";
  const googleBtn = isDark
    ? "w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 border border-zinc-800 text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-3"
    : "w-full bg-white hover:bg-zinc-50 disabled:opacity-50 border border-zinc-300 text-zinc-900 font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-3 shadow-sm";

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
      <DuitLogo />
      <div className="text-center mb-6">
        <h1 className={titleCls}>Selamat datang</h1>
        <p className={subCls}>Masuk ke akun DUIT kamu</p>
      </div>
      <div className={cardCls}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="nama@email.com" autoComplete="email" />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={`text-xs font-medium ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>Password</label>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={loading || googleLoading || resetLoading}
                className="text-xs text-teal-600 hover:text-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {resetLoading ? "Mengirim..." : "Lupa?"}
              </button>
            </div>
            <PasswordInput value={password} onChange={setPassword} show={showPass} onToggleShow={() => setShowPass(s=>!s)} autoComplete="current-password" />
          </div>
          <AnimatePresence>
            {error && <ErrorMessage message={error} />}
            {success && <SuccessMessage message={success} />}
          </AnimatePresence>
          <button type="submit" disabled={loading || googleLoading || resetLoading}
            className="w-full bg-gradient-to-br from-teal-400 to-blue-500 hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20"
          >
            {loading ? (<><div className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" /><span>Memproses...</span></>) : (<span>Masuk</span>)}
          </button>
        </form>
        <div className="flex items-center gap-3 my-5">
          <div className={dividerLine} />
          <span className="text-xs text-zinc-500">atau</span>
          <div className={dividerLine} />
        </div>
        <button onClick={handleGoogle} disabled={googleLoading || loading || resetLoading} className={googleBtn}>
          {googleLoading ? <div className={`w-4 h-4 border-2 rounded-full animate-spin ${isDark ? "border-zinc-600 border-t-white" : "border-zinc-300 border-t-zinc-900"}`} /> : <GoogleIcon />}
          <span className="text-sm">Lanjut dengan Google</span>
        </button>
      </div>
      <p className={switchText}>
        Belum punya akun? <button onClick={onSwitchToRegister} className="text-teal-600 hover:text-teal-500 font-medium transition-colors">Daftar</button>
      </p>
    </motion.div>
  );
}

/* ═══════════════════ REGISTER FORM ═══════════════════ */
function RegisterForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { registerEmail, loginGoogle } = useAuth();
  const { isDark } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const strength = getPasswordStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!name.trim()) return setError("Nama wajib diisi");
    if (!email || !password) return setError("Semua field wajib diisi");
    if (password.length < 6) return setError("Password minimal 6 karakter");
    if (password !== confirmPass) return setError("Konfirmasi password tidak cocok");
    setLoading(true);
    try { await registerEmail(email, password, name.trim()); }
    catch (err: any) { setError(mapFirebaseError(err.code)); }
    finally { setLoading(false); }
  }
  async function handleGoogle() {
    setError(null); setGoogleLoading(true);
    try { await loginGoogle(); } catch (err: any) { setError(mapFirebaseError(err.code)); }
    finally { setGoogleLoading(false); }
  }

  const cardCls = isDark ? "bg-[#1a1a1a] border border-zinc-800 rounded-2xl p-6" : "bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm";
  const titleCls = isDark ? "text-xl font-bold text-white" : "text-xl font-bold text-zinc-900";
  const subCls = isDark ? "text-sm text-zinc-400 mt-1" : "text-sm text-zinc-500 mt-1";
  const dividerLine = isDark ? "flex-1 h-px bg-zinc-800" : "flex-1 h-px bg-zinc-200";
  const googleBtn = isDark
    ? "w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 border border-zinc-800 text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-3 mb-4"
    : "w-full bg-white hover:bg-zinc-50 disabled:opacity-50 border border-zinc-300 text-zinc-900 font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-3 mb-4 shadow-sm";
  const labelCls = isDark ? "text-xs font-medium text-zinc-400 mb-1.5 block" : "text-xs font-medium text-zinc-600 mb-1.5 block";
  const switchText = isDark ? "text-center text-sm text-zinc-500 mt-5" : "text-center text-sm text-zinc-500 mt-5";

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
      <DuitLogo />
      <div className="text-center mb-6">
        <h1 className={titleCls}>Buat akun baru</h1>
        <p className={subCls}>Mulai kelola keuangan kamu</p>
      </div>
      <div className={cardCls}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nama" type="text" value={name} onChange={setName} placeholder="Nama panggilan kamu" autoComplete="name" />
          <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="nama@email.com" autoComplete="email" />
          <div>
            <label className={labelCls}>Password</label>
            <PasswordInput value={password} onChange={setPassword} show={showPass} onToggleShow={()=>setShowPass(s=>!s)} autoComplete="new-password" placeholder="Minimal 6 karakter" />
            {password && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength.score ? strength.color : isDark ? "bg-zinc-800" : "bg-zinc-200"}`} />
                  ))}
                </div>
                <span className={`text-[10px] font-medium ${strength.textColor}`}>{strength.label}</span>
              </div>
            )}
          </div>
          <Input label="Konfirmasi Password" type={showPass ? "text" : "password"} value={confirmPass} onChange={setConfirmPass} placeholder="Ulangi password" autoComplete="new-password" />
          <AnimatePresence>{error && <ErrorMessage message={error} />}</AnimatePresence>
          <button type="submit" disabled={loading || googleLoading}
            className="w-full bg-gradient-to-br from-teal-400 to-blue-500 hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20"
          >
            {loading ? (<><div className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" /><span>Membuat akun...</span></>) : (<span>Daftar</span>)}
          </button>
        </form>
        <div className="flex items-center gap-3 my-5">
          <div className={dividerLine} /><span className="text-xs text-zinc-500">atau</span><div className={dividerLine} />
        </div>
        <button onClick={handleGoogle} disabled={googleLoading || loading} className={googleBtn}>
          {googleLoading ? <div className={`w-4 h-4 border-2 rounded-full animate-spin ${isDark ? "border-zinc-600 border-t-white" : "border-zinc-300 border-t-zinc-900"}`} /> : <GoogleIcon />}
          <span className="text-sm">Daftar dengan Google</span>
        </button>
        <p className={`text-[11px] text-center leading-relaxed ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
          Dengan mendaftar, kamu menyetujui <span className={`${isDark ? "text-zinc-400" : "text-zinc-600"} underline`}>Syarat & Ketentuan</span> dan <span className={`${isDark ? "text-zinc-400" : "text-zinc-600"} underline`}>Kebijakan Privasi</span>
        </p>
      </div>
      <p className={switchText}>
        Sudah punya akun? <button onClick={onSwitchToLogin} className="text-teal-600 hover:text-teal-500 font-medium transition-colors">Masuk</button>
      </p>
    </motion.div>
  );
}

/* ═══════════ REUSABLE COMPONENTS ═══════════ */
function Input({ label, type, value, onChange, placeholder, autoComplete }: {
  label: string; type: string; value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string;
}) {
  const { isDark } = useTheme();
  return (
    <div>
      <label className={`text-xs font-medium mb-1.5 block ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={isDark
          ? "w-full bg-[#0f0f0f] border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-teal-500/50 transition-colors"
          : "w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-zinc-900 text-sm placeholder-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-colors"
        }
      />
    </div>
  );
}

function PasswordInput({ value, onChange, show, onToggleShow, placeholder, autoComplete }: {
  value: string; onChange: (v: string) => void; show: boolean; onToggleShow: () => void; placeholder?: string; autoComplete?: string;
}) {
  const { isDark } = useTheme();
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "••••••••"}
        autoComplete={autoComplete}
        className={isDark
          ? "w-full bg-[#0f0f0f] border border-zinc-800 rounded-xl px-4 py-2.5 pr-11 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-teal-500/50 transition-colors"
          : "w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 pr-11 text-zinc-900 text-sm placeholder-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-colors"
        }
      />
      <button type="button" onClick={onToggleShow} className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors p-1 ${isDark ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-700"}`} tabIndex={-1}>
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -6, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -6, height: 0 }}
      className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-lg px-3 py-2.5 flex items-start gap-2"
    >
      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span className="leading-relaxed">{message}</span>
    </motion.div>
  );
}

function SuccessMessage({ message }: { message: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -6, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -6, height: 0 }}
      className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs rounded-lg px-3 py-2.5 flex items-start gap-2"
    >
      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      <span className="leading-relaxed">{message}</span>
    </motion.div>
  );
}

/* ═══════════ ICONS ═══════════ */
function GoogleIcon() { return (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);}
function EyeIcon() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>);}
function EyeOffIcon() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>);}

/* ═══════════ HELPERS ═══════════ */
function getPasswordStrength(pass: string) {
  if (!pass) return { score: 0, label: "", color: "", textColor: "" };
  let score = 0;
  if (pass.length >= 6) score++;
  if (pass.length >= 10) score++;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
  if (/\d/.test(pass) && /[^A-Za-z0-9]/.test(pass)) score++;
  const levels = [
    { label: "Lemah", color: "bg-red-500", textColor: "text-red-500" },
    { label: "Cukup", color: "bg-orange-500", textColor: "text-orange-500" },
    { label: "Bagus", color: "bg-yellow-500", textColor: "text-yellow-500" },
    { label: "Kuat", color: "bg-emerald-500", textColor: "text-emerald-500" },
  ];
  return { score, ...levels[Math.max(0, score - 1)] };
}
function mapFirebaseError(code: string): string {
  const map: Record<string, string> = {
    "auth/invalid-email": "Format email tidak valid",
    "auth/user-not-found": "Akun tidak ditemukan",
    "auth/wrong-password": "Password salah",
    "auth/invalid-credential": "Email atau password salah",
    "auth/email-already-in-use": "Email sudah terdaftar",
    "auth/weak-password": "Password terlalu lemah (min 6 karakter)",
    "auth/popup-closed-by-user": "Login dibatalkan",
    "auth/network-request-failed": "Koneksi internet bermasalah",
    "auth/missing-email": "Email wajib diisi",
    "auth/too-many-requests": "Terlalu banyak percobaan, coba lagi nanti",
  };
  return map[code] || "Terjadi kesalahan. Coba lagi.";
}
