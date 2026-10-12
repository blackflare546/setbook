# SetBook security

## Data boundaries

Songs, private setlists, drafts, and settings remain in browser IndexedDB.
Publishing is an explicit action that creates a public, read-only snapshot.
Anyone with its link can read that snapshot; only the publishing device holds
the owner capability used to update, extend, or remove it.

Never place Blob credentials, owner capabilities, cron secrets, or the sharing
capability secret in client code, logs, public issue reports, or variables whose
names start with `NEXT_PUBLIC_`.

## Production checklist

1. Use a currently supported Node.js release and the lockfile committed with
   the deployment.
2. Configure the server-only values documented in `.env.example`.
3. Run `pnpm env:check` in the intended deployment environment.
4. Run `pnpm release:check` and resolve every production audit finding.
5. Confirm the Vercel Blob store is public only because published snapshots are
   intentionally public; credentials must remain server-only.
6. Confirm the daily cleanup job succeeds and expired shares become unavailable.
7. Verify CSP and browser security headers after deployment.

## Reporting

Do not include real credentials, owner capabilities, private charts, or private
setlists in a report. Revoke or rotate exposed credentials before sharing a
minimal reproduction with the project maintainer through a private channel.
