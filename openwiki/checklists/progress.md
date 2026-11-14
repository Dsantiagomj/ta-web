---
type: subsystem
title: Checklist progress engine
description: How checklist progress lives in the browser under one ta-web:progress key, the pure engine that decides which quests and steps are done and computes the weighted percentage, how weights and quest relations are derived from stored quest data, and the one-time union migration of old silvestre-checklist keys.
tags: [checklists, progress, localstorage, engine, weights, migration]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-14T11:00:46.827Z
sources:
  - id: openwiki-source-7d0703f319f0f8dba577fd0a
    resource: repo://src/components/checklist/progress-ui.ts
  - id: openwiki-source-0cb986b9dee2806b719ee720
    resource: repo://src/lib/checklists/page.ts
  - id: openwiki-source-f4964b346e811eaee257007f
    resource: repo://src/lib/checklists/progress/engine.ts
  - id: openwiki-source-0955f7688eb9b939b9be90b1
    resource: repo://src/lib/checklists/progress/legacy-keys.ts
  - id: openwiki-source-4a21d02260a6efada9e88ad1
    resource: repo://src/lib/checklists/progress/legacy.ts
  - id: openwiki-source-af7dedc474ce28c9ff75bf80
    resource: repo://src/lib/checklists/progress/store.ts
  - id: openwiki-source-ede372402a144740e1c5a80c
    resource: repo://src/lib/derive/checklist.ts
  - id: openwiki-source-a0d227ecd2178cbf6eddd683
    resource: repo://src/lib/derive/weights.ts
  - id: openwiki-source-593566627930c1980a42dd12
    resource: repo://tests/unit/checklist-progress-parity.test.ts
generated: { by: "claude-code", at: "2026-11-14T11:00:46.827Z" }
---

# Checklist progress engine

Members do not exist yet, so checklist progress lives in the visitor's browser. Every checklist shares one store, so finishing a quest in one checklist shows it done in every other. The code splits into three parts:

| Part | Where | Runs |
|---|---|---|
| Store | `src/lib/checklists/progress/store.ts` | browser; reads and writes `localStorage` |
| Engine | `src/lib/checklists/progress/engine.ts` | pure functions, no React or DOM |
| Derived data | `src/lib/derive/weights.ts`, `src/lib/derive/checklist.ts` | server, when the page data is built |

`src/components/checklist/progress-ui.ts` binds them to the server-rendered page. The checklist island loads it with `import()` only on checklist pages (see [Checklist page and index](checklist-page.md)).

## The store

`PROGRESS_KEY` is `ta-web:progress`. Its value is versioned JSON (`v: 1`) with five maps:

| Map | Key | Value |
|---|---|---|
| `quests` | DofusDB quest id | `o`: the objective it is on, or `done`; `by`: which checklist (its id, or its old id) and step finished it |
| `steps` | stepId | `done` |
| `prereqs` | `<checklist id>:<row key>` | time |
| `owned` | DofusDB item id, or `x:<text>` for a row that is not an item; `#<stepId>` appended when it counts only for one step | time |
| `migrated` | old checklist id (`nebuloso`) | time |

Every entry carries a time (`at`), so it can one day merge with server-side progress by latest timestamp. Quests and items are keyed by DofusDB id and steps by their stable stepId, never by position (see [Checklist data and import](checklist-data.md)).

`parseProgress` drops anything it does not understand and returns an empty store for unreadable JSON or another version. `readProgress` and `writeProgress` wrap every `localStorage` access in `try/catch`: in a private window, with a full quota or blocked storage, the checklist still works and only stops saving. `progress-ui` shows a toast the first time a write fails.

**Backups.** `backupFile` wraps the progress in a file tagged with the app, kind and version; `parseBackup` restores only an intact backup of that exact shape, because a partial one would erase what is there. The UI remembers when the last backup was made (`ta-web:backup-at`) and shows its age.

**Other tabs.** `progress-ui` listens to the `storage` event, so what another tab saves (another checklist) appears without a reload.

## The engine

`checklistModel` builds a model from the structure the island receives (`ChecklistIslandData`). Every change function (`setStep`, `setQuest`, `setPrereq`, `setOwned`, `markSteps`, `resetChecklist`) returns a new progress object.

A quest shows as done, in this order of precedence:

1. done in this step, which can be undone here;
2. done in another step: «Hecha en el paso N»;
3. required as finished by another quest that is done: «La pide “Y”»;
4. its step is marked done;
5. done in another checklist and not here: «Hecha en la checklist del Dofus X».

What was recorded under the checklist's old id (`nebuloso`) counts as this checklist.

**Stop and resolve.** Marking a step that holds a «Detente aquí» leaves its quest at the stop objective, never at its last objective (which would finish it); the step that closes it («Aquí se resuelve») finishes it. A parent quest whose child quest stops in the step waits at the objective where the child starts. Marking a step marks its mandatory quests, and a step whose mandatory quests are all done becomes marked.

**Percentage.** `progressPct` adds, for each marked step, its weight, and for each unmarked step the share of each finished quest. It rounds to one decimal and clamps: 100 only when every step is marked, 0 only with nothing done, otherwise between 0.1 and 99.9. `tests/unit/checklist-progress-parity.test.ts` checks that the real Nebuloso gives the same percentage as the old `silvestre-checklist` calculation for the same progress.

**Reset.** `resetChecklist` erases only what the visitor picks for this checklist (its steps and the quests it finished, its prerequisites, its items) and never touches other checklists.

## Derived data

Nothing about weight or quest relations is written by hand. `checklistView` (`src/lib/checklists/page.ts`) derives it on the server from stored quest data, inside the cached page read:

**Weights** (`src/lib/derive/weights.ts`), as the old `build_weights.py` did:

- A quest is worth its level times the square root of its objective count (at least one): the level says how hard, the objectives how long, and the root stops a very long quest from swallowing the percentage.
- The level is Torre's «Nivel mínimo» or «Nivel recomendado» from the prerequisites of his quest guide when present (`torreLevel`), else DofusDB's `levelMin`, else 1.
- Optional and take-only quests are worth 0 in their step. A quest repeated in one step counts once.
- A mandatory quest that several steps carry splits its points equally between them.
- A step weighs the sum of its quests, at least 1 (a step without quests weighs as a level 1 quest).

**Quest relations** (`src/lib/derive/checklist.ts`), replacing the old `build_quests_js.py`:

- `questParents`: quests that start inside another quest of the same step, read from the child's start criteria (`Qa=1609&Qo>9469` starts in quest 1609 after objective 9469). A criterion with `|` makes no child, and a take-only quest is never a parent in that step.
- `routePrerequisites`: what each quest of the route needs finished first, following prerequisites through quests inside or outside the route and keeping only those on the route.

## Migrating old progress

Visitors of the old `silvestre-checklist` site may still have its keys in the same browser. `legacy-keys.ts` rides with the progress UI and only answers whether any old key from a checklist not yet migrated exists: the checklist's own keys (`nebuloso:done` and the other per-checklist keys), its classic checklist key (`dofus_nebuloso_clean_v1`), the shared key (`dofus-checklists:shared`), and the quest and item keys of the other old checklists (`silvestre`, `hielos`, `global`). Only then does the UI load the migration (`legacy.ts`) with `import()`.

`migrateLegacy` runs once per old source and records it in `migrated`. It adds by union: it never deletes or changes the old keys, and never removes or undoes anything already in `ta-web:progress`. For the checklist on the page it applies the old guide-version renumbering (`previousSteps`), the old quest model (`questPos`), item keys that moved (`ownedMoves`), the classic checklist, done steps by old number (`legacyNumber`), quest objectives, prerequisites and items (`#n` becomes `#<stepId>`). From other old checklists it brings only quests and items, because their steps cannot map without their structure; a quest from another checklist is never allowed to overwrite what this one has.

## Tests

- `tests/unit/checklist-progress.test.ts`: the engine.
- `tests/unit/checklist-progress-parity.test.ts`: the same percentage as the old calculation on the real Nebuloso.
- `tests/unit/checklist-weights.test.ts` and `tests/unit/derive-checklist.test.ts`: weights and quest relations.
- `tests/unit/checklist-legacy.test.ts` and `tests/unit/legacy-objective-indices.test.ts`: the migration, against fixtures in `tests/fixtures/legacy-checklist/`.
- `tests/unit/checklist-backup-age.test.ts`: the backup age text.
- `tests/e2e/checklist-progreso.spec.ts` and `tests/e2e/checklist-migracion.spec.ts`: progress and migration in a real browser.
