"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Check,
  Copy,
  ExternalLink,
  Mail,
  MessageCircle,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const SHARE_TEXT = "Check out this setlist";
const COPY_STATUS_DURATION = 1800;

export function createPublicShareLinks(title: string, url: string) {
  const message = `${SHARE_TEXT}\n${url}`;
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    messenger: `fb-messenger://share/?link=${encodeURIComponent(url)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(message)}`,
  };
}

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Continue to the browser's legacy copy fallback.
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand?.("copy") ?? false;
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

function openShareTarget(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function PublicSetlistShare({ title }: { title: string }) {
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"copied" | "failed" | null>(
    null,
  );
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (statusTimer.current) clearTimeout(statusTimer.current);
    },
    [],
  );

  function clearCopyStatusLater(closeMenu: boolean) {
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => {
      setCopyStatus(null);
      if (closeMenu) setFallbackOpen(false);
    }, COPY_STATUS_DURATION);
  }

  async function shareNatively() {
    try {
      await navigator.share({
        title,
        text: SHARE_TEXT,
        url: window.location.href,
      });
    } catch {
      // Closing or declining the native share sheet needs no error UI.
    }
  }

  function handleShareClick(event: MouseEvent<HTMLButtonElement>) {
    if (typeof navigator.share === "function") {
      event.preventDefault();
      void shareNatively();
      return;
    }
    setCopyStatus(null);
    setFallbackOpen(true);
  }

  async function copyPublicLink() {
    const copied = await copyText(window.location.href);
    setCopyStatus(copied ? "copied" : "failed");
    clearCopyStatusLater(copied);
  }

  const itemClass =
    "flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm font-semibold outline-none hover:bg-slate-100 focus:bg-slate-100 dark:hover:bg-slate-800 dark:focus:bg-slate-800";

  return (
    <DropdownMenu.Root open={fallbackOpen} onOpenChange={setFallbackOpen}>
      <DropdownMenu.Trigger asChild>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-11 shrink-0"
          aria-label="Share public setlist"
          onClick={handleShareClick}
        >
          <Share2 size={17} />
          Share
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-52 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-950 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <DropdownMenu.Item
            className={itemClass}
            onSelect={(event) => {
              event.preventDefault();
              void copyPublicLink();
            }}
          >
            {copyStatus === "copied" ? <Check size={17} /> : <Copy size={17} />}
            {copyStatus === "copied" ? "Link copied" : "Copy Link"}
          </DropdownMenu.Item>
          {copyStatus === "failed" && (
            <p
              role="status"
              className="px-3 pb-2 text-xs text-rose-600 dark:text-rose-400"
            >
              Unable to copy link
            </p>
          )}
          <DropdownMenu.Separator className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
          {(
            [
              ["Facebook", "facebook", ExternalLink],
              ["Messenger", "messenger", MessageCircle],
              ["WhatsApp", "whatsapp", MessageCircle],
              ["Email", "email", Mail],
            ] as const
          ).map(([label, target, Icon]) => (
            <DropdownMenu.Item
              key={target}
              className={itemClass}
              onSelect={() =>
                openShareTarget(
                  createPublicShareLinks(title, window.location.href)[target],
                )
              }
            >
              <Icon size={17} />
              {label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
