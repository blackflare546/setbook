<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SetBook project guide

## Architecture

- SetBook is a Next.js 16 App Router application under `src/app`.
- Route-level UI lives in `src/app`; reusable UI lives in `src/components`.
- Domain logic belongs in `src/core`, persistence and repository code in
  `src/data`, and cross-cutting helpers in `src/lib`.
- The app is local-first. Preserve IndexedDB-backed repositories and existing
  routes when changing presentation code.
- Tailwind CSS 4 utilities are the default styling system. Keep global CSS in
  `src/app/globals.css` limited to truly global tokens and behaviors.

## Conventions

- Read the relevant bundled Next.js documentation in
  `node_modules/next/dist/docs/` before changing framework behavior.
- Prefer Server Components unless browser APIs, state, or event handlers require
  a Client Component. Keep client boundaries narrow.
- Reuse `src/components/ui` primitives, the SetBook brand components, and
  existing design tokens before adding new abstractions.
- Preserve semantic HTML, keyboard access, visible focus, responsive layouts,
  and the light/dark behavior of existing application screens.
- Do not add dependencies for effects that can be expressed clearly with the
  existing stack.

## Development workflow

1. Inspect the affected route, components, repositories, tests, and nested
   instruction files before editing.
2. Keep changes scoped to the requested feature and preserve unrelated user
   changes.
3. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
4. For route or interaction changes, run the relevant Playwright tests with
   `pnpm test:e2e` and verify responsive layouts and console output.

## Design work

- Project-wide visual direction is defined in `DESIGN.md`.
- For substantial product, landing-page, or marketing UI work, invoke the installed
  `gpt-taste` skill at `.agents/skills/gpt-taste/SKILL.md` and read it before
  coding.
- Apply the skill as design critique and composition guidance, then reconcile it
  with the explicit task, `DESIGN.md`, accessibility, existing dependencies, and
  product conventions. Do not blindly add its optional assets, motion libraries,
  or sections when they do not serve the requested experience.
