export const MAX_SHARED_SETLIST_BODY_BYTES = 2 * 1024 * 1024;

export type JsonRequestBody =
  | { ok: true; value: unknown }
  | { ok: false; status: 400 | 413; error: string };

export async function readJsonRequestBody(
  request: Request,
): Promise<JsonRequestBody> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_SHARED_SETLIST_BODY_BYTES
  ) {
    return {
      ok: false,
      status: 413,
      error: "Shared setlist is too large to publish.",
    };
  }

  const text = await request.text().catch(() => null);
  if (text === null) {
    return { ok: false, status: 400, error: "Invalid JSON request body." };
  }
  if (
    new TextEncoder().encode(text).byteLength > MAX_SHARED_SETLIST_BODY_BYTES
  ) {
    return {
      ok: false,
      status: 413,
      error: "Shared setlist is too large to publish.",
    };
  }
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON request body." };
  }
}
