"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_BATCH_SIZE = 60;

export function useProgressiveCollection<T>(
  items: readonly T[],
  resetKey: string,
  batchSize = DEFAULT_BATCH_SIZE,
) {
  const [progress, setProgress] = useState({
    resetKey,
    visibleCount: batchSize,
  });
  const sentinelRef = useRef<HTMLDivElement>(null);
  const visibleCount =
    progress.resetKey === resetKey ? progress.visibleCount : batchSize;
  const hasMore = visibleCount < items.length;

  const revealNextBatch = useCallback(
    () =>
      setProgress((current) => ({
        resetKey,
        visibleCount: Math.min(
          items.length,
          (current.resetKey === resetKey ? current.visibleCount : batchSize) +
            batchSize,
        ),
      })),
    [batchSize, items.length, resetKey],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || typeof IntersectionObserver === "undefined")
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          revealNextBatch();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, revealNextBatch]);

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount],
  );

  return {
    visibleItems,
    visibleCount: visibleItems.length,
    totalCount: items.length,
    hasMore,
    sentinelRef,
    showMore: revealNextBatch,
  };
}
