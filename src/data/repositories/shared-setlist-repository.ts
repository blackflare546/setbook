import type { FollowedSharedSetlist } from "@/core/setlists/types";
import type { PublishedSnapshot } from "@/lib/validation/schemas";
import { publishedSnapshotSchema } from "@/lib/validation/schemas";
import { db, type SongbookDatabase } from "@/data/db/songbook-db";

export interface RemoteSharedSetlist {
  snapshot: PublishedSnapshot;
  revision: number;
  etag: string;
  updatedAt: string;
}

export async function fetchSharedSetlist(
  publicToken: string,
): Promise<RemoteSharedSetlist> {
  const response = await fetch(`/api/published-setlists/${publicToken}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(
      result?.error ??
        `Unable to refresh shared setlist (server returned ${response.status}).`,
    );
  }
  const body = await response.json();
  const snapshot = publishedSnapshotSchema.parse(body);
  return {
    snapshot,
    revision: body.version === 2 ? body.revision : 1,
    etag: response.headers.get("etag") ?? "legacy",
    updatedAt: body.version === 2 ? body.updatedAt : body.publishedAt,
  };
}

export class SharedSetlistRepository {
  constructor(private readonly database: SongbookDatabase = db) {}

  list(): Promise<FollowedSharedSetlist[]> {
    return this.database.sharedSetlists
      .orderBy("lastCheckedAt")
      .reverse()
      .toArray();
  }

  get(publicToken: string): Promise<FollowedSharedSetlist | undefined> {
    return this.database.sharedSetlists.get(publicToken);
  }

  async follow(
    publicToken: string,
    remote: RemoteSharedSetlist,
  ): Promise<FollowedSharedSetlist> {
    const existing = await this.get(publicToken);
    const now = new Date().toISOString();
    const followed: FollowedSharedSetlist = {
      publicToken,
      snapshot: remote.snapshot,
      revision: remote.revision,
      etag: remote.etag,
      status: "current",
      followedAt: existing?.followedAt ?? now,
      lastCheckedAt: now,
    };
    await this.database.sharedSetlists.put(followed);
    return followed;
  }

  async refresh(publicToken: string): Promise<FollowedSharedSetlist> {
    const existing = await this.get(publicToken);
    if (!existing) throw new Error("This setlist is not followed.");
    try {
      const remote = await fetchSharedSetlist(publicToken);
      return this.follow(publicToken, remote);
    } catch (error) {
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      const unavailable = {
        ...existing,
        status: offline ? "offline" : "unavailable",
        lastCheckedAt: new Date().toISOString(),
      } satisfies FollowedSharedSetlist;
      await this.database.sharedSetlists.put(unavailable);
      throw error;
    }
  }

  async check(publicToken: string): Promise<FollowedSharedSetlist> {
    const existing = await this.get(publicToken);
    if (!existing) throw new Error("This setlist is not followed.");
    try {
      const remote = await fetchSharedSetlist(publicToken);
      const checked: FollowedSharedSetlist = {
        ...existing,
        status:
          remote.revision > existing.revision ? "update-available" : "current",
        lastCheckedAt: new Date().toISOString(),
      };
      await this.database.sharedSetlists.put(checked);
      return checked;
    } catch (error) {
      const checked: FollowedSharedSetlist = {
        ...existing,
        status:
          typeof navigator !== "undefined" && !navigator.onLine
            ? "offline"
            : "unavailable",
        lastCheckedAt: new Date().toISOString(),
      };
      await this.database.sharedSetlists.put(checked);
      throw error;
    }
  }

  unfollow(publicToken: string): Promise<void> {
    return this.database.sharedSetlists.delete(publicToken);
  }
}

export const sharedSetlistRepository = new SharedSetlistRepository();
