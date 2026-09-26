"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

const RESPONSIVE_QUERY =
  "(max-width: 767px), (max-height: 500px) and (max-width: 932px)";
const REVEAL_DURATION = 2500;
const MEANINGFUL_SCROLL_DISTANCE = 8;
const SCROLL_GESTURE_GAP = 160;

export function useResponsiveAutoHideControls(
  scrollContainerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  const [responsive, setResponsive] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<number | null>(null);
  const responsiveRef = useRef(false);
  const controlsVisibleRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const scrollDistanceRef = useRef(0);
  const lastScrollTimeRef = useRef(0);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  }, []);

  const hideControls = useCallback(() => {
    clearHideTimer();
    controlsVisibleRef.current = false;
    setControlsVisible(false);
  }, [clearHideTimer]);

  const revealTemporarily = useCallback(() => {
    if (!enabled || !responsiveRef.current) return;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    clearHideTimer();
    controlsVisibleRef.current = true;
    setControlsVisible(true);
    hideTimerRef.current = setTimeout(hideControls, REVEAL_DURATION);
  }, [clearHideTimer, enabled, hideControls]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia(RESPONSIVE_QUERY);
    const syncResponsiveState = () => {
      responsiveRef.current = mediaQuery.matches;
      setResponsive(mediaQuery.matches);
      clearHideTimer();
      controlsVisibleRef.current = false;
      setControlsVisible(false);
    };
    syncResponsiveState();
    mediaQuery.addEventListener("change", syncResponsiveState);
    return () => {
      mediaQuery.removeEventListener("change", syncResponsiveState);
      responsiveRef.current = false;
      clearHideTimer();
    };
  }, [clearHideTimer, enabled]);

  useEffect(() => {
    if (!enabled || !responsive) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    lastScrollTopRef.current = container.scrollTop;
    scrollDistanceRef.current = 0;
    lastScrollTimeRef.current = 0;

    const handleScroll = () => {
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        const now = performance.now();
        const scrollTop = container.scrollTop;
        const distance = Math.abs(scrollTop - lastScrollTopRef.current);
        lastScrollTopRef.current = scrollTop;
        if (!distance) return;

        if (now - lastScrollTimeRef.current > SCROLL_GESTURE_GAP) {
          scrollDistanceRef.current = 0;
        }
        lastScrollTimeRef.current = now;
        scrollDistanceRef.current += distance;

        if (
          controlsVisibleRef.current ||
          scrollDistanceRef.current >= MEANINGFUL_SCROLL_DISTANCE
        ) {
          scrollDistanceRef.current = 0;
          revealTemporarily();
        }
      });
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [enabled, responsive, revealTemporarily, scrollContainerRef]);

  useEffect(
    () => () => {
      clearHideTimer();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    [clearHideTimer],
  );

  return { controlsVisible, responsive, revealTemporarily };
}
