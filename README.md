# SetBook

SetBook is a local-first song chart and setlist app for working musicians. Songs, setlists, settings, and drafts stay in the browser through Dexie/IndexedDB. Only an explicitly published, read-only setlist snapshot leaves the device.

## Run locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). No account or network connection is required for normal library, editing, setlist, or performance use.

## Checks

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

The Vitest suite covers chord parsing, classification, inline and above-lyric positioning, song parsing, transposition, setlist operations, and published snapshot serialization. The Playwright flow covers song creation through performance and persistent-link republishing.

## Public sharing

In local development, published snapshots are stored as JSON blobs under `data/published-setlists/`. On Vercel, connect a Blob store and provide `BLOB_READ_WRITE_TOKEN`; the same API automatically uses Vercel Blob object storage.

The public API is intentionally small:

- `POST /api/published-setlists`
- `GET /api/published-setlists/:token`
- `PUT /api/published-setlists/:token`
- `DELETE /api/published-setlists/:token`

Republishing overwrites the snapshot at the same token, so the share URL stays stable. The MVP has no authentication, as requested; anyone able to call the update/delete endpoint with a token can modify that snapshot. The storage adapter and route boundary are isolated so ownership checks can be added later without changing song parsing or the local library.

## Structure

- `src/core` — framework-independent music and setlist logic
- `src/data` — Dexie database and repositories
- `src/components` — application UI built from shadcn-style Radix primitives
- `src/lib/sharing` — public snapshot serialization and blob storage adapter
- `src/app/api` — published-snapshot API only
