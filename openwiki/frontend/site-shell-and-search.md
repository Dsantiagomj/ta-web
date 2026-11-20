---
type: feature
title: Site header, footer and search
description: The header and footer every public page renders, what they link (the app's own pages and the legacy Squarespace site), the header client island with its menu panels, phone sheet and search dialog, the shared search engine for quests, achievements, metalogros and menu entries, and the /api/search/guides index that both searches load on first use.
tags: [frontend, layout, navigation, search, islands, performance]
sources:
  - id: openwiki-source-803782f80e96170da42df0a4
    resource: repo://src/app/(frontend)/buscar/page.tsx
  - id: openwiki-source-7a2845694b67f1018000b585
    resource: repo://src/app/(frontend)/layout.tsx
  - id: openwiki-source-e662deaf5fc4b6bc8b7128a5
    resource: repo://src/app/(frontend)/site-data.ts
  - id: openwiki-source-46dd74b36a0234facf9d5720
    resource: repo://src/components/site/HeaderIsland.tsx
  - id: openwiki-source-3e36cac6a97a79b10253cdb1
    resource: repo://src/components/site/Kofi.tsx
  - id: openwiki-source-39afe86b52965c905da37bef
    resource: repo://src/components/site/nav.ts
  - id: openwiki-source-ed6f2837045a2d9739d3eb8d
    resource: repo://src/components/site/NewTab.tsx
  - id: openwiki-source-e952915f4bac344af2529a33
    resource: repo://src/components/site/search-page.ts
  - id: openwiki-source-35e0edba1c840a0b44fa75b7
    resource: repo://src/components/site/search-query.ts
  - id: openwiki-source-f374fdb676d18bc70e50086f
    resource: repo://src/components/site/search-result-strings.ts
  - id: openwiki-source-66bf87151b29d7c77f7b681f
    resource: repo://src/components/site/search.ts
  - id: openwiki-source-44f4951c750c542dfe5f6fb6
    resource: repo://src/components/site/SearchPage.tsx
  - id: openwiki-source-2527b990816180ac80987e20
    resource: repo://src/components/site/site.css
  - id: openwiki-source-4bd6fa799b0febbb9c8f133d
    resource: repo://src/components/site/SiteFooter.tsx
  - id: openwiki-source-f25b5fdf49e0879a6c35a45e
    resource: repo://src/components/site/SiteHeader.tsx
  - id: openwiki-source-7010e195081882b67d5f0893
    resource: repo://src/components/site/Soon.tsx
  - id: openwiki-source-def7d1eb211fec2407ad644c
    resource: repo://src/endpoints/search-index.ts
  - id: openwiki-source-765af2a447d91c2278b95582
    resource: repo://src/lib/checklists/list.ts
  - id: openwiki-source-423248a3a9612f01d4a80a72
    resource: repo://src/lib/dofus-guides/nav.ts
  - id: openwiki-source-5b1eb6bf9683fe15e163ade6
    resource: repo://src/lib/search/cached-index.ts
  - id: openwiki-source-6f1014e367f65576c0cc5a42
    resource: repo://src/lib/search/guide-index.ts
  - id: openwiki-source-74617dd61aed35536e30e4de
    resource: repo://src/lib/search/read-index.ts
  - id: openwiki-source-cb3dbcfdf661be407e9f170b
    resource: repo://src/lib/site-copy/defaults.ts
  - id: openwiki-source-62dc5b50379820e3ad89ab28
    resource: repo://src/lib/site/external.ts
  - id: openwiki-source-fb8279296835a1a58ec3f427
    resource: repo://src/lib/site/legacy.ts
  - id: openwiki-source-427eacf7850519fc2b6f8403
    resource: repo://tests/e2e/cabecera.spec.ts
  - id: openwiki-source-3bd66ce842612aa5530166a6
    resource: repo://tests/e2e/checklists-index.spec.ts
  - id: openwiki-source-8bcbc659355faf213b5d4f98
    resource: repo://tests/e2e/kofi.spec.ts
  - id: openwiki-source-e57aa8deceed5152aa47af8a
    resource: repo://tests/integration/achievement-page-queries.test.ts
  - id: openwiki-source-1c14916aa5d794dc90f1b2c7
    resource: repo://tests/integration/guide-search-index.test.ts
  - id: openwiki-source-9178b049d09c8cfe168c4db4
    resource: repo://tests/integration/site-search-content.test.ts
  - id: openwiki-source-d7fc5bb3aea27bbbbf82cf35
    resource: repo://tests/unit/external-links.test.tsx
  - id: openwiki-source-a647d56d0524407fbeb77bd2
    resource: repo://tests/unit/search-index-endpoint.test.ts
  - id: openwiki-source-3a7ddecf759a660746d6b2b7
    resource: repo://tests/unit/search-page.test.tsx
  - id: openwiki-source-bcfda738f2b44be0563b6b07
    resource: repo://tests/unit/site-search.test.ts
  - id: openwiki-source-252aed3da80ab24fac288bb7
    resource: repo://tests/unit/site-shell.test.tsx
generated: { by: "claude-code", at: "2026-11-20T11:20:16.585Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-20T11:20:16.585Z
---

# Site header, footer and search

The frontend layout (`src/app/(frontend)/layout.tsx`) wraps every public page in `SiteHeader` and `SiteFooter` from `src/components/site/` (DESIGN.md, Layout: Header and Footer). Both are server-rendered; one client island, `HeaderIsland`, adds the interactive parts. The layout loads, in parallel, the header's counts through `loadSiteCounts()`, cached with the `guide-pages` tag (see [Home page](home-page.md#data)), the Dofus list (`loadDofusNav`), the checklists (`loadChecklistNav`), the standalone pages (`loadPageNav`, under the `pages` tag), «Ajustes del sitio» (`loadSiteSettings`, under the `site-copy` tag), «Navegación» (`loadNavigation`, under the `site-copy` and `dofus-guides` tags; see [Site settings, index texts and navigation](../cms/site-copy.md)) and the published class and dungeon pages (`loadSectionNav`, under the `section-pages` tag; see [Class and dungeon pages](../pages/class-and-dungeon-pages.md)). The layout passes the navigation's `sections` to the header and the footer and its `featured` eggs to the header, and turns the class and dungeon pages into the menu lists with `classLinks` and `dungeonLinks`; for now the header only shows how many there are. After the footer it renders the ambience particles (`Ambience`, see [Styles, tokens and site shell](styles-and-shell.md)). Its `metadataBase` is `SITE_URL` (`src/lib/site/origin.ts`). It puts the `arriba` anchor (`TOP_ANCHOR`) on `<body>` for "Volver arriba".

## What they link

`src/components/site/nav.ts` holds everything the header and footer link:

- Five sections: Misiones, Dofus, Checklists, Clases and Mazmorras. What Torre edits about them (order, short and full name, the phrase under the name, shown or hidden, «Próximamente») comes from the «Navegación» global, resolved into a `Section[]` by `resolveNavigation`; what stays in code is each section's address, icon and accent color (`SECTION_CODE`), merged in by `navSection`. `SECTIONS` is the built-in result, used when no navigation is passed (tests, the `/sistema` catalog), and renders the same menu as before the global existed. Misiones links to the app's own `/metalogros`. Quests and achievements already live in the app, so no quest or achievement link goes to the old site.
- **Próximamente.** Clases and Mazmorras have no pages yet, so their sections start with «Próximamente» ticked (`soon`). That one flag drives four places: the header nav, the phone sheet, the footer's Explorar column and the home page cards all show the section greyed out, without a link, followed by the «Próximamente» tag (`Soon`, `src/components/site/Soon.tsx`, styled as `.soon` in `site.css`), and the header search does not find it. When Torre unticks it, the section becomes a plain link to its address (Clases to Torre's `clases-1` page, Mazmorras to the Crocantería page), since only Misiones and Dofus have a dropdown panel (`hasPanel`). A section unticked from «Sale en la web» disappears from all four places.
- **Dofus.** The Dofus section links to the app's own index, `/guias-dofus` (`DOFUS_INDEX_PATH`). The list of Dofus is not in `nav.ts`: it comes from the `dofus-guides` collection. The layout loads it with `loadDofusNav` (`src/app/(frontend)/site-data.ts`, cached under the `dofus-guides` tag) and passes it to `SiteHeader` as `dofus`, a list of `DofusNavItem` (name, the egg at 128 px when the Dofus item has an image, and `href` only when the guide's state is `published`). A Dofus Torre adds or publishes in the panel appears without a code change. The panel's card shows the three eggs of the guides Torre features in «Navegación»; `nav.ts` keeps `DOFUS_FEATURED`, the built-in Turquesa, Esmeralda and Ocre eggs from `public/img/game/dofus/`, as the fallback. No text counts the Dofus, because Torre adds them over time. See [Dofus guides index and menu](../dofus-guides/dofus-guides-index.md).
- **Checklists.** The Checklists section links to the app's own index, `/checklists` (`CHECKLISTS_INDEX_PATH`). The list of checklists is not in `nav.ts` either: `loadChecklists` (`site-data.ts`) is one cached read of the `checklists` collection, under the `checklists` tag, shared by the index, the menu, the footer, the search and the home page, and `loadChecklistNav` turns it into `ChecklistNavItem`s (`checklistNavItems`, `src/lib/checklists/list.ts`): name, slug, egg, sentence, and an `href` to its page when published, or to its Squarespace page when in preparation and it has one (`legacy`). See [Checklists index](../checklists/checklists-index.md).
- Pages the app does not have yet link to Torre's current Squarespace site, through `legacyHref(slug)` (`src/lib/site/legacy.ts`, origin `https://www.torrentearcano.com`), with the same slug except where his page is named differently. `CLASSES` and `DUNGEONS` are the built-in class and dungeon links of that kind (Feca and Yopuka carry `-1` in their legacy slugs). `classLinks(docs)` and `dungeonLinks(docs)` put the published `class-pages` and `dungeon-pages` on top through `sectionNavLinks`: a page Torre publishes links to `/<slug>`, one «En preparación» to its «Enlace en Squarespace» or else the built-in link, one taken out of the menu disappears, and new ones join, everything sorted by name. With no documents the built-in lists stay as they are. See [Class and dungeon pages](../pages/class-and-dungeon-pages.md).
- **Legal links.** `legalLinks(pages)` takes the legal pages (`LEGAL_PAGES`, by slug) from the `pages` collection: a published page links to `/<slug>`, one «En preparación» to its Squarespace page, and one missing from the collection to Squarespace with the same slug, as before. `LEGAL_LINKS` is the same list without reading the collection, for the `/sistema` catalog. See [Standalone pages](../pages/standalone-pages.md).
- **Socials.** `socialLinks(socials)` builds Torre's links (Twitch, Kick, YouTube, Discord, Ko-fi) in the footer's order from «Ajustes del sitio», falling back to the built-in ones (`SOCIALS`, `KOFI_URL`) when no settings are passed.
- The game art is drawn at its file size or smaller: Dofus item icons (128 px), the Silvestre Dofus of the Checklists section, class heads from the Dofus 3 client export (64 px) and the Crunchidor.

## Header

`SiteHeader` renders the Sello lockup, the nav, Torre's Ko-fi button (`KofiHeaderButton`), the search button with its Ctrl K hint, the theme picker (`ThemePicker`, see [Theme and mode](theme-and-mode.md)), the mode switch, and below 1200 px the phone menu (the menu moved from 1120 px when the theme picker arrived: at 1120 px the buttons no longer fit). The header is a flat bar: 64px (56px on phones), sticky at the top, `--color-bar` from edge to edge with a `--color-line` rule under it, opaque from the top of the page, without corners or shadow; its content sits in the page frame (`--frame-pad`), so the logo starts where the content starts and the buttons end where it ends. The emblem's hat glyph is cut in the bar color (`--emblem-cut`). The nav items are Lexend 600 in ink and take the section color on hover. Each `.site-nav__item` carries `data-section`, and a page marks its own section on its `<main>` with `pageSection` (`src/components/site/nav.ts`): quest guides, achievement pages and the metalogros index say `misiones`, Dofus guides, the `/guias-dofus` index, checklists and the `/checklists` index say `dofus`, and `body:has(main[data-section=…])` paints that section's button in its color.

The Ko-fi header button shows the cup and «Ko-fi» (named in full for screen readers, opening in a new tab) in `--color-kofi` with `--color-kofi-ink` and a `--color-kofi-line` border at 3:1. CSS decides per width: hidden on phones (the floating one covers it), with its text from 768 to 1199 px, hidden from 1200 to 1279 px where the full menu leaves no room, the cup alone from 1280 to 1583 px and with its text again from 1584 px. Chromium on Linux draws the header text about 9px wider than macOS, so the header keeps slack before the right gutter: from 1200 to 1279 px each nav item has 0.25rem of side padding, and from 1440 to 1663 px the search pill drops its Ctrl K hint and can shrink to 11rem; `tests/e2e/cabecera.spec.ts` checks at least 24px free at every width.

The floating Ko-fi (`KofiFloat`, rendered by the layout right before the footer) is a zero-height `.kofi-dock`, sticky to the bottom of the viewport and padded by `--frame-pad`, so the button (`KofiFab`, the footer's Ko-fi title; the cup alone under 40rem) rides at the bottom right of every page and stops over the footer when it arrives. The dock is a `container-type: scroll-state` container: once it is no longer stuck at the bottom it fades out (`@container not scroll-state(stuck: bottom)`). Browsers without those queries leave it parked over the footer. It is pure CSS, with no JavaScript. It hides while the home search results are open, and from 1024 px on a checklist with JavaScript, where the diary window would put its footer under it. The nav follows the sections of «Navegación» in Torre's order, with their short names, leaving out Checklists, which lives inside the Dofus panel. By default it has two dropdown buttons, Misiones and Dofus (Dofus and checklists share a panel), then Clases and Mazmorras as plain `span.np.np--soon` elements with `aria-disabled="true"`, a greyed icon and the «Próximamente» tag: no chevron, no panel, no link, never focused; without «Próximamente» they are plain `a.np` links. Each section card in a panel and each phone sheet tile shows the section's phrase from «Navegación» under its name or, when the phrase is empty, its figure. The Misiones card shows the counts: published guides and visible achievements (`countSiteGuides`, `src/lib/site/counts.ts`). The Misiones panel has the search button (its hint offers a Dofus or a checklist) and one link, "Ver todo", to `/metalogros`; no section tile carries a separate "all" link, and the phone sheet repeats the same two.

Clases and Mazmorras count their menu lists (`counts.classes` and `counts.dungeons`, from `classLinks` and `dungeonLinks`, falling back to the built-in lists).

The Dofus panel has the «Guías de Dofus» card (the three featured eggs of «Navegación», or `DOFUS_FEATURED`), the checklists of the collection in its order (`ChecklistCards`) and «Ver todas las checklists», linking to `/checklists`, on the left; with no checklists, the panel and the phone sheet leave that block out. A checklist in preparation that links to Squarespace says so to screen readers; one without a link is a `span.chk__off` with `aria-disabled` and «En preparación» for screen readers. Each checklist row is keyed by its slug; on the right, «Todos los Dofus» with every Dofus of the `dofus` list in the collection's order (`EggGrid`) and «Ver todas las guías de Dofus», linking to `/guias-dofus`. A Dofus without a published guide is a `span.egg-soon` with `aria-disabled`, its egg greyed out, and " (en preparación)" for screen readers; a Dofus whose item has no image gets an empty `egg-none` placeholder. In the phone sheet, Clases and Mazmorras are `div.stile__b--soon` tiles with `aria-disabled` that do not fold; a section without a panel and without «Próximamente» is an `a.stile__b` link, and the first section with a panel starts open. `MenuPanelPreview` renders one panel open and static for the `/sistema` catalog. Game icons in the menu sit in a `Well` that draws them at their size in rem through `--icon` (`iconSize`), so they grow with the root font.

## Footer

`SiteFooter` takes the year, the legal links, the site settings and the sections of «Navegación». Its texts (bio, live, Discord and Ko-fi titles and texts, disclaimer), the name in the © line and the social links come from «Ajustes del sitio». It has three columns on top: Torre with his streams, Explorar with the visible sections in Torre's order and with their full names (by default Misiones y logros, Dofus and Checklists as links, Clases and Mazmorras as `span.ft-soon` text with the «Próximamente» tag), and Comunidad with Discord and Ko-fi as filled cards (`--color-discord`, `--color-kofi`) and his channels in inventory slots; below, the legal band. The footer sits on `--color-bar` with a rule above in dark mode and on `--color-raised` without the rule in light mode. Each link appears once. There is no live state yet: the card says where he streams, not whether he is streaming.

Torre's face in the footer gets its shadow from a radial gradient behind the image (`.ft-torre::before`), not from a CSS `filter`. With a `filter` on the image or an ancestor, Chrome counts the image as a larger box than it draws, and on a short page such as `/checklists` the lazy footer face became the phone LCP element. `tests/e2e/checklists-index.spec.ts` checks it is not.

## The header island

`HeaderIsland` (`"use client"`) listens with delegation and adds:

- **Menu panels.** Open and close the section panels. A panel enters by fading in and sliding 6 px down with a slight scale (`@starting-style`), and leaves in 150 ms, about 70 percent of its entry, with `display` held until the end (`allow-discrete`) so the exit is visible; switching panels closes one and opens the other at once. With reduced motion there is no transition; only a `button.np` toggles, so a click on a «Próximamente» item, which shares the `.np` class, does nothing. Esc, a click outside, or focus leaving closes them. From a panel's button, Down enters the first link; inside, the arrows, Home and End move through its links and buttons (DESIGN.md, Dropdown panel).
- **Phone sheet.** The hamburger opens the menu with the sections, which open one at a time; only `button.stile__b` folds, so the «Próximamente» tiles stay closed.
- **Search dialog.** Ctrl K or `/` opens it, except while typing in a field or when another dialog is open. Closing returns focus to whatever opened it (the Misiones panel button, the hamburger).
- **Theme picker.** A click on `.tp-btn` closes any panel and loads `picker-ui.ts` with `import()` on first use to toggle the menu; Down or Up on the button opens it on the checked theme or the last one. On mount, if the picker's `data-current` differs from `<html data-theme>`, it loads the module to sync the button. The header no longer listens to scroll: the bar is opaque from the start.

## Search

The dialog finds what the menu links (`searchIndex(dofus, checklists, pages, sections)` in `nav.ts`: the visible sections of «Navegación» without «Próximamente», the Dofus of the list that have a link, the checklists that have a link and the standalone pages that open here; never a «Próximamente» section, the classes and dungeons, a Dofus in preparation, or a page that only links to Squarespace), every published quest guide, every published achievement page in the Publicada state and every metalogro that opens on `/metalogros`. The search on the home page uses the same engine and index without the menu sections, and takes the Dofus guides, checklists and pages from the index's `content` rows, since it has no menu props (see [Home page](home-page.md#hero-search)).

### The index

`GET /api/search/guides` (`src/endpoints/search-index.ts`) returns a `SearchIndex` of compact tuples to keep the JSON small. The types and the URL live in `src/lib/search/guide-index.ts`, which the browser engine also imports; the server read lives in `src/lib/search/read-index.ts`.

| Key | Row | Source |
|---|---|---|
| `guides` | `[title, slug, achievement, level]` | Published quest guides, sorted by title with a Spanish collator |
| `achievements` | `[name, slug, metalogro, quests]` | Achievement pages the metalogros index links (published and in state `published`) |
| `metalogros` | `[name, anchor, counts]` | Metalogros the index does not dim |
| `content` | `[type, name, href, image]` | What the menu links that is not a section: `dofus`, `checklist` and `pagina` entries (`CONTENT_TYPES`), built by `contentRows` from the same `searchIndex` the header uses, read as a visitor; the image is the 128 px egg |

`readSearchIndex` reads as an anonymous visitor (`overrideAccess: false`, no user, `draft: false`). The guide rows come from `quest-guides`; a published guide with unpublished changes contributes its published version. The achievement and metalogro rows come from `achievementSearchRows`, which builds the [metalogros index](../achievements/metalogros-index.md) view and drops every row it marks off, so the search shows exactly what `/metalogros` opens: an achievement «En preparación» has no page and is not searchable. `achievements`, `metalogros` and `content` are optional in the type, so an older cached response without them still works. Guide rows show the quest's name and level with Torre's correction (`corrected`). The endpoint reads with `req.payload`, not `req`, so the index never takes the requester's permissions.

- **Cache.** `cachedSearchIndex` (`src/lib/search/cached-index.ts`) caches the read with `unstable_cache` under the `guide-pages`, `achievement-pages`, `dofus-guides`, `checklists` and `pages` tags, so anything published from the panel in those collections appears on the next request. The endpoint and `/buscar` share it, always reading with `payload` and never with the requester's permissions. The response carries `Cache-Control: public, max-age=300, stale-while-revalidate=3600`.
- **Compression.** The endpoint returns plain `Response.json` and Next compresses it, adding `Vary: Accept-Encoding`. Up to Next 16.4.5 route handler headers were stored as arrays and Next skipped compressing them, so the endpoint gzipped its own JSON; since 16.4.6 Next does it and a `Content-Encoding` set by the handler would be dropped (see [Request pipeline](../architecture/request-pipeline.md)).

### `/buscar`: results without JavaScript

The home search form posts to `/buscar` (`src/app/(frontend)/buscar/page.tsx`), so a reader whose island has not loaded still gets results. The page is a server component that ships no JavaScript of its own:

- `searchPageQuery` takes the first `q`, trims it and caps it at 100 characters (`MAX_QUERY_LENGTH`).
- With no text it asks what to search; with one letter it asks for another (`queryKind`, the same rule as the islands). Only when there is something to search does it read the index, through the same `cachedSearchIndex` as the endpoint (`needsIndex`).
- `searchPageView` ranks with the home search's `heroResults` over `siteEntries`, so the groups, their order and the status line are the home search's; `SearchPage` renders a form that posts back to `/buscar` with the text, the status in a `role="status"` line, and the results with the header dialog's rows (`SearchList`), matches marked.
- Its field's id is `buscar-pagina`, not `buscar-q`, which belongs to the header dialog's field on every page. The page is `noindex, follow`: each `?q=` would be a page of its own with no content. `buscar` is a reserved slug.

### Links to other sites

Every link to another site (Discord, Twitch, YouTube, Ko-fi, Kick) opens in a new tab with `rel="noopener"` and a visually hidden «(se abre en otra pestaña)» at the end of its text: the header, the footer, the home page's live strip and author section, and links Torre writes in rich text or in a Dofus guide. `isExternalHref` (`src/lib/site/external.ts`) decides it: an `http` or `https` URL whose host is not Torre's domain or one of its subdomains, so this site's paths, its anchors, his Squarespace site and `mailto:` or `tel:` links stay in the same tab. `NEW_TAB`, `NewTabNote` and `SiteOrWebLink` (`src/components/site/NewTab.tsx`) apply it; `SiteOrWebLink` is for a link whose destination is not known in advance. The embedded YouTube player is not a link and stays out of the rule.

### The engine

`src/components/site/search.ts` has no React or DOM:

- `siteEntries` turns the index into search entries: quests, achievements, metalogros and, from `content`, Dofus guides, checklists and pages (`contentEntries`, with the egg as image). A quest links to `/<slug>` with "Nivel N · achievement" as its second line; an achievement links to its page `/<slug>` with "metalogro · N misiones"; a metalogro links to its panel, `/metalogros#<anchor>`, with its counts. A malformed index or row throws.
- `fold` and `words` compare without accents or case ("ebano" finds "Dofus Ébano").
- Ranking requires every word. A name that starts with the query ranks first (ignoring leading `¡` or `¿`), then one where every word starts a word, then one that only contains them; ties go to the shorter name, then alphabetical. Each of quests, achievements and metalogros is ranked separately: up to `MANY_QUESTS` (50) matches all show; with more, the best `SHOWN_WHEN_MANY` (20) show.
- `searchSite` returns groups for the dialog: «Misiones», «Logros», «Metalogros» and the menu groups. Groups go from the best match to the worst; on a tie, quests come first, then achievements, metalogros and the menu in menu order. With fewer than two letters or digits (`queryKind` in `search-query.ts`) it does not search and asks for another letter. `heroResults` does the same for the home page without the menu sections but with the Dofus guides, checklists and pages of `content` (`HERO_FOUND`), plus a flat list of the options in display order for the keyboard.
- The status line counts each found group ("12 misiones · 1 logro · 2 metalogros") and adds the menu matches ("· 2 resultados del menú"). A group with more than 50 matches reads "más de 50 logros", and the found part then ends with ": sigue escribiendo". With no quest, achievement or metalogro it says "Ninguna misión se llama «…»", or "Ninguna misión; N resultados del menú." when the menu matches.
- `highlight` splits a name into parts with every occurrence of every word marked; the components render them as text and `<mark>`, never `innerHTML`.
- `loadEntries` fetches the index once per page: if the home page already asked for it, the dialog reuses the same promise, and the other way round. A failure is forgotten so the next use asks again.

### Keeping it out of the initial JavaScript

Neither search adds to a page's initial JavaScript or RSC payload. The first time the dialog opens (or the home search field gets focus), never on page load, the island loads the engine and its results (`SearchList.tsx`) with `import()` and fetches the index. Strings are split the same way: `search-strings.ts` holds what the islands show before the engine arrives, `search-result-strings.ts` the lazy part, so neither chunk pulls in `strings.ts`. `search-query.ts`, the two-letter check, is small on purpose and rides with the islands.

The guide page sits close to its 150 KB budget (149,716 bytes of script on 2026-11-07, per AGENTS.md). Turbopack ships a whole module with the island when both the island and the lazy chunk import it, so search and result code must stay out of the island, and no module except the small ones above may be imported from both sides. See [Performance budgets](../testing/performance-budgets.md).

## Tests

- `tests/unit/site-search.test.ts`: guide, achievement and metalogro entries and their second lines, rejecting a malformed index or row, an index without achievements still valid, folding, all words in any order, ranking and ties, the 50 and 20 limits, the one-letter hint, groups ordered by best match with quests, achievements, metalogros and the menu on ties, the home search without the menu, highlighting, one index request shared by both searches and a retry after failure, the status line with achievements and metalogros and its "más de 50" per group, and that the search arrives by `import()` and shares no string or icon modules with the island.
- `tests/unit/search-index-endpoint.test.ts`: the index as plain JSON, not compressed by hand, and public cacheable headers.
- `tests/unit/search-page.test.tsx`: `/buscar`'s query (the first `q`, trimmed and capped), the empty and one-letter states, the home search's groups and order, the no-results line, the form that posts back with the text and the marked results.
- `tests/unit/external-links.test.tsx`: every link to another site in the header, the footer and the home sections opens in a new tab with its note, and `isExternalHref`.
- `tests/integration/achievement-page-queries.test.ts` (`readSearchIndex`): published achievements with their metalogro and quest count, and the metalogros that open, alongside the guides.
- `tests/integration/guide-search-index.test.ts`: published guides with achievement and level, the level Torre corrected on the quest or wrote on the guide winning; never a draft or unpublished guide; the published version of a guide with pending changes; each guide once, sorted by title.
- `tests/integration/site-search-content.test.ts`: the `content` rows: a published Dofus guide with the egg Torre corrected, no Dofus guide in preparation, checklists as the menu links them, and only the published standalone pages that open here.
- `tests/unit/site-shell.test.tsx`: the nav data (the Dofus section linking to `/guias-dofus` and Checklists to `/checklists`, the Dofus and the checklists coming from their collections, the checklists in the panel and the phone sheet with «Ver todas las checklists», the legacy note or no link when in preparation, no block without checklists, rows keyed by slug, `Well` icons in rem, Clases and Mazmorras marked soon, the search index with only the Dofus that have a published guide) and the header and footer markup, including two dropdowns with Clases and Mazmorras as «Próximamente» and nothing in the header linking classes or dungeons, the Dofus panel with the collection's Dofus in order, «Ver todas las guías de Dofus» and the preparing eggs without a link, the Misiones panel with the search button and one "Ver todo" to `/metalogros`, no quest or achievement link leaving the app in the panel or the phone sheet, the disabled phone tiles, and Explorar listing Clases and Mazmorras as text. A «Navegación» block checks the same header and footer with no navigation saved, Torre's order, names and hidden sections, a section without «Próximamente» linking its page and counting its list, the first section with a panel open on the phone, the three chosen eggs, and the footer and search following the same navigation.
- `tests/e2e/kofi.spec.ts`: the header button hidden, cup-only or with its text at each width without anything overflowing; gold with dark ink at 4.5:1 and a 3:1 border on the bar in every theme and mode; the floating button at the bottom right mid-page, opening Ko-fi in a new tab, placed before the footer and under the header, leaving at the footer without covering it, the cup alone on phones, covered by the open phone menu, stepping aside for the home search, absent over a desktop checklist, not printed, entering without animation under reduced motion and keeping its border in forced colors; axe in both Amakna modes.
- `tests/e2e/cabecera.spec.ts`: the search filled with the chip color and the mode switch on the surface, and the icon wells with the coordinates chip's background, in both Amakna modes, one dropdown each for Misiones and Dofus, Clases and Mazmorras shown with «Próximamente» and opening nothing on click, the Dofus panel with its preparing eggs and its link to `/guias-dofus`, keyboard entry and exit, arrow navigation, Ctrl K with accent-insensitive search, published achievements and open metalogros found in their groups (with preparing ones left out) and opened from the keyboard, the index requested on open, the loading and error states with retry, the public cacheable index, button sizes, focus return, shortcuts blocked under another dialog, the flat opaque bar from the top of the page, pinned and edge to edge without corners or shadow, the current section in its color, the menu in Lexend 600 and ink, the filled «Ver todo» and «Ver todas…» buttons and flat panel cards, the right-hand buttons ending at the gutter and leaving slack before it at each width, the theme picker and mode switch at 3:1 on the bar in every theme and mode, the theme menu in Lexend, the open picker distinct from the closed one on phones, the open phone menu keeping the header bar so the logo does not jump, axe on the open header and footer in both Amakna modes, the footer on the bar (dark) or `--color-raised` (light) with Discord and Ko-fi filled, «Próximamente» visible on the light footer, panels within the viewport, the phone menu and its focus handling, the phone tiles of Clases and Mazmorras that do not fold, no horizontal overflow down to 320 px, the footer columns without repeated links and with Clases and Mazmorras as «Próximamente» text, game icons never drawn larger than their files, and "Volver arriba" with smooth scroll (instant with reduced motion) and step anchors landing below the header.
