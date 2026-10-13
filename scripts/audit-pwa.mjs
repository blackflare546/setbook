import { readFile, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";

const serviceWorkerPath = new URL("../public/sw.js", import.meta.url);
const source = await readFile(serviceWorkerPath, "utf8");
const file = await stat(serviceWorkerPath);

const forbiddenPrecachePatterns = [
  { label: "API route", pattern: /["']url["']\s*:\s*["']\/api\// },
  { label: "external URL", pattern: /["']url["']\s*:\s*["']https?:\/\// },
  { label: "source map", pattern: /["']url["']\s*:\s*["'][^"']+\.map["']/ },
  { label: "development asset", pattern: /__nextjs|_next\/development/ },
];

const violations = forbiddenPrecachePatterns.filter(({ pattern }) =>
  pattern.test(source),
);
if (violations.length) {
  throw new Error(
    `Unsafe service-worker output: ${violations.map(({ label }) => label).join(", ")}.`,
  );
}

if (!source.includes("/~offline")) {
  throw new Error("The offline fallback is missing from the service worker.");
}

console.info(
  `Service worker: ${(file.size / 1024).toFixed(1)} kB raw, ${(gzipSync(source).byteLength / 1024).toFixed(1)} kB gzip`,
);
