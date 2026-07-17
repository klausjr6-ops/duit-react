// src/components/DraggableFAB.tsx
// v5 — bypass store queue for position save (no sync indicator)

import { useEffect, useRef, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebaseDb";
import { useAuth } from "../lib/AuthContext";
import { useStore, type FabCorner } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";

/* ═══════════════════ CONSTANTS ═══════════════════ */
const DRAG_THRESHOLD = 8;
const EDGE_PAD = 16;
const TOP_PAD_MOBILE = 24;
const TOP_PAD_DESKTOP = 32;
const BOT_PAD_MOBILE = 88;
const BOT_PAD_DESKTOP = 32;
const DEBOUNCE_MS = 3000;

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
    case "top-left":     return "top-full left-0 mt-2";
    case "top-right":    return "top-full right-0 mt-2";
    case "bottom-left":  return "bottom-full left-0 mb-2";
    case "bottom-right": return "bottom-full right-0 mb-2";
  }
}

/* ═══════════════════ COMPONENT ═══════════════════ */
interface Props {
  onOpenChat: () => void;
  inMonth: number;
  outMonth: number;
  score: number;
  hidden?: boolean;
}

export default function DraggableFAB({ onOpenChat, inMonth, outMonth, score, hidden }: Props) {
  const { isDark } = useTheme();
  const { settings } = useStore();
  const { user } = useAuth();
  const storeCorner: FabCorner = (settings.fabCorner as FabCorner) || "bottom-right";

  const [corner, setCorner] = useState<FabCorner>(storeCorner);
  const [dragging, setDragging] = useState(false);
  const [desk, setDesk] = useState(() => window.innerWidth >= 768);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const cornerRef = useRef(corner);
  cornerRef.current = corner;

  const onOpenChatRef = useRef(onOpenChat);
  onOpenChatRef.current = onOpenChat;
  const uidRef = useRef(user?.uid);
  uidRef.current = user?.uid;

  // Debounce timer + last-saved tracker
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<FabCorner>(storeCorner);

  /* ── Apply position directly to DOM ── */
  const applyPosRef = useRef((x: number, y: number, transition = false) => {
    const el = wrapperRef.current;
    if (!el) return;
    el.style.transition = transition
      ? "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)"
      : "none";
    el.style.transform = `translate(${x}px, ${y}px)`;
  });

  /* ── Write fabCorner directly to Firestore (bypasses store queue) ── */
  const saveCornerDirectRef = useRef((nc: FabCorner) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (nc === lastSavedRef.current) return;

    saveTimerRef.current = setTimeout(async () => {
      if (nc === lastSavedRef.current) return;
      const uid = uidRef.current;
      if (!uid) return;
      try {
        const ref = doc(db, "users", uid, "data", "main");
        // updateDoc with dot-notation only patches the nested field
        await updateDoc(ref, { "settings.fabCorner": nc });
        lastSavedRef.current = nc;
      } catch (err) {
        console.warn("FAB corner save failed:", err);
      }
      saveTimerRef.current = null;
    }, DEBOUNCE_MS);
  });

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  /* ── Sync corner from Firestore (via onSnapshot) ── */
  useEffect(() => {
    setCorner(storeCorner);
    lastSavedRef.current = storeCorner;
    const p = getCornerXY(storeCorner);
    applyPosRef.current(p.x, p.y);
  }, [storeCorner]);

  /* ── Viewport resize ── */
  useEffect(() => {
    const fn = () => {
      setDesk(window.innerWidth >= 768);
      const p = getCornerXY(cornerRef.current);
      applyPosRef.current(p.x, p.y, true);
    };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  /* ═══════════════════════════════════════════════════════════
     DRAG LOGIC — native DOM events, window-level move/up
     ═══════════════════════════════════════════════════════════ */
  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;

    let dragInfo: {
      startPointerX: number;
      startPointerY: number;
      startRectX: number;
      startRectY: number;
      moved: boolean;
      currentX: number;
      currentY: number;
    } | null = null;

    const handleDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();

      dragInfo = {
        startPointerX: e.clientX,
        startPointerY: e.clientY,
        startRectX: rect.left,
        startRectY: rect.top,
        moved: false,
        currentX: rect.left,
        currentY: rect.top,
      };

      window.addEventListener("pointermove", handleMove, { passive: false });
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
    };

    const handleMove = (e: PointerEvent) => {
      if (!dragInfo) return;
      e.preventDefault();
      e.stopPropagation();

      const dx = e.clientX - dragInfo.startPointerX;
      const dy = e.clientY - dragInfo.startPointerY;

      if (!dragInfo.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        dragInfo.moved = true;
        setDragging(true);
      }

      if (dragInfo.moved) {
        const s = getFabSize();
        const nx = Math.max(0, Math.min(window.innerWidth - s, dragInfo.startRectX + dx));
        const ny = Math.max(0, Math.min(window.innerHeight - s, dragInfo.startRectY + dy));
        dragInfo.currentX = nx;
        dragInfo.currentY = ny;
        applyPosRef.current(nx, ny);
      }
    };

    const handleUp = () => {
      if (!dragInfo) return;

      const info = dragInfo;
      dragInfo = null;

      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);

      setDragging(false);

      if (info.moved) {
        const s = getFabSize();
        const cx = info.currentX + s / 2;
        const cy = info.currentY + s / 2;
        const nc = nearestCorner(cx, cy);
        const tp = getCornerXY(nc);
        setCorner(nc);
        applyPosRef.current(tp.x, tp.y, true);
        // Direct Firestore write — bypasses store syncing indicator
        saveCornerDirectRef.current(nc);
      } else {
        onOpenChatRef.current();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.stopPropagation();
    };

    btn.addEventListener("pointerdown", handleDown);
    btn.addEventListener("touchstart", handleTouchStart, { passive: true });

    return () => {
      btn.removeEventListener("pointerdown", handleDown);
      btn.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, []);

  /* ── Visual style based on financial status ── */
  const status =
    outMonth > inMonth ? "danger" :
    (inMonth > 0 && outMonth > inMonth * 0.8) ? "warning" :
    score >= 70 ? "good" : "neutral";

  const glow = {
    danger: "shadow-rose-500/40",
    warning: "shadow-amber-500/30",
    good: "shadow-emerald-500/30",
    neutral: "shadow-teal-500/25",
  }[status];

  const gradient = {
    danger: "from-rose-400 to-rose-600",
    warning: "from-amber-400 to-orange-500",
    good: "from-emerald-400 to-teal-500",
    neutral: "from-teal-400 to-blue-500",
  }[status];

  const shouldPulse = (status === "danger" || status === "warning") && !dragging;
  const tip = {
    danger: "Overspend bulan ini!",
    warning: "Budget mulai ketat",
    good: "Keuangan sehat!",
    neutral: "Tanya DUIT",
  }[status];

  return (
    <div
      ref={wrapperRef}
      className={`fixed left-0 top-0 z-40 transition-opacity duration-200 ${hidden ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      style={{ touchAction: "none", willChange: "transform" }}
    >
      {!dragging && (
        <div
          className={`absolute ${tooltipCls(corner)} px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap opacity-0 group/fab:opacity-100 pointer-events-none w-fit transition-opacity ${
            isDark
              ? "bg-slate-800 text-slate-200 border border-white/10"
              : "bg-white text-zinc-700 border border-zinc-200 shadow-lg"
          }`}
        >
          {tip}
        </div>
      )}

      <button
        ref={btnRef}
        className={`group/fab fab-btn flex ${desk ? "h-14 w-14" : "h-12 w-12"} items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-zinc-900 shadow-lg ${glow} transition-shadow select-none outline-none ${
          dragging ? "cursor-grabbing fab-dragging" : "cursor-grab"
        } ${shouldPulse ? "fab-pulse" : ""}`}
        style={{ touchAction: "none", WebkitTouchCallout: "none" }}
        aria-label="Buka Chat AI"
      >
        <img
          src="/wallet-logo.svg"
          alt="Chat"
          className="w-9 h-9 md:w-10 md:h-10 object-contain pointer-events-none"
          draggable={false}
        />
      </button>
    </div>
  );
}
