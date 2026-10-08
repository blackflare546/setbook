"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowDown,
  ArrowUp,
  Download,
  ExternalLink,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import type {
  PublishedSnapshot,
  PublishedSnapshotV2,
} from "@/lib/validation/schemas";
import type { FollowedSharedSetlist } from "@/core/setlists/types";
import { songRepository } from "@/data/repositories/song-repository";
import {
  fetchSharedSetlist,
  sharedSetlistRepository,
} from "@/data/repositories/shared-setlist-repository";
import {
  findImportedSong,
  importSharedSong,
} from "@/lib/sharing/import-song";
import { sharedSongContentHash } from "@/lib/sharing/snapshot";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { FeedbackToast } from "@/components/ui/feedback-toast";

type Role = FollowedSharedSetlist["role"];

export function SharedSetlistView({ token }: { token: string }) {
  const followed = useLiveQuery(() => sharedSetlistRepository.get(token), [token]);
  const libraryQuery = useLiveQuery(() => songRepository.list(), []);
  const library = useMemo(() => libraryQuery ?? [], [libraryQuery]);
  const [draft, setDraft] = useState<PublishedSnapshot | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);

  const load = useCallback(
    async (role?: Role, capability?: string) => {
      setBusy(true);
      try {
        const remote = await fetchSharedSetlist(token);
        const saved = await sharedSetlistRepository.follow(
          token,
          remote,
          role ?? followed?.role ?? "viewer",
          capability ?? followed?.capability,
        );
        if (!dirty) setDraft(saved.snapshot);
      } catch (error) {
        setFeedback({
          message:
            error instanceof Error ? error.message : "Unable to open shared setlist.",
          tone: "error",
        });
        if (!draft && followed) setDraft(followed.snapshot);
      } finally {
        setBusy(false);
      }
    },
    [dirty, draft, followed, token],
  );

  useEffect(() => {
    const captureCapability = () => {
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const owner = fragment.get("owner");
      const editor = fragment.get("editor");
      const capability = owner ?? editor ?? undefined;
      const role: Role | undefined = owner
        ? "owner"
        : editor
          ? "editor"
          : undefined;
      if (capability) history.replaceState(null, "", window.location.pathname);
      queueMicrotask(() => void load(role, capability));
    };
    captureCapability();
    window.addEventListener("hashchange", captureCapability);
    return () => window.removeEventListener("hashchange", captureCapability);
    // The initial capability must be captured exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const onFocus = () => {
      if (!dirty) void load();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [dirty, load]);

  const canEdit =
    draft?.version === 2 &&
    Boolean(followed?.capability) &&
    (followed?.role === "owner" ||
      (followed?.role === "editor" && followed.accessMode === "editable"));

  const importedSongs = useMemo(
    () =>
      new Map(
        library
          .filter((song) => song.sharedSource?.publicToken === token)
          .map((song) => [song.sharedSource!.sharedSongId, song] as const),
      ),
    [library, token],
  );

  function updateDraft(next: PublishedSnapshot) {
    setDraft(next);
    setDirty(true);
  }

  async function save() {
    if (!draft || draft.version !== 2 || !followed?.capability) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/published-setlists/${token}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${followed.capability}`,
        },
        body: JSON.stringify({
          snapshot: draft,
          expectedRevision: followed.revision,
          expectedEtag: followed.etag,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? "Unable to save changes.");
      setDirty(false);
      await load();
      setFeedback({ message: "Shared setlist updated", tone: "success" });
    } catch (error) {
      setFeedback({
        message: error instanceof Error ? error.message : "Unable to save changes.",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function importOne(index: number) {
    if (!draft || !followed) return;
    const sharedSong = draft.songs[index];
    const existing = await findImportedSong(token, sharedSong);
    const changed =
      existing &&
      existing.sharedSource?.contentHash !==
        (sharedSong.contentHash ?? existing.sharedSource?.contentHash);
    let replace = false;
    if (changed) {
      replace = confirm(
        `“${sharedSong.title}” has changed. Choose OK to replace your private copy, or Cancel for more options.`,
      );
      if (
        !replace &&
        !confirm("Import the newer version as a separate private copy?")
      )
        return;
    }
    const result = await importSharedSong(
      token,
      followed.revision,
      sharedSong,
      Boolean(replace),
    );
    setFeedback({
      message: result.existed ? "Song is already in your library" : "Song imported",
      tone: "success",
    });
  }

  async function importAll() {
    if (!draft || !followed) return;
    let count = 0;
    for (const song of draft.songs) {
      const result = await importSharedSong(token, followed.revision, song);
      if (!result.existed) count += 1;
    }
    setFeedback({
      message: count
        ? `${count} ${count === 1 ? "song" : "songs"} imported`
        : "All songs are already imported",
      tone: "success",
    });
  }

  function move(index: number, change: -1 | 1) {
    if (!draft) return;
    const target = index + change;
    if (target < 0 || target >= draft.songs.length) return;
    const songs = [...draft.songs] as PublishedSnapshot["songs"];
    [songs[index], songs[target]] = [songs[target], songs[index]];
    updateDraft(
      draft.version === 2
        ? { ...draft, songs: songs as PublishedSnapshotV2["songs"] }
        : { ...draft, songs },
    );
  }

  function addLibrarySong(songId: string) {
    if (!draft || draft.version !== 2) return;
    const song = library.find((candidate) => candidate.id === songId);
    if (!song) return;
    const hash = sharedSongContentHash({
      title: song.title,
      artist: song.artist,
      originalKey: song.originalKey,
      capo: song.capo,
      sections: song.sections,
      links: song.links,
    });
    const sharedSongId =
      draft.songs.find(
        (candidate) =>
          candidate.contentHash === hash &&
          candidate.title === song.title &&
          candidate.artist === song.artist,
      )?.sharedSongId ?? crypto.randomUUID();
    const payload = {
      entryId: crypto.randomUUID(),
      sharedSongId,
      title: song.title,
      artist: song.artist,
      originalKey: song.originalKey,
      capo: song.capo,
      performanceKey: song.originalKey,
      arrangementCue: "",
      sections: structuredClone(song.sections),
      links: song.links,
      contentHash: hash,
    };
    updateDraft({ ...draft, songs: [...draft.songs, payload] });
  }

  if (!draft)
    return (
      <div className="p-12 text-center text-slate-500">
        {busy ? "Opening shared setlist…" : "Shared setlist unavailable"}
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 pb-24 sm:px-6 sm:py-8">
      <FeedbackToast message={feedback?.message ?? null} tone={feedback?.tone} />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-indigo-600">
            Shared setlist · {followed?.role ?? "viewer"} · Revision {followed?.revision ?? 1}
          </p>
          <h1 className="break-words text-3xl font-bold">{draft.name}</h1>
          {draft.version === 2 && draft.sharedBy && (
            <p className="mt-1 text-sm text-slate-500">Shared by {draft.sharedBy}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href={`/s/${token}`} target="_blank">
              <ExternalLink size={16} /> Perform
            </Link>
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => void load()}>
            <RefreshCw size={16} /> Refresh
          </Button>
          <Button variant="secondary" onClick={() => void importAll()}>
            <Download size={16} /> Import all
          </Button>
          {canEdit && (
            <Button disabled={!dirty || busy} onClick={() => void save()}>
              <Save size={16} /> Save changes
            </Button>
          )}
        </div>
      </div>

      {canEdit && draft.version === 2 && (
        <Card className="mb-5 grid gap-3 p-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Setlist name
            <Input
              className="mt-1"
              value={draft.name}
              onChange={(event) => updateDraft({ ...draft, name: event.target.value })}
            />
          </label>
          <label className="text-sm font-semibold">
            Venue
            <Input
              className="mt-1"
              value={draft.venue}
              onChange={(event) => updateDraft({ ...draft, venue: event.target.value })}
            />
          </label>
          <label className="text-sm font-semibold">
            Date
            <Input
              className="mt-1"
              type="date"
              value={draft.date ?? ""}
              onChange={(event) =>
                updateDraft({ ...draft, date: event.target.value || undefined })
              }
            />
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Shared notes
            <Textarea
              className="mt-1"
              value={draft.notes ?? ""}
              onChange={(event) => updateDraft({ ...draft, notes: event.target.value })}
            />
          </label>
        </Card>
      )}

      <div className="space-y-3">
        {draft.songs.map((song, index) => {
          const identity = song.sharedSongId ?? song.entryId;
          return (
            <Card key={song.entryId} className="p-4">
              <div className="flex items-start gap-3">
                <span className="mt-1 text-sm font-bold text-slate-400">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold">{song.title}</h2>
                  <p className="text-sm text-slate-500">{song.artist || "Unknown artist"}</p>
                  {canEdit && draft.version === 2 && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <label className="text-xs font-bold uppercase text-slate-500">
                        Performance key
                        <Input
                          className="mt-1 normal-case"
                          value={song.performanceKey}
                          onChange={(event) => {
                            const v2 = draft as PublishedSnapshotV2;
                            const songs = [...v2.songs];
                            songs[index] = {
                              ...songs[index],
                              performanceKey: event.target.value,
                            };
                            updateDraft({ ...v2, songs });
                          }}
                        />
                      </label>
                      <label className="text-xs font-bold uppercase text-slate-500">
                        Arrangement cue
                        <Input
                          className="mt-1 normal-case"
                          value={song.arrangementCue}
                          onChange={(event) => {
                            const v2 = draft as PublishedSnapshotV2;
                            const songs = [...v2.songs];
                            songs[index] = {
                              ...songs[index],
                              arrangementCue: event.target.value,
                            };
                            updateDraft({ ...v2, songs });
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="secondary"
                    aria-label={`Import ${song.title}`}
                    onClick={() => void importOne(index)}
                  >
                    <Download size={16} />
                  </Button>
                  {canEdit && (
                    <>
                      <Button size="icon" variant="ghost" disabled={!index} onClick={() => move(index, -1)}>
                        <ArrowUp size={16} />
                      </Button>
                      <Button size="icon" variant="ghost" disabled={index === draft.songs.length - 1} onClick={() => move(index, 1)}>
                        <ArrowDown size={16} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          updateDraft({
                            ...draft,
                            songs: draft.songs.filter((_, songIndex) => songIndex !== index),
                          })
                        }
                      >
                        <Trash2 size={16} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {importedSongs.has(identity) && (
                <p
                  className={`mt-2 text-xs font-semibold ${
                    song.contentHash &&
                    importedSongs.get(identity)?.sharedSource?.contentHash !==
                      song.contentHash
                      ? "text-amber-600"
                      : "text-emerald-600"
                  }`}
                >
                  {song.contentHash &&
                  importedSongs.get(identity)?.sharedSource?.contentHash !==
                    song.contentHash
                    ? "Newer shared version available"
                    : "In your library"}
                </p>
              )}
            </Card>
          );
        })}
      </div>

      {canEdit && draft.version === 2 && (
        <Card className="mt-5 p-4">
          <h2 className="font-bold">Add from your library</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {library.map((song) => (
              <Button key={song.id} variant="secondary" size="sm" onClick={() => addLibrarySong(song.id)}>
                {song.title}
              </Button>
            ))}
            {!library.length && <p className="text-sm text-slate-500">Your library is empty.</p>}
          </div>
        </Card>
      )}
    </div>
  );
}
