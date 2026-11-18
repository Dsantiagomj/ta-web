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
  - id: openwiki-source-9491a82d406f14a4574f8c9d
    resource: repo://src/components/dofus/dofus-index.css
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
  - id: openwiki-source-82f7e2d5fa988b170f5dea19
    resource: repo://src/lib/dofus-guides/egg-line.ts
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
generated: { by: "claude-code", at: "2026-11-18T11:06:38.803Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-18T11:06:38.803Z
---

# Dofus guides index and menu

`/guias-dofus` lists every Dofus guide as a card, in Torre's order. The site header's Dofus panel and its search use the same list. All of it comes from the `dofus-guides` collection and the `dofus-guides-index` global (see [Dofus guide data model](dofus-guide-data.md)): a Dofus Torre adds or publishes in the panel appears without a code change.

## The route

`src/app/(frontend)/guias-dofus/page.tsx` is a top-level route, so `guias-dofus` is in `RESERVED_SLUGS` and no `/<slug>` page can take it. Its `generateMetadata` uses `indexMetadata` with the SEO title and description of the «Portada e índices» global, the canonical `/guias-dofus` (`DOFUS_INDEX_PATH`), Open Graph type `website` and the share defaults of «Ajustes del sitio» (see [Site settings and index texts](../cms/site-copy.md)).

`readIndex` reads, in parallel and as a visitor, the list of Dofus (`readDofusList`, the same query the guide page uses for previous and next, see [Dofus guide page](dofus-guide-page.md#loading)) and the global's intro. It is wrapped in `unstable_cache` under the `dofus-guides` tag with a 600-second `revalidate`, so saving a Dofus guide, the global, an achievement page, a quest guide or a Media file expires it.

## Cards

`dofusIndexView` (`src/lib/dofus-guides/index-view.ts`) is pure code. It returns one card per Dofus and the filters:

- **Card**: name, slug, egg (the Dofus item's image), the color behind the egg (`--egg`), the border color per mode (`line`), the tag and its label, and the meta parts. A published Dofus links to `/<slug>` and its meta parts are its achievements, quests and level (`["7 logros", "40 misiones", "Nivel 180"]`), which `MetaParts` joins with " - " in unbreakable blocks, so on a phone a line breaks between parts and never starts with the dash. A Dofus in `preparing` is disabled, without a link, shows "En preparación" as a pill, and its meta line has only the level.
- **Border**: `eggLine` (`src/lib/dofus-guides/egg-line.ts`) takes the Dofus color as is when it reaches 3:1 (WCAG 1.4.11, non-text contrast) against the worst ground of each mode across the themes (`EGG_LINE_GROUND`: Bonta's surface in dark mode, Amakna's background in light mode, checked against `theme.css` by `tests/unit/dofus-egg-line.test.ts`), and otherwise lightens it in dark mode or darkens it in light mode just enough, through the same `contrastedColor` as the `/checklists` poster names. The silver Dofus Plateado, for example, gets a darker border in light mode. The halo and the foil keep the color as is.
- **Search text**: the name and the aliases, folded to lowercase without accents (`foldText`).
- **Filters**: "Todos" plus "Primordiales" and "Evento", only for the tags some card has. With no tagged card there are no filters.

`DofusIndex` (`src/components/dofus/DofusIndex.tsx`) renders the eyebrow and the title from «Portada e índices» (falling back to `indexTextDefaults.dofusGuides`; no count in the title: counts change), Torre's intro as rich text, the island and `DofusCards`. `DofusCards` is also used by the `/sistema` catalog. The first four cards load their egg with `priority`: on a phone (2 × 2) and in the first desktop row the egg is the largest image on screen, the LCP, so it is not deferred. The styles are in `dofus-index.css`, which `DofusIndex.tsx` imports, so they load only where the cards are used.

Each card is flat: `--color-surface`, an 8px radius and a 2px border in `--egg-edge`, which reads `--egg-line-dark` or `--egg-line-light` by mode (falling back to `--egg`, then the section color). The tag is filled: «Evento» in `--color-hue-6`, «Primordial» in `--color-hue-2`, both with `--color-on-hue` text; in a card narrower than 14rem (two per row on a phone) it moves under the figures so it does not cover the egg. The `<main>` carries `pageSection('dofus')`, so the header marks the Dofus section as current.

A published card carries `data-tilt` and a `dcard__foil` layer, a holographic sheen tinted by the Dofus color (`--egg`; `screen` blend in dark mode, `multiply` in light). A card «En preparación» has neither and never moves.

## Search and filters

`DofusIndexIsland` (`src/components/dofus/DofusIndexIsland.tsx`) adds a search box and the filter pills, and starts the shared tilt (`startTilt` from `src/components/ui/tilt.ts`, the same one as the `/checklists` posters): with a mouse and without reduced motion, a published card tilts toward the pointer up to 9° per side and its foil follows the pointer (`--fx`, `--fy`). It is the page's only client island. Without JavaScript none of this exists and every card is visible and still.

The filter pills form a segmented control (`.dg-seg`): an indicator (`.dg-seg__ind`) in `--color-btn` slides under the chosen pill (`aria-pressed="true"`), whose text turns to `--color-btn-ink`. Because the button fill does not reach 3:1 on the track in every theme (Amakna light's lime gives 1.67), the indicator also carries a 1.5px inset ring in `--color-btn-ink`, so the chosen filter never depends on color alone.

To keep the island small, its search code lives in `src/lib/dofus-guides/index-search.ts` (`foldText`, `matchesDofus`, dependency-free; `index-view.ts` re-exports them) and its strings in `src/components/dofus/index-island-strings.ts`, so it does not pull in the whole Dofus guide string module or view model.

The server renders every card with `data-search` and `data-tag`. On each change the island runs `matchesDofus` on each cell, which requires the filter's tag and every word of the query, in any order, inside the folded search text. It then toggles the cells' `hidden` attribute inside `smoothUpdate(…, 'guias-dofus')`, a view transition with that type: the cards that leave fade and the ones that stay slide into place (see [Styles, tokens and site shell](../frontend/styles-and-shell.md#motion)). A `role="status"` line says how many Dofus remain, or that none matches, only while there is a query or a filter.

## Header menu and search

The frontend layout loads `loadDofusNav` (`src/app/(frontend)/site-data.ts`) alongside the guide counts. It runs `readDofusList` and `dofusNavItems` (`src/lib/dofus-guides/nav.ts`) under the `dofus-guides` cache tag. Each item has the Dofus name, the egg at its 128 px size (it is drawn at 44 px at most), and a link to `/<slug>` only when the guide's state is `published`.

- The Dofus section of the header links to `/guias-dofus`, and its panel shows every Dofus in Torre's order as an egg grid: published ones are links; the rest have no link, `aria-disabled` and a screen-reader "En preparación". "Ver todas las guías de Dofus" goes to the index. The panel's featured card shows three eggs chosen by Torre in the «Navegación» global (the published guides' eggs, falling back to Turquesa, Esmeralda and Ocre); see [Site settings, index texts and navigation](../cms/site-copy.md).
- The site search index (`readSearchIndex`, `src/lib/search/read-index.ts`) passes the same `dofusNavItems` through `searchIndex` (`src/components/site/nav.ts`), which keeps only the Dofus with a link, so a Dofus in preparation is never found.

See [Site header, footer and search](../frontend/site-shell-and-search.md).

## Tests

- `tests/unit/dofus-index-view.test.ts`: cards with their link and counts, the `preparing` card without a link, tag and color, filters only for present tags, the folded search on name and aliases, and the tag filter.
- `tests/unit/dofus-index-cards.test.tsx`: the first cards' eggs load eagerly with priority and the rest are deferred; published cards carry the tilt and foil and preparing ones do not; the border custom properties and the meta parts in unbreakable blocks.
- `tests/unit/dofus-egg-line.test.ts`: `eggLine` and its grounds against `theme.css`.
- `tests/unit/dofus-index-island.test.ts` and `tests/unit/tilt.test.ts`: the island's small imports and the shared tilt.
- `tests/unit/dofus-nav.test.ts`: menu items in the collection's order, with a link only when the guide can be opened.
- `tests/e2e/guias-dofus.spec.ts` (index part): title, Torre's intro and one card per Dofus in order; the filter and the search leave only the matching cards and announce it; the eyebrows of this index, `/checklists` and the home page in the accent and Lexend; the chosen filter on the button fill with its ink and at 3:1 against the track in every theme and mode; the «En preparación» card visible in light mode; the tag not covering the egg on narrow cards; each card's egg-colored border and filled tags, and 3:1 borders in light mode; the meta figures breaking between parts on a phone; without JavaScript every card shows and the search box does not; axe (WCAG 2.2 AA) in both modes; the header's Dofus panel links the index and each published guide, and not a Dofus in preparation.
