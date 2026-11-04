---
type: workflow
title: Local development
description: How to set up and run ta-web on a laptop with no Docker or system Postgres, the scripts you use day to day, how to change the schema, and how to reset local data.
tags: [development, setup, pnpm, postgres, workflow]
sources:
  - id: openwiki-source-5f5b95b3d6a215fa02ceb945
    resource: repo://.env.example
  - id: openwiki-source-7c03237a6b57ffb3e526a51b
    resource: repo://.nvmrc
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-40275cb92c3610938f16ade3
    resource: repo://pnpm-workspace.yaml
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-71c840280649a7620f8e010f
    resource: repo://scripts/db-dev.ts
  - id: openwiki-source-9e87f9929ce6181cecc80fe9
    resource: repo://scripts/import/import-guides.ts
  - id: openwiki-source-63cbcc482c18e4f9ce5d0888
    resource: repo://scripts/refresh-quests.ts
  - id: openwiki-source-2ad419cae2f45e97a3ca23d7
    resource: repo://src/lib/db/database-url.ts
generated: { by: "claude-code", at: "2026-11-04T17:14:51.499Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-04T17:14:51.499Z
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
| `pnpm db:dev` | Embedded Postgres in the foreground; `--verbose` prints its log; Ctrl+C stops it |
| `pnpm migrate` | Applies pending migrations, using `DATABASE_URL_DIRECT` when set, else `DATABASE_URL` |
| `pnpm data:quests` | Downloads every quest from the public DofusDB API and writes them to `quests` in the `DATABASE_URL` database (the `pnpm db:dev` one when empty). Never against production without the owner's yes; see [DofusDB game data refresh](../data/dofusdb-refresh.md) |
| `pnpm import:guides <dir> [slug…]` | Imports Squarespace quest pages from the migration inventory folder into `quest-guides` as drafts, with their images in `media`; without slugs, the five demo guides. Writes to the `DATABASE_URL` database (the `pnpm db:dev` one when empty). Run `pnpm data:quests` first so quests link. Never against production without the owner's yes; see [Squarespace import](../data/squarespace-import.md#running-it) |
| `pnpm migrate:create <name>` | Writes a new migration |
| `pnpm generate:types`, `pnpm generate:importmap` | Regenerate Payload's types and admin import map |
| `pnpm payload …` | The Payload CLI |
| `node scripts/build-mode-eggs.ts` | Regenerates the AVIF/WebP variants of the mode toggle icons |

## Trying the dev gate locally

```sh
APP_ENV=dev DEV_BASIC_AUTH_USER=torre DEV_BASIC_AUTH_PASSWORD=clave pnpm dev
```

See [Dev environment gate](../operations/dev-gate.md).

## Resetting local data

- **Whole cluster**: stop `pnpm db:dev` and delete `.postgres/`. The next `pnpm db:dev` runs `initdb` again and creates an empty `ta_web`; `pnpm dev` pushes the schema, or run `pnpm migrate`.
- **Test databases** (`ta_web_e2e`, `ta_web_integration`) are dropped and recreated by their suites on every run and never touch `ta_web`.
- **Old database name**: the database used to be called `torrente_arcano`. `pnpm db:dev` creates an empty `ta_web` when it is missing. To keep the old data, with `pnpm db:dev` running and the app stopped, drop the empty `ta_web` and rename the old one into its place (the README has the exact `psql` commands). Only do it when `ta_web` is the empty database just created.

If `pnpm db:dev` fails to start after a hard shutdown, a stale `.postgres/data/postmaster.pid` is the usual cause; delete it when no other Postgres is running.

## Before committing

The pre-commit hook formats, lints and runs the AI review on staged files; the commit-msg hook enforces conventional commits without `Co-Authored-By`. Before each push, run lint, the format check, types, unit and integration tests locally; run E2E and the dev gate suite once, right before opening the PR. Report failures verbatim. See [CI and quality gates](ci-and-quality-gates.md).

## Related pages

- [Database and migrations](../data/database.md)
- [Test suites](../testing/test-suites.md)
- [CI and quality gates](ci-and-quality-gates.md)
- [Environment configuration](../architecture/configuration.md)
- [DofusDB game data refresh](../data/dofusdb-refresh.md)
