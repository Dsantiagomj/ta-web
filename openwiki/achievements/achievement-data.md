---
type: data model
title: Achievement data model
description: The four achievement collections (DofusDB achievements and categories, Torre's achievement pages and metalogros), the root slug space they share with quest guides and Dofus guides, how empty fields fill from DofusDB, the panel notes, and how the DofusDB refresh creates missing pages.
tags: [achievements, payload, collections, dofusdb, autofill, slugs]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-12T11:00:44.802Z
sources:
  - id: openwiki-source-63cbcc482c18e4f9ce5d0888
    resource: repo://scripts/refresh-quests.ts
  - id: openwiki-source-33faba74e5e6f56a08fcb35f
    resource: repo://src/collections/achievement-autofill.ts
  - id: openwiki-source-44aeca5f08eb84b9d5189371
    resource: repo://src/collections/achievement-fields.ts
  - id: openwiki-source-10dfd40929164c9d6b77bb04
    resource: repo://src/collections/AchievementCategories.ts
  - id: openwiki-source-05f379ec302676e4aba3f51c
    resource: repo://src/collections/AchievementGroups.ts
  - id: openwiki-source-931b952fdbc6f599d8c88e75
    resource: repo://src/collections/AchievementPages.ts
  - id: openwiki-source-d501a03fabe41a0218c5f842
    resource: repo://src/collections/Achievements.ts
  - id: openwiki-source-eec436a9dcb7734a62bf153f
    resource: repo://src/collections/editorial-access.ts
  - id: openwiki-source-a93f1ff2ed8916a30885274d
    resource: repo://src/collections/root-slug.ts
  - id: openwiki-source-2d2a5acdd3240297c5f42f27
    resource: repo://src/endpoints/dofusdb-values.ts
  - id: openwiki-source-ad5f614f83919569e05c45bd
    resource: repo://src/lib/achievements/dofusdb-values.ts
  - id: openwiki-source-cccb36aaa2b11479c43f1674
    resource: repo://src/lib/achievements/ensure-pages.ts
  - id: openwiki-source-849ba98bed9aabb2bf862269
    resource: repo://src/lib/dofusdb/map-achievement.ts
  - id: openwiki-source-cabbbdb69c4af80c58320870
    resource: repo://src/lib/dofusdb/refresh-achievements.ts
  - id: openwiki-source-4d4ac9e1e628bf6a685e4bf2
    resource: repo://tests/integration/achievement-pages.test.ts
  - id: openwiki-source-69a5fa7edb72294e823509c1
    resource: repo://tests/unit/achievement-dofusdb-values.test.ts
generated: { by: "claude-code", at: "2026-11-12T11:00:44.802Z" }
---

# Achievement data model

Achievements come in two layers, the same split the quest guides use with their DofusDB quest:

| Layer | Collections | Owner | Editable in the panel |
|---|---|---|---|
| Game data | `achievements`, `achievement-categories` | DofusDB, written by `pnpm data:quests` | No (read-only, `gameDataAccess`) |
| Editorial | `achievement-pages` ("Logros"), `achievement-groups` ("Metalogros") | Torre | Yes, with drafts |

Each editorial document links one game record and copies what its page shows. An empty field fills from DofusDB on save; a field Torre wrote is never overwritten, not by a later save and not by a refresh.

## Game data collections

`achievement-categories` (`src/collections/AchievementCategories.ts`) holds every DofusDB achievement category with its name, order and parent category. `achievements` (`src/collections/Achievements.ts`) holds the achievements of the categories under DofusDB's Misiones (8) and Eventos (9) roots:

- `quests`: one row per objective, in order. A row with several quests is a set of alternatives (the class quest: you do the one for your class).
- `rewards`: experience, kamas and items, computed for a level 200 character, as on Torre's pages.
- `countsFor`: the game achievements that require this one, directly or through another.
- `icon`: an upload to Media.

Both collections are panel-readable and script-written, like quests, items and monsters (see [Collections](../cms/collections.md)).

### Reward figures

`src/lib/dofusdb/map-achievement.ts` turns a raw DofusDB achievement into the collection's shape. Experience is 30% of the fixed experience of the achievement's level plus 70% of that of its cap (1.5 times the level, at most 200), the client's formula, then multiplied by 1.05. That 5% bonus is how Torre's pages compute it: with it, 208 of his 223 pages with experience match. Kamas follow `(level² + 20·level − 20) · ratio`. Only reward rows whose level range covers level 200 count.

## Editorial collections

`achievement-pages` (`src/collections/AchievementPages.ts`) is one page per achievement, rendered at `/<slug>` (see [Achievement page](achievement-page.md)). It links one DofusDB achievement (`achievement`, required and unique) and carries `name`, `slug`, `state`, `group` (its metalogro), `order` in that metalogro, `quests`, `points`, `rewards`, and optional `intro` and `outro` rich text. It has live preview and preview URLs through the same `/vista-previa` route as guides.

`achievement-groups` (`src/collections/AchievementGroups.ts`) is a metalogro: a game zone or story that groups achievements, shown on the [Metalogros index](metalogros-index.md). It links one DofusDB category (`category`, unique, optional) and carries `name`, `slug`, `state`, `section` (`stories`, `zones` or `seasonal`), `order`, `representative`, `intro` and `guides`. A metalogro without a category (temple quests) is written by hand; `guides` lists quest guides that belong to no achievement, so a metalogro can hold only guides.

`representative` is a polymorphic relationship to `npcs` or `monsters`: the art of the metalogro's index tile. By default it is the NPC who gives the first quest of the category's first achievement with quests.

Both collections share their access rules with quest guides through `src/collections/editorial-access.ts`: panel users read everything including drafts and are the only ones who create, update or delete; everyone else reads documents whose `_status` is `published`. Both keep up to 50 versions per document.

### State

`state` (`stateField` in `src/collections/achievement-fields.ts`) is `published` or `preparing` ("Publicada" or "En preparación"), default `preparing`. It is Torre's alone: the refresh creates pages as `preparing` and never changes the field. It is separate from Payload's `_status`: the pages the refresh creates are `_status: published` so they can be listed, while `state` says whether the page shows its full content.

## Filling from DofusDB

`fillAchievementPage` and `fillAchievementGroup` (`src/collections/achievement-autofill.ts`) run as `beforeValidate` hooks:

1. Read the linked record's values through `achievementValues` or `groupValues` (`src/lib/achievements/dofusdb-source.ts`).
2. Pass them with the document's current values to `fillFromValues` (`src/lib/achievements/dofusdb-values.ts`), which returns only the fields that are empty in the document and non-empty in DofusDB. An empty value is null, blank text or a list with no rows; `0` is a value.
3. Write those fields. Reward fields go into the `rewards` group.
4. Require a name, then fill an empty slug.

A value present in the request wins, even `null` (Torre cleared the field, so it fills again); a value absent from the request comes from the saved document. The page's state is never filled.

The fields an achievement page fills are name, metalogro (the one linked to the achievement's category), order, points, experience, kamas, items and quests. A metalogro fills name, order, section and representative.

`groupSection` decides a category's section: anything under Eventos, at any depth, is `seasonal`; among the direct children of Misiones, those with order 10 or less are `stories` and the rest `zones`; anything under one of those is a zone.

The name and slug validators (`linkedNameValidator`, `linkedSlugValidator`) accept an empty value while a DofusDB record is linked, because the hook fills it on save.

## The panel notes

Each copied field shows a note under it (`dofusDbNote` in `src/collections/achievement-fields.ts` mounts `src/components/achievement-admin/DofusDbNote.tsx` as the field's description). The note says whether the value is DofusDB's, whether Torre changed it (and what DofusDB gives), or that it is empty and will fill on save. The comparison is in `dofusDbNote` in `src/lib/achievements/dofusdb-values.ts`: relations compare by ID, reward items as a set, quest rows in order with their alternatives as a set.

The client component reads the values through `GET /api/dofusdb-values/:source/:id` (`src/endpoints/dofusdb-values.ts`), where `source` is `achievement` or `group`. The endpoint returns 401 without a panel session, 400 for an unknown source or a non-numeric ID, 404 when the record does not exist, and always sends `Cache-Control: no-store`. It loads through the same `dofusdb-source.ts` functions as the hooks, so the note and the save never disagree.

## One slug space at the root

Quest guides, achievement pages, metalogros and Dofus guides all live at `/<slug>` (metalogros keep Torre's `metalogro-…` slugs and Dofus guides the slugs of Torre's site, such as `dofus-abisal`), so `src/collections/root-slug.ts` treats them as one slug space (`ROOT_SLUG_COLLECTIONS`):

- Each collection keeps its own `slug` unique in the database.
- `rejectSharedSlug(collection)`, a `beforeValidate` hook on all four, rejects a slug another of the four already uses, naming which kind of page owns it. See [Dofus guide data model](../dofus-guides/dofus-guide-data.md) for the fourth.
- A slug counts as used when a stored document has it or when the latest draft does, so publishing a renamed draft cannot collide later.
- `isRootSlugTaken` also treats reserved route segments (`/sistema`, `/metalogros`, `/guias-dofus` and the others in `src/lib/guides/slug.ts`) as taken.

When the hook fills a slug, it takes the first free candidate: for an achievement page the slugified name, then `logro-<name>`, then the name with `-2`, `-3` and so on; for a metalogro `metalogro-<name>` and then numbered suffixes.

## What the refresh writes

`pnpm data:quests` (`scripts/refresh-quests.ts`, see [DofusDB refresh](../data/dofusdb-refresh.md)) writes achievements after quests and items:

1. `refreshAchievements` (`src/lib/dofusdb/refresh-achievements.ts`) upserts every category, then sets parents in a second pass because they need every Payload ID. It upserts the achievements of the categories under Misiones and Eventos (`QUEST_ROOT_CATEGORIES = [8, 9]`), so a new zone or achievement there arrives with the next refresh. It imports achievement icons to Media once, links quests and items already stored, counts the ones DofusDB names but the database lacks, writes only what changed, and never deletes.
2. After NPCs, `ensureAchievementPages` (`src/lib/achievements/ensure-pages.ts`) creates a metalogro for each category under those roots with none, and an achievement page for each achievement with at least one quest and no page. It creates them as `state: preparing` and lets the fill hooks copy the rest. It never changes or deletes an existing one. It runs after NPCs because the default representative is an NPC.

Torre's existing pages and states come from his site through a separate import (see [Importing Torre's achievement pages](../data/achievements-import.md)).

## Tests

- `tests/unit/achievement-dofusdb-values.test.ts`: `groupSection`, `fillFromValues` and the note text.
- `tests/unit/dofusdb-map-achievement.test.ts`: objectives, rewards and `countsFor`.
- `tests/unit/dofusdb-values-endpoint.test.ts`: the endpoint's status codes.
- `tests/unit/achievement-editorial-collections.test.ts` and `tests/unit/achievement-game-collections.test.ts`: collection config.
- `tests/integration/achievement-pages.test.ts`: values from the database, sections at any depth, `ensureAchievementPages` (including idempotence), Torre's edits surviving, a cleared field refilling, and the shared slug rules.
- `tests/integration/refresh-achievements.test.ts`: the refresh against fixtures in `tests/fixtures/dofusdb/`.
