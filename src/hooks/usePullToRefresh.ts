import { useCallback, useRef, useState } from "react";

/**
 * Pull-to-refresh hook for mobile.
 *
 * Detects a downward swipe gesture at the top of the page and triggers
 * an async `onRefresh` callback (e.g. re-subscribing to Firestore).
 *
 * Returns state values for rendering the visual indicator:
 *   - pulling   : user is dragging down but hasn't passed the threshold
 *   - refreshing: the refresh callback is in-flight
 *   - pullDist  : how far the user has pulled (px), capped at maxDist
 */
const THRESHOLD = 70; // px to trigger refresh
const MAX_DIST = 120; // max visual pull distance
const RESISTANCE = 0.4; // dampening factor after threshold

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [pullDist, setPullDist] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const startX = useRef(0);
  const horizontalGesture = useRef(false);
  const pulling = pullDist > 0 && !refreshing;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Only activate when scrolled to the very top
    if (window.scrollY > 0) return;
    startY.current = e.touches[0].clientY;
    startX.current = e.touches[0].clientX;
    horizontalGesture.current = false;
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (refreshing) return;
      if (window.scrollY > 0) {
        setPullDist(0);
        return;
      }
      const dx = e.touches[0].clientX - startX.current;
      const dy = e.touches[0].clientY - startY.current;
      // Horizontal swipes belong to report tables/charts, not refresh.
      if (!horizontalGesture.current && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        horizontalGesture.current = true;
        setPullDist(0);
        return;
      }
      if (horizontalGesture.current || dy <= 0) {
        setPullDist(0);
        return;
      }
      // Apply resistance after threshold for a natural rubber-band feel
      const dist =
        dy <= THRESHOLD
          ? dy
          : THRESHOLD + (dy - THRESHOLD) * RESISTANCE;
      setPullDist(Math.min(dist, MAX_DIST));
    },
    [refreshing],
  );

  const onTouchEnd = useCallback(async () => {
    if (pullDist >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDist(0);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    } else {
      setPullDist(0);
    }
  }, [pullDist, refreshing, onRefresh]);

  return { pulling, refreshing, pullDist, onTouchStart, onTouchMove, onTouchEnd };
}
