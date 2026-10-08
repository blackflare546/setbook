import type { Song } from "@/core/songs/types";
import type { PublishedSnapshot } from "@/lib/validation/schemas";
import { sectionsToText } from "@/core/parser/parser";
import { songRepository } from "@/data/repositories/song-repository";
import { sharedSongContentHash } from "./snapshot";

type SharedSong = PublishedSnapshot["songs"][number];

function sourceIdentity(song: SharedSong): string {
  return song.sharedSongId ?? song.entryId;
}

function contentHash(song: SharedSong): string {
  return (
    song.contentHash ??
    sharedSongContentHash({
      title: song.title,
      artist: song.artist,
      originalKey: song.originalKey,
      capo: song.capo,
      sections: song.sections,
      links: song.links,
    })
  );
}

export async function findImportedSong(
  publicToken: string,
  song: SharedSong,
): Promise<Song | undefined> {
  const songs = await songRepository.list();
  return songs.find(
    (candidate) =>
      candidate.sharedSource?.publicToken === publicToken &&
      candidate.sharedSource.sharedSongId === sourceIdentity(song),
  );
}

export async function importSharedSong(
  publicToken: string,
  revision: number,
  song: SharedSong,
  replaceExisting = false,
): Promise<{ song: Song; existed: boolean }> {
  const existing = await findImportedSong(publicToken, song);
  const hash = contentHash(song);
  if (existing && existing.sharedSource?.contentHash === hash)
    return { song: existing, existed: true };
  const now = new Date().toISOString();
  const imported: Song = {
    id: replaceExisting && existing ? existing.id : crypto.randomUUID(),
    title: song.title,
    artist: song.artist,
    originalKey: song.originalKey,
    capo: song.capo,
    tags: [],
    sections: structuredClone(song.sections),
    notes: "",
    links: song.links ?? {},
    sourceText: sectionsToText(song.sections),
    createdAt: replaceExisting && existing ? existing.createdAt : now,
    updatedAt: now,
    sharedSource: {
      publicToken,
      sharedSongId: sourceIdentity(song),
      importedRevision: revision,
      contentHash: hash,
    },
  };
  await songRepository.save(imported);
  return { song: imported, existed: false };
}
