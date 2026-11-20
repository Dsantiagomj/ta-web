---
type: feature
title: Class and dungeon pages
description: The `class-pages` and `dungeon-pages` collections where Torre edits his class builds and dungeon pages before they have a public page, how the menu's class and dungeon lists are built from them, and `pnpm import:section-pages`, which brings them from Squarespace.
tags: [pages, payload, navigation, squarespace, import, classes, dungeons]
sources:
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-53ddc95dcdb8a37d238a41f3
    resource: repo://scripts/import/import-section-pages.ts
  - id: openwiki-source-f451bbab3eff1bfa322ae739
    resource: repo://scripts/import/section-pages/catalog.ts
  - id: openwiki-source-511b1e31acf93f80bd02f520
    resource: repo://scripts/import/section-pages/convert.ts
  - id: openwiki-source-7295db4ccc1c910ecc16cce8
    resource: repo://scripts/import/section-pages/load.ts
  - id: openwiki-source-e662deaf5fc4b6bc8b7128a5
    resource: repo://src/app/(frontend)/site-data.ts
  - id: openwiki-source-97b983a867f232780d665912
    resource: repo://src/collections/ClassPages.ts
  - id: openwiki-source-456fa8d56bb86f8a4a80bff2
    resource: repo://src/collections/DungeonPages.ts
  - id: openwiki-source-899ad2bd146eda3e8bb742c7
    resource: repo://src/collections/section-pages.ts
  - id: openwiki-source-b2c6274265baf86e81c153a5
    resource: repo://src/lib/section-pages/cache.ts
  - id: openwiki-source-39ac60cdefd49a99f4f1f88c
    resource: repo://src/lib/section-pages/nav.ts
  - id: openwiki-source-771de7318e6d8f1525d0a4f1
    resource: repo://src/lib/section-pages/queries.ts
  - id: openwiki-source-0b53d378630fd717d81b69e3
    resource: repo://tests/integration/import-section-pages.test.ts
  - id: openwiki-source-f388fec8a6ac97cf6b55ef10
    resource: repo://tests/integration/section-pages.test.ts
  - id: openwiki-source-cbfdd601d5c8dfa2a2fbdf36
    resource: repo://tests/unit/import-section-pages.test.ts
  - id: openwiki-source-bd71cec4b2724179748d174d
    resource: repo://tests/unit/section-nav.test.ts
  - id: openwiki-source-ead0a954a62073d6b4b2a256
    resource: repo://tests/unit/section-pages-collections.test.ts
generated: { by: "claude-code", at: "2026-11-20T11:20:16.585Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-20T11:20:16.585Z
---

# Class and dungeon pages

Torre's class pages (backlog S-10) and dungeon pages (S-11) live in two Payload collections, `class-pages` («Clases») and `dungeon-pages` («Mazmorras»), in the panel's «Contenido» group after the standalone pages. Neither has a public page in this app yet. For now they let Torre prepare the content and decide what the menu's class and dungeon lists show and where each entry leads, which is still his Squarespace site.

## One factory for both collections

`sectionPageCollection(options)` in `src/collections/section-pages.ts` builds both collections from the same field set, the way standalone pages are built (see [Standalone pages](standalone-pages.md)):

- **Access and versions.** Drafts with up to 50 versions per document, `readPublishedOrAll` (visitors read only what is published, panel accounts also drafts), create and update for panel accounts, and delete through `adminOrNotImported('importSnapshot')`: an editor deletes only what the import did not bring, an admin anything (see [Admin panel](../cms/admin-panel.md)).
- **Slug.** A required, unique, non-localized slug validated like quest guide slugs, with Torre's Squarespace slugs (`feca-1`, `mazmorra-crunchidor`). Both collections are in `ROOT_SLUG_COLLECTIONS`, so `rejectSharedSlug` keeps their slugs apart from every other page at `/<slug>`, and in `SLUG_REDIRECT_COLLECTIONS`, so a published slug change stores a redirect (see [Achievement data model](../achievements/achievement-data.md#one-slug-space-at-the-root) and [Redirects, sitemap and robots](../operations/redirects-and-seo.md)).
- **State.** The shared `state` field, single-valued. Its validator refuses «Publicada» with the message that the page does not exist here yet, so every document stays «En preparación». `legacyHref` («Enlace en Squarespace») shows in the sidebar only while the state is «En preparación».
- **Menu.** «Sale en el menú» (`inMenu`, ticked by default) and «Nombre en el menú» (`menuName`, optional and localized) decide whether and how the entry appears in the menu list.
- **Content.** Unnamed tabs only arrange the form: the body uses the quest guide blocks (rich text, image, video, callout, fight, table and step), and the SEO group has a title and a description of at most 160 characters. A hidden `importSnapshot` records what the import last wrote and is cleared on duplicate.
- **Hooks.** `beforeValidate` runs `rejectSharedSlug`, `beforeChange` and `afterChange` record and apply slug moves, and `afterChange` and `afterDelete` expire the `section-pages` cache tag (`revalidateSectionPagesAfterChange`, `revalidateSectionPagesAfterDelete` in `src/collections/revalidate-guides.ts`).

There is no live preview, since there is no page to preview. The publish status line in the sidebar (`withPublishStatus`) says, for a published version «En preparación», whether the menu takes visitors to the Squarespace page or keeps its usual link (see [Panel dashboard and editing aids](../cms/panel-editing-aids.md)). The dashboard lists preparing class and dungeon pages like the other small collections.

Each collection adds its own fields:

| Collection | File | Extra fields |
|---|---|---|
| `class-pages` | `src/collections/ClassPages.ts` | A «Builds» tab before the text with `pvmBuilds` and `pvpBuilds`: rows with an optional localized name (only the row label in the panel), a required image in Media and an optional link validated as a web address, usually the build on Dofusbook. Most class pages are only builds; the Yopuka and Selotrop pages are long guides in the text tab |
| `dungeon-pages` | `src/collections/DungeonPages.ts` | An optional `dungeon` relationship in the sidebar to the DofusDB `dungeons` collection, which gives its bosses and level. The slug is `dungeon-pages` because `dungeons` is the game data collection |

The delete guard counts a class page's build images and body images, and a dungeon page's body images, as uses of a Media file. The panel texts live in `src/lib/section-pages/strings.ts`. The schema arrived in the `20261116_122735_class_and_dungeon_pages` migration.

## The menu's class and dungeon lists

`src/components/site/nav.ts` keeps the built-in lists, `CLASSES` (the 19 classes, Feca and Yopuka with `-1` in their slugs) and `DUNGEONS` (eight dungeons), each entry a `SectionLink` with its slug and a `legacyHref` link to Squarespace. `classLinks(docs)` and `dungeonLinks(docs)` put the published documents on top of them through `sectionNavLinks` (`src/lib/section-pages/nav.ts`, pure code):

- With no documents, the built-in list is returned as it is.
- A built-in entry whose slug has a published document takes the document's «Nombre en el menú» if any, and its link: `/<slug>` when its state is «Publicada», otherwise its «Enlace en Squarespace», otherwise the built-in link. An entry Torre takes out of the menu disappears.
- A published document with no built-in entry joins the list with its menu name or title, but only when it is in the menu and has somewhere to lead.
- Everything is sorted by name with a Spanish collator.

`readSectionNav(payload, collection)` (`src/lib/section-pages/queries.ts`) reads as a visitor (`overrideAccess: false`, `draft: false`, `_status` published) only the fields the menu needs. The layout loads both collections through `loadSectionNav` in `src/app/(frontend)/site-data.ts`, cached under the `section-pages` tag for 600 seconds (`src/lib/section-pages/cache.ts`); writes from outside the server, such as the import, show within those ten minutes. Today the menu only shows how many classes and dungeons there are, in the Clases and Mazmorras phrases; the sections themselves start as «Próximamente» in «Navegación». See [Site header, footer and search](../frontend/site-shell-and-search.md) and [Site settings, index texts and navigation](../cms/site-copy.md).

## Importing from Squarespace: `pnpm import:section-pages`

`pnpm import:section-pages [--from <folder>] [--apply] [--remote] [--production]` (`scripts/import/import-section-pages.ts`) brings Torre's class and dungeon pages into the two collections.

- **Catalog.** `CLASS_CATALOG` and `DUNGEON_CATALOG` (`scripts/import/section-pages/catalog.ts`) list each page's Squarespace slug, its title and whether it starts in the menu. The two Nawidad bosses and the Palacio de Dientinea (Squarespace slug `pagina-nueva`) are imported out of the menu, as today's menu does not link them. The `/clases-1` index is not imported: it is an image grid that waits for the section's design.
- **Reading.** Each page is downloaded from Torre's site with a 30-second timeout (a 404 counts as missing), or read from `<folder>/<slug>.html` with `--from`. `convertDungeonPage` reads a dungeon page like a standalone page: its text, screenshots and videos in order, with its heading as the title. `convertClassPage` does the same and then turns every image under a heading that is only «PVM» or «PVP» into a build with the link Torre put on the image (`parsePage` now keeps an image block's link, see [Squarespace import](../data/squarespace-import.md)). Text after the builds ends the list and stays in the text, and a video between builds goes to the text, both noted as oddities.
- **Loading.** `loadSectionPages` (`scripts/import/section-pages/load.ts`) reuses the standalone pages loader's helpers. A missing page is created as a draft «En preparación» with its `legacyHref`, its catalog `inMenu` and an `importSnapshot`. A slug another collection or the redirect table already uses is reported and not created. On a rerun, each field (`title`, `body`, `seo`, `legacyHref` and, for classes, the builds) is rewritten only while it still matches the last snapshot; a field Torre changed is kept and reported. Every write is a draft, so nothing reaches the site until Torre publishes, and the state, «Sale en el menú» and «Nombre en el menú» are never touched after creation.
- **Images.** Screenshots and builds go to Media once each, by their Squarespace URL. The loader first decides with what is already in Media and uploads only what it will write; a build image that cannot be downloaded is left out and noted.
- **Safety.** Without `--apply` it only counts and reports. Before Payload starts, `databaseScriptRefusal` requires `--remote` for a non-local database and `--production` in production. The report lists, per collection, what was created, updated and unchanged, the images, the oddities, the fields Torre's edits kept, the pages missing from Squarespace and the slugs already taken.

## Tests

- `tests/unit/section-pages-collections.test.ts`: the panel group, drafts and versions, access, the shared slug space and redirects, cache expiry, the refused «Publicada», `legacyHref` only while preparing, the menu fields, the body blocks, SEO, the hidden snapshot, the builds and the DofusDB dungeon link.
- `tests/unit/section-nav.test.ts`: `sectionNavLinks` with no documents, preparing and published documents, an entry taken out of the menu or renamed, and a new entry.
- `tests/integration/section-pages.test.ts`: visitors read only published documents, the menu read, an editor not deleting imported pages, the shared slugs, and «Publicada» refused against a real database.
- `tests/unit/import-section-pages.test.ts`: the catalog, image links, a builds page (title, PVM and PVP builds in order, a build without a link, text outside the builds) and a dungeon page, on fixtures in `tests/fixtures/section-pages/`, which Prettier ignores.
- `tests/integration/import-section-pages.test.ts`: a dry run writing nothing, a class created with its builds and Squarespace link, a dungeon created out of the menu, an idempotent rerun, and Torre's edits surviving a reimport.

## Related pages

- [Standalone pages](standalone-pages.md)
- [Collections and access](../cms/collections.md)
- [Site header, footer and search](../frontend/site-shell-and-search.md)
- [Site settings, index texts and navigation](../cms/site-copy.md)
- [Squarespace import](../data/squarespace-import.md)
