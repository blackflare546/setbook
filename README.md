# SetBook

SetBook is a local-first song chart and setlist app for working musicians. Songs, private setlists, settings, and drafts stay in the browser through Dexie/IndexedDB. Explicitly shared setlists can be followed, imported, or collaboratively edited through separate capability links.

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

In local development, published snapshots are stored as JSON files under `data/published-setlists/`. A Vercel deployment requires a **Public Vercel Blob store** because the deployment filesystem is read-only.

To configure it in the Vercel dashboard:

1. Open the deployed project and select **Storage**.
2. Select **Create Database**, choose **Blob**, and continue.
3. Choose **Public** access, name the store, and connect it to this project.
4. Include **Production** and any Preview environments that should support sharing.
5. Confirm the project now has Blob credentials under **Settings → Environment Variables**. New OIDC connections provide `BLOB_STORE_ID` and Vercel-managed authentication; older connections provide `BLOB_READ_WRITE_TOKEN`.
6. Redeploy the project. Environment-variable changes do not affect an existing deployment.

Also set `SHARE_CAPABILITY_SECRET` to a long random server-only value. It is
used to derive opaque Blob paths and capability verifiers. Never expose this
value through a `NEXT_PUBLIC_` variable or rotate it without a migration,
because existing v2 shares depend on it.

For local Blob testing, link the project and pull its development environment:

```bash
vercel link
vercel env pull .env.local
```

Do not expose either Blob credential through a `NEXT_PUBLIC_` variable. If no Blob store is connected in production, the publishing API returns a clear `503` configuration error instead of attempting to write to Vercel's filesystem.

The sharing API is intentionally small:

- `POST /api/published-setlists`
- `GET /api/published-setlists/:token`
- `PATCH /api/published-setlists/:token`
- `PUT /api/published-setlists/:token` (deprecated authenticated alias)
- `DELETE /api/published-setlists/:token`
- `POST /api/published-setlists/:token/access`

Public reads remain account-free and read-only. Updates require an active owner
or editor capability; access changes and deletion require the owner capability.
Capabilities are carried in authorization headers, while revision numbers and
Blob ETags provide optimistic concurrency protection. Existing v1 URLs remain
readable but are frozen; their owners create a replacement secure share on the
next publish.

## Structure

- `src/core` — framework-independent music and setlist logic
- `src/data` — Dexie database and repositories
- `src/components` — application UI built from shadcn-style Radix primitives
- `src/lib/sharing` — public snapshot serialization and blob storage adapter
- `src/app/api` — published-snapshot API only
