// src/components/DraggableFAB.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useStore, type FabCorner } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";

/* ═══════════════════ CONSTANTS ═══════════════════ */
const DRAG_THRESHOLD = 8;
const EDGE_PAD = 16;
const TOP_PAD_MOBILE = 24;
const TOP_PAD_DESKTOP = 32;
const BOT_PAD_MOBILE = 88;
const BOT_PAD_DESKTOP = 32;

function getFabSize(): number {
  return window.innerWidth >= 768 ? 56 : 48;
}

function getCornerXY(c: FabCorner): { x: number; y: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const s = getFabSize();
  const desk = vw >= 768;
  const tp = desk ? TOP_PAD_DESKTOP : TOP_PAD_MOBILE;
  const bp = desk ? BOT_PAD_DESKTOP : BOT_PAD_MOBILE;
  switch (c) {
    case "top-left":     return { x: EDGE_PAD, y: tp };
    case "top-right":    return { x: vw - EDGE_PAD - s, y: tp };
    case "bottom-left":  return { x: EDGE_PAD, y: vh - bp - s };
    case "bottom-right": return { x: vw - EDGE_PAD - s, y: vh - bp - s };
  }
}

function nearestCorner(cx: number, cy: number): FabCorner {
  const left = cx < window.innerWidth / 2;
  const top = cy < window.innerHeight / 2;
  if (top && left) return "top-left";
  if (top && !left) return "top-right";
  if (!top && left) return "bottom-left";
  return "bottom-right";
}

function tooltipCls(c: FabCorner): string {
  switch (c) {
    case "top-left":     return "top-full left-0 mt-1.5";
    case "top-right":    return "top-full right-0 mt-1.5";
    case "bottom-left":  return "bottom-full left-0 mb-1.5";
    case "bottom-right": return "bottom-full right-0 mb-1.5";
  }
}

/* ═══════════════════ COMPONENT ═══════════════════ */
interface Props {
  onOpenChat: () => void;
  inMonth: number;
  outMonth: number;
  score: number;
}

export default function DraggableFAB({ onOpenChat, inMonth, outMonth, score }: Props) {
  const { isDark } = useTheme();
  const { settings, updateSettings } = useStore();
  const storeCorner: FabCorner = (settings.fabCorner as FabCorner) || "bottom-right";

  const [corner, setCorner] = useState<FabCorner>(storeCorner);
  const [dragging, setDragging] = useState(false);
  const [desk, setDesk] = useState(() => window.innerWidth >= 768);

  /* ── Refs for drag logic (bypass React re-renders for perf) ── */
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cornerRef = useRef(corner);
  cornerRef.current = corner;
  const storeCornerRef = useRef(storeCorner);
  storeCornerRef.current = storeCorner;

  const dragState = useRef<{
    active: boolean;
    moved: boolean;
    startRectX: number;
    startRectY: number;
    startPointerX: number;
    startPointerY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  /* ── Apply position directly to DOM ── */
  const applyPos = useCallback((x: number, y: number, transition = false) => {
    const el = wrapperRef.current;
    if (!el) return;
    el.style.transform = `translate(${x}px, ${y}px)`;
    el.style.transition = transition ? "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)" : "none";
  }, []);

  /* ── Sync corner from Firestore (only when not dragging) ── */
  useEffect(() => {
    if (!dragState.current?.active) {
      setCorner(storeCorner);
      const p = getCornerXY(storeCorner);
      applyPos(p.x, p.y);
    }
  }, [storeCorner, applyPos]);

  /* ── Recalculate on viewport resize ── */
  useEffect(() => {
    const fn = () => {
      setDesk(window.innerWidth >= 768);
      if (!dragState.current?.active) {
        const p = getCornerXY(cornerRef.current);
        applyPos(p.x, p.y);
      }
    };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, [applyPos]);

  /* ── Initial position ── */
  useEffect(() => {
    const p = getCornerXY(storeCorner);
    applyPos(p.x, p.y);
  }, [applyPos, storeCorner]);

  /* ── Pointer handlers ── */
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Prevent pull-to-refresh and other parent handlers
    e.stopPropagation();
    e.preventDefault();

    const el = wrapperRef.current;
    if (!el) return;

    try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }

    const rect = el.getBoundingClientRect();
    dragState.current = {
      active: true,
      moved: false,
      startRectX: rect.left,
      startRectY: rect.top,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      currentX: rect.left,
      currentY: rect.top,
    };
    setDragging(false);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragState.current;
    if (!d || !d.active) return;

    e.stopPropagation();
    e.preventDefault();

    const dx = e.clientX - d.startPointerX;
    const dy = e.clientY - d.startPointerY;

    if (!d.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      d.moved = true;
      setDragging(true);
    }

    if (d.moved) {
      const s = getFabSize();
      const nx = Math.max(0, Math.min(window.innerWidth - s, d.startRectX + dx));
      const ny = Math.max(0, Math.min(window.innerHeight - s, d.startRectY + dy));
      d.currentX = nx;
      d.currentY = ny;
      applyPos(nx, ny);
    }
  }, [applyPos]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const el = wrapperRef.current;
    const d = dragState.current;
    if (!d || !d.active) return;

    e.stopPropagation();
    e.preventDefault();

    try { el?.releasePointerCapture(e.pointerId); } catch { /* ignore */ }

    dragState.current = null;

    if (d.moved) {
      // Snap to nearest corner
      const s = getFabSize();
      const cx = d.currentX + s / 2;
      const cy = d.currentY + s / 2;
      const nc = nearestCorner(cx, cy);
      const tp = getCornerXY(nc);
      setCorner(nc);
      setDragging(false);
      applyPos(tp.x, tp.y, true); // spring-like transition
      if (nc !== cornerRef.current) {
        updateSettings({ fabCorner: nc });
      }
    } else {
      setDragging(false);
      onOpenChat();
    }
  }, [applyPos, updateSettings, onOpenChat]);

  const onPointerCancel = useCallback((e: React.PointerEvent) => {
    const d = dragState.current;
    if (!d || !d.active) return;

    e.stopPropagation();
    dragState.current = null;

    if (d.moved) {
      const s = getFabSize();
      const nc = nearestCorner(d.currentX + s / 2, d.currentY + s / 2);
      const tp = getCornerXY(nc);
      setCorner(nc);
      applyPos(tp.x, tp.y, true);
      if (nc !== cornerRef.current) updateSettings({ fabCorner: nc });
    } else {
      applyPos(getCornerXY(cornerRef.current).x, getCornerXY(cornerRef.current).y);
    }
    setDragging(false);
  }, [applyPos, updateSettings]);

  /* ── Visual style based on financial status ── */
  const status =
    (outMonth > inMonth && inMonth > 0) ? "danger" :
    (outMonth > inMonth * 0.8 && inMonth > 0) ? "warning" :
    score >= 70 ? "good" : "neutral";

  const glow = { danger: "shadow-rose-500/40", warning: "shadow-amber-500/30", good: "shadow-emerald-500/30", neutral: "shadow-teal-500/25" }[status];
  const gradient = { danger: "from-rose-400 to-rose-600", warning: "from-amber-400 to-orange-500", good: "from-emerald-400 to-teal-500", neutral: "from-teal-400 to-blue-500" }[status];
  const pulse = status === "danger" || status === "warning";
  const tip = { danger: "⚠️ Overspend bulan ini!", warning: "⚡ Budget mulai ketat", good: "💚 Keuangan sehat!", neutral: "Tanya DUIT" }[status];

  return (
    <div
      ref={wrapperRef}
      className="fixed left-0 top-0 z-40"
      style={{ touchAction: "none", willChange: "transform" }}
    >
      {/* Tooltip — hidden during drag */}
      {!dragging && (
        <div
          className={`absolute ${tooltipCls(corner)} px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap opacity-0 group/fab:opacity-100 pointer-events-none w-fit transition-opacity ${
            isDark ? "bg-slate-800 text-slate-200 border border-white/10" : "bg-white text-zinc-700 border border-zinc-200 shadow-lg"
          }`}
        >
          {tip}
        </div>
      )}

      <motion.button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={() => {
          // If we lost capture unexpectedly, cancel drag
          if (dragState.current?.active) {
            const d = dragState.current;
            dragState.current = null;
            if (d.moved) {
              const s = getFabSize();
              const nc = nearestCorner(d.currentX + s / 2, d.currentY + s / 2);
              setCorner(nc);
              applyPos(getCornerXY(nc).x, getCornerXY(nc).y, true);
              if (nc !== cornerRef.current) updateSettings({ fabCorner: nc });
            } else {
              applyPos(getCornerXY(cornerRef.current).x, getCornerXY(cornerRef.current).y);
            }
            setDragging(false);
          }
        }}
        animate={
          dragging
            ? { scale: 1.12 }
            : pulse
              ? { scale: [1, 1.08, 1] }
              : { scale: 1 }
        }
        transition={
          dragging
            ? { duration: 0 }
            : pulse
              ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
              : { type: "spring", stiffness: 500, damping: 30 }
        }
        whileHover={!dragging ? { scale: 1.1 } : undefined}
        whileTap={!dragging ? { scale: 0.95 } : undefined}
        className={`group/fab flex ${desk ? "h-14 w-14" : "h-12 w-12"} items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-zinc-900 shadow-lg ${glow} transition-shadow select-none ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{ touchAction: "none" }}
        aria-label="Buka Chat AI"
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </motion.button>
    </div>
  );
}
