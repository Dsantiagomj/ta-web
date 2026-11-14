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
  - id: openwiki-source-79d3d2760afd733db53a957b
    resource: repo://scripts/dev-database-process.ts
  - id: openwiki-source-95f46342bb37caacc4ce1dbc
    resource: repo://scripts/lhci.ts
  - id: openwiki-source-3fe9a34acf3018511853df91
    resource: repo://scripts/reset-dev-database.ts
  - id: openwiki-source-b8d2cb44b5c8224f8b87d0ce
    resource: repo://scripts/seed-e2e.ts
  - id: openwiki-source-2ad419cae2f45e97a3ca23d7
    resource: repo://src/lib/db/database-url.ts
  - id: openwiki-source-ad9e301a598e436556d400c8
    resource: repo://src/lib/db/dev-database.ts
  - id: openwiki-source-7c66f643dce69fb67291a883
    resource: repo://src/lib/db/script-guard.ts
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
  - id: openwiki-source-611c09c74fb71abeaf12e825
    resource: repo://src/migrations/20261104_210644_guide_single_quest.ts
  - id: openwiki-source-922da9e2410f4ca8639900d8
    resource: repo://src/migrations/20261105_103713_media_image_sizes.ts
  - id: openwiki-source-5772478547a0acf93b6f488d
    resource: repo://src/migrations/20261106_010549_guide_v4_quest_npcs.ts
  - id: openwiki-source-6cded578ebe9709336be56d3
    resource: repo://src/migrations/20261107_020402_guide_v5_game_images_fight.ts
  - id: openwiki-source-ff63dd6e9c5f43e5fda587e9
    resource: repo://src/migrations/20261107_210926_achievements_game_data.ts
  - id: openwiki-source-fce23fceacb9677eb9f474e0
    resource: repo://src/migrations/20261107_214742_achievement_pages_groups.ts
  - id: openwiki-source-8cee9b8055521507acd77791
    resource: repo://src/migrations/20261110_000232_dofus_guides.ts
  - id: openwiki-source-d462e46422713a0edb8d11fa
    resource: repo://src/migrations/20261110_052805_dofus_guides_import.ts
  - id: openwiki-source-4bfd0e775c12eadebbe4636f
    resource: repo://src/migrations/20261110_131101_dofus_guides_index.ts
  - id: openwiki-source-5adca977fa05d4c902072c3e
    resource: repo://src/migrations/20261113_011531_quest_stages.ts
  - id: openwiki-source-0d658c90872d5b6e2aaf6873
    resource: repo://src/migrations/20261113_232009_quest_guide_dungeon_picks.ts
  - id: openwiki-source-283eae30e65b21a6738bd616
    resource: repo://src/migrations/20261114_011851_users_roles.ts
  - id: openwiki-source-c306fbe28866186a2df852b4
    resource: repo://src/migrations/index.ts
  - id: openwiki-source-2c42ff828c6d8e213a2f7416
    resource: repo://src/payload.config.ts
  - id: openwiki-source-b099772c2f58d976c651450a
    resource: repo://tests/integration/fixtures/import-disconnect.ts
  - id: openwiki-source-450b6a23d7e25100eadc359f
    resource: repo://tests/integration/global-setup.ts
  - id: openwiki-source-8f0065e4504cfadc651f72a5
    resource: repo://tests/integration/guide-single-quest-migration.test.ts
  - id: openwiki-source-a6cdaab0cfeb9dcfe8511d62
    resource: repo://tests/integration/migrations.test.ts
  - id: openwiki-source-5753af90697570a0ebcd954f
    resource: repo://tests/integration/needs-list-migration.test.ts
  - id: openwiki-source-b031ce15fe3cb852929a85bf
    resource: repo://tests/unit/database-url.test.ts
generated: { by: "claude-code", at: "2026-11-14T11:00:46.827Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-14T11:00:46.827Z
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

`isLocalDatabaseUrl` answers whether a URL points at this machine (`localhost`, `127.0.0.1` or `[::1]`): the embedded database or CI's service Postgres. `pnpm seed:e2e` refuses to run against any other database, so test guides are never seeded into a real one; a host that only starts with `localhost` or a string that is not a URL fails the check.

Scripts that write editorial data use a stricter guard, `databaseScriptRefusal` (`src/lib/db/script-guard.ts`), checked before Payload starts. `pnpm import:achievements` uses it. In production (`APP_ENV`, `RAILWAY_ENVIRONMENT_NAME` or `NODE_ENV` set to `production`) the script needs `--production`; against a database on another host it needs `--remote`, because from outside the dev database and the production one cannot be told apart. An empty `DATABASE_URL`, the embedded database, needs no flag. See [Importing Torre's achievement pages](achievements-import.md#database-guard).

## The embedded development database

`src/lib/db/dev-database.ts` is the single source for the embedded database settings:

| Setting | Value |
|---|---|
| Host and port | `127.0.0.1:54329` (not 5432, to avoid a system Postgres) |
| User and password | `postgres` / `postgres` |
| App database | `ta_web` |
| E2E database | `ta_web_e2e`, dropped and migrated on every E2E run |
| Integration database | `ta_web_integration`, dropped and migrated on every integration run |
| Lighthouse CI database | `ta_web_lhci`, dropped and migrated on every `pnpm test:lhci` run |
| Data directory | `.postgres/data` (git-ignored) |

`scripts/db-dev.ts` runs `initdb` only when `.postgres/data/PG_VERSION` is missing, starts the server in the foreground, creates `ta_web` if absent, warns when `DATABASE_URL` is set (the app would use that one instead), and stops cleanly on `SIGINT`/`SIGTERM`. `--verbose` prints Postgres's log.

`scripts/reset-dev-database.ts` exports `resetDevDatabase(name)`, which runs `DROP DATABASE IF EXISTS … WITH (FORCE)` and `CREATE DATABASE` for one named database inside that cluster. The E2E, integration and Lighthouse CI setups use it; it never touches `ta_web`.

The module also builds one URL per database: `DEV_DATABASE_URL`, `E2E_DATABASE_URL`, `INTEGRATION_DATABASE_URL` and `LHCI_DATABASE_URL`.

`scripts/dev-database-process.ts` is shared by the suites that need the cluster but are not run by Playwright (integration and Lighthouse CI). `ensureDevDatabase()` checks whether something already listens on the embedded port; if not, it spawns `scripts/db-dev.ts`, waits up to 120 seconds for the port to open, and returns the child process so the caller can stop it afterwards. If the port never opens it stops the child before rethrowing, so no Postgres is left running. `stopProcess(child)` sends `SIGTERM` and resolves on exit, or at once when the process has already exited or been killed by a signal. A Postgres that was already running is reused and left alone. See [Performance budgets](../testing/performance-budgets.md) and [Test suites](../testing/test-suites.md).

To start over locally, stop `pnpm db:dev` and delete `.postgres/`.

## Schema push versus migrations

Payload can either push the schema straight from the collection config or apply versioned migrations. `shouldPushSchema` allows push only when `NODE_ENV` is `development`, which is `next dev`. Payload's own default would push whenever `NODE_ENV` is not `production`, including when it is unset, so the function pins the behavior.

| Context | Schema source |
|---|---|
| `pnpm dev` | Push, kept in sync with the collections automatically |
| Unit and integration tests, E2E, CI, Railway | Committed migrations in `src/migrations/`, applied by `pnpm migrate` |

This means E2E and CI exercise the same path as production: an empty database plus migrations.

## Migrations

Migrations live in `src/migrations/` and are listed in `src/migrations/index.ts`. Each has a `.ts` file with `up` and `down` (raw SQL through `db.execute(sql\`…\`)`) and a `.json` snapshot Payload uses to compute the next diff. There are twenty-eight today:

- `20261103_030359_initial` creates the `users`, `users_sessions`, `media`, `media_variants`, `media_locales` and Payload system tables (`payload_kv`, `payload_locked_documents`, `payload_preferences`, `payload_migrations` and their relation tables).
- `20261104_070541_quests` adds the [quests collection](../cms/collections.md): `quests` with a unique index on `dofus_id`, `quests_locales`, `quests_rels` (for `prerequisites`), `quests_start_positions` and `quests_start_positions_locales`, plus a `quests_id` column on `payload_locked_documents_rels`. Its `down` drops all of them. It does not drop the `payload_locked_documents_rels_quests_fk` constraint separately, because `DROP TABLE "quests" CASCADE` already removes it and a second drop would make the rollback fail.
- `20261104_124207_quest_guides` adds the [quest guides collection](../cms/collections.md): `quest_guides` with a unique index on `slug` and a `_status` enum defaulting to `draft`, `quest_guides_locales`, `quest_guides_rels` (for the guide's quests, later replaced by a single column), one table plus a `_locales` table per [body block](../cms/blocks.md) type (`quest_guides_blocks_rich_text`, `_image`, `_video`, `_callout`), and the matching version tables under `_quest_guides_v*`, plus a `quest_guides_id` column on `payload_locked_documents_rels`. Payload generated its `down` with the same redundant drop of `payload_locked_documents_rels_quest_guides_fk` as the quests migration; it was removed for the same reason, and a comment in the `down` records it.
- `20261104_174941_dofusdb_items_rewards` adds the [items and monsters collections](../cms/collections.md#items-and-monsters-dofusdb-catalog-data) and the quests' `rewards` and `needs` groups: `items` and `monsters`, each with a unique index on `dofus_id` and a `_locales` table for `name`; the array tables `quests_rewards_items`, `quests_needs_items` and `quests_needs_monsters`, whose `item_id` or `monster_id` references `items` or `monsters`; `quests_numbers`, where Payload stores the `hasMany` number fields (`emoteIds`, `spellIds`, `titleIds`, `jobIds`) keyed by `path`; and the columns `rewards_experience`, `rewards_kamas` and `needs_walks_maps` on `quests`, plus `items_id` and `monsters_id` on `payload_locked_documents_rels`. Payload generated its `down` with redundant drops of `payload_locked_documents_rels_items_fk` and `payload_locked_documents_rels_monsters_fk`; they were removed because `DROP TABLE "items" CASCADE` and `DROP TABLE "monsters" CASCADE` already remove them, and a comment in the `down` records it.
- `20261104_192809_dofusdb_item_supertype` adds the nullable numeric `super_type_id` column to `items` for the items' DofusDB supertype; its `down` drops the column.
- `20261104_195910_needs_list` turns a quest guide's "Necesitarás" from text into an item list plus notes (see [Collections and access](../cms/collections.md#the-summary-and-its-needs-list)). It creates `quest_guides_summary_needs_items` and its version twin `_quest_guides_v_version_summary_needs_items` (`_order`, `_parent_id`, `item_id` referencing `items` with `ON DELETE set null`, `quantity` defaulting to 1), and renames the localized text column instead of dropping it: `quest_guides_locales.summary_needs` becomes `summary_needs_notes` and `_quest_guides_v_locales.version_summary_needs` becomes `version_summary_needs_notes`. Existing guides and versions keep their text, per locale, as notes. Its `down` drops both list tables and renames the columns back, so the notes return to the old text column but **the item rows are lost**: the earlier schema has nowhere to store them. A comment at the top of the file says so.
- `20261104_210644_guide_single_quest` makes a quest guide link a single quest (see [Collections and access](../cms/collections.md#quest-guides-editorial-guides-with-drafts)). Its `up` adds `quest_guides.quest_id` and `_quest_guides_v.version_quest_id`, copies into them the first linked quest of each guide and each version (the `quest_guides_rels` or `_quest_guides_v_rels` row with the lowest `order`), and only then drops both relation tables. It adds foreign keys from the new columns to `quests` with `ON DELETE set null` and an index on each. Its `down` recreates the two relation tables, writes each linked quest back as a relation row with `order` 1, and drops the columns. A guide that had several quests keeps only the first after `up`, and `down` cannot bring the others back.
- `20261105_103713_media_image_sizes` moves media variants to Payload image sizes: it drops `media_variants` and adds `sizes_<format>_<width>_*` columns (URL, width, height, MIME type, file size and filename, with a filename index) for each AVIF and WebP width on `media`. Its `down` recreates `media_variants` and drops the size columns. See [Media storage](../media/storage.md).
- `20261105_135506_guide_step_block` adds the step block: `quest_guides_blocks_step` with numeric `x` and `y`, its `_locales` table for the title, and the version twins. See [Guide body blocks](../cms/blocks.md#step).
- `20261106_010549_guide_v4_quest_npcs` adds the [NPCs collection](../cms/collections.md#npcs-quest-givers-and-their-renders): `npcs` (with `render_right_id` and `render_left_id` referencing `media` with `ON DELETE set null`) and `npcs_locales`, `media.game_asset`, the quest achievement columns and `rewards_experience_min` on `quests`, `zone` and `achievement_name` on `quests_locales`, and `npcs_id` on `payload_locked_documents_rels`. Its `down` drops all of them.
- `20261107_020402_guide_v5_game_images_fight` adds the fight block, `quest_guides_blocks_fight` with its `quest_guides_blocks_fight_monsters` rows and their version twins, and an `image_id` column on `items` and `monsters` referencing `media` with `ON DELETE set null`, for the game images the refresh imports. See [Guide body blocks](../cms/blocks.md#fight).
- `20261107_143215_remove_step_title` removes the step title. Before dropping `quest_guides_blocks_step_locales` and its version twin, it moves every non-empty title into a new bold first text block of its step, in the guide and all its versions. `tests/integration/remove-step-title-migration.test.ts` checks the move. See [Guide body blocks](../cms/blocks.md#step).
- `20261107_210926_achievements_game_data` adds the DofusDB achievement collections: `achievement_categories` and `achievements`, their `_locales` tables, `achievements_quests`, `achievements_rewards_items`, `achievements_counts_for`, `achievements_rels`, and the matching `payload_locked_documents_rels` columns.
- `20261107_214742_achievement_pages_groups` adds Torre's achievement pages and metalogros: `achievement_pages` and `achievement_groups` with their `_locales`, `_rels`, quest and reward item tables, and the `_achievement_pages_v` and `_achievement_groups_v` version tables. See [Achievement data model](../achievements/achievement-data.md).
- `20261110_000232_dofus_guides` adds Torre's Dofus guides: `dofus_guides` with `_locales` and `_rels`, the Necesitarás group tables, one table (and `_locales` table) per part block and body block, the metalogro rows in `dofus_meta_ach` (a short `dbName`, because the default name of its version index passes Postgres's 63-character limit), and the `_dofus_guides_v` version twins. See [Dofus guide data model](../dofus-guides/dofus-guide-data.md).
- `20261110_052805_dofus_guides_import` adds the columns the import needs: `video_poster_id` (a foreign key to `media`, `ON DELETE set null`) and the `import_snapshot` jsonb, on `dofus_guides` and its version table.
- `20261110_131101_dofus_guides_index` adds the `dofus-guides-index` global: `dofus_guides_index` and `dofus_guides_index_locales` with the localized `intro`.
- `20261113_011531_quest_stages` adds each quest's DofusDB stages and objectives: `quests_stages`, `quests_stages_objectives` and their `_locales` tables.
- `20261113_151549_checklists` adds the [checklists collection](../checklists/checklist-data.md): `checklists` with its steps, segments, prerequisite groups and rows, step achievements and quests, their `_locales`, `_rels`, `_texts` and `_numbers` tables, and the `_checklists_v` version twins.
- `20261113_160051_checklist_needs` adds the steps' «Necesitarás» rows (`checklists_steps_needs` and its locales, with the text label, group and totals flag) and their version twins.
- `20261113_174951_subareas` adds the `subareas` game data collection with its locales.
- `20261113_175047_checklist_step_zone` adds the localized `zone` of each checklist step.
- `20261113_183838_dungeons` adds the `dungeons` game data collection, its locales and `dungeons_rels` for the bosses.
- `20261113_232007_achievement_prose_snapshot` adds `import_snapshot` to `achievement_pages` and its version table, for the [prose import](achievement-prose-import.md).
- `20261113_232009_quest_guide_dungeon_picks` adds a quest guide's hand-picked dungeons (`quest_guides_summary_needs_dungeons` and its locales) and their version twins.
- `20261114_000512_checklist_owned_moves` adds `legacy.ownedMoves` to checklists, for the progress migration.
- `20261114_003108_users_name` adds a panel account's `name`.
- `20261114_011851_users_roles` adds `users.role` (`admin` or `editor`). It creates the column with default `admin`, so every account that existed then becomes an admin, and then sets the default to `editor` for new accounts. `tests/integration/users-roles-migration.test.ts` checks this. See [Admin panel](../cms/admin-panel.md).

Every migration must roll back cleanly: if a `down` fails, a bad deploy has no way back. `tests/integration/migrations.test.ts` checks this for the latest migration (the last entry in `src/migrations/index.ts`, today `20261114_011851_users_roles`). It runs the Payload CLI, `pnpm payload migrate:down` and then `pnpm payload migrate`, against the integration database with `DATABASE_CONNECTION=direct`, and asserts the latest migration is rolled back and then re-applied, so the database ends as it started. It uses the CLI because Payload imports migration files with Node, not Vitest. It avoids `migrate:refresh`, which in Payload 3.92 rolls back oldest first and fails. When a command fails, the test rethrows with the CLI's stdout and stderr so the Postgres error is visible. Starting the CLI twice can pass the suite's 30 s default on a loaded machine, so this test has its own 120 s timeout.

`tests/integration/needs-list-migration.test.ts` checks the needs list migration on real data rather than an empty schema. It creates a guide with notes, calls that migration's `down` and `up` functions directly on the fully migrated integration database, and in between checks the text is back in `summary_needs` and writes a different text into the old columns of the guide and its versions, as a guide imported before the list would have. After `up`, the guide and its version read that text as `summary.needs.notes`, with an empty item list. `up` runs in a `finally` so a failed assertion never leaves the test database on the old schema.

`tests/integration/guide-single-quest-migration.test.ts` checks the single-quest migration the same way, in both directions. It creates a guide linked to one quest and calls that migration's `down`: the quest is back as a relation row for the guide and for its version. It then adds a second quest with `order` 2 to both and runs `up` in a `finally`. Afterwards `quest_id` and `version_quest_id` hold the first quest, and Payload reads it as `quest` on the guide and on its versions.

In deployed environments, Railway runs `pnpm migrate` as the pre-deploy command with a 600-second timeout. If it fails, the deploy stops and the previous version keeps serving. See [Deployment and releases](../operations/deployment.md).

### Changing the schema

1. Edit the collection (TDD: test first).
2. `pnpm migrate:create <name>` writes the migration for the changes since the last one.
3. `pnpm generate:types` regenerates `src/payload-types.ts`.
4. Commit both with the change. CI fails when the types are stale, and the integration and E2E suites run the migrations from scratch. The integration suite also rolls back and re-applies the latest migration, so a broken `down` fails it.

## Connection resilience

- The pool's `connectionTimeoutMillis` is 5000, so acquiring a connection gives up instead of hanging.
- An `error` listener on the pool, attached in Payload's `onInit`, logs idle-connection failures (Neon restarts idle connections) so they do not crash the process.
- `pg` takes the pool's listener off a client while it is checked out, so `pool.onConnect` gives every client its own `error` listener. A connection lost in the middle of a transaction is logged (`Conexión de Postgres prestada perdida`) instead of crashing the process. The code that owns the transaction gets the error and releases the client, `pg` drops a client that can no longer run queries, and nothing retries the transaction. `tests/integration/import-disconnect.test.ts` proves this against a real backend kill; see [Squarespace import](squarespace-import.md).
- The health check uses its own short-lived transaction with a local `statement_timeout` and discards connections that fail or time out. See [Health check endpoint](../operations/health-check.md).

## Related pages

- [Environment configuration](../architecture/configuration.md)
- [Local development](../workflows/local-development.md)
- [Test suites](../testing/test-suites.md)
- [Deployment and releases](../operations/deployment.md)
