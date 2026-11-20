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
  - id: openwiki-source-9c81b515d209a3ac7b95cba8
    resource: repo://src/lib/dofus-guides/color.ts
  - id: openwiki-source-2237e095c005029df3a25713
    resource: repo://src/lib/dofus-guides/egg.ts
  - id: openwiki-source-174a8ca60339af6e6c022a42
    resource: repo://src/lib/dofus-guides/links.ts
  - id: openwiki-source-651d65b97f9c21955a79c567
    resource: repo://src/lib/dofus-guides/need-groups.ts
  - id: openwiki-source-9660b854ff872f4ab63d720d
    resource: repo://src/lib/dofus-guides/strings.ts
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
generated: { by: "claude-code", at: "2026-11-20T11:20:16.585Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-20T11:20:16.585Z
---

# Dofus guide data model

Torre's Dofus guides say what each Dofus asks for and which achievements and quests give it. They live in the `dofus-guides` collection (`src/collections/DofusGuides.ts`, "Guías de Dofus" in the panel group «Contenido», searchable by name, slug and aliases), one document per Dofus. Each published guide renders at `/<slug>` (see [Dofus guide page](dofus-guide-page.md)), and every guide, published or not, has a card on `/guias-dofus` (see [Dofus guides index and menu](dofus-guides-index.md)). The [Dofus guides import](../data/dofus-guides-import.md) seeds them from Torre's current site.

An achievement in a Dofus guide shows either the quests of its achievement page, read at render time, or the quest rows Torre wrote for that guide, as his own text with the guides each row links (`pageQuests` and `ownQuests`, below). Loose quests point to quest guides or carry his own text and link.

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
| `dofus` | relationship to `items`, unique | The Dofus item in DofusDB. Its image, with Torre's correction, is the egg on the card, the header and the menu unless `egg` is set |
| `egg` | upload to `media` | «Huevo», optional: Torre's own egg, which wins over the Dofus item's image on the index card, the menu, the checklist poster and the guide header (`dofusEgg` in `src/lib/dofus-guides/egg.ts`) |
| `name` | text, required, localized | The card and page title |
| `slug` | text, required, unique, indexed, not localized | `/<slug>`, the same as on Torre's site (`dofus-abisal`). Validated by `validateSlug` from quest guides; in the sidebar |
| `state` | select | `published` or `preparing` (see above) |
| `order` | number, required | Position in the index, the menu and previous/next; 1 is first |
| `level`, `tag`, `color` | number, select, text | One row. `tag` is `primordial` or `event` (labels "Primordial" and "Evento"), or empty; it drives the index filters. `color` is the glow behind the egg, validated by `validateColor` (`src/lib/dofus-guides/color.ts`) as a six-digit hex such as `#2a5aaa`, in the browser too, with a color picker in front of the field (see [Panel dashboard and editing aids](../cms/panel-editing-aids.md)) |
| `aliases` | text, localized | Other names, matched by the index search |
| `prerequisites` | rich text, localized | Torre's text with its links |
| `needs` | group | Necesitarás: an optional `title` (empty means "Necesitarás"), an optional `note` over all of it, and `groups` (below) |
| `rewards`, `intro`, `outro` | rich text, localized | |
| `parts` | blocks | The achievements and quests, in order (below) |
| `body` | blocks | "Paso a paso", for step-by-step guides such as the Piñata de pino. Uses the quest guide blocks: rich text, image, video, callout, fight, table and step (see [Guide body blocks](../cms/blocks.md)) |
| `video` | text | Optional YouTube URL, validated like the video block (`validateOptionalVideoUrl`), in the browser too through `OptionalVideoUrlField` |
| `videoPoster` | upload to `media` | The video's poster, stored in Media so the page never fetches it from YouTube |
| `checklist` | group of `name` and `url` | The checklist card on the page; `url` is validated by `validateOptionalUrl` |
| `importSnapshot` | json, hidden | What the import last wrote per field, so a rerun never overwrites Torre's edits (see [Dofus guides import](../data/dofus-guides-import.md)) |
| `originalUrl` | text | The Squarespace URL, in the sidebar |
| `contentUpdatedAt` | date, hidden | When a panel user last published a content change (`trackContentDate`); the page's «Actualizado el» date (see [Share cards, JSON-LD and update dates](../operations/share-cards-and-structured-data.md)) |

The form arranges these fields in three unnamed tabs, which only order the form: «Contenido» (intro, parts, body and outro), «Ficha» (level, tag, color, egg, prerequisites, rewards, aliases, checklist, video and poster) and «Necesitarás». The Dofus item, name, slug, state and order sit above the tabs.

### Necesitarás groups

`needs.groups` is an array of groups, each with:

- `name`: required, chosen from a fixed list (`NEED_GROUPS` in `src/lib/dofus-guides/need-groups.ts`): «Combates», «Mazmorras», «Recursos», «Equipables», «Consumibles», «Oficios», «Emotes», «Logros» and «Otros», the order of the guides Torre has well arranged. The page renders groups in that order, and a group added in the panel lands where an imported one would. The panel labels each row by its group («Grupo 3: Consumibles»).
- `subtitle`: optional, localized, shown under the group name above its rows, such as «1 x Mazmorra» or «Dependiendo de tu nivel».
- `rows` of two block types:

- `needItem`: an `item` relationship to `items`, a required `quantity` (at least 1, default 1), a localized `name` and a short `note` such as "(solo empezarla)". A row without a linked item must have a name (`validateNeedName`), or it would render empty.
- `needNote`: a required localized rich `text` for what is not an item, such as a job, a dungeon or kamas.

Before migration `20261114_163904_needs_group_select` the group name was free text. The migration moved the old name to `subtitle` and derived the group from it (see [Database](../data/database.md)). `itemGroup` maps a DofusDB item supertype to «Recursos», «Consumibles» or «Equipables», and `headingGroup` reads a group from a heading of Torre's, singular or plural; the import uses both to place rows (see [Dofus guides import](../data/dofus-guides-import.md)).

### Parts

`parts` holds five block types, rendered in the order Torre puts them:

| Block | Holds | Example |
|---|---|---|
| `dofusAchievement` | a required `achievement` (an achievement page), a `note`, and the own quest fields below | A single achievement with its quests |
| `dofusMetalogro` | a required `name` and an array of `achievements`, each with a `note` and the own quest fields | "Un comienzo ejemplar" in the Plateado |
| `dofusQuests` | an optional `title` and an array of `quests`, each with a quest guide, a `title` (empty means the guide's title), a `link` and a `note`; a row needs its guide or, when it is not a quest, Torre's text (`validateLooseQuest`) | "También algunas misiones random" |
| `dofusQuest` | one required quest guide, a `title` and a `note` | A quest that is a step on its own, such as the Nebuloso's gods |
| `dofusNote` | required rich `text` | One of Torre's tips between achievements |

Each achievement (alone or in a metalogro) carries `ownQuestFields`:

- `pageQuests` («Misiones de su página de logro»), checked by default: the quests come from the achievement page, where they are edited.
- `ownQuests` («Tus misiones»), shown only when `pageQuests` is unchecked: Torre's rows in his order, each with a required localized `title` as he wants it shown («La fatalidad - El destino - La rivalidad»), the quest `guides` it links (several when he joins alternatives) and a `note`. Unchecked with no rows means no quests. They count in the guide's and the index's figures.
- `link`: his link to the achievement on his old site (`/en-marcha-hacia-la-aventura`), used while the achievement page is «En preparación».

A hand-written `link` (on an achievement or a loose quest row) must be a site path or an http(s) address (`validateSiteLink`, using `siteOrWebHref` in `src/lib/dofus-guides/links.ts`); anything else is rejected, and the page draws only a link that passes the same check.

Short table names keep Postgres's 63-character limit: the metalogro's achievement array has `dbName: 'dofus_meta_ach'`, and the own quest arrays `dofus_ach_quests` and `dofus_meta_ach_q`. The panel's block picker shows a thumbnail for each part and «Necesitarás» row (see [Guide body blocks](../cms/blocks.md#picker-thumbnails)).

## One slug space at the root

Dofus guides share `/<slug>` with quest guides, achievement pages, metalogros, checklists, standalone pages and the class and dungeon pages. `dofus-guides` is one of the eight `ROOT_SLUG_COLLECTIONS` in `src/collections/root-slug.ts`, and the collection runs `rejectSharedSlug('dofus-guides')` in `beforeValidate`: a slug another of the eight collections uses, stored or in its latest draft, is rejected with a message naming the owner ("una guía de Dofus" from the other side), and so is a source of the legacy redirect table. `/guias-dofus` is a reserved route segment, so no document of any of the eight can take it. Unlike the achievement pages, a Dofus guide's slug is never filled automatically. When a published guide changes its slug, `trackSlugMove` and `applySlugMove` add a redirect from the old address (see [Redirects, sitemap and robots](../operations/redirects-and-seo.md)). See [Achievement data model](../achievements/achievement-data.md#one-slug-space-at-the-root).

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
| A checklist | `checklists` and `dofus-guides` (a Dofus guide links its checklist once it is published) |

The hooks run on drafts too, which is cheap and also covers unpublishing. Outside a Next request (the import, scripts, tests) `revalidateTag` throws a "static generation store missing" invariant, which `expire` ignores. Writes made outside the server, such as the import, show within ten minutes.

## Migrations

- `20261110_000232_dofus_guides` creates `dofus_guides` with its locales and relations, the Necesitarás group tables, one table per part and body block, `dofus_meta_ach`, and the `_dofus_guides_v` version tables.
- `20261110_052805_dofus_guides_import` adds `video_poster_id` and `import_snapshot`.
- `20261110_131101_dofus_guides_index` creates the global's tables.
- `20261114_163904_needs_group_select` turns the group name into the fixed list and keeps the old name as the subtitle.
- `20261115_132426_dofus_torre_quest_rows` adds `pageQuests`, `ownQuests` and `link` to the achievement parts, and `title` and `link` to the loose quest rows.
- `20261115_191357_editable_missing_fields` adds the `egg` upload.

See [Database and migrations](../data/database.md).

## Tests

- `tests/unit/dofus-need-groups.test.ts`: the fixed list, `headingGroup` and `itemGroup`.
- `tests/unit/dofus-guides-collection.test.ts`: the panel group, drafts and versions, access, the shared slug space and the reserved `/guias-dofus`, preview, every field and its validation, the part and body blocks, the hidden import snapshot.
- `tests/unit/dofus-guides-index-global.test.ts`: the global's group and access, the rich-text intro, and that saving it expires the cache.
- `tests/integration/dofus-guides.test.ts`: visitors read only published guides and cannot write; Necesitarás groups and parts are saved in order; a Dofus guide cannot take a quest guide's slug or the reverse, nor a site route.
- `tests/unit/revalidate-guides.test.ts`: which tags each hook expires.
