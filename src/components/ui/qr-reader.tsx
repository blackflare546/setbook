"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImageUp } from "lucide-react";
import type { IScannerControls } from "@zxing/browser";

export function QrReader({
  onRead,
  cameraLabel = "QR camera preview",
}: {
  onRead: (value: string) => void | Promise<void>;
  cameraLabel?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const acceptingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    if (videoRef.current?.srcObject instanceof MediaStream) {
      for (const track of videoRef.current.srcObject.getTracks()) track.stop();
      videoRef.current.srcObject = null;
    }
  }, []);

  const accept = useCallback(
    async (value: string) => {
      if (acceptingRef.current) return;
      acceptingRef.current = true;
      setError(null);
      try {
        await onRead(value);
        stopCamera();
      } catch (readError) {
        acceptingRef.current = false;
        setError(
          readError instanceof Error
            ? readError.message
            : "That QR code could not be read.",
        );
      }
    },
    [onRead, stopCamera],
  );

  useEffect(() => {
    let cancelled = false;
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
            if (result) void accept(result.getText());
          },
        );
        if (cancelled) controls.stop();
        else controlsRef.current = controls;
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            (current) =>
              current ??
              "Camera access is unavailable. Upload a QR image instead.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setStarting(false);
      });
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [accept, stopCamera]);

  async function readImage(file?: File) {
    if (!file) return;
    setError(null);
    acceptingRef.current = false;
    let bitmap: ImageBitmap | null = null;
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Image canvas is unavailable");
      context.drawImage(bitmap, 0, 0);
      const result = new BrowserQRCodeReader().decodeFromCanvas(canvas);
      await accept(result.getText());
    } catch (readError) {
      setError(
        readError instanceof Error && readError.message.startsWith("This ")
          ? readError.message
          : "No readable SetBook QR code was found in that image.",
      );
    } finally {
      bitmap?.close();
    }
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
        <video
          ref={videoRef}
          className="aspect-square w-full object-cover sm:aspect-video"
          muted
          playsInline
          aria-label={cameraLabel}
        />
        {starting && (
          <div className="absolute inset-0 grid place-items-center text-sm font-semibold text-white">
            <span className="inline-flex items-center gap-2">
              <Camera size={18} /> Starting camera…
            </span>
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
      <label className="mt-4 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm hover:border-slate-400 hover:bg-slate-100 focus-within:ring-2 focus-within:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
        <ImageUp size={17} /> Upload QR image
        <input
          className="sr-only"
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            void readImage(file);
          }}
        />
      </label>
    </>
  );
}
