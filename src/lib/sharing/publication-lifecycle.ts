const EXTENSION_WINDOW_MS = 5 * 24 * 60 * 60 * 1000;

export function formatPublicationDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function canExtendPublication(
  expiresAt: string | undefined,
  now = new Date(),
): boolean {
  if (!expiresAt) return false;
  const expiration = Date.parse(expiresAt);
  if (!Number.isFinite(expiration)) return false;
  return expiration - now.getTime() <= EXTENSION_WINDOW_MS;
}
