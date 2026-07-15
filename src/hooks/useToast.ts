// src/hooks/useToast.ts
// Global toast notification system — lightweight, no external deps

import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const AUTO_DISMISS_MS = 3000;
let nextId = 0;

/* ═══════════════════ STATE (module-level singleton) ═══════════════════ */
let listeners: Set<() => void> = new Set();
let toasts: Toast[] = [];

function emitChange() {
  for (const fn of listeners) fn();
}

function addToast(message: string, type: ToastType = "info") {
  const id = nextId++;
  toasts = [...toasts, { id, message, type }];
  emitChange();
  // Auto-dismiss
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emitChange();
  }, AUTO_DISMISS_MS);
}

function removeToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emitChange();
}

/* ═══════════════════ PUBLIC API ═══════════════════ */
export const toast = {
  success: (msg: string) => addToast(msg, "success"),
  error: (msg: string) => addToast(msg, "error"),
  info: (msg: string) => addToast(msg, "info"),
  warning: (msg: string) => addToast(msg, "warning"),
  dismiss: removeToast,
};

/* ═══════════════════ HOOK ═══════════════════ */
export function useToasts(): Toast[] {
  const [, setVersion] = useState(0);

  useEffect(() => {
    const fn = () => setVersion((v) => v + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);

  return toasts;
}
