"use client";

import type { RefObject } from "react";
import { Button } from "@/components/ui/button";

export function ProgressiveCollectionFooter({
  visibleCount,
  totalCount,
  hasMore,
  sentinelRef,
  onShowMore,
}: {
  visibleCount: number;
  totalCount: number;
  hasMore: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  onShowMore: () => void;
}) {
  if (!totalCount) return null;
  return (
    <div
      ref={sentinelRef}
      className="mt-5 flex flex-col items-center gap-2 text-center"
    >
      <p
        role="status"
        className="text-xs font-medium text-slate-500 dark:text-slate-400"
      >
        Showing {visibleCount} of {totalCount}
      </p>
      {hasMore && (
        <Button type="button" variant="secondary" onClick={onShowMore}>
          Show more
        </Button>
      )}
    </div>
  );
}
