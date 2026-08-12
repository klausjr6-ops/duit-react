import { useCallback, useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]", "button:not([disabled])", "textarea:not([disabled])",
  "input:not([disabled])", "select:not([disabled])", "[tabindex]:not([tabindex='-1'])",
].join(",");

let scrollLockCount = 0;
let originalBodyOverflow = "";
let nextModalId = 1;
const modalStack: number[] = [];

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true"
  );
}

/** Shared keyboard, focus, and scroll behaviour for modal dialogs. */
export function useModalDialog(
  open: boolean,
  onClose: () => void,
  initialFocusRef?: RefObject<HTMLElement | null>
) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const modalIdRef = useRef<number | undefined>(undefined);
  if (modalIdRef.current === undefined) modalIdRef.current = nextModalId++;

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const modalId = modalIdRef.current!;
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modalStack.push(modalId);

    if (scrollLockCount === 0) {
      originalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    scrollLockCount += 1;

    const frame = window.requestAnimationFrame(() => {
      const target = initialFocusRef?.current || dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      target?.focus();
    });
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || modalStack.at(-1) !== modalId) return;
      event.preventDefault();
      onCloseRef.current();
    };
    document.addEventListener("keydown", handleEscape);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleEscape);
      const index = modalStack.lastIndexOf(modalId);
      if (index !== -1) modalStack.splice(index, 1);
      scrollLockCount = Math.max(0, scrollLockCount - 1);
      if (scrollLockCount === 0) document.body.style.overflow = originalBodyOverflow;
      previouslyFocusedRef.current?.focus();
    };
  }, [initialFocusRef, open]);

  const onDialogKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = getFocusableElements(dialogRef.current);
    if (focusable.length === 0) { event.preventDefault(); return; }
    const first = focusable[0]; const last = focusable[focusable.length - 1];
    const activeElement = document.activeElement;
    if (event.shiftKey) {
      if (activeElement === first || !dialogRef.current.contains(activeElement)) { event.preventDefault(); last.focus(); }
    } else if (activeElement === last || !dialogRef.current.contains(activeElement)) {
      event.preventDefault(); first.focus();
    }
  }, []);

  return { dialogRef, onDialogKeyDown };
}
