# Torrente Arcano

The new torrentearcano.com: Dofus quest guides, achievements, classes and checklists, with member accounts and premium features. It replaces the Squarespace site and the embeds served from `silvestre-checklist`.

Stack: Next.js + Payload CMS 3, Postgres, Cloudflare R2, Better Auth.

The generated documentation starts at [openwiki/quickstart.md](openwiki/quickstart.md). The original plan, decisions and phases are in [docs/legacy/plan.md](docs/legacy/plan.md). Agent rules are in [AGENTS.md](AGENTS.md) and visual rules in [DESIGN.md](DESIGN.md).

## Development

### Prerequisites

- Node 24.22.1 or later in the 24 line (`engines.node` in `package.json`; `.nvmrc` says `24`) and pnpm 11 (`corepack enable` picks the version in `package.json`).
- No Docker and no local Postgres. `pnpm db:dev` runs Postgres 17 from the `embedded-postgres` package.
- Optional, for the AI review in the pre-commit hook: [`gga`](https://github.com/Gentleman-Programming/gentleman-guardian-angel) (`brew install gentleman-programming/tap/gga`) and the Claude Code CLI, logged in.

### First run

```sh
pnpm install          # also installs the git hooks
cp .env.example .env  # then set PAYLOAD_SECRET (openssl rand -hex 32)
pnpm db:dev           # terminal 1: Postgres on 127.0.0.1:54329, data in .postgres/
pnpm dev              # terminal 2: http://localhost:3000, panel at /admin
```

`pnpm dev` keeps the local database in sync with the collections through Payload's schema push. Push runs only under `next dev`. Everywhere else, including E2E and CI, the schema comes from the committed migrations in `src/migrations/`, applied with `pnpm migrate`. On an empty database, `/admin` asks for the first panel user.

After changing a collection, run `pnpm migrate:create <name>` and `pnpm generate:types`, and commit both results with the change.

With `DATABASE_URL` empty, the app connects to the `pnpm db:dev` database. Set `DATABASE_URL` to use another one, such as a Neon branch; it always wins. In production the app refuses to start without it.

The component catalog is at `/sistema` under `pnpm dev`: every component from `DESIGN.md` in the five themes and both modes. `?tema=bonta&modo=light` keeps one section. In production it answers 404.

Media uploads go to `./media` unless the four `S3_*` variables point at an R2 bucket. `.env.example` explains every variable.

To reset the local database, stop `pnpm db:dev` and delete `.postgres/`.

The local database is called `ta_web` (it was `torrente_arcano` before the repo was renamed). `pnpm db:dev` creates an empty `ta_web` when it is missing, so to keep data from the old one, drop that empty database and rename the old one into its place, once, with `pnpm db:dev` running and the app stopped:

```bash
psql postgres://postgres:postgres@127.0.0.1:54329/postgres \
  -c 'DROP DATABASE IF EXISTS ta_web' \
  -c 'ALTER DATABASE torrente_arcano RENAME TO ta_web'
```

Only do this if `ta_web` is the empty database `pnpm db:dev` just created; dropping it deletes whatever it holds.

Without `psql`, start over instead: stop `pnpm db:dev`, delete `.postgres/` and run `pnpm migrate`.

### Smoke tests against a deployed URL

The `@smoke` tests only read, so they can run against dev or prod after a deploy. Set `SMOKE_BASE_URL` and Playwright skips the build, the migrations and the local database:

```sh
SMOKE_BASE_URL=https://dev.example.com pnpm test:smoke
```

Playwright reads these variables from the shell, never from `.env`, so a leftover value cannot point `pnpm test:e2e` at a deployment. The `Smoke` workflow (`.github/workflows/smoke.yml`) runs the same command from Actions, by hand (`workflow_dispatch`) or from another workflow (`workflow_call`) with a `base_url` input. `Smoke de dev` calls it after every successful dev deploy, and `Release` after every prod deploy (see Deploys).

`GET /api/health` is liveness only. It returns `200` with `{ status, version, commit }` and never queries the database (`version` is the release version in production, set by the release workflow as `APP_VERSION`, and the `package.json` version elsewhere). Uptime monitors and anything else periodic call it, so Neon can scale to zero.

`GET /api/ready` checks the database. It returns `200` with `{ status, db, version, commit }` when the database answers within 2 s, and `503` with `{ status: 'error', db: 'error' }` when it does not. Only the smoke suite and manual checks call it, because each call wakes the Neon compute.

Both need no auth and are never cached.

### Dev gate

Dev is public but never indexed. With `APP_ENV=dev`, or on Railway's `dev` environment (`RAILWAY_ENVIRONMENT_NAME=dev`), `src/proxy.ts` adds `X-Robots-Tag: noindex, nofollow` to every response (pages, `/admin`, the API and static files) and `robots.txt` disallows everything, so search engines never list dev as a copy of production. There is no basic auth. The panel is protected by its own Payload login, which locks an account for 10 minutes after 5 failed attempts (`src/collections/Users.ts`).

Outside dev the proxy does nothing and `robots.txt` allows indexing, except `/admin`. To try dev mode locally:

```sh
APP_ENV=dev pnpm dev
```

### Deploys

Railway hosts both environments; `docs/legacy/infra.md` has the inventory, the decisions and what is left.

- `.railway/railway.ts` is the service config as code: Railpack with Node 24, `pnpm build`, `pnpm start`, `pnpm migrate` as the pre-deploy command, the `/api/health` health check, restart on failure, US East. Railway does not read it on deploy. Apply it per environment with `railway config plan` and `railway config apply`. `tests/unit/railway-config.test.ts` evaluates it for both environments.
- Dev: Railway deploys every push to `main` once the GitHub checks pass. `.github/workflows/deploy-dev-smoke.yml` then waits until `/api/health` on `DEV_URL` reports the deployed commit and runs the smoke suite against `DEV_URL`. Railway's deployment `environment_url` points at its dashboard, not the app, so the workflow does not use it.
- Errors: `src/instrumentation.ts` sends server errors to Sentry (org `dsmjdev`, project `ta-web`) when `SENTRY_DSN` is set and the environment is `dev` or `production`. Each event carries the deployed commit as its release, the same one `/api/health` reports. There is no browser SDK, so client errors are not captured. Local runs and CI send nothing. Source maps are uploaded only when `SENTRY_AUTH_TOKEN` is set at build time.
- Prod: `.github/workflows/release.yml`, run by hand from `main` with a semver `version`. Run `pnpm review:release` first and fix or knowingly accept what it finds. Only the repository owner can start or re-run it: GitHub offers no required reviewers on environments of private repositories, so that check is the approval, and the `production` environment only accepts deployments from `main`. It checks that `Pruebas` passed on the commit, creates the `vX.Y.Z` tag and its GitHub release, deploys the tag with the Railway CLI, checks that `/api/health` reports the tagged commit, and runs the smoke suite against `PROD_URL`.

### Scripts

| Script | What it does |
|---|---|
| `pnpm dev`, `pnpm build`, `pnpm start` | Next.js |
| `pnpm lint`, `pnpm format`, `pnpm format:check` | ESLint (Next config) and Prettier. Prettier skips Markdown, so doc tables stay hand-aligned |
| `pnpm typecheck` | `next typegen`, then `tsc --noEmit` |
| `pnpm test` | Vitest unit tests in `tests/unit/` |
| `pnpm test:integration` | Vitest tests in `tests/integration/` that boot Payload with `getPayload` and check access rules through the local API. A global setup runs `pnpm migrate` first. With `DATABASE_URL` empty it starts `pnpm db:dev` if needed (and stops it afterwards) and recreates the separate `ta_web_integration` database. Uploads go to `./media`; the `S3_*` variables are ignored |
| `pnpm test:e2e` | Playwright tests in `tests/e2e/`, on the production path: `pnpm build`, `pnpm migrate` on an empty database, then `pnpm start` on port 3100. With `DATABASE_URL` empty it starts `pnpm db:dev` if needed and recreates the separate `ta_web_e2e` database, so your dev data is untouched. `E2E_SKIP_BUILD=1` reuses the last build. Install the browser once with `pnpm exec playwright install chromium` |
| `pnpm test:e2e:dev-gate` | Playwright tests in `tests/e2e-dev-gate/` against the app with `APP_ENV=dev` on port 3101. `E2E_SKIP_BUILD=1` reuses the build of `pnpm test:e2e` |
| `pnpm test:lhci` | Lighthouse CI (`lighthouserc.cjs`) against the production path, like `pnpm test:e2e`: `pnpm build`, `pnpm migrate` on an empty database, then `pnpm start` on port 3110. Three mobile runs per page with simulated 4G, against the budgets in `DESIGN.md`: the median must meet each one, except LCP, which fails only when the best run misses it and warns when the median does, because simulated LCP on localhost swings between about 0.9 and 2.8 s. With `DATABASE_URL` empty it starts `pnpm db:dev` if needed and recreates the separate `ta_web_lhci` database. `E2E_SKIP_BUILD=1` reuses the last build. It measures with Playwright's Chromium unless `CHROME_PATH` names another browser. Reports go to `.lighthouseci/` and never leave the machine. Pages are listed in `lighthouserc.cjs`, one line each: the home today |
| `pnpm review:release` | AI review of the next release, run by hand before `release.yml`. It reviews the diff from the last `v*` tag on `origin/main` (or `--since <ref>`) to `origin/main`, filtered by the patterns in `.gga` and split into batches of about 120k characters. Each batch goes to `claude --print` on Fable (`RELEASE_REVIEW_MODEL` picks another), three at a time, on a detached worktree of `origin/main` with only Read, Grep and Glob. The Markdown report lands in `../ta-web-worktrees/`, outside the repo. It exits 1 when a batch fails or errors. `--dry-run` lists the batches without calling Claude |
| `pnpm test:smoke` | The `@smoke` Playwright subset: home, `/admin`, `/api/health` and `/api/ready`. Without `SMOKE_BASE_URL` it runs against the local server, like `pnpm test:e2e`. With it, it tests that URL and starts nothing locally (see below) |
| `pnpm db:dev` | Embedded Postgres in the foreground; `--verbose` prints its log |
| `pnpm migrate` | Applies pending migrations from `src/migrations/` to `DATABASE_URL_DIRECT` (Neon's non-pooled URL) when it is set, otherwise to `DATABASE_URL` |
| `pnpm data:quests` | Downloads every quest from the public DofusDB API (about 2,000), the whole monster catalog (about 5,000, so the fight blocks of the guides can name any monster) and the whole item catalog (about 21,500, so a guide can list any item), and writes them to the `quests`, `items` and `monsters` collections of the `DATABASE_URL` database, or the `pnpm db:dev` one when it is empty. The download takes about two and a half minutes; writing takes about 10 seconds on the first run against `pnpm db:dev` and under a second after that. Runs with `payload run`. Then it saves every achievement category and the achievements of the categories under Misiones and Eventos (about 450): their quests in order, one row per quest with its alternatives, the points, the rewards for a level 200 character with the formula of Torre's pages, and the game meta-achievements that require them, and imports their icons. It saves every subarea with its area (about 570), since quest objectives keep only the subarea ID. After that it saves the NPCs that give a quest or that a quest objective names (about 2,500) and imports their renders, and imports the 128px icon of every item a quest rewards or needs or a guide lists, and the image of every monster a quest needs, a fight block names or a dungeon has as its boss, into Media (`DESIGN.md`, Imagery). It also saves every dungeon with its bosses (about 190), and at the end prints the dungeon notes of published guides that match no dungeon, which keep the generic icon in «Necesitarás en total». Re-running it changes only what DofusDB changed, downloads no image it already has and never deletes a row. The first run after the objective NPCs were added (November 2026) is long: on dev it creates about 1,781 NPCs and imports about 3,562 renders, which should take roughly 25 to 60 minutes (each render took about 0.7 s to download and resize in a local measurement, plus its upload to R2; four NPCs go at a time). If it stops halfway, run it again: it finds the NPCs and renders it already saved and carries on with the rest |
| `pnpm import:guides <dir> [slug…]` | Imports Squarespace quest pages into `quest-guides` as drafts. `<dir>` is the migration inventory folder (`raw/pages/<slug>.html` and `out/quest_matches.csv`); without slugs it imports the five in `GUIDE_SLUGS` (`scripts/import/squarespace/to-quest-guide.ts`). Downloads each image once into `media`, keyed by its original URL, links quests already in `quests` (run `pnpm data:quests` first) and prints the oddities per page. Writes to the `DATABASE_URL` database, or the `pnpm db:dev` one when it is empty. Re-running it updates the drafts and never publishes or duplicates anything |
| `pnpm import:achievements <datos.json> [--apply] [--remote] [--production]` | Brings Torre's current metalogros index into `achievement-groups` and `achievement-pages`: his order, names, slugs, the state of each metalogro (green in his index is «Publicada») and of each achievement (the `ready` computed by the prototype), the representatives he chose by hand (it imports the NPC and its renders when it is missing) and the loose guides of each metalogro. `<datos.json>` is `tmp/mockups/comun/indice/datos.json`, built by `datos.mjs` and `estado.mjs` there; the states are copied, not derived. Run it after `pnpm data:quests`, which creates the metalogros and the pages of the achievements with quests. Pages of achievements Torre does not list go after his, in game order, and keep their state. Without `--apply` it only counts. It is the migration of his site: a second run overwrites what changed in the panel. It refuses a remote database without `--remote` and production without `--production` |
| `pnpm fix:achievements [--apply] [--remote] [--production]` | Targeted fixes to a database that already ran `pnpm import:achievements`, listed in `TORRE_FIXES` (`scripts/import/load-achievement-fixes.ts`): a metalogro's representative (only when it has none), an achievement page's state, name, slug and place in its metalogro (the other pages shift without changing their relative order), and loose guides appended to a metalogro. It touches nothing else, skips an entry with an unpublished draft in the panel, and compares before writing, so a second run changes nothing. Without `--apply` it prints what it would change. Same database guards as the import |
| `pnpm import:checklists --from <silvestre-checklist> [--only <id>] [--apply] [--remote] [--production]` | Brings Torre's checklists from a local copy of `silvestre-checklist` into `checklists` (`scripts/import/checklists/`). The ported ones (today only `nebuloso`) arrive whole as a draft in the «En preparación» state: his step texts split into plain, «Detente aquí» and «Aquí se resuelve» segments without changing a word, each stop on the same objective index the old app computed, the closed steps as stepIds, quests with their kind, achievements, every need row in its order with its quantity, note, group and whether it counts in the totals (a row that is not a game item, such as «Kama» or a spell, keeps its text as `label`), figure, bosses, the step icon, banner (the start map, or the zone art), zone (his grouping of the steps), hand-written notes, prerequisites and what the progress migration needs (`legacy`). The others (`silvestre`, `hielos`, `ocre`) are created published as «En preparación» entries with no steps, linking their Squarespace page. `--only <id>` limits it to one. It brings the items and NPCs DofusDB has that are missing, with their icon or renders, and uploads the start maps, zone art and figures that are not NPCs from `public/img/` into Media once, keyed by `media.gameAsset`. Before writing it prints what it could not match and leaves out (quests, achievements, NPCs, bosses, images, the Dofus guide, a stop beyond its quest's stored objectives), the need rows it keeps as text, and what it would bring or upload. Without `--apply` it only counts. Re-running it changes nothing that is unchanged, only rewrites a field that still holds what the last run wrote (`importSnapshot`), and keeps each step's stepId through its old step number. Run it after `pnpm data:quests`. Writes to the `DATABASE_URL` database, or the `pnpm db:dev` one when it is empty; it refuses a remote database without `--remote` and production without `--production` |
| `pnpm guides:backfill <dir> [--apply] [--remote] [--production]` | Brings guides imported before two importer changes up to date, as `pnpm import:guides` would leave them now. It puts the closing sentence ("Aquí termina la misión.") back at the start of the outro, read from the cached Squarespace page in `<dir>` (the migration inventory folder, `raw/pages/<slug>.html`); and it turns a list of "N x Monster" rows right after a paragraph ending in "lucha contra:" into a fight block when every name matches a DofusDB monster (run `pnpm data:quests` first, for the whole monster catalog), then imports the images of those monsters. Without `--apply` it only counts (dry run). With it, a guide whose latest version is published is saved published, and one whose latest version is a draft is saved as a draft and left for Torre to publish. Prints what it restored or converted and what it left alone (no closing in the page, no cached page, unmatched monster names). Re-running it changes nothing already done. Writes to the `DATABASE_URL` database, or the `pnpm db:dev` one when it is empty; it refuses a remote database without `--remote` and production without `--production` |
| `pnpm media:sizes [--remote] [--production]` | Generates the AVIF and WebP width variants that `media` records are missing, such as files uploaded before Payload generated them on upload. It re-uploads each original through Payload under the same filename, so the variants land next to it in R2 or on disk. Records that already have their variants are skipped, so re-running it is free. Writes to the `DATABASE_URL` database, or the `pnpm db:dev` one when it is empty; it refuses a remote database without `--remote` and production without `--production`. With R2 it reads each original from `MEDIA_BASE_URL` when that is set, and otherwise from the bucket with the `S3_*` credentials. Runs with `payload run`, which drops options placed before `--`, so the script ends in `--` and the flags reach it |
| `pnpm migrate:create <name>` | Writes a migration for the schema changes since the last one |
| `pnpm generate:types` | Regenerates `src/payload-types.ts`. Run it after changing a collection and commit the result; CI fails when the file is stale |
| `pnpm generate:importmap` | Regenerates Payload's admin import map after adding admin components |

### Guide import notes

**Protect panel edits before re-importing.** The loader looks up the latest draft by slug (`draft: true`), compares title, slug, original URL, summary, quest and body, and updates all those fields whenever they differ. It does not track editorial ownership or skip guides edited in Payload. Draft writes leave the currently published version live, but can replace Torre's unpublished edits and imported step IDs. Export/back up the affected guides first. Pass an explicit reviewed slug allowlist excluding every guide Torre has edited (including drafts); do not rely on the default five slugs being safe. There is no skip-existing or preserve-editor-edits flag. To update an edited guide, reconcile the converted content manually in the panel instead of re-importing its slug.

How `pnpm import:guides` reads a Squarespace page, beyond the summary and the start line:

- **Steps.** Torre does not mark steps with headings: in the 1272 quest pages each Squarespace text block is followed by its screenshots. That unit, a text block plus the screenshots (or video) after it, becomes an untitled step block ("Paso" in the panel; the page shows "Paso N"); a text block with no screenshots joins the next unit. The first `[x,y]` in the unit's text, counting the start line that moves to the summary, gives the step's coordinates. Text before the block holding the start line ("Habla con … para empezar") is intro prose. The paragraph with the closing sentence ("Aquí termina la misión…") and everything after it, plus any text left after the last screenshots, is outro prose; the closing sentence stays in it as Torre wrote it (until 2026-11-06 the importer dropped it; `pnpm guides:backfill` restores it in guides imported before). A page with fewer than two units (no screenshots, or a single block) stays prose and gets the oddity "Sin pasos". One page (`el-safari-de-almas`) marks its steps with paragraphs like "ETAPA 1: El safari de las almas ancebas:"; when a page has those markers they win: each one opens a step that runs to the next marker and starts with the text after the colon as a bold paragraph (the step block has no title field), and the last one, like a unit, keeps the text after it until its screenshots. Titles are never made up. Over the 1272 pages the rule gives 12,195 steps: 0 on 27 pages, 1 to 3 on 300, 4 to 10 on 509 and more than 10 on 436. `seis-pies-bajo-tierra` gives the prototype's 8 steps.
- **Torre's recommendations.** In 45 of the 1272 quest pages, after a fight, an uppercase paragraph opens Torre's tips for it: "RECOMENDACIONES:" (31 times), "RECOMENDACIONES" (9), "RECOMENDACIÓN:" (1), "RECOMENDACIONES GOD:" (2), "RECOMENDACIONES PARA LA TERCERA LUCHA:" and three more "PARA …" headings, and once "RECOMENDACIONES: Intenta…" with the tip in the same paragraph. That paragraph, the paragraphs after it up to its list, and the list become one tip callout, which the guide page shows as "Recomendaciones de Torre". What follows the list is prose again; after an inline tip, only a list right after it joins. A bare label leaves the text, since the tip's heading says it; a longer one ("RECOMENDACIONES PARA LA TERCERA LUCHA:") stays. A text block that starts with the label does not open a step: it stays in the step before it, the fight it refers to, with the screenshots after it. Lowercase "Recomendaciones", the label inside a list, and the one "RECOMENDACIÓN:" in the middle of a paragraph (`una-panacea`) stay prose.
- **Callouts.** A paragraph that starts with an uppercase label becomes a callout: `IMPORTANTE`, `CUIDADO` and `ATENCIÓN` (with or without `¡…!`) a warning, `NOTA` a tip. The label leaves the text when a colon or an exclamation mark follows it ("IMPORTANTE:", "¡ATENCIÓN!", "¡ATENCIÓN, ATENCIÓN!"), since the callout title already says it, and the rest starts with a capital. "CUIDADO CON EL MISSCLICK" keeps its words.

### Git hooks and gga

`lefthook.yml` defines the hooks and `pnpm install` installs them.

- **pre-commit** formats and lints the staged files, then runs `gga run`. gga sends the staged files and `AGENTS.md` to the Claude Code CLI and blocks the commit when the review fails. `.gga` holds its settings. Without `gga` installed, the hook prints a warning and lets the commit through.
- **commit-msg** rejects titles that are not conventional commits and any `Co-Authored-By` line.

The hook runs the review on Sonnet 5.5 (`claude-sonnet-5-5`), even when Claude Code's default model is a pricier one. `GGA_CLAUDE_MODEL` picks another model for one run (`GGA_CLAUDE_MODEL=opus git commit …`). `GGA_PROVIDER` overrides the provider in `.gga` for one run (`GGA_PROVIDER=codex git commit …`). `LEFTHOOK_EXCLUDE=gga git commit …` skips the review once.

### CI

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`. Lint, types, unit tests, integration tests, build and E2E run in parallel after the install job. Integration runs `pnpm test:integration` against an empty Postgres 17 service. E2E builds the app, runs `pnpm migrate` against an empty Postgres 17 service and tests `pnpm start`, then runs the dev gate suite and `pnpm test:lhci` on the same build. The Lighthouse reports are uploaded as the `lighthouse` artifact, kept 7 days. `Auditoría` runs `pnpm audit --prod` from the lockfile alone: it fails on a critical advisory and warns on a high one (`docs/legacy/security.md`). The `Pruebas` job passes only when all of them pass; branch protection on `main` requires it.

