---
type: workflow
title: Local development
description: How to set up and run ta-web on a laptop with no Docker or system Postgres, the scripts you use day to day, how to change the schema, and how to reset local data.
tags: [development, setup, pnpm, postgres, workflow]
sources:
  - id: openwiki-source-5f5b95b3d6a215fa02ceb945
    resource: repo://.env.example
  - id: openwiki-source-f5a489e5822d87c0b8fc66ef
    resource: repo://.mcp.json
  - id: openwiki-source-7c03237a6b57ffb3e526a51b
    resource: repo://.nvmrc
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-7382aecd8b46a81ca66efc96
    resource: repo://lighthouserc.cjs
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-40275cb92c3610938f16ade3
    resource: repo://pnpm-workspace.yaml
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-9f5c4ea9e246f4ab67e69333
    resource: repo://scripts/backfill-guides.ts
  - id: openwiki-source-71c840280649a7620f8e010f
    resource: repo://scripts/db-dev.ts
  - id: openwiki-source-97e144348afe72981f00c973
    resource: repo://scripts/import/import-achievements.ts
  - id: openwiki-source-9e87f9929ce6181cecc80fe9
    resource: repo://scripts/import/import-guides.ts
  - id: openwiki-source-95f46342bb37caacc4ce1dbc
    resource: repo://scripts/lhci.ts
  - id: openwiki-source-52bd7f492006181f268b8ce3
    resource: repo://scripts/media-sizes.ts
  - id: openwiki-source-63cbcc482c18e4f9ce5d0888
    resource: repo://scripts/refresh-quests.ts
  - id: openwiki-source-102ac9d3e731f9c02830d89f
    resource: repo://src/app/(frontend)/sistema/page.tsx
  - id: openwiki-source-2ad419cae2f45e97a3ca23d7
    resource: repo://src/lib/db/database-url.ts
  - id: openwiki-source-7b3f34dd948192f72aa88058
    resource: repo://src/lib/dofusdb/client.ts
  - id: openwiki-source-4ce5bfd40fc86e2e8680d71f
    resource: repo://src/lib/dofusdb/refresh-quests.ts
  - id: openwiki-source-f34ac1e549d94dc3ac475ae4
    resource: repo://src/proxy.ts
generated: { by: "claude-code", at: "2026-11-08T11:00:21.339Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-08T11:00:21.339Z
---

# Local development

## Prerequisites

- Node 24, at least 24.22.1 (`engines.node` is `>=24.22.1 <25`; `.nvmrc` says `24`).
- pnpm 11 (`packageManager` pins `pnpm@11.24.0`; `corepack enable` picks it up).
- No Docker and no local Postgres: `pnpm db:dev` runs Postgres 17 from the `embedded-postgres` package.
- Optional, for the AI review in the pre-commit hook: `gga` and a logged-in Claude Code CLI. Without `gga` the hook warns and continues.

`pnpm-workspace.yaml` lists the packages allowed to run install scripts (pnpm 11 blocks them by default): `esbuild`, `lefthook` (installs the git hooks) and the platform builds of `@embedded-postgres/*`.

## First run

```sh
pnpm install          # also installs the git hooks
cp .env.example .env  # then set PAYLOAD_SECRET (openssl rand -hex 32)
pnpm db:dev           # terminal 1: Postgres on 127.0.0.1:54329, data in .postgres/
pnpm dev              # terminal 2: http://localhost:3000, panel at /admin
```

With `DATABASE_URL` empty, the app connects to the `ta_web` database of `pnpm db:dev`. Setting `DATABASE_URL` (for example to a Neon branch) always wins, and `pnpm db:dev` prints a warning when it is set. On an empty database, `/admin` asks you to create the first panel user.

Uploads go to `./media` unless the four required `S3_*` variables are set. Setting only some of them stops the app at startup. See [Media storage](../media/storage.md).

## Schema changes

`pnpm dev` keeps the local database in sync with the collections through Payload's schema push. Push runs only under `next dev`; everywhere else, including tests and CI, the schema comes from `src/migrations/`.

After changing a collection:

```sh
pnpm migrate:create <name>   # migration for the changes since the last one
pnpm generate:types          # regenerates src/payload-types.ts
```

Commit both with the change. CI fails when `src/payload-types.ts` is stale. After adding admin components, also run `pnpm generate:importmap` and commit the import map. See [Database and migrations](../data/database.md).

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev`, `pnpm build`, `pnpm start` | Next.js. All set `NODE_OPTIONS=--no-deprecation`; `build` also raises the heap to 8000 MB |
| `pnpm lint`, `pnpm format`, `pnpm format:check` | ESLint and Prettier |
| `pnpm typecheck` | `next typegen`, then `tsc --noEmit` |
| `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm test:e2e:dev-gate`, `pnpm test:smoke` | The test suites; see [Test suites](../testing/test-suites.md) |
| `pnpm seed:e2e` | Seeds the E2E test guides, the test achievement page and metalogros, and a panel user (`tests/e2e/seed/`); refuses any database that is not local. The E2E and Lighthouse runs call it themselves |
| `pnpm test:lhci` | Lighthouse CI against the `DESIGN.md` budgets on the production path (port 3110, its own `ta_web_lhci` database); needs Playwright's Chromium (`pnpm exec playwright install chromium`) or `CHROME_PATH`. See [Performance budgets](../testing/performance-budgets.md) |
| `pnpm db:dev` | Embedded Postgres in the foreground; `--verbose` prints its log; Ctrl+C stops it |
| `pnpm migrate` | Applies pending migrations, using `DATABASE_URL_DIRECT` when set, else `DATABASE_URL` |
| `pnpm data:quests` | Downloads every quest from the public DofusDB API (about 2,000), the whole monster catalog (about 5,000) and the whole item catalog (about 21,500), and writes them to `quests`, `items` and `monsters` in the `DATABASE_URL` database (the `pnpm db:dev` one when empty). Then it saves every achievement category and the achievements under Misiones and Eventos with their icons, saves the quest-giving NPCs to `npcs` with their renders (the first run takes a while: two images per NPC), creates the missing metalogros and achievement pages «En preparación», and imports the images of the items and monsters some page shows into `media`. The quest download takes about two and a half minutes; writing takes seconds. Failed requests are retried. Writes 8 rows at a time; `DOFUSDB_WRITE_CONCURRENCY` changes that. Never against production without the owner's yes; see [DofusDB game data refresh](../data/dofusdb-refresh.md) |
| `pnpm import:guides <dir> [slug…]` | Imports Squarespace quest pages from the migration inventory folder into `quest-guides` as drafts, with their images in `media`; without slugs, the five demo guides. Writes to the `DATABASE_URL` database (the `pnpm db:dev` one when empty). Run `pnpm data:quests` first so quests link. Never against production without the owner's yes; see [Squarespace import](../data/squarespace-import.md#running-it) |
| `pnpm import:achievements <datos.json> [--apply] [--remote] [--production]` | Copies Torre's metalogros index (order, names, slugs, states, hand-picked representatives, loose guides) onto `achievement-groups` and `achievement-pages`. Dry run without `--apply`; run after `pnpm data:quests`. See [Importing Torre's achievement pages](../data/achievements-import.md) |
| `pnpm guides:backfill <dir> [--apply] [--remote] [--production]` | Brings guides imported before two importer changes up to date: restores the closing sentence from the cached Squarespace page and turns monster lists into fight blocks. Dry run without `--apply`; run after `pnpm data:quests`. See [Squarespace import](../data/squarespace-import.md#bringing-imported-guides-up-to-date) |
| `pnpm media:sizes [--remote] [--production]` | Generates the missing AVIF/WebP sizes of `media` files uploaded before Payload generated them; safe to rerun. Against a non-local database it needs `--remote`, in production `--production`. See [Media storage](../media/storage.md#backfilling-missing-sizes-pnpm-mediasizes) |
| `pnpm migrate:create <name>` | Writes a new migration |
| `pnpm generate:types`, `pnpm generate:importmap` | Regenerate Payload's types and admin import map |
| `pnpm payload …` | The Payload CLI |
| `node scripts/build-mode-eggs.ts` | Regenerates the AVIF/WebP variants of the mode toggle icons |
| `node scripts/build-icons.ts` | Regenerates the favicon and iOS icon from the emblem and the Arcano colors |

## The component catalog

Under `pnpm dev`, `/sistema` shows every component from `DESIGN.md` in the five themes and both modes. `?tema=bonta&modo=light` keeps one section, which is handy for screenshots. A production build answers 404 there. See [Component catalog (/sistema)](../frontend/component-catalog.md).

## Previewing a guide

Quest guides render at `http://localhost:3000/<slug>` once published. To see a draft, sign in to `/admin` and use the guide's live preview or preview button, which go through `/vista-previa`. The preview origin comes from `NEXT_PUBLIC_SITE_URL` (`http://localhost:3000` in `.env.example`), or the request's own when it is empty. See [Public quest guide page](../frontend/guide-page.md#draft-preview).

## Trying dev mode locally

```sh
APP_ENV=dev pnpm dev
```

Every response then carries `X-Robots-Tag: noindex, nofollow` and `robots.txt` disallows everything. See [Dev environment](../operations/dev-gate.md).

## Agent tooling

`.mcp.json` declares the project MCP servers every agent session shares: Neon, Cloudflare and `next-devtools` (pinned to an exact version), which reads errors, routes and logs from the running `pnpm dev`. Third-party agent skills live in `.claude/skills/`, pinned by hash in `skills-lock.json` and updated with `npx skills update`, never by hand (AGENTS.md, Repo layout).

## Resetting local data

- **Whole cluster**: stop `pnpm db:dev` and delete `.postgres/`. The next `pnpm db:dev` runs `initdb` again and creates an empty `ta_web`; `pnpm dev` pushes the schema, or run `pnpm migrate`.
- **Test databases** (`ta_web_e2e`, `ta_web_integration`, `ta_web_lhci`) are dropped and recreated by their suites on every run and never touch `ta_web`.
- **Old database name**: the database used to be called `torrente_arcano`. `pnpm db:dev` creates an empty `ta_web` when it is missing. To keep the old data, with `pnpm db:dev` running and the app stopped, drop the empty `ta_web` and rename the old one into its place (the README has the exact `psql` commands). Only do it when `ta_web` is the empty database just created.

If `pnpm db:dev` fails to start after a hard shutdown, a stale `.postgres/data/postmaster.pid` is the usual cause; delete it when no other Postgres is running.

## Before committing

The pre-commit hook formats, lints and runs the AI review on staged files; the commit-msg hook enforces conventional commits without `Co-Authored-By`. Before each push, run lint, the format check, types, unit and integration tests locally; run E2E and the dev environment suite once, right before opening the PR. Report failures verbatim. See [CI and quality gates](ci-and-quality-gates.md).

Feature branches do not touch `openwiki/`. A scheduled task outside the repo refreshes the wiki once a day and opens its own docs PR (AGENTS.md, Wiki).

## Related pages

- [Database and migrations](../data/database.md)
- [Test suites](../testing/test-suites.md)
- [CI and quality gates](ci-and-quality-gates.md)
- [Environment configuration](../architecture/configuration.md)
- [DofusDB game data refresh](../data/dofusdb-refresh.md)
- [Performance budgets](../testing/performance-budgets.md)
- [Component catalog (/sistema)](../frontend/component-catalog.md)
