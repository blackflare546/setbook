"use client";

import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Download, FileDown, QrCode, X } from "lucide-react";
import QRCode from "qrcode";
import type { Song } from "@/core/songs/types";
import { Button } from "@/components/ui/button";
import {
  createSongTransfer,
  encodeSongTransfer,
  serializeSongTransferFile,
  songFileName,
} from "@/lib/song-transfer/song-transfer";

export function SongQrExportDialog({
  song,
  children,
  onOpenChange,
}: {
  song: Song;
  children?: ReactNode;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [tooLarge, setTooLarge] = useState(false);
  const [loading, setLoading] = useState(false);
  const generationRef = useRef(0);
  const transfer = useMemo(() => createSongTransfer(song), [song]);

  function generateQr() {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    setLoading(true);
    setTooLarge(false);
    setQrDataUrl(null);
    void encodeSongTransfer(transfer)
      .then((value) =>
        QRCode.toDataURL(value, {
          width: 720,
          margin: 4,
          errorCorrectionLevel: "M",
        }),
      )
      .then((url) => {
        if (generationRef.current === generation) setQrDataUrl(url);
      })
      .catch(() => {
        if (generationRef.current === generation) setTooLarge(true);
      })
      .finally(() => {
        if (generationRef.current === generation) setLoading(false);
      });
  }

  function downloadSongFile() {
    const url = URL.createObjectURL(
      new Blob([serializeSongTransferFile(transfer)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = songFileName(song.title);
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        onOpenChange?.(next);
        if (next) generateQr();
        else generationRef.current += 1;
      }}
    >
      <Dialog.Trigger asChild>
        {children ?? (
          <Button type="button" variant="secondary">
            <QrCode size={16} /> Show QR
          </Button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[min(calc(100vw-2rem),34rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl outline-none sm:p-6 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Dialog.Title className="break-words text-xl font-semibold tracking-[-0.02em]">
                Share {song.title}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Scan from another SetBook device. The complete song is inside
                this QR and is never uploaded.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Close song QR"
              >
                <X size={18} />
              </Button>
            </Dialog.Close>
          </div>

          {loading && (
            <div className="mt-5 grid aspect-square place-items-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-500 dark:bg-slate-950">
              Creating QR…
            </div>
          )}
          {qrDataUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`Song QR code for ${song.title}`}
                className="mx-auto mt-5 w-full max-w-96 rounded-xl bg-white p-2"
              />
              <Button asChild variant="secondary" className="mt-4 w-full">
                <a
                  href={qrDataUrl}
                  download={`${songFileName(song.title).replace(".setbook-song.json", "")}-qr.png`}
                >
                  <Download size={16} /> Download QR image
                </a>
              </Button>
            </>
          )}
          {tooLarge && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <h3 className="font-semibold text-amber-950 dark:text-amber-100">
                This song is too large for one reliable QR
              </h3>
              <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-200">
                Download its private SetBook song file and import that file on
                the other device instead.
              </p>
            </div>
          )}
          {(tooLarge || qrDataUrl) && (
            <Button
              type="button"
              variant={tooLarge ? "primary" : "ghost"}
              className="mt-3 w-full"
              onClick={downloadSongFile}
            >
              <FileDown size={16} /> Download song file
            </Button>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
