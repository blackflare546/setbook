"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { FileUp, QrCode, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QrReader } from "@/components/ui/qr-reader";
import { formatMusicalKey } from "@/core/chords/keys";
import {
  importSongTransfer,
  inspectSongTransfer,
  type SongTransferInspection,
} from "@/lib/song-transfer/import-song-transfer";
import {
  decodeSongTransfer,
  deserializeSongTransferFile,
  type SongTransferV1,
} from "@/lib/song-transfer/song-transfer";

export function SongQrImportDialog({
  onImported,
}: {
  onImported?: (message: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [transfer, setTransfer] = useState<SongTransferV1 | null>(null);
  const [inspection, setInspection] = useState<SongTransferInspection | null>(
    null,
  );
  const [working, setWorking] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const prepare = useCallback(async (next: SongTransferV1) => {
    setFileError(null);
    const nextInspection = await inspectSongTransfer(next);
    setTransfer(next);
    setInspection(nextInspection);
  }, []);

  const readQr = useCallback(
    async (raw: string) => prepare(await decodeSongTransfer(raw)),
    [prepare],
  );

  function reset() {
    setTransfer(null);
    setInspection(null);
    setFileError(null);
  }

  async function readFile(file?: File) {
    if (!file) return;
    try {
      await prepare(deserializeSongTransferFile(await file.text()));
    } catch (error) {
      setFileError(
        error instanceof Error
          ? error.message
          : "That song file could not be read.",
      );
    }
  }

  async function finish(resolution?: "replace" | "keep-both") {
    if (!transfer) return;
    setWorking(true);
    try {
      const result = await importSongTransfer(transfer, resolution);
      if (result.status === "identity-conflict") {
        setInspection(result);
        return;
      }
      setOpen(false);
      reset();
      onImported?.(
        result.status === "exact-existing"
          ? "Song already exists in your library"
          : result.replaced
            ? "Existing song replaced"
            : "Song imported",
      );
    } finally {
      setWorking(false);
    }
  }

  const existing =
    inspection?.status === "exact-existing" ||
    inspection?.status === "identity-conflict"
      ? inspection.existing
      : null;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <Dialog.Trigger asChild>
        <Button type="button">
          <QrCode size={17} /> Scan song QR
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[min(calc(100vw-2rem),34rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl outline-none sm:p-6 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-xl font-semibold tracking-[-0.02em]">
                {transfer ? "Review song import" : "Scan a song QR"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {transfer
                  ? "Confirm how this song should be added to your local library."
                  : "Scan an offline SetBook song QR or import a SetBook song file."}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Close song scanner"
              >
                <X size={18} />
              </Button>
            </Dialog.Close>
          </div>

          {!transfer ? (
            <div className="mt-5">
              <QrReader onRead={readQr} cameraLabel="Song QR camera preview" />
              <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                <label className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-100 focus-within:ring-2 focus-within:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                  <FileUp size={17} /> Import SetBook song file
                  <input
                    className="sr-only"
                    type="file"
                    accept=".setbook-song.json,application/json"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = "";
                      void readFile(file);
                    }}
                  />
                </label>
                {fileError && (
                  <p
                    role="alert"
                    className="mt-3 text-sm text-rose-600 dark:text-rose-300"
                  >
                    {fileError}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <h3 className="break-words text-lg font-semibold">
                  {transfer.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {transfer.artist || "Unknown artist"} ·{" "}
                  {formatMusicalKey(transfer.originalKey)}
                </p>
                <p className="mt-3 line-clamp-4 whitespace-pre-wrap font-mono text-xs leading-5 text-slate-600 dark:text-slate-300">
                  {transfer.chartText}
                </p>
              </div>

              {inspection?.status === "exact-existing" && (
                <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                  This exact song is already in your library. No duplicate will
                  be created.
                </div>
              )}
              {inspection?.status === "identity-conflict" && (
                <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  “{existing?.title}” by {existing?.artist || "Unknown artist"}{" "}
                  already exists with different content.
                </div>
              )}

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={reset}
                  disabled={working}
                >
                  <RotateCcw size={16} /> Scan another
                </Button>
                {inspection?.status === "new" && (
                  <Button
                    type="button"
                    onClick={() => void finish("keep-both")}
                    disabled={working}
                  >
                    {working ? "Importing…" : "Import song"}
                  </Button>
                )}
                {inspection?.status === "exact-existing" && existing && (
                  <>
                    <Dialog.Close asChild>
                      <Button type="button" variant="secondary">
                        Done
                      </Button>
                    </Dialog.Close>
                    <Button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        router.push(`/songs/${existing.id}`);
                      }}
                    >
                      Open existing
                    </Button>
                  </>
                )}
                {inspection?.status === "identity-conflict" && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void finish("keep-both")}
                      disabled={working}
                    >
                      Keep both
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void finish("replace")}
                      disabled={working}
                    >
                      Replace existing
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
