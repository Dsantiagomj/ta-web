---
type: data model
title: Checklist data and import
description: The checklists collection (steps or souls kind, state and Squarespace link, index card, steps with a stable stepId arranged in panel tabs, text segments with stops, resolves and guide callouts, Necesitarás rows with alternatives, prerequisites with locked keys, quests that finish on their own), its validation, and how pnpm import:checklists brings over the Silvestre, Hielos, Nebuloso and Ocre without undoing panel edits.
tags: [checklists, payload, collections, import, progress, validation]
sources:
  - id: openwiki-source-f477f36797157d09fb2dc365
    resource: repo://scripts/import/checklists/art.ts
  - id: openwiki-source-42c16943ea7c1bfccbea3dee
    resource: repo://scripts/import/checklists/catalog.ts
  - id: openwiki-source-9bbcf2b8b1b14f86e4130a2b
    resource: repo://scripts/import/checklists/generic.ts
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
  - id: openwiki-source-b5ebd1b0d78d15bedec5d16c
    resource: repo://src/collections/content-date.ts
  - id: openwiki-source-eec436a9dcb7734a62bf153f
    resource: repo://src/collections/editorial-access.ts
  - id: openwiki-source-14b74cda6fb31c51d7062a0d
    resource: repo://src/collections/locked-once-saved.ts
  - id: openwiki-source-4f2e53306895c158accd92ec
    resource: repo://src/collections/revalidate-guides.ts
  - id: openwiki-source-32333eb2cc7b26611e0b6e10
    resource: repo://src/lib/checklists/step-ids.ts
  - id: openwiki-source-08cbe0247863351418b06e35
    resource: repo://src/lib/checklists/strings.ts
  - id: openwiki-source-7a4e3f6c5cd439edff79c99b
    resource: repo://tests/integration/import-checklists.test.ts
generated: { by: "claude-code", at: "2026-11-20T11:20:16.585Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-20T11:20:16.585Z
---

# Checklist data and import

A checklist is Torre's route to one Dofus. There are two kinds (`kind`):

- **Steps** (`steps`, the default): every quest, objective and item in order, with his notes. The Silvestre, the Dofus de los Hielos, the Nebuloso and the «Rush de todos los Dofus» (`checklist-todos-dofus`, a route that gives every Dofus rather than one) are this kind.
- **Souls** (`souls`): the souls one quest asks for, such as the Dofus Ocre. Its rows are not stored; they come from the quest and its monsters (see [Souls checklist](souls-checklist.md)).

Checklists live in the `checklists` collection (`src/collections/Checklists.ts`) and render at `/<slug>` (see [Checklist page](checklist-page.md)). Progress is kept in the browser per step (see [Checklist progress engine](progress.md)), so the one thing a step must never lose is its identifier.

## The collection

`checklists` sits in the panel's «Contenido» group, with drafts (up to 50 versions), live preview through `/vista-previa`, the one-line publish status and `defaultSort: 'order'`. Its top-level fields:

| Field | What it holds |
|---|---|
| `name`, `slug` | The title and the address. The slug shares the root slug space with guides, achievement pages, metalogros, Dofus guides and standalone pages (`rejectSharedSlug('checklists')`, see [Achievement data model](../achievements/achievement-data.md)) |
| `state` | «Publicada» or «En preparación», Torre's own field («Visible en la web»), shared with achievement pages |
| `kind` | «Pasos de una guía» (`steps`, default, so older documents stay steps) or «Almas de una misión» (`souls`), in the sidebar |
| `ambience` | «Ambiente», in the sidebar: the particles behind the page, `egg` (default: specks in its Dofus color), `snow`, `forest` or `theme` (the site theme's own). It replaced the old choice by checklist ID (see [Styles and layout shell](../frontend/styles-and-shell.md)) |
| `soulsQuest` | Only for a souls checklist: the quest whose souls are ticked («La eterna cosecha») |
| `soulOverrides` | «Almas corregidas», only for a souls checklist: rows naming a `monster` with this list's own `dungeon`, `zone` or `region` text, or `hidden` to leave it out. A soul's name, level and image are corrected on the monster itself, in «Corrección de Torre» (see [Souls checklist](souls-checklist.md)) |
| `legacyHref` | Shown only while `state` is `preparing`: the Squarespace checklist that `/<slug>` redirects a visitor to |
| `order` | Position in `/checklists` and the menu; required and locked once set (`lockedOnceSet('order')`) |
| `description` | The sentence of its index card and menu entry, with no step or quest counts |
| `dofusGuide` | The Dofus guide it belongs to, the source of its egg, color and breadcrumb. Optional: the rush has none, and takes its color from its card and its eggs from the Dofus of its steps (see [Checklist page](checklist-page.md)) |
| `card` | «Tarjeta del índice», in the sidebar: the background `scene`, the `npc` that peeks in from the right with its height and offsets in percent, a hex `color` with the color picker, and `crown`, up to six Dofus guides whose eggs replace the NPC (the rush's crown of eggs). Empty values take the defaults of `checklists-index.css` and the Dofus guide's color (see [Checklists index](checklists-index.md)) |
| `prerequisites` | An intro, groups of rows (each row has a `key` and a text), callouts (`notes`) and a «Necesitarás» list whose rows can name the `prerequisite` key they are spent on |
| `stepOutline` | A UI field, not stored: the outline that reorders steps with buttons and the keyboard (see [Panel dashboard and editing aids](../cms/panel-editing-aids.md)) |
| `steps` | The route itself (below) |
| `completedBy` | «Misiones que se terminan solas»: quests the game completes on its own when all the listed quests are done («Bienvenido a Frigost»); they show as done without ticking |
| `legacy` | Hidden: what the progress migration needs from the old checklist (key prefix, classic keys, guide version, old step numbering, item keys that moved, and `genericQuests`, which maps old generic rows to their first quest) |
| `importSnapshot` | Hidden: what the import last wrote |

Access follows the editorial rules: visitors read published documents, panel users read everything and create and update. Deleting uses `adminOrNotImported('importSnapshot')`: an admin deletes any checklist, an editor only one the import did not create (see [Admin panel](../cms/admin-panel.md)). The collection sets `disableDuplicate: true`, because a copy would carry the same step identifiers and two checklists would share progress.

The collection mounts `GET /api/checklists/:slug/details` and `GET /api/checklists/poster-progress`, and expires the `checklists` and `dofus-guides` cache tags on every save and delete, drafts included (a Dofus guide links its checklist once it is published). When a published checklist changes its slug, `trackSlugMove` and `applySlugMove` add a redirect from the old address (see [Redirects, sitemap and robots](../operations/redirects-and-seo.md)). A hidden `contentUpdatedAt` date, set by `trackContentDate` when a panel user publishes a content change, gives the checklist's «Actualizado el» date (see [Share cards, JSON-LD and update dates](../operations/share-cards-and-structured-data.md)).

### Steps

A step's fields sit in four unnamed tabs (`placeInTabs` in `src/collections/field-tabs.ts`; A-18), because an open step used to be over 4,000 px tall. Unnamed tabs only arrange the form; the stored data does not change. `placeInTabs` fails if a step field is left without a tab.

| Tab | Fields |
|---|---|
| «Texto» | `zone`, `segments`, `closes`, `updates`, `note` |
| «Misiones» | `quests`, `achievements`, `bosses`, `dofus` |
| «Necesitarás» | `needs` |
| «Imágenes» | `banner`, `icon`, `figure` |

Below the tabs, a collapsed technical section holds `stepId`. The fields:

- **Text as segments.** `segments` is Torre's text cut into ordered pieces, each with a `kind`:
  - «Normal» (`plain`);
  - «Detente aquí» (`stop`): leave a quest half done before one objective. A stop names a `quest` and a `stopObjective`, chosen in the panel by the objective's text and stored as its index. It can also set `later` (a later step that carries the quest finishes it, not the one that closes this step), `line` (the stop's text inside the quest, when it differs from the segment) and `resumeLine` (the text when the step resolves itself). `more` lists further stops with the same text. A stop without a quest only warns;
  - «Aquí se resuelve» (`resolve`): finish what earlier steps left half done. It lists the stepIds it `closes`; with none, the step resolves its own stops;
  - the guide's callouts: «Nota» (`note`), «Consejo» (`tip`), «Hay que hacerlo» (`must`) and «Incluye» (`includes`).
- **`closes`** («También termina») and **`updates`** («Avanza los pasos»): steps whose quests this step finishes without a resolve segment, or advances without finishing (those steps show «Se retoma en el paso N»).
- **`zone`**: Torre's grouping in the step list («Anutropía»). It is not always where the step's quests start.
- **`note`**: optional rich text.
- **`achievements`**: achievements the step advances, whole («Completo»), only some of their quests («Solo algunas misiones») or up to one («Hasta una misión»), with the quest positions in `on`.
- **`quests`**: the quests of the step, each «Obligatoria», «Opcional» or «Solo tomarla», with an optional `note`. A row that any of several quests satisfies (the class quest, one per alignment) has a `label` shown instead of the quest's name and the other quests in `alternatives`. An optional quest may name the step that finishes it (`optionalDoneBy`).
- **`needs`** («Necesitarás»): rows that are a game `item` or, when the thing is not an item (kamas, a spell), a text `label`, with a quantity and:
  - `alternatives` («O también»): other options with their own quantity («Pandaburg o Pandapils»);
  - a `note`, a `category` (`resources`, `consumables`, `equipment`, `souls`, `creatures`, `cosmetics`) and an optional `group` inside it («Misión opcional»);
  - `countsInTotal`, and `reusable` («Se conserva»: the totals take the largest quantity instead of the sum);
  - the `quests` that need it.
  The import never drops a row: what does not match an item stays as text.
- **`dofus`** («Dofus que da»): the Dofus guides of the Dofus the step gives. Together they are the checklist's Dofus road (the rush gives 26; one of its steps gives two).
- **Art**: a `figure` (an NPC or an image, with an optional `name` that falls back to the NPC's name or the image's alt text, and a role), `bosses`, an `icon` and a `banner`.
- **`legacyNumber`**: hidden, the step's number in the old checklist, for the progress migration.
- **`stepId`**: read-only, with a copy button (`CopyValueDescription`). It is born with the row (`defaultValue` is a new UUID), so a step added in the panel can be picked right away in «Pasos que termina».

The step pickers (`closes`, `updates`, `optionalDoneBy`) use `StepRefField`, which lists steps by name, and `stopObjective` uses `StopObjectiveField`, which lists the quest's objectives by text (A-19, see [Panel dashboard and editing aids](../cms/panel-editing-aids.md)).

There is no effort field and no stored weight; the percentage weights are computed from quest data (see [Checklist progress engine](progress.md)).

### Stable step identifiers

`keepStepIds`, a `beforeValidate` hook, runs `assignStepIds` (`src/lib/checklists/step-ids.ts`) before validation so that resolve segments and optional quests can point at steps saved in the same request. Each step keeps, in order of preference:

1. the stepId of its saved row (Payload's row `id` survives reordering and editing), even if the request sends it empty or changed;
2. the stepId it brings, if no other step has it (an import that already knows it, or the default of a new row);
3. the stepId of the saved step with the same `legacyNumber` (a reimport without row ids);
4. a new UUID.

An identifier is never repeated, so a row duplicated in the panel gets a new one.

### Validation rules

`src/collections/checklist-rules.ts` returns `true` or a Spanish message for the panel:

| Rule | Check |
|---|---|
| `validateSegmentQuest` | A stop in «Más paradas» needs its quest. The «Detente aquí» segment itself may go without one: then it only warns |
| `validateStopObjective` | When a stop has a quest, its objective is a non-negative integer smaller than the number of objectives in the quest's stored stages, flattened stage by stage (the order of `src/lib/dofusdb/quest-stages.ts`, the same as the old checklist). A quest with no stored objectives is rejected |
| `validateClosedSteps` | A «Aquí se resuelve» closes only steps of this checklist; an empty list means the step resolves itself |
| `validateStepRefs`, `validateStepRef` | A step's `closes` and `updates`, and an optional quest's finishing step, name only steps of this checklist |
| `validateNeedPrerequisite` | A prerequisite «Necesitarás» row names an existing prerequisite key |
| `validateNeedItem` | A «Necesitarás» row has an item or a non-blank label |

### Locked prerequisite keys

A prerequisite row's `key` holds each member's tick for that row, so it never changes once saved, for anyone. `keepSavedValue` (`src/collections/locked-once-saved.ts`) restores the saved key by row id, searching every group, and the panel shows it with `LockedOnceSavedText`. `rememberRowsWithoutId('prerequisites.groups.rows')`, a `beforeOperation` hook, notes the rows that arrive without an id, so such a row cannot take a saved row's place with a new key. See [Admin panel](../cms/admin-panel.md).

## Migrations

The schema arrived in several migrations: `20261113_151549_checklists` (the collection), `20261113_160051_checklist_needs` (label rows, group and totals), `20261113_175047_checklist_step_zone` (the step `zone`), `20261114_000512_checklist_owned_moves` (`legacy.ownedMoves`), `20261114_022136_checklist_silvestre` (what the Silvestre needs: callout segments, the «Hasta una misión» achievement mode, stop options and «Más paradas», «Necesitarás» alternatives and reusable rows, prerequisite callouts and needs), `20261114_022458_checklist_hielos` (generic rows and `completedBy`), `20261114_122659_checklist_ocre` (the souls kind and monster game data), `20261114_142119_checklist_cards` (the index card and the `checklists-index` global), `20261115_163339_checklist_step_dofus` (the step `dofus` road), `20261115_174248_checklist_figure_name` (the figure `name`) and `20261115_191357_editable_missing_fields` (among others, `ambience`, `soulOverrides` and the card `crown`). See [Database](../data/database.md).

## The import

`pnpm import:checklists --from <silvestre-checklist> [--only <id>] [--apply] [--remote] [--production]` (`scripts/import/import-checklists.ts`) brings Torre's checklists over from a local copy of the old `silvestre-checklist` repo.

**What it imports.** `CHECKLIST_CATALOG` (`scripts/import/checklists/catalog.ts`) lists every checklist in the order of the old hub, with its slug, name, order, Dofus guide, Squarespace link and card art. Five entries are `ported`:

- the Silvestre, the Dofus de los Hielos, the Nebuloso and the «Rush de todos los Dofus» (`todos`) come in whole, with their steps (`hasLegacySteps`). The rush has no `dofusGuide`; its card carries a gold `color` and a `crown` of six Dofus. Each step's `dofus` comes from the old checklist's `DOFUS_ROAD` asset, matched by the Dofus item's name to its guide; a road entry on a step that does not exist throws;
- the Ocre is a souls checklist (`kind: 'souls'`, `soulsQuest` is the DofusDB quest ID): the import writes only its card fields, kind, quest and `legacy.prefix` (`cosecha:`), because its souls come from the quest.

A new ported checklist is created as a draft in «En preparación», so Torre reviews it before it shows. The other entries are created published, «En preparación» and without steps, as entries that link to Squarespace. When an entry that was created that way is ported later, the ported content goes to a draft: the published document stays the link entry until Torre reviews it.

**Pipeline.**

1. Refuse to run against a remote database without `--remote`, or production without `--production` (`databaseScriptRefusal`), before starting Payload.
2. `readLegacyChecklist` (`legacy.ts`) reads the old `src/dofus/<id>/` folder of each checklist with steps: `steps.js` and `config.js` through `import()`, plus the JSON files the old build scripts produced.
3. Generic rows. The old checklist has rows that are not one quest but any of several (`clase` for the class quest, `alt:<achievement>:<objective>` for one per alignment or profession). `genericAlternatives` (`generic.ts`) asks DofusDB for the achievement objective that counts each row and reads its quests from the objective's criterion, once for all checklists. The row is stored with the first quest, a `label` and the rest as `alternatives`, and `legacy.genericQuests` keeps the mapping for the progress migration. A generic row DofusDB does not resolve is left out and reported.
4. `toChecklistDraft` (`to-checklist.ts`) converts each checklist without touching the database. Torre's texts, notes and prerequisites are copied as is and in order. Each step's text is cut into segments around its highlights; it throws if a highlight is missing or the segments do not join back into the original text, so no word is lost or changed. Callout highlights become `note`, `tip`, `must` or `includes` segments. `stepStops` (`stops.ts`) places each «Detente aquí» on the same objective index the old checklist used: first the stops written by hand in `config.js` (with their `later`, `line` and `resumeLine` options), otherwise the one deduced from the text. The quests that finish on their own come from the old `COMPLETED_BY`. A step with one green mark gives it every step it closes; with several, `greenCloses` gives each closed step to the green that says it finishes that step's quest («terminar la misión del inciso 143»), and throws when a closed step has no such green or two.
5. `loadChecklists` (`load.ts`) resolves every reference against Payload (quests, achievements, items, NPCs, bosses, the Dofus guide and art) and writes. Missing items and NPCs come from DofusDB with their icons and renders; start maps, zone images and figures that are not NPCs are uploaded to Media once, keyed by `media.gameAsset` (`art.ts`), so reruns never duplicate files. For a souls checklist, `resolveSouls` finds the quest, counts the distinct monsters of its `bring` objectives and reports the monsters missing from the database and those without the level or subarea the page needs.

**Dry run first, always.** The script runs `loadChecklists` with `apply: false` and prints:

- what did not match (quests, achievements, NPCs, bosses, images);
- the «Detente aquí» segments with no quest to stop in (kept as warnings);
- the «Necesitarás» rows that will be kept as text, and plural names matched to a singular item;
- for each souls checklist, its soul count and the monsters missing or lacking game data (run `pnpm data:refresh` before publishing it);
- what it would fetch and upload.

Only with `--apply` does it write.

**Reruns keep Torre's edits.** Each write stores what the import wrote per field in `importSnapshot`. On a rerun a field is rewritten only when its stored value still equals the snapshot; a field Torre changed is left alone and reported. The fields depend on the entry: a ported checklist with steps writes name, description, order, Dofus guide, Squarespace link, prerequisites, steps, `completedBy` and `legacy`; a souls checklist the entry fields plus kind, quest and `legacy`; a link entry only the entry fields. Step zones are tracked separately per stepId, so a new zone reaches a step even when Torre edited other fields of the steps, while a zone he changed stays. A rerun with no changes writes nothing. The catalog's `ambience` (`forest` for the Silvestre, `snow` for the Hielos) is written only when the checklist is created; after that the field is Torre's. If Torre has a draft in progress, the change goes to his draft and is not published. A step keeps its stepId through reimports via its `legacyNumber`, and the resolve segments, step references and optional quests are written with those stepIds.

The card art of each entry is imported by a separate command, `pnpm import:checklist-cards` (see [Checklists index](checklists-index.md)).

## Tests

- `tests/unit/checklists-collection.test.ts`: the collection config, including the step tabs.
- `tests/unit/checklist-step-ids.test.ts`: `assignStepIds`.
- `tests/unit/checklist-segment-rules.test.ts`: the validation rules.
- `tests/unit/import-checklist-map.test.ts`, `import-checklist-silvestre.test.ts`, `import-checklist-hielos.test.ts` and `import-checklist-generic.test.ts`: the conversion of the fixtures in `tests/fixtures/silvestre-checklist/` and `tests/fixtures/legacy-checklist/`, and the generic rows.
- `tests/integration/checklists.test.ts`: the collection against Postgres.
- `tests/integration/import-checklists.test.ts`: dry run, creation, idempotent reruns, stepIds surviving changed text, Torre's edits and zones surviving, what the Silvestre and the Hielos bring, the Ocre as a souls checklist, and the entries that are not ported.
- `tests/integration/field-locks.test.ts`: the prerequisite key lock.
