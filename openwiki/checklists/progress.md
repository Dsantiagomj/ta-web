---
type: subsystem
title: Checklist progress engine
description: How checklist progress lives in the browser under one ta-web:progress key, the pure engine that decides which quests and steps are done (generic rows, quests the game finishes on its own, stops a later step finishes) and computes the weighted percentage, souls progress for the Ocre, how weights and quest relations are derived from stored quest data, and the one-time union migration of old silvestre-checklist keys.
tags: [checklists, progress, localstorage, engine, weights, migration]
sources:
  - id: openwiki-source-16a41dc2ee1a57346c5e2241
    resource: repo://src/components/checklist/progress-shared.ts
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
  - id: openwiki-source-88f171d1c78a86ee4646e5fd
    resource: repo://src/lib/checklists/progress/souls.ts
  - id: openwiki-source-af7dedc474ce28c9ff75bf80
    resource: repo://src/lib/checklists/progress/store.ts
  - id: openwiki-source-ede372402a144740e1c5a80c
    resource: repo://src/lib/derive/checklist.ts
  - id: openwiki-source-a0d227ecd2178cbf6eddd683
    resource: repo://src/lib/derive/weights.ts
  - id: openwiki-source-593566627930c1980a42dd12
    resource: repo://tests/unit/checklist-progress-parity.test.ts
  - id: openwiki-source-451433a2fc814a425a9fc7e3
    resource: repo://tests/unit/checklist-progress-todos.test.ts
generated: { by: "claude-code", at: "2026-11-16T11:00:16.891Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-16T11:00:16.891Z
---

# Checklist progress engine

Members do not exist yet, so checklist progress lives in the visitor's browser. Every checklist shares one store, so finishing a quest in one checklist shows it done in every other. The code splits into three parts:

| Part | Where | Runs |
|---|---|---|
| Store | `src/lib/checklists/progress/store.ts` | browser; reads and writes `localStorage` |
| Engine | `src/lib/checklists/progress/engine.ts` (steps), `src/lib/checklists/progress/souls.ts` (souls) | pure functions, no React or DOM |
| Derived data | `src/lib/derive/weights.ts`, `src/lib/derive/checklist.ts` | server, when the page data is built |

`src/components/checklist/progress-ui.ts` binds them to a steps checklist page, and `souls-ui.ts` to a souls checklist page. What both share (safe `localStorage`, the toast, the backup and the dialogs) lives in `progress-shared.ts`, loaded with them and never with the island. Each island loads its UI with `import()` only on its own page (see [Checklist page](checklist-page.md) and [Souls checklist](souls-checklist.md)). The `/checklists` posters reuse the engine to paint a percentage per checklist (see [Checklists index](checklists-index.md)).

## The store

`PROGRESS_KEY` is `ta-web:progress`. Its value is versioned JSON (`v: 1`) with six maps:

| Map | Key | Value |
|---|---|---|
| `quests` | DofusDB quest id | `o`: the objective it is on, or `done`; `by`: which checklist (its id, or its old id) and step finished it |
| `steps` | stepId | `done` |
| `prereqs` | `<checklist id>:<row key>` | time |
| `owned` | the row's key: the DofusDB item id, or `x:<text>` for a row that is not an item, with its alternatives joined by `\|` and `@<sub-group>` when it has one (`7045\|7047`); `#<stepId>` appended when it counts only for one step, `#pre` for a prerequisite item | time |
| `souls` | DofusDB monster id of a soul the visitor has (souls checklists) | time |
| `migrated` | old checklist id (`nebuloso`) | time |

Every entry carries a time (`at`), so it can one day merge with server-side progress by latest timestamp. Quests and items are keyed by DofusDB id and steps by their stable stepId, never by position (see [Checklist data and import](checklist-data.md)).

`parseProgress` drops anything it does not understand and returns an empty store for unreadable JSON or another version. `readProgress` and `writeProgress` wrap every `localStorage` access in `try/catch`: in a private window, with a full quota or blocked storage, the checklist still works and only stops saving. `progress-ui` shows a toast the first time a write fails.

`ownedParts` splits an `owned` key at its last `#`, because a sub-group name may itself contain `#`.

**Backups.** `backupFile` wraps the progress in a file tagged with the app, kind and version; `parseBackup` restores only an intact backup of that exact shape, because a partial one would erase what is there. A backup made before souls existed has no `souls` map and is still accepted. The UI remembers when the last backup was made (`ta-web:backup-at`) and shows its age.

**Other tabs.** `progress-ui` listens to the `storage` event, so what another tab saves (another checklist) appears without a reload.

**The Dofus road.** On a checklist with a Dofus road (the rush), every render also repaints the road through `startRoad` (`road-ui.ts`, see [Checklist page](checklist-page.md#the-dofus-road)). Only a render caused by the visitor's own tick animates it; the first paint and a change from another tab do not.

## The engine

`checklistModel` builds a model from the structure the island receives (`ChecklistIslandData`). Every change function (`setStep`, `setQuest`, `setPrereq`, `setOwned`, `markSteps`, `resetChecklist`) returns a new progress object.

A quest shows as done, in this order of precedence:

1. done in this step, which can be undone here;
2. done in another step: «Hecha en el paso N»;
3. required as finished by another quest that is done: «La pide “Y”»;
4. its step is marked done;
5. done in another checklist and not here: «Hecha en la checklist del Dofus X».

What was recorded under the checklist's old id (`nebuloso`) counts as this checklist.

Two more ways make a quest finished without being stored:

- **Generic rows.** A row any of several quests satisfies (the class quest) is done when any of its quests is done, here or anywhere else (`anyBy`).
- **Quests the game finishes on its own.** A quest in `completedBy` is finished when all the quests that finish it are (`aloneBy`); a ticked generic row counts as its first quest. This is never stored, so undoing one of those quests undoes it too. A step that only counts as done because of such a quest does not count as stored progress.

**Stop and resolve.** Marking a step that holds a «Detente aquí» leaves its quest at the stop objective, never at its last objective (which would finish it); the step that closes it («Aquí se resuelve», or its `closes`) finishes it. The page already applies the old checklist's rules for which stops stay open (`openStops`, see [Checklist page](checklist-page.md)), so the engine receives only those. A stop marked `later` belongs to a later step that carries the quest: closing the step only brings the quest to its stop, and the later step finishes it. A parent quest whose child quest stops in the step waits at the objective where the child starts. A closed step counts as complete when its mandatory quests are finished, except those left for a later step, which only need to have reached their stop. Marking a step marks its mandatory quests and the optional quests it finishes (`optionalDoneBy`), and a step whose mandatory quests are all done becomes marked.

**Items used.** `partUsed` says whether what a step asked for is spent: a step's items when the step is done; the prerequisites' items (step 0) when the prerequisites they are spent on are complete, or all prerequisites when the row names none. The «Objetos» tab uses it to move a row to «Ya utilizados».

**Percentage.** `progressPct` adds, for each marked step, its weight, and for each unmarked step the share of each finished quest. It rounds to one decimal and clamps: 100 only when every step is marked, 0 only with nothing done, otherwise between 0.1 and 99.9. `tests/unit/checklist-progress-parity.test.ts` checks that the real Nebuloso gives the same percentage as the old `silvestre-checklist` calculation for the same progress.

**Reset.** `resetChecklist` erases only what the visitor picks for this checklist (its steps and the quests it finished, its prerequisites, its items) and never touches other checklists.

## Souls progress

A souls checklist (the Ocre) keeps the souls the visitor has in `souls`, by monster id, shared with any other souls checklist (`src/lib/checklists/progress/souls.ts`):

- `setSoul` adds or removes one soul;
- `soulsPct` is the share of this checklist's souls the visitor has, with one decimal, 100 only with all of them and 0 only with none;
- `resetSouls` removes only this checklist's souls;
- `migrateSouls` brings once what the old Ocre stored in `cosecha:done`, by union, records `cosecha` in `migrated`, and never touches the old key. It keeps souls of monsters the checklist does not have yet; `soulsDone` counts only the checklist's own.

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

## Migrating old steps progress

Visitors of the old `silvestre-checklist` site may still have its keys in the same browser. `legacy-keys.ts` rides with the progress UI and only answers whether any old key from a checklist not yet migrated exists: the checklist's own keys (`nebuloso:done` and the other per-checklist keys), its classic checklist key (`dofus_nebuloso_clean_v1`), the shared key (`dofus-checklists:shared`), and the quest and item keys of the other old checklists (`silvestre`, `hielos`, `global`, `nebuloso` and the rush's `todos`), so the rush picks up what was ticked in the old rush and in the other old checklists. Only then does the UI load the migration (`legacy.ts`) with `import()`.

`migrateLegacy` runs once per old source and records it in `migrated`. It adds by union: it never deletes or changes the old keys, and never removes or undoes anything already in `ta-web:progress`. For the checklist on the page it applies the old guide-version renumbering (`previousSteps`), the old quest model (`questPos`), item keys that moved (`ownedMoves`), the classic checklist, done steps by old number (`legacyNumber`), quest objectives, prerequisites and items (`#n` becomes `#<stepId>`). From other old checklists it brings only quests and items, because their steps cannot map without their structure; a quest from another checklist is never allowed to overwrite what this one has.

Old generic rows (`clase`, `alt:…`) map to the key of this checklist's row, the negated id of its first quest, through `legacy.genericQuests`. Old item keys keep their shape, alternatives (`7045|7047`) and sub-groups (`…@mision opcional`) included, because ta-web's rows use the same keys; a composite key is brought only when it is a row of this checklist. A step part becomes its stepId and the prerequisites' part (old step 0) becomes `#pre`.

## Tests

- `tests/unit/checklist-progress.test.ts` and `tests/unit/checklist-progress-silvestre.test.ts`: the engine, including the Silvestre's stops, generic rows and quests that finish on their own.
- `tests/unit/checklist-souls-progress.test.ts`: souls progress and its migration.
- `tests/unit/checklist-progress-parity.test.ts`: the same percentage as the old calculation on the real Nebuloso.
- `tests/unit/checklist-progress-todos.test.ts`: quests finished in the Silvestre, the Hielos and the Nebuloso show done in the rush, which repeats them, including what was stored under the old `nebuloso` id.
- `tests/unit/checklist-weights.test.ts` and `tests/unit/derive-checklist.test.ts`: weights and quest relations.
- `tests/unit/checklist-legacy.test.ts` and `tests/unit/legacy-objective-indices.test.ts`: the migration, against fixtures in `tests/fixtures/legacy-checklist/`.
- `tests/unit/checklist-backup-age.test.ts`: the backup age text.
- `tests/e2e/checklist-progreso.spec.ts` and `tests/e2e/checklist-migracion.spec.ts`: progress and migration in a real browser.
