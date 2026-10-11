import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";

const chunksDirectory = path.join(process.cwd(), ".next", "static", "chunks");

async function collectJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectJavaScriptFiles(entryPath);
      return entry.isFile() && entry.name.endsWith(".js") ? [entryPath] : [];
    }),
  );
  return nestedFiles.flat();
}

function formatKilobytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

try {
  const files = await collectJavaScriptFiles(chunksDirectory);
  const sizes = await Promise.all(
    files.map(async (file) => {
      const source = await readFile(file);
      return {
        file: path.relative(chunksDirectory, file),
        raw: source.byteLength,
        gzip: gzipSync(source).byteLength,
        brotli: brotliCompressSync(source).byteLength,
      };
    }),
  );

  const totals = sizes.reduce(
    (total, size) => ({
      raw: total.raw + size.raw,
      gzip: total.gzip + size.gzip,
      brotli: total.brotli + size.brotli,
    }),
    { raw: 0, gzip: 0, brotli: 0 },
  );

  console.info(`Emitted client JavaScript (${sizes.length} chunks)`);
  console.info(
    `Total: ${formatKilobytes(totals.raw)} raw, ${formatKilobytes(totals.gzip)} gzip, ${formatKilobytes(totals.brotli)} brotli`,
  );
  console.table(
    sizes
      .sort((left, right) => right.gzip - left.gzip)
      .slice(0, 10)
      .map((size) => ({
        chunk: size.file,
        raw: formatKilobytes(size.raw),
        gzip: formatKilobytes(size.gzip),
        brotli: formatKilobytes(size.brotli),
      })),
  );

  const maximumGzipKilobytes = Number(
    process.env.SETBOOK_MAX_CLIENT_GZIP_KB ?? "",
  );
  if (
    Number.isFinite(maximumGzipKilobytes) &&
    maximumGzipKilobytes > 0 &&
    totals.gzip / 1024 > maximumGzipKilobytes
  ) {
    throw new Error(
      `Total emitted gzip size exceeds ${maximumGzipKilobytes} kB.`,
    );
  }
} catch (error) {
  console.error(
    "Unable to report the production bundle. Run pnpm build first.",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
}
