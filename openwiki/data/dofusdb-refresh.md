---
type: workflow
title: DofusDB game data refresh
description: How pnpm data:quests fills the read-only quests collection from the public DofusDB API, how quests and their prerequisites are mapped, why a rerun changes nothing, and how to run it without touching production by accident.
tags: [dofusdb, game-data, quests, payload, scripts]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-04T12:18:18.185Z
sources:
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
  - id: openwiki-source-2ad419cae2f45e97a3ca23d7
    resource: repo://src/lib/db/database-url.ts
  - id: openwiki-source-7b3f34dd948192f72aa88058
    resource: repo://src/lib/dofusdb/client.ts
  - id: openwiki-source-54227c78b7c2e57bc6f3d29b
    resource: repo://src/lib/dofusdb/fetch-quest-data.ts
  - id: openwiki-source-593d2c966d67e453d0429c23
    resource: repo://src/lib/dofusdb/map-quest.ts
  - id: openwiki-source-4ce5bfd40fc86e2e8680d71f
    resource: repo://src/lib/dofusdb/refresh-quests.ts
  - id: openwiki-source-f771f456156fbf6bde7862c2
    resource: repo://tests/fixtures/dofusdb/quests.json
  - id: openwiki-source-cbffdb2343060c99a7477cfa
    resource: repo://tests/integration/refresh-quests.test.ts
  - id: openwiki-source-1843fcebd4e1a5a852fbfef6
    resource: repo://tests/unit/dofusdb-client.test.ts
  - id: openwiki-source-5c15ceedf8492ffd0f430eca
    resource: repo://tests/unit/dofusdb-fetch-quest-data.test.ts
  - id: openwiki-source-1a4d893bc4ddfe68ab2aff11
    resource: repo://tests/unit/dofusdb-map-quest.test.ts
generated: { by: "claude-code", at: "2026-11-04T12:18:18.185Z" }
---

# DofusDB game data refresh

Game data in ta-web (quests today; items, monsters and the rest later) comes from DofusDB, is read-only in the panel and is refreshed by a script. Torre picks it from guides through relationship fields (AGENTS.md). The quest refresh is the first of these scripts and the only writer of the `quests` collection described in [Collections and access](../cms/collections.md#quests-dofusdb-game-data).

Nothing loads from DofusDB at runtime. The script copies the data into our Postgres; the site reads only that copy.

## Pipeline

```
pnpm data:quests
  └─ scripts/refresh-quests.ts        getPayload, timing, exit code
       ├─ createDofusDbClient()       src/lib/dofusdb/client.ts
       ├─ fetchQuestData(client)      src/lib/dofusdb/fetch-quest-data.ts
       │    quests (all pages) → NPCs and maps named in start positions
       └─ refreshQuests(payload, data) src/lib/dofusdb/refresh-quests.ts
            mapQuest per quest        src/lib/dofusdb/map-quest.ts
            pass 1: create/update quest fields by dofusId
            pass 2: link prerequisites by Payload ID
```

`src/lib/dofusdb/types.ts` types only the fields the pipeline reads from DofusDB rows (`RawQuest`, `RawNpc`, `RawMapPosition`, and `LocalizedText` for the `{ es, fr, en, de, pt }` texts) and the `MappedQuest` shape written to the collection.

### Client

`createDofusDbClient` wraps the public API at `https://api.dofusdb.fr`, a Feathers API paged with `$limit` and `$skip`.

- `fetchAll(collection)` requests pages of 50 (DofusDB never returns more per request) until `skip + 50` reaches the reported `total`. An empty page also stops the loop, whatever the total says.
- `fetchByIds(collection, ids)` drops duplicate IDs and requests them in chunks of 40 with `id[$in][]=…` filters, which keeps URLs short and each answer inside one page. IDs that do not exist simply do not come back.
- It waits 50 ms between requests, so it does not load a free API, and sends a generic `User-Agent: ta-web/datos-del-juego`.
- A non-2xx answer throws `DofusDB respondió <status> <statusText> en <url>`. There are no retries: the run fails and you run it again.
- `fetch`, `sleep` and `baseUrl` are injectable, so the tests never reach the network.

### Fetching

`fetchQuestData` loads every quest, collects the distinct `npcId` and `mapId` values from their `startPosition` entries, and fetches only those NPCs (`npcs`) and maps (`map-positions`). It returns `{ quests, npcs, mapPositions }`.

### Mapping a quest

`mapQuest(raw, lookups)` turns one DofusDB quest into the collection's fields; `indexLookups` builds the NPC and map lookup maps by ID.

- **Name**: Spanish, falling back to French (DofusDB's original language), and to `Misión <id>` when both are missing, because `name` is required.
- **Levels and category**: `levelMin`, `levelMax` and `categoryId` copied as is, `null` when absent.
- **Start positions**: one entry per DofusDB start position with `npcId`, the NPC's Spanish (or French) name, `mapId` and the map's `posX`/`posY` as `x`/`y`. A missing NPC or map leaves those values `null`; mapping never fails over a missing lookup.
- **`startCriterion`**: the raw DofusDB criterion string, stored unchanged (`null` when empty) so later derived data can reread it.

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

### Writing: two passes, only what changed

`refreshQuests(payload, data, { now, log })` is the only code that writes quests, so every call uses the local API with `overrideAccess: true`; the collection's access rules refuse everyone else.

1. It maps every quest, keeping one entry per DofusDB ID in case a quest repeats across pages, and loads all existing quests in one query.
2. **Pass 1** walks the mapped quests by `dofusId`. A missing quest is created. An existing one is updated only when its stored fields (name, levels, category, criterion, start positions) differ from the mapped ones under a deep comparison; otherwise it is left alone. Progress is logged every 250 quests.
3. **Pass 2** resolves each quest's prerequisite DofusDB IDs to Payload IDs, now that every quest exists. A prerequisite that is not in the collection is skipped and counted. The relationship is written only when the resolved list differs from the stored one; a quest unchanged in pass 1 then counts as updated.
4. It returns `{ created, updated, unchanged, missingPrerequisites }`.

Consequences:

- **Idempotent**: a rerun with the same DofusDB data writes nothing and reports every quest as unchanged.
- **`refreshedAt`** is set to the run's time only on quests that were created or changed (fields or prerequisites), so it records when DofusDB last changed that quest for us, not when the script last ran.
- **Nothing is deleted.** A quest that disappears from DofusDB stays in the collection, so guide relationships pointing at it keep working.
- A prerequisite that appears in a later run gets linked then: its quest is created in pass 1 and the dependent quest's relationship is filled in pass 2.

## Running it

```sh
pnpm data:quests
```

`package.json` runs `payload run scripts/refresh-quests.ts`, which loads `.env` and transpiles TypeScript. The script starts Payload itself with `getPayload`, prints how many quests, NPCs and maps it downloaded, then the counts and the elapsed time. A full run downloads about 2,000 quests and takes 20 to 30 seconds (README).

- **Target database**: whatever `DATABASE_URL` points to, or the `ta_web` database of `pnpm db:dev` when it is empty. See [Database and migrations](database.md).
- **Schema first**: the `quests` tables must exist. Schema push only happens under `next dev`, so on a fresh database run `pnpm migrate` (or `pnpm dev` once) before the refresh.
- **Failure**: any error is printed as `El refresco de misiones falló:` with the cause, Payload is shut down, and the process exits with code 1. The explicit exit matters because `payload run` exits 0 whenever the script returns without throwing.
- **When**: on demand, after an Ankama patch changes the game data (docs/legacy/plan.md).

### Never against production without the owner's yes

The script writes to whatever database `DATABASE_URL` names, with no confirmation prompt. The infrastructure access rules (docs/legacy/infra.md, section 8) give agents full access to dev and read access to prod: prod writes, database changes included, go through `release.yml` or need Daniel's explicit yes for that one action. Do not point `DATABASE_URL` at the Neon `main` branch and run `pnpm data:quests` without that yes. Run it locally, or against the Neon `dev` branch.

## Tests

| Test | What it pins |
|---|---|
| `tests/unit/dofusdb-client.test.ts` | Pages of 50 until the total, a 50 ms pause between pages and none after the last, stop on an empty page, the User-Agent, deduplicated IDs in chunks of 40, no request for an empty ID list, the error message on a 404 |
| `tests/unit/dofusdb-map-quest.test.ts` | Spanish name with French fallback, every start position with NPC names and coordinates, `null`s for missing lookups, and the prerequisite rule: `Qf=` joined by `&`, alternatives, `Qa=`, nested groups, unbalanced parentheses, duplicates and self-references |
| `tests/unit/dofusdb-fetch-quest-data.test.ts` | Only the NPCs and maps named in start positions are looked up |
| `tests/integration/refresh-quests.test.ts` | Against real Payload and Postgres: the first run creates the quests and skips missing prerequisites; a second run changes nothing and keeps `refreshedAt`; a third run updates only the renamed quest and the one whose missing prerequisite now exists, and creates the new quest |

The unit and integration tests share real DofusDB rows saved in `tests/fixtures/dofusdb/` (`quests.json`, `npcs.json`, `map-positions.json`). The integration test deletes its fixture quests before and after it runs. See [Test suites](../testing/test-suites.md).

## Related pages

- [Collections and access](../cms/collections.md)
- [Database and migrations](database.md)
- [Test suites](../testing/test-suites.md)
- [Local development](../workflows/local-development.md)
