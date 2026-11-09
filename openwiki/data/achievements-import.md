---
type: workflow
title: Importing Torre's achievement pages
description: The pnpm import:achievements script that copies Torre's current metalogros index (order, names, slugs, states, hand-picked representatives and loose guides) onto the metalogros and achievement pages, the pnpm fix:achievements script for targeted corrections afterwards, their dry-run default, database guard and tests.
tags: [achievements, import, migration, scripts, payload]
sources:
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-01fb81e56bd5c582230372ab
    resource: repo://scripts/import/ensure-npc.ts
  - id: openwiki-source-e83c2fdd2947ea7668ffa73d
    resource: repo://scripts/import/fix-achievements.ts
  - id: openwiki-source-97e144348afe72981f00c973
    resource: repo://scripts/import/import-achievements.ts
  - id: openwiki-source-a0316748c57b31ddbf14e976
    resource: repo://scripts/import/load-achievement-fixes.ts
  - id: openwiki-source-f9bfb0f4d55b9c62a343bed3
    resource: repo://scripts/import/load-achievements.ts
  - id: openwiki-source-7c66f643dce69fb67291a883
    resource: repo://src/lib/db/script-guard.ts
  - id: openwiki-source-ed8ed36330376a51e8f54b82
    resource: repo://tests/integration/achievement-fixes.test.ts
  - id: openwiki-source-7e668dd6d8b8602072708ef4
    resource: repo://tests/integration/import-achievements.test.ts
generated: { by: "claude-code", at: "2026-11-09T11:00:21.744Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-09T11:00:21.744Z
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

`importTorreAchievements` walks the zones in order. Names are matched after folding accents, case and punctuation, plus three aliases where Torre's name differs from the game's ("El descenso del dragón", "Campamento de los bworks y de los goblins", "De un mundo a otro").

**Metalogros.** A zone matches an existing metalogro by its category's name (or its own name when it has no category). It gets:

- `name`, `slug` (the last path segment of `href`), `order` (its position in the index) and `state` (`published` when `done`, else `preparing`);
- the hand-picked representative, when `chosen`: `ensureNpc` (`npcEnsurer` in `scripts/import/ensure-npc.ts`, shared with `pnpm fix:achievements`) finds the NPC by DofusDB ID and, if it is missing (an NPC that gives no quest), fetches it from DofusDB with its renders through `refreshNpcs`;
- `guides`: the loose guides, found by slug including drafts.

A zone with no match is created with `section: stories`, `_status: published` and, without an `href`, the slug `metalogro-<name>`. An existing metalogro without a category also moves to `stories`, since it has no category section to copy.

**Achievement pages.** Each link matches an achievement of the metalogro's category by name. Its page gets Torre's `name` (even when the game's differs), `slug`, `order`, `group` and `state` (`published` when `ready`, else `preparing`). A page that does not exist yet is created with `_status: published`; the fill hook copies the rest from DofusDB. The order counts only links that matched, so an unmatched link leaves no gap and no overlap.

The pages of achievements Torre does not list keep their state and move after his in the metalogro, in game order (`order`, then DofusDB ID).

Links and guides that match nothing are collected and printed as "Sin casar en <zone>: <name>".

This is a one-time migration of his site: running it again overwrites what was changed in the panel since. Corrections after it go through `pnpm fix:achievements`.

## Output

The script prints one summary line, "Hecho" or "En seco (sin --apply)", with metalogros updated and created, achievement pages updated and created, and loose guides, then the unmatched list. On failure it logs the error, closes Payload and exits with 1, because `payload run` would otherwise exit with 0.

## Targeted fixes

```
pnpm fix:achievements [--apply] [--remote] [--production]
```

`pnpm fix:achievements` (`scripts/import/fix-achievements.ts`) corrects a database that already ran the import without running it again, so nothing Torre changed in the panel since is overwritten. The fixes are data in `TORRE_FIXES` (`scripts/import/load-achievement-fixes.ts`), applied by `applyAchievementFixes`. It uses the same database guard before Payload starts.

`TORRE_FIXES` has three lists:

| List | What it does |
|---|---|
| `representatives` | Sets a metalogro's representative NPC, only when it has none. A different representative already set is left alone and reported. |
| `pages` | Moves an achievement page (found by its DofusDB achievement ID) to a position in a metalogro and optionally sets its `name`, `slug` and `state`. The other pages of the metalogro shift to make room without changing their relative order. |
| `guides` | Appends published loose guides to a metalogro, in the listed order, keeping the ones it has. |

The current list records what the 2026-11-07 import left wrong in dev: Alineamiento had no representative, five of Torre's achievements were read as loose guides, and Vulkania's ten "Misiones extra" guides were missing as loose guides.

Every fix compares before writing, so a second run changes nothing. An entry is skipped and reported when the metalogro, achievement page or guide does not exist, or when the record it would save has a draft newer than its published version: Torre is editing it in the panel, and saving over it would lose that draft. A page move is also skipped when one of the sibling pages it would shift has such a draft.

Without `--apply` it prints what it would change and writes nothing; a missing representative NPC is reported as "se importará al aplicar" instead of being fetched. With `--apply` it prints "Hecho:" with the changes, then a "Sin tocar:" line per skipped entry. On failure it closes Payload and exits with 1.

## Tests

`tests/integration/import-achievements.test.ts` runs the import against the integration database:

- without `--apply` it counts and writes nothing;
- each metalogro gets name, slug, order, state, the chosen representative and its loose guides;
- an existing metalogro without a category also goes to `stories`;
- each achievement page is created or updated with Torre's slug, order and state;
- the page takes Torre's name even when the game's is different;
- Torre's "De un mundo a otro" matches the game's "De un mundo al otro";
- states are copied as they are: `ready` is published.

`tests/integration/achievement-fixes.test.ts` covers `applyAchievementFixes`: the dry run writes nothing and does not import a missing NPC, `--apply` changes only the listed entries and shifts the others in order, a second run changes nothing, and an entry or sibling with an unpublished draft is skipped and reported.

`tests/unit/script-guard.test.ts` covers `databaseScriptRefusal`.
