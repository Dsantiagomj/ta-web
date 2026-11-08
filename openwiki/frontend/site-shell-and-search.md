---
type: feature
title: Site header, footer and search
description: The header and footer every public page renders, what they link (the app's own pages and the legacy Squarespace site), the header client island with its menu panels, phone sheet and search dialog, the shared search engine, and the /api/search/guides index that both searches load on first use.
tags: [frontend, layout, navigation, search, islands, performance]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-08T11:00:21.339Z
sources:
  - id: openwiki-source-7a2845694b67f1018000b585
    resource: repo://src/app/(frontend)/layout.tsx
  - id: openwiki-source-46dd74b36a0234facf9d5720
    resource: repo://src/components/site/HeaderIsland.tsx
  - id: openwiki-source-39afe86b52965c905da37bef
    resource: repo://src/components/site/nav.ts
  - id: openwiki-source-35e0edba1c840a0b44fa75b7
    resource: repo://src/components/site/search-query.ts
  - id: openwiki-source-66bf87151b29d7c77f7b681f
    resource: repo://src/components/site/search.ts
  - id: openwiki-source-4bd6fa799b0febbb9c8f133d
    resource: repo://src/components/site/SiteFooter.tsx
  - id: openwiki-source-f25b5fdf49e0879a6c35a45e
    resource: repo://src/components/site/SiteHeader.tsx
  - id: openwiki-source-def7d1eb211fec2407ad644c
    resource: repo://src/endpoints/search-index.ts
  - id: openwiki-source-6f1014e367f65576c0cc5a42
    resource: repo://src/lib/search/guide-index.ts
  - id: openwiki-source-fb8279296835a1a58ec3f427
    resource: repo://src/lib/site/legacy.ts
  - id: openwiki-source-427eacf7850519fc2b6f8403
    resource: repo://tests/e2e/cabecera.spec.ts
  - id: openwiki-source-1c14916aa5d794dc90f1b2c7
    resource: repo://tests/integration/guide-search-index.test.ts
  - id: openwiki-source-a647d56d0524407fbeb77bd2
    resource: repo://tests/unit/search-index-endpoint.test.ts
  - id: openwiki-source-bcfda738f2b44be0563b6b07
    resource: repo://tests/unit/site-search.test.ts
generated: { by: "claude-code", at: "2026-11-08T11:00:21.339Z" }
---

# Site header, footer and search

The frontend layout (`src/app/(frontend)/layout.tsx`) wraps every public page in `SiteHeader` and `SiteFooter` from `src/components/site/` (DESIGN.md, Layout: Header and Footer). Both are server-rendered; one client island, `HeaderIsland`, adds the interactive parts. The layout loads the header's counts through `loadSiteCounts()`, cached with the `guide-pages` tag (see [Home page](home-page.md#data)), and puts the `arriba` anchor (`TOP_ANCHOR`) on `<body>` for "Volver arriba".

## What they link

`src/components/site/nav.ts` holds everything the header and footer link:

- Five sections (`SECTIONS`): Misiones, Dofus, Checklists, Clases and Mazmorras, each with an accent color, art and links. Misiones links to the app's own `/metalogros`.
- Pages the app does not have yet link to Torre's current Squarespace site with the same slug, through `legacyHref(slug)` (`src/lib/site/legacy.ts`, origin `https://www.torrentearcano.com`): the Dofus guides, checklists, classes (Feca and Yopuka carry `-1` in their legacy slugs), dungeons and legal pages. When the app gets its own page, the link becomes relative.
- Socials (Twitch, Kick, YouTube, Discord), Ko-fi and the legal links.
- The game art is drawn at its file size or smaller: Dofus item icons (128 px), checklist Dofus, class heads from the Dofus 3 client export (64 px) and the Crunchidor; the other seven dungeons show a door icon until they have their boss art.

## Header

`SiteHeader` renders the Sello lockup, one dropdown panel per section with its card and art (Dofus and checklists share a panel), the search button with its Ctrl K hint, the mode switch, and below 1120 px the phone menu. The Misiones card shows the counts: published guides and visible achievements (`countSiteGuides`, `src/lib/site/counts.ts`). `MenuPanelPreview` renders one panel open and static for the `/sistema` catalog.

## Footer

`SiteFooter` has three columns on top: Torre with his streams, Explorar with the five sections, and Comunidad with Discord, Ko-fi and his channels in inventory slots; below, the legal band. Each link appears once. There is no live state yet: the card says where he streams, not whether he is streaming.

## The header island

`HeaderIsland` (`"use client"`) listens with delegation and adds:

- **Menu panels.** Open and close the section panels; Esc, a click outside, or focus leaving closes them. From a panel's button, Down enters the first link; inside, the arrows, Home and End move through its links and buttons (DESIGN.md, Dropdown panel).
- **Phone sheet.** The hamburger opens the menu with the sections, which open one at a time.
- **Search dialog.** Ctrl K or `/` opens it, except while typing in a field or when another dialog is open. Closing returns focus to whatever opened it (the Misiones panel button, the hamburger).
- **Scrolled header.** It marks the header when the page scrolls so it turns opaque.

## Search

The dialog finds what the menu links and every published quest guide. The quest search on the home page uses the same engine and index (see [Home page](home-page.md#hero-search)).

### The index

`GET /api/search/guides` (`src/endpoints/search-index.ts`) returns `{ guides: [title, slug, achievement, level][] }`, every published guide as a tuple to keep the JSON small, sorted by title with a Spanish collator. `readGuideSearchIndex` (`src/lib/search/guide-index.ts`) reads as an anonymous visitor: `overrideAccess: false`, no user, `draft: false`. The endpoint reads with `req.payload`, not `req`, so the index never takes the requester's permissions. A published guide with unpublished changes contributes its published version.

- **Cache.** The read is cached with `unstable_cache` under the `guide-pages` tag, so a guide published from the panel appears on the next request. The response carries `Cache-Control: public, max-age=300, stale-while-revalidate=3600`.
- **Compression.** Next compresses pages but not Payload's API responses, so the endpoint gzips the JSON itself when `Accept-Encoding` allows it (a `gzip;q=0` refusal is honored), sends `Vary: Accept-Encoding`, and keeps the last compressed buffer until the JSON changes.

### The engine

`src/components/site/search.ts` has no React or DOM:

- `fold` and `words` compare without accents or case ("ebano" finds "Dofus Ébano").
- `rankQuests` requires every word. A name that starts with the query ranks first (ignoring leading `¡` or `¿`), then one where every word starts a word, then one that only contains them; ties go to the shorter name, then alphabetical. Up to `MANY_QUESTS` (50) matches all show; with more, the best `SHOWN_WHEN_MANY` (20) show and the status line asks to keep typing.
- `searchSite` combines the menu entries and the quests, best match first; on a tie, quests come first. With fewer than two letters or digits (`queryKind` in `search-query.ts`) it does not search and asks for another letter.
- `highlight` splits a name into parts with every occurrence of every word marked; the components render them as text and `<mark>`, never `innerHTML`.
- `loadQuestEntries` fetches the index once per page: if the home page already asked for it, the dialog reuses the same promise, and the other way round. A failure is forgotten so the next use asks again.

### Keeping it out of the initial JavaScript

Neither search adds to a page's initial JavaScript or RSC payload. The first time the dialog opens (or the home search field gets focus), never on page load, the island loads the engine and its results (`SearchList.tsx`) with `import()` and fetches the index. Strings are split the same way: `search-strings.ts` holds what the islands show before the engine arrives, `search-result-strings.ts` the lazy part, so neither chunk pulls in `strings.ts`. `search-query.ts`, the two-letter check, is small on purpose and rides with the islands.

The guide page sits close to its 150 KB budget (149,716 bytes of script on 2026-11-07, per AGENTS.md). Turbopack ships a whole module with the island when both the island and the lazy chunk import it, so search and result code must stay out of the island, and no module except the small ones above may be imported from both sides. See [Performance budgets](../testing/performance-budgets.md).

## Tests

- `tests/unit/site-search.test.ts`: guide entries and their second line, rejecting a malformed index, folding, all words in any order, ranking and ties, the 50 and 20 limits, the one-letter hint, quests first on ties, highlighting, one index request shared by both searches and a retry after failure, the status line, and that the search arrives by `import()` and shares no string or icon modules with the island.
- `tests/unit/search-index-endpoint.test.ts`: gzip when accepted, plain JSON otherwise, public cacheable headers.
- `tests/integration/guide-search-index.test.ts`: published guides with achievement and level; never a draft or unpublished guide; the published version of a guide with pending changes; each guide once, sorted by title.
- `tests/unit/site-shell.test.tsx`: the header and footer markup.
- `tests/e2e/cabecera.spec.ts`: one dropdown per section, keyboard entry and exit, arrow navigation, Ctrl K with accent-insensitive search, the index requested on open, the loading and error states with retry, the public cacheable index, button sizes, focus return, shortcuts blocked under another dialog, the opaque header on scroll, axe on the open header and footer in both modes, panels within the viewport, the phone menu and its focus handling, no horizontal overflow down to 320 px, the footer columns without repeated links, game icons never drawn larger than their files, and "Volver arriba" with smooth scroll (instant with reduced motion) and step anchors landing below the header.
