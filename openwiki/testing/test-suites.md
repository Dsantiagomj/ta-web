---
type: testing
title: Test suites
description: The five test suites (unit, integration, E2E, dev-gate E2E and smoke), what each one covers, how each provisions its database and app server, and the guards that keep tests away from real databases.
tags: [testing, vitest, playwright, integration, e2e]
sources:
  - id: openwiki-source-f235d856bed1fd44853c5195
    resource: repo://.prettierignore
  - id: openwiki-source-5e753d9d77984cb67aae1517
    resource: repo://playwright.config.ts
  - id: openwiki-source-e97ce5e3668d477e63c70413
    resource: repo://playwright.dev-gate.config.ts
  - id: openwiki-source-15d81576125ffd9d62dc8605
    resource: repo://tests/e2e/app-server.ts
  - id: openwiki-source-c04b26872daa30d9d3f5983e
    resource: repo://tests/e2e/robots.spec.ts
  - id: openwiki-source-a493eb920ff6a7f8859a6c69
    resource: repo://tests/e2e/smoke.spec.ts
  - id: openwiki-source-ba3f0fcedbfe897756d56965
    resource: repo://tests/fixtures/dofusdb/quests-steps.json
  - id: openwiki-source-f771f456156fbf6bde7862c2
    resource: repo://tests/fixtures/dofusdb/quests.json
  - id: openwiki-source-1c31b10d596a8990b9ccb573
    resource: repo://tests/fixtures/squarespace/el-cazador-cazado.html
  - id: openwiki-source-46cbabf1b3d2b7c36423da7e
    resource: repo://tests/integration/game-data-access.test.ts
  - id: openwiki-source-450b6a23d7e25100eadc359f
    resource: repo://tests/integration/global-setup.ts
  - id: openwiki-source-5cd8fc4d5a65c01359ed92e2
    resource: repo://tests/integration/import-quest-guides.test.ts
  - id: openwiki-source-a6cdaab0cfeb9dcfe8511d62
    resource: repo://tests/integration/migrations.test.ts
  - id: openwiki-source-dbcd0524c9464e05f7f54ade
    resource: repo://tests/integration/payload.ts
  - id: openwiki-source-7b27bf36255a812248aa50e8
    resource: repo://tests/integration/quest-guides-access.test.ts
  - id: openwiki-source-cbffdb2343060c99a7477cfa
    resource: repo://tests/integration/refresh-quests.test.ts
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
  - id: openwiki-source-cd37c5a886e3aa1e214dad74
    resource: repo://tests/unit/game-data-collections.test.ts
  - id: openwiki-source-bf890cc4722b5033a81aa698
    resource: repo://tests/unit/import-fetch-image.test.ts
  - id: openwiki-source-d5617545465b10f7c4424728
    resource: repo://tests/unit/import-parse-page.test.ts
  - id: openwiki-source-fe4a14de069bb6226ad2a447
    resource: repo://tests/unit/import-quest-matches.test.ts
  - id: openwiki-source-7c48f921336671c0ca29e644
    resource: repo://tests/unit/import-rich-text.test.ts
  - id: openwiki-source-299c190cabc2f0753a302110
    resource: repo://tests/unit/import-to-quest-guide.test.ts
  - id: openwiki-source-ae7421f61722d14d3413a918
    resource: repo://tests/unit/quest-guide-blocks.test.ts
  - id: openwiki-source-1970468d3fcc651d5071b312
    resource: repo://tests/unit/quest-guides-collection.test.ts
  - id: openwiki-source-6678095e74d244708e64ddd4
    resource: repo://tests/unit/quests-collection.test.ts
  - id: openwiki-source-56eed4e45701ea6820d33662
    resource: repo://tests/unit/test-database-env.test.ts
  - id: openwiki-source-b58f839a189d87a7e1f37d39
    resource: repo://vitest.config.mts
  - id: openwiki-source-57da85ca1bb457973a5594ff
    resource: repo://vitest.integration.config.mts
generated: { by: "claude-code", at: "2026-11-04T18:10:54.480Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-04T18:10:54.480Z
---

# Test suites

The repo works test-first (AGENTS.md: strict TDD). There are five suites. All of them run in CI except smoke, which runs after deploys.

| Suite | Command | Runner | Location | Needs |
|---|---|---|---|---|
| Unit | `pnpm test` | Vitest | `tests/unit/` | Nothing |
| Integration | `pnpm test:integration` | Vitest | `tests/integration/` | Postgres, migrations |
| E2E | `pnpm test:e2e` | Playwright | `tests/e2e/` | Production build, Postgres, migrations |
| Dev gate | `pnpm test:e2e:dev-gate` | Playwright | `tests/e2e-dev-gate/` | Same build, `APP_ENV=dev` |
| Smoke | `pnpm test:smoke` | Playwright (`@smoke` subset) | `tests/e2e/` | A local server, or a deployed URL |

## Unit

`vitest.config.mts` runs `tests/unit/**/*.test.ts` in the Node environment, with `vite-tsconfig-paths` so `@/…` imports work. Unit tests target the pure resolvers and builders that take an `env` record, which is why most server logic is written that way:

- configuration: `database-url`, `media-storage`, `sentry-options`, `railway-config` (evaluates `.railway/railway.ts` for each environment), `next-config`, `test-database-env`;
- behavior: `health` (fake pool and timers), `dev-gate`, `robots`, `theme`, `mode-script`, `mode-toggle-strings`, `media-collection`, `quests-collection` (including the `rewards` and `needs` groups), `game-data-collections` (the `items` and `monsters` fields and the shared read-only `gameDataAccess`);
- quest guides: `quest-guides-collection` (fields, versions, `validateSlug` and the access functions) and `quest-guide-blocks` (each body block's fields and `validateVideoUrl`);
- DofusDB refresh: `dofusdb-client` (paging, ID chunks, pauses and errors through an injected fake `fetch`, never the network), `dofusdb-map-quest` (names, start positions, rewards and needs from the steps, and the prerequisite rule), `dofusdb-quest-rewards` (the level-200 XP and kamas formula against Torre's and dofusdb.fr's figures, per-step flooring, the last reward entry, items and IDs), `dofusdb-quest-needs` (which objectives count, the larger-quantity rule between `need.items` and deliveries, `walksMaps`) and `dofusdb-fetch-quest-data` (only the NPCs and maps named in start positions, and the items and monsters named in rewards and needs, are looked up);
- Squarespace import: `import-parse-page` (title, desktop grid order, text, image and unknown blocks), `import-to-quest-guide` (summary, start NPC, what leaves the body, callouts, oddities), `import-rich-text` (HTML to Lexical through Payload's editor), `import-quest-matches` (the slug to DofusDB IDs CSV) and `import-fetch-image` (image downloads only over `https` from Squarespace's CDN, without redirects and only for `image/*` responses, through an injected fake `fetch`). See [Squarespace import](../data/squarespace-import.md);
- tooling: `commit-msg` (runs the git hook script).

## Integration

Real Payload (`getPayload`) against a real Postgres with the committed migrations applied. They check rules that only exist at runtime, such as collection access.

- `vitest.integration.config.mts` runs `tests/integration/**/*.test.ts` with a global setup, `fileParallelism: false` (all files share one database), a 30 s test timeout and a 120 s hook timeout.
- `integrationEnv` sets the environment: `DATABASE_URL` from the shell or the embedded `ta_web_integration` database, `DATABASE_URL_DIRECT` forced to the same URL, a dummy `PAYLOAD_SECRET` when none is set, and every `S3_*` and `MEDIA_BASE_URL` blanked so uploads go to `./media`.
- `tests/integration/global-setup.ts`: with no `DATABASE_URL`, it starts `pnpm db:dev` if port 54329 is closed (and stops it afterwards, or on setup failure), recreates `ta_web_integration`, then runs `pnpm migrate`. With `DATABASE_URL` (CI's empty Postgres service) it only migrates.
- Helpers in `tests/integration/payload.ts`: `startPayload`, `tinyPng` (a 1×1 PNG in memory) and `createPanelUser` (creates and logs in a panel user, returning what Payload puts in `req.user`).
- Access tests call the local API with `overrideAccess: false`; omitting `user` makes the call anonymous. See [Collections and access](../cms/collections.md).
- `quest-guides-access.test.ts` goes further than the other access tests: besides who may read and write, it checks that anonymous reads hide drafts, that a panel user can publish a draft and get a version, and that a guide with all four [body blocks](../cms/blocks.md), linked quests and an image saves and reads back. When it finishes it deletes every guide, quest and media document in the integration database.
- `game-data-access.test.ts` checks `items` and `monsters` at runtime: an anonymous request can `find` and `findByID`, and a panel user gets `Forbidden` on create, update and delete with the data unchanged.
- `refresh-quests.test.ts` runs `refreshQuests` three times against the integration database: the first run creates the fixture quests and skips missing prerequisites, a second run with the same data changes nothing and keeps `refreshedAt`, and a third run updates only what changed and links a prerequisite that now exists. A second block does the same for rewards and needs: it creates the fixture items and monsters and links rewards and needs by Payload ID, a rerun changes nothing, and a third run updates only the renamed item and the changed quest and skips an item DofusDB did not return. It deletes its fixture quests, items and monsters before and after. See [DofusDB game data refresh](../data/dofusdb-refresh.md).
- `import-quest-guides.test.ts` runs the Squarespace loader on the five fixture pages with a fake `fetchImage` that returns a 1×1 PNG. It checks drafts with all four block types and the existing quest linked, one `media` record per image with its URL and alt, the oddities, a second run that changes, downloads and versions nothing, one new draft for a changed guide, a summary field that disappears being cleared without extra versions on the next run, no drafts visible to anonymous readers and an invalid slug skipped. It cleans up its guides, media and quests before and after. See [Squarespace import](../data/squarespace-import.md#loading-into-payload).
- `migrations.test.ts` checks that the latest migration rolls back and re-applies: it runs the Payload CLI (`pnpm payload migrate:down`, then `pnpm payload migrate`) with `integrationEnv` and `DATABASE_CONNECTION=direct`, leaving the database as it was. It starts the CLI twice, so it has its own 120 s timeout instead of the suite's 30 s. See [Database and migrations](../data/database.md#migrations).

## E2E

`playwright.config.ts` tests the app on the production path, never `next dev`:

1. `pnpm build` (skipped with `E2E_SKIP_BUILD=1`).
2. With no `DATABASE_URL`: start `pnpm db:dev` (reusing a running one) and reset `ta_web_e2e` with `scripts/db-e2e-reset.ts`.
3. `pnpm migrate` on the empty database.
4. `pnpm start --port 3100` (`E2E_PORT`), a port of its own so a running `pnpm dev` on 3000 is never reused by mistake.

`appWebServers` in `tests/e2e/app-server.ts` builds that server list and passes `DATABASE_URL_DIRECT` equal to `DATABASE_URL`, because `pnpm migrate` prefers the direct URL. Only Chromium runs. In CI: one worker, one retry, traces on first retry, GitHub and HTML reporters, and `forbidOnly`.

Specs:

- `smoke.spec.ts`: home renders in Arcano dark; the toggle switches to light and the mode survives reload; the egg medallion per mode and its hover state; the head script recovers the mode from `localStorage` without a cookie; `/admin` responds and hydrates the first-user form without errors; `/api/health` is ok.
- `robots.spec.ts`: outside dev, `robots.txt` allows indexing except `/admin`, and the home page has no `X-Robots-Tag`.

## Dev gate

`playwright.dev-gate.config.ts` starts two instances of the same build: one with `APP_ENV=dev` and the test credentials on port 3101 (`E2E_DEV_GATE_PORT`), and one with `APP_ENV=dev` and blank credentials on the next port, waited for by port because it answers `503` everywhere. With `E2E_SKIP_BUILD=1` it reuses the E2E build, which works because the gate reads the environment at startup, not at build. Cases are in [Dev environment gate](../operations/dev-gate.md).

## Smoke

`pnpm test:smoke` runs only tests tagged `@smoke` (home, `/admin`, `/api/health`). They only read, so they are safe against dev or production.

- Without `SMOKE_BASE_URL` it behaves like E2E and starts a local server.
- With `SMOKE_BASE_URL` it tests that URL and starts nothing: no build, no migrations, no database.
- `SMOKE_BASIC_AUTH_USER` and `SMOKE_BASIC_AUTH_PASSWORD` become Playwright `httpCredentials` only when both are set.

## Fixtures

`tests/fixtures/dofusdb/` holds real DofusDB rows (`quests.json`, `npcs.json`, `map-positions.json`) shared by the DofusDB unit tests and `refresh-quests.test.ts`. The quests cover a plain criterion, several start positions, alternatives joined by `|` and a `Qa=` term. `quests-steps.json` adds nine quests with their steps, rewards and objectives, and `items.json` and `monsters.json` hold exactly the items and monsters those quests name; they feed the rewards, needs, fetch and refresh tests.

`tests/fixtures/squarespace/` holds trimmed copies of the five demo Squarespace pages, one HTML file per slug, read by the import unit tests. Prettier ignores the directory so the files stay byte for byte as the parser expects.

## Guards against touching real data

- Playwright reads only `E2E_PORT`, `E2E_DEV_GATE_PORT` and `E2E_SKIP_BUILD` from `.env` (`loadE2eEnvFromFile`); a `DATABASE_URL` in `.env` never reaches the tests, and the smoke variables come only from the shell. The process environment always wins.
- E2E and integration use their own databases (`ta_web_e2e`, `ta_web_integration`), dropped and recreated per run, so local dev data in `ta_web` is untouched.
- Both force `DATABASE_URL_DIRECT` to the test database so `pnpm migrate` cannot follow a direct URL inherited from the shell. `tests/unit/test-database-env.test.ts` pins this.

## Related pages

- [CI and quality gates](../workflows/ci-and-quality-gates.md)
- [Database and migrations](../data/database.md)
- [Dev environment gate](../operations/dev-gate.md)
- [DofusDB game data refresh](../data/dofusdb-refresh.md)
- [Collections and access](../cms/collections.md)
- [Guide body blocks](../cms/blocks.md)
- [Squarespace import](../data/squarespace-import.md)
