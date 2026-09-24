"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronsUpDown } from "lucide-react";
import { parseMusicalKey, searchMusicalKeys } from "@/core/chords/keys";
import { cn } from "@/lib/utils";

const LIST_GAP = 4;
const LIST_MAX_HEIGHT = 256;
const VIEWPORT_PADDING = 8;

export function KeySelector({
  value,
  onChange,
  ariaLabel,
  className,
}: {
  value?: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState({
    left: 0,
    top: null as number | null,
    bottom: null as number | null,
    width: 0,
    maxHeight: LIST_MAX_HEIGHT,
    side: "bottom" as "top" | "bottom",
  });
  const selected = value ? parseMusicalKey(value) : null;
  const results = searchMusicalKeys(query);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = inputRef.current?.getBoundingClientRect();
      if (rect) {
        const measuredHeight = listRef.current?.scrollHeight ?? 0;
        const desiredHeight = Math.min(
          LIST_MAX_HEIGHT,
          measuredHeight || LIST_MAX_HEIGHT,
        );
        const spaceBelow = Math.max(
          0,
          window.innerHeight - rect.bottom - LIST_GAP - VIEWPORT_PADDING,
        );
        const spaceAbove = Math.max(
          0,
          rect.top - LIST_GAP - VIEWPORT_PADDING,
        );
        const openAbove =
          spaceBelow < desiredHeight && spaceAbove > spaceBelow;
        const availableSpace = openAbove ? spaceAbove : spaceBelow;
        setPosition({
          left: rect.left,
          top: openAbove ? null : rect.bottom + LIST_GAP,
          bottom: openAbove
            ? window.innerHeight - rect.top + LIST_GAP
            : null,
          width: rect.width,
          maxHeight: Math.min(LIST_MAX_HEIGHT, availableSpace),
          side: openAbove ? "top" : "bottom",
        });
      }
    };
    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !inputRef.current?.parentElement?.contains(target) &&
        !listRef.current?.contains(target)
      ) {
        setOpen(false);
        setQuery("");
      }
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", closeOnOutsidePress);
    };
  }, [open]);

  function selectKey(nextValue: string) {
    onChange(nextValue);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        role="combobox"
        type="search"
        autoComplete="off"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        aria-activedescendant={
          open && results[activeIndex]
            ? `${listId}-option-${activeIndex}`
            : undefined
        }
        className="h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 pr-10 text-base font-medium normal-case text-slate-950 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-indigo-950 sm:h-10 sm:text-sm"
        placeholder="Search key..."
        value={open ? query : selected ? selected.label : ""}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setQuery("");
          }
          if (event.key === "ArrowDown" && open && results.length > 0) {
            event.preventDefault();
            setActiveIndex((index) => Math.min(results.length - 1, index + 1));
          }
          if (event.key === "ArrowUp" && open && results.length > 0) {
            event.preventDefault();
            setActiveIndex((index) => Math.max(0, index - 1));
          }
          if (event.key === "Enter" && open && results[activeIndex]) {
            event.preventDefault();
            selectKey(results[activeIndex].value);
          }
        }}
      />
      <ChevronsUpDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        size={16}
      />
      {open &&
        createPortal(
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={`${ariaLabel} options`}
            data-side={position.side}
            className="fixed z-[100] overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-950"
            style={{
              left: position.left,
              top: position.top ?? undefined,
              bottom: position.bottom ?? undefined,
              width: position.width,
              maxHeight: position.maxHeight,
            }}
          >
            {!query && (
              <button
                type="button"
                role="option"
                aria-selected={!value}
                className="flex min-h-11 w-full items-center justify-between rounded-md px-3 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => selectKey("")}
              >
                Not set
                {!value && <Check size={16} />}
              </button>
            )}
            {results.map((key, index) => (
              <button
                key={key.value}
                id={`${listId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={key.value === value}
                className={cn(
                  "flex min-h-11 w-full items-center justify-between rounded-md px-3 text-left text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800",
                  activeIndex === index && "bg-slate-100 dark:bg-slate-800",
                )}
                onPointerMove={() => setActiveIndex(index)}
                onClick={() => selectKey(key.value)}
              >
                {key.label}
                {key.value === value && <Check size={16} />}
              </button>
            ))}
            {results.length === 0 && (
              <p className="px-3 py-3 text-sm text-slate-500">
                No matching key
              </p>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
