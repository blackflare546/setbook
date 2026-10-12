const PUBLIC_TOKEN_PATTERN = /^[A-Za-z0-9]{6,40}$/;

export function publicPerformancePath(token: string): string {
  return `/shared/${encodeURIComponent(token)}/performance`;
}

export function publicTokenFromSharedLink(
  value: string,
  expectedOrigin: string,
): string | null {
  try {
    const url = new URL(value.trim(), expectedOrigin);
    if (url.origin !== expectedOrigin || url.search || url.hash) return null;
    const match =
      /^\/shared\/([^/]+)\/performance\/?$/.exec(url.pathname) ??
      /^\/s\/([^/]+)\/?$/.exec(url.pathname);
    const token = match?.[1] ?? "";
    return PUBLIC_TOKEN_PATTERN.test(token) ? token : null;
  } catch {
    return null;
  }
}
