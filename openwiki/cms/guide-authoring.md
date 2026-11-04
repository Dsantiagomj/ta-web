---
type: workflow
title: Writing a quest guide
description: How Torre writes a quest guide in the Payload panel by picking the DofusDB quest first, which empty fields the quest fills (title, slug, SEO and the summary) and in which format, how the live form fill and the save hook share the same pure rules, what the note under each summary field says, and why the copied values do not follow later DofusDB changes.
tags: [quest-guides, payload, admin, dofusdb, autofill, workflow]
sources:
  - id: openwiki-source-3fc9f0484081f9ab441d6219
    resource: repo://scripts/import/load-quest-guides.ts
  - id: openwiki-source-f6a77b87c2cce3530ab6695f
    resource: repo://src/collections/quest-guide-autofill.ts
  - id: openwiki-source-7a2723ea85824e431ff5eb54
    resource: repo://src/collections/QuestGuides.ts
  - id: openwiki-source-5e8f77fd185a0f97b7ae1c42
    resource: repo://src/components/quest-guide-admin/linked-quest.ts
  - id: openwiki-source-96b94ee077b0d0a0987ef203
    resource: repo://src/components/quest-guide-admin/QuestAutofill.tsx
  - id: openwiki-source-0a4faad5eab8d765028627d7
    resource: repo://src/components/quest-guide-admin/SummaryNote.tsx
  - id: openwiki-source-50dfb7dff241d2a5f45927cb
    resource: repo://src/lib/dofusdb/criterion.ts
  - id: openwiki-source-4b87b2bd0648fe28c52dc5e5
    resource: repo://src/lib/guides/autofill.ts
  - id: openwiki-source-4afd1b9384e1b61783854c50
    resource: repo://src/lib/guides/form-fill.ts
  - id: openwiki-source-d5cdfb9f4d8e25639ff82c78
    resource: repo://src/lib/guides/format.ts
  - id: openwiki-source-2f2b90aba3af4142e443ba84
    resource: repo://src/lib/guides/strings.ts
  - id: openwiki-source-89155127340f422ef94e950a
    resource: repo://src/lib/guides/summary.ts
  - id: openwiki-source-cd6b88c691322659e364fdbf
    resource: repo://tests/integration/quest-guides-autofill.test.ts
  - id: openwiki-source-bb0747d86ef5cecbc4d85241
    resource: repo://tests/unit/guide-autofill.test.ts
  - id: openwiki-source-a245227c3cb5565abdfcd27a
    resource: repo://tests/unit/guide-form-fill.test.ts
  - id: openwiki-source-85e63acb1252624b63be77af
    resource: repo://tests/unit/guide-summary.test.ts
  - id: openwiki-source-1970468d3fcc651d5071b312
    resource: repo://tests/unit/quest-guides-collection.test.ts
generated: { by: "claude-code", at: "2026-11-04T21:10:46.028Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-04T21:10:46.028Z
---

# Writing a quest guide

A quest guide starts from its DofusDB quest. `quest`, labelled "Misión de DofusDB", is the first field of the guide form, in the main area. It is an optional single relationship to `quests`: a guide links one quest or none. Once Torre picks a quest, every empty field the quest can answer is filled: the title, the slug, the two SEO fields and the summary (prerequisites, the "Necesitarás" item list, rewards, start NPC and coordinates). What is left to write is the guide itself: the body blocks, the "Necesitarás" notes, and anything DofusDB does not give.

The fill happens twice with the same rules: live in the form when the quest is picked, and again on the server when the guide is saved. Both only fill **empty** fields. A value that is already there, typed by Torre or brought by the Squarespace import, is never overwritten.

The collection schema itself (field types, validators, access) is in [Collections and access](collections.md#quest-guides-editorial-guides-with-drafts).

## The flow in the panel

1. Create a guide under "Guías" and pick the quest in "Misión de DofusDB". The description under the field reads "Elige primero la misión de DofusDB de la guía, solo una: rellena el título, el slug, el SEO y el resumen. Luego solo te queda escribir la guía."
2. The form fills the empty title, slug, SEO and summary fields right away, without saving, and marks the form as modified.
3. Under each summary field, a note says where its value comes from (see [The notes under the summary](#the-notes-under-the-summary)). Torre edits whatever reads wrong; nothing typed is replaced later.
4. Write the "Necesitarás" notes and the body. See [Guide body blocks](blocks.md).
5. Save a draft or publish. The save hook fills anything still empty, such as a field Torre cleared on purpose.

A guide links a single quest, and that quest feeds the fill and the notes. One quest per guide fits the existing content: of Torre's 1,272 Squarespace guides, 1,234 match exactly one DofusDB quest, 29 match none and 9 are ambiguous, and none matches more than one. The [Squarespace import](../data/squarespace-import.md#loading-into-payload) leaves a guide that names several quest IDs unlinked for Torre to choose.

A guide with neither a title nor a quest cannot be saved, not even as a draft. The panel shows "Escribe un título o elige una misión de DofusDB para sacarlo de ella."

## What the quest fills

All rules are pure functions in `src/lib/guides/`, without Payload, so the server hook, the panel components and the importer share them:

| Module | Role |
|---|---|
| `strings.ts` | Every Spanish text: summary line formats, SEO templates, panel descriptions and notes. A second language would mean translating this module |
| `format.ts` | Torre's summary format: thousands, rewards, prerequisites, the needed items |
| `summary.ts` | `summaryFromQuest`, `summaryToFill`, `applySummaryFill` and `summaryNote` |
| `autofill.ts` | Title, slug and SEO: `autofillFromQuest`, `slugFromName`, `availableSlug`, `seoFromQuest`, `linkedQuestId` (the quest's ID, whether the field holds an ID or a populated document) |
| `form-fill.ts` | The live form fill: `plannedFormFill` and `stillEmpty`, read through a field-path reader so they run without React |

### Title, slug and SEO

| Field | Filled with |
|---|---|
| `title` | The quest name |
| `slug` | `slugFromName(name)`: accents stripped (NFD), lowercase, every run of other characters turned into one hyphen, edge hyphens removed. "Intoxicación profunda" gives `intoxicacion-profunda`, "¡M.O. Pardy!" gives `m-o-pardy`. A name with no letter or digit gives `guia` |
| `seo.metaTitle` | `<name>: guía de la misión de Dofus` |
| `seo.metaDescription` | `Guía paso a paso de la misión <name> de Dofus, de nivel <levelMin>: requisitos, recompensas (<XP> XP) y cómo completarla.` The level and XP parts are dropped when missing. Cut at a word boundary with `…` so it never exceeds 160 characters |

If the slug is taken by another guide, `availableSlug` tries `-2`, `-3`… until one is free. The guide being edited does not count as a collision. A quest with an empty name fills nothing.

Guides migrated from Squarespace already have a slug, so they keep their old URL.

### The summary

`summaryFromQuest` reads the quest as loaded at `depth: 1`, so item and prerequisite names are populated. The text format follows Torre's guides: one fact per line, each line ending in a full stop unless it already ends in `.`, `!`, `?` or `…`, and thousands separated by a plain space (`24 316`).

| Field | From DofusDB | Example |
|---|---|---|
| `prerequisites` | "Nivel mínimo N." when the start criterion always requires `PL>M` (N = M + 1), then the name of each prerequisite quest. "Always requires" means the `PL>` term is joined with `&` at the top level or inside `&`-only brackets, as read by the shared criterion parser `requiredTerms` (see [DofusDB game data refresh](../data/dofusdb-refresh.md#prerequisite-rule)): `PL>189&Qf=123` gives level 190, but `PL>189\|Qf=123` and `(PL>50\|PL>60)&Qf=1` give no level. The `prerequisites` relation holds only the mandatory quests (see [DofusDB game data refresh](../data/dofusdb-refresh.md#prerequisite-rule)) | `Nivel mínimo 190.`<br>`Toma de conciencia.` |
| `rewards` | Experience, kamas, then `N x Item` lines with the items in the **reverse** of DofusDB's order, as Torre lists them. Zero amounts are skipped | `24 316 XP.`<br>`552 kamas.`<br>`2 x Cuero de miserata strubiense.`<br>`2 x Colmillos de ratas.` |
| `needs.items` | The quest's needed items with their quantities, in DofusDB's order, **without quest items** (`superTypeId === 14`): the game hands those out during the quest. Monsters and map walking do not fit an item list and are left out | rows `{ item, quantity }` |
| `startNpc`, `startX`, `startY` | The first start position. DofusDB can give one per class | `Kerubim Crepin`, `3`, `-17` |

A relation that is not populated has no name and is skipped rather than shown as an ID. A field DofusDB gives nothing for stays empty.

"Empty" means `null`, `undefined`, or text with only spaces. `0` is a valid coordinate and counts as written. The item list counts as empty only when it has no rows; a list with any row is left alone. `needs.notes` is never filled: it holds what an item list cannot express, such as "1 x Combate (solo)" or "Literalmente nada".

The output matches Torre's own pages. For El cazador cazado (1977) and Seis pies bajo tierra (1976), `rewardsText` gives exactly the rewards the Squarespace import read from Torre's guides, and the 1977 prerequisites and the 1433 minimum level match too. The unit tests compare against those parsed pages.

## Two places, one rule set

### Live in the form: `QuestAutofill`

`src/components/quest-guide-admin/QuestAutofill.tsx` is the `Description` component of the `quest` field. It watches the selected quest ID through `useFormFields`. When the ID changes:

1. It loads the quest from the REST API, `GET <serverURL><api>/quests/<id>?depth=1` with the session cookie, through `fetchLinkedQuest` in `linked-quest.ts`. Requests are cached per URL while the page is open; a failed one is dropped from the cache so the next attempt retries.
2. It plans the fill with `plannedFormFill(read, quest)`, where `read` is the form's `getDataByPath`. The plan runs `autofillFromQuest` and `summaryToFill` on the current form values and returns the field paths to fill with their values (blank values dropped) plus the rows for an empty "Necesitarás" list (`summary.needs.items`, exported as `NEEDS_PATH`).
3. For the planned slug it calls `availableSlug` with `slugTaken`, which queries `quest-guides` by slug and ignores the guide's own ID. If that query fails it answers "not taken" and lets the server reject a duplicate.
4. It re-reads the form with `stillEmpty(planned, read)`: only planned fields that are still blank are kept, and the needs rows only when the list still has no rows. Torre can type while the slug check is in flight, and whatever was typed in that window stays.
5. It dispatches an `UPDATE` for each remaining value and adds one `summary.needs.items` row per remaining needed item with its item and quantity, then marks the form modified if it filled anything.

The quest the guide was opened with fills nothing: only a change Torre makes in the form triggers it. If Torre picks another quest while a request is in flight, the stale result is discarded.

`plannedFormFill` and `stillEmpty` use the same "blank" rule as the rest of the fill: `null`, `undefined` or whitespace-only text is blank, and a number (such as a `0` coordinate) is written. A needs list that Payload reports as a row count instead of an array is read as that many empty rows.

### On save: `fillFromQuest`

`src/collections/quest-guide-autofill.ts` is the collection's `beforeValidate` hook. It runs on every create and update through any API, the importer included. It builds the current values from `data`, falling back to the saved document for fields `data` does not carry (an update may send only what changed; an explicit `null` in `data` wins). It loads the linked quest with `payload.findByID` at `depth: 1`, fills the empty title, slug and SEO fields, checks the slug against other guides with `payload.count`, and merges the summary fill into the saved and sent summary, keeping the needs notes.

The hook is the backstop: it covers guides created outside the panel, a form where the client fill never ran, and fields cleared before saving. After the fill, if the title is still empty it throws a `ValidationError` on `title`, because Payload saves drafts without field validation.

## The notes under the summary

`src/components/quest-guide-admin/SummaryNote.tsx` is the `Description` of each fillable summary field and of the `needs.items` list. It loads the linked quest with `useLinkedQuest` (same cached request) and renders `summaryNote(state, field, value)`, keeping line breaks so multi-line rewards stay readable:

| Situation | Note |
|---|---|
| No quest picked | Sin misión de DofusDB: escribe tú este dato. |
| Quest loading / failed | Cargando los datos de DofusDB… / No se pudieron cargar los datos de DofusDB. |
| Value equals DofusDB's | Viene de DofusDB. Puedes cambiarlo. |
| Value differs | Cambiado. DofusDB da: `<DofusDB's value>` |
| Field empty, DofusDB has a value | Vacío: al guardar se rellena con lo que da DofusDB: `<value>` |
| DofusDB gives nothing, field empty | DofusDB no da nada aquí; escríbelo tú. |
| DofusDB gives nothing, field written | Escrito por ti: DofusDB no da nada aquí. |

Text compares after trimming. The item list compares as a set of item and quantity pairs: row order does not matter, and a populated item counts as its ID. For the list, the DofusDB value shown is one `N x Item.` line per item.

## Trade-off: values are copied

The fill copies values into the guide. Later changes to the quest in DofusDB, brought in by `pnpm data:quests`, do not update existing guides on their own. That keeps Torre's edits safe and the guide stable, at the cost of drift: when DofusDB changes, the note under the affected field turns into "Cambiado. DofusDB da: …" and shows the new value, and Torre decides whether to take it. Emptying a field and saving takes DofusDB's current value again.

## Importer

The Squarespace importer runs the same `summaryToFill` and `applySummaryFill` before comparing a converted guide with the stored one, so the stored guide (filled by the hook) and the converted one compare equal and a rerun saves no new version. Squarespace's "Necesitarás" text lands in `needs.notes`. See [Squarespace import](../data/squarespace-import.md#loading-into-payload).

## Tests

- `tests/unit/guide-summary.test.ts` builds linked quests from the real DofusDB fixtures through `mapQuest` and checks `formatThousands`, `rewardsText` and `prerequisitesText` against Torre's parsed Squarespace pages (1977, 1976, 1433), `requiredLevel` (including that a `PL>` among `|` alternatives gives no level), `neededItems` (quest items dropped by supertype 14 whatever their type, DofusDB order for quest 2420's six Primordial Dofus), `summaryToFill` (never touching written fields, `0` as a coordinate, a filled or empty needs list), `applySummaryFill` keeping the notes, and every `summaryNote` state for text fields and the list.
- `tests/unit/guide-form-fill.test.ts` checks that `plannedFormFill` plans every empty field from quest 1977's data and nothing for fields already written, and that `stillEmpty` drops a title, a rewards text and a needs list Torre typed during the slug check while still filling the slug and the start NPC, treating whitespace-only text and a list with no rows as empty.
- `tests/unit/guide-autofill.test.ts` covers `slugFromName` on Torre's slugs and odd names, `availableSlug` suffixes, `seoFromQuest` with and without level and XP and the 160-character cut, `autofillFromQuest` never touching written fields, and `linkedQuestId` reading an ID or a populated document and returning `null` without a quest.
- `tests/integration/quest-guides-autofill.test.ts` saves guides through the local API as a panel user: a guide with only the quest gets title, slug, SEO and the full summary (the quest item left out of the needs list, notes empty); a second one gets `-2`; written title, slug, SEO, summary fields and needs lists stay; a guide without title and quest is rejected with the Spanish message; editing an imported guide keeps its Squarespace slug and SEO title; and a summary field emptied on update is filled again.

## Related pages

- [Collections and access](collections.md)
- [Payload CMS configuration](payload-config.md)
- [DofusDB game data refresh](../data/dofusdb-refresh.md)
- [Squarespace import](../data/squarespace-import.md)
- [Test suites](../testing/test-suites.md)
