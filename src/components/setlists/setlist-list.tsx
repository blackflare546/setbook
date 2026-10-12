"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowDownAZ,
  CalendarDays,
  CloudDownload,
  Copy,
  ListMusic,
  Plus,
  Search,
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
import { sharedSetlistRepository } from "@/data/repositories/shared-setlist-repository";
import { QrScannerDialog } from "@/components/setlists/qr-scanner-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { useProgressiveCollection } from "@/lib/hooks/use-progressive-collection";
import { ProgressiveCollectionFooter } from "@/components/ui/progressive-collection-footer";
import { ScrollToTopButton } from "@/components/ui/scroll-to-top-button";
import { AreaTutorial } from "@/components/tutorials/area-tutorial";
import { LoadingState } from "@/components/ui/loading-state";

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
  | {
      kind: "owned";
      name: string;
      searchText: string;
      sortAt: string;
      setlist: Setlist;
    }
  | {
      kind: "shared";
      name: string;
      searchText: string;
      sortAt: string;
      shared: FollowedSharedSetlist;
    };

const OwnedSetlistCard = memo(function OwnedSetlistCard({
  setlist,
  deleting,
  duplicating,
  onDelete,
  onDuplicate,
}: {
  setlist: Setlist;
  deleting: boolean;
  duplicating: boolean;
  onDelete: (setlist: Setlist) => void;
  onDuplicate: (setlist: Setlist) => void;
}) {
  return (
    <Card
      data-testid={`setlist-card-${setlist.id}`}
      className="group relative p-4 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_50px_-38px_rgba(0,0,0,0.55)] dark:hover:border-slate-700"
    >
      <Link
        href={`/setlists/${setlist.id}`}
        aria-label={`Open ${setlist.name}`}
        className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
        onKeyDown={(event) => {
          if (event.key === " ") {
            event.preventDefault();
            event.currentTarget.click();
          }
        }}
      />
      <div className="pointer-events-none relative mb-3 flex items-start justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
          <ListMusic size={20} aria-hidden="true" />
        </span>
        <div
          className="pointer-events-auto relative z-10 flex"
          data-testid={`setlist-actions-${setlist.id}`}
        >
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-11 w-11 sm:h-9 sm:w-9"
            aria-label={`Duplicate ${setlist.name}`}
            isLoading={duplicating}
            loadingLabel={`Duplicating ${setlist.name}…`}
            onClick={() => onDuplicate(setlist)}
          >
            <Copy size={16} aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-11 w-11 text-rose-600 hover:bg-rose-50 hover:text-rose-700 sm:h-9 sm:w-9 dark:text-rose-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
            aria-label={`Delete ${setlist.name}`}
            disabled={deleting}
            onClick={() => onDelete(setlist)}
          >
            <Trash2 size={16} aria-hidden="true" />
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
          <p className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-500">
            <CalendarDays size={14} aria-hidden="true" />
            {new Date(`${setlist.date}T00:00:00`).toLocaleDateString()}
          </p>
        )}
      </div>
    </Card>
  );
});

const SharedSetlistCard = memo(function SharedSetlistCard({
  shared,
  updating,
  updateBlocked,
  onUpdate,
  onUnfollow,
}: {
  shared: FollowedSharedSetlist;
  updating: boolean;
  updateBlocked: boolean;
  onUpdate: (shared: FollowedSharedSetlist) => void;
  onUnfollow: (shared: FollowedSharedSetlist) => void;
}) {
  return (
    <Card className="group relative min-h-48 p-5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_50px_-38px_rgba(0,0,0,0.55)] dark:hover:border-slate-700">
      <Link
        href={`/shared/${shared.publicToken}`}
        aria-label={`Open shared setlist ${shared.snapshot.name}`}
        className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
      />
      <div className="pointer-events-none relative mb-3 flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300">
          <Share2 size={20} aria-hidden="true" />
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
        {shared.snapshot.version === 2 && shared.snapshot.sharedBy && (
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
      <div className="pointer-events-auto relative z-10 mt-3 flex flex-wrap gap-2">
        {shared.status === "update-available" && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            isLoading={updating}
            loadingLabel="Updating…"
            disabled={updateBlocked}
            onClick={() => onUpdate(shared)}
          >
            <CloudDownload size={15} aria-hidden="true" /> Update
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-200"
          onClick={() => onUnfollow(shared)}
        >
          <Trash2 size={15} aria-hidden="true" /> Unfollow
        </Button>
      </div>
    </Card>
  );
});

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
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"updated" | "name">("updated");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [updatingToken, setUpdatingToken] = useState<string | null>(null);
  const [unfollowingBusy, setUnfollowingBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingSetlist, setDeletingSetlist] = useState<Setlist | null>(null);
  const [unfollowing, setUnfollowing] = useState<FollowedSharedSetlist | null>(
    null,
  );
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const duplicateInFlightRef = useRef(false);
  const updateInFlightRef = useRef(false);
  const checkingTokensRef = useRef(new Set<string>());

  const indexedCards = useMemo<SetlistCard[]>(
    () => [
      ...setlists.map((setlist): SetlistCard => ({
        kind: "owned",
        name: setlist.name,
        searchText: `${setlist.name} ${setlist.venue}`.toLocaleLowerCase(),
        sortAt: setlist.updatedAt,
        setlist,
      })),
      ...sharedSetlists.map((shared): SetlistCard => {
        const sharedBy =
          shared.snapshot.version === 2 ? (shared.snapshot.sharedBy ?? "") : "";
        return {
          kind: "shared",
          name: shared.snapshot.name,
          searchText:
            `${shared.snapshot.name} ${shared.snapshot.venue} ${sharedBy}`.toLocaleLowerCase(),
          sortAt: shared.snapshot.publishedAt,
          shared,
        };
      }),
    ],
    [setlists, sharedSetlists],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const cards = useMemo<SetlistCard[]>(() => {
    const found = normalizedQuery
      ? indexedCards.filter(({ searchText }) =>
          searchText.includes(normalizedQuery),
        )
      : indexedCards;
    return found.toSorted((left, right) => {
      if (sort === "updated") return right.sortAt.localeCompare(left.sortAt);
      return left.name.localeCompare(right.name);
    });
  }, [indexedCards, normalizedQuery, sort]);
  const progressive = useProgressiveCollection(
    cards,
    `${normalizedQuery}\u0000${sort}`,
  );
  const sharedTokensKey = sharedSetlists
    .map(({ publicToken }) => publicToken)
    .toSorted()
    .join("\u0000");

  useEffect(() => {
    if (!feedback || feedback.tone !== "success") return;
    const timeout = window.setTimeout(() => setFeedback(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    const tokens = sharedTokensKey ? sharedTokensKey.split("\u0000") : [];
    const checkAll = () => {
      for (const token of tokens) {
        if (checkingTokensRef.current.has(token)) continue;
        checkingTokensRef.current.add(token);
        void sharedSetlistRepository
          .check(token)
          .catch(() => undefined)
          .finally(() => checkingTokensRef.current.delete(token));
      }
    };
    checkAll();
    window.addEventListener("focus", checkAll);
    return () => window.removeEventListener("focus", checkAll);
  }, [sharedTokensKey]);

  async function create() {
    if (!name.trim() || creating) return;
    setCreating(true);
    setFeedback(null);
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
    try {
      await setlistRepository.save(setlist);
      setName("");
      router.push(`/setlists/${setlist.id}`);
    } catch {
      setFeedback({
        message: "Setlist could not be created. Please try again.",
        tone: "error",
      });
      setCreating(false);
    }
  }

  async function deleteSetlist(setlist: Setlist) {
    setDeletingId(setlist.id);
    setFeedback(null);
    try {
      if (setlist.shareBinding) {
        await deletePublishedSetlistByToken(
          setlist.shareBinding.publicToken,
          setlist.shareBinding.ownerCapability,
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

  const duplicateSetlist = useCallback(async (setlist: Setlist) => {
    if (duplicateInFlightRef.current) return;

    duplicateInFlightRef.current = true;
    setDuplicatingId(setlist.id);
    setFeedback(null);
    try {
      const duplicate = await setlistRepository.duplicate(setlist.id);
      if (!duplicate) throw new Error("Setlist not found");
      setFeedback({
        message: `“${setlist.name}” duplicated`,
        tone: "success",
      });
    } catch {
      setFeedback({
        message: "Setlist could not be duplicated. Please try again.",
        tone: "error",
      });
    } finally {
      duplicateInFlightRef.current = false;
      setDuplicatingId(null);
    }
  }, []);

  const updateShared = useCallback(async (shared: FollowedSharedSetlist) => {
    if (updateInFlightRef.current) return;

    updateInFlightRef.current = true;
    setUpdatingToken(shared.publicToken);
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
    } finally {
      updateInFlightRef.current = false;
      setUpdatingToken(null);
    }
  }, []);

  async function confirmUnfollow() {
    if (!unfollowing || unfollowingBusy) return;
    setUnfollowingBusy(true);
    setFeedback(null);
    try {
      await sharedSetlistRepository.unfollow(unfollowing.publicToken);
      setUnfollowing(null);
      setFeedback({ message: "Shared setlist removed", tone: "success" });
    } catch {
      setFeedback({
        message: "Shared setlist could not be removed. Please try again.",
        tone: "error",
      });
    } finally {
      setUnfollowingBusy(false);
    }
  }

  if (setlistsQuery === undefined || sharedSetlistsQuery === undefined) {
    return <LoadingState label="Loading setlists…" className="min-h-[60dvh]" />;
  }

  return (
    <div className="mx-auto max-w-[1440px] px-3 py-7 pb-24 min-[375px]:px-4 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <AreaTutorial
        id="setlists"
        ready={setlistsQuery !== undefined && sharedSetlistsQuery !== undefined}
      />
      <FeedbackToast
        message={feedback?.message ?? null}
        tone={feedback?.tone}
      />
      <div data-tour="setlists-header">
        <PageHeader
          eyebrow="Plan the show"
          title="Setlists"
          description="Build your own setlists or open one shared by your team."
        />
      </div>

      <Card
        data-tour="setlists-create"
        className="mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:p-5"
      >
        <Input
          aria-label="New setlist name"
          placeholder="New setlist name…"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && void create()}
        />
        <Button
          type="button"
          onClick={() => void create()}
          disabled={!name.trim()}
          isLoading={creating}
          loadingLabel="Creating…"
        >
          <Plus size={17} aria-hidden="true" /> Create setlist
        </Button>
        <QrScannerDialog />
      </Card>

      <Card
        data-tour="setlists-search"
        className="mb-6 flex flex-col gap-3 p-3 sm:flex-row sm:p-4"
      >
        <label className="relative flex-1">
          <Search
            className="absolute left-3 top-2.5 text-slate-400"
            size={18}
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Search setlists"
            className="pl-10"
            placeholder="Search setlists, venue, or owner…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <Button
          type="button"
          variant="secondary"
          aria-label={
            sort === "updated"
              ? "Sort setlists by name"
              : "Sort setlists by most recent"
          }
          onClick={() => setSort(sort === "updated" ? "name" : "updated")}
        >
          <ArrowDownAZ size={17} aria-hidden="true" />
          {sort === "updated" ? "Recent first" : "Name A–Z"}
        </Button>
      </Card>

      <div data-tour="setlists-collection">
        {cards.length ? (
          <div className="grid grid-flow-dense gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {progressive.visibleItems.map((card) => {
              if (card.kind === "owned") {
                return (
                  <OwnedSetlistCard
                    key={`owned-${card.setlist.id}`}
                    setlist={card.setlist}
                    deleting={deletingId === card.setlist.id}
                    duplicating={duplicatingId === card.setlist.id}
                    onDelete={setDeletingSetlist}
                    onDuplicate={duplicateSetlist}
                  />
                );
              }

              return (
                <SharedSetlistCard
                  key={`shared-${card.shared.publicToken}`}
                  shared={card.shared}
                  updating={updatingToken === card.shared.publicToken}
                  updateBlocked={Boolean(updatingToken)}
                  onUpdate={updateShared}
                  onUnfollow={setUnfollowing}
                />
              );
            })}
          </div>
        ) : (
          <Card className="grid min-h-72 place-items-center p-8 text-center">
            <div>
              <ListMusic
                className="mx-auto mb-3 text-indigo-500"
                size={34}
                aria-hidden="true"
              />
              <h2 className="font-bold">
                {normalizedQuery ? "No setlists found" : "No setlists yet"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {normalizedQuery
                  ? "Try a different name, venue, or owner."
                  : "Create a setlist above or scan a shared setlist QR code."}
              </p>
            </div>
          </Card>
        )}
      </div>
      <ProgressiveCollectionFooter
        visibleCount={progressive.visibleCount}
        totalCount={progressive.totalCount}
        hasMore={progressive.hasMore}
        sentinelRef={progressive.sentinelRef}
        onShowMore={progressive.showMore}
      />
      <ScrollToTopButton />

      <Dialog.Root
        open={Boolean(unfollowing)}
        onOpenChange={(open) =>
          !open && !unfollowingBusy && setUnfollowing(null)
        }
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-900">
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
                <Button
                  type="button"
                  variant="secondary"
                  disabled={unfollowingBusy}
                >
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                type="button"
                variant="danger"
                isLoading={unfollowingBusy}
                loadingLabel="Removing…"
                onClick={() => void confirmUnfollow()}
              >
                <Trash2 size={16} aria-hidden="true" /> Unfollow
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
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-900">
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
                isLoading={Boolean(deletingId)}
                loadingLabel="Deleting…"
                onClick={() =>
                  deletingSetlist && void deleteSetlist(deletingSetlist)
                }
              >
                <Trash2 size={16} aria-hidden="true" />
                Delete setlist
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
