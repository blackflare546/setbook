# SetBook

SetBook is a local-first song chart and setlist app for working musicians. Songs, private setlists, settings, and drafts stay in the browser through Dexie/IndexedDB. Explicitly shared setlists are public and read-only; visitors can follow them or import private song copies, while publishing controls remain with the owner capability stored on the publishing device.

## Run locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). No account or network connection is required for normal library, editing, setlist, or performance use.

## Feedback form

The Help page sends feedback through Formspree. Copy `.env.example` to
`.env.local`, or add this variable to the existing file:

```bash
FORMSPREE_FORM_ID=
```

Add the same variable to the Vercel project for Production and Preview, then
redeploy. The value is read only by the `/api/feedback` route and is not
included in the browser bundle.

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

### Vercel setup

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
7. Add these server-only environment variables:

   - `SHARE_CAPABILITY_SECRET`: add it to every environment that can publish;
     it protects owner capability verifiers. Generate it locally with:

     ```bash
     openssl rand -base64 48
     ```

     Paste only the generated value into Vercel. Never change it while existing
     shares still need to be updated.

   - `CRON_SECRET`: add it to Production to authenticate Vercel's cleanup
     request. Generate a separate random value with
     `openssl rand -base64 32`. Vercel sends it automatically as an
     `Authorization: Bearer` header.

   - `PUBLISHED_SETLIST_RETENTION_DAYS`: optional positive integer for every
     publishing environment. Set it to `30` to make the default explicit, or
     omit it to use the same 30-day default.

   Never prefix any of these names with `NEXT_PUBLIC_` or commit their values.

8. Redeploy the project after connecting the store and adding the secret. An
   existing deployment does not receive newly configured environment values.
   The deployment reads `vercel.json` and registers the daily
   `/api/cron/published-setlists-cleanup` invocation with schedule
   `0 2 * * *`.
9. Open **Project → Settings → Cron Jobs** and confirm the cleanup route is
   listed. Cron runs against the Production deployment; add `CRON_SECRET` to
   Preview only when manually testing a Preview deployment.
10. Publish a setlist. The Blob browser should now show a JSON object under
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
- `401 Unauthorized` from the cleanup route: `CRON_SECRET` is missing or does
  not match the bearer token sent by Vercel. Update it and redeploy.
- `503 Cleanup failed`: check the function logs for storage availability and
  verify that `PUBLISHED_SETLIST_RETENTION_DAYS`, when set, is a positive
  integer. A failed batch keeps its cursor position so a later run can retry.
- A missing old JSON record is recovered by creating a new share and URL.

Vercel documentation: [Blob setup and SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk),
[folders and pathnames](https://vercel.com/docs/vercel-blob#folders-and-slashes),
[OIDC authentication](https://vercel.com/changelog/vercel-blob-now-supports-oidc-authentication),
and [secured Cron jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

The sharing API is intentionally small:

- `POST /api/published-setlists`
- `GET /api/published-setlists/:token`
- `PATCH /api/published-setlists/:token`
- `PUT /api/published-setlists/:token` (deprecated authenticated alias)
- `DELETE /api/published-setlists/:token`
- `POST /api/published-setlists/:token/extend`
- `GET /api/cron/published-setlists-cleanup` (Vercel Cron only)

Anyone with the public link can view the shared setlist. Only the publishing
device can update, extend, or unpublish it.

### Publication expiration and cleanup

New and updated shares expire after 30 days. The owner sees the expiration date
in the sharing panel. During the final five days, the owner can extend it for
another 30 days. Visitors do not see the expiration date.

Expired links become unavailable and are deleted by the daily Vercel cleanup
job. This still happens if the owner clears their browser data. Older shares
without an expiration date and legacy links do not expire automatically.

Songs that visitors already imported remain in their private libraries.

## Structure

- `src/core` — framework-independent music and setlist logic
- `src/data` — Dexie database and repositories
- `src/components` — application UI built from shadcn-style Radix primitives
- `src/lib/sharing` — public snapshot serialization and blob storage adapter
- `src/app/api` — published-snapshot API only
