"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImageUp, Link2, QrCode, X } from "lucide-react";
import type { IScannerControls } from "@zxing/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicTokenFromSharedLink } from "@/lib/sharing/shared-link";

export function QrScannerDialog() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const finishedRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    if (videoRef.current?.srcObject instanceof MediaStream) {
      for (const track of videoRef.current.srcObject.getTracks()) track.stop();
      videoRef.current.srcObject = null;
    }
  }, []);

  const openToken = useCallback(
    (rawValue: string) => {
      const token = publicTokenFromSharedLink(rawValue, window.location.origin);
      if (!token) {
        setError("Use a SetBook public link that starts with /s/.");
        return false;
      }
      if (finishedRef.current) return true;
      finishedRef.current = true;
      stopCamera();
      setOpen(false);
      router.push(`/shared/${token}`);
      return true;
    },
    [router, stopCamera],
  );

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      finishedRef.current = false;
      setError(null);
      setStarting(true);
      void import("@zxing/browser")
        .then(async ({ BrowserQRCodeReader }) => {
          if (cancelled || !videoRef.current) return;
          const reader = new BrowserQRCodeReader(undefined, {
            delayBetweenScanAttempts: 250,
          });
          const controls = await reader.decodeFromConstraints(
            { video: { facingMode: { ideal: "environment" } }, audio: false },
            videoRef.current,
            (result) => {
              if (result) openToken(result.getText());
            },
          );
          if (cancelled) controls.stop();
          else controlsRef.current = controls;
        })
        .catch(() => {
          if (!cancelled)
            setError(
              "Camera access is unavailable. Upload a QR image or paste the link instead.",
            );
        })
        .finally(() => {
          if (!cancelled) setStarting(false);
        });
    });
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, openToken, stopCamera]);

  async function readImage(file: File | undefined) {
    if (!file) return;
    setError(null);
    const objectUrl = URL.createObjectURL(file);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const result = await new BrowserQRCodeReader().decodeFromImageUrl(
        objectUrl,
      );
      openToken(result.getText());
    } catch {
      setError("No readable SetBook QR code was found in that image.");
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button type="button">
          <QrCode size={17} /> Scan QR
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[min(calc(100vw-2rem),32rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl outline-none sm:p-6 dark:border-slate-800 dark:bg-slate-950">
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

          <div className="relative mt-5 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
            <video
              ref={videoRef}
              className="aspect-square w-full object-cover sm:aspect-video"
              muted
              playsInline
              aria-label="QR camera preview"
            />
            {starting && (
              <div className="absolute inset-0 grid place-items-center text-sm font-semibold text-white">
                <Camera className="mr-2 inline" size={18} /> Starting camera…
              </div>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
            >
              {error}
            </p>
          )}

          <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm hover:border-slate-400 hover:bg-slate-100 focus-within:ring-2 focus-within:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <ImageUp size={17} /> Upload QR image
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                onChange={(event) => void readImage(event.target.files?.[0])}
              />
            </label>
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                openToken(pasteValue);
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
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
