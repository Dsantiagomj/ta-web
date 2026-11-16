---
type: data model
title: Achievement data model
description: The four achievement collections (DofusDB achievements and categories, Torre's achievement pages and metalogros), the root slug space they share with the other page collections, how empty fields fill from DofusDB on create, link change or the fill button, the panel notes, how the DofusDB refresh creates missing pages, and the dungeon report.
tags: [achievements, payload, collections, dofusdb, autofill, slugs]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-16T11:00:16.891Z
sources:
  - id: openwiki-source-b086b6b1802f507b0e5a4c8f
    resource: repo://scripts/dungeon-notes.ts
  - id: openwiki-source-13a4a70459b559cdd8e4d8fd
    resource: repo://scripts/refresh-game-data.ts
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
  - id: openwiki-source-c59753480751a9469ce8e192
    resource: repo://src/collections/torre-correction.ts
  - id: openwiki-source-a034fdee8bbd1156be43f216
    resource: repo://src/components/achievement-admin/DofusDbFill.tsx
  - id: openwiki-source-2d2a5acdd3240297c5f42f27
    resource: repo://src/endpoints/dofusdb-values.ts
  - id: openwiki-source-ad5f614f83919569e05c45bd
    resource: repo://src/lib/achievements/dofusdb-values.ts
  - id: openwiki-source-d44cdac9cd2322900519745e
    resource: repo://src/lib/achievements/dungeon-report.ts
  - id: openwiki-source-cccb36aaa2b11479c43f1674
    resource: repo://src/lib/achievements/ensure-pages.ts
  - id: openwiki-source-6c5141b803eb1f150eb8e36d
    resource: repo://src/lib/achievements/page.ts
  - id: openwiki-source-5adac35ccfda79779c93cc21
    resource: repo://src/lib/achievements/strings.ts
  - id: openwiki-source-589bfa7373a4546b25115691
    resource: repo://src/lib/admin/strings.ts
  - id: openwiki-source-849ba98bed9aabb2bf862269
    resource: repo://src/lib/dofusdb/map-achievement.ts
  - id: openwiki-source-cabbbdb69c4af80c58320870
    resource: repo://src/lib/dofusdb/refresh-achievements.ts
  - id: openwiki-source-09d6fe64c97ce6ea0a1d16e8
    resource: repo://src/lib/dofusdb/refresh-game-data.ts
  - id: openwiki-source-4ce5bfd40fc86e2e8680d71f
    resource: repo://src/lib/dofusdb/refresh-quests.ts
  - id: openwiki-source-4b87b2bd0648fe28c52dc5e5
    resource: repo://src/lib/guides/autofill.ts
  - id: openwiki-source-4d4ac9e1e628bf6a685e4bf2
    resource: repo://tests/integration/achievement-pages.test.ts
  - id: openwiki-source-1abfd2c4434a55eb5477aebf
    resource: repo://tests/integration/legacy-slugs.test.ts
  - id: openwiki-source-69a5fa7edb72294e823509c1
    resource: repo://tests/unit/achievement-dofusdb-values.test.ts
generated: { by: "claude-code", at: "2026-11-16T11:00:16.891Z" }
---

# Achievement data model

Achievements come in two layers, the same split the quest guides use with their DofusDB quest:

| Layer | Collections | Owner | Editable in the panel |
|---|---|---|---|
| Game data | `achievements`, `achievement-categories` | DofusDB, written by `pnpm data:refresh` | Achievements: only the «Corrección de Torre» group. Categories: no. Menu group «Datos del juego» |
| Editorial | `achievement-pages` ("Logros"), `achievement-groups` ("Metalogros") | Torre | Yes, with drafts, menu group «Contenido» |

Each editorial document links one game record and copies what its page shows. An empty field fills from DofusDB when the document is created, when its DofusDB link changes, or when Torre presses «Rellenar desde DofusDB»; a field Torre wrote is never overwritten, not by a later save and not by a refresh.

## Game data collections

`achievement-categories` (`src/collections/AchievementCategories.ts`) holds every DofusDB achievement category with its name, order and parent category. `achievements` (`src/collections/Achievements.ts`) holds the achievements of the categories under DofusDB's Misiones (8) and Eventos (9) roots:

- `quests`: one row per objective, in order. A row with several quests is a set of alternatives (the class quest: you do the one for your class).
- `rewards`: experience, kamas and items, computed for a level 200 character, as on Torre's pages.
- `countsFor`: the game achievements that require this one, directly or through another.
- `icon`: an upload to Media.

`achievements` is wrapped in `withTorreCorrection` (`src/collections/torre-correction.ts`), like quests, items, monsters, dungeons and NPCs: the DofusDB fields are read-only in the panel, and a «Corrección de Torre» group on top holds Torre's name, level, image and hidden flag, which the refresh never writes. See [Torre corrections to DofusDB data](../data/torre-corrections.md). Categories stay read-only (see [Collections](../cms/collections.md)).

### Reward figures

`src/lib/dofusdb/map-achievement.ts` turns a raw DofusDB achievement into the collection's shape. Experience is 30% of the fixed experience of the achievement's level plus 70% of that of its cap (1.5 times the level, at most 200), the client's formula, then multiplied by 1.05. That 5% bonus is how Torre's pages compute it: with it, 208 of his 223 pages with experience match. Kamas follow `(level² + 20·level − 20) · ratio`. Only reward rows whose level range covers level 200 count.

## Editorial collections

`achievement-pages` (`src/collections/AchievementPages.ts`) is one page per achievement, rendered at `/<slug>` (see [Achievement page](achievement-page.md)). It links one DofusDB achievement (`achievement`, optional and unique) and carries `name`, `slug` (labelled «Dirección en la web»), `state`, `group` (its metalogro), `order` in that metalogro, `quests`, `prerequisites`, `points`, `rewards`, and optional `intro` and `outro` rich text. It has live preview and preview URLs through the same `/vista-previa` route as guides.

The link is optional because DofusDB lacks some achievements Torre documents (the Krosmoz metalogro): such a page is written by hand with its name. Two pages cannot link the same achievement, but several can link none.

`prerequisites` is a list of rows with a text and an optional quest guide to link. When it has rows, the page shows them instead of the prerequisites it computes from the quests (`ownPrerequisites` in `src/lib/achievements/page.ts`).

The page form arranges its fields in three unnamed tabs (A-22): «Misiones» (metalogro, order, quests and prerequisites), «Texto» (intro and outro) and «Recompensas» (points and rewards). Unnamed tabs only order the form; the data is stored exactly as before. The quest rows start collapsed and show the quest's name as their label, and the form shows the one-line publish status like every editorial collection (see [Panel dashboard and editing aids](../cms/panel-editing-aids.md)).

`intro` and `outro` use the shared prose editor (`src/collections/prose-editor.ts`), which adds a YouTube «Vídeo» block (`ProseVideoBlock`) to the rich text toolbar; the page renders it as the video facade. A hidden `importSnapshot` JSON field keeps what `pnpm import:achievement-prose` last wrote into those two fields, so a rerun leaves alone any field Torre changed since (see [Achievement prose import](../data/achievement-prose-import.md)).

`achievement-groups` (`src/collections/AchievementGroups.ts`) is a metalogro: a game zone or story that groups achievements, shown on the [Metalogros index](metalogros-index.md). It links one DofusDB category (`category`, unique, optional) and carries `name`, `slug`, `state`, `section` (`stories`, `zones` or `seasonal`), `order`, `representative`, `intro` and `guides`. A metalogro without a category (temple quests) is written by hand; `guides` lists quest guides that belong to no achievement, so a metalogro can hold only guides.

`representative` is a polymorphic relationship to `npcs` or `monsters`: the art of the metalogro's index tile. By default it is the NPC who gives the first quest of the category's first achievement with quests.

Both collections share their read rules with quest guides through `src/collections/editorial-access.ts`: panel users read everything including drafts; everyone else reads documents whose `_status` is `published`. Any panel account creates and updates, but only an `admin` deletes (`isAdmin`), because the refresh creates these documents (see [Admin panel](../cms/admin-panel.md) for the roles). A `beforeDelete` hook (`refuseReferencedDelete` from `src/collections/delete-guard.ts`) also refuses to delete an achievement page or metalogro that a guide still points at, naming the guides. Both keep up to 50 versions per document.

### Locked fields

The DofusDB link (`achievement` on a page, `category` on a metalogro) and `order` take `access: lockedOnceSet(name)`: anyone fills them while empty, but once saved only an admin can change them, and Payload keeps the saved value when an editor sends another. Changing the link would swap the source of every autofilled field, and `order` moves the page in its metalogro. The help text under each field says so (`panelStrings.locks`).

### State

`state` (`stateField` in `src/collections/achievement-fields.ts`, labelled «Visible en la web» in the panel) is `published` or `preparing` ("Publicada" or "En preparación"), default `preparing`. It is Torre's alone: the refresh creates pages as `preparing` and never changes the field. It is separate from Payload's `_status`: the pages the refresh creates are `_status: published` so they can be listed, while `state` says whether the page shows its full content.

## Filling from DofusDB

`fillAchievementPage` and `fillAchievementGroup` (`src/collections/achievement-autofill.ts`) run as `beforeValidate` hooks:

1. Decide how much to fill with `fillsFromDofusDb` (`src/lib/guides/autofill.ts`): a full fill on create or when the request sends a different link; otherwise only the name, and only if it is blank.
2. Read the linked record's values through `achievementValues` or `groupValues` (`src/lib/achievements/dofusdb-source.ts`).
3. Pass them with the document's current values to `fillFromValues` (`src/lib/achievements/dofusdb-values.ts`), which returns only the fields that are empty in the document and non-empty in DofusDB. An empty value is null, blank text or a list with no rows; `0` is a value.
4. Write those fields (`keepFillable` drops all but the name when the fill is not full). Reward fields go into the `rewards` group.
5. Require a name, then fill an empty slug.

So a field Torre empties on a later save stays empty; only the required name comes back from DofusDB. A value present in the request wins over the saved document, and a value absent from the request comes from the saved document. The page's state is never filled.

The fields an achievement page fills are name, metalogro (the one linked to the achievement's category), order, points, experience, kamas, items and quests. A metalogro fills name, order, section and representative.

`groupSection` decides a category's section: anything under Eventos, at any depth, is `seasonal`; among the direct children of Misiones, those with order 10 or less are `stories` and the rest `zones`; anything under one of those is a zone.

The name and slug validators (`linkedNameValidator`, `linkedSlugValidator`) accept an empty value while a DofusDB record is linked, because the hook fills it on save.

### «Rellenar desde DofusDB»

The DofusDB link field's description is `DofusDbFill` (`src/components/achievement-admin/DofusDbFill.tsx`, mounted through `dofusDbFill` in `src/collections/achievement-fields.ts`). Its button reads the linked record's values and copies them into the form as it stands, without saving: `formFill` in `src/lib/achievements/dofusdb-values.ts` maps each value to its form path (rewards under `rewards.*`) and fills only empty fields, list fields (quests and reward items) row by row. The shared button is `src/components/admin/DofusDbFillButton.tsx`, also used by quest guides (see [Writing a quest guide](../cms/guide-authoring.md)).

## The panel notes

Each copied field shows a note under it (`dofusDbNote` in `src/collections/achievement-fields.ts` mounts `src/components/achievement-admin/DofusDbNote.tsx` as the field's description). The note says whether the value is DofusDB's, whether Torre changed it (and what DofusDB gives), or that it is empty and what «Rellenar desde DofusDB» would copy. The comparison is in `dofusDbNote` in `src/lib/achievements/dofusdb-values.ts`: relations compare by ID, reward items as a set, quest rows in order with their alternatives as a set.

The client component reads the values through `GET /api/dofusdb-values/:source/:id` (`src/endpoints/dofusdb-values.ts`), where `source` is `achievement` or `group`. The endpoint returns 401 without a panel session, 400 for an unknown source or a non-numeric ID, 404 when the record does not exist, and always sends `Cache-Control: no-store`. It loads through the same `dofusdb-source.ts` functions as the hooks, so the note and the save never disagree.

## One slug space at the root

Quest guides, achievement pages, metalogros, Dofus guides, checklists and standalone pages all live at `/<slug>` (metalogros keep Torre's `metalogro-…` slugs, Dofus guides the slugs of Torre's site, such as `dofus-abisal`, checklists slugs such as `checklist-nebuloso`, and pages slugs such as `aviso-legal`), so `src/collections/root-slug.ts` treats them as one slug space (`ROOT_SLUG_COLLECTIONS`):

- Each collection keeps its own `slug` unique in the database.
- `rejectSharedSlug(collection)`, a `beforeValidate` hook on all six, rejects a slug another of the six already uses, naming which kind of page owns it. See [Dofus guide data model](../dofus-guides/dofus-guide-data.md), [Checklist data](../checklists/checklist-data.md) and [Standalone pages](../pages/standalone-pages.md) for the others.
- The same hook rejects a slug that is a source in the legacy redirect table, because `src/proxy.ts` would answer that URL before the page (see [Redirects, sitemap and robots](../operations/redirects-and-seo.md)). Metalogros are exempt: their slug is the anchor of their panel on `/metalogros`, not a page.
- A slug counts as used when a stored document has it or when the latest draft does, so publishing a renamed draft cannot collide later.
- `isRootSlugTaken` also treats reserved route segments (`/sistema`, `/metalogros`, `/guias-dofus`, `/checklists` and the others in `src/lib/guides/slug.ts`) and, except for metalogros, redirect table sources as taken, so slug autofill skips them.

When the hook fills a slug, it takes the first free candidate: for an achievement page the slugified name, then `logro-<name>`, then the name with `-2`, `-3` and so on; for a metalogro `metalogro-<name>` and then numbered suffixes.

When a published achievement page changes its slug, `trackSlugMove` (`beforeChange`) and `applySlugMove` (`afterChange`) from `src/collections/slug-redirects.ts` add a redirect from the old address to the new one (see [Redirects, sitemap and robots](../operations/redirects-and-seo.md)).

## What the refresh writes

`pnpm data:refresh` (`scripts/refresh-game-data.ts` running `refreshGameData` in `src/lib/dofusdb/refresh-game-data.ts`, see [DofusDB refresh](../data/dofusdb-refresh.md)) writes achievements after quests, items and subareas:

1. `refreshAchievements` (`src/lib/dofusdb/refresh-achievements.ts`) upserts every category, then sets parents in a second pass because they need every Payload ID. It upserts the achievements of the categories under Misiones and Eventos (`QUEST_ROOT_CATEGORIES = [8, 9]`), so a new zone or achievement there arrives with the next refresh. It imports achievement icons to Media once, links quests and items already stored, counts the ones DofusDB names but the database lacks, writes only what changed, and never deletes. Each row's write goes through `rowGuard`: a row that fails to save is logged and counted as `failed`, and the refresh goes on unless more than 20 rows of the collection fail (a category that failed skips its parent pass).
2. After NPCs, `ensureAchievementPages` (`src/lib/achievements/ensure-pages.ts`) creates a metalogro for each category under those roots with none, and an achievement page for each achievement with at least one quest and no page. It creates them as `state: preparing` and lets the fill hooks copy the rest. It never changes or deletes an existing one. It runs after NPCs because the default representative is an NPC.

Torre's existing pages and states come from his site through a separate import (see [Importing Torre's achievement pages](../data/achievements-import.md)).

## Dungeon report

`dungeonNoteReport` (`src/lib/achievements/dungeon-report.ts`) lists the dungeon rows of published pages: «Necesitarás en total» on achievement pages, Necesitarás on Dofus guides and the quest guide header. It splits them into rows that show their dungeon's boss and rows that fall back to the generic icon, with how each note matched. It classifies through the same functions the pages use, so it reports what readers see. `pnpm data:refresh` prints it after the refresh, and `pnpm data:dungeon-notes` prints it alone.

## Tests

- `tests/unit/achievement-dofusdb-values.test.ts`: `groupSection`, `fillFromValues` and the note text.
- `tests/unit/dofusdb-map-achievement.test.ts`: objectives, rewards and `countsFor`.
- `tests/unit/dofusdb-values-endpoint.test.ts`: the endpoint's status codes.
- `tests/unit/achievement-editorial-collections.test.ts` and `tests/unit/achievement-game-collections.test.ts`: collection config.
- `tests/integration/achievement-pages.test.ts`: values from the database, sections at any depth, `ensureAchievementPages` (including idempotence), Torre's edits surviving, a cleared field staying empty, a cleared name coming back, a new link filling, and the shared slug rules.
- `tests/integration/legacy-slugs.test.ts`: slugs in the redirect table are rejected and skipped by autofill.
- `tests/integration/panel-roles.test.ts`, `tests/integration/delete-references.test.ts` and `tests/integration/field-locks.test.ts`: admin-only deletes, the delete guard and the locked fields.
- `tests/integration/refresh-achievements.test.ts`: the refresh against fixtures in `tests/fixtures/dofusdb/`.
- `tests/integration/dungeon-report.test.ts` and `tests/unit/dungeon-report-lines.test.ts`: the dungeon report.
