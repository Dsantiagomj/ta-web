---
type: testing
title: Test suites
description: The six test suites (unit, integration, E2E, dev-gate E2E, smoke and the Lighthouse CI budgets), what each one covers, how each provisions its database and app server, and the guards that keep tests away from real databases.
tags: [testing, vitest, playwright, integration, e2e]
sources:
  - id: openwiki-source-164e2da859b5277df81c7d94
    resource: repo://.github/workflows/ci.yml
  - id: openwiki-source-f235d856bed1fd44853c5195
    resource: repo://.prettierignore
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-5e753d9d77984cb67aae1517
    resource: repo://playwright.config.ts
  - id: openwiki-source-e97ce5e3668d477e63c70413
    resource: repo://playwright.dev-gate.config.ts
  - id: openwiki-source-79d3d2760afd733db53a957b
    resource: repo://scripts/dev-database-process.ts
  - id: openwiki-source-f0b0dfee6a793bb5e8050714
    resource: repo://scripts/lhci-env.ts
  - id: openwiki-source-b8d2cb44b5c8224f8b87d0ce
    resource: repo://scripts/seed-e2e.ts
  - id: openwiki-source-15d81576125ffd9d62dc8605
    resource: repo://tests/e2e/app-server.ts
  - id: openwiki-source-df563b1c48e3697f45171c21
    resource: repo://tests/e2e/brand.spec.ts
  - id: openwiki-source-427eacf7850519fc2b6f8403
    resource: repo://tests/e2e/cabecera.spec.ts
  - id: openwiki-source-29d77f6ec30639b62aac4359
    resource: repo://tests/e2e/fonts.spec.ts
  - id: openwiki-source-870648cc3288ecf5c87bb3a4
    resource: repo://tests/e2e/guia.spec.ts
  - id: openwiki-source-1ad069df7a453770f4cdef35
    resource: repo://tests/e2e/inicio.spec.ts
  - id: openwiki-source-1f65cb688406ef2eb6ebe494
    resource: repo://tests/e2e/logro.spec.ts
  - id: openwiki-source-cf2cbbdb1dcdabf3a2d7fb52
    resource: repo://tests/e2e/metalogros.spec.ts
  - id: openwiki-source-c04b26872daa30d9d3f5983e
    resource: repo://tests/e2e/robots.spec.ts
  - id: openwiki-source-22571714391cf8b566f6ad43
    resource: repo://tests/e2e/seed/achievements.ts
  - id: openwiki-source-bd7392d65e8fc186a24c242a
    resource: repo://tests/e2e/seed/guides.ts
  - id: openwiki-source-8b0b9cc5ebf1012175c3d759
    resource: repo://tests/e2e/sistema.spec.ts
  - id: openwiki-source-a493eb920ff6a7f8859a6c69
    resource: repo://tests/e2e/smoke.spec.ts
  - id: openwiki-source-ffbd2a66dcd49833dd7094eb
    resource: repo://tests/fixtures/dofusdb/items-unreferenced.json
  - id: openwiki-source-ba3f0fcedbfe897756d56965
    resource: repo://tests/fixtures/dofusdb/quests-steps.json
  - id: openwiki-source-f771f456156fbf6bde7862c2
    resource: repo://tests/fixtures/dofusdb/quests.json
  - id: openwiki-source-1c31b10d596a8990b9ccb573
    resource: repo://tests/fixtures/squarespace/el-cazador-cazado.html
  - id: openwiki-source-ed8ed36330376a51e8f54b82
    resource: repo://tests/integration/achievement-fixes.test.ts
  - id: openwiki-source-e57aa8deceed5152aa47af8a
    resource: repo://tests/integration/achievement-page-queries.test.ts
  - id: openwiki-source-4d4ac9e1e628bf6a685e4bf2
    resource: repo://tests/integration/achievement-pages.test.ts
  - id: openwiki-source-fe280752cf4e8fded95852d9
    resource: repo://tests/integration/backfill-fights.test.ts
  - id: openwiki-source-b099772c2f58d976c651450a
    resource: repo://tests/integration/fixtures/import-disconnect.ts
  - id: openwiki-source-46cbabf1b3d2b7c36423da7e
    resource: repo://tests/integration/game-data-access.test.ts
  - id: openwiki-source-450b6a23d7e25100eadc359f
    resource: repo://tests/integration/global-setup.ts
  - id: openwiki-source-c1a763f1b73857b38a438dd8
    resource: repo://tests/integration/guide-page-queries.test.ts
  - id: openwiki-source-1c14916aa5d794dc90f1b2c7
    resource: repo://tests/integration/guide-search-index.test.ts
  - id: openwiki-source-8f0065e4504cfadc651f72a5
    resource: repo://tests/integration/guide-single-quest-migration.test.ts
  - id: openwiki-source-6d63967683e8fb611f26b906
    resource: repo://tests/integration/import-disconnect.test.ts
  - id: openwiki-source-5cd8fc4d5a65c01359ed92e2
    resource: repo://tests/integration/import-quest-guides.test.ts
  - id: openwiki-source-a6cdaab0cfeb9dcfe8511d62
    resource: repo://tests/integration/migrations.test.ts
  - id: openwiki-source-5753af90697570a0ebcd954f
    resource: repo://tests/integration/needs-list-migration.test.ts
  - id: openwiki-source-dbcd0524c9464e05f7f54ade
    resource: repo://tests/integration/payload.ts
  - id: openwiki-source-7b27bf36255a812248aa50e8
    resource: repo://tests/integration/quest-guides-access.test.ts
  - id: openwiki-source-cd6b88c691322659e364fdbf
    resource: repo://tests/integration/quest-guides-autofill.test.ts
  - id: openwiki-source-1d413a1c9f24b6810283a923
    resource: repo://tests/integration/refresh-game-images.test.ts
  - id: openwiki-source-b851e65e44a5d48a33bfb854
    resource: repo://tests/integration/refresh-npcs.test.ts
  - id: openwiki-source-cbffdb2343060c99a7477cfa
    resource: repo://tests/integration/refresh-quests.test.ts
  - id: openwiki-source-298528b36bd97573076646d2
    resource: repo://tests/integration/remove-step-title-migration.test.ts
  - id: openwiki-source-f4f637fe7c0ff45ea1a88a59
    resource: repo://tests/integration/site-counts.test.ts
  - id: openwiki-source-cb15629b981f292fdc846429
    resource: repo://tests/integration/users-lockout.test.ts
  - id: openwiki-source-3fc2c02c456e1e51768c4446
    resource: repo://tests/unit/concurrency.test.ts
  - id: openwiki-source-1843fcebd4e1a5a852fbfef6
    resource: repo://tests/unit/dofusdb-client.test.ts
  - id: openwiki-source-5abe1ccdc91bc1443cbb73d2
    resource: repo://tests/unit/dofusdb-criterion.test.ts
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
  - id: openwiki-source-0dce08d52a9be6f19ead446b
    resource: repo://tests/unit/game-components.test.tsx
  - id: openwiki-source-cd37c5a886e3aa1e214dad74
    resource: repo://tests/unit/game-data-collections.test.ts
  - id: openwiki-source-bb0747d86ef5cecbc4d85241
    resource: repo://tests/unit/guide-autofill.test.ts
  - id: openwiki-source-a245227c3cb5565abdfcd27a
    resource: repo://tests/unit/guide-form-fill.test.ts
  - id: openwiki-source-85e63acb1252624b63be77af
    resource: repo://tests/unit/guide-summary.test.ts
  - id: openwiki-source-f5bb52b30eff93118a46d132
    resource: repo://tests/unit/home-sections.test.tsx
  - id: openwiki-source-8131ce8fe0d39424d006607a
    resource: repo://tests/unit/import-dom.test.ts
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
  - id: openwiki-source-252aed3da80ab24fac288bb7
    resource: repo://tests/unit/site-shell.test.tsx
  - id: openwiki-source-56eed4e45701ea6820d33662
    resource: repo://tests/unit/test-database-env.test.ts
  - id: openwiki-source-ec6f86966a8f8c08cdb73603
    resource: repo://tests/unit/ui-components.test.tsx
  - id: openwiki-source-b58f839a189d87a7e1f37d39
    resource: repo://vitest.config.mts
  - id: openwiki-source-57da85ca1bb457973a5594ff
    resource: repo://vitest.integration.config.mts
generated: { by: "claude-code", at: "2026-11-10T11:02:06.480Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-10T11:02:06.480Z
---

# Test suites

The repo works test-first (AGENTS.md: strict TDD). There are six suites. All of them run in CI except smoke, which runs after deploys.

| Suite | Command | Runner | Location | Needs |
|---|---|---|---|---|
| Unit | `pnpm test` | Vitest | `tests/unit/` | Nothing |
| Integration | `pnpm test:integration` | Vitest | `tests/integration/` | Postgres, migrations |
| E2E | `pnpm test:e2e` | Playwright | `tests/e2e/` | Production build, Postgres, migrations |
| Dev environment | `pnpm test:e2e:dev-gate` | Playwright | `tests/e2e-dev-gate/` | Same build, `APP_ENV=dev` |
| Smoke | `pnpm test:smoke` | Playwright (`@smoke` subset) | `tests/e2e/` | A local server, or a deployed URL |
| Budgets | `pnpm test:lhci` | Lighthouse CI (`scripts/lhci.ts`) | `lighthouserc.cjs` | Production build, Postgres, migrations, Chromium |

## Unit

`vitest.config.mts` runs `tests/unit/**/*.test.{ts,tsx}` in the Node environment, with `vite-tsconfig-paths` so `@/…` imports work. Unit tests target the pure resolvers and builders that take an `env` record, which is why most server logic is written that way:

- configuration: `database-url` (including `isLocalDatabaseUrl`), `media-storage`, `sentry-options`, `railway-config` (evaluates `.railway/railway.ts` for each environment), `next-config`, `test-database-env`;
- behavior: `health` (fake pool and timers), `dev-gate` (dev detection and the proxy's `noindex`), `robots`, `theme`, `mode-script`, `mode-toggle-strings`, `users-collection` (the pinned login lockout), `media-collection` (sizes and `gameAsset`), `media-regenerate` (`pnpm media:sizes`: refusals and where originals are read from), `quests-collection` (including the zone, achievement, `rewards` and `needs` groups), `game-data-collections` (the `items`, `monsters` and `npcs` fields, including the optional `superTypeId` on items, the imported `image` on items and monsters, and the shared read-only `gameDataAccess`), `script-guard` (`databaseScriptRefusal`: local runs, `--production` and `--remote`);
- quest guides: `quest-guides-collection` (fields in order, with the single, optional `quest` relationship first and in the main area, the needs group and the note components, versions, the `fillFromQuest` hook, `validateGuideTitle`, `validateGuideSlug`, `validateSlug` and the access functions), `quest-guide-blocks` (each body block's fields, `validateVideoUrl`, which accepts only YouTube video links, the fight block, and the step block without a title and with `validateStepCoordinate`), `guide-slug` (reserved slugs), `guide-preview` (preview URLs and origin), `revalidate-guides` (the cache-expiring hooks), `guide-summary` (Torre's summary format checked against the parsed Squarespace pages of quests 1977, 1976 and 1433, the minimum level read only from a `PL>` the criterion always requires, the needed items without quest items, the fill rules and every note state), `guide-form-fill` (the live form fill planned from the empty fields, and only the fields still empty after the slug check filled, so what Torre types meanwhile stays) and `guide-autofill` (slugs, slug suffixes, the SEO templates and the 160-character cut, never touching written fields, and `linkedQuestId`). See [Writing a quest guide](../cms/guide-authoring.md#tests);
- guide page: `guide-page-data` (header data with "Misión k de n", the body split into introduction, steps and closing, image priority, the next quest card, SEO), `guide-step-nav` (anchors and the step pin) and `guide-body` (`.test.tsx`: rich text rendering, blocks, fights and steps). See [Public quest guide page](../frontend/guide-page.md#tests);
- achievements: `achievement-game-collections` and `achievement-editorial-collections` (the four collections' fields, access, drafts, state, hooks and panel notes), `achievement-dofusdb-values` (`groupSection`, `fillFromValues`, the note text), `dofusdb-values-endpoint` (status codes of `/api/dofusdb-values`), `achievement-page` (the achievement page view model), `achievement-components` (`.test.tsx`: its parts), `metalogros-index` and `metalogros-search` (the index view model and its search). See [Achievement data model](../achievements/achievement-data.md#tests), [Achievement page](../achievements/achievement-page.md#tests) and [Metalogros index](../achievements/metalogros-index.md#budget-and-tests);
- site shell and home: `site-search` (the shared search engine, its limits, highlighting, one index request and the lazy `import()` boundary), `search-index-endpoint` (gzip and cache headers), `site-shell` (`.test.tsx`: the nav data, header and footer, including the «Próximamente» sections and the Dofus in preparation), `site-live` (`liveState`), `home-hero` and `home-sections` (`.test.tsx`: the home page). See [Site header, footer and search](../frontend/site-shell-and-search.md#tests) and [Home page](../frontend/home-page.md#tests);
- DofusDB refresh: `dofusdb-client` (paging, `$select[]` fields, ID chunks, pauses and errors through an injected fake `fetch`, never the network; retries of network errors and 429, 502, 503 and 504 with doubling waits, jitter, `Retry-After` and one log line each, giving up after 5 attempts with the URL in the error, and no retry on 400 or 404, through injected `sleep`, `log` and `random`), `dofusdb-criterion` (`requiredTerms`: the terms joined by `&` at the top level or inside `&`-only brackets, nothing from a level with `|`, nothing for an empty criterion), `dofusdb-map-quest` (names, start positions, zone, achievement, rewards and needs from the steps, and the prerequisite rule), `dofusdb-quest-rewards` (the level-200 XP and kamas formula against Torre's and dofusdb.fr's figures, the XP range, per-step flooring, the last reward entry, items and IDs), `dofusdb-npc-render` (render URLs and keys), `dofusdb-quest-needs` (which objectives count, the larger-quantity rule between `need.items` and deliveries, `walksMaps`), `dofusdb-fetch-quest-data` (only the NPCs and maps named in start positions are looked up by ID; the sub-areas and areas of the start maps; the whole monster and item catalogs, every achievement and every achievement category come from `fetchAll` with only the fields used), `dofusdb-map-achievement` (objectives, alternatives, the experience of Torre's pages, rewards for level 200, `countsFor`), `dofusdb-game-images` (the 128 px image URL and the per-image key) and `dofusdb-write-concurrency` (`DOFUSDB_WRITE_CONCURRENCY`: empty gives the default, which stays below pg's pool of 10, a positive integer is read, and `0`, `-2`, `1.5` and `ocho` throw);
- shared helpers: `concurrency` (`mapWithConcurrency` keeps input order, never runs more than `limit` tasks, runs them one by one with `limit` 1, rejects with the first error once running tasks settle without starting more, handles an empty list, and rejects a `limit` below 1 or not an integer);
- Squarespace import: `import-parse-page` (title, desktop grid order, text, image and unknown blocks), `import-to-quest-guide` (summary with the "Necesitarás" text as `needs.notes`, start NPC, what leaves the body, the closing paragraph kept whole, callouts, steps with marker titles as bold paragraphs, Torre's recommendations, oddities), `fight-lists` (fight lists turned into fight blocks), `import-restore-closing` (`closingParagraph` and `restoreClosing`), `import-dom` (`releaseDom`), `import-rich-text` (HTML to Lexical through Payload's editor), `import-quest-matches` (the slug to DofusDB IDs CSV) and `import-fetch-image` (image downloads only over `https` from Squarespace's CDN, without redirects and only for `image/*` responses, through an injected fake `fetch`). See [Squarespace import](../data/squarespace-import.md);
- design system: `ui-components` and `game-components` (`.test.tsx` files that render each component with `renderToStaticMarkup` and check its markup, accessible names, hit targets and empty states; see [Design system components](../frontend/design-system-components.md)), `amount` (`.test.tsx`: the U+202F thousands separator), `coordinates`, `display-format` and `video-url` (the guide display helpers), `theme-css` (every semantic token is re-declared for nested `data-theme`/`data-mode`), `fonts` (Montserrat as the only preload, its weights and Lilita One on demand, with `next/font/google` mocked), `emblem` (`.test.tsx`: the emblem, its standalone SVG and the committed favicon) and `design-catalog` (when `/sistema` opens);
- tooling: `commit-msg` (runs the git hook script), `lighthouse-ci` (the `lighthouserc.cjs` assertions and `lhciEnv`; see [Performance budgets](performance-budgets.md)).

## Integration

Real Payload (`getPayload`) against a real Postgres with the committed migrations applied. They check rules that only exist at runtime, such as collection access.

- `vitest.integration.config.mts` runs `tests/integration/**/*.test.ts` with a global setup, `fileParallelism: false` (all files share one database), a 30 s test timeout and a 120 s hook timeout.
- `integrationEnv` sets the environment: `DATABASE_URL` from the shell or the embedded `ta_web_integration` database, `DATABASE_URL_DIRECT` forced to the same URL, a dummy `PAYLOAD_SECRET` when none is set, and every `S3_*` and `MEDIA_BASE_URL` blanked so uploads go to `./media`.
- `tests/integration/global-setup.ts`: with no `DATABASE_URL`, it starts `pnpm db:dev` if port 54329 is closed (and stops it afterwards, or on setup failure), recreates `ta_web_integration`, then runs `pnpm migrate`. With `DATABASE_URL` (CI's empty Postgres service) it only migrates. Starting and stopping Postgres goes through `ensureDevDatabase` and `stopProcess` in `scripts/dev-database-process.ts`, shared with `pnpm test:lhci`.
- Helpers in `tests/integration/payload.ts`: `startPayload`, `tinyPng` (a 1×1 PNG in memory) and `createPanelUser` (creates and logs in a panel user, returning what Payload puts in `req.user`).
- Access tests call the local API with `overrideAccess: false`; omitting `user` makes the call anonymous. See [Collections and access](../cms/collections.md).
- `quest-guides-access.test.ts` goes further than the other access tests: besides who may read and write, it checks that anonymous reads hide drafts, that a panel user can publish a draft and get a version, and that a guide with its [body blocks](../cms/blocks.md), its linked quest, a summary with needs notes and an image saves and reads back. When it finishes it deletes every guide, quest and media document in the integration database.
- `quest-guides-autofill.test.ts` saves guides as a panel user with only a quest linked and checks the fill on save: title, slug, SEO and the summary from DofusDB (quest items left out of the needs list, notes empty), a `-2` slug on collision, written fields and needs lists kept, a guide without title and quest rejected with the Spanish message, an imported guide keeping its slug on edit, and a summary field emptied on update filled again. It deletes every guide, quest and item afterwards. See [Writing a quest guide](../cms/guide-authoring.md#tests).
- `users-lockout.test.ts` checks that five wrong passwords lock a panel account, even for the right password, and that four do not.
- `guide-page-queries.test.ts` runs the guide page queries: published guide with its quest populated, item icons and fight monster images, no draft for a visitor, no result for unknown, malformed or reserved slugs, drafts only in preview with a user, links only to published prerequisite guides, the quest giver with its renders, and the next quest with its published guide.
- `achievement-pages.test.ts`, `achievement-page-queries.test.ts`, `refresh-achievements.test.ts`, `import-achievements.test.ts` and `achievement-fixes.test.ts` cover the achievement collections: values from DofusDB, sections, the pages the refresh creates (idempotent), Torre's edits surviving, the shared slug space, the public page and preview queries, a guide's achievement page and position, the metalogros index read and the achievement and metalogro rows of the search index (`readSearchIndex`), the DofusDB refresh of categories and achievements, Torre's index import (dry run, names, slugs, order, states) and the targeted fixes of `pnpm fix:achievements` (dry run, only the listed entries, siblings shifted in order, idempotent, unpublished drafts skipped). See [Achievement data model](../achievements/achievement-data.md#tests) and [Importing Torre's achievement pages](../data/achievements-import.md#tests).
- `refresh-game-images.test.ts` imports item and monster images once with their key, reuses files, retries failures and collects the targets from quests, achievements, achievement pages and metalogros. See [DofusDB game data refresh](../data/dofusdb-refresh.md#game-images).
- `guide-search-index.test.ts` checks the header search index holds only published guides, their published version, each once and sorted by title; `site-counts.test.ts` checks the header counts as a visitor.
- `restore-closings.test.ts` and `backfill-fights.test.ts` cover `pnpm guides:backfill`: dry runs, applied changes, idempotent reruns, drafts kept as drafts and image retries. See [Squarespace import](../data/squarespace-import.md#bringing-imported-guides-up-to-date).
- `remove-step-title-migration.test.ts` runs the step title migration and checks each title becomes a bold first block of its step. See [Public quest guide page](../frontend/guide-page.md#tests).
- `refresh-npcs.test.ts` runs `refreshNpcs` with a fake renderer: renders imported trimmed with the name as alt, nothing downloaded on a rerun, an unlinked render in `media` reused, a new look adding renders and keeping the old ones, no look meaning no request, and a failing renderer retried on the next run. See [DofusDB game data refresh](../data/dofusdb-refresh.md#npcs-and-their-renders).
- `game-data-access.test.ts` checks `items` and `monsters` at runtime: an anonymous request can `find` and `findByID`, and a panel user gets `Forbidden` on create, update and delete with the data unchanged.
- `refresh-quests.test.ts` runs `refreshQuests` three times against the integration database: the first run creates the fixture quests and skips missing prerequisites, a second run with the same data changes nothing and keeps `refreshedAt`, and a third run updates only what changed and links a prerequisite that now exists. A second block does the same for rewards and needs: it creates the fixture items and monsters and links rewards and needs by Payload ID, a rerun changes nothing, and a third run updates only the renamed item and the changed quest and skips an item DofusDB did not return. A third block runs the refresh over both fixtures with 1 write at a time and then, after deleting the rows, with 8, and expects the same counts and the same stored data, with relationships compared by DofusDB ID. A fourth block feeds the whole fixture catalog, including items no quest names, and checks that every item is created with its `superTypeId` and that a second run writes no item and keeps `refreshedAt`. It deletes its fixture quests, items and monsters before and after. See [DofusDB game data refresh](../data/dofusdb-refresh.md).
- `import-quest-guides.test.ts` runs the Squarespace loader on the five fixture pages with a fake `fetchImage` that returns a 1×1 PNG. It checks drafts with their blocks and the existing quest linked, steps with their coordinates and screenshots, an `ETAPA n:` title saved as the step's bold first paragraph, fight lists turned into fight blocks (and an unknown monster leaving the list as text), one `media` record per image with its URL and alt, the oddities, a second run that changes, downloads and versions nothing, one new draft for a changed guide, the "Necesitarás" text saved as `needs.notes`, a summary field that disappears being filled from the linked quest (its start position and needed item) without extra versions on the next run, no drafts visible to anonymous readers, an invalid slug skipped, and a guide with two DofusDB IDs saved with no quest and the "Varias misiones de DofusDB" oddity. It cleans up its guides, media, quests and item before and after. See [Squarespace import](../data/squarespace-import.md#loading-into-payload).
- `import-disconnect.test.ts` runs `tests/integration/fixtures/import-disconnect.ts` with `corepack pnpm payload run` (25 s limit), with `127.0.0.1` in `DATABASE_URL` rewritten to `localhost`, and expects `RECOVERY_OK` on stdout. The fixture checks that image download failures with network codes stay oddities, then kills the importer's own Postgres backend from a `media` `beforeChange` hook and checks that the load fails, no transaction session or half-saved guide or image is left, and the next load reconciles. Because it injects faults, the fixture refuses any non-local URL (`isLocalDatabaseUrl`) and any database other than `ta_web_integration` or CI's `ta_web`; two more cases assert those refusals. See [Squarespace import](../data/squarespace-import.md#tests).
- `migrations.test.ts` checks that the latest migration rolls back and re-applies: it runs the Payload CLI (`pnpm payload migrate:down`, then `pnpm payload migrate`) with `integrationEnv` and `DATABASE_CONNECTION=direct`, leaving the database as it was. It starts the CLI twice, so it has its own 120 s timeout instead of the suite's 30 s. See [Database and migrations](../data/database.md#migrations).
- `needs-list-migration.test.ts` calls the `20261104_195910_needs_list` migration's `down` and `up` directly on a guide with notes, writes text into the old columns of the guide and its version in between, and checks that after `up` both read it as `summary.needs.notes` with an empty item list. `up` runs in a `finally` so the database never stays on the old schema.
- `guide-single-quest-migration.test.ts` calls the `20261104_210644_guide_single_quest` migration's `down` and `up` directly on a guide linked to one quest. After `down` it checks the quest is a relation row for the guide and its version, then adds a second quest behind it; after `up` (in a `finally`) it checks that `quest_id`, `version_quest_id` and Payload's `quest` on the guide and its versions hold the first quest.

## E2E

`playwright.config.ts` tests the app on the production path, never `next dev`:

1. `pnpm build` (skipped with `E2E_SKIP_BUILD=1`).
2. With no `DATABASE_URL` (a blank or whitespace-only value counts as none, as in `pnpm test:lhci`): start `pnpm db:dev` (reusing a running one) and reset `ta_web_e2e` with `scripts/db-e2e-reset.ts`.
3. `pnpm migrate` on the empty database.
4. `pnpm seed:e2e`: the test guides from `tests/e2e/seed/guides.ts` ("Seis pies bajo tierra" published with an introduction, three steps and a closing, its zone, achievement, XP range and the NPC with renders; its prerequisite's published guide; an unpublished draft), the achievement data from `tests/e2e/seed/achievements.ts` ("La ocasión hace al ladrón" in the Astrub metalogro with the three seeded guides' quests, a published achievement before it and one in preparation after it, and a metalogro with nothing published) and a panel user for the preview tests. `scripts/seed-e2e.ts` refuses any database that is not local (`isLocalDatabaseUrl`).
5. `scripts/clear-data-cache.ts` empties Next's data cache, so no guide cached by an earlier run hides the fresh database.
6. `pnpm start --port 3100` (`E2E_PORT`), a port of its own so a running `pnpm dev` on 3000 is never reused by mistake.

`appWebServers` in `tests/e2e/app-server.ts` builds that server list and passes `DATABASE_URL_DIRECT` equal to `DATABASE_URL`, because `pnpm migrate` prefers the direct URL, and blanks every `S3_*` variable and `MEDIA_BASE_URL` so the seeded image goes to local disk. `playwright.config.ts` adds `E2E_DESIGN_CATALOG=1` to the app's environment, which opens the `/sistema` catalog on this production build; no deployed environment sets it. Only Chromium runs. In CI: one worker, one retry, traces on first retry, GitHub and HTML reporters, and `forbidOnly`.

Specs:

- `smoke.spec.ts`: home renders in Arcano dark; the toggle switches to light and the mode survives reload; the egg medallion per mode and its hover state; the head script recovers the mode from `localStorage` without a cookie; `/admin` responds and hydrates the login form without errors (the seeded panel user exists); `/api/health` is ok.
- `robots.spec.ts`: outside dev, `robots.txt` allows indexing except `/admin`, and the home page has no `X-Robots-Tag`.
- `guia.spec.ts`: the public guide page on the seeded guides (header, mobile NPC and breadcrumb, steps, fight block, next quest card, the single 880 px column, the rewards bag by keyboard and without JavaScript, prose-only guide, SEO, 404, reserved routes, viewer, video at 390px, coordinate copy, axe in Arcano dark and light) and draft preview.
- `logro.spec.ts` and `metalogros.spec.ts`: the achievement page and the metalogros index on the seeded achievement data. See [Achievement page](../achievements/achievement-page.md#tests) and [Metalogros index](../achievements/metalogros-index.md#budget-and-tests).
- `cabecera.spec.ts`: the site header, footer and search dialog, including achievements and metalogros in the search and Clases and Mazmorras shown as «Próximamente» without a panel or link. See [Site header, footer and search](../frontend/site-shell-and-search.md#tests).
- `inicio.spec.ts`: the home page and its hero search, including achievements in their own group and the Clases and Mazmorras cards without a link. See [Home page](../frontend/home-page.md#tests). See [Public quest guide page](../frontend/guide-page.md#tests).
- `brand.spec.ts`: the favicon SVG, PNG fallback and iOS icon links, the emblem left of the name in the header with the theme colors, 30px on phones, and axe on the header in Arcano dark and light.
- `fonts.spec.ts`: the home page and the guide preload only the Montserrat file, and every Montserrat weight comes from that file in one family.
- `sistema.spec.ts`: the `/sistema` component catalog in all five themes and both modes: figures with the narrow no-break thousands space, every component group visible, hand-written CSS following each section's theme, coordinate copy, 40px hit targets, dark icon wells in light mode, no YouTube request before a video click, the 480px screenshot on a phone, the fullscreen image viewer (open, close, focus return, theme), and axe (`@axe-core/playwright`, WCAG 2.2 AA tags) on the open viewer and the whole page. See [Component catalog (/sistema)](../frontend/component-catalog.md).

## Dev environment

`playwright.dev-gate.config.ts` starts one instance of the same build with `APP_ENV=dev` on port 3101 (`E2E_DEV_GATE_PORT`), seeded like the E2E app. With `E2E_SKIP_BUILD=1` it reuses the E2E build, which works because the proxy reads the environment at startup, not at build. The cases (public pages, `noindex` everywhere, no basic-auth challenge, `robots.txt`) are in [Dev environment](../operations/dev-gate.md#tests).

## Smoke

`pnpm test:smoke` runs only tests tagged `@smoke` (home, `/admin`, `/api/health`). They only read, so they are safe against dev or production.

- Without `SMOKE_BASE_URL` it behaves like E2E and starts a local server.
- With `SMOKE_BASE_URL` it tests that URL and starts nothing: no build, no migrations, no database.

## Budgets

`pnpm test:lhci` runs Lighthouse CI against the production path on its own `ta_web_lhci` database, three mobile runs per page against the `DESIGN.md` budgets (LCP, CLS, compressed JavaScript, image size and format). In CI it runs inside the E2E job on that job's build. See [Performance budgets](performance-budgets.md).

## Fixtures

`tests/fixtures/dofusdb/` holds real DofusDB rows (`quests.json`, `npcs.json`, `map-positions.json`) shared by the DofusDB unit tests and `refresh-quests.test.ts`. The quests cover a plain criterion, several start positions, alternatives joined by `|` and a `Qa=` term. `quests-steps.json` adds nine quests with their steps, rewards and objectives, and `items.json` and `monsters.json` hold exactly the items and monsters those quests name; they feed the rewards, needs, fetch and refresh tests. `items-unreferenced.json` adds three items no fixture quest names (a sword and two quest items of supertype 14), so the fetch and refresh tests can check that the whole catalog is stored. `achievements.json` and `achievement-categories.json` hold real DofusDB achievements and categories for the achievement mapping and refresh tests.

`tests/fixtures/squarespace/` holds trimmed copies of the five demo Squarespace pages and six more real pages used by the recommendations tests, one HTML file per slug, read by the import unit tests. Prettier ignores the directory so the files stay byte for byte as the parser expects.

## Guards against touching real data

- Playwright reads only `E2E_PORT`, `E2E_DEV_GATE_PORT` and `E2E_SKIP_BUILD` from `.env` (`loadE2eEnvFromFile`); a `DATABASE_URL` in `.env` never reaches the tests, and the smoke variables come only from the shell. The process environment always wins.
- E2E, integration and Lighthouse CI use their own databases (`ta_web_e2e`, `ta_web_integration`, `ta_web_lhci`), dropped and recreated per run, so local dev data in `ta_web` is untouched.
- All three force `DATABASE_URL_DIRECT` to the test database so `pnpm migrate` cannot follow a direct URL inherited from the shell. `tests/unit/test-database-env.test.ts` pins this for integration and E2E, and that E2E treats a blank `DATABASE_URL` as empty; `tests/unit/lighthouse-ci.test.ts` pins it for `lhciEnv`.

## Related pages

- [CI and quality gates](../workflows/ci-and-quality-gates.md)
- [Database and migrations](../data/database.md)
- [Dev environment](../operations/dev-gate.md)
- [Public quest guide page](../frontend/guide-page.md)
- [DofusDB game data refresh](../data/dofusdb-refresh.md)
- [Collections and access](../cms/collections.md)
- [Guide body blocks](../cms/blocks.md)
- [Writing a quest guide](../cms/guide-authoring.md)
- [Squarespace import](../data/squarespace-import.md)
- [Performance budgets](performance-budgets.md)
- [Component catalog (/sistema)](../frontend/component-catalog.md)
