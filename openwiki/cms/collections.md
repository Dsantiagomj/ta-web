---
type: component
title: Collections and access
description: The six Payload collections that exist today, Users for panel accounts, Media for uploads, Quests, Items and Monsters for read-only DofusDB game data and Quest guides for Torre's editorial guides with drafts, with their fields, validation, localization, access rules and the tests that pin them down.
tags: [payload, collections, access-control, media, users, quest-guides, game-data]
sources:
  - id: openwiki-source-164e2da859b5277df81c7d94
    resource: repo://.github/workflows/ci.yml
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-3fc9f0484081f9ab441d6219
    resource: repo://scripts/import/load-quest-guides.ts
  - id: openwiki-source-63cbcc482c18e4f9ce5d0888
    resource: repo://scripts/refresh-quests.ts
  - id: openwiki-source-c78752655126ed640ba9a6d7
    resource: repo://src/collections/game-data-access.ts
  - id: openwiki-source-30fb9110f08cd9302abaca1a
    resource: repo://src/collections/Items.ts
  - id: openwiki-source-d58a4d3cf178bb2fa2e94831
    resource: repo://src/collections/Media.ts
  - id: openwiki-source-7c84c63987b05696c25fe759
    resource: repo://src/collections/Monsters.ts
  - id: openwiki-source-7a2723ea85824e431ff5eb54
    resource: repo://src/collections/QuestGuides.ts
  - id: openwiki-source-633cb155d38055ddc4af30fc
    resource: repo://src/collections/Quests.ts
  - id: openwiki-source-c46dfd6e94656494b7d9df7b
    resource: repo://src/collections/Users.ts
  - id: openwiki-source-1addf1a05f8d53fe7dea95d6
    resource: repo://src/lib/dofusdb/map-items-monsters.ts
  - id: openwiki-source-4ce5bfd40fc86e2e8680d71f
    resource: repo://src/lib/dofusdb/refresh-quests.ts
  - id: openwiki-source-47a80445306e82d0ef444872
    resource: repo://src/lib/media/storage.ts
  - id: openwiki-source-4b2f49d061cc7bd95a39ce1a
    resource: repo://src/migrations/20261103_030359_initial.ts
  - id: openwiki-source-a4ca0c9844f6e5f5c7edac75
    resource: repo://src/migrations/20261104_070541_quests.ts
  - id: openwiki-source-4b8e99ccf872ed7c776196a6
    resource: repo://src/migrations/20261104_124207_quest_guides.ts
  - id: openwiki-source-41c7ddbf5fd75671b00c11c5
    resource: repo://src/migrations/20261104_174941_dofusdb_items_rewards.ts
  - id: openwiki-source-2c42ff828c6d8e213a2f7416
    resource: repo://src/payload.config.ts
  - id: openwiki-source-46cbabf1b3d2b7c36423da7e
    resource: repo://tests/integration/game-data-access.test.ts
  - id: openwiki-source-5cd8fc4d5a65c01359ed92e2
    resource: repo://tests/integration/import-quest-guides.test.ts
  - id: openwiki-source-393bf97b0253eba009444ab4
    resource: repo://tests/integration/media-access.test.ts
  - id: openwiki-source-7b27bf36255a812248aa50e8
    resource: repo://tests/integration/quest-guides-access.test.ts
  - id: openwiki-source-ec89382e83abd458e1b56d69
    resource: repo://tests/integration/quests-access.test.ts
  - id: openwiki-source-ac8a504ed8af703f20417d32
    resource: repo://tests/integration/users-access.test.ts
  - id: openwiki-source-cd37c5a886e3aa1e214dad74
    resource: repo://tests/unit/game-data-collections.test.ts
  - id: openwiki-source-46725d1a0efabea76f3841c8
    resource: repo://tests/unit/media-collection.test.ts
  - id: openwiki-source-1970468d3fcc651d5071b312
    resource: repo://tests/unit/quest-guides-collection.test.ts
  - id: openwiki-source-6678095e74d244708e64ddd4
    resource: repo://tests/unit/quests-collection.test.ts
generated: { by: "claude-code", at: "2026-11-04T18:10:54.480Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-04T18:10:54.480Z
---

# Collections and access

Payload collections live one per file in `src/collections/` and are registered in `src/payload.config.ts` as `collections: [Users, Media, Quests, Items, Monsters, QuestGuides]`. Six exist today: three of them (`quests`, `items`, `monsters`) are read-only game data copied from DofusDB. Quest guides are the first editorial collection; the others listed in AGENTS.md (achievements, Dofus guides, checklists, classes, dungeons, pages) are planned and not in the code yet.

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
| `variants` | array of `{ key, width, format }` | Pre-generated AVIF and WebP variants in R2. `key` and `width` are required, `width` ≥ 1, `format` is `avif` or `webp`. Meant to be filled by the import, not by hand; the import does not generate them yet |
| `originalUrl` | text | Original Squarespace URL, only on migrated images; validated by `validateOptionalUrl`. The import looks images up by it so each one is stored once |

Upload settings are `upload.staticDir: 'media'`. Payload records the original's width and height (the integration test checks a 1×1 PNG comes back with `width: 1, height: 1`). It does not generate sizes: there is no `imageSizes` entry, because variants are produced offline before import. See [Media storage](../media/storage.md).

`validateOptionalUrl` accepts an empty value (`undefined`, `null`, `''`) and any URL whose protocol is `http:` or `https:`. Anything else returns the Spanish error message Payload shows in the panel. `tests/unit/media-collection.test.ts` covers the field shapes and the validator.

### Access

`access.read` returns `true`, so anyone can read media; the public site needs that to render images. Create, update and delete keep Payload's default and require a signed-in panel user. `tests/integration/media-access.test.ts` proves both halves: an anonymous request can `find` and `findByID`, and gets `Forbidden` on create, update and delete (the record stays unchanged afterwards); a panel user can create, update and delete.

When `MEDIA_BASE_URL` is set, the storage plugin also sets `disablePayloadAccessControl` for `media`, so file URLs point straight at the CDN instead of through `/api/media`. That only affects file delivery, not the collection's document access rules.

## Quests: DofusDB game data

`src/collections/Quests.ts` defines `quests`, a copy of the quest data from DofusDB. It is reference data that guides will pick through relationship fields, not editorial content. In the panel it sits under the "Datos del juego" group, uses `name` as the title and shows `name`, `dofusId` and `levelMin` as default columns.

| Field | Type | Notes |
|---|---|---|
| `dofusId` | number | Required, unique and indexed; the quest's ID in DofusDB |
| `name` | text | Required, localized |
| `levelMin`, `levelMax` | number | Optional |
| `categoryId` | number | Optional; DofusDB category ID |
| `startCriterion` | text | Optional; DofusDB's raw criterion string (such as `Ps=1&Pa=1&PL>29&Qf=55`), stored as is for derived data later |
| `prerequisites` | relationship to `quests`, `hasMany` | Quests to finish first |
| `startPositions` | array of `{ npcId, npcName, mapId, x, y }` | DofusDB can give several, for example one per class; `npcName` is localized, the rest are numbers |
| `rewards` | group | What the quest gives a level-200 character, as in Torre's guides and on dofusdb.fr (see below) |
| `needs` | group | What the quest asks for, labelled "Necesitarás" in the panel (see below) |
| `refreshedAt` | date | Optional; set by the refresh script on each run that creates or changes the quest |

### Rewards and needs

Both groups are computed by the refresh from the quest's steps; the formula and the objective rules are in [DofusDB game data refresh](../data/dofusdb-refresh.md#rewards).

| Group | Field | Type |
|---|---|---|
| `rewards` | `experience`, `kamas` | number |
| `rewards` | `items` | array of `{ item, quantity }`: `item` is a required relationship to `items`, `quantity` a required number |
| `rewards` | `emoteIds`, `spellIds`, `titleIds`, `jobIds` | number with `hasMany`: plain DofusDB IDs, validated and typed as `number[]`, with no collection behind them |
| `needs` | `items` | array of `{ item, quantity }`, relationship to `items` |
| `needs` | `monsters` | array of `{ monster, quantity }`, relationship to `monsters` |
| `needs` | `walksMaps` | checkbox: some objective asks to discover a map or a sub-area |

The item and monster rows point at Payload IDs, so a guide can show names and icons from our own copy. An ID the refresh cannot resolve to a stored item or monster is left out of the list and counted.

### Access

`questsAccess` is the shared `gameDataAccess` from `src/collections/game-data-access.ts`: `read` returns `true` for anyone, because it is public game data, and `create`, `update` and `delete` always return `false`. Nobody, signed in or not, can change quests through the REST API or the panel. Only trusted server code writes them, through the local API with `overrideAccess: true`. `items` and `monsters` use the same object.

### How quests are filled

The only writer is the DofusDB refresh, `pnpm data:quests` (`scripts/refresh-quests.ts`). It downloads every quest from the public DofusDB API, looks up the start NPCs and maps and the items and monsters the quests name, and upserts each quest by `dofusId` with `refreshQuests` from `src/lib/dofusdb/refresh-quests.ts`. Items and monsters are written first, because rewards and needs point at their Payload IDs. A first pass over the quests creates or updates the quest fields; a second pass links `prerequisites` once every quest has a Payload ID. A rerun with the same data writes nothing, and the refresh never deletes a quest. The pipeline, the prerequisite rule and how to run it safely are in [DofusDB game data refresh](../data/dofusdb-refresh.md).

`tests/unit/quests-collection.test.ts` pins the slug, the field shapes (the `rewards` and `needs` groups included) and the access functions. `tests/integration/quests-access.test.ts` checks the rules at runtime: an anonymous request can `find` and `findByID`; a panel user gets `Forbidden` on create, update and delete, and the data stays unchanged; a create with `overrideAccess: true` stores prerequisites, start positions and `refreshedAt`.

## Items and monsters: DofusDB catalog data

`src/collections/Items.ts` defines `items` and `src/collections/Monsters.ts` defines `monsters`. They hold only the DofusDB items and monsters that some quest names in its rewards or needs, not the whole game catalog. Both sit under "Datos del juego", use `name` as the title, are read-only through `gameDataAccess` and are written only by the refresh.

| Field | `items` | `monsters` | Notes |
|---|---|---|---|
| `dofusId` | yes | yes | Required, unique and indexed number |
| `name` | yes | yes | Required, localized; the refresh falls back to French, then to `Objeto <id>` or `Monstruo <id>` |
| `level` | yes | no | Optional number |
| `typeId` | yes | no | Optional DofusDB item type ID. Quest items have their own types (in the fixtures, 129, 133 and 155), so a guide can filter them out of a needs list |
| `iconId` | yes | yes | Optional number. For items it is DofusDB's `iconId`; for monsters, DofusDB's `gfxId` |
| `refreshedAt` | yes | yes | Optional date, set by the refresh |

Only the icon's ID is stored, never the image. Nothing is loaded from DofusDB or Ankama when the site serves a page (AGENTS.md).

`tests/unit/game-data-collections.test.ts` pins both collections' slugs, titles, group, field shapes and the shared access object. `tests/integration/game-data-access.test.ts` checks the rules at runtime for both: an anonymous request can `find` and `findByID`; a panel user gets `Forbidden` on create, update and delete, and the data stays unchanged.

## Quest guides: editorial guides with drafts

`src/collections/QuestGuides.ts` defines `quest-guides`, Torre's quest guides. It is the first editorial collection: people write it in the panel, unlike `quests`, which only the refresh writes. In the panel it sits under the "Guías" group, uses `title` as the title and shows `title`, `slug`, `_status` and `updatedAt` as default columns.

| Field | Type | Notes |
|---|---|---|
| `title` | text | Required, localized |
| `slug` | text | Required, unique and indexed, not localized (the URL is the same in every language); validated by `validateSlug`; in the sidebar |
| `quests` | relationship to `quests`, `hasMany` | Optional; the DofusDB quests the guide covers; in the sidebar |
| `summary` | group | `prerequisites`, `needs`, `rewards` (localized textareas), `startNpc` (localized text), `startX`, `startY` (numbers) |
| `body` | blocks | Rich text, image, video and callout blocks; see [Guide body blocks](blocks.md) |
| `seo` | group | `metaTitle` (localized text) and `metaDescription` (localized textarea, at most 160 characters) |
| `originalUrl` | text | The guide's Squarespace URL; validated by `validateOptionalUrl`, the same validator `media` uses; in the sidebar |

The `summary` group overrides what DofusDB provides. It holds Torre's own prerequisites, needs, rewards and start point as text; the Squarespace import fills them. The linked `quests` now carry computed `rewards` and `needs`, but Torre's "Necesitarás" lines are editorial (fights to win, things to prepare) and mostly cannot be derived from DofusDB, so DofusDB's needs serve only as a suggestion next to the guide's own text. Linked `quests` stay the source for game data.

### Filled by the Squarespace import

`pnpm import:guides` writes `title`, `slug`, `originalUrl`, `summary`, `quests` and `body` through the local API with `overrideAccess: true`, always as a draft: it finds an existing guide by `slug`, drafts included, and never publishes. It sends every `summary` field, `null` for any the page no longer has, so a value removed from Squarespace is cleared on the next import. A published guide gets a new draft and stays published as it was until someone publishes that draft in the panel. Each image becomes a `media` record with `alt` and `originalUrl` and no `variants`. `seo` is left for the panel. See [Squarespace import](../data/squarespace-import.md#loading-into-payload).

`validateSlug` accepts only plain ASCII: lowercase letters and digits in runs joined by single hyphens, with no hyphen at either end (`aprendizaje-escudero`, `dofus-ocre-2`). Accents, `ñ`, capitals, spaces, doubled or edge hyphens and empty values return a Spanish error, so a guide's URL never needs percent-encoding.

### Drafts and versions

`versions: { drafts: true, maxPerDoc: 50 }` gives each guide a `_status` of `draft` or `published` (new documents start as drafts) and keeps up to 50 saved versions per guide. Payload stores versions in a parallel set of `_quest_guides_v*` tables. Publishing is an update that sets `_status: 'published'`; the integration test creates a draft, publishes it, and finds a published entry in `findVersions`.

### Access

`questGuidesAccess` splits by whether there is a Payload session:

- `read` returns `true` for a signed-in panel user, who sees drafts too, and the query `{ _status: { equals: 'published' } }` for anyone else, so anonymous reads only ever see published guides.
- `create`, `update` and `delete` require a signed-in panel user.

Payload sessions belong only to panel accounts (`users`); site members will use Better Auth, so a member never counts as a panel user here.

`tests/unit/quest-guides-collection.test.ts` pins the slug, admin settings, versions, every field's shape, `validateSlug` and the access functions. `tests/integration/quest-guides-access.test.ts` checks them at runtime: an anonymous request lists and reads the published guide but gets `NotFound` for the draft, and gets `Forbidden` on create, update and delete with the data unchanged; a panel user reads both, creates a draft, publishes it and gets a version; and a guide with quests, summary, all four block types, SEO and `originalUrl` saves and reads back anonymously at `depth: 1`.

No public route or live preview reads guides yet.

## Localization in the schema

Spanish is the only locale. Translatable fields carry `localized: true` so adding a second language later becomes a translation job rather than a schema rewrite. In Postgres, localized fields live in a sibling `<collection>_locales` table keyed by `_locale`; the initial migration creates `media_locales` with `alt` and `credits`, and a `_locales` enum containing only `es`. The quests migration adds `quests_locales` (`name`) and `quests_start_positions_locales` (`npc_name`); the DofusDB items migration adds `items_locales` and `monsters_locales` (`name`). The quest guides migration adds `quest_guides_locales` (title, the localized summary fields and SEO) plus a `_locales` table for each block type.

## Adding or changing a collection

1. Add or edit the file in `src/collections/` and register it in `src/payload.config.ts`.
2. Write the access test first (integration, through the local API with `overrideAccess: false`).
3. Run `pnpm migrate:create <name>` and `pnpm generate:types`; commit both. CI fails when `src/payload-types.ts` is stale.

See [Database and migrations](../data/database.md) and [Test suites](../testing/test-suites.md).

## Related pages

- [Guide body blocks](blocks.md)
- [DofusDB game data refresh](../data/dofusdb-refresh.md)
- [Database and migrations](../data/database.md)
- [Test suites](../testing/test-suites.md)
