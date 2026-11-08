---
type: workflow
title: Importing Torre's achievement pages
description: The pnpm import:achievements script that copies Torre's current metalogros index (order, names, slugs, states, hand-picked representatives and loose guides) onto the metalogros and achievement pages, its dry-run default, its database guard and its tests.
tags: [achievements, import, migration, scripts, payload]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-08T11:00:21.339Z
sources:
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-97e144348afe72981f00c973
    resource: repo://scripts/import/import-achievements.ts
  - id: openwiki-source-f9bfb0f4d55b9c62a343bed3
    resource: repo://scripts/import/load-achievements.ts
  - id: openwiki-source-7c66f643dce69fb67291a883
    resource: repo://src/lib/db/script-guard.ts
  - id: openwiki-source-7e668dd6d8b8602072708ef4
    resource: repo://tests/integration/import-achievements.test.ts
generated: { by: "claude-code", at: "2026-11-08T11:00:21.339Z" }
---

# Importing Torre's achievement pages

`pnpm import:achievements` migrates what Torre's current site says about his metalogros and achievement pages into the `achievement-groups` and `achievement-pages` collections (see [Achievement data model](../achievements/achievement-data.md)). It copies his order, names, slugs and states; it does not deduce them.

```
pnpm import:achievements <datos.json> [--apply] [--remote] [--production]
```

- The input is the index the design prototype computed from his site, `tmp/mockups/comun/indice/datos.json`: a `zones` array in index order.
- Without `--apply` the script only counts what it would do and writes nothing.
- It runs after `pnpm data:quests`, which creates the metalogros and the pages of the achievements with quests (see [DofusDB refresh](dofusdb-refresh.md)). The import then adjusts them.
- It writes to the database in `DATABASE_URL` (empty means the `pnpm db:dev` one).

## Database guard

Before Payload starts, `databaseScriptRefusal` (`src/lib/db/script-guard.ts`) decides whether the script may run:

- In production (`APP_ENV`, `RAILWAY_ENVIRONMENT_NAME` or `NODE_ENV` set to `production`) it requires `--production`.
- Otherwise, a `DATABASE_URL` whose host is not `localhost`, `127.0.0.1` or `::1` requires `--remote`, because from outside the dev database and the production one look the same. An unparseable URL counts as remote.
- An empty `DATABASE_URL` (the embedded dev database) needs no flag.

The refusal message names the action and the flag to repeat with.

## Input shape

Each zone (`TorreZone` in `scripts/import/load-achievements.ts`) has:

| Field | Meaning |
|---|---|
| `name` | Torre's name for the metalogro |
| `href` | Its page on his site (`…/metalogro-astrub`), or null when it has none (temple quests) |
| `done` | Shown as finished (green) on his index |
| `pnj` | The representative NPC; only one with `chosen: true` is seeded |
| `achievements` | Links to his achievement pages, in order, each with `ready` when it has a guide |
| `guides` | Links to loose guides |

## What it writes

`importTorreAchievements` walks the zones in order. Names are matched after folding accents, case and punctuation, plus two aliases where Torre's name differs from the game's ("El descenso del dragón", "Campamento de los bworks y de los goblins").

**Metalogros.** A zone matches an existing metalogro by its category's name (or its own name when it has no category). It gets:

- `name`, `slug` (the last path segment of `href`), `order` (its position in the index) and `state` (`published` when `done`, else `preparing`);
- the hand-picked representative, when `chosen`: `ensureNpc` finds the NPC by DofusDB ID and, if it is missing (an NPC that gives no quest), fetches it from DofusDB with its renders through `refreshNpcs`;
- `guides`: the loose guides, found by slug including drafts.

A zone with no match is created with `section: stories`, `_status: published` and, without an `href`, the slug `metalogro-<name>`. An existing metalogro without a category also moves to `stories`, since it has no category section to copy.

**Achievement pages.** Each link matches an achievement of the metalogro's category by name. Its page gets Torre's `name` (even when the game's differs), `slug`, `order`, `group` and `state` (`published` when `ready`, else `preparing`). A page that does not exist yet is created with `_status: published`; the fill hook copies the rest from DofusDB. The order counts only links that matched, so an unmatched link leaves no gap and no overlap.

The pages of achievements Torre does not list keep their state and move after his in the metalogro, in game order (`order`, then DofusDB ID).

Links and guides that match nothing are collected and printed as "Sin casar en <zone>: <name>".

This is a one-time migration of his site: running it again overwrites what was changed in the panel since.

## Output

The script prints one summary line, "Hecho" or "En seco (sin --apply)", with metalogros updated and created, achievement pages updated and created, and loose guides, then the unmatched list. On failure it logs the error, closes Payload and exits with 1, because `payload run` would otherwise exit with 0.

## Tests

`tests/integration/import-achievements.test.ts` runs the import against the integration database:

- without `--apply` it counts and writes nothing;
- each metalogro gets name, slug, order, state, the chosen representative and its loose guides;
- an existing metalogro without a category also goes to `stories`;
- each achievement page is created or updated with Torre's slug, order and state;
- the page takes Torre's name even when the game's is different;
- states are copied as they are: `ready` is published.

`tests/unit/script-guard.test.ts` covers `databaseScriptRefusal`.
