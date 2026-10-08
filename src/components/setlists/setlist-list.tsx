"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  CalendarDays,
  Copy,
  ExternalLink,
  ListMusic,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { setlistRepository } from "@/data/repositories/setlist-repository";
import type { Setlist } from "@/core/setlists/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { deletePublishedSetlistByToken } from "@/lib/sharing/published-client";
import { sharedSetlistRepository } from "@/data/repositories/shared-setlist-repository";
import { fetchSharedSetlist } from "@/data/repositories/shared-setlist-repository";
import { QrScannerDialog } from "@/components/setlists/qr-scanner-dialog";

const sharedStatusStyles = {
  current:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
  "update-available":
    "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
  offline: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200",
  unavailable:
    "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200",
} as const;

export function SetlistList() {
  const router = useRouter();
  const setlists = useLiveQuery(() => setlistRepository.list(), []) ?? [];
  const sharedSetlists =
    useLiveQuery(() => sharedSetlistRepository.list(), []) ?? [];
  const [tab, setTab] = useState<"mine" | "shared">("mine");
  const [name, setName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  useEffect(() => {
    if (!feedback || feedback.tone !== "success") return;
    const timeout = window.setTimeout(() => setFeedback(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [feedback]);
  useEffect(() => {
    if (tab !== "shared") return;
    const checkAll = () => {
      for (const shared of sharedSetlists)
        void sharedSetlistRepository
          .check(shared.publicToken)
          .catch(() => undefined);
    };
    checkAll();
    window.addEventListener("focus", checkAll);
    return () => window.removeEventListener("focus", checkAll);
    // Checking writes status timestamps, so depending on the live array would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedSetlists.length, tab]);
  async function create() {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    const setlist: Setlist = {
      id: crypto.randomUUID(),
      name: name.trim(),
      venue: "",
      notes: "",
      entries: [],
      createdAt: now,
      updatedAt: now,
    };
    await setlistRepository.save(setlist);
    setName("");
    router.push(`/setlists/${setlist.id}`);
  }
  async function deleteSetlist(setlist: Setlist) {
    if (!confirm(`Delete “${setlist.name}”?`)) return;
    setDeletingId(setlist.id);
    setFeedback(null);
    try {
      if (setlist.shareBinding) {
        const latest = await fetchSharedSetlist(
          setlist.shareBinding.publicToken,
        );
        await deletePublishedSetlistByToken(
          setlist.shareBinding.publicToken,
          setlist.shareBinding.ownerCapability,
          latest.etag,
        );
      }
      await setlistRepository.delete(setlist.id);
      setFeedback({ message: "Setlist deleted", tone: "success" });
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "Setlist could not be deleted. Please try again.",
        tone: "error",
      });
    } finally {
      setDeletingId(null);
    }
  }
  return (
    <div className="mx-auto max-w-6xl px-3 py-6 pb-24 min-[375px]:px-4 sm:px-6 sm:py-8 lg:py-10">
      <FeedbackToast
        message={feedback?.message ?? null}
        tone={feedback?.tone}
      />
      <div className="mb-7">
        <p className="mb-1 text-sm font-semibold text-indigo-600">
          Plan the show
        </p>
        <h1 className="text-2xl font-bold tracking-tight min-[375px]:text-3xl">
          Setlists
        </h1>
        <p className="mt-1 text-slate-500">
          Build a running order, choose performance keys, and add cues.
        </p>
      </div>
      <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
        <button
          type="button"
          className={`min-h-11 rounded-lg px-4 text-sm font-bold ${tab === "mine" ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-indigo-300" : "text-slate-500"}`}
          onClick={() => setTab("mine")}
        >
          My Setlists
        </button>
        <button
          type="button"
          className={`min-h-11 rounded-lg px-4 text-sm font-bold ${tab === "shared" ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-indigo-300" : "text-slate-500"}`}
          onClick={() => setTab("shared")}
        >
          Shared with me
        </button>
      </div>
      {tab === "shared" ? (
        <>
          <div className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950">
            <div>
              <h2 className="font-bold">Open a shared setlist</h2>
              <p className="mt-1 text-sm text-slate-500">
                Scan its QR code, upload a QR image, or paste its public link.
              </p>
            </div>
            <QrScannerDialog />
          </div>
          {sharedSetlists.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sharedSetlists.map((shared) => (
                <Card key={shared.publicToken} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words text-lg font-bold">
                        {shared.snapshot.name}
                      </h2>
                      {shared.snapshot.version === 2 &&
                        shared.snapshot.sharedBy && (
                          <p className="text-sm text-slate-500">
                            Shared by {shared.snapshot.sharedBy}
                          </p>
                        )}
                    </div>
                    <span
                      aria-label={`Status: ${shared.status === "current" ? "Up to date" : shared.status.replace("-", " ")}`}
                      className={`rounded-full px-2 py-1 text-[11px] font-bold uppercase ${sharedStatusStyles[shared.status]}`}
                    >
                      {shared.status === "current"
                        ? "Up to date"
                        : shared.status.replace("-", " ")}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">
                    Revision {shared.revision} · {shared.snapshot.songs.length}{" "}
                    songs
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link href={`/shared/${shared.publicToken}`}>
                        <ExternalLink size={15} /> Open
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setFeedback(null);
                        void sharedSetlistRepository
                          .refresh(shared.publicToken)
                          .then(() =>
                            setFeedback({
                              message:
                                "Shared setlist refreshed. No songs were imported.",
                              tone: "success",
                            }),
                          )
                          .catch((error) =>
                            setFeedback({
                              message:
                                error instanceof Error
                                  ? error.message
                                  : "Unable to refresh shared setlist.",
                              tone: "error",
                            }),
                          );
                      }}
                    >
                      <RefreshCw size={15} /> Refresh
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void sharedSetlistRepository.unfollow(
                          shared.publicToken,
                        )
                      }
                    >
                      Unfollow
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="grid min-h-72 place-items-center p-8 text-center">
              <div>
                <ListMusic className="mx-auto mb-3 text-indigo-500" size={34} />
                <h2 className="font-bold">No shared setlists yet</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Scan a QR code above, or open a public setlist and choose Open
                  in SetBook.
                </p>
              </div>
            </Card>
          )}
        </>
      ) : (
        <>
          <Card className="mb-5 flex flex-col gap-3 p-4 sm:flex-row">
            <Input
              placeholder="New setlist name…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void create()}
            />
            <Button onClick={() => void create()} disabled={!name.trim()}>
              <Plus size={17} />
              Create setlist
            </Button>
          </Card>
          {setlists.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {setlists.map((setlist) => (
                <Card
                  key={setlist.id}
                  data-testid={`setlist-card-${setlist.id}`}
                  className="group relative p-5"
                >
                  <Link
                    href={`/setlists/${setlist.id}`}
                    aria-label={`Open ${setlist.name}`}
                    className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
                    onKeyDown={(event) => {
                      if (event.key === " ") {
                        event.preventDefault();
                        event.currentTarget.click();
                      }
                    }}
                  />
                  <div className="pointer-events-none relative mb-5 flex items-start justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                      <ListMusic size={21} />
                    </span>
                    <div className="pointer-events-auto relative z-10 flex opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Duplicate ${setlist.name}`}
                        onClick={() =>
                          void setlistRepository.duplicate(setlist.id)
                        }
                      >
                        <Copy size={16} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Delete ${setlist.name}`}
                        disabled={deletingId === setlist.id}
                        onClick={() => void deleteSetlist(setlist)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                  <div className="pointer-events-none relative">
                    <h2 className="break-words text-lg font-bold group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                      {setlist.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {setlist.entries.length}{" "}
                      {setlist.entries.length === 1 ? "song" : "songs"}
                      {setlist.venue ? ` · ${setlist.venue}` : ""}
                    </p>
                    {setlist.date && (
                      <p className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500">
                        <CalendarDays size={14} />
                        {new Date(
                          `${setlist.date}T00:00:00`,
                        ).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="grid min-h-72 place-items-center p-8 text-center">
              <div>
                <ListMusic className="mx-auto mb-3 text-indigo-500" size={34} />
                <h2 className="font-bold">No setlists yet</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Name your next show above to get started.
                </p>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
