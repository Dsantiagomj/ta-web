---
type: component
title: Collections and access
description: The twelve Payload collections and the one global that exist today - Users for panel accounts, Media for uploads, Quests, Items, Monsters, NPCs, Achievements and Achievement categories for read-only DofusDB game data, and Quest guides, Achievement pages, Metalogros and Dofus guides for Torre's editorial content with drafts - with their fields, validation, localization, access rules and the tests that pin them down.
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
  - id: openwiki-source-708be0163b21a8d064e79c3c
    resource: repo://src/collections/DofusGuides.ts
  - id: openwiki-source-eec436a9dcb7734a62bf153f
    resource: repo://src/collections/editorial-access.ts
  - id: openwiki-source-c78752655126ed640ba9a6d7
    resource: repo://src/collections/game-data-access.ts
  - id: openwiki-source-30fb9110f08cd9302abaca1a
    resource: repo://src/collections/Items.ts
  - id: openwiki-source-d58a4d3cf178bb2fa2e94831
    resource: repo://src/collections/Media.ts
  - id: openwiki-source-7c84c63987b05696c25fe759
    resource: repo://src/collections/Monsters.ts
  - id: openwiki-source-8a13b77dbed01e200022d669
    resource: repo://src/collections/Npcs.ts
  - id: openwiki-source-f6a77b87c2cce3530ab6695f
    resource: repo://src/collections/quest-guide-autofill.ts
  - id: openwiki-source-7a2723ea85824e431ff5eb54
    resource: repo://src/collections/QuestGuides.ts
  - id: openwiki-source-633cb155d38055ddc4af30fc
    resource: repo://src/collections/Quests.ts
  - id: openwiki-source-4f2e53306895c158accd92ec
    resource: repo://src/collections/revalidate-guides.ts
  - id: openwiki-source-a93f1ff2ed8916a30885274d
    resource: repo://src/collections/root-slug.ts
  - id: openwiki-source-c46dfd6e94656494b7d9df7b
    resource: repo://src/collections/Users.ts
  - id: openwiki-source-b450986b88b66a930e94b109
    resource: repo://src/globals/DofusGuidesIndex.ts
  - id: openwiki-source-54227c78b7c2e57bc6f3d29b
    resource: repo://src/lib/dofusdb/fetch-quest-data.ts
  - id: openwiki-source-1addf1a05f8d53fe7dea95d6
    resource: repo://src/lib/dofusdb/map-items-monsters.ts
  - id: openwiki-source-4ce5bfd40fc86e2e8680d71f
    resource: repo://src/lib/dofusdb/refresh-quests.ts
  - id: openwiki-source-4b87b2bd0648fe28c52dc5e5
    resource: repo://src/lib/guides/autofill.ts
  - id: openwiki-source-66d7fca83a6f05e9ffb3f658
    resource: repo://src/lib/guides/slug.ts
  - id: openwiki-source-2f2b90aba3af4142e443ba84
    resource: repo://src/lib/guides/strings.ts
  - id: openwiki-source-89155127340f422ef94e950a
    resource: repo://src/lib/guides/summary.ts
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
  - id: openwiki-source-cd6b88c691322659e364fdbf
    resource: repo://tests/integration/quest-guides-autofill.test.ts
  - id: openwiki-source-ec89382e83abd458e1b56d69
    resource: repo://tests/integration/quests-access.test.ts
  - id: openwiki-source-ac8a504ed8af703f20417d32
    resource: repo://tests/integration/users-access.test.ts
  - id: openwiki-source-cb15629b981f292fdc846429
    resource: repo://tests/integration/users-lockout.test.ts
  - id: openwiki-source-cd37c5a886e3aa1e214dad74
    resource: repo://tests/unit/game-data-collections.test.ts
  - id: openwiki-source-46725d1a0efabea76f3841c8
    resource: repo://tests/unit/media-collection.test.ts
  - id: openwiki-source-1970468d3fcc651d5071b312
    resource: repo://tests/unit/quest-guides-collection.test.ts
  - id: openwiki-source-6678095e74d244708e64ddd4
    resource: repo://tests/unit/quests-collection.test.ts
generated: { by: "claude-code", at: "2026-11-12T11:00:44.802Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-12T11:00:44.802Z
---

# Collections and access

Payload collections live one per file in `src/collections/` and are registered in `src/payload.config.ts`. Twelve exist today: `users`, `media`, `quests`, `items`, `monsters`, `npcs`, `achievement-categories`, `achievements`, `quest-guides`, `achievement-pages`, `achievement-groups` and `dofus-guides`. The config also registers one global, `dofus-guides-index`, the intro of the `/guias-dofus` index. Six of them (`quests`, `items`, `monsters`, `npcs`, `achievements`, `achievement-categories`) are read-only game data copied from DofusDB. The editorial collections are quest guides, achievement pages, metalogros and Dofus guides; the four achievement collections are described in [Achievement data model](../achievements/achievement-data.md) and the Dofus guides in [Dofus guide data model](../dofus-guides/dofus-guide-data.md). The other collections listed in AGENTS.md (checklists, classes, dungeons, pages) are planned and not in the code yet.

## Users: panel accounts

`src/collections/Users.ts` defines `users`, the accounts that sign in to `/admin` (Torre and editors). It enables auth with `maxLoginAttempts: 5` and `lockTime` of ten minutes, uses `email` as the admin title and adds no fields of its own, so its columns are the ones Payload's auth adds (email, hash, salt, reset tokens, login attempts, lock) plus a `users_sessions` table.

Site members are a different population. They will use Better Auth, not this collection; that is still planned.

With no access functions declared, Payload's default applies: only an authenticated panel user can read or change users. `tests/integration/users-access.test.ts` checks this through the local API with `overrideAccess: false` and no `user`, which is how an anonymous request is evaluated. An anonymous caller cannot list, read, create, update or delete panel users. On an empty database, `/admin` asks for the first user.

The dev panel is public (dev has no basic auth), so an account locks for ten minutes after five failed logins. Those are Payload's defaults, pinned in the collection so they cannot change unnoticed. `tests/integration/users-lockout.test.ts` checks that five wrong passwords lock the account even for the right password, and that four do not.

## Media: images and files

`src/collections/Media.ts` defines `media`, the upload collection. Its admin labels are Spanish ("Archivo", "Archivos").

| Field | Type | Notes |
|---|---|---|
| `alt` | text | Required, localized |
| `credits` | text | Localized |
| `gameAsset` | text | Unique, indexed, read-only in the panel. Set only on art imported from DofusDB (NPC renders, achievement icons, item icons, monster images); the refresh looks files up by it so it never uploads one twice |
| `originalUrl` | text | Original Squarespace URL, only on migrated images; validated by `validateOptionalUrl`. The import looks images up by it so each one is stored once |

Upload settings are `staticDir: 'media'`, `imageSizes: mediaImageSizes` and the narrowest WebP size as the admin thumbnail. Payload records the original's width and height and generates the AVIF and WebP sizes on upload (panel or import), never on request. See [Media storage](../media/storage.md).

After a change or delete, the collection's hooks expire the cached guide pages, achievement pages and Dofus guides, because all of them render each image's alt text and dimensions. See [Public quest guide page](../frontend/guide-page.md#caching-and-revalidation).

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
| `zone` | text, localized | The area of the start map, such as Astrub |
| `achievement` | group of `dofusId`, `name` (localized), `slug`, `position`, `total` | The quest's achievement and the quest's position in it |
| `rewards` | group | What the quest gives a level-200 character, as in Torre's guides and on dofusdb.fr (see below) |
| `needs` | group | What the quest asks for, labelled "Necesitarás" in the panel (see below) |
| `refreshedAt` | date | Optional; set by the refresh script on each run that creates or changes the quest |

### Rewards and needs

Both groups are computed by the refresh from the quest's steps; the formula and the objective rules are in [DofusDB game data refresh](../data/dofusdb-refresh.md#rewards).

| Group | Field | Type |
|---|---|---|
| `rewards` | `experience`, `kamas` | number |
| `rewards` | `experienceMin` | number: the XP at the optimal level, the start of the XP range the guide shows |
| `rewards` | `items` | array of `{ item, quantity }`: `item` is a required relationship to `items`, `quantity` a required number |
| `rewards` | `emoteIds`, `spellIds`, `titleIds`, `jobIds` | number with `hasMany`: plain DofusDB IDs, validated and typed as `number[]`, with no collection behind them |
| `needs` | `items` | array of `{ item, quantity }`, relationship to `items` |
| `needs` | `monsters` | array of `{ monster, quantity }`, relationship to `monsters` |
| `needs` | `walksMaps` | checkbox: some objective asks to discover a map or a sub-area |

The item and monster rows point at Payload IDs, so a guide can show names and icons from our own copy. An ID the refresh cannot resolve to a stored item or monster is left out of the list and counted.

### Access

`questsAccess` is the shared `gameDataAccess` from `src/collections/game-data-access.ts`: `read` returns `true` for anyone, because it is public game data, and `create`, `update` and `delete` always return `false`. Nobody, signed in or not, can change quests through the REST API or the panel. Only trusted server code writes them, through the local API with `overrideAccess: true`. `items`, `monsters` and `npcs` use the same object.

### How quests are filled

The only writer is the DofusDB refresh, `pnpm data:quests` (`scripts/refresh-quests.ts`). It downloads every quest from the public DofusDB API, looks up the start NPCs, maps, sub-areas, areas, achievements and the monsters the quests name, downloads the whole item catalog, and upserts each quest by `dofusId` with `refreshQuests` from `src/lib/dofusdb/refresh-quests.ts`. Items and monsters are written first, because rewards and needs point at their Payload IDs. A first pass over the quests creates or updates the quest fields; a second pass links `prerequisites` once every quest has a Payload ID. A rerun with the same data writes nothing, and the refresh never deletes a quest. The pipeline, the prerequisite rule and how to run it safely are in [DofusDB game data refresh](../data/dofusdb-refresh.md).

`tests/unit/quests-collection.test.ts` pins the slug, the field shapes (the `rewards` and `needs` groups included) and the access functions. `tests/integration/quests-access.test.ts` checks the rules at runtime: an anonymous request can `find` and `findByID`; a panel user gets `Forbidden` on create, update and delete, and the data stays unchanged; a create with `overrideAccess: true` stores prerequisites, start positions and `refreshedAt`.

## Items and monsters: DofusDB catalog data

`src/collections/Items.ts` defines `items` and `src/collections/Monsters.ts` defines `monsters`. `items` holds the whole DofusDB item catalog (about 21,500 items), not only the ones quests name, so a guide can point at any item. `monsters` also holds the whole DofusDB monster catalog: the ones quests name and the ones a guide's fight blocks name. Both sit under "Datos del juego", use `name` as the title, are read-only through `gameDataAccess` and are written only by the refresh.

| Field | `items` | `monsters` | Notes |
|---|---|---|---|
| `dofusId` | yes | yes | Required, unique and indexed number |
| `name` | yes | yes | Required, localized; the refresh falls back to French, then to `Objeto <id>` or `Monstruo <id>` |
| `level` | yes | no | Optional number |
| `typeId` | yes | no | Optional DofusDB item type ID. Quest items have their own types (in the fixtures, 129, 133 and 155) |
| `superTypeId` | yes | no | Optional DofusDB item supertype ID, read from the `type` object DofusDB attaches to each item. Supertype 14 is quest items, the whole family those types belong to; the guide fill leaves them out of a guide's needs list |
| `iconId` | yes | yes | Optional number. For items it is DofusDB's `iconId`; for monsters, DofusDB's `gfxId` |
| `image` | yes | yes | Upload to `media` ("Icono" for items, "Imagen" for monsters), imported once by the refresh |
| `refreshedAt` | yes | yes | Optional date, set by the refresh |

The refresh imports into Media, once, the icons of the items and the images of the monsters that a quest, an achievement or a guide shows, keyed by `media.gameAsset`; `iconId` keeps the DofusDB ID it came from. Nothing is loaded from DofusDB or Ankama when the site serves a page (AGENTS.md). See [DofusDB refresh](../data/dofusdb-refresh.md).

`tests/unit/game-data-collections.test.ts` pins both collections' slugs, titles, group, field shapes and the shared access object. `tests/integration/game-data-access.test.ts` checks the rules at runtime for both: an anonymous request can `find` and `findByID`; a panel user gets `Forbidden` on create, update and delete, and the data stays unchanged.

## NPCs: quest givers and their renders

`src/collections/Npcs.ts` defines `npcs`, the DofusDB NPCs that give quests. It sits under "Datos del juego", uses `name` as the title, shares `gameDataAccess` and is written only by the refresh, after the quests.

| Field | Type | Notes |
|---|---|---|
| `dofusId` | number | Required, unique and indexed |
| `name` | text | Required, localized |
| `look` | text | The NPC's DofusDB look string, from which the render is made |
| `renderRight`, `renderLeft` | upload to `media` | The NPC render facing right (next to the guide title on desktop) and facing left (right of the title on mobile) |
| `refreshedAt` | date | Set by the refresh |

The renders are imported into `media` once, keyed by `gameAsset`; nothing is loaded from DofusDB when a page is served. A new look imports new renders and keeps the old ones. See [DofusDB game data refresh](../data/dofusdb-refresh.md).

## Quest guides: editorial guides with drafts

`src/collections/QuestGuides.ts` defines `quest-guides`, Torre's quest guides. It is the first editorial collection: people write it in the panel, unlike `quests`, which only the refresh writes. In the panel it sits under the "Guías" group, uses `title` as the title and shows `title`, `slug`, `_status` and `updatedAt` as default columns.

Fields, in the order the panel shows them:

| Field | Type | Notes |
|---|---|---|
| `quest` | relationship to `quests` (single) | Optional; the one DofusDB quest the guide covers, labelled "Misión de DofusDB". First field, in the main area (not the sidebar), with the `QuestAutofill` component as its description |
| `title` | text | Required, localized; validated by `validateGuideTitle` |
| `slug` | text | Required, unique and indexed, not localized (the URL is the same in every language); validated by `validateGuideSlug`; in the sidebar |
| `summary` | group | `prerequisites`, `rewards` (localized textareas), `needs` (group, below), `startNpc` (localized text), `startX`, `startY` (numbers) |
| `body` | blocks | Rich text, image, video, callout and step blocks; see [Guide body blocks](blocks.md) |
| `seo` | group | `metaTitle` (localized text) and `metaDescription` (localized textarea, at most 160 characters) |
| `originalUrl` | text | The guide's Squarespace URL; validated by `validateOptionalUrl`, the same validator `media` uses; in the sidebar |

### The summary and its needs list

The `summary` group is the guide's own copy of the quest summary: prerequisites, what you need, rewards and start point. "Necesitarás" (`summary.needs`) is a group of two fields:

| Field | Type | Notes |
|---|---|---|
| `needs.items` | array of `{ item, quantity }` | `item` is a required relationship to the searchable `items` catalog; `quantity` a required number, at least 1, default 1. Labelled "Objetos" |
| `needs.notes` | textarea, localized | What the item list cannot hold, such as "1 x Combate (solo)". Never filled automatically |

The item list is not localized: an item relationship is the same in every language. The textual summary fields are.

Each fillable summary field (`prerequisites`, `rewards`, `startNpc`, `startX`, `startY`) and the `needs.items` array get a `SummaryNote` description component with the field name as `clientProps.summaryField`; the fillable text fields also get a placeholder. The note compares the field's value with what DofusDB gives, so Torre sees whether it came from DofusDB or was changed.

### Filled from the linked quest

The collection's `beforeValidate` hook is `fillFromQuest` (`src/collections/quest-guide-autofill.ts`). When the guide has a linked quest, it loads it at `depth: 1` and fills every **empty** field from it: `title` (the quest name), `slug` (the slugified name, with `-2`, `-3`… when it is taken anywhere in the root slug space: another guide, an achievement page, a metalogro or a Dofus guide, drafts included, or a reserved route), `seo.metaTitle`, `seo.metaDescription`, and the summary fields, including an empty `needs.items` list. A field that already has a value is never overwritten, which is why guides imported from Squarespace keep their slug. On an update `data` may hold only the changed fields, so the hook reads the rest from the saved document; a field the editor empties is filled again on save. The panel does the same fill live in the form when Torre picks a quest. The rules, formats and notes are in [Writing a quest guide](guide-authoring.md).

The title and slug validators follow from that. `validateGuideTitle` accepts an empty title when the guide has a quest, and `validateGuideSlug` accepts an empty slug in the same case and otherwise defers to `validateSlug`. With neither a title nor a quest, the title validator returns the Spanish message "Escribe un título o elige una misión de DofusDB para sacarlo de ella." Payload skips field validation when saving a draft, so the hook also throws a `ValidationError` with that message on the `title` path when the title is still empty after the fill; a draft without title and quest is rejected too.

### Filled by the Squarespace import

`pnpm import:guides` writes `title`, `slug`, `originalUrl`, `summary`, `quest` and `body` through the local API with `overrideAccess: true`, always as a draft: it finds an existing guide by `slug`, drafts included, and never publishes. It links a quest only when the page names exactly one DofusDB ID; with several it links none and records an oddity so Torre picks one in the panel. The Squarespace "Necesitarás" text goes to `summary.needs.notes`. It sends every `summary` field, `null` for any the page no longer has, and then fills the empty ones from the linked quest exactly as the hook would, so a value removed from Squarespace is replaced by DofusDB's value, or cleared when DofusDB gives none, and a rerun compares equal and saves no new version. A published guide gets a new draft and stays published as it was until someone publishes that draft in the panel. Each image becomes a `media` record with `alt` and `originalUrl` and no `variants`. `seo` is left to the hook. See [Squarespace import](../data/squarespace-import.md#loading-into-payload).

`validateSlug` accepts only plain ASCII: lowercase letters and digits in runs joined by single hyphens, with no hyphen at either end (`aprendizaje-escudero`, `dofus-ocre-2`). Accents, `ñ`, capitals, spaces, doubled or edge hyphens and empty values return a Spanish error, so a guide's URL never needs percent-encoding. It also rejects the reserved slugs in `src/lib/guides/slug.ts` (`admin`, `api`, `sistema`, `vista-previa`, `metalogros`): those top-level routes win over `/[slug]`, so a guide with one of them would never be reachable. Each new top-level route is added to that list.

Guides share `/<slug>` with achievement pages and metalogros. After `fillFromQuest`, a second `beforeValidate` hook, `rejectSharedSlug('quest-guides')` (`src/collections/root-slug.ts`), rejects a slug one of those collections already uses, stored or in its latest draft. See [Achievement data model](../achievements/achievement-data.md#one-slug-space-at-the-root).

### Drafts and versions

`versions: { drafts: true, maxPerDoc: 50 }` gives each guide a `_status` of `draft` or `published` (new documents start as drafts) and keeps up to 50 saved versions per guide. Payload stores versions in a parallel set of `_quest_guides_v*` tables. Publishing is an update that sets `_status: 'published'`; the integration test creates a draft, publishes it, and finds a published entry in `findVersions`.

### Preview and revalidation

The admin config sets `livePreview` (with a 390 × 844 "Móvil" breakpoint) and `preview` to `guidePreviewUrl`, which points at `/vista-previa?slug=…` so editors see the public page with the current draft. `afterChange` and `afterDelete` hooks expire the cached guide pages, achievement pages and Dofus guides on every save, drafts included, which also covers unpublishing: an achievement page and a Dofus guide link the published guides of their quests. See [Public quest guide page](../frontend/guide-page.md).

### Access

`questGuidesAccess` uses the shared functions in `src/collections/editorial-access.ts`, which achievement pages and metalogros use too. It splits by whether there is a Payload session:

- `read` returns `true` for a signed-in panel user, who sees drafts too, and the query `{ _status: { equals: 'published' } }` for anyone else, so anonymous reads only ever see published guides.
- `create`, `update` and `delete` require a signed-in panel user.

Payload sessions belong only to panel accounts (`users`); site members will use Better Auth, so a member never counts as a panel user here.

`tests/unit/quest-guides-collection.test.ts` pins the slug, admin settings, versions, the hook, every field's shape (`quest` first, single and in the main area, the needs group, the note components), `validateGuideTitle`, `validateGuideSlug`, `validateSlug` and the access functions. `tests/integration/quest-guides-access.test.ts` checks access at runtime: an anonymous request lists and reads the published guide but gets `NotFound` for the draft, and gets `Forbidden` on create, update and delete with the data unchanged; a panel user reads both, creates a draft, publishes it and gets a version; and a guide with its quest, summary, the basic block types, SEO and `originalUrl` saves and reads back anonymously at `depth: 1`. `tests/integration/quest-guides-autofill.test.ts` checks the fill on save (see [Writing a quest guide](guide-authoring.md#tests)).

## Dofus guides: editorial guides with drafts

`dofus-guides` (`src/collections/DofusGuides.ts`) holds one guide per Dofus, rendered at `/<slug>` and listed on `/guias-dofus`. It follows the same editorial rules as quest guides: drafts with up to 50 versions, `readPublishedOrAll` read access, writes for panel users only, live preview through `/vista-previa`, `rejectSharedSlug('dofus-guides')` in `beforeValidate`, and `afterChange`/`afterDelete` hooks that expire the `dofus-guides` and `guide-pages` cache tags (every page's menu lists the published Dofus). Its fields (the Dofus item, order, state, level, tag, color, Necesitarás groups, the parts with achievements and quests, the step-by-step body, video and checklist) are described in [Dofus guide data model](../dofus-guides/dofus-guide-data.md).

The `dofus-guides-index` global (`src/globals/DofusGuidesIndex.ts`) has one localized rich-text `intro`, readable by anyone and editable by panel users; saving it expires the `dofus-guides` tag.

## Localization in the schema

Spanish is the only locale. Translatable fields carry `localized: true` so adding a second language later becomes a translation job rather than a schema rewrite. In Postgres, localized fields live in a sibling `<collection>_locales` table keyed by `_locale`; the initial migration creates `media_locales` with `alt` and `credits`, and a `_locales` enum containing only `es`. The quests migration adds `quests_locales` (`name`) and `quests_start_positions_locales` (`npc_name`); the DofusDB items migration adds `items_locales` and `monsters_locales` (`name`). The quest guides migration adds `quest_guides_locales` (title, the localized summary fields and SEO) plus a `_locales` table for each block type; the step block and quest NPC migrations add `quest_guides_blocks_step_locales` (dropped again when the step title was removed), `quests` zone and achievement name columns and `npcs_locales`; the needs list migration renames its `summary_needs` column to `summary_needs_notes`. The achievement migrations add the localized names of achievements, categories, achievement pages and metalogros and their rich text.

## Adding or changing a collection

1. Add or edit the file in `src/collections/` and register it in `src/payload.config.ts`.
2. Write the access test first (integration, through the local API with `overrideAccess: false`).
3. Run `pnpm migrate:create <name>` and `pnpm generate:types`; commit both. CI fails when `src/payload-types.ts` is stale.

See [Database and migrations](../data/database.md) and [Test suites](../testing/test-suites.md).

## Related pages

- [Writing a quest guide](guide-authoring.md)
- [Guide body blocks](blocks.md)
- [Achievement data model](../achievements/achievement-data.md)
- [Squarespace import](../data/squarespace-import.md)
- [DofusDB game data refresh](../data/dofusdb-refresh.md)
- [Database and migrations](../data/database.md)
- [Test suites](../testing/test-suites.md)
