import { AnimatePresence, motion } from "framer-motion";
import { useModalDialog } from "../hooks/useModalDialog";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  isDark: boolean;
  tone?: "danger" | "warning";
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Hapus",
  onConfirm,
  onClose,
  isDark,
  tone = "danger",
}: ConfirmDialogProps) {
  const { dialogRef, onDialogKeyDown } = useModalDialog(open, onClose);
  const confirmClass = tone === "warning"
    ? "bg-amber-500 text-zinc-900 hover:bg-amber-400"
    : "bg-rose-500 text-white hover:bg-rose-400";
  const iconClass = tone === "warning"
    ? "bg-amber-400/15 text-amber-600"
    : "bg-rose-400/15 text-rose-500";
  const panelClass = isDark
    ? "w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
    : "w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl";
  const titleClass = isDark ? "text-white" : "text-zinc-900";
  const textClass = isDark ? "text-slate-400" : "text-zinc-500";
  const cancelClass = isDark
    ? "flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
    : "flex-1 rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <motion.div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-message"
            onKeyDown={onDialogKeyDown}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            onClick={(event) => event.stopPropagation()}
            className={panelClass}
          >
            <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${iconClass}`}>
              {tone === "warning" ? "⚠️" : "🗑️"}
            </div>
            <h2 id="confirm-dialog-title" className={`text-lg font-bold ${titleClass}`}>{title}</h2>
            <p id="confirm-dialog-message" className={`mt-2 text-sm leading-relaxed ${textClass}`}>{message}</p>

            <div className="mt-6 flex gap-3">
              <button type="button" onClick={onClose} className={cancelClass}>Batal</button>
              <button
                type="button"
                onClick={onConfirm}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${confirmClass}`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
