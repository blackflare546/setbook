const PUBLIC_TOKEN_PATTERN = /^[A-Za-z0-9]{6,40}$/;

export function publicTokenFromSharedLink(
  value: string,
  expectedOrigin: string,
): string | null {
  try {
    const url = new URL(value.trim(), expectedOrigin);
    if (url.origin !== expectedOrigin || url.search || url.hash) return null;
    const match = /^\/s\/([^/]+)\/?$/.exec(url.pathname);
    const token = match?.[1] ?? "";
    return PUBLIC_TOKEN_PATTERN.test(token) ? token : null;
  } catch {
    return null;
  }
}
