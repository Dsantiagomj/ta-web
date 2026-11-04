---
type: architecture
title: Database and migrations
description: How the app picks its Postgres connection (pooled, direct or the embedded dev database), when Payload pushes the schema versus applying committed migrations, and how to change the schema safely.
tags: [database, postgres, neon, migrations, payload]
sources:
  - id: openwiki-source-d60a6f0f1e9b6eab797ff859
    resource: repo://.railway/railway.ts
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-71c840280649a7620f8e010f
    resource: repo://scripts/db-dev.ts
  - id: openwiki-source-3fe9a34acf3018511853df91
    resource: repo://scripts/reset-dev-database.ts
  - id: openwiki-source-2ad419cae2f45e97a3ca23d7
    resource: repo://src/lib/db/database-url.ts
  - id: openwiki-source-ad9e301a598e436556d400c8
    resource: repo://src/lib/db/dev-database.ts
  - id: openwiki-source-4b2f49d061cc7bd95a39ce1a
    resource: repo://src/migrations/20261103_030359_initial.ts
  - id: openwiki-source-a4ca0c9844f6e5f5c7edac75
    resource: repo://src/migrations/20261104_070541_quests.ts
  - id: openwiki-source-c306fbe28866186a2df852b4
    resource: repo://src/migrations/index.ts
  - id: openwiki-source-2c42ff828c6d8e213a2f7416
    resource: repo://src/payload.config.ts
  - id: openwiki-source-b031ce15fe3cb852929a85bf
    resource: repo://tests/unit/database-url.test.ts
generated: { by: "claude-code", at: "2026-11-04T07:07:46.246Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-04T07:07:46.246Z
---

# Database and migrations

The app uses Postgres through Payload's Postgres adapter. Deployed environments use Neon; local development and tests use an embedded Postgres 17 started by `pnpm db:dev`, with no Docker and no system install. Our own tables through Drizzle (member progress) are planned and do not exist yet.

## Connection resolution

`resolveDatabaseUrl` in `src/lib/db/database-url.ts` decides the connection string. It has two callers with different needs:

| Caller | URL used | Why |
|---|---|---|
| The running app | `DATABASE_URL` (Neon's pooled URL) | Many short connections through the pooler |
| `pnpm migrate` (sets `DATABASE_CONNECTION=direct`) | `DATABASE_URL_DIRECT` if set, else `DATABASE_URL` | Migrations need a long session and locks, which the pooler does not support |

The running app ignores `DATABASE_URL_DIRECT` entirely; having only the direct URL is not enough to start in production.

When no URL is set:

- In production (`NODE_ENV=production`) it throws: `Falta DATABASE_URL: en producción no hay base de datos por defecto`. A deployed app never silently connects to a local database.
- During `next build` (`NEXT_PHASE=phase-production-build`) it returns the dev URL, because the build opens no connections.
- Everywhere else it returns the embedded dev database URL.

A blank or whitespace-only value counts as unset. `tests/unit/database-url.test.ts` covers each branch.

## The embedded development database

`src/lib/db/dev-database.ts` is the single source for the embedded database settings:

| Setting | Value |
|---|---|
| Host and port | `127.0.0.1:54329` (not 5432, to avoid a system Postgres) |
| User and password | `postgres` / `postgres` |
| App database | `ta_web` |
| E2E database | `ta_web_e2e`, dropped and migrated on every E2E run |
| Integration database | `ta_web_integration`, dropped and migrated on every integration run |
| Data directory | `.postgres/data` (git-ignored) |

`scripts/db-dev.ts` runs `initdb` only when `.postgres/data/PG_VERSION` is missing, starts the server in the foreground, creates `ta_web` if absent, warns when `DATABASE_URL` is set (the app would use that one instead), and stops cleanly on `SIGINT`/`SIGTERM`. `--verbose` prints Postgres's log.

`scripts/reset-dev-database.ts` exports `resetDevDatabase(name)`, which runs `DROP DATABASE IF EXISTS … WITH (FORCE)` and `CREATE DATABASE` for one named database inside that cluster. The E2E and integration setups use it; it never touches `ta_web`.

To start over locally, stop `pnpm db:dev` and delete `.postgres/`.

## Schema push versus migrations

Payload can either push the schema straight from the collection config or apply versioned migrations. `shouldPushSchema` allows push only when `NODE_ENV` is `development`, which is `next dev`. Payload's own default would push whenever `NODE_ENV` is not `production`, including when it is unset, so the function pins the behavior.

| Context | Schema source |
|---|---|
| `pnpm dev` | Push, kept in sync with the collections automatically |
| Unit and integration tests, E2E, CI, Railway | Committed migrations in `src/migrations/`, applied by `pnpm migrate` |

This means E2E and CI exercise the same path as production: an empty database plus migrations.

## Migrations

Migrations live in `src/migrations/` and are listed in `src/migrations/index.ts`. Each has a `.ts` file with `up` and `down` (raw SQL through `db.execute(sql\`…\`)`) and a `.json` snapshot Payload uses to compute the next diff. There are two today:

- `20261103_030359_initial` creates the `users`, `users_sessions`, `media`, `media_variants`, `media_locales` and Payload system tables (`payload_kv`, `payload_locked_documents`, `payload_preferences`, `payload_migrations` and their relation tables).
- `20261104_070541_quests` adds the [quests collection](../cms/collections.md): `quests` with a unique index on `dofus_id`, `quests_locales`, `quests_rels` (for `prerequisites`), `quests_start_positions` and `quests_start_positions_locales`, plus a `quests_id` column on `payload_locked_documents_rels`. Its `down` drops all of them.

In deployed environments, Railway runs `pnpm migrate` as the pre-deploy command with a 600-second timeout. If it fails, the deploy stops and the previous version keeps serving. See [Deployment and releases](../operations/deployment.md).

### Changing the schema

1. Edit the collection (TDD: test first).
2. `pnpm migrate:create <name>` writes the migration for the changes since the last one.
3. `pnpm generate:types` regenerates `src/payload-types.ts`.
4. Commit both with the change. CI fails when the types are stale, and the integration and E2E suites run the migrations from scratch.

## Connection resilience

- The pool's `connectionTimeoutMillis` is 5000, so acquiring a connection gives up instead of hanging.
- An `error` listener on the pool, attached in Payload's `onInit`, logs idle-connection failures (Neon restarts idle connections) so they do not crash the process.
- The health check uses its own short-lived transaction with a local `statement_timeout` and discards connections that fail or time out. See [Health check endpoint](../operations/health-check.md).

## Related pages

- [Environment configuration](../architecture/configuration.md)
- [Local development](../workflows/local-development.md)
- [Test suites](../testing/test-suites.md)
- [Deployment and releases](../operations/deployment.md)
