# SetBook code audit

Finalized: 2026-10-12

## Outcome

The thirteen-phase audit covered the landing experience, song library, setlist
workflows, performance mode, song editing and viewing, local data safety,
sharing and synchronization, cross-app accessibility and recovery, security,
release operations, and final repository hygiene.

No known release-blocking correctness, accessibility, security, or dependency
issues remain. The application retains its local-first architecture: private
songs and setlists stay in IndexedDB, while explicitly published snapshots use
the existing server-side sharing routes.

## Final verification

- Production dependency audit: no known vulnerabilities
- ESLint: clean
- TypeScript: clean under strict mode
- Vitest: 290 tests across 28 files
- Playwright: 38 Chromium scenarios
- Next.js production build: successful
- Deployment smoke check: five primary pages, security headers, and health API
- Emitted client JavaScript baseline: 33 chunks, 627.7 kB gzip, 526.7 kB
  Brotli in aggregate

The bundle figure is the sum of every emitted client chunk, not the amount a
visitor downloads for one route. It is intended as a stable regression signal.

## Final-phase changes

- Removed four unused Radix packages and the unused Vite React plugin, including
  their unneeded transitive packages.
- Renamed the Vitest configuration to its explicit ESM extension, eliminating
  the configuration-loader compatibility warning without weakening test
  isolation.
- Made tutorial dismissal wait for its IndexedDB completion so an immediate
  reload cannot replay a tutorial that was already dismissed.
- Protected an immediate theme choice from being overwritten by the initial
  asynchronous settings read, with a focused regression test.
- Corrected the repository architecture summary for the expanded API surface.

## Operational gates

- `pnpm release:check` runs the production audit, lint, type checking, unit
  tests, production build, bundle report, and Playwright suite.
- GitHub CI runs that release gate for pull requests and pushes to `main`.
- `pnpm env:check` validates the production sharing and cleanup configuration.
- `pnpm health:smoke -- <url>` verifies a deployed instance without exposing
  credentials.
- The manual **Deployment smoke check** workflow can require selected runtime
  features before accepting a deployment.

## Remaining maintenance considerations

- `performance-view.tsx`, `setlist-editor.tsx`, and `song-editor.tsx` are large
  feature components. Their behavior is covered by focused tests, but future
  feature work should extract cohesive state machines or panels instead of
  continuing to grow these files.
- Browser-local data still depends on users keeping backups when changing
  browsers or clearing site data. The audited import/export and validation
  paths mitigate this product constraint.
- Public sharing and scheduled cleanup remain dependent on correctly configured
  deployment secrets and Blob storage. Environment validation, health feature
  flags, and deployment smoke checks now detect this explicitly.
- Major framework and toolchain upgrades should remain separate changes with
  their own migration review. Security patches should continue to take
  priority over version churn.
