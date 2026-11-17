---
type: feature
title: Dofus guides index and menu
description: The /guias-dofus index (Torre's intro, one card per Dofus in her order, a search and tag filter island that animates with view transitions) and how the site header's Dofus menu and search list the Dofus from the dofus-guides collection.
tags: [dofus-guides, frontend, index, search, navigation, cache]
sources:
  - id: openwiki-source-2335a47ac9395688d636b848
    resource: repo://src/app/(frontend)/guias-dofus/page.tsx
  - id: openwiki-source-e662deaf5fc4b6bc8b7128a5
    resource: repo://src/app/(frontend)/site-data.ts
  - id: openwiki-source-fdce55e7847bc02f550db2a4
    resource: repo://src/components/dofus/DofusIndex.tsx
  - id: openwiki-source-abb20cd71cbe6f9faaed0ea7
    resource: repo://src/components/dofus/DofusIndexIsland.tsx
  - id: openwiki-source-95bd38707d8fecbaa0e05072
    resource: repo://src/components/dofus/index-island-strings.ts
  - id: openwiki-source-39afe86b52965c905da37bef
    resource: repo://src/components/site/nav.ts
  - id: openwiki-source-6bf04cbb0aa0ee8a237c4b83
    resource: repo://src/components/ui/tilt.ts
  - id: openwiki-source-41abc2470d715ccd870d5740
    resource: repo://src/lib/dofus-guides/index-search.ts
  - id: openwiki-source-5204707ed4f763579c428454
    resource: repo://src/lib/dofus-guides/index-view.ts
  - id: openwiki-source-423248a3a9612f01d4a80a72
    resource: repo://src/lib/dofus-guides/nav.ts
  - id: openwiki-source-811b90631e6a253e11b290ca
    resource: repo://src/lib/site-copy/navigation.ts
  - id: openwiki-source-0541138ab33ba7b069dd2d9c
    resource: repo://tests/e2e/guias-dofus.spec.ts
  - id: openwiki-source-030fff9a24dad34718a579b7
    resource: repo://tests/unit/dofus-index-cards.test.tsx
  - id: openwiki-source-349bba9237ee8f6bb526add4
    resource: repo://tests/unit/dofus-index-island.test.ts
  - id: openwiki-source-dd81ea97933c0bd2749bb729
    resource: repo://tests/unit/dofus-index-view.test.ts
  - id: openwiki-source-b9fc2eac8ee9b162727decdc
    resource: repo://tests/unit/dofus-nav.test.ts
generated: { by: "claude-code", at: "2026-11-17T11:00:20.552Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-17T11:00:20.552Z
---

# Dofus guides index and menu

`/guias-dofus` lists every Dofus guide as a card, in Torre's order. The site header's Dofus panel and its search use the same list. All of it comes from the `dofus-guides` collection and the `dofus-guides-index` global (see [Dofus guide data model](dofus-guide-data.md)): a Dofus Torre adds or publishes in the panel appears without a code change.

## The route

`src/app/(frontend)/guias-dofus/page.tsx` is a top-level route, so `guias-dofus` is in `RESERVED_SLUGS` and no `/<slug>` page can take it. Its `generateMetadata` uses `indexMetadata` with the SEO title and description of the «Portada e índices» global, the canonical `/guias-dofus` (`DOFUS_INDEX_PATH`), Open Graph type `website` and the share defaults of «Ajustes del sitio» (see [Site settings and index texts](../cms/site-copy.md)).

`readIndex` reads, in parallel and as a visitor, the list of Dofus (`readDofusList`, the same query the guide page uses for previous and next, see [Dofus guide page](dofus-guide-page.md#loading)) and the global's intro. It is wrapped in `unstable_cache` under the `dofus-guides` tag with a 600-second `revalidate`, so saving a Dofus guide, the global, an achievement page, a quest guide or a Media file expires it.

## Cards

`dofusIndexView` (`src/lib/dofus-guides/index-view.ts`) is pure code. It returns one card per Dofus and the filters:

- **Card**: name, slug, egg (the Dofus item's image), the color behind the egg (`--egg`), the tag and its label, and a meta line. A published Dofus links to `/<slug>` and its meta line has its achievements, quests and level ("7 logros - 40 misiones - Nivel 180"). A Dofus in `preparing` is disabled, without a link, shows "En preparación" as a pill, and its meta line has only the level.
- **Search text**: the name and the aliases, folded to lowercase without accents (`foldText`).
- **Filters**: "Todos" plus "Primordiales" and "Evento", only for the tags some card has. With no tagged card there are no filters.

`DofusIndex` (`src/components/dofus/DofusIndex.tsx`) renders the eyebrow and the title from «Portada e índices» (falling back to `indexTextDefaults.dofusGuides`; no count in the title: counts change), Torre's intro as rich text, the island and `DofusCards`. `DofusCards` is also used by the `/sistema` catalog. The first four cards load their egg with `priority`: on a phone (2 × 2) and in the first desktop row the egg is the largest image on screen, the LCP, so it is not deferred. The styles are in `dofus-index.css`, which `DofusIndex.tsx` imports, so they load only where the cards are used.

A published card carries `data-tilt` and a `dcard__foil` layer, a holographic sheen tinted by the Dofus color (`--egg`; `screen` blend in dark mode, `multiply` in light). A card «En preparación» has neither and never moves.

## Search and filters

`DofusIndexIsland` (`src/components/dofus/DofusIndexIsland.tsx`) adds a search box and the filter pills, and starts the shared tilt (`startTilt` from `src/components/ui/tilt.ts`, the same one as the `/checklists` posters): with a mouse and without reduced motion, a published card tilts toward the pointer up to 9° per side and its foil follows the pointer (`--fx`, `--fy`). It is the page's only client island. Without JavaScript none of this exists and every card is visible and still.

To keep the island small, its search code lives in `src/lib/dofus-guides/index-search.ts` (`foldText`, `matchesDofus`, dependency-free; `index-view.ts` re-exports them) and its strings in `src/components/dofus/index-island-strings.ts`, so it does not pull in the whole Dofus guide string module or view model.

The server renders every card with `data-search` and `data-tag`. On each change the island runs `matchesDofus` on each cell, which requires the filter's tag and every word of the query, in any order, inside the folded search text. It then toggles the cells' `hidden` attribute inside `smoothUpdate(…, 'guias-dofus')`, a view transition with that type: the cards that leave fade and the ones that stay slide into place (see [Styles, tokens and site shell](../frontend/styles-and-shell.md#motion)). A `role="status"` line says how many Dofus remain, or that none matches, only while there is a query or a filter.

## Header menu and search

The frontend layout loads `loadDofusNav` (`src/app/(frontend)/site-data.ts`) alongside the guide counts. It runs `readDofusList` and `dofusNavItems` (`src/lib/dofus-guides/nav.ts`) under the `dofus-guides` cache tag. Each item has the Dofus name, the egg at its 128 px size (it is drawn at 44 px at most), and a link to `/<slug>` only when the guide's state is `published`.

- The Dofus section of the header links to `/guias-dofus`, and its panel shows every Dofus in Torre's order as an egg grid: published ones are links; the rest have no link, `aria-disabled` and a screen-reader "En preparación". "Ver todas las guías de Dofus" goes to the index. The panel's featured card shows three eggs chosen by Torre in the «Navegación» global (the published guides' eggs, falling back to Turquesa, Esmeralda and Ocre); see [Site settings, index texts and navigation](../cms/site-copy.md).
- The site search index (`readSearchIndex`, `src/lib/search/read-index.ts`) passes the same `dofusNavItems` through `searchIndex` (`src/components/site/nav.ts`), which keeps only the Dofus with a link, so a Dofus in preparation is never found.

See [Site header, footer and search](../frontend/site-shell-and-search.md).

## Tests

- `tests/unit/dofus-index-view.test.ts`: cards with their link and counts, the `preparing` card without a link, tag and color, filters only for present tags, the folded search on name and aliases, and the tag filter.
- `tests/unit/dofus-index-cards.test.tsx`: the first cards' eggs load eagerly with priority and the rest are deferred; published cards carry the tilt and foil and preparing ones do not.
- `tests/unit/dofus-index-island.test.ts` and `tests/unit/tilt.test.ts`: the island's small imports and the shared tilt.
- `tests/unit/dofus-nav.test.ts`: menu items in the collection's order, with a link only when the guide can be opened.
- `tests/e2e/guias-dofus.spec.ts` (index part): title, Torre's intro and one card per Dofus in order; the filter and the search leave only the matching cards and announce it; without JavaScript every card shows and the search box does not; axe (WCAG 2.2 AA) in both modes; the header's Dofus panel links the index and each published guide, and not a Dofus in preparation.
