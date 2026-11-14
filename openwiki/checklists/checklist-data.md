---
type: data model
title: Checklist data and import
description: The checklists collection (state and Squarespace link, steps with a stable stepId, zone, text segments with «Detente aquí» and «Aquí se resuelve» rules, Necesitarás rows, prerequisites with locked keys), its validation, and how pnpm import:checklists converts Torre's silvestre-checklist data without undoing panel edits.
tags: [checklists, payload, collections, import, progress, validation]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-14T11:00:46.827Z
sources:
  - id: openwiki-source-f477f36797157d09fb2dc365
    resource: repo://scripts/import/checklists/art.ts
  - id: openwiki-source-42c16943ea7c1bfccbea3dee
    resource: repo://scripts/import/checklists/catalog.ts
  - id: openwiki-source-a7aaab835f81841c28c0dc10
    resource: repo://scripts/import/checklists/load.ts
  - id: openwiki-source-c8c15d26680eaf2e71aba84d
    resource: repo://scripts/import/checklists/to-checklist.ts
  - id: openwiki-source-5e5a9deaf2d00890b3600afb
    resource: repo://scripts/import/import-checklists.ts
  - id: openwiki-source-82fd380b426498feb2af7f7d
    resource: repo://src/collections/checklist-rules.ts
  - id: openwiki-source-c74463529d89880b13383ea1
    resource: repo://src/collections/Checklists.ts
  - id: openwiki-source-eec436a9dcb7734a62bf153f
    resource: repo://src/collections/editorial-access.ts
  - id: openwiki-source-14b74cda6fb31c51d7062a0d
    resource: repo://src/collections/locked-once-saved.ts
  - id: openwiki-source-32333eb2cc7b26611e0b6e10
    resource: repo://src/lib/checklists/step-ids.ts
  - id: openwiki-source-7a4e3f6c5cd439edff79c99b
    resource: repo://tests/integration/import-checklists.test.ts
generated: { by: "claude-code", at: "2026-11-14T11:00:46.827Z" }
---

# Checklist data and import

A checklist is Torre's step-by-step route to one Dofus: every quest, objective and item in order, with his notes. It lives in the `checklists` collection (`src/collections/Checklists.ts`) and renders at `/<slug>` (see [Checklist page and index](checklist-page.md)). Progress is kept in the browser per step (see [Checklist progress engine](progress.md)), so the one thing a step must never lose is its identifier.

## The collection

`checklists` sits in the panel's «Contenido» group, with drafts (up to 50 versions), live preview through `/vista-previa` and a phone breakpoint. Its top-level fields:

| Field | What it holds |
|---|---|
| `name`, `slug` | The title and the address. The slug shares the root slug space with guides, achievement pages, metalogros and Dofus guides (`rejectSharedSlug('checklists')`, see [Achievement data model](../achievements/achievement-data.md)) |
| `state` | «Publicada» or «En preparación», Torre's own field («Visible en la web»), shared with achievement pages |
| `legacyHref` | Shown only while `state` is `preparing`: the Squarespace checklist that `/<slug>` redirects a visitor to |
| `order` | Position in `/checklists` and the menu; locked once set (`lockedOnceSet('order')`) |
| `description` | The text of its index card |
| `dofusGuide` | The Dofus guide it belongs to, the source of its egg, color and breadcrumb |
| `prerequisites` | An intro and groups of rows; each row has a `key` and a text |
| `steps` | The route itself (below) |
| `legacy` | Hidden: what the progress migration needs from the old checklist (key prefix, classic keys, guide version, old step numbering, item keys that moved) |
| `importSnapshot` | Hidden: what the import last wrote |

Access follows the editorial rules: visitors read published documents, panel users read everything and create and update. Deleting uses `adminOrNotImported('importSnapshot')`: an admin deletes any checklist, an editor only one the import did not create (see [Admin panel](../cms/admin-panel.md)). The collection sets `disableDuplicate: true`, because a copy would carry the same step identifiers and two checklists would share progress.

The collection mounts `GET /api/checklists/:slug/details` and expires the `checklists` cache tag on every save and delete.

### Steps

Each step (`stepFields`) carries:

- **Text as segments.** `segments` is Torre's text cut into ordered pieces, each with a `kind`: «Normal» (`plain`), «Detente aquí» (`stop`: leave a quest half done at one objective) or «Aquí se resuelve» (`resolve`: finish what earlier steps left half done). A stop segment names a `quest` and a `stopObjective`; a resolve segment lists the stepIds it `closes`.
- **`zone`**: Torre's grouping in the step list («Anutropía»). It is not always where the step's quests start.
- **`note`**: optional rich text.
- **`achievements`**: achievements the step advances, either whole («Completo») or only some of their quests («Solo algunas misiones», with the quests listed).
- **`quests`**: the quests of the step, each «Obligatoria», «Opcional» or «Solo tomarla»; an optional quest may name the step that finishes it (`optionalDoneBy`).
- **`needs`** («Necesitarás»): rows that are a game `item` or, when the thing is not an item (kamas, a spell), a text `label`, with a quantity, a group (`resources`, `consumables`, `equipment`, `souls`, `creatures`, `cosmetics`), whether it counts in the totals, and the quests that need it. The import never drops a row: what does not match an item stays as text.
- **Art**: a `figure` (an NPC or an image, with a role), `bosses`, an `icon` and a `banner`.
- **`legacyNumber`**: hidden, the step's number in the old checklist, for the progress migration.
- **`stepId`**: read-only, under a collapsed technical section, with a copy button (`CopyValueDescription`) so Torre can paste it into «Pasos que termina».

There is no effort field and no stored weight; the percentage weights are computed from quest data (see [Checklist progress engine](progress.md)).

### Stable step identifiers

`keepStepIds`, a `beforeValidate` hook, runs `assignStepIds` (`src/lib/checklists/step-ids.ts`) before validation so that resolve segments and optional quests can point at steps saved in the same request. Each step keeps, in order of preference:

1. the stepId of its saved row (Payload's row `id` survives reordering and editing), even if the request sends it empty or changed;
2. the stepId it brings, if no other step has it (an import that already knows it);
3. the stepId of the saved step with the same `legacyNumber` (a reimport without row ids);
4. a new UUID.

An identifier is never repeated, so a row duplicated in the panel gets a new one.

### Validation rules

`src/collections/checklist-rules.ts` returns `true` or a Spanish message for the panel:

| Rule | Check |
|---|---|
| `validateSegmentQuest` | A «Detente aquí» needs its quest |
| `validateStopObjective` | Its objective is a non-negative integer smaller than the number of objectives in the quest's stored stages, flattened stage by stage (the order of `src/lib/dofusdb/quest-stages.ts`, the same as the old checklist). A quest with no stored objectives is rejected |
| `validateClosedSteps` | A «Aquí se resuelve» closes at least one step, and only steps of this checklist |
| `validateStepRef` | An optional quest's finishing step, when set, is a step of this checklist |
| `validateNeedItem` | A «Necesitarás» row has an item or a non-blank label |

### Locked prerequisite keys

A prerequisite row's `key` holds each member's tick for that row, so it never changes once saved, for anyone. `keepSavedValue` (`src/collections/locked-once-saved.ts`) restores the saved key by row id, searching every group, and the panel shows it with `LockedOnceSavedText`. `rememberRowsWithoutId('prerequisites.groups.rows')`, a `beforeOperation` hook, notes the rows that arrive without an id, so such a row cannot take a saved row's place with a new key. See [Admin panel](../cms/admin-panel.md).

## Migrations

The schema arrived in several migrations: `20261113_151549_checklists` (the collection), `20261113_160051_checklist_needs` (label rows, group and totals), `20261113_175047_checklist_step_zone` (the step `zone`) and `20261114_000512_checklist_owned_moves` (`legacy.ownedMoves`). See [Database](../data/database.md).

## The import

`pnpm import:checklists --from <silvestre-checklist> [--only <id>] [--apply] [--remote] [--production]` (`scripts/import/import-checklists.ts`) brings Torre's checklists over from a local copy of the old `silvestre-checklist` repo.

**What it imports.** `CHECKLIST_CATALOG` (`scripts/import/checklists/catalog.ts`) lists every checklist in the order of the old hub, with its slug, name, order, Dofus guide and Squarespace link. An entry marked `ported` (today the Nebuloso) comes in whole: it is created as a draft in «En preparación», so Torre reviews it before it shows. The others are created published, «En preparación» and without steps, as entries that link to Squarespace.

**Pipeline.**

1. Refuse to run against a remote database without `--remote`, or production without `--production` (`databaseScriptRefusal`), before starting Payload.
2. `readLegacyChecklist` (`legacy.ts`) reads the old `src/dofus/<id>/` folder: `steps.js` and `config.js` through `import()`, plus the JSON files the old build scripts produced.
3. `toChecklistDraft` (`to-checklist.ts`) converts it without touching the database. Torre's texts, notes and prerequisites are copied as is and in order. Each step's text is cut into segments around its highlights; it throws if a highlight is missing or the segments do not join back into the original text, so no word is lost or changed. `stepStops` (`stops.ts`) places each «Detente aquí» on the same objective index the old checklist used: first the stops written by hand in `config.js`, otherwise the one deduced from the text.
4. `loadChecklists` (`load.ts`) resolves every reference against Payload (quests, achievements, items, NPCs, bosses, the Dofus guide and art) and writes. Missing items and NPCs come from DofusDB with their icons and renders; start maps, zone images and figures that are not NPCs are uploaded to Media once, keyed by `media.gameAsset` (`art.ts`), so reruns never duplicate files.

**Dry run first, always.** The script runs `loadChecklists` with `apply: false`, prints what did not match (quests, achievements, NPCs, bosses, images) and the «Necesitarás» rows that will be kept as text, and counts what it would fetch and upload. Only with `--apply` does it write.

**Reruns keep Torre's edits.** Each write stores what the import wrote per field in `importSnapshot`. On a rerun a field is rewritten only when its stored value still equals the snapshot; a field Torre changed is left alone. Step zones are tracked separately per stepId, so a new zone reaches a step even when Torre edited other fields of the steps, while a zone he changed stays. A rerun with no changes writes nothing. A step keeps its stepId through reimports via its `legacyNumber`, and the resolve segments and optional quests are written with those stepIds.

## Tests

- `tests/unit/checklists-collection.test.ts`: the collection config.
- `tests/unit/checklist-step-ids.test.ts`: `assignStepIds`.
- `tests/unit/checklist-segment-rules.test.ts`: the validation rules.
- `tests/unit/import-checklist-map.test.ts`: the conversion of the Nebuloso fixture (`tests/fixtures/silvestre-checklist/`).
- `tests/integration/checklists.test.ts`: the collection against Postgres.
- `tests/integration/import-checklists.test.ts`: dry run, creation, idempotent reruns, stepIds surviving changed text, Torre's edits and zones surviving, and the entries that are not ported.
- `tests/integration/field-locks.test.ts`: the prerequisite key lock.
