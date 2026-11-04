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
  - id: openwiki-source-4b8e99ccf872ed7c776196a6
    resource: repo://src/migrations/20261104_124207_quest_guides.ts
  - id: openwiki-source-41c7ddbf5fd75671b00c11c5
    resource: repo://src/migrations/20261104_174941_dofusdb_items_rewards.ts
  - id: openwiki-source-b34ee7a9d4905baeede4b1a2
    resource: repo://src/migrations/20261104_192809_dofusdb_item_supertype.ts
  - id: openwiki-source-85d78bb4cb34c9db9944e4d7
    resource: repo://src/migrations/20261104_195910_needs_list.ts
  - id: openwiki-source-c306fbe28866186a2df852b4
    resource: repo://src/migrations/index.ts
  - id: openwiki-source-2c42ff828c6d8e213a2f7416
    resource: repo://src/payload.config.ts
  - id: openwiki-source-a6cdaab0cfeb9dcfe8511d62
    resource: repo://tests/integration/migrations.test.ts
  - id: openwiki-source-5753af90697570a0ebcd954f
    resource: repo://tests/integration/needs-list-migration.test.ts
  - id: openwiki-source-b031ce15fe3cb852929a85bf
    resource: repo://tests/unit/database-url.test.ts
generated: { by: "claude-code", at: "2026-11-04T20:02:15.357Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-04T20:02:15.357Z
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

Migrations live in `src/migrations/` and are listed in `src/migrations/index.ts`. Each has a `.ts` file with `up` and `down` (raw SQL through `db.execute(sql\`…\`)`) and a `.json` snapshot Payload uses to compute the next diff. There are six today:

- `20261103_030359_initial` creates the `users`, `users_sessions`, `media`, `media_variants`, `media_locales` and Payload system tables (`payload_kv`, `payload_locked_documents`, `payload_preferences`, `payload_migrations` and their relation tables).
- `20261104_070541_quests` adds the [quests collection](../cms/collections.md): `quests` with a unique index on `dofus_id`, `quests_locales`, `quests_rels` (for `prerequisites`), `quests_start_positions` and `quests_start_positions_locales`, plus a `quests_id` column on `payload_locked_documents_rels`. Its `down` drops all of them. It does not drop the `payload_locked_documents_rels_quests_fk` constraint separately, because `DROP TABLE "quests" CASCADE` already removes it and a second drop would make the rollback fail.
- `20261104_124207_quest_guides` adds the [quest guides collection](../cms/collections.md): `quest_guides` with a unique index on `slug` and a `_status` enum defaulting to `draft`, `quest_guides_locales`, `quest_guides_rels` (for `quests`), one table plus a `_locales` table per [body block](../cms/blocks.md) type (`quest_guides_blocks_rich_text`, `_image`, `_video`, `_callout`), and the matching version tables under `_quest_guides_v*`, plus a `quest_guides_id` column on `payload_locked_documents_rels`. Payload generated its `down` with the same redundant drop of `payload_locked_documents_rels_quest_guides_fk` as the quests migration; it was removed for the same reason, and a comment in the `down` records it.
- `20261104_174941_dofusdb_items_rewards` adds the [items and monsters collections](../cms/collections.md#items-and-monsters-dofusdb-catalog-data) and the quests' `rewards` and `needs` groups: `items` and `monsters`, each with a unique index on `dofus_id` and a `_locales` table for `name`; the array tables `quests_rewards_items`, `quests_needs_items` and `quests_needs_monsters`, whose `item_id` or `monster_id` references `items` or `monsters`; `quests_numbers`, where Payload stores the `hasMany` number fields (`emoteIds`, `spellIds`, `titleIds`, `jobIds`) keyed by `path`; and the columns `rewards_experience`, `rewards_kamas` and `needs_walks_maps` on `quests`, plus `items_id` and `monsters_id` on `payload_locked_documents_rels`. Payload generated its `down` with redundant drops of `payload_locked_documents_rels_items_fk` and `payload_locked_documents_rels_monsters_fk`; they were removed because `DROP TABLE "items" CASCADE` and `DROP TABLE "monsters" CASCADE` already remove them, and a comment in the `down` records it.
- `20261104_192809_dofusdb_item_supertype` adds the nullable numeric `super_type_id` column to `items` for the items' DofusDB supertype; its `down` drops the column.
- `20261104_195910_needs_list` turns a quest guide's "Necesitarás" from text into an item list plus notes (see [Collections and access](../cms/collections.md#the-summary-and-its-needs-list)). It creates `quest_guides_summary_needs_items` and its version twin `_quest_guides_v_version_summary_needs_items` (`_order`, `_parent_id`, `item_id` referencing `items` with `ON DELETE set null`, `quantity` defaulting to 1), and renames the localized text column instead of dropping it: `quest_guides_locales.summary_needs` becomes `summary_needs_notes` and `_quest_guides_v_locales.version_summary_needs` becomes `version_summary_needs_notes`. Existing guides and versions keep their text, per locale, as notes. Its `down` drops both list tables and renames the columns back, so the notes return to the old text column but **the item rows are lost**: the earlier schema has nowhere to store them. A comment at the top of the file says so.

Every migration must roll back cleanly: if a `down` fails, a bad deploy has no way back. `tests/integration/migrations.test.ts` checks this for the latest migration (the last entry in `src/migrations/index.ts`, today `20261104_195910_needs_list`). It runs the Payload CLI, `pnpm payload migrate:down` and then `pnpm payload migrate`, against the integration database with `DATABASE_CONNECTION=direct`, and asserts the latest migration is rolled back and then re-applied, so the database ends as it started. It uses the CLI because Payload imports migration files with Node, not Vitest. It avoids `migrate:refresh`, which in Payload 3.92 rolls back oldest first and fails. When a command fails, the test rethrows with the CLI's stdout and stderr so the Postgres error is visible. Starting the CLI twice can pass the suite's 30 s default on a loaded machine, so this test has its own 120 s timeout.

`tests/integration/needs-list-migration.test.ts` checks the needs list migration on real data rather than an empty schema. It creates a guide with notes, calls that migration's `down` and `up` functions directly on the fully migrated integration database, and in between checks the text is back in `summary_needs` and writes a different text into the old columns of the guide and its versions, as a guide imported before the list would have. After `up`, the guide and its version read that text as `summary.needs.notes`, with an empty item list. `up` runs in a `finally` so a failed assertion never leaves the test database on the old schema.

In deployed environments, Railway runs `pnpm migrate` as the pre-deploy command with a 600-second timeout. If it fails, the deploy stops and the previous version keeps serving. See [Deployment and releases](../operations/deployment.md).

### Changing the schema

1. Edit the collection (TDD: test first).
2. `pnpm migrate:create <name>` writes the migration for the changes since the last one.
3. `pnpm generate:types` regenerates `src/payload-types.ts`.
4. Commit both with the change. CI fails when the types are stale, and the integration and E2E suites run the migrations from scratch. The integration suite also rolls back and re-applies the latest migration, so a broken `down` fails it.

## Connection resilience

- The pool's `connectionTimeoutMillis` is 5000, so acquiring a connection gives up instead of hanging.
- An `error` listener on the pool, attached in Payload's `onInit`, logs idle-connection failures (Neon restarts idle connections) so they do not crash the process.
- The health check uses its own short-lived transaction with a local `statement_timeout` and discards connections that fail or time out. See [Health check endpoint](../operations/health-check.md).

## Related pages

- [Environment configuration](../architecture/configuration.md)
- [Local development](../workflows/local-development.md)
- [Test suites](../testing/test-suites.md)
- [Deployment and releases](../operations/deployment.md)
