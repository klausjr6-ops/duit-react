import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginEmail: (email: string, password: string) => Promise<void>;
  registerEmail: (email: string, password: string, name: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  changeEmail: (currentPassword: string, newEmail: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const loginEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const registerEmail = async (email: string, password: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name.trim()) {
      await updateProfile(cred.user, { displayName: name.trim() });
    }
  };

  const loginGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const resetPassword = async (email: string) => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      throw new Error("Email wajib diisi");
    }

    await sendPasswordResetEmail(auth, cleanEmail);
  };

  const logout = async () => {
    await signOut(auth);
  };

  /* ─── Ganti Email ──────────────────────────────────────────
     Butuh re-auth dengan password saat ini (security requirement Firebase).
     Setelah berhasil, otomatis kirim email verifikasi ke email baru.
  ──────────────────────────────────────────────────────────── */
  const changeEmail = async (currentPassword: string, newEmail: string) => {
    if (!auth.currentUser || !auth.currentUser.email) {
      throw new Error("Tidak ada user yang login");
    }

    // Re-authenticate dulu
    const credential = EmailAuthProvider.credential(
      auth.currentUser.email,
      currentPassword
    );
    await reauthenticateWithCredential(auth.currentUser, credential);

    // Update email
    await updateEmail(auth.currentUser, newEmail);

    // Kirim verifikasi ke email baru (opsional tapi disarankan)
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (err) {
      // Non-critical, biarkan lolos
      console.warn("Gagal kirim email verifikasi:", err);
    }
  };

  /* ─── Ganti Password ──────────────────────────────────────
     Butuh re-auth juga.
  ──────────────────────────────────────────────────────────── */
  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!auth.currentUser || !auth.currentUser.email) {
      throw new Error("Tidak ada user yang login");
    }

    const credential = EmailAuthProvider.credential(
      auth.currentUser.email,
      currentPassword
    );
    await reauthenticateWithCredential(auth.currentUser, credential);

    await updatePassword(auth.currentUser, newPassword);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginEmail,
        registerEmail,
        loginGoogle,
        resetPassword,
        logout,
        changeEmail,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>");
  return ctx;
}