---
type: feature
title: Metalogros index
description: The /metalogros page that lists Torre's metalogros in three groups with their achievement pages and guides, how its view is computed and cached, and its one client island for the tile panel and the lazily loaded search.
tags: [achievements, metalogros, frontend, search, caching, islands]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-08T11:00:21.339Z
sources:
  - id: openwiki-source-7382aecd8b46a81ca66efc96
    resource: repo://lighthouserc.cjs
  - id: openwiki-source-2db76d84ebc87095c44118ff
    resource: repo://src/app/(frontend)/metalogros/page.tsx
  - id: openwiki-source-b8e52bc64cf2890509532ce9
    resource: repo://src/components/achievement/MetalogrosIndex.tsx
  - id: openwiki-source-0391870516225da61a963c2c
    resource: repo://src/components/achievement/MetalogrosIsland.tsx
  - id: openwiki-source-f32f17a5240049daa960c565
    resource: repo://src/lib/achievements/metalogros-search.ts
  - id: openwiki-source-5471b2388f699051910e329b
    resource: repo://src/lib/achievements/metalogros.ts
  - id: openwiki-source-e73131df56ebe53f18c77bc5
    resource: repo://src/lib/achievements/queries.ts
  - id: openwiki-source-cf2cbbdb1dcdabf3a2d7fb52
    resource: repo://tests/e2e/metalogros.spec.ts
generated: { by: "claude-code", at: "2026-11-08T11:00:21.339Z" }
---

# Metalogros index

`/metalogros` is the index of Torre's metalogros (`achievement-groups`, see [Achievement data model](achievement-data.md)): his game zones and stories in three groups, each with its achievement pages and loose guides. The route is reserved in `src/lib/guides/slug.ts`, so no guide, achievement page or metalogro can take the slug.

## Route and cache

`src/app/(frontend)/metalogros/page.tsx` has static metadata (canonical `/metalogros`, Open Graph type `website`) and renders `MetalogrosIndex` in the achievements section color.

The whole computed view is cached: `unstable_cache` wraps `metalogrosIndexView(await readMetalogrosIndex(payload))` under the `achievement-pages` tag with the same 600-second `revalidate` as achievement pages. The hooks that expire that tag (achievement pages, metalogros, quest guides and media) therefore also refresh the index; see [Achievement page](achievement-page.md#revalidation).

## What it reads

`readMetalogrosIndex` (`src/lib/achievements/queries.ts`) reads as a visitor (`draft: false`, `overrideAccess: false`):

- the published metalogros at depth 2, with only the representative's name and image populated (`renderRight` for an NPC, `image` for a monster);
- every published achievement page with a metalogro, sorted by `order` then `name`, including pages in `preparing` (they show dimmed), with the achievement icon and quest names and levels;
- the published quest guides each metalogro lists in `guides`.

## The view model

`metalogrosIndexView` (`src/lib/achievements/metalogros.ts`) is pure code. For each metalogro it builds a zone:

- **Achievements**: each page with its quest count and level range. A page not in state `published` is `off`: listed, without a link.
- **Guides**: the metalogro's loose guides, linked.
- **Anchor**: the slug without `metalogro-` (`metalogro-astrub` becomes `#astrub`).
- **Art**: the representative's image; if none, the icon of the first achievement with one.
- **Counts**: "N logros · M misiones", where quests are the pages' quest rows plus the loose guides. A zone with no achievements shows its quest count instead.
- **Preparing**: a metalogro whose `state` is not `published` gets a quiet label, either "En preparación" or "En preparación: X de sus Y logros" when some of its pages are published. It is fully `off`, with no panel, only when it is preparing and has no published page and no guide.

Zones fall into three sections by `section` (default `zones`): `stories` sorted by `order` and then name, `zones` and `seasonal` alphabetically with a Spanish collator. The header line totals zones, achievements and quests.

The view also builds the search data, compact so it can ship inside the page:

| Key | Row |
|---|---|
| `z` | zone name, anchor, counts, `1` when off |
| `a` | achievement name, zone name, href, quest count, `1` when off |
| `q` | quest name, position in its achievement, index of the achievement in `a` |

An achievement is off when its zone is off or the page is not published.

## Server HTML

`MetalogrosIndex` (`src/components/achievement/MetalogrosIndex.tsx`) renders the search field, the three sections of tiles and, under them, the list of each zone. Without JavaScript each tile is a link to its zone's list below, so the page works fully without the island. The search data goes into a `<script type="application/json" id="metalogros-data">`, with `<` escaped so no name can close the tag.

It imports only its own stylesheet, `metalogros.css`. Importing `game.css` and `achievement.css` too made Turbopack split the guide and achievement styles into more chunks and raised the page's LCP by about half a second.

## The island

`MetalogrosIsland` (`src/components/achievement/MetalogrosIsland.tsx`) renders nothing; it adds behavior to the server HTML:

- **Tile panel**: tiles become buttons that open the zone's list in a panel spanning their row, right below. The URL hash follows the open panel, back and forward work, a hash on arrival opens its zone, and Esc or "Cerrar" closes the panel and returns focus to the tile.
- **Search**: a WAI-ARIA combobox with a listbox. It parses the embedded JSON, and the first time it is used it loads `src/lib/achievements/metalogros-search.ts` with `import()`, so the search code is not in the page's initial JavaScript. Arrow keys move `aria-activedescendant` and skip off results; Enter opens; Esc closes and then clears. A zone result opens its panel; the others go to their page.

### Matching

`searchIndex` folds accents and case one character at a time, so match positions in the folded text line up with the original for highlighting. It requires every word in any order, and drops small words (`de`, `del`, `la`, `las`, `el`, `los`, `y`, `a`, `en`) unless the query has nothing else. It needs at least two characters and returns up to 4 zones, 7 achievements and 7 quests; a quest result links to its achievement page. `markMatches` escapes the name and wraps each match in `<mark>`.

## Budget and tests

Lighthouse CI audits `/metalogros` (see [Performance budgets](../testing/performance-budgets.md)).

- `tests/unit/metalogros-index.test.ts`: the view model.
- `tests/unit/metalogros-search.test.ts`: folding, small words, limits and highlighting.
- `tests/e2e/metalogros.spec.ts`: a tile opening its panel with the hash following it; a metalogro with nothing published dimmed, without a link or panel; search results with preparing items not selectable; the hash opening its zone on arrival; tiles linking to the lists without JavaScript; axe (WCAG 2.2 AA) in both modes with a panel open.
