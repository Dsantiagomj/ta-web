---
type: feature
title: Site header, footer and search
description: The header and footer every public page renders, what they link (the app's own pages and the legacy Squarespace site), the header client island with its menu panels, phone sheet and search dialog, the shared search engine for quests, achievements, metalogros and menu entries, and the /api/search/guides index that both searches load on first use.
tags: [frontend, layout, navigation, search, islands, performance]
sources:
  - id: openwiki-source-7a2845694b67f1018000b585
    resource: repo://src/app/(frontend)/layout.tsx
  - id: openwiki-source-46dd74b36a0234facf9d5720
    resource: repo://src/components/site/HeaderIsland.tsx
  - id: openwiki-source-39afe86b52965c905da37bef
    resource: repo://src/components/site/nav.ts
  - id: openwiki-source-35e0edba1c840a0b44fa75b7
    resource: repo://src/components/site/search-query.ts
  - id: openwiki-source-f374fdb676d18bc70e50086f
    resource: repo://src/components/site/search-result-strings.ts
  - id: openwiki-source-66bf87151b29d7c77f7b681f
    resource: repo://src/components/site/search.ts
  - id: openwiki-source-4bd6fa799b0febbb9c8f133d
    resource: repo://src/components/site/SiteFooter.tsx
  - id: openwiki-source-f25b5fdf49e0879a6c35a45e
    resource: repo://src/components/site/SiteHeader.tsx
  - id: openwiki-source-7010e195081882b67d5f0893
    resource: repo://src/components/site/Soon.tsx
  - id: openwiki-source-def7d1eb211fec2407ad644c
    resource: repo://src/endpoints/search-index.ts
  - id: openwiki-source-6f1014e367f65576c0cc5a42
    resource: repo://src/lib/search/guide-index.ts
  - id: openwiki-source-74617dd61aed35536e30e4de
    resource: repo://src/lib/search/read-index.ts
  - id: openwiki-source-fb8279296835a1a58ec3f427
    resource: repo://src/lib/site/legacy.ts
  - id: openwiki-source-427eacf7850519fc2b6f8403
    resource: repo://tests/e2e/cabecera.spec.ts
  - id: openwiki-source-e57aa8deceed5152aa47af8a
    resource: repo://tests/integration/achievement-page-queries.test.ts
  - id: openwiki-source-1c14916aa5d794dc90f1b2c7
    resource: repo://tests/integration/guide-search-index.test.ts
  - id: openwiki-source-a647d56d0524407fbeb77bd2
    resource: repo://tests/unit/search-index-endpoint.test.ts
  - id: openwiki-source-bcfda738f2b44be0563b6b07
    resource: repo://tests/unit/site-search.test.ts
  - id: openwiki-source-252aed3da80ab24fac288bb7
    resource: repo://tests/unit/site-shell.test.tsx
generated: { by: "claude-code", at: "2026-11-10T11:02:06.480Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-10T11:02:06.480Z
---

# Site header, footer and search

The frontend layout (`src/app/(frontend)/layout.tsx`) wraps every public page in `SiteHeader` and `SiteFooter` from `src/components/site/` (DESIGN.md, Layout: Header and Footer). Both are server-rendered; one client island, `HeaderIsland`, adds the interactive parts. The layout loads the header's counts through `loadSiteCounts()`, cached with the `guide-pages` tag (see [Home page](home-page.md#data)), and puts the `arriba` anchor (`TOP_ANCHOR`) on `<body>` for "Volver arriba".

## What they link

`src/components/site/nav.ts` holds everything the header and footer link:

- Five sections (`SECTIONS`): Misiones, Dofus, Checklists, Clases and Mazmorras, each with an accent color, art and links. Misiones links to the app's own `/metalogros`. Quests and achievements already live in the app, so no quest or achievement link goes to the old site.
- **Próximamente.** Clases and Mazmorras have no pages yet, so their sections carry `soon: true`. That one flag drives four places: the header nav, the phone sheet, the footer's Explorar column and the home page cards all show the section greyed out, without a link, followed by the «Próximamente» tag (`Soon`, `src/components/site/Soon.tsx`, styled as `.soon` in `site.css`), and the header search does not find them, nor their classes and dungeons. The `CLASSES` and `DUNGEONS` lists stay in `nav.ts` for when the pages arrive; removing `soon` brings each section back.
- **Dofus.** `DOFUS_GUIDES` lists every Dofus of Torre's Dofus guides page in his order, with each egg named after its guide (`strings.ts`). The nine he has not written yet (no page, or an empty one on his site) are in `DOFUS_PREPARING` and carry `preparing: true` with no link. `DOFUS_PAGE` maps the two whose legacy page is named differently from the egg (Dofus Nebuloso, Piñata de Pino). `DOFUS_READY` is the written ones only, the ones the menu links and the search finds. No text counts the Dofus, because Torre adds them over time.
- Pages the app does not have yet link to Torre's current Squarespace site, through `legacyHref(slug)` (`src/lib/site/legacy.ts`, origin `https://www.torrentearcano.com`), with the same slug except where his page is named differently: the written Dofus guides, the Dofus section (his guías page), checklists and legal pages, plus the class and dungeon links kept for later (Feca and Yopuka carry `-1` in their legacy slugs). When the app gets its own page, the link becomes relative.
- Socials (Twitch, Kick, YouTube, Discord), Ko-fi and the legal links.
- The game art is drawn at its file size or smaller: Dofus item icons (128 px), checklist Dofus, class heads from the Dofus 3 client export (64 px) and the Crunchidor.

## Header

`SiteHeader` renders the Sello lockup, the nav, the search button with its Ctrl K hint, the mode switch, and below 1120 px the phone menu. The nav has two dropdown buttons, Misiones and Dofus (Dofus and checklists share a panel), then Clases and Mazmorras as plain `span.np.np--soon` elements with `aria-disabled="true"`, a greyed icon and the «Próximamente» tag: no chevron, no panel, no link, never focused. The Misiones card shows the counts: published guides and visible achievements (`countSiteGuides`, `src/lib/site/counts.ts`). The Misiones panel has the search button (its hint offers a Dofus or a checklist) and one link, "Ver todo", to `/metalogros`; no section tile carries a separate "all" link, and the phone sheet repeats the same two.

The Dofus panel has the «Guías de Dofus» card (three featured eggs, `DOFUS_FEATURED`) and the three checklists on the left; on the right, «Todos los Dofus» with every egg of `DOFUS_GUIDES` (`EggGrid`) and «Ver todas las guías de Dofus», linking to Torre's guías page. A Dofus in preparation is a `span.egg-soon` with `aria-disabled`, its egg greyed out, and " (en preparación)" for screen readers. In the phone sheet, Clases and Mazmorras are `div.stile__b--soon` tiles with `aria-disabled` that do not fold. `MenuPanelPreview` renders one panel open and static for the `/sistema` catalog.

## Footer

`SiteFooter` has three columns on top: Torre with his streams, Explorar with the five sections (Misiones y logros, Dofus and Checklists as links, Clases and Mazmorras as `span.ft-soon` text with the «Próximamente» tag), and Comunidad with Discord, Ko-fi and his channels in inventory slots; below, the legal band. Each link appears once. There is no live state yet: the card says where he streams, not whether he is streaming.

## The header island

`HeaderIsland` (`"use client"`) listens with delegation and adds:

- **Menu panels.** Open and close the section panels; only a `button.np` toggles, so a click on a «Próximamente» item, which shares the `.np` class, does nothing. Esc, a click outside, or focus leaving closes them. From a panel's button, Down enters the first link; inside, the arrows, Home and End move through its links and buttons (DESIGN.md, Dropdown panel).
- **Phone sheet.** The hamburger opens the menu with the sections, which open one at a time; only `button.stile__b` folds, so the «Próximamente» tiles stay closed.
- **Search dialog.** Ctrl K or `/` opens it, except while typing in a field or when another dialog is open. Closing returns focus to whatever opened it (the Misiones panel button, the hamburger).
- **Scrolled header.** It marks the header when the page scrolls so it turns opaque.

## Search

The dialog finds what the menu links (`searchIndex` in `nav.ts`: the sections with pages, the written Dofus and the checklists; never Clases, Mazmorras, their classes and dungeons, or a Dofus in preparation), every published quest guide, every published achievement page in the Publicada state and every metalogro that opens on `/metalogros`. The search on the home page uses the same engine and index, without the menu entries (see [Home page](home-page.md#hero-search)).

### The index

`GET /api/search/guides` (`src/endpoints/search-index.ts`) returns a `SearchIndex` of compact tuples to keep the JSON small. The types and the URL live in `src/lib/search/guide-index.ts`, which the browser engine also imports; the server read lives in `src/lib/search/read-index.ts`.

| Key | Row | Source |
|---|---|---|
| `guides` | `[title, slug, achievement, level]` | Published quest guides, sorted by title with a Spanish collator |
| `achievements` | `[name, slug, metalogro, quests]` | Achievement pages the metalogros index links (published and in state `published`) |
| `metalogros` | `[name, anchor, counts]` | Metalogros the index does not dim |

`readSearchIndex` reads as an anonymous visitor (`overrideAccess: false`, no user, `draft: false`). The guide rows come from `quest-guides`; a published guide with unpublished changes contributes its published version. The achievement and metalogro rows come from `achievementSearchRows`, which builds the [metalogros index](../achievements/metalogros-index.md) view and drops every row it marks off, so the search shows exactly what `/metalogros` opens: an achievement «En preparación» has no page and is not searchable. `achievements` and `metalogros` are optional in the type, so an older cached response without them still works. The endpoint reads with `req.payload`, not `req`, so the index never takes the requester's permissions.

- **Cache.** The read is cached with `unstable_cache` under the `guide-pages` and `achievement-pages` tags, so anything published from the panel in `quest-guides`, `achievement-pages` or `achievement-groups` appears on the next request. The response carries `Cache-Control: public, max-age=300, stale-while-revalidate=3600`.
- **Compression.** Next compresses pages but not Payload's API responses, so the endpoint gzips the JSON itself when `Accept-Encoding` allows it (a `gzip;q=0` refusal is honored), sends `Vary: Accept-Encoding`, and keeps the last compressed buffer until the JSON changes.

### The engine

`src/components/site/search.ts` has no React or DOM:

- `siteEntries` turns the index into search entries in three lists. A quest links to `/<slug>` with "Nivel N · achievement" as its second line; an achievement links to its page `/<slug>` with "metalogro · N misiones"; a metalogro links to its panel, `/metalogros#<anchor>`, with its counts. A malformed index or row throws.
- `fold` and `words` compare without accents or case ("ebano" finds "Dofus Ébano").
- Ranking requires every word. A name that starts with the query ranks first (ignoring leading `¡` or `¿`), then one where every word starts a word, then one that only contains them; ties go to the shorter name, then alphabetical. Each of quests, achievements and metalogros is ranked separately: up to `MANY_QUESTS` (50) matches all show; with more, the best `SHOWN_WHEN_MANY` (20) show.
- `searchSite` returns groups for the dialog: «Misiones», «Logros», «Metalogros» and the menu groups. Groups go from the best match to the worst; on a tie, quests come first, then achievements, metalogros and the menu in menu order. With fewer than two letters or digits (`queryKind` in `search-query.ts`) it does not search and asks for another letter. `heroResults` does the same for the home page without the menu, plus a flat list of the options in display order for the keyboard.
- The status line counts each found group ("12 misiones · 1 logro · 2 metalogros") and adds the menu matches ("· 2 resultados del menú"). A group with more than 50 matches reads "más de 50 logros", and the found part then ends with ": sigue escribiendo". With no quest, achievement or metalogro it says "Ninguna misión se llama «…»", or "Ninguna misión; N resultados del menú." when the menu matches.
- `highlight` splits a name into parts with every occurrence of every word marked; the components render them as text and `<mark>`, never `innerHTML`.
- `loadEntries` fetches the index once per page: if the home page already asked for it, the dialog reuses the same promise, and the other way round. A failure is forgotten so the next use asks again.

### Keeping it out of the initial JavaScript

Neither search adds to a page's initial JavaScript or RSC payload. The first time the dialog opens (or the home search field gets focus), never on page load, the island loads the engine and its results (`SearchList.tsx`) with `import()` and fetches the index. Strings are split the same way: `search-strings.ts` holds what the islands show before the engine arrives, `search-result-strings.ts` the lazy part, so neither chunk pulls in `strings.ts`. `search-query.ts`, the two-letter check, is small on purpose and rides with the islands.

The guide page sits close to its 150 KB budget (149,716 bytes of script on 2026-11-07, per AGENTS.md). Turbopack ships a whole module with the island when both the island and the lazy chunk import it, so search and result code must stay out of the island, and no module except the small ones above may be imported from both sides. See [Performance budgets](../testing/performance-budgets.md).

## Tests

- `tests/unit/site-search.test.ts`: guide, achievement and metalogro entries and their second lines, rejecting a malformed index or row, an index without achievements still valid, folding, all words in any order, ranking and ties, the 50 and 20 limits, the one-letter hint, groups ordered by best match with quests, achievements, metalogros and the menu on ties, the home search without the menu, highlighting, one index request shared by both searches and a retry after failure, the status line with achievements and metalogros and its "más de 50" per group, and that the search arrives by `import()` and shares no string or icon modules with the island.
- `tests/unit/search-index-endpoint.test.ts`: gzip when accepted, plain JSON otherwise, public cacheable headers.
- `tests/integration/achievement-page-queries.test.ts` (`readSearchIndex`): published achievements with their metalogro and quest count, and the metalogros that open, alongside the guides.
- `tests/integration/guide-search-index.test.ts`: published guides with achievement and level; never a draft or unpublished guide; the published version of a guide with pending changes; each guide once, sorted by title.
- `tests/unit/site-shell.test.tsx`: the nav data (Torre's Dofus in his order with nine in preparation, Clases and Mazmorras marked soon, the search index without them) and the header and footer markup, including two dropdowns with Clases and Mazmorras as «Próximamente» and nothing in the header linking classes or dungeons, the Dofus panel with every egg, «Ver todas las guías de Dofus» and the preparing eggs without a link, the Misiones panel with the search button and one "Ver todo" to `/metalogros`, no quest or achievement link leaving the app in the panel or the phone sheet, the disabled phone tiles, and Explorar listing Clases and Mazmorras as text.
- `tests/e2e/cabecera.spec.ts`: one dropdown each for Misiones and Dofus, Clases and Mazmorras shown with «Próximamente» and opening nothing on click, the Dofus panel with its preparing eggs and its link to Torre's guías page, keyboard entry and exit, arrow navigation, Ctrl K with accent-insensitive search, published achievements and open metalogros found in their groups (with preparing ones left out) and opened from the keyboard, the index requested on open, the loading and error states with retry, the public cacheable index, button sizes, focus return, shortcuts blocked under another dialog, the opaque header on scroll, axe on the open header and footer in both modes, panels within the viewport, the phone menu and its focus handling, the phone tiles of Clases and Mazmorras that do not fold, no horizontal overflow down to 320 px, the footer columns without repeated links and with Clases and Mazmorras as «Próximamente» text, game icons never drawn larger than their files, and "Volver arriba" with smooth scroll (instant with reduced motion) and step anchors landing below the header.
