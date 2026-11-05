---
type: workflow
title: Performance budgets (Lighthouse CI)
description: How pnpm test:lhci builds and starts the app on the production path, which DESIGN.md budgets lighthouserc.cjs asserts and how runs are aggregated, why LCP uses the best of three runs, and how CI runs it inside the E2E job and keeps the reports.
tags: [performance, lighthouse, ci, budgets, testing]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-05T11:00:19.182Z
sources:
  - id: openwiki-source-164e2da859b5277df81c7d94
    resource: repo://.github/workflows/ci.yml
  - id: openwiki-source-ea70eb6c045047448e446296
    resource: repo://.gitignore
  - id: openwiki-source-f235d856bed1fd44853c5195
    resource: repo://.prettierignore
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
  - id: openwiki-source-cf83a6bbb1b6a5159842a86a
    resource: repo://tests/unit/lighthouse-ci.test.ts
generated: { by: "claude-code", at: "2026-11-05T11:00:19.182Z" }
---

# Performance budgets (Lighthouse CI)

`DESIGN.md` (Performance budgets) sets four limits. `pnpm test:lhci` enforces them with Lighthouse CI on every PR and push to `main`:

| Budget | Limit | Lighthouse audit |
|---|---|---|
| LCP, mobile on 4G | under 2.5 s | `largest-contentful-paint` |
| CLS | under 0.1 | `cumulative-layout-shift` |
| JavaScript | under 150 KB compressed | `resource-summary:script:size` (bytes transferred, 1000-byte KB) |
| Images | explicit size and an AVIF or WebP source | `unsized-images` and `image-delivery-insight` |

DESIGN.md sets the JavaScript limit for guide pages; every page measured is held to it. The Lighthouse performance score is not asserted, because it varies between runs.

## The page list

`lighthouserc.cjs` keeps one line per page in `PAGES`, measured against `http://localhost:3110`. Today it holds only the home page (`/`). A quest guide, an achievement and a checklist join the list, one line each, in the PR that adds their route. The `/sistema` component catalog is deliberately not measured. See [Component catalog (/sistema)](../frontend/component-catalog.md).

## Assertions

Each page is loaded three times (`numberOfRuns: 3`) with Lighthouse's default settings: no preset, so an emulated phone on simulated slow 4G. On Linux in CI, Chromium runs with `--no-sandbox` because Playwright's build does not start with the user namespace sandbox there.

The assertions use `assertMatrix` so LCP can carry two assertions. Neither entry has a `matchingUrlPattern`, so both apply to every page:

- **First entry, errors.** LCP fails when the best of the three runs (`aggregationMethod: 'optimistic'`) is over 2500 ms. CLS (over 0.1), script size (over 150 000 bytes), unsized images and image delivery (score below 1) fail on the median.
- **Second entry, a warning.** LCP over 2500 ms on the median only warns.

The split exists because simulated LCP on localhost is bimodal: the same page under the same load lands around 0.9 s or around 2.8 s, so a median assertion would fail without any change. A regression that makes every run slow still fails on the best run, and the median warning keeps a slow trend visible without blocking a PR.

## What `pnpm test:lhci` does

`scripts/lhci.ts` runs the app the same way the E2E suite does, on the production path, and then hands the URLs to `lhci autorun`:

1. Loads `E2E_PORT`, `E2E_DEV_GATE_PORT` and `E2E_SKIP_BUILD` from `.env` with the E2E loader (`loadE2eEnvFromFile`); nothing else from `.env`.
2. Builds the app environment with `lhciEnv` (`scripts/lhci-env.ts`): both `DATABASE_URL` and `DATABASE_URL_DIRECT` point at the configured `DATABASE_URL` or, without one, at the `ta_web_lhci` database of the embedded Postgres; `PAYLOAD_SECRET` gets a dummy value when unset; `APP_ENV` is blank so it measures the public site rather than the dev gate's 401; every `S3_*` variable and `MEDIA_BASE_URL` are blank so uploads go to `./media` even if the shell has R2 credentials. Pointing the direct URL at the same database matters because `pnpm migrate` prefers it, and one inherited from the shell would migrate a real database.
3. Fails early if the browser is missing (`CHROME_PATH`, or Playwright's Chromium from `chromium.executablePath()`) with a hint to run `pnpm exec playwright install chromium`, or if port 3110 is already taken, since Lighthouse would then measure another app.
4. Without `DATABASE_URL`, starts the embedded Postgres if it is not running (`ensureDevDatabase`) and drops and recreates `ta_web_lhci`. See [Database and migrations](../data/database.md).
5. Runs `pnpm build` unless `E2E_SKIP_BUILD=1`, then `pnpm migrate`.
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

DESIGN.md names the mechanisms: server components, fonts through `next/font` with fallback metrics, CSS motion, no image work on request, and the Motion library confined to client islands. In the code today, `src/styles/fonts.ts` preloads only the first-paint families (see [Styles, tokens and site shell](../frontend/styles-and-shell.md)), `Picture` always writes `width` and `height` and adds an AVIF source when the asset has one, and the guide components ship one small client island (see [Design system components](../frontend/design-system-components.md)).

## Tests

`tests/unit/lighthouse-ci.test.ts` pins the configuration so a change to it is deliberate:

- three runs per page with no preset, against the local home page;
- every matrix entry applies to all pages;
- LCP errors on the best run over 2.5 s and warns on the median;
- CLS and script size fail on the median, as do unsized images and non-modern formats;
- the performance score is not asserted;
- reports stay on disk and never use the temporary public storage;
- `lhciEnv` uses its own embedded database without `DATABASE_URL`, points the direct URL at the same database, and starts without the dev mode and without R2.

## Related pages

- [Test suites](test-suites.md)
- [CI and quality gates](../workflows/ci-and-quality-gates.md)
- [Database and migrations](../data/database.md)
- [Styles, tokens and site shell](../frontend/styles-and-shell.md)
- [Environment configuration](../architecture/configuration.md)
