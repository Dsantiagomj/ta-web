---
type: data model
title: Torre corrections to DofusDB data
description: The «Corrección de Torre» group on quests, items, monsters, dungeons, NPCs and achievements, which lets Torre override a name, level or image, or hide a record, without editing DofusDB's data; how writes are scoped so the panel edits only the correction and the refresh never does, and how every page applies it.
tags: [game-data, dofusdb, corrections, payload, panel]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-16T11:00:16.891Z
sources:
  - id: openwiki-source-153285322f1fa0bfb7572570
    resource: repo://src/collections/delete-guard.ts
  - id: openwiki-source-8a13b77dbed01e200022d669
    resource: repo://src/collections/Npcs.ts
  - id: openwiki-source-633cb155d38055ddc4af30fc
    resource: repo://src/collections/Quests.ts
  - id: openwiki-source-c59753480751a9469ce8e192
    resource: repo://src/collections/torre-correction.ts
  - id: openwiki-source-d118161b5d38ff2095848286
    resource: repo://src/lib/game-data/correction.ts
  - id: openwiki-source-9e58d800f77e4c8aeaa3ca2e
    resource: repo://src/lib/guides/dungeon-bosses.ts
  - id: openwiki-source-09ec39f59a9916ea0a2bf2d6
    resource: repo://src/lib/guides/page.ts
  - id: openwiki-source-74617dd61aed35536e30e4de
    resource: repo://src/lib/search/read-index.ts
  - id: openwiki-source-ebe86a16825ca2ea9e9c0263
    resource: repo://tests/integration/torre-corrections.test.ts
  - id: openwiki-source-d3f66a8f47751d0e40ab872b
    resource: repo://tests/unit/torre-correction.test.ts
generated: { by: "claude-code", at: "2026-11-16T11:00:16.891Z" }
---

# Torre corrections to DofusDB data

Game data comes from DofusDB and the refresh rewrites it (see [DofusDB game data refresh](dofusdb-refresh.md)). When DofusDB has a name, level or image wrong, or a record that should not show, Torre fixes it in a separate «Corrección de Torre» group on the record. The correction wins on every page; DofusDB's own values stay as they are and keep refreshing.

## Which collections

`withTorreCorrection(collection, { level, image })` (`src/collections/torre-correction.ts`) wraps six game data collections. The options say which fields make sense for each:

| Collection | Name | Level | Image and «hidden» |
|---|---|---|---|
| `quests` | yes | yes | no |
| `items` | yes | yes | yes |
| `monsters` | yes | yes | yes |
| `dungeons` | yes | yes | yes |
| `npcs` | yes | no | yes |
| `achievements` | yes | yes | yes |

Sub-areas and achievement categories are not wrapped and stay fully read-only through `gameDataAccess`.

The wrapper:

- adds the `correction` group first in the form: `name` (localized text), `level` (number), `image` (upload to Media) and `hidden` (checkbox), each with a help text that says an empty value leaves DofusDB's;
- makes every other field read-only in the panel;
- adds `corrected`, an indexed read-only sidebar checkbox «Corregido por Torre», as a default list column, and makes the list searchable by both the DofusDB name and `correction.name`;
- sets `correctableAccess`: anyone reads, a panel account updates, nobody creates or deletes;
- appends the `scopeCorrectionWrite` `beforeChange` hook.

## Who writes what

`scopeCorrectionWrite` separates the two writers by whether the request has a user:

- **A panel account** (an update with `req.user`): every field except `correction` and Payload's own `id`, `createdAt` and `updatedAt` goes back to the saved value, so the panel can change only the correction, whatever the request sends.
- **A script** (an update without a user, as the refresh writes): `correction` goes back to the saved value, so a refresh never touches it, even when it rewrites the DofusDB fields.
- **Create**: everything is stored as sent; only scripts create.

Either way, `corrected` is recomputed with `hasCorrection` (`src/lib/game-data/correction.ts`): true when the correction has a non-blank name, a level, an image or `hidden`. The columns arrived in the `20261115_182043_game_data_torre_corrections` migration.

The delete guard counts each `correction.image` as a use of its media file, so an image used as a correction cannot be deleted (see [Admin panel](../cms/admin-panel.md)).

## How pages apply it

`src/lib/game-data/correction.ts` holds the two pure helpers the page reads use:

- `corrected(doc)` returns the record with the correction on top: a non-blank name replaces `name`; a level replaces `levelMin` on a quest, `levels` (as a single grade) on a monster, or `level` otherwise; an image replaces both renders of an NPC, the `icon` of an achievement, or `image` otherwise. Without a correction it returns the same object.
- `hiddenByTorre(doc)` is true when `correction.hidden` is set. An unpopulated ID is never hidden.

Each page applies them where it reads game data, usually through a local `shown` helper that drops a hidden record and corrects the rest: the quest guide header and its giver and items (`src/lib/guides/page.ts`), dungeon bosses (`src/lib/guides/dungeon-bosses.ts`), achievement pages and the metalogros index (see [Achievement page](../achievements/achievement-page.md) and [Metalogros index](../achievements/metalogros-index.md)), Dofus guides and their eggs (`src/lib/dofus-guides/page.ts`, `egg.ts`), checklists and the souls checklist (`src/lib/checklists/`), and the search index (`src/lib/search/read-index.ts`). A hidden item drops out of a «Necesitarás» list, where its note stays as text; a hidden quest leaves its achievement row; a hidden monster is not a soul.

A souls checklist also has its own per-list overrides for a soul's dungeon, zone or region, and a per-list hide (`soulOverrides`); the name, level and image of a soul are corrected on the monster, so the fix applies everywhere (see [Souls checklist](../checklists/souls-checklist.md)).

## Tests

- `tests/unit/torre-correction.test.ts`: the wrapped config (the group, read-only fields, access, search, the flag column, the hook), `scopeCorrectionWrite` for scripts, the panel and creates, and `corrected` for names, levels, NPC renders and achievement icons.
- `tests/integration/torre-corrections.test.ts`: the panel saves only the correction and marks the flag, nothing is corrected without a session, a record is found by Torre's name, and refreshing NPCs, quests, items and monsters changes DofusDB's values and leaves the corrections.
- `tests/integration/refresh-game-data.test.ts`: the whole refresh never touches a correction.
