---
type: feature
title: Checklist page
description: How /<slug> renders a published steps checklist (route order, the cached loader with the checklists tag, draft preview, the redirect of a checklist «En preparación»), the server-rendered window with Torre's route lines inside each quest, the totals in «Objetos», the details endpoint the island fetches after paint, and the island with its lazily loaded progress UI.
tags: [checklists, nextjs, routing, caching, island, endpoint]
sources:
  - id: openwiki-source-7382aecd8b46a81ca66efc96
    resource: repo://lighthouserc.cjs
  - id: openwiki-source-5f173911ef4320f575b119a6
    resource: repo://src/app/(frontend)/%5Bslug%5D/checklist-data.ts
  - id: openwiki-source-824582d159abdf0aa24a3451
    resource: repo://src/app/(frontend)/%5Bslug%5D/ChecklistView.tsx
  - id: openwiki-source-cb49e3c4d1015b8673e71275
    resource: repo://src/app/(frontend)/%5Bslug%5D/page.tsx
  - id: openwiki-source-4f2e53306895c158accd92ec
    resource: repo://src/collections/revalidate-guides.ts
  - id: openwiki-source-ebf2f4a61c1a17652d2f7655
    resource: repo://src/components/checklist/checklist-ui.ts
  - id: openwiki-source-c614cc57fb9ff835c46ee14d
    resource: repo://src/components/checklist/checklist.css
  - id: openwiki-source-18319f256508213c34533c97
    resource: repo://src/components/checklist/ChecklistIsland.tsx
  - id: openwiki-source-4c3255dd987453003d4232f4
    resource: repo://src/components/checklist/ChecklistParts.tsx
  - id: openwiki-source-d8923fbcfbb18e49399b9348
    resource: repo://src/components/checklist/progress-strings.ts
  - id: openwiki-source-7d0703f319f0f8dba577fd0a
    resource: repo://src/components/checklist/progress-ui.ts
  - id: openwiki-source-3d2f7744bdd8a581e6cbd2c0
    resource: repo://src/components/checklist/road-ui.ts
  - id: openwiki-source-3565ad21d65bf23ebb27b148
    resource: repo://src/endpoints/checklist-details.ts
  - id: openwiki-source-7c15ae8d86f1d3a4af1d4666
    resource: repo://src/lib/checklists/cache.ts
  - id: openwiki-source-02ffbdd2c07423648e60c235
    resource: repo://src/lib/checklists/details-url.ts
  - id: openwiki-source-b302606a8cc84af7a30d22cd
    resource: repo://src/lib/checklists/details.ts
  - id: openwiki-source-0cb986b9dee2806b719ee720
    resource: repo://src/lib/checklists/page.ts
  - id: openwiki-source-371e358f6a2c7ae51f93192b
    resource: repo://src/lib/checklists/published.ts
  - id: openwiki-source-64cb67184a332f58fce45aeb
    resource: repo://src/lib/checklists/queries.ts
  - id: openwiki-source-7a2e3264c126bbd868a1abd9
    resource: repo://src/lib/checklists/relations.ts
  - id: openwiki-source-6744ab0739caa2a85b3bb571
    resource: repo://src/lib/checklists/road.ts
  - id: openwiki-source-fb8279296835a1a58ec3f427
    resource: repo://src/lib/site/legacy.ts
  - id: openwiki-source-8728a958dd5a79ae9c3ca846
    resource: repo://src/styles/theme.css
generated: { by: "claude-code", at: "2026-11-20T11:20:16.585Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-20T11:20:16.585Z
---

# Checklist page

A checklist (see [Checklist data and import](checklist-data.md)) renders at `/<slug>`, the route it shares with quest guides, achievement pages and Dofus guides. This page covers a steps checklist; a souls checklist renders `SoulsView` (see [Souls checklist](souls-checklist.md)). The `/checklists` index has its own page (see [Checklists index](checklists-index.md)).

## Route

`src/app/(frontend)/[slug]/page.tsx` tries a quest guide, an achievement page, a Dofus guide and a standalone page first, then `loadChecklist(slug)`. With no checklist it answers a 308 to a changed slug's new address or 404 (`redirectOrNotFound`). Otherwise `checklistRoute` (`src/lib/checklists/page.ts`) decides through `legacyRoute` (`src/lib/site/legacy.ts`), the rule standalone pages share:

| Case | Result |
|---|---|
| Preview, or `state` is `published` | Render `SoulsView` for a souls checklist, `ChecklistView` otherwise |
| `preparing` with a `legacyHref` on another origin | `redirect()` to the Squarespace checklist |
| `preparing` with no link, an invalid link, or a link to this same site (it would loop) | 404 |

`generateMetadata` uses the same rule: only a checklist that would render gets a title (`checklistPageStrings.title`, or the plain name for a souls checklist such as «Almas del Ocre»), its description (or a default) and a canonical `/<slug>`.

## Loading and caching

`loadChecklist` (`src/app/(frontend)/[slug]/checklist-data.ts`) is wrapped in React `cache`. With Next's draft mode and a panel session it reads the latest draft without any cache. Otherwise it calls `readPublishedChecklist` (`src/lib/checklists/published.ts`), which wraps `readChecklist` in `unstable_cache` with the `checklists` tag and a 600-second `revalidate` (`src/lib/checklists/cache.ts`). The poster progress endpoint of the index reuses the same cached read. The published read includes checklists «En preparación», because the route decides what to do with them.

`readChecklist` (`src/lib/checklists/queries.ts`) loads the checklist with its quests (name and level), the «Necesitarás» items, achievements, figures, bosses and images, its Dofus guide with the egg, and the slugs of the published quest guides and achievement pages it links. Linked guides and pages are always read as a visitor would, so an unpublished one never becomes a link. It also reads the stages of every quest a step stops in (including «Más paradas»), with the names of the NPCs, items and monsters their objectives mention (`readObjectiveNames`), so the page can print the objectives as text. `readQuestGraph` adds what the progress engine needs: each quest's objectives, start criteria and prerequisites, following prerequisites outside the checklist to the end of the chain in at most two queries. A souls checklist skips all of this and reads its souls instead.

The tag is expired by the hooks of `checklists`, `quest-guides`, `achievement-pages`, `dofus-guides` and `media` (`src/collections/revalidate-guides.ts`). Quests and subareas change only through `pnpm data:refresh`, outside the request that renders the page, so they show within the 10-minute `revalidate`.

Game records go through `shown` (`src/lib/checklists/relations.ts`): Torre's correction wins and a record he hid is left out; a hidden item drops out of «Necesitarás» (see [Torre corrections to DofusDB data](../data/torre-corrections.md)). A step figure shows Torre's uploaded image before the NPC's render, and its `name` before the NPC's name or the image's alt text.

## The page

`checklistView` turns the data into what `ChecklistView` (`src/app/(frontend)/[slug]/ChecklistView.tsx`) renders. Everything is rendered on the server and readable without JavaScript, one part after another:

- the breadcrumb and `ChecklistHeader`, with the «Actualizado el» date under the description (`UpdatedDate`, from `contentDate(checklist).modified`) and the Dofus egg and its color (`eggStyle` passes the color as a CSS custom property). The color is the Dofus guide's, or, for a checklist without one (the rush), its card's `color`;
- the ambience particles behind the page (`Ambience`, with `checklistAmbience(checklist.ambience)`), rendered inside the page so they inherit the egg color; `theme` leaves the site's own (see [Styles and layout shell](../frontend/styles-and-shell.md));
- a window (`ck-win`) with the progress strip and three tabs: «Diario» (the step list and the open step; on phones the step opens in a sheet), «Prerrequisitos» (when there are groups, callouts or items) and «Objetos» (the totals, only when some row counts);
- the step sheet and progress dialogs, used by the island.

The `<main>` carries `pageSection('dofus')`, so the header marks the Dofus section as current.

### One color

A checklist page uses no item hues (the theme hues that tint lists on guide, achievement and metalogros pages). The window (`.ck-win`) has a 1px `--color-line` border, `--radius-sm` (8px) and `--color-surface`. Step numbers (`.ck-row__n`) are `--color-accent`. Three parts keep the Dofus-tinted gradients of the old hub on purpose: the progress strip (`.ck-strip`), the tabs row (`.ck-tabsrow`) and the step banner. The header egg of a Dofus checklist stays dim (greyscale, darker in dark mode, faded in light mode, no glow) until the checklist is complete: the progress island writes `data-ck-state` on `.ck`, and only at `done` does the egg light up in its colors. Without JavaScript there is no state and the egg stays dim. The rush's road eggs (`.ck-egg--road`) follow their own rules.

### The Dofus road

A checklist without a Dofus guide (the rush) gets a `road`: the steps whose `dofus` field names Dofus guides, in order, each with the Dofus's name, color, egg and, when the guide is published, its link. A draft guide reaches a visitor unpopulated, so it is left out.

- `ChecklistHeader` renders one egg and one «Siguiente Dofus: …, en el paso N.» line per road stop, all hidden but the first, plus a «Camino terminado» line.
- `RoadRow` renders «Dofus del camino» at the end of the progress strip: every road stop as a link to its step, with its eggs.

`startRoad` (`src/components/checklist/road-ui.ts`), started by the progress island, paints both from the saved progress: it marks done and next stops in the strip and shows in the header the first Dofus whose step is not done (`roadState` in `src/lib/checklists/road.ts`), or the last one lit once all are done. When a tick completes the header's Dofus, its egg lights and flashes and the next one enters after 900 ms; with reduced motion the change is immediate. A checklist with a Dofus guide has no road.

### A step

Each step (`StepDetail`) shows:

- a banner header with the step number, its zone, the figure and the step icon, and its label (the achievement it quotes or its first sentence);
- Torre's text as segments, with the red «detente aquí», the green «aquí se resuelve» and the callouts; a quoted achievement name becomes a link to its published page;
- tags that link related steps: «se cierra en el N» (the step that closes this one), «cierra el N», «avanza el N» and «se retoma en el N»;
- its quests, each linked to its published guide. A generic row shows its label and how many quests satisfy it (`anyOf`);
- for every quest a step stops in, the route (`Route`): the quest's objectives as text, with Torre's line placed before the objective where it stops. `routeLines` follows the old checklist: without a green segment each stop is where to stop (red); with one, the red is where the quest resumes and the line is the green text (or `resumeLine`), except when another step closes this one and the green leaves no stop of its own. A stop after a green segment and a `later` stop stay red. Child quests of the same step that start inside the quest show at the objective where they start;
- the note, the «Necesitarás» rows grouped by category and sub-group (with their alternatives, «Pandaburg o Pandapils»), and the bosses.

The step does not list its achievements.

### Prerrequisitos and Objetos

«Prerrequisitos» shows Torre's intro, his callouts (start the Dofus Ocre early, the alignment order) and his groups, each row with its tick, plus the items the prerequisites ask for with the prerequisite that spends each one.

«Objetos» (`totalRows`) sums what the prerequisites (as step 0) and every step ask for, one row per item, or per text when the row is not an item, keyed like its tick. Rows with `countsInTotal` off are left out. A row marked reusable in any step takes the largest quantity of each option instead of the sum. Each row remembers the steps that ask for it and sits in the group of the first one. The server renders it in three groups: «Tus próximos pasos» (without progress, what the prerequisites and the first five steps that ask for something need), «Más adelante» and «Ya utilizados» (empty on the server). The island moves each row to its group from the saved progress and filters by category.

### What the island receives

The view hands the island only structure, never text (`ChecklistIslandData`):

- the checklist id, slug and version;
- each step's stepId, old number and quests, where a quest carries the objective where the step leaves it open and whether a later step finishes it (`openStops` in `src/lib/checklists/open-stops.ts`);
- the steps each one closes (its resolve segments and its `closes`), the optional quests each step finishes, the generic rows with every quest that satisfies them, and the quests that finish on their own (`completedBy`);
- the prerequisite keys and the composite keys of rows with alternatives or a sub-group, which the migration needs;
- the `legacy` migration data, the progress weights, each quest's objective count, prerequisites and parent quests;
- the names and old ids of every checklist.

A generic row's progress key is the DofusDB id of its first quest, negated (`questRowKey`), so ticking it never marks one specific class quest as done.

## The details endpoint

What the page does not put in its HTML (who gives each quest and where, each objective's text, coordinates and subarea) comes from `GET /api/checklists/:slug/details` (`src/endpoints/checklist-details.ts`), mounted on the `checklists` collection. `checklistDetails` (`src/lib/checklists/details.ts`) packs it as short tuples keyed by DofusDB quest id, because a checklist has many quests; the URL and tuple types live in the dependency-free `details-url.ts`, which the island imports.

- A visitor reads the published checklist through `unstable_cache` with the `checklists` tag, and the response carries `Cache-Control: public, max-age=300, stale-while-revalidate=3600`.
- A panel user with Next's draft mode reads the latest draft, sent as `private, no-store`.
- No checklist answers 404.
- The endpoint returns plain JSON; Next compresses it like any response (see [Request pipeline](../architecture/request-pipeline.md)).

## The island

`ChecklistIsland` (`src/components/checklist/ChecklistIsland.tsx`) is a client component that renders nothing. Its only work is to load `checklist-ui.ts` with `import()` and call `startChecklist`, which syncs with the server HTML, `<dialog>`, `matchMedia` and the details API and returns its cleanup. It turns the tab links into ARIA tabs, keeps one step open (the one in `#paso-N`, or the first on wide screens), filters steps by search text, and moves between steps. Text typed into the search before the island arrived, or restored by the browser on back navigation, fired no `input` event, so `startChecklist` filters once at start when the field already holds text. Once per page, after paint, it fetches the details and paints, through `fillDetails`, the quest givers, coordinate chips (copied by the guides' `PageEnhancements` island) and subareas; on failure it shows a message in its status region. The effect restarts only for another checklist or a new version, so a live preview refresh that brings the same data does not reset it. Its strings live in `island-strings.ts`, so it never pulls in the panel strings.

The `/<slug>` route ships this island to quest guides, achievement pages and Dofus guides too, which sit close to their 150 KB JavaScript budget. So the island itself holds only the `import()` of `checklist-ui.ts`, and `checklist-ui.ts` in turn loads the progress UI (`progress-ui.ts`, with its strings in `progress-strings.ts`) with `import()`; both run only on a checklist page. See [Checklist progress engine](progress.md). Lighthouse CI gives checklist pages 180 KB of JavaScript instead of 150 KB (see [Performance budgets](../testing/performance-budgets.md)).

## Tests

- `tests/unit/checklist-page.test.ts`, `tests/unit/checklist-helpers.test.ts`, `tests/unit/checklist-quest-graph.test.ts` and `tests/unit/checklist-open-stops.test.ts`: the view model, `checklistRoute`, the quest graph and the open stops.
- `tests/unit/checklist-details.test.ts`, `checklist-details-query.test.ts` and `checklist-details-fill.test.ts`: the details payload, the endpoint and how the island paints them.
- `tests/unit/checklist-components.test.tsx` and `checklist-island.test.tsx`: the parts and the island.
- `tests/integration/checklist-page-queries.test.ts`: the queries with real access rules.
- `tests/e2e/checklist.spec.ts`, `checklist-silvestre.spec.ts` and `checklist-hielos.spec.ts`: the seeded Nebuloso, Silvestre and Hielos pages, with axe; `scripts/seed-e2e.ts` seeds them from `tests/e2e/seed/checklists.ts`.
