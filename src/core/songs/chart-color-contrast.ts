export const CHART_BACKGROUNDS = {
  light: "#FFFFFF",
  dark: "#12161B",
} as const;

function expandHex(color: string): string | null {
  const value = color.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(value)) {
    return value
      .split("")
      .map((part) => `${part}${part}`)
      .join("");
  }
  return /^[0-9a-f]{6}$/i.test(value) ? value : null;
}

function relativeLuminance(color: string): number | null {
  const hex = expandHex(color);
  if (!hex) return null;

  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  if (foregroundLuminance === null || backgroundLuminance === null) return 1;

  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

export function needsChartContrastSupport(
  color: string,
  background: string,
): boolean {
  return contrastRatio(color, background) < 4.5;
}

export function getChartContrastOutline(
  color: string,
  background: string,
): string | undefined {
  if (!needsChartContrastSupport(color, background)) return undefined;

  const outline =
    contrastRatio("#F8FAFC", background) >= 4.5
      ? "rgba(248, 250, 252, 0.92)"
      : "rgba(2, 6, 23, 0.9)";
  return `-0.035em 0 ${outline}, 0.035em 0 ${outline}, 0 -0.035em ${outline}, 0 0.035em ${outline}`;
}
