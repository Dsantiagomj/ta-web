---
type: feature
title: Souls checklist (Ocre)
description: How a souls checklist such as the Dofus Ocre works - no stored rows, every soul derived from the bring objectives of one quest and its monsters (level, boss or archmonster, dungeon, subarea, region, stage), the server-rendered SoulsView grouped by stage or region, the level-aware search, and the island that ticks souls into ta-web:progress.
tags: [checklists, souls, ocre, dofusdb, monsters, progress]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-15T11:00:17.514Z
sources:
  - id: openwiki-source-a5251f065f03f989aa14ef87
    resource: repo://src/app/(frontend)/%5Bslug%5D/SoulsView.tsx
  - id: openwiki-source-d6f80588b0c529412fb9c0ec
    resource: repo://src/components/checklist/souls-ui.ts
  - id: openwiki-source-37f1e9e7d970a1cb4f17ee41
    resource: repo://src/components/checklist/SoulsIsland.tsx
  - id: openwiki-source-64cb67184a332f58fce45aeb
    resource: repo://src/lib/checklists/queries.ts
  - id: openwiki-source-2279975666139a0cbd601fd8
    resource: repo://src/lib/checklists/souls-search.ts
  - id: openwiki-source-ad98c5becf3bf5a6469d85f8
    resource: repo://src/lib/checklists/souls.ts
  - id: openwiki-source-1addf1a05f8d53fe7dea95d6
    resource: repo://src/lib/dofusdb/map-items-monsters.ts
generated: { by: "claude-code", at: "2026-11-15T11:00:17.514Z" }
---

# Souls checklist (Ocre)

A souls checklist is the second kind of checklist (`kind: 'souls'`, see [Checklist data and import](checklist-data.md)). The Dofus Ocre is one: its quest, «La eterna cosecha», asks for the souls of hundreds of monsters, and the visitor ticks the ones they have. Unlike a steps checklist, it stores no rows. Its document names the quest (`soulsQuest`), and every soul is derived from that quest's stored objectives and the monsters they name. Nothing is written by hand, which replaces what `build_cosecha.py` and `souls.js` did in the old `silvestre-checklist`.

It renders at `/<slug>` like any checklist; the route renders `SoulsView` instead of `ChecklistView` (see [Checklist page](checklist-page.md)).

## Where the data comes from

`pnpm data:quests` keeps the game data the page needs (see [DofusDB refresh](../data/dofusdb-refresh.md)):

- **Quest objectives.** A soul is a `bring` objective whose `monsterId` is set.
- **Monsters.** `mapMonster` (`src/lib/dofusdb/map-items-monsters.ts`) stores each monster's grade `levels`, `boss` (DofusDB `isBoss`), `archmonster` (`isMiniBoss`) and its first `subAreaId`.
- **Dungeons.** Each dungeon stores its bosses and its `level` (DofusDB's optimal player level).
- **Subareas.** Each subarea carries its name and its area's name, which is the soul's region.

`readSouls` (`src/lib/checklists/queries.ts`) reads, as a visitor, the quest's stages, the monsters of its `bring` objectives, their subareas, and the dungeons whose bosses include them. A souls checklist skips every steps query.

## The view model

`soulsView` (`src/lib/checklists/souls.ts`) is pure code. It walks the quest's stages in order and turns each `bring` objective with a monster into a soul:

- A monster asked for twice is one soul, in its first stage.
- A monster missing from the database is left out and listed in `missing`. The import reports it too.
- **Dungeon.** A boss's dungeon is the one dungeon that has it; with two or more, none is chosen.
- **Type.** A soul is `boss` when it has a dungeon or is a DofusDB boss, else `archi` when it is an archmonster, else `other`.
- **Level.** `soulLevel` picks the highest grade that fits the dungeon's level, because DofusDB gives some bosses level 200 grades in level 60 dungeons. Without a dungeon it picks the highest grade; if no grade fits, the last.
- **Where.** The zone is the monster's subarea and the region its area.
- **Search text.** The name, dungeon, zone and region, folded (no accents, lower case).

The souls are then grouped two ways:

- **By stage**, in quest order. A stage is labelled «Etapa N · Jefes» when all its souls are bosses, otherwise «Archis».
- **By region**, from the region with the most souls to the one with the fewest, ties by name.

The view also counts bosses and archmonsters, takes Torre's intro and callouts from the checklist's prerequisites, and builds the breadcrumb to `/guias-dofus` and the Dofus guide (only when that guide is published). The island receives only the checklist id, slug, version, `legacy` and the list of soul ids.

## The page

`SoulsView` (`src/app/(frontend)/[slug]/SoulsView.tsx`) renders on the server, by stage:

- the breadcrumb and the shared `ChecklistHeader` with the egg;
- `SoulsIntro`, Torre's callouts as he wrote them;
- a window with `SoulsStrip` (percentage, bar and souls owned), `SoulsTools` (group by stage or region, the type filter, the search, «hide the ones I have» and the «⋯» menu with backup and reset) and `SoulsList`;
- the progress dialogs, with a reset that removes only the souls.

`SoulsList` renders both groupings, and CSS shows the one the island names in `data-sl-shown` on the window (by stage without JavaScript). Each soul card (`Soul`) has its tick, image, name, level and where it is fought: its dungeon, or its subarea when it has none. All cards are the same size: the name and the line below wrap to two lines and are cut after that, while the checkbox's `aria-label` says everything. A stage panel (`Stages`) lists «Todas» and each stage with the souls owned; picking one shows only its souls. It is a column on desktop and a scrolling row above the list on narrow screens, and it only renders with JavaScript.

## The island and search

`SoulsIsland` loads `souls-ui.ts` with `import()`, because the `/<slug>` route ships its islands to quest, achievement and Dofus guide pages too, which are close to their JavaScript budget. It restarts only when the checklist version changes. Without it, every soul shows by stage with no ticks.

`startSouls` (`souls-ui.ts`) reads and writes the `souls` map of `ta-web:progress` (see [Checklist progress engine](progress.md)) and paints on the server HTML:

- the ticks, the percentage and each group's count;
- the chosen view and type filter, kept in attributes on `.sl-win` that React does not render, so a live preview refresh keeps them;
- the search, «hide owned», backup and reset;
- an animation when a soul is ticked and a celebration when a stage, or the whole list, is complete, none of it under reduced motion.

React owns every node; the UI never moves one. On first run it brings over the old Ocre's `cosecha:done` once (`migrateSouls`).

The search (`soulQuery` and `soulMatches` in `src/lib/checklists/souls-search.ts`) matches the name, dungeon, zone, region or level:

- a lone number is a level or a piece of text («55»);
- with «nv.» or «nivel» before it, it is only a level;
- two numbers are a range («100-150», «100 a 150»);
- a number with a trailing dash, while typing, means «from» («100-»);
- anything else is folded and searched in the soul's text.

## Tests

- `tests/unit/checklist-souls.test.ts`: `soulsView` and `soulLevel`.
- `tests/unit/checklist-souls-search.test.ts`: the search.
- `tests/unit/checklist-souls-ui.test.tsx`: the parts and the island.
- `tests/unit/checklist-souls-progress.test.ts`: souls progress and its migration.
- `tests/unit/dofusdb-monsters-souls.test.ts`: the monster and dungeon fields the page needs.
- `tests/e2e/checklist-ocre.spec.ts`: the preparing entry still redirecting to Squarespace, souls by stage with level and place, ticking and saving, region view, type, search (including ranges) and hiding, the stage panel on desktop and phone, equal card sizes, animations and reduced motion, the `cosecha:done` migration, reset, and axe in both modes.
