"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Link2, QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrReader } from "@/components/ui/qr-reader";
import { publicTokenFromSharedLink } from "@/lib/sharing/shared-link";

export function QrScannerDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);

  const openToken = useCallback(
    (rawValue: string) => {
      const token = publicTokenFromSharedLink(rawValue, window.location.origin);
      if (!token) {
        throw new Error("Use a SetBook public link that starts with /s/.");
      }
      setOpen(false);
      setPasteError(null);
      router.push(`/shared/${token}`);
    },
    [router],
  );

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setPasteError(null);
      }}
    >
      <Dialog.Trigger asChild>
        <Button type="button">
          <QrCode size={17} /> Scan QR
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[min(calc(100vw-2rem),32rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl outline-none sm:p-6 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-xl font-semibold tracking-[-0.02em]">
                Scan a setlist QR
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">
                Point the camera at a SetBook public QR code.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Close QR scanner"
              >
                <X size={18} />
              </Button>
            </Dialog.Close>
          </div>

          <div className="mt-5">
            <QrReader onRead={openToken} />
          </div>

          <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                try {
                  openToken(pasteValue);
                } catch (error) {
                  setPasteError(
                    error instanceof Error
                      ? error.message
                      : "That setlist link could not be opened.",
                  );
                }
              }}
            >
              <Input
                aria-label="Paste public setlist link"
                placeholder="Paste public setlist link"
                value={pasteValue}
                onChange={(event) => setPasteValue(event.target.value)}
              />
              <Button
                type="submit"
                variant="secondary"
                disabled={!pasteValue.trim()}
              >
                <Link2 size={17} /> Open
              </Button>
            </form>
            {pasteError && (
              <p
                role="alert"
                className="text-sm text-rose-600 dark:text-rose-300"
              >
                {pasteError}
              </p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
