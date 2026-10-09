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

In local development, shared records are JSON files under
`data/published-setlists/`. Production uses one **Public Vercel Blob store**.
Every new share is written to one predictable prefix:

```text
setbook-shared-setlists/<public-token>.json
```

`setbook-shared-setlists/` is not a real directory and must not be created in
the dashboard. Vercel Blob treats slashes in a pathname as virtual folders, so
the first successful publish creates the prefix automatically.

### Clean Vercel setup

Use these steps when replacing the Blob store completely:

1. In the Vercel project, disconnect the old Blob store. If the old store will
   not be used again, delete it from **Storage**.
2. Open **Project → Settings → Environment Variables** and remove stale,
   manually added `BLOB_STORE_ID` or `BLOB_READ_WRITE_TOKEN` values belonging
   to the old store. Do not copy a store ID into `BLOB_READ_WRITE_TOKEN`; they
   are different credential types.
3. Open **Project → Storage → Create Database → Blob**.
4. Choose **Public** access. A clear store name such as
   `setbook-public-sharing` is recommended, but the store name does not control
   the `setbook-shared-setlists/` pathname used by the app.
5. Connect the store to this SetBook project and enable **Production**. Enable
   **Preview** too if preview deployments should publish setlists.
6. Confirm the connection created `BLOB_STORE_ID`. Current Vercel connections
   use short-lived OIDC authentication automatically. An older token-based
   connection may instead provide `BLOB_READ_WRITE_TOKEN`. SetBook supports
   either configuration; do not create both manually.
7. Add a server-only environment variable named `SHARE_CAPABILITY_SECRET` for
   every environment that can publish. Generate it locally with:

   ```bash
   openssl rand -base64 48
   ```

   Paste only the generated value into Vercel. Never prefix the name with
   `NEXT_PUBLIC_`, commit it, or change it while existing shares still need to
   be updated.

8. Redeploy the project after connecting the store and adding the secret. An
   existing deployment does not receive newly configured environment values.
9. Publish a setlist. The Blob browser should now show a JSON object under
   `setbook-shared-setlists/`; no manual folder creation is required.

If a local setlist still refers to a file deleted from a previous Blob store,
SetBook automatically creates a replacement record and saves the new public
link the next time **Publish** is selected. Deleted old public links cannot be
restored without their original JSON objects.

For local Blob testing, link the project and pull its development environment:

```bash
vercel link
vercel env pull .env.local
```

Do not expose Blob credentials through a `NEXT_PUBLIC_` variable. Do not edit
the values pulled by Vercel or set `BLOB_READ_WRITE_TOKEN` equal to
`BLOB_STORE_ID`.

### Troubleshooting publishing

- `503 Public sharing is not configured`: the deployment is missing the Blob
  connection or `SHARE_CAPABILITY_SECRET`. Correct the Production environment
  variables and redeploy.
- `502 Shared setlist storage is unavailable`: the credentials point to the
  wrong/deleted store, the store is not Public, or the project is not connected
  to that store.
- `409 Someone updated this setlist`: reload the setlist before updating it.
- A missing old JSON record is recovered by creating a new share and URL.

Vercel documentation: [Blob setup and SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk),
[folders and pathnames](https://vercel.com/docs/vercel-blob#folders-and-slashes),
and [OIDC authentication](https://vercel.com/changelog/vercel-blob-now-supports-oidc-authentication).

The sharing API is intentionally small:

- `POST /api/published-setlists`
- `GET /api/published-setlists/:token`
- `PATCH /api/published-setlists/:token`
- `PUT /api/published-setlists/:token` (deprecated authenticated alias)
- `DELETE /api/published-setlists/:token`
- `POST /api/published-setlists/:token/access`

Public reads remain account-free and read-only. Updates and deletion require
the owner capability. Capabilities are carried in authorization headers, while
revision numbers and Blob ETags provide optimistic concurrency protection.

## Structure

- `src/core` — framework-independent music and setlist logic
- `src/data` — Dexie database and repositories
- `src/components` — application UI built from shadcn-style Radix primitives
- `src/lib/sharing` — public snapshot serialization and blob storage adapter
- `src/app/api` — published-snapshot API only
