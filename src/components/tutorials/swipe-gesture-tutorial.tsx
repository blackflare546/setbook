"use client";

import { useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeftRight, Hand } from "lucide-react";
import { Button } from "@/components/ui/button";

const SWIPE_MIN_DISTANCE = 80;
const SWIPE_HORIZONTAL_BIAS = 1.5;

export function SwipeGestureTutorial({
  open,
  canGoPrevious,
  canGoNext,
  onNavigate,
  onDismiss,
}: {
  open: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onNavigate: (change: -1 | 1) => void;
  onDismiss: () => void;
}) {
  const swipeStart = useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    swipeStart.current = null;
    if (
      !event.isPrimary ||
      (event.pointerType === "mouse" && event.button !== 0) ||
      (event.target instanceof Element && event.target.closest("button"))
    ) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    swipeStart.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || start.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const horizontalDistance = Math.abs(deltaX);
    if (
      horizontalDistance < SWIPE_MIN_DISTANCE ||
      horizontalDistance < Math.abs(deltaY) * SWIPE_HORIZONTAL_BIAS
    ) {
      return;
    }

    if (deltaX < 0 && canGoNext) {
      onNavigate(1);
      window.setTimeout(onDismiss, 0);
    } else if (deltaX > 0 && canGoPrevious) {
      onNavigate(-1);
      window.setTimeout(onDismiss, 0);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onDismiss();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[2px]" />
        <Dialog.Content
          data-swipe-tutorial
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            swipeStart.current = null;
          }}
          className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),24rem)] -translate-x-1/2 -translate-y-1/2 touch-pan-y rounded-2xl border border-white/20 bg-slate-950 p-5 text-center text-white shadow-2xl outline-none sm:p-6"
        >
          <div
            data-swipe-gesture-illustration
            className="relative mx-auto h-32 w-full max-w-[17rem] overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_50%_120%,rgba(99,102,241,0.55),transparent_62%),linear-gradient(145deg,#20262e,#12161b)]"
            aria-hidden="true"
          >
            <ArrowLeftRight
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-200/55"
              size={112}
              strokeWidth={0.75}
            />
            <span className="setbook-swipe-hand absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white text-slate-950 shadow-[0_14px_40px_-12px_rgba(0,0,0,0.8)]">
              <Hand size={34} strokeWidth={1.8} />
            </span>
          </div>

          <Dialog.Title className="mt-5 text-xl font-semibold tracking-[-0.03em]">
            Swipe across the chart
          </Dialog.Title>
          <Dialog.Description className="mx-auto mt-2 max-w-[19rem] text-sm leading-6 text-slate-300">
            Swipe left for the next song. Once you move forward, swipe right to
            return to the previous song.
          </Dialog.Description>
          <p className="mt-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-300">
            Try it on this card
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-5 w-full border-white/20 bg-white text-slate-950 hover:bg-slate-100"
            onClick={onDismiss}
          >
            Got it
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
