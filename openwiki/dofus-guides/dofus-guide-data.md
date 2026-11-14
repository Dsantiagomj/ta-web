---
type: data-model
title: Dofus guide data model
description: The dofus-guides collection (one guide per Dofus, with Necesitarás groups, ordered achievement and quest parts, an optional step-by-step body, video and checklist) and the dofus-guides-index global, with their access rules, shared root slugs, cache tag and migrations.
tags: [dofus-guides, payload, collections, globals, slugs, cache]
sources:
  - id: openwiki-source-153285322f1fa0bfb7572570
    resource: repo://src/collections/delete-guard.ts
  - id: openwiki-source-708be0163b21a8d064e79c3c
    resource: repo://src/collections/DofusGuides.ts
  - id: openwiki-source-4f2e53306895c158accd92ec
    resource: repo://src/collections/revalidate-guides.ts
  - id: openwiki-source-a93f1ff2ed8916a30885274d
    resource: repo://src/collections/root-slug.ts
  - id: openwiki-source-b450986b88b66a930e94b109
    resource: repo://src/globals/DofusGuidesIndex.ts
  - id: openwiki-source-98fb658ab637ba5e751fb194
    resource: repo://src/lib/dofus-guides/cache.ts
  - id: openwiki-source-66d7fca83a6f05e9ffb3f658
    resource: repo://src/lib/guides/slug.ts
  - id: openwiki-source-923f2de442e5ba235acca1ce
    resource: repo://tests/integration/dofus-guides.test.ts
  - id: openwiki-source-17fc3d83b00f0267e2dab471
    resource: repo://tests/unit/dofus-guides-collection.test.ts
  - id: openwiki-source-1e12278c7c763b31645f4aca
    resource: repo://tests/unit/dofus-guides-index-global.test.ts
  - id: openwiki-source-bf9fb1ff7357ca38b1ad1283
    resource: repo://tests/unit/revalidate-guides.test.ts
generated: { by: "claude-code", at: "2026-11-14T11:00:46.827Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-14T11:00:46.827Z
---

# Dofus guide data model

Torre's Dofus guides say what each Dofus asks for and which achievements and quests give it. They live in the `dofus-guides` collection (`src/collections/DofusGuides.ts`, "Guías de Dofus" in the panel group «Contenido», searchable by name, slug and aliases), one document per Dofus. Each published guide renders at `/<slug>` (see [Dofus guide page](dofus-guide-page.md)), and every guide, published or not, has a card on `/guias-dofus` (see [Dofus guides index and menu](dofus-guides-index.md)). The [Dofus guides import](../data/dofus-guides-import.md) seeds them from Torre's current site.

A Dofus guide does not copy quests. It points to achievement pages and quest guides, and the page reads their quests and links at render time. Editing an achievement page's quests therefore changes every Dofus guide that lists it.

## Editorial rules

The collection follows the rules of the other editorial collections (see [Collections and access](../cms/collections.md)):

- **Drafts** with up to 50 versions per document (`versions: { drafts: true, maxPerDoc: 50 }`).
- **Access**: `readPublishedOrAll` (panel users read drafts, visitors only `_status: published`); create and update need a panel user. Delete is `adminOrNotImported('importSnapshot')`: an admin deletes any guide, an editor only one the import did not create; a duplicate drops `importSnapshot` and `originalUrl` (`clearOnDuplicate`), so the copy is the editor's. A `beforeDelete` hook (`refuseReferencedDelete('dofus-guides')`) refuses to delete a guide a checklist points at. See [Admin panel](../cms/admin-panel.md).
- **Locked fields**: the Dofus item (`dofus`) and `order` take `lockedOnceSet`: anyone fills them while empty, only an admin changes a saved value.
- **Preview**: `livePreview` with a 390 × 844 "Móvil" breakpoint and `preview`, both through `guidePreviewUrl`, the same `/vista-previa` route as quest guides.
- **Default order**: `order`. The default columns are name, order, state, status and updated date.

Two states matter and they are different things. `_status` (draft or published) is Payload's version status. `state` (`published` or `preparing`, the shared `stateField` from `src/collections/achievement-fields.ts`) is Torre's: a Dofus "En preparación" has a card on the index and an entry in the menu, but no page and no link.

## Fields

| Field | Type | Notes |
|---|---|---|
| `dofus` | relationship to `items`, unique | The Dofus item in DofusDB. Its image is the egg on the card, the header and the menu |
| `name` | text, required, localized | The card and page title |
| `slug` | text, required, unique, indexed, not localized | `/<slug>`, the same as on Torre's site (`dofus-abisal`). Validated by `validateSlug` from quest guides; in the sidebar |
| `state` | select | `published` or `preparing` (see above) |
| `order` | number, required | Position in the index, the menu and previous/next; 1 is first |
| `level`, `tag`, `color` | number, select, text | One row. `tag` is `primordial` or `event` (labels "Primordial" and "Evento"), or empty; it drives the index filters. `color` is the glow behind the egg, validated by `validateColor` as a six-digit hex such as `#2a5aaa` |
| `aliases` | text, localized | Other names, matched by the index search |
| `prerequisites` | rich text, localized | Torre's text with its links |
| `needs` | group | Necesitarás: an optional `title` (empty means "Necesitarás") and `groups` (below) |
| `rewards`, `intro`, `outro` | rich text, localized | |
| `parts` | blocks | The achievements and quests, in order (below) |
| `body` | blocks | "Paso a paso", for step-by-step guides such as the Piñata de pino. Uses the quest guide blocks: rich text, image, video, callout, fight and step (see [Guide body blocks](../cms/blocks.md)) |
| `video` | text | Optional YouTube URL, validated like the video block |
| `videoPoster` | upload to `media` | The video's poster, stored in Media so the page never fetches it from YouTube |
| `checklist` | group of `name` and `url` | The checklist card on the page; `url` is validated by `validateOptionalUrl` |
| `importSnapshot` | json, hidden | What the import last wrote per field, so a rerun never overwrites Torre's edits (see [Dofus guides import](../data/dofus-guides-import.md)) |
| `originalUrl` | text | The Squarespace URL, in the sidebar |

### Necesitarás groups

`needs.groups` is an array of groups ("Mazmorras", "Recursos"), each with an optional localized `name` and `rows` of two block types:

- `needItem`: an `item` relationship to `items`, a required `quantity` (at least 1, default 1), a localized `name` and a short `note` such as "(solo empezarla)". A row without a linked item must have a name (`validateNeedName`), or it would render empty.
- `needNote`: a required localized rich `text` for what is not an item, such as a job, a dungeon or kamas.

### Parts

`parts` holds five block types, rendered in the order Torre puts them:

| Block | Holds | Example |
|---|---|---|
| `dofusAchievement` | a required `achievement` (an achievement page) and a `note` | A single achievement with its quests |
| `dofusMetalogro` | a required `name` and an array of `achievements`, each with a `note` | "Un comienzo ejemplar" in the Plateado |
| `dofusQuests` | an optional `title` and an array of `quests`, each a required quest guide with a `note` | "También algunas misiones random" |
| `dofusQuest` | one required quest guide and a `note` | A quest that is a step on its own, such as the Nebuloso's gods |
| `dofusNote` | required rich `text` | One of Torre's tips between achievements |

The quests of an achievement come from its achievement page, where they are edited. The metalogro's achievement array has `dbName: 'dofus_meta_ach'`: with the default name, the index of its version table passes Postgres's 63-character limit and would be truncated.

## One slug space at the root

Dofus guides share `/<slug>` with quest guides, achievement pages, metalogros and checklists. `dofus-guides` is one of the five `ROOT_SLUG_COLLECTIONS` in `src/collections/root-slug.ts`, and the collection runs `rejectSharedSlug('dofus-guides')` in `beforeValidate`: a slug another of the five collections uses, stored or in its latest draft, is rejected with a message naming the owner ("una guía de Dofus" from the other side), and so is a source of the legacy redirect table. `/guias-dofus` is a reserved route segment, so no document of any of the five can take it. Unlike the achievement pages, a Dofus guide's slug is never filled automatically. See [Achievement data model](../achievements/achievement-data.md#one-slug-space-at-the-root).

## The index global

`dofus-guides-index` (`src/globals/DofusGuidesIndex.ts`, "Índice de guías de Dofus" in the «Contenido» group) holds the index's only hand-written content: a localized rich-text `intro` under the page title. Anyone can read it and panel users can update it. The cards themselves come from the collection.

## Cache and revalidation

Every reader of Dofus guide data caches it under the `dofus-guides` tag with a 600-second `revalidate` (`DOFUS_GUIDES_TAG` and `DOFUS_GUIDES_REVALIDATE` in `src/lib/dofus-guides/cache.ts`): the guide pages, the index and the header menu. The hooks in `src/collections/revalidate-guides.ts` expire it whenever something a Dofus guide shows changes:

| Saved or deleted | Tags expired |
|---|---|
| A Dofus guide | `dofus-guides`, `guide-pages` (every page's menu links the published Dofus) and `checklists` (a checklist takes its egg, color and breadcrumb from its Dofus guide) |
| The index global | `dofus-guides` |
| A quest guide or a Media file | `guide-pages`, `achievement-pages`, `dofus-guides` and `checklists` |
| An achievement page or a metalogro | `achievement-pages`, `guide-pages`, `dofus-guides` and `checklists` |

The hooks run on drafts too, which is cheap and also covers unpublishing. Outside a Next request (the import, scripts, tests) `revalidateTag` throws a "static generation store missing" invariant, which `expire` ignores. Writes made outside the server, such as the import, show within ten minutes.

## Migrations

- `20261110_000232_dofus_guides` creates `dofus_guides` with its locales and relations, the Necesitarás group tables, one table per part and body block, `dofus_meta_ach`, and the `_dofus_guides_v` version tables.
- `20261110_052805_dofus_guides_import` adds `video_poster_id` and `import_snapshot`.
- `20261110_131101_dofus_guides_index` creates the global's tables.

See [Database and migrations](../data/database.md).

## Tests

- `tests/unit/dofus-guides-collection.test.ts`: the panel group, drafts and versions, access, the shared slug space and the reserved `/guias-dofus`, preview, every field and its validation, the part and body blocks, the hidden import snapshot.
- `tests/unit/dofus-guides-index-global.test.ts`: the global's group and access, the rich-text intro, and that saving it expires the cache.
- `tests/integration/dofus-guides.test.ts`: visitors read only published guides and cannot write; Necesitarás groups and parts are saved in order; a Dofus guide cannot take a quest guide's slug or the reverse, nor a site route.
- `tests/unit/revalidate-guides.test.ts`: which tags each hook expires.
