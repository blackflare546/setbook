"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import * as Dialog from "@radix-ui/react-dialog";
import {
  CalendarDays,
  CloudDownload,
  Copy,
  ListMusic,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import { setlistRepository } from "@/data/repositories/setlist-repository";
import type { FollowedSharedSetlist, Setlist } from "@/core/setlists/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { deletePublishedSetlistByToken } from "@/lib/sharing/published-client";
import {
  fetchSharedSetlist,
  sharedSetlistRepository,
} from "@/data/repositories/shared-setlist-repository";
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

function sharedStatusLabel(status: FollowedSharedSetlist["status"]): string {
  if (status === "current") return "Up to date";
  if (status === "update-available") return "Update available";
  return status[0].toUpperCase() + status.slice(1);
}

type SetlistCard =
  | { kind: "owned"; sortAt: string; setlist: Setlist }
  | { kind: "shared"; sortAt: string; shared: FollowedSharedSetlist };

export function SetlistList() {
  const router = useRouter();
  const setlistsQuery = useLiveQuery(() => setlistRepository.list(), []);
  const sharedSetlistsQuery = useLiveQuery(
    () => sharedSetlistRepository.list(),
    [],
  );
  const setlists = useMemo(() => setlistsQuery ?? [], [setlistsQuery]);
  const sharedSetlists = useMemo(
    () => sharedSetlistsQuery ?? [],
    [sharedSetlistsQuery],
  );
  const [name, setName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingSetlist, setDeletingSetlist] = useState<Setlist | null>(null);
  const [unfollowing, setUnfollowing] = useState<FollowedSharedSetlist | null>(
    null,
  );
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);

  const cards = useMemo<SetlistCard[]>(
    () =>
      [
        ...setlists.map((setlist): SetlistCard => ({
          kind: "owned",
          sortAt: setlist.updatedAt,
          setlist,
        })),
        ...sharedSetlists.map((shared): SetlistCard => ({
          kind: "shared",
          sortAt: shared.snapshot.publishedAt,
          shared,
        })),
      ].sort((left, right) => right.sortAt.localeCompare(left.sortAt)),
    [setlists, sharedSetlists],
  );

  useEffect(() => {
    if (!feedback || feedback.tone !== "success") return;
    const timeout = window.setTimeout(() => setFeedback(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    const checkAll = () => {
      for (const shared of sharedSetlists)
        void sharedSetlistRepository
          .check(shared.publicToken)
          .catch(() => undefined);
    };
    checkAll();
    window.addEventListener("focus", checkAll);
    return () => window.removeEventListener("focus", checkAll);
    // Checking changes statuses but not the number of followed setlists.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedSetlists.length]);

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
      setDeletingSetlist(null);
    }
  }

  async function updateShared(shared: FollowedSharedSetlist) {
    setFeedback(null);
    try {
      await sharedSetlistRepository.refresh(shared.publicToken);
      setFeedback({
        message: "Shared setlist updated. No songs were imported.",
        tone: "success",
      });
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "Unable to update shared setlist.",
        tone: "error",
      });
    }
  }

  async function confirmUnfollow() {
    if (!unfollowing) return;
    await sharedSetlistRepository.unfollow(unfollowing.publicToken);
    setUnfollowing(null);
    setFeedback({ message: "Shared setlist removed", tone: "success" });
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
          Build your own setlists or open one shared by your team.
        </p>
      </div>

      <Card className="mb-5 flex flex-col gap-3 p-4 sm:flex-row">
        <Input
          placeholder="New setlist name…"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && void create()}
        />
        <Button
          type="button"
          onClick={() => void create()}
          disabled={!name.trim()}
        >
          <Plus size={17} /> Create setlist
        </Button>
        <QrScannerDialog />
      </Card>

      {cards.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            if (card.kind === "owned") {
              const { setlist } = card;
              return (
                <Card
                  key={`owned-${setlist.id}`}
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
                    <span className="grid h-11 w-11 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
                      <ListMusic size={21} />
                    </span>
                    <div className="pointer-events-auto relative z-10 flex opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <Button
                        type="button"
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
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Delete ${setlist.name}`}
                        disabled={deletingId === setlist.id}
                        onClick={() => setDeletingSetlist(setlist)}
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
              );
            }

            const { shared } = card;
            return (
              <Card
                key={`shared-${shared.publicToken}`}
                className="group relative p-5"
              >
                <Link
                  href={`/shared/${shared.publicToken}`}
                  aria-label={`Open shared setlist ${shared.snapshot.name}`}
                  className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
                />
                <div className="pointer-events-none relative mb-4 flex items-start justify-between gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300">
                    <Share2 size={20} />
                  </span>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <span className="rounded-full bg-violet-100 px-2 py-1 text-[11px] font-bold uppercase text-violet-800 dark:bg-violet-950/60 dark:text-violet-200">
                      Shared
                    </span>
                    <span
                      aria-label={`Status: ${sharedStatusLabel(shared.status)}`}
                      className={`rounded-full px-2 py-1 text-[11px] font-bold uppercase ${sharedStatusStyles[shared.status]}`}
                    >
                      {sharedStatusLabel(shared.status)}
                    </span>
                  </div>
                </div>
                <div className="pointer-events-none relative">
                  <h2 className="break-words text-lg font-bold group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                    {shared.snapshot.name}
                  </h2>
                  {shared.snapshot.version === 2 &&
                    shared.snapshot.sharedBy && (
                      <p className="mt-1 text-sm text-slate-500">
                        Shared by {shared.snapshot.sharedBy}
                      </p>
                    )}
                  <p className="mt-2 text-sm text-slate-500">
                    {shared.snapshot.songs.length}{" "}
                    {shared.snapshot.songs.length === 1 ? "song" : "songs"}
                    {shared.snapshot.venue ? ` · ${shared.snapshot.venue}` : ""}
                  </p>
                </div>
                <div className="pointer-events-auto relative z-10 mt-4 flex flex-wrap gap-2">
                  {shared.status === "update-available" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => void updateShared(shared)}
                    >
                      <CloudDownload size={15} /> Update
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-200"
                    onClick={() => setUnfollowing(shared)}
                  >
                    <Trash2 size={15} /> Unfollow
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="grid min-h-72 place-items-center p-8 text-center">
          <div>
            <ListMusic className="mx-auto mb-3 text-indigo-500" size={34} />
            <h2 className="font-bold">No setlists yet</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create a setlist above or scan a shared setlist QR code.
            </p>
          </div>
        </Card>
      )}

      <Dialog.Root
        open={Boolean(unfollowing)}
        onOpenChange={(open) => !open && setUnfollowing(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-2xl outline-none dark:border-slate-800 dark:bg-slate-950">
            <Dialog.Title className="text-lg font-bold">
              Unfollow {unfollowing?.snapshot.name}?
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              This removes the shared setlist from this device. It does not
              delete the owner’s shared setlist or any songs you already
              imported.
            </Dialog.Description>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Dialog.Close asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                type="button"
                variant="danger"
                onClick={() => void confirmUnfollow()}
              >
                <Trash2 size={16} /> Unfollow
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root
        open={Boolean(deletingSetlist)}
        onOpenChange={(open) => {
          if (!open && !deletingId) setDeletingSetlist(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-2xl outline-none dark:border-slate-800 dark:bg-slate-950">
            <Dialog.Title className="text-lg font-bold">
              Delete {deletingSetlist?.name}?
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              This permanently deletes the setlist from this device. Songs in My
              Library remain available.
              {deletingSetlist?.shareBinding && (
                <span className="mt-2 block">
                  Its public share will be deleted first. If that fails, the
                  local setlist will be kept so you can try again.
                </span>
              )}
            </Dialog.Description>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Dialog.Close asChild>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={Boolean(deletingId)}
                >
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                type="button"
                variant="danger"
                disabled={Boolean(deletingId)}
                onClick={() =>
                  deletingSetlist && void deleteSetlist(deletingSetlist)
                }
              >
                <Trash2 size={16} />
                {deletingId ? "Deleting…" : "Delete setlist"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
