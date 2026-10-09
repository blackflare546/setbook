import type { Setlist } from "@/core/setlists/types";
import type { PublishedSnapshot } from "@/lib/validation/schemas";

type ShareBinding = NonNullable<Setlist["shareBinding"]>;

export interface PublishSharedSetlistResult {
  token: string;
  ownerCapability: string;
  revision: number;
  etag: string;
  createdReplacement: boolean;
}

export async function publishSharedSetlist(
  snapshot: PublishedSnapshot,
  binding?: ShareBinding,
  request: typeof fetch = fetch,
): Promise<PublishSharedSetlistResult> {
  const create = () =>
    request("/api/published-setlists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ snapshot }),
    });

  let createdReplacement = false;
  let response = binding
    ? await request(`/api/published-setlists/${binding.publicToken}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${binding.ownerCapability}`,
        },
        body: JSON.stringify({
          snapshot,
          expectedRevision: binding.revision,
          expectedEtag: binding.etag,
        }),
      })
    : await create();

  if (binding && response.status === 404) {
    response = await create();
    createdReplacement = true;
  }

  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.token)
    throw new Error(
      result?.error ??
        `Unable to publish setlist (server returned ${response.status}).`,
    );

  return {
    token: result.token,
    ownerCapability:
      createdReplacement || !binding
        ? result.ownerCapability
        : binding.ownerCapability,
    revision: result.revision,
    etag: result.etag,
    createdReplacement,
  };
}

export async function deletePublishedSetlistByToken(
  token: string,
  ownerCapability?: string,
  request: typeof fetch = fetch,
): Promise<void> {
  const response = await request(`/api/published-setlists/${token}`, {
    method: "DELETE",
    headers: ownerCapability
      ? { authorization: `Bearer ${ownerCapability}` }
      : undefined,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      result?.error ??
        `Unable to delete published setlist (server returned ${response.status}).`,
    );
  }
}
