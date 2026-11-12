---
type: architecture
title: Payload CMS configuration
description: How Payload CMS 3 is embedded in the Next.js app through src/payload.config.ts, which files Payload generates, and where to extend collections, endpoints and plugins.
tags: [payload, cms, configuration, nextjs]
sources:
  - id: openwiki-source-1364a33be7315005959b4797
    resource: repo://.gga
  - id: openwiki-source-50a18d054b596a7ed0eeffb0
    resource: repo://next.config.ts
  - id: openwiki-source-098744f35eb292781a6734eb
    resource: repo://src/app/(payload)/admin/importMap.js
  - id: openwiki-source-44aeca5f08eb84b9d5189371
    resource: repo://src/collections/achievement-fields.ts
  - id: openwiki-source-7a2723ea85824e431ff5eb54
    resource: repo://src/collections/QuestGuides.ts
  - id: openwiki-source-5e8f77fd185a0f97b7ae1c42
    resource: repo://src/components/quest-guide-admin/linked-quest.ts
  - id: openwiki-source-96b94ee077b0d0a0987ef203
    resource: repo://src/components/quest-guide-admin/QuestAutofill.tsx
  - id: openwiki-source-0a4faad5eab8d765028627d7
    resource: repo://src/components/quest-guide-admin/SummaryNote.tsx
  - id: openwiki-source-2ad419cae2f45e97a3ca23d7
    resource: repo://src/lib/db/database-url.ts
  - id: openwiki-source-47a80445306e82d0ef444872
    resource: repo://src/lib/media/storage.ts
  - id: openwiki-source-dfda0f9810a7fbac89e48a40
    resource: repo://src/payload-types.ts
  - id: openwiki-source-2c42ff828c6d8e213a2f7416
    resource: repo://src/payload.config.ts
  - id: openwiki-source-98d5ddb014a0fd4d678f6f2a
    resource: repo://tsconfig.json
generated: { by: "claude-code", at: "2026-11-12T11:00:44.802Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-12T11:00:44.802Z
---

# Payload CMS configuration

Payload 3 runs inside the Next.js process. There is one config, `src/payload.config.ts`, exported through `buildConfig`. Everything else imports it through the `@payload-config` path alias declared in `tsconfig.json`: the generated admin and API routes, the integration tests (`getPayload({ config })`) and the Payload CLI (`pnpm payload`, `pnpm migrate`, `pnpm generate:types`).

## What the config sets

| Key | Value | Why |
|---|---|---|
| `admin.user` | `users` | Panel accounts; see [Collections and access](collections.md) |
| `admin.importMap.baseDir` | `src/` | Where `generate:importmap` resolves admin components |
| `collections` | `[Users, Media, Quests, Items, Monsters, Npcs, AchievementCategories, Achievements, QuestGuides, AchievementPages, AchievementGroups, DofusGuides]` | One file per collection in `src/collections/`; `quests`, `items`, `monsters`, `npcs`, `achievement-categories` and `achievements` are read-only DofusDB game data. See [Achievement data model](../achievements/achievement-data.md) and [Dofus guide data model](../dofus-guides/dofus-guide-data.md) |
| `globals` | `[DofusGuidesIndex]` | One file per global in `src/globals/`; the only one is the intro of the `/guias-dofus` index. See [Dofus guides index and menu](../dofus-guides/dofus-guides-index.md) |
| `editor` | `lexicalEditor()` | Default rich text editor; the guide body blocks use it (see [Guide body blocks](blocks.md)) |
| `endpoints` | `[healthEndpoint, searchIndexEndpoint, dofusDbValuesEndpoint]` | Custom endpoints, mounted under `/api`: `/api/health`, `/api/search/guides` and `/api/dofusdb-values/:source/:id` |
| `i18n` | Spanish only, fallback `es` | The panel UI is in Spanish |
| `localization` | One locale, `es`, default and fallback | Content is Spanish; localized fields keep a second language possible |
| `secret` | `PAYLOAD_SECRET` | Signs panel sessions |
| `typescript.outputFile` | `src/payload-types.ts` | Generated types, committed |
| `db` | `postgresAdapter` | See below |
| `onInit` | Pool error listener | See below |
| `sharp` | `sharp` | Reads image dimensions on upload |
| `plugins` | `[mediaStorage()]` | The S3/R2 storage adapter for `media` |

### Database adapter

The Postgres adapter takes its migration directory (`src/migrations`), whether to push the schema, and pool options from two resolver functions:

- `push: shouldPushSchema(process.env)` is true only when `NODE_ENV` is `development`, which means only under `next dev`. Payload would otherwise push by default whenever `NODE_ENV` is not `production`, including when it is unset.
- `pool.connectionString: resolveDatabaseUrl(process.env)`, with `connectionTimeoutMillis: 5000` so acquiring a connection never waits forever on a stuck database.
- `pool.onConnect` attaches an `error` listener to every new client. While Drizzle has a client checked out, `pg` removes the pool's own listener from it, so without this one a connection lost mid-transaction would crash the process. The listener only logs (`Conexión de Postgres prestada perdida`); the code that owns the transaction gets the failure, nothing retries the transaction, and `pg` discards the dead client when it is released.

`onInit` attaches an `error` listener to the `pg` pool. Neon restarts idle connections; without the listener, an error on an idle client would crash the Node process. With it, the error is logged (`Conexión de Postgres perdida en el pool`) and the pool replaces the client.

Details are in [Database and migrations](../data/database.md).

### Storage plugin

`mediaStorage()` wraps `@payloadcms/storage-s3`. It is always registered but only enabled when the S3 variables are complete, and it always inserts its fields so the schema is the same with or without R2. See [Media storage](../media/storage.md).

## Generated files

Payload writes several files that are committed and must not be edited by hand:

| File | Regenerate with | Notes |
|---|---|---|
| `src/app/(payload)/**` (layout, admin page, API routes) | Payload's Next template | Each file starts with "THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD" |
| `src/app/(payload)/admin/importMap.js` | `pnpm generate:importmap` | Maps admin component paths to imports; today it holds the project's two quest guide components (`QuestAutofill`, `SummaryNote`), the achievement panel note (`DofusDbNote`), the Lexical rich text components (field, cell, diff and the client feature toolbar entries), `CollectionCards` and the S3 client upload handler. The Lexical entries appeared with the first rich text field, in the guide body blocks |
| `src/payload-types.ts` | `pnpm generate:types` | CI regenerates it and fails on any diff |
| `src/migrations/*` | `pnpm migrate:create <name>` | Schema history; see the database page |

`src/app/(payload)/custom.scss` is the hook for admin style overrides and is empty today.

## Custom admin components

The project's own panel components live in `src/components/quest-guide-admin/` and `src/components/achievement-admin/`, next to the site's own components in `src/components/`. A collection references them by a path string relative to `src/` (the import map base directory) with a `#ExportName` suffix, not by import; Payload resolves that string through the import map:

| Path | Used by | What it does |
|---|---|---|
| `/components/quest-guide-admin/QuestAutofill#QuestAutofill` | `Description` of the quest guide `quest` field | Fills the empty title, slug, SEO and summary in the form when a quest is picked |
| `/components/quest-guide-admin/SummaryNote#SummaryNote` | `Description` of each fillable summary field and of `summary.needs.items`, with `clientProps: { summaryField }` | Shows whether the value comes from DofusDB or was changed |
| `/components/achievement-admin/DofusDbNote#DofusDbNote` | `Description` of each field an achievement page or metalogro copies from DofusDB, with `clientProps: { source, field }` | The same note for achievement pages and metalogros, reading `GET /api/dofusdb-values/:source/:id` |

The quest guide components are client components (`'use client'`) that read the form through `@payloadcms/ui` hooks and load the linked quest from the REST API with the session cookie (`linked-quest.ts`). Their logic lives in the pure modules of `src/lib/guides/`, shared with the server hook. See [Writing a quest guide](guide-authoring.md).

`.gga` excludes `payload-types.ts`, `importMap.js` and `src/migrations/*` from the AI review in the pre-commit hook.

## Next.js integration

`next.config.ts` wraps the Next config with `withPayload(nextConfig, { devBundleServerPackages: false })`, then with Sentry's `withSentryConfig`. It also sets a webpack `extensionAlias` so `.js` imports resolve to `.ts`/`.tsx` sources, and pins the Turbopack root to the repo directory.

## Extending the CMS

- **New collection**: add a file under `src/collections/`, add it to `collections`, then create a migration and regenerate types. See [Collections and access](collections.md).
- **New custom endpoint**: add it under `src/endpoints/` and to `endpoints`. It is served under `/api/<path>` by the generated catch-all route.
- **New admin component**: put it under `src/components/`, reference it by path from a collection or the config, then run `pnpm generate:importmap` and commit `importMap.js`.
- **New guide body block**: add it under `src/blocks/` and to the collection's `blocks` field. See [Guide body blocks](blocks.md).
- **New global**: add a file under `src/globals/`, add it to `globals`, then create a migration and regenerate types. `src/globals/` holds only `DofusGuidesIndex` today; the site settings global named in AGENTS.md is still planned.

## Related pages

- [Collections and access](collections.md)
- [Guide body blocks](blocks.md)
- [Writing a quest guide](guide-authoring.md)
- [Database and migrations](../data/database.md)
- [Media storage](../media/storage.md)
- [Request pipeline](../architecture/request-pipeline.md)
