export async function deletePublishedSetlistByToken(
  token: string,
): Promise<void> {
  const response = await fetch(`/api/published-setlists/${token}`, {
    method: "DELETE",
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      result?.error ??
        `Unable to delete published setlist (server returned ${response.status}).`,
    );
  }
}
