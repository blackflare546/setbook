import type { Song } from "@/core/songs/types";
import type { PublishedSnapshot } from "@/lib/validation/schemas";
import { sectionsToText } from "@/core/parser/parser";
import {
  SongRepository,
  songRepository,
} from "@/data/repositories/song-repository";
import { sharedSongContentHash } from "./snapshot";

type SharedSong = PublishedSnapshot["songs"][number];

const importLocks = new WeakMap<
  SongRepository,
  Map<string, Promise<{ song: Song; existed: boolean }>>
>();

export function sharedSongImportIdentity(song: SharedSong): string {
  return song.sharedSongId ?? song.entryId;
}

export function sharedSongImportContentHash(song: SharedSong): string {
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
  repository: SongRepository = songRepository,
): Promise<Song | undefined> {
  const hash = sharedSongImportContentHash(song);
  const sourceMatches = await repository.findBySharedSource(
    publicToken,
    sharedSongImportIdentity(song),
  );

  // Prefer the exact shared version. A user may have intentionally kept an
  // older import, and returning that first would make the current version look
  // new every time it is imported.
  return (
    sourceMatches.find(
      (candidate) => candidate.sharedSource?.contentHash === hash,
    ) ?? sourceMatches[0]
  );
}

export async function importSharedSong(
  publicToken: string,
  revision: number,
  song: SharedSong,
  replaceExisting = false,
  repository: SongRepository = songRepository,
): Promise<{ song: Song; existed: boolean }> {
  const hash = sharedSongImportContentHash(song);
  const lockKey = `${publicToken}:${sharedSongImportIdentity(song)}:${hash}`;
  const locks = importLocks.get(repository) ?? new Map();
  importLocks.set(repository, locks);

  const inFlight = locks.get(lockKey);
  if (inFlight) return inFlight;

  const operation = performImport(
    publicToken,
    revision,
    song,
    hash,
    replaceExisting,
    repository,
  );
  locks.set(lockKey, operation);

  try {
    return await operation;
  } finally {
    if (locks.get(lockKey) === operation) locks.delete(lockKey);
  }
}

async function performImport(
  publicToken: string,
  revision: number,
  song: SharedSong,
  hash: string,
  replaceExisting: boolean,
  repository: SongRepository,
): Promise<{ song: Song; existed: boolean }> {
  const existing = await findImportedSong(publicToken, song, repository);
  if (existing?.sharedSource?.contentHash === hash)
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
      sharedSongId: sharedSongImportIdentity(song),
      importedRevision: revision,
      contentHash: hash,
    },
  };
  await repository.save(imported);
  return { song: imported, existed: false };
}
