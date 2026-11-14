---
type: feature
title: Checklist page and index
description: How /<slug> renders a published checklist (route order, cached loader with the checklists tag, draft preview, the redirect of a checklist «En preparación»), the server-rendered window, the details endpoint the island fetches after paint, the island and its lazily loaded progress UI, and the /checklists index and menu entries built from one cached read.
tags: [checklists, nextjs, routing, caching, island, endpoint]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-14T11:00:46.827Z
sources:
  - id: openwiki-source-7382aecd8b46a81ca66efc96
    resource: repo://lighthouserc.cjs
  - id: openwiki-source-5f173911ef4320f575b119a6
    resource: repo://src/app/(frontend)/%5Bslug%5D/checklist-data.ts
  - id: openwiki-source-824582d159abdf0aa24a3451
    resource: repo://src/app/(frontend)/%5Bslug%5D/ChecklistView.tsx
  - id: openwiki-source-cb49e3c4d1015b8673e71275
    resource: repo://src/app/(frontend)/%5Bslug%5D/page.tsx
  - id: openwiki-source-5f0afecf4f0bcd886ec62fb5
    resource: repo://src/app/(frontend)/checklists/page.tsx
  - id: openwiki-source-e662deaf5fc4b6bc8b7128a5
    resource: repo://src/app/(frontend)/site-data.ts
  - id: openwiki-source-4f2e53306895c158accd92ec
    resource: repo://src/collections/revalidate-guides.ts
  - id: openwiki-source-18319f256508213c34533c97
    resource: repo://src/components/checklist/ChecklistIsland.tsx
  - id: openwiki-source-3565ad21d65bf23ebb27b148
    resource: repo://src/endpoints/checklist-details.ts
  - id: openwiki-source-7c15ae8d86f1d3a4af1d4666
    resource: repo://src/lib/checklists/cache.ts
  - id: openwiki-source-02ffbdd2c07423648e60c235
    resource: repo://src/lib/checklists/details-url.ts
  - id: openwiki-source-b302606a8cc84af7a30d22cd
    resource: repo://src/lib/checklists/details.ts
  - id: openwiki-source-765af2a447d91c2278b95582
    resource: repo://src/lib/checklists/list.ts
  - id: openwiki-source-0cb986b9dee2806b719ee720
    resource: repo://src/lib/checklists/page.ts
  - id: openwiki-source-64cb67184a332f58fce45aeb
    resource: repo://src/lib/checklists/queries.ts
generated: { by: "claude-code", at: "2026-11-14T11:00:46.827Z" }
---

# Checklist page and index

A checklist (see [Checklist data and import](checklist-data.md)) renders at `/<slug>`, the route it shares with quest guides, achievement pages and Dofus guides. `/checklists` lists every checklist, and the header menu, footer, search and home page show the same list.

## Route

`src/app/(frontend)/[slug]/page.tsx` tries a quest guide, an achievement page and a Dofus guide first, then `loadChecklist(slug)`. With no checklist it returns 404. Otherwise `checklistRoute` (`src/lib/checklists/page.ts`) decides:

| Case | Result |
|---|---|
| Preview, or `state` is `published` | Render `ChecklistView` |
| `preparing` with a `legacyHref` on another origin | `redirect()` to the Squarespace checklist |
| `preparing` with no link, an invalid link, or a link to this same site (it would loop) | 404 |

`generateMetadata` uses the same rule: only a checklist that would render gets a title (`checklistPageStrings.title`), its description (or a default) and a canonical `/<slug>`.

## Loading and caching

`loadChecklist` (`src/app/(frontend)/[slug]/checklist-data.ts`) is wrapped in React `cache`. With Next's draft mode and a panel session it reads the latest draft without any cache; otherwise it reads the published document through `unstable_cache` with the `checklists` tag and a 600-second `revalidate` (`src/lib/checklists/cache.ts`). The published read includes checklists «En preparación», because the route decides what to do with them.

`readChecklist` (`src/lib/checklists/queries.ts`) loads the checklist with its quests (name and level), the «Necesitarás» items, achievements, figures, bosses and images, its Dofus guide with the egg, and the slugs of the published quest guides and achievement pages it links. Linked guides and pages are always read as a visitor would, so an unpublished one never becomes a link. `readQuestGraph` adds what the progress engine needs: each quest's objectives, start criteria and prerequisites, following prerequisites outside the checklist to the end of the chain in at most two queries.

The tag is expired by the hooks of `checklists`, `quest-guides`, `achievement-pages`, `dofus-guides` and `media` (`src/collections/revalidate-guides.ts`). Quests and subareas change only through `pnpm data:quests`, outside the server, so they show within the 10-minute `revalidate`.

## The page

`checklistView` turns the data into what `ChecklistView` (`src/app/(frontend)/[slug]/ChecklistView.tsx`) renders. Everything is rendered on the server and readable without JavaScript, one part after another:

- the breadcrumb and `ChecklistHeader`, with the Dofus egg and its color (`eggStyle` passes the color as a CSS custom property);
- a window (`ck-win`) with the progress strip and three tabs: «Diario» (the step list and the open step; on phones the step opens in a sheet), «Prerrequisitos» (only when there are rows) and «Objetos» (the totals, only when some row counts);
- the step sheet and progress dialogs, used by the island.

Each step shows its zone, its text segments (a quoted achievement name becomes a link to its published page), its quests, notes, art and «Necesitarás» rows grouped by category. «Objetos» sums every row that counts in the totals by item, or by text when the row is not an item, lists the steps that ask for it, and puts it in the group of the first step that does.

The view hands the island only structure, never text (`ChecklistIslandData`): the checklist id, slug and version, each step's stepId, old number and quests (with any stop objective), the steps each one closes, the `legacy` migration data, the progress weights, each quest's objective count, prerequisites and parent quests, and the names and old ids of every checklist.

## The details endpoint

What the page does not put in its HTML (who gives each quest and where, each objective's text, coordinates and subarea) comes from `GET /api/checklists/:slug/details` (`src/endpoints/checklist-details.ts`), mounted on the `checklists` collection. `checklistDetails` (`src/lib/checklists/details.ts`) packs it as short tuples keyed by DofusDB quest id, because a checklist has many quests; the URL and tuple types live in the dependency-free `details-url.ts`, which the island imports.

- A visitor reads the published checklist through `unstable_cache` with the `checklists` tag, and the response carries `Cache-Control: public, max-age=300, stale-while-revalidate=3600`.
- A panel user with Next's draft mode reads the latest draft, sent as `private, no-store`.
- No checklist answers 404.
- The endpoint gzips the JSON itself when the browser accepts it, because Next does not compress Payload's API responses.

## The island

`ChecklistIsland` (`src/components/checklist/ChecklistIsland.tsx`) is a client component that renders nothing and syncs with the server HTML, `<dialog>`, `matchMedia` and the details API. It turns the tab links into ARIA tabs, keeps one step open (the one in `#paso-N`, or the first on wide screens), filters steps by search text, and moves between steps. Once per page, after paint, it fetches the details and paints the quest givers, coordinate chips (copied by the guides' `PageEnhancements` island) and subareas; on failure it shows a message in its status region. The effect restarts only for another checklist or a new version, so a live preview refresh that brings the same data does not reset it. Its strings live in `island-strings.ts`, so it never pulls in the panel strings.

The `/<slug>` route ships this island to quest guides, achievement pages and Dofus guides too, which sit close to their 150 KB JavaScript budget. So the island loads the progress UI (`progress-ui.ts`, with its strings in `progress-strings.ts`) with `import()`, and only on a checklist page. See [Checklist progress engine](progress.md). Lighthouse CI gives checklist pages 180 KB of JavaScript instead of 150 KB (see [Performance budgets](../testing/performance-budgets.md)).

## Index and menu

`loadChecklists` (`src/app/(frontend)/site-data.ts`) is one cached read, with the `checklists` tag, shared by `/checklists`, the header menu, the footer, the search and the home page. `readChecklists` returns every published checklist, «En preparación» included, ordered by `order` then `name`, without steps, with the egg and color of its Dofus guide. It reads that egg and color even when the guide is still a draft, because they are game data, and selects nothing else from it.

`checklistEntries` (`src/lib/checklists/list.ts`) decides where each entry links: a published checklist to `/<slug>`, one «En preparación» to its `legacyHref` marked as legacy, or nowhere when it has no link. `loadChecklistNav` maps the same entries to the menu items (`checklistNavItems`), with a 128px egg.

`/checklists` (`src/app/(frontend)/checklists/page.tsx`) renders `ChecklistsIndex` (`src/components/checklists/ChecklistsIndex.tsx`, styled in `checklists-index.css`): one card per checklist with its egg, name, description and, for one «En preparación», a tag and a note that it opens the old site. The first two eggs load with priority because one may be the LCP image. `checklists` is a reserved slug segment (`src/lib/guides/slug.ts`).

## Tests

- `tests/unit/checklist-page.test.ts`, `tests/unit/checklist-helpers.test.ts` and `tests/unit/checklist-quest-graph.test.ts`: the view model, `checklistRoute` and the quest graph.
- `tests/unit/checklist-details.test.ts`, `checklist-details-query.test.ts` and `checklist-details-fill.test.ts`: the details payload, the endpoint and how the island paints them.
- `tests/unit/checklist-components.test.tsx`, `checklist-island.test.tsx`, `checklist-list.test.ts` and `checklists-index.test.tsx`: the parts, the island, the entries and the index.
- `tests/integration/checklist-page-queries.test.ts` and `checklist-list-queries.test.ts`: the queries with real access rules.
- `tests/e2e/checklist.spec.ts` and `tests/e2e/checklists-index.spec.ts`: the seeded Nebuloso page and the index, with axe; `scripts/seed-e2e.ts` seeds them from `tests/e2e/seed/checklists.ts` and `checklists-index.ts`.
