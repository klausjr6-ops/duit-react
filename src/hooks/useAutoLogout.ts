import { useCallback, useEffect, useRef, useState } from "react";

const INACTIVITY_MS = 5 * 60 * 1000; // 5 menit
const WARNING_MS = 30 * 1000; // 30 detik sebelum logout, tampilkan warning

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
 * Menampilkan warning 30 detik sebelum logout.
 * User bisa klik "Tetap Masuk" untuk reset timer.
 */
export function useAutoLogout(onLogout: () => Promise<void>) {
  const [showWarning, setShowWarning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutRef = useRef(onLogout);
  logoutRef.current = onLogout;

  const resetTimers = useCallback(() => {
    setShowWarning(false);

    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Warning muncul 30 detik sebelum logout
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
    }, INACTIVITY_MS - WARNING_MS);

    // Logout setelah 5 menit penuh
    timerRef.current = setTimeout(() => {
      logoutRef.current();
    }, INACTIVITY_MS);
  }, []);

  const stayLoggedIn = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  useEffect(() => {
    resetTimers();

    const handleActivity = () => {
      resetTimers();
    };

    for (const event of EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
    };
  }, [resetTimers]);

  return { showWarning, stayLoggedIn };
}
