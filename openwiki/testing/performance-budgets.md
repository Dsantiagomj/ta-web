---
type: workflow
title: Performance budgets (Lighthouse CI)
description: How pnpm test:lhci builds and starts the app on the production path, which DESIGN.md budgets lighthouserc.cjs asserts and how runs are aggregated, why LCP uses the best of three runs, and how CI runs it inside the E2E job and keeps the reports.
tags: [performance, lighthouse, ci, budgets, testing]
sources:
  - id: openwiki-source-164e2da859b5277df81c7d94
    resource: repo://.github/workflows/ci.yml
  - id: openwiki-source-ea70eb6c045047448e446296
    resource: repo://.gitignore
  - id: openwiki-source-f235d856bed1fd44853c5195
    resource: repo://.prettierignore
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-c8e16e16c743abca9f070b43
    resource: repo://docs/legacy/security.md
  - id: openwiki-source-2fda883e9b76745f69f487f7
    resource: repo://eslint.config.mjs
  - id: openwiki-source-7382aecd8b46a81ca66efc96
    resource: repo://lighthouserc.cjs
  - id: openwiki-source-f0b0dfee6a793bb5e8050714
    resource: repo://scripts/lhci-env.ts
  - id: openwiki-source-95f46342bb37caacc4ce1dbc
    resource: repo://scripts/lhci.ts
  - id: openwiki-source-4d5101e22a43d90e5f3610c9
    resource: repo://src/components/dofus/DofusGuideParts.tsx
  - id: openwiki-source-fdce55e7847bc02f550db2a4
    resource: repo://src/components/dofus/DofusIndex.tsx
  - id: openwiki-source-cf83a6bbb1b6a5159842a86a
    resource: repo://tests/unit/lighthouse-ci.test.ts
generated: { by: "claude-code", at: "2026-11-12T11:00:44.802Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-12T11:00:44.802Z
---

# Performance budgets (Lighthouse CI)

`DESIGN.md` (Performance budgets) sets four limits. `pnpm test:lhci` enforces them with Lighthouse CI on every PR and push to `main`:

| Budget | Limit | Lighthouse audit |
|---|---|---|
| LCP, mobile on 4G | under 2.5 s | `largest-contentful-paint` |
| CLS | under 0.1 | `cumulative-layout-shift` |
| JavaScript | under 150 KB compressed | `resource-summary:script:size` (bytes transferred, 1000-byte KB) |
| Images | explicit size and an AVIF or WebP source | `unsized-images` (fails) and `image-delivery-insight` (warns) |

DESIGN.md sets the JavaScript limit for guide pages; every page measured is held to it. The Lighthouse performance score is not asserted, because it varies between runs.

## The page list

`lighthouserc.cjs` keeps one line per page in `PAGES`, measured against `http://localhost:3110`. Today it holds six pages: the home page (`/`); a quest guide, `/seis-pies-bajo-tierra`, and an achievement page, `/la-ocasion-hace-al-ladron`, which `scripts/seed-e2e.ts` seeds from `tests/e2e/seed/guides.ts` and `tests/e2e/seed/achievements.ts`; the metalogros index, `/metalogros`; the Dofus guides index, `/guias-dofus`; and a Dofus guide, `/dofus-ocre`, seeded from `tests/e2e/seed/dofus-guides.ts`. A checklist joins the list, one line, in the PR that adds its route. The `/sistema` component catalog is deliberately not measured. See [Component catalog (/sistema)](../frontend/component-catalog.md).

## Assertions

Each page is loaded three times (`numberOfRuns: 3`) with no preset, so Lighthouse emulates a phone (412 px wide, DPR 1.75). Throttling is applied for real through DevTools (`throttlingMethod: 'devtools'`) with Lighthouse's slow-4G mobile values adjusted for DevTools: 150 ms RTT, about 1.6 Mbps, 562.5 ms request latency and the CPU four times slower. Simulated throttling (Lantern) charged all main-thread JavaScript to the LCP image: with a guide's first screenshot as LCP it reported about 3 s although the image painted at 150 ms. Real throttling measures when the page paints. On Linux in CI, Chromium runs with `--no-sandbox` because Playwright's build does not start with the user namespace sandbox there.

The assertions use `assertMatrix` so LCP can carry two assertions. Neither entry has a `matchingUrlPattern`, so both apply to every page:

- **First entry.** LCP fails when the best of the three runs (`aggregationMethod: 'optimistic'`) is over 2500 ms. CLS (over 0.1), script size (over 150 000 bytes) and unsized images fail on the median. Image delivery below a score of 1 only warns: Lighthouse 13 merged responsive images and modern formats into that insight, and at the emulated DPR of 1.75 a 380 px screenshot picks the 800w candidate, which the insight counts as waste, while real phones (DPR 2 to 3) get a fitting width. `Picture` and the media sizes, with their tests, guarantee the AVIF or WebP format.
- **Second entry, a warning.** LCP over 2500 ms on the median only warns.

The best run absorbs the noise of measuring on localhost. A regression that makes every run slow still fails, and the median warning keeps a slow trend visible without blocking a PR.

## What `pnpm test:lhci` does

`scripts/lhci.ts` runs the app the same way the E2E suite does, on the production path, and then hands the URLs to `lhci autorun`:

1. Loads `E2E_PORT`, `E2E_DEV_GATE_PORT` and `E2E_SKIP_BUILD` from `.env` with the E2E loader (`loadE2eEnvFromFile`); nothing else from `.env`.
2. Builds the app environment with `lhciEnv` (`scripts/lhci-env.ts`): both `DATABASE_URL` and `DATABASE_URL_DIRECT` point at the configured `DATABASE_URL` or, without one, at the `ta_web_lhci` database of the embedded Postgres; `PAYLOAD_SECRET` gets a dummy value when unset; `APP_ENV` is blank so it measures the production site, without the dev `noindex` header; every `S3_*` variable and `MEDIA_BASE_URL` are blank so uploads go to `./media` even if the shell has R2 credentials. Pointing the direct URL at the same database matters because `pnpm migrate` prefers it, and one inherited from the shell would migrate a real database.
3. Fails early if the browser is missing (`CHROME_PATH`, or Playwright's Chromium from `chromium.executablePath()`) with a hint to run `pnpm exec playwright install chromium`, or if port 3110 is already taken, since Lighthouse would then measure another app.
4. Without `DATABASE_URL`, starts the embedded Postgres if it is not running (`ensureDevDatabase`) and drops and recreates `ta_web_lhci`. See [Database and migrations](../data/database.md).
5. Runs `pnpm build` unless `E2E_SKIP_BUILD=1`, then `pnpm migrate`, then `pnpm seed:e2e` (the guide it measures; in CI the database already has it from the E2E run and nothing is duplicated), and empties Next's data cache so no guide cached by an earlier run is measured.
6. Deletes `.lighthouseci/`, so the directory only holds this run's reports.
7. Starts `pnpm start --port 3110` as a detached process group and polls the base URL every 500 ms for up to 120 seconds, failing at once if the process exits first.
8. Runs `pnpm exec lhci autorun` with `CHROME_PATH` set to the chosen browser, and exits with its status.

Whatever happens, cleanup stops the whole `pnpm start` process group (pnpm launches `next` as a child) and the Postgres it started; a Postgres that was already running is left alone. Ctrl-C runs the same cleanup and exits with 130. Any setup error is printed and exits with status 1.

Reports go to `.lighthouseci/reports/` on disk only (`upload.target: 'filesystem'`); nothing is sent to Lighthouse's temporary public storage. `.lighthouseci/` is ignored by git, Prettier and ESLint.

## In CI

The budgets run as the "Presupuestos (Lighthouse CI)" step at the end of the E2E job in `.github/workflows/ci.yml`, with `E2E_SKIP_BUILD=1`. They reuse that job's build, its empty Postgres 17 service (through `DATABASE_URL`) and Playwright's Chromium, instead of compiling again in a job of their own. Because the step is in the E2E job, a budget failure fails `Pruebas`.

The next step, "Informes de Lighthouse", runs unless the workflow was cancelled and uploads `.lighthouseci/reports/` and `.lighthouseci/assertion-results.json` as the `lighthouse` artifact, kept 7 days. See [CI and quality gates](../workflows/ci-and-quality-gates.md).

`@lhci/cli` brings a known high advisory in `basic-ftp`, reachable only when fetching a PAC file over `ftp://`; Lighthouse CI here only talks to `localhost`. It is listed as accepted in `docs/legacy/security.md`.

## What keeps the budgets

DESIGN.md names the mechanisms: server components, fonts through `next/font` with fallback metrics, CSS motion, no image work on request, and the Motion library confined to client islands. In the code today:

- `src/styles/fonts.ts` preloads only Montserrat, one variable latin file with every weight, and `fonts-fallback.css` adds metric fallbacks for systems without Arial (see [Styles, tokens and site shell](../frontend/styles-and-shell.md)).
- `Picture` always writes `width` and `height` and adds an AVIF source and `srcset` when the asset has them; the guide's first image is loaded with priority.
- The guide and achievement pages ship one small client island (see [Design system components](../frontend/design-system-components.md)).
- Both searches load their engine, results and the search index (guides, achievement pages and metalogros) with `import()` on first use, never with the page. The guide page and the home page each sat at about 149,700 bytes of script on 2026-11-07, just under the 150,000-byte limit, so search and result code must stay out of the islands, and a module imported by both an island and a lazy chunk ships whole with the island (see [Site header, footer and search](../frontend/site-shell-and-search.md#keeping-it-out-of-the-initial-javascript)).
- Render-blocking CSS is kept small: the home page avoids importing `game.css`, `Amount` styles live in `globals.css` rather than `ui.css`, and `/metalogros` imports only `metalogros.css`, because importing the guide and achievement stylesheets split them into more chunks and raised its LCP by about half a second. The Dofus guide styles live inside `achievement.css`, so `/<slug>` still loads four render-blocking stylesheets, and `/guias-dofus` loads only `dofus-index.css` (with its own copy of the «En preparación» pill) and three stylesheets in all; a separate `dofus.css` had pushed the guide pages past 2.5 s of LCP in CI. On the index the first cards' eggs are the LCP and are not lazy-loaded (see [Home page](../frontend/home-page.md#budget) and [Metalogros index](../achievements/metalogros-index.md#server-html)).

## Tests

`tests/unit/lighthouse-ci.test.ts` pins the configuration so a change to it is deliberate:

- three runs per page with no preset and real slow-4G and CPU throttling, against the local home page, the seeded guide and the seeded achievement page;
- `/guias-dofus` and the Dofus guide `scripts/seed-e2e.ts` seeds are measured too;
- every matrix entry applies to all pages;
- LCP errors on the best run over 2.5 s and warns on the median;
- CLS and script size fail on the median, as do unsized images; image delivery only warns;
- the performance score is not asserted;
- reports stay on disk and never use the temporary public storage;
- `lhciEnv` uses its own embedded database without `DATABASE_URL`, points the direct URL at the same database, and starts without the dev mode and without R2.

## Related pages

- [Test suites](test-suites.md)
- [CI and quality gates](../workflows/ci-and-quality-gates.md)
- [Database and migrations](../data/database.md)
- [Styles, tokens and site shell](../frontend/styles-and-shell.md)
- [Home page](../frontend/home-page.md)
- [Site header, footer and search](../frontend/site-shell-and-search.md)
- [Environment configuration](../architecture/configuration.md)
