---
type: workflow
title: DofusDB game data refresh
description: How pnpm data:quests fills the read-only quests, items and monsters collections from the public DofusDB API (every quest, the whole item catalog and the monsters quests name), how the client retries failed requests, how quests, prerequisites, level-200 rewards and needs are derived, why a rerun changes nothing, how writes run several at a time under DOFUSDB_WRITE_CONCURRENCY, and how to run it without touching production by accident.
tags: [dofusdb, game-data, quests, items, monsters, rewards, payload, scripts, concurrency, retries]
sources:
  - id: openwiki-source-5f5b95b3d6a215fa02ceb945
    resource: repo://.env.example
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-2615540ec7553288b52f775d
    resource: repo://docs/legacy/infra.md
  - id: openwiki-source-d2cae621c91b518c9e5f5e6d
    resource: repo://docs/legacy/plan.md
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-63cbcc482c18e4f9ce5d0888
    resource: repo://scripts/refresh-quests.ts
  - id: openwiki-source-30fb9110f08cd9302abaca1a
    resource: repo://src/collections/Items.ts
  - id: openwiki-source-7c84c63987b05696c25fe759
    resource: repo://src/collections/Monsters.ts
  - id: openwiki-source-f6a77b87c2cce3530ab6695f
    resource: repo://src/collections/quest-guide-autofill.ts
  - id: openwiki-source-7a2723ea85824e431ff5eb54
    resource: repo://src/collections/QuestGuides.ts
  - id: openwiki-source-6fb0b5f4df5054d4e6c27dc0
    resource: repo://src/lib/concurrency.ts
  - id: openwiki-source-2ad419cae2f45e97a3ca23d7
    resource: repo://src/lib/db/database-url.ts
  - id: openwiki-source-7b3f34dd948192f72aa88058
    resource: repo://src/lib/dofusdb/client.ts
  - id: openwiki-source-54227c78b7c2e57bc6f3d29b
    resource: repo://src/lib/dofusdb/fetch-quest-data.ts
  - id: openwiki-source-1addf1a05f8d53fe7dea95d6
    resource: repo://src/lib/dofusdb/map-items-monsters.ts
  - id: openwiki-source-593d2c966d67e453d0429c23
    resource: repo://src/lib/dofusdb/map-quest.ts
  - id: openwiki-source-be0176b7862d0ea0cc7e2df7
    resource: repo://src/lib/dofusdb/quest-needs.ts
  - id: openwiki-source-018693ba041711bee3e7aaeb
    resource: repo://src/lib/dofusdb/quest-rewards.ts
  - id: openwiki-source-4ce5bfd40fc86e2e8680d71f
    resource: repo://src/lib/dofusdb/refresh-quests.ts
  - id: openwiki-source-d5cdfb9f4d8e25639ff82c78
    resource: repo://src/lib/guides/format.ts
  - id: openwiki-source-89155127340f422ef94e950a
    resource: repo://src/lib/guides/summary.ts
  - id: openwiki-source-2c42ff828c6d8e213a2f7416
    resource: repo://src/payload.config.ts
  - id: openwiki-source-f771f456156fbf6bde7862c2
    resource: repo://tests/fixtures/dofusdb/quests.json
  - id: openwiki-source-cbffdb2343060c99a7477cfa
    resource: repo://tests/integration/refresh-quests.test.ts
  - id: openwiki-source-3fc2c02c456e1e51768c4446
    resource: repo://tests/unit/concurrency.test.ts
  - id: openwiki-source-1843fcebd4e1a5a852fbfef6
    resource: repo://tests/unit/dofusdb-client.test.ts
  - id: openwiki-source-5c15ceedf8492ffd0f430eca
    resource: repo://tests/unit/dofusdb-fetch-quest-data.test.ts
  - id: openwiki-source-1a4d893bc4ddfe68ab2aff11
    resource: repo://tests/unit/dofusdb-map-quest.test.ts
  - id: openwiki-source-5168230ef1521672cbb49873
    resource: repo://tests/unit/dofusdb-quest-needs.test.ts
  - id: openwiki-source-3da4b4a0b727301694dfca60
    resource: repo://tests/unit/dofusdb-quest-rewards.test.ts
  - id: openwiki-source-e73350ef868f2379d51909ed
    resource: repo://tests/unit/dofusdb-write-concurrency.test.ts
generated: { by: "claude-code", at: "2026-11-04T20:02:15.357Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-04T20:15:10.008Z
---

# DofusDB game data refresh

Game data in ta-web (quests, items and monsters today; achievements, NPCs, maps and the rest later) comes from DofusDB, is read-only in the panel and is refreshed by a script. Torre picks it from guides through relationship fields (AGENTS.md). The quest refresh is the first of these scripts and the only writer of the `quests`, `items` and `monsters` collections described in [Collections and access](../cms/collections.md#quests-dofusdb-game-data).

Nothing loads from DofusDB at runtime. The script copies the data into our Postgres; the site reads only that copy. Item and monster icons are stored as DofusDB image IDs only, never fetched when a page is served.

## Pipeline

```
pnpm data:quests
  └─ scripts/refresh-quests.ts        DOFUSDB_WRITE_CONCURRENCY, getPayload, timing, exit code
       ├─ createDofusDbClient({ log })  src/lib/dofusdb/client.ts (retries, timeout)
       ├─ fetchQuestData(client)      src/lib/dofusdb/fetch-quest-data.ts
       │    quests (all pages) → NPCs and maps named in start positions
       │                       → monsters named in needs
       │    items (all pages, only the stored fields)
       └─ refreshQuests(payload, data, { concurrency })
                                      src/lib/dofusdb/refresh-quests.ts
            mapItem / mapMonster      src/lib/dofusdb/map-items-monsters.ts
            items, then monsters: create/update by dofusId
            (each step: mapWithConcurrency, src/lib/concurrency.ts)
            mapQuest per quest        src/lib/dofusdb/map-quest.ts
              questRewards            src/lib/dofusdb/quest-rewards.ts
              questNeeds              src/lib/dofusdb/quest-needs.ts
            pass 1: create/update quest fields by dofusId
            pass 2: link prerequisites by Payload ID
```

`src/lib/dofusdb/types.ts` types only the fields the pipeline reads from DofusDB rows (`RawQuest` with its `need` summary and `steps`, `RawQuestStep`, `RawQuestReward`, `RawQuestObjective`, `RawItem`, `RawMonster`, `RawNpc`, `RawMapPosition`, and `LocalizedText` for the `{ es, fr, en, de, pt }` texts) and the `MappedQuest`, `MappedItem` and `MappedMonster` shapes written to the collections.

### Client

`createDofusDbClient` wraps the public API at `https://api.dofusdb.fr`, a Feathers API paged with `$limit` and `$skip`.

- `fetchAll(collection, { select })` requests pages of 50 (DofusDB never returns more per request) until `skip + 50` reaches the reported `total`. An empty page also stops the loop, whatever the total says. With `select`, each page request adds one Feathers `$select[]=<field>` per field, so DofusDB returns only those fields instead of the whole row.
- `fetchByIds(collection, ids)` drops duplicate IDs and requests them in chunks of 40 with `id[$in][]=…` filters, which keeps URLs short and each answer inside one page. IDs that do not exist simply do not come back.
- It waits 50 ms between requests, so it does not load a free API, and sends a generic `User-Agent: ta-web/datos-del-juego`.
- Each request has a 30 s timeout (`AbortSignal.timeout`), so a hung connection fails instead of waiting for minutes.
- `fetch`, `sleep`, `baseUrl`, `log` and `random` are injectable, so the tests never reach the network or wait for real.

#### Retries

A full run makes several hundred requests, mostly for the item catalog, and one network hiccup used to fail the whole run. Every request now goes through a retry loop in `get`:

- **Retried**: network errors (the fetch throws, including a timeout or a failure while reading the body) and HTTP 429, 502, 503 and 504. These usually clear by themselves.
- **Not retried**: any other non-2xx answer, such as 400, 404 or 500. It throws at once.
- **Up to 4 retries** (5 attempts in total). The wait doubles from 0.5 s: 0.5, 1, 2 and 4 s, each plus up to 25 % random jitter so retries do not line up.
- **`Retry-After`**: on a 429, a `Retry-After` header in seconds or as an HTTP date replaces the computed wait, capped at 60 s so an outsized value cannot stall the script. A missing or unreadable header falls back to the backoff.
- **Final error**: after the last attempt, or on a non-retried status, the client throws `DofusDB respondió <status> <statusText> en <url> tras <n> intentos` or, for a network failure, `DofusDB no respondió en <url> tras <n> intentos: <error>` with the original error as `cause`. The message names the URL and the number of attempts.
- **Logging**: the optional `log` callback gets one Spanish line per retry, such as `DofusDB respondió 503 … en <url>; reintento 1 de 4 en 0.6 s`. By default nothing is logged; `pnpm data:quests` passes `console.log`.

### Fetching

`fetchQuestData` loads every quest, collects the distinct `npcId` and `mapId` values from their `startPosition` entries, and fetches only those NPCs (`npcs`) and maps (`map-positions`). It runs `questNeeds` on each quest and fetches by ID only the `monsters` named in needs. It returns `{ quests, npcs, mapPositions, items, monsters }`.

Items are different: `fetchQuestData` downloads the **whole item catalog** with `fetchAll('items', { select })`, not only the items quests name in rewards or needs, because Torre may need any item in a guide. A full run brings about 2,000 quests, 1,000 monsters and 21,500 items (README). The select list is `id`, `name`, `level`, `typeId`, `iconId` and `type`: only the fields the collection stores, plus `type`, the item type object DofusDB attaches through `typeId`, which carries the supertype. The whole row is roughly eight times heavier; with the select a page of 50 items is about 44 KB instead of about 375 KB.

Because items no longer come from quest references, a reward or need item that is missing from the catalog is still dropped and counted as a missing item when quests are written.

There is no index on the item name. Picking an item by name in the panel runs a case-insensitive `like` (`ilike` in Postgres) over the whole table; at about 21,500 rows that full scan took about 2.3 ms locally, so an index was not worth adding.

### Mapping a quest

`mapQuest(raw, lookups)` turns one DofusDB quest into the collection's fields; `indexLookups` builds the NPC and map lookup maps by ID.

- **Name**: Spanish, falling back to French (DofusDB's original language), and to `Misión <id>` when both are missing, because `name` is required.
- **Levels and category**: `levelMin`, `levelMax` and `categoryId` copied as is, `null` when absent.
- **Start positions**: one entry per DofusDB start position with `npcId`, the NPC's Spanish (or French) name, `mapId` and the map's `posX`/`posY` as `x`/`y`. A missing NPC or map leaves those values `null`; mapping never fails over a missing lookup.
- **`startCriterion`**: the raw DofusDB criterion string, stored unchanged (`null` when empty) so later derived data can reread it.
- **`rewards` and `needs`**: computed by `questRewards` and `questNeeds`, described below. They carry DofusDB item and monster IDs; the refresh swaps them for Payload IDs when it writes.

`mapItem` and `mapMonster` (`src/lib/dofusdb/map-items-monsters.ts`) do the same for the catalog rows: Spanish name with French fallback, then `Objeto <id>` or `Monstruo <id>`; an item's `level`, `typeId` and `iconId`, plus `superTypeId` read from `type.superTypeId` (`null` when DofusDB sends no type); a monster's `gfxId` stored as `iconId`.

### Prerequisite rule

A prerequisite here means a quest you must have **finished** before starting this one. `mapQuest` derives `prerequisiteDofusIds` from `startCriterion` alone:

- The criterion is split into tokens on `(`, `)`, `&` and `|`. Only tokens that are exactly `Qf=<id>` (quest finished) count.
- A level of the expression that contains a `|` is a set of alternatives: it contributes nothing, including what its nested groups would have given. So `(Qf=272|Qf=273|Qf=274)` yields no prerequisites, and a bare `Qf=879&Qa=878|Qf=877` yields none either.
- `Qf=` terms joined by `&`, at the top level or inside groups that are themselves joined by `&` and contain no `|`, all count. `PL>99&Qf=631&(PO=11195|PO=11197|DD>8,11198)&Sc=702` yields `[631]`.
- Other terms are ignored: `Qa=` (quest in progress), `Qf!` (quest not finished), `Qc=` and every non-quest condition.
- The result is deduplicated and never includes the quest itself. Unbalanced parentheses do not throw.

DofusDB's own `need.quests` field is not used, because it lists every quest the criterion mentions, whatever the condition: `Qf=` alternatives joined by `|`, `Qa=` (in progress) and `Qc=` terms alike. Reading it as "finish these first" would invent prerequisites. Two quests in the test fixtures show the difference:

| Quest | `startCriterion` | DofusDB `need.quests` | Prerequisites stored |
|---|---|---|---|
| 275 | `Ps=2&Pa=55&PL>129&(Qf=272\|Qf=273\|Qf=274)` | `[272, 273, 274]` | none: finishing any one of the three is enough, so none of them is required |
| 879 | `Qf=871&Qa=878` | `[871, 878]` | `[871]`: 878 only has to be in progress, not finished |

Requiring one of several alternatives cannot be expressed as a plain list of quests to finish, so those conditions stay in the raw `startCriterion` for later derived data.

### Rewards

`questRewards(raw)` (`src/lib/dofusdb/quest-rewards.ts`) computes what a quest gives a **level-200 character**. That is the convention dofusdb.fr displays and the one Torre's guides use, so the stored numbers match both. The formula is the Dofus client's (decompiled), the same one DofusDB and Ganymede use, and the results were checked digit for digit against dofusdb.fr.

Each quest step has several `rewards` entries, one per level bracket; the **last** one is the highest bracket and the only one used. For each step, with `L` the level, `opt` the step's `optimalLevel`, `duration` its duration and the entry's ratios:

```
fixe(L)  = L × (100 + 2L)² / 20 × duration × experienceRatio

XP       = fixe(200)                                        when opt ≥ 200
         = 0.3 × fixe(opt) + 0.7 × fixe(min(200, opt × 1.5)) when opt < 200

kamas    = (opt² + 20 × opt − 20) × kamasRatio × duration
```

- The reward level above the optimum is capped at 1.5 times the optimum and not truncated, so a step with optimum 25 counts level 37.5.
- Kamas use the optimal level, as DofusDB shows them, even though in the game they scale with the character's level.
- XP and kamas are floored **per step** and then summed, as DofusDB does. Flooring only the total gives a different number: quest 241 (five steps) gives 5,679,336 XP, not 5,679,337.
- A step with no `rewards` entry adds nothing; a quest with no steps gets zeros and empty lists.

Worked example, quest 1977 (*El cazador cazado*): one step, optimum 25, duration 0.5, both ratios 1. `fixe(25) = 14,062.5` and `fixe(37.5) = 28,710.94`, so XP is `0.3 × 14,062.5 + 0.7 × 28,710.94 = 24,316.4`, floored to **24,316**; kamas are `(625 + 500 − 20) × 0.5 = 552.5`, floored to **552**. Torre's guide gives the same figures.

The same last entry also gives:

- **items**: `itemsReward` pairs `[itemId, quantity]`, summed by item across steps (the same item in two steps becomes one line);
- **emote, spell, title and job IDs**: `emotesReward`, `spellsReward`, `titlesReward` and `jobsReward`, deduplicated in order. They are stored as plain DofusDB IDs; there is no collection behind them yet.

### Needs

`questNeeds(raw)` (`src/lib/dofusdb/quest-needs.ts`) lists what a quest asks for: items, monsters, and whether you have to walk to new maps. It reads DofusDB's `need` summary and the objectives of every step. What each objective's `parameter0…parameter4` mean depends on its `className`:

| Objective `className` | Feeds | Parameters read |
|---|---|---|
| `QuestObjectiveBringItemToNpcData` ("Entrégale a {npc}: N x {item}") | `needs.items` | item in `parameter1`, quantity in `parameter2` (1 if missing) |
| `QuestObjectiveFightMonsterData`, `QuestObjectiveMultiFightMonsterData`, `QuestObjectiveFightMonstersOnMapData` | `needs.monsters` | monster in `parameter0`, quantity in `parameter1` (1 if missing) |
| `QuestObjectiveBringSoulToNpcData` (bring N souls of a monster to an NPC) | `needs.monsters` | NPC first: monster in `parameter1`, quantity in `parameter2` |
| `QuestObjectiveDiscoverMapData`, `QuestObjectiveDiscoverSubAreaData` | `needs.walksMaps = true` | none |
| `QuestObjectiveFreeFormData`, `QuestObjectiveGoToNpcData`, `QuestObjectiveCraftItemData` and any other class | nothing | ignored |

Monsters are summed by monster across all objectives and steps.

**Items take the larger quantity, not the sum.** `need.items` (with `need.quantities` in the same order) is DofusDB's summary of the items a quest asks for, and it already includes the items you deliver. So `questNeeds` starts from `need.items` and, for each delivered item, keeps the larger of the two quantities instead of adding them. Quest 245 lists 2 × item 8993 in `need.items` and delivers 1 × 8993 in an objective: it needs 2, not 3. Deliveries of the same item in several objectives are summed among themselves first. A delivered item missing from `need.items` is appended.

#### What the refreshed data means for a guide

A quest guide copies its summary from the linked quest when the guide's fields are empty (see [Writing a quest guide](../cms/guide-authoring.md)). The prerequisites come from `prerequisites` and the `PL>` level in `startCriterion`, the rewards from `rewards`, the start point from the first `startPositions` entry, and the guide's "Necesitarás" item list from `needs.items`. Quest items are left out of that list: they carry their own item types (`typeId` 129, 133 and 155 in the fixtures), all under supertype 14, and the game hands them out during the quest, so the guide filters them by `superTypeId === 14`. About 3,900 of the catalog's items are quest items. Needed monsters and `walksMaps` do not fit an item list and are not copied.

Torre's "Necesitarás" lines are partly editorial (which fights to expect, what to prepare), and that part goes to the guide's own `summary.needs.notes`, which the fill never touches. Because values are copied, a later refresh does not change existing guides; the note under each summary field shows when the guide and DofusDB differ.

### Writing: items and monsters first, then two passes over quests

`refreshQuests(payload, data, { now, log, concurrency })` is the only code that writes quests, items and monsters, so every call uses the local API with `overrideAccess: true`; the collections' access rules refuse everyone else.

1. **Items, then monsters.** `refreshCatalog` maps the rows, keeps one per DofusDB ID, loads the existing rows in one query, creates the missing ones and updates an existing one only when its stored fields differ under a deep comparison. It returns the counts and a map from DofusDB ID to Payload ID that also covers rows from earlier runs that DofusDB no longer returned. This comes first because quest rewards and needs point at those Payload IDs. Progress is logged every 2,000 rows (`Objetos guardados: <n> de <total>`), which matters for the item catalog of more than 20,000 rows.
2. It maps every quest, keeping one entry per DofusDB ID in case a quest repeats across pages, and loads all existing quests in one query. `linkRows` swaps each reward and need item or monster for its Payload ID; an ID with no stored row is dropped from the list and counted as a missing item or monster.
3. **Pass 1** walks the mapped quests by `dofusId`. A missing quest is created. An existing one is updated only when its stored fields (name, levels, category, criterion, start positions, rewards and needs) differ from the mapped ones under a deep comparison; otherwise it is left alone. Progress is logged every 250 quests.
4. **Pass 2** resolves each quest's prerequisite DofusDB IDs to Payload IDs, now that every quest exists. A prerequisite that is not in the collection is skipped and counted. The relationship is written only when the resolved list differs from the stored one; a quest unchanged in pass 1 then counts as updated.
5. It returns `{ created, updated, unchanged }` for each of `quests`, `items` and `monsters`, plus `missingPrerequisites`, `missingItems` and `missingMonsters`. Every write returns its own status and missing counts, and the totals are summed from those results afterwards, so no shared counter is updated by concurrent writes. The only shared counter left is the progress count behind the every-250 log line.

Consequences:

- **Idempotent**: a rerun with the same DofusDB data writes nothing and reports every quest, item and monster as unchanged.
- **`refreshedAt`** is set to the run's time only on rows that were created or changed (fields or prerequisites), so it records when DofusDB last changed that row for us, not when the script last ran.
- **Nothing is deleted.** A quest, item or monster that disappears from DofusDB stays in its collection, so relationships pointing at it keep working.
- A prerequisite that appears in a later run gets linked then: its quest is created in pass 1 and the dependent quest's relationship is filled in pass 2.

### Write concurrency

Each Payload write is several round trips to the database. Written one at a time, a run against Neon took about half an hour (comment on `refreshQuests`). So within each step (items, monsters, quest pass 1, quest pass 2) the refresh writes several rows at a time with `mapWithConcurrency(items, limit, fn)` from `src/lib/concurrency.ts`:

- It returns the results in input order, whatever order the writes finish in.
- At most `limit` calls run at once.
- After the first error it starts nothing new, waits for the calls already running to settle, and then rejects with that first error, so no write is left running with an unhandled rejection.
- A `limit` that is not an integer of at least 1 throws a `RangeError`.

The steps stay in the same order as before: items and monsters finish before any quest is written, and pass 2 starts only once pass 1 has saved every quest. Concurrency only changes how rows inside one step overlap, so a run with 1 write at a time and a run with 8 store the same rows and return the same counts; the integration test checks exactly that.

The limit comes from `options.concurrency`, which defaults to `DEFAULT_WRITE_CONCURRENCY` (8). `pnpm data:quests` sets it from `DOFUSDB_WRITE_CONCURRENCY` through `writeConcurrencyFromEnv`: empty or unset gives 8, and anything that is not an integer of at least 1 throws before Payload starts. See [Environment configuration](../architecture/configuration.md#dofusdb-write-concurrency).

Each concurrent write holds one connection from the Postgres pool. `src/payload.config.ts` sets no `max` on the pool, so pg's default of 10 applies; 8 leaves room for the reads the refresh also makes, and `.env.example` advises not going above 9.

Measured locally, the write phase took 8.3 s with 1 write at a time and 4.5 s with 8. Local writes are CPU-bound, so the gain there is modest. Against Neon each write waits on network round trips, so the gain should be larger, but it has not been measured yet.

## Running it

```sh
pnpm data:quests
```

`package.json` runs `payload run scripts/refresh-quests.ts`, which loads `.env` and transpiles TypeScript. The script reads `DOFUSDB_WRITE_CONCURRENCY` before anything else, so a bad value fails at once, then starts Payload itself with `getPayload`. It creates the DofusDB client with `console.log` as its logger, so each retry prints a line. It prints how many quests, NPCs, maps, items and monsters it downloaded, how many writes it runs at once, the item and quest progress lines, how long the write phase took (`Escritura: <n> s.`), then the total elapsed time, the created, updated and unchanged counts for quests, items and monsters, and the skipped references. A full run downloads about 2,000 quests, 1,000 monsters and the whole item catalog of about 21,500 items (README).

The download dominates the run time, and most of it is the item catalog. Measured locally, the download took about two and a half minutes. Writing took about 10 seconds on a first run against `pnpm db:dev`, which creates every item, and under a second on a rerun that changes nothing, so a repeat run still takes about as long as the download.

- **Write concurrency**: `DOFUSDB_WRITE_CONCURRENCY=4 pnpm data:quests` (or the same line in `.env`) changes how many rows are written at once; empty means 8. See [Write concurrency](#write-concurrency).
- **Target database**: whatever `DATABASE_URL` points to, or the `ta_web` database of `pnpm db:dev` when it is empty. See [Database and migrations](database.md).
- **Schema first**: the `quests`, `items` and `monsters` tables must exist. Schema push only happens under `next dev`, so on a fresh database run `pnpm migrate` (or `pnpm dev` once) before the refresh.
- **Failure**: any error is printed as `El refresco de misiones falló:` with the cause, Payload is shut down, and the process exits with code 1. The explicit exit matters because `payload run` exits 0 whenever the script returns without throwing.
- **When**: on demand, after an Ankama patch changes the game data (docs/legacy/plan.md).

### Never against production without the owner's yes

The script writes to whatever database `DATABASE_URL` names, with no confirmation prompt. The infrastructure access rules (docs/legacy/infra.md, section 8) give agents full access to dev and read access to prod: prod writes, database changes included, go through `release.yml` or need Daniel's explicit yes for that one action. Do not point `DATABASE_URL` at the Neon `main` branch and run `pnpm data:quests` without that yes. Run it locally, or against the Neon `dev` branch.

## Tests

| Test | What it pins |
|---|---|
| `tests/unit/dofusdb-client.test.ts` | Pages of 50 until the total, a 50 ms pause between pages and none after the last, stop on an empty page, `$select[]` fields in the URL, the User-Agent, deduplicated IDs in chunks of 40, no request for an empty ID list, the error message on a 404. Retries: a network error and 502, 503 and 504 retried with waits of 500, 1,000, 2,000 and 4,000 ms and one log line each, jitter between 500 and 750 ms with `random` 0.5, giving up after 5 attempts with the URL and attempt count in the error (for a status and for repeated network failures), no retry on 400 or 404, and a 429's `Retry-After: 7` waited as 7,000 ms |
| `tests/unit/dofusdb-map-quest.test.ts` | Spanish name with French fallback, every start position with NPC names and coordinates, `null`s for missing lookups, rewards and needs taken from the steps, and the prerequisite rule: `Qf=` joined by `&`, alternatives, `Qa=`, nested groups, unbalanced parentheses, duplicates and self-references |
| `tests/unit/dofusdb-quest-rewards.test.ts` | Torre's and dofusdb.fr's figures for quests 1977 (24,316 XP, 552 kamas) and 1976, the 1.5 × optimum cap (332), the level-200 case (1433), per-step flooring (241), items summed across steps, the last reward entry (880), emote and title IDs, and empty steps |
| `tests/unit/dofusdb-quest-needs.test.ts` | Delivered items, `need.items` without deliveries, the larger-quantity rule (245), deliveries summed across objectives, every fight objective and souls, `walksMaps` for map and sub-area discovery, and the ignored objectives |
| `tests/unit/dofusdb-fetch-quest-data.test.ts` | Only the NPCs and maps named in start positions and the monsters named in needs are looked up by ID; items come from `fetchAll` with the select list, including items no quest names, and are never looked up by ID |
| `tests/unit/concurrency.test.ts` | `mapWithConcurrency` keeps input order when tasks finish out of order, never has more than `limit` tasks running, runs tasks one after another with `limit` 1, rejects with the first error once running tasks settle without starting more, returns an empty list without calling the function, and rejects a `limit` below 1 or not an integer |
| `tests/unit/dofusdb-write-concurrency.test.ts` | `DOFUSDB_WRITE_CONCURRENCY`: unset or empty gives the default, which stays below pg's pool of 10; a positive integer (also with spaces) is read; `0`, `-2`, `1.5` and `ocho` throw |
| `tests/integration/refresh-quests.test.ts` | Against real Payload and Postgres: the first run creates the quests and skips missing prerequisites; a second run changes nothing and keeps `refreshedAt`; a third run updates only the renamed quest and the one whose missing prerequisite now exists, and creates the new quest. A second block creates items and monsters and links rewards and needs by Payload ID, changes nothing on a rerun, and on a third run updates only the renamed item and the changed quest and skips an item DofusDB did not return. A third block runs the refresh over both fixtures with concurrency 1 and then, after deleting the rows, with concurrency 8, and expects equal counts and equal stored data, with relationships compared by DofusDB ID. A fourth block adds catalog items no quest names (a sword and two quest items): the refresh creates them all with `superTypeId`, and a second run with the same catalog writes no item and keeps `refreshedAt` |

The unit and integration tests share real DofusDB rows saved in `tests/fixtures/dofusdb/`: `quests.json`, `npcs.json` and `map-positions.json` for the base quest fields, and `quests-steps.json` (nine quests with their steps), `items.json` and `monsters.json` for rewards and needs, and `items-unreferenced.json` with three items no fixture quest names, for the full-catalog cases. The integration test deletes its fixture rows before and after it runs. See [Test suites](../testing/test-suites.md).

## Related pages

- [Collections and access](../cms/collections.md)
- [Writing a quest guide](../cms/guide-authoring.md)
- [Database and migrations](database.md)
- [Test suites](../testing/test-suites.md)
- [Local development](../workflows/local-development.md)
- [Squarespace import](squarespace-import.md)
