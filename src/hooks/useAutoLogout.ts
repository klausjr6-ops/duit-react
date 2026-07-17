import { useCallback, useEffect, useRef } from "react";

const INACTIVITY_MS = 5 * 60 * 1000; // 5 menit
const SESSION_EXPIRED_KEY = "duit_session_expired";
const LAST_ACTIVITY_KEY = "duit_last_activity";
const STAMP_THROTTLE_MS = 10_000; // max 1 localStorage write per 10s

const EVENTS: (keyof WindowEventMap)[] = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
];

/** Timestamp of last successful localStorage write (module-level for throttle). */
let lastStampTime = 0;

/** Update last activity timestamp in localStorage (persists across browser restarts).
 *  Throttled: only writes if the last write was more than STAMP_THROTTLE_MS ago.
 *  This avoids excessive synchronous I/O on high-frequency events like mousemove. */
export function stampActivity(): void {
  const now = Date.now();
  if (now - lastStampTime < STAMP_THROTTLE_MS) return;
  lastStampTime = now;
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
  } catch {
    // localStorage unavailable — non-critical
  }
}

/**
 * Check if the session is stale — i.e. the app was closed and reopened
 * after more than INACTIVITY_MS (5 min) with no user activity.
 * Returns false if no timestamp exists (first use or cleared storage).
 */
export function isSessionStale(): boolean {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!raw) return false; // No record = first use, not stale
    const lastActivity = parseInt(raw, 10);
    if (isNaN(lastActivity)) return false;
    return Date.now() - lastActivity > INACTIVITY_MS;
  } catch {
    return false;
  }
}

/**
 * Hook auto-logout setelah 5 menit tidak ada aktivitas.
 *
 * Dua mekanisme:
 * 1. **In-session timer** — saat app terbuka, timer 5 menit tanpa aktivitas → logout
 * 2. **Cross-session stale check** — saat app dibuka kembali (mobile/browser restart),
 *    cek localStorage timestamp → jika > 5 menit, force logout
 *
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

    // Stamp activity to localStorage for cross-session detection (throttled)
    stampActivity();

    // Logout setelah 5 menit penuh tanpa warning
    timerRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_EXPIRED_KEY, "1");
      } catch {
        // sessionStorage unavailable — non-critical
      }
      // Force a final stamp so the timestamp is accurate at logout time
      lastStampTime = 0; // reset throttle to force write
      stampActivity();
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
