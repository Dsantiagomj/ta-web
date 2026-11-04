---
type: component
title: Collections and access
description: The two Payload collections that exist today, Users for panel accounts and Media for uploads, with their fields, validation, localization, access rules and the tests that pin them down.
tags: [payload, collections, access-control, media, users]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-04T00:16:52.047Z
sources:
  - id: openwiki-source-164e2da859b5277df81c7d94
    resource: repo://.github/workflows/ci.yml
  - id: openwiki-source-d58a4d3cf178bb2fa2e94831
    resource: repo://src/collections/Media.ts
  - id: openwiki-source-c46dfd6e94656494b7d9df7b
    resource: repo://src/collections/Users.ts
  - id: openwiki-source-47a80445306e82d0ef444872
    resource: repo://src/lib/media/storage.ts
  - id: openwiki-source-4b2f49d061cc7bd95a39ce1a
    resource: repo://src/migrations/20261103_030359_initial.ts
  - id: openwiki-source-2c42ff828c6d8e213a2f7416
    resource: repo://src/payload.config.ts
  - id: openwiki-source-393bf97b0253eba009444ab4
    resource: repo://tests/integration/media-access.test.ts
  - id: openwiki-source-ac8a504ed8af703f20417d32
    resource: repo://tests/integration/users-access.test.ts
  - id: openwiki-source-46725d1a0efabea76f3841c8
    resource: repo://tests/unit/media-collection.test.ts
generated: { by: "claude-code", at: "2026-11-04T00:16:52.047Z" }
---

# Collections and access

Payload collections live one per file in `src/collections/` and are registered in `src/payload.config.ts` as `collections: [Users, Media]`. Two exist today. The editorial collections listed in AGENTS.md (quest guides, achievements, Dofus guides, checklists, classes, dungeons, pages) are planned and not in the code yet.

## Users: panel accounts

`src/collections/Users.ts` defines `users`, the accounts that sign in to `/admin` (Torre and editors). It sets `auth: true`, uses `email` as the admin title and adds no fields of its own, so its columns are the ones Payload's auth adds (email, hash, salt, reset tokens, login attempts, lock) plus a `users_sessions` table.

Site members are a different population. They will use Better Auth, not this collection; that is still planned.

With no access functions declared, Payload's default applies: only an authenticated panel user can read or change users. `tests/integration/users-access.test.ts` checks this through the local API with `overrideAccess: false` and no `user`, which is how an anonymous request is evaluated. An anonymous caller cannot list, read, create, update or delete panel users. On an empty database, `/admin` asks for the first user.

## Media: images and files

`src/collections/Media.ts` defines `media`, the upload collection. Its admin labels are Spanish ("Archivo", "Archivos").

| Field | Type | Notes |
|---|---|---|
| `alt` | text | Required, localized |
| `credits` | text | Localized |
| `variants` | array of `{ key, width, format }` | Pre-generated AVIF and WebP variants in R2. `key` and `width` are required, `width` ≥ 1, `format` is `avif` or `webp`. Filled by the import, not by hand |
| `originalUrl` | text | Original Squarespace URL, only on migrated images; validated by `validateOptionalUrl` |

Upload settings are `upload.staticDir: 'media'`. Payload records the original's width and height (the integration test checks a 1×1 PNG comes back with `width: 1, height: 1`). It does not generate sizes: there is no `imageSizes` entry, because variants are produced offline before import. See [Media storage](../media/storage.md).

`validateOptionalUrl` accepts an empty value (`undefined`, `null`, `''`) and any URL whose protocol is `http:` or `https:`. Anything else returns the Spanish error message Payload shows in the panel. `tests/unit/media-collection.test.ts` covers the field shapes and the validator.

### Access

`access.read` returns `true`, so anyone can read media; the public site needs that to render images. Create, update and delete keep Payload's default and require a signed-in panel user. `tests/integration/media-access.test.ts` proves both halves: an anonymous request can `find` and `findByID`, and gets `Forbidden` on create, update and delete (the record stays unchanged afterwards); a panel user can create, update and delete.

When `MEDIA_BASE_URL` is set, the storage plugin also sets `disablePayloadAccessControl` for `media`, so file URLs point straight at the CDN instead of through `/api/media`. That only affects file delivery, not the collection's document access rules.

## Localization in the schema

Spanish is the only locale. Translatable fields carry `localized: true` so adding a second language later becomes a translation job rather than a schema rewrite. In Postgres, localized fields live in a sibling `<collection>_locales` table keyed by `_locale`; the initial migration creates `media_locales` with `alt` and `credits`, and a `_locales` enum containing only `es`.

## Adding or changing a collection

1. Add or edit the file in `src/collections/` and register it in `src/payload.config.ts`.
2. Write the access test first (integration, through the local API with `overrideAccess: false`).
3. Run `pnpm migrate:create <name>` and `pnpm generate:types`; commit both. CI fails when `src/payload-types.ts` is stale.

See [Database and migrations](../data/database.md) and [Test suites](../testing/test-suites.md).
