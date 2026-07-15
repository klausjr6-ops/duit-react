import { useCallback, useEffect, useRef } from "react";

const INACTIVITY_MS = 5 * 60 * 1000; // 5 menit
const SESSION_EXPIRED_KEY = "duit_session_expired";

const EVENTS: (keyof WindowEventMap)[] = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
];

/**
 * Hook auto-logout setelah 5 menit tidak ada aktivitas.
 * Saat logout otomatis terjadi, flag disimpan di sessionStorage
 * agar halaman login bisa menampilkan notifikasi "Sesi telah berakhir".
 */
export function useAutoLogout(onLogout: () => Promise<void>) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutRef = useRef(onLogout);
  logoutRef.current = onLogout;

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Logout setelah 5 menit penuh tanpa warning
    timerRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_EXPIRED_KEY, "1");
      } catch {
        // sessionStorage unavailable — non-critical
      }
      logoutRef.current();
    }, INACTIVITY_MS);
  }, []);

  useEffect(() => {
    resetTimer();

    const handleActivity = () => {
      resetTimer();
    };

    for (const event of EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
    };
  }, [resetTimer]);
}

/** Cek apakah sesi berakhir karena auto-logout, lalu hapus flag-nya. */
export function consumeSessionExpired(): boolean {
  try {
    const val = sessionStorage.getItem(SESSION_EXPIRED_KEY);
    if (val === "1") {
      sessionStorage.removeItem(SESSION_EXPIRED_KEY);
      return true;
    }
  } catch {
    // sessionStorage unavailable
  }
  return false;
}
