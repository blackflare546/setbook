import type { Song } from "@/core/songs/types";
import { parseSong } from "@/core/parser/parser";
import {
  SongRepository,
  songRepository,
} from "@/data/repositories/song-repository";
import {
  createSongTransfer,
  songTransferFingerprint,
  songTransferIdentity,
  type SongTransferV1,
} from "./song-transfer";

export type SongTransferInspection =
  | { status: "new" }
  | { status: "exact-existing"; existing: Song }
  | { status: "identity-conflict"; existing: Song };

export type SongTransferImportResult =
  | { status: "imported"; song: Song; replaced: boolean }
  | { status: "exact-existing"; song: Song }
  | { status: "identity-conflict"; existing: Song };

export type SongTransferConflictResolution = "replace" | "keep-both";

const importLocks = new WeakMap<
  SongRepository,
  Map<string, Promise<unknown>>
>();

export async function inspectSongTransfer(
  transfer: SongTransferV1,
  repository: SongRepository = songRepository,
): Promise<SongTransferInspection> {
  const fingerprint = songTransferFingerprint(transfer);
  const identity = songTransferIdentity(transfer);
  const songs = await repository.list();
  const exact = songs.find(
    (song) => songTransferFingerprint(createSongTransfer(song)) === fingerprint,
  );
  if (exact) return { status: "exact-existing", existing: exact };
  const identityMatch = songs.find(
    (song) => songTransferIdentity(createSongTransfer(song)) === identity,
  );
  return identityMatch
    ? { status: "identity-conflict", existing: identityMatch }
    : { status: "new" };
}

function transferredSong(transfer: SongTransferV1, existing?: Song): Song {
  const parsed = parseSong(transfer.chartText, {
    title: transfer.title,
    artist: transfer.artist,
    originalKey: transfer.originalKey,
    capo: transfer.capo,
  });
  return {
    ...parsed,
    id: existing?.id ?? crypto.randomUUID(),
    title: transfer.title,
    artist: transfer.artist,
    originalKey: transfer.originalKey,
    capo: transfer.capo,
    tags: [...transfer.tags],
    notes: transfer.notes,
    links: { ...transfer.links },
    sourceText: transfer.chartText,
    createdAt: existing?.createdAt ?? parsed.createdAt,
    updatedAt: new Date().toISOString(),
    sharedSource: undefined,
  };
}

export async function importSongTransfer(
  transfer: SongTransferV1,
  resolution?: SongTransferConflictResolution,
  repository: SongRepository = songRepository,
): Promise<SongTransferImportResult> {
  const lockKey = songTransferFingerprint(transfer);
  const locks =
    importLocks.get(repository) ?? new Map<string, Promise<unknown>>();
  importLocks.set(repository, locks);
  const previous = locks.get(lockKey) ?? Promise.resolve();
  const operation = previous.then(async () => {
    const inspection = await inspectSongTransfer(transfer, repository);
    if (inspection.status === "exact-existing") {
      return { status: "exact-existing", song: inspection.existing } as const;
    }
    if (inspection.status === "identity-conflict" && !resolution) {
      return inspection;
    }
    const existing =
      inspection.status === "identity-conflict" && resolution === "replace"
        ? inspection.existing
        : undefined;
    const song = transferredSong(transfer, existing);
    await repository.saveTransfer(song);
    return { status: "imported", song, replaced: Boolean(existing) } as const;
  });
  locks.set(lockKey, operation);
  try {
    return await operation;
  } finally {
    if (locks.get(lockKey) === operation) locks.delete(lockKey);
  }
}
