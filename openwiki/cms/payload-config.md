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
generated: { by: "claude-code", at: "2026-11-04T07:07:46.246Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-04T07:07:46.246Z
---

# Payload CMS configuration

Payload 3 runs inside the Next.js process. There is one config, `src/payload.config.ts`, exported through `buildConfig`. Everything else imports it through the `@payload-config` path alias declared in `tsconfig.json`: the generated admin and API routes, the integration tests (`getPayload({ config })`) and the Payload CLI (`pnpm payload`, `pnpm migrate`, `pnpm generate:types`).

## What the config sets

| Key | Value | Why |
|---|---|---|
| `admin.user` | `users` | Panel accounts; see [Collections and access](collections.md) |
| `admin.importMap.baseDir` | `src/` | Where `generate:importmap` resolves admin components |
| `collections` | `[Users, Media, Quests]` | One file per collection in `src/collections/` |
| `editor` | `lexicalEditor()` | Rich text editor for future guide bodies |
| `endpoints` | `[healthEndpoint]` | Custom endpoints, mounted under `/api` |
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

`onInit` attaches an `error` listener to the `pg` pool. Neon restarts idle connections; without the listener, an error on an idle client would crash the Node process. With it, the error is logged (`Conexión de Postgres perdida en el pool`) and the pool replaces the client.

Details are in [Database and migrations](../data/database.md).

### Storage plugin

`mediaStorage()` wraps `@payloadcms/storage-s3`. It is always registered but only enabled when the S3 variables are complete, and it always inserts its fields so the schema is the same with or without R2. See [Media storage](../media/storage.md).

## Generated files

Payload writes several files that are committed and must not be edited by hand:

| File | Regenerate with | Notes |
|---|---|---|
| `src/app/(payload)/**` (layout, admin page, API routes) | Payload's Next template | Each file starts with "THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD" |
| `src/app/(payload)/admin/importMap.js` | `pnpm generate:importmap` | Maps admin component paths to imports; today it holds `CollectionCards` and the S3 client upload handler |
| `src/payload-types.ts` | `pnpm generate:types` | CI regenerates it and fails on any diff |
| `src/migrations/*` | `pnpm migrate:create <name>` | Schema history; see the database page |

`src/app/(payload)/custom.scss` is the hook for admin style overrides and is empty today.

`.gga` excludes `payload-types.ts`, `importMap.js` and `src/migrations/*` from the AI review in the pre-commit hook.

## Next.js integration

`next.config.ts` wraps the Next config with `withPayload(nextConfig, { devBundleServerPackages: false })`, then with Sentry's `withSentryConfig`. It also sets a webpack `extensionAlias` so `.js` imports resolve to `.ts`/`.tsx` sources, and pins the Turbopack root to the repo directory.

## Extending the CMS

- **New collection**: add a file under `src/collections/`, add it to `collections`, then create a migration and regenerate types. See [Collections and access](collections.md).
- **New custom endpoint**: add it under `src/endpoints/` and to `endpoints`. It is served under `/api/<path>` by the generated catch-all route. Remember the dev gate protects it unless it is added to the exempt list.
- **New admin component**: reference it from a collection or the config, then run `pnpm generate:importmap` and commit `importMap.js`.
- **Planned**: `src/globals/` (site settings) and `src/blocks/` (guide body blocks) are named in AGENTS.md but do not exist yet.

## Related pages

- [Collections and access](collections.md)
- [Database and migrations](../data/database.md)
- [Media storage](../media/storage.md)
- [Request pipeline](../architecture/request-pipeline.md)
