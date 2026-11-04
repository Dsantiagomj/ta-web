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
# Behind basic auth, both variables or neither:
SMOKE_BASE_URL=https://dev.example.com SMOKE_BASIC_AUTH_USER=… SMOKE_BASIC_AUTH_PASSWORD=… pnpm test:smoke
```

Playwright reads these variables from the shell, never from `.env`, so a leftover value cannot point `pnpm test:e2e` at a deployment. The `Smoke` workflow (`.github/workflows/smoke.yml`) runs the same command from Actions, by hand (`workflow_dispatch`) or from another workflow (`workflow_call`) with a `base_url` input. `Smoke de dev` calls it after every successful dev deploy, and `Release` after every prod deploy (see Deploys).

`GET /api/health` returns `200` with `{ status, db, version, commit }` when the database answers within 2 s (`version` is the release version in production, set by the release workflow as `APP_VERSION`, and the `package.json` version elsewhere), and `503` with `{ status: 'error', db: 'error' }` when it does not. It needs no auth and is never cached.

### Dev gate

With `APP_ENV=dev`, or on Railway's `dev` environment (`RAILWAY_ENVIRONMENT_NAME=dev`), `src/proxy.ts` puts the whole site behind HTTP basic auth with `DEV_BASIC_AUTH_USER` and `DEV_BASIC_AUTH_PASSWORD`. Every response carries `X-Robots-Tag: noindex, nofollow` and `robots.txt` disallows everything. If either credential is missing, every page answers `503` instead of serving the site open.

`/api/health` is the one path without auth. It returns only `ok` or `error` plus the version and commit, so uptime monitors can ping dev without the password. Everything else, `/admin`, the REST API, `robots.txt` and static files included, needs the credentials. The smoke suite sends them through `SMOKE_BASIC_AUTH_*`.

Outside dev the proxy does nothing and `robots.txt` allows indexing, except `/admin`. To try the gate locally:

```sh
APP_ENV=dev DEV_BASIC_AUTH_USER=torre DEV_BASIC_AUTH_PASSWORD=clave pnpm dev
```

### Deploys

Railway hosts both environments; `docs/legacy/infra.md` has the inventory, the decisions and what is left.

- `.railway/railway.ts` is the service config as code: Railpack with Node 24, `pnpm build`, `pnpm start`, `pnpm migrate` as the pre-deploy command, the `/api/health` health check, restart on failure, US East. Railway does not read it on deploy. Apply it per environment with `railway config plan` and `railway config apply`. `tests/unit/railway-config.test.ts` evaluates it for both environments.
- Dev: Railway deploys every push to `main` once the GitHub checks pass. `.github/workflows/deploy-dev-smoke.yml` then waits until `/api/health` on `DEV_URL` reports the deployed commit and runs the smoke suite against `DEV_URL`. Railway's deployment `environment_url` points at its dashboard, not the app, so the workflow does not use it.
- Errors: `src/instrumentation.ts` sends server errors to Sentry (org `dsmjdev`, project `ta-web`) when `SENTRY_DSN` is set and the environment is `dev` or `production`. Each event carries the deployed commit as its release, the same one `/api/health` reports. There is no browser SDK, so client errors are not captured. Local runs and CI send nothing. Source maps are uploaded only when `SENTRY_AUTH_TOKEN` is set at build time.
- Prod: `.github/workflows/release.yml`, run by hand from `main` with a semver `version`. Only the repository owner can start or re-run it: GitHub offers no required reviewers on environments of private repositories, so that check is the approval, and the `production` environment only accepts deployments from `main`. It checks that `Pruebas` passed on the commit, creates the `vX.Y.Z` tag and its GitHub release, deploys the tag with the Railway CLI, checks that `/api/health` reports the tagged commit, and runs the smoke suite against `PROD_URL`.

### Scripts

| Script | What it does |
|---|---|
| `pnpm dev`, `pnpm build`, `pnpm start` | Next.js |
| `pnpm lint`, `pnpm format`, `pnpm format:check` | ESLint (Next config) and Prettier. Prettier skips Markdown, so doc tables stay hand-aligned |
| `pnpm typecheck` | `next typegen`, then `tsc --noEmit` |
| `pnpm test` | Vitest unit tests in `tests/unit/` |
| `pnpm test:integration` | Vitest tests in `tests/integration/` that boot Payload with `getPayload` and check access rules through the local API. A global setup runs `pnpm migrate` first. With `DATABASE_URL` empty it starts `pnpm db:dev` if needed (and stops it afterwards) and recreates the separate `ta_web_integration` database. Uploads go to `./media`; the `S3_*` variables are ignored |
| `pnpm test:e2e` | Playwright tests in `tests/e2e/`, on the production path: `pnpm build`, `pnpm migrate` on an empty database, then `pnpm start` on port 3100. With `DATABASE_URL` empty it starts `pnpm db:dev` if needed and recreates the separate `ta_web_e2e` database, so your dev data is untouched. `E2E_SKIP_BUILD=1` reuses the last build. Install the browser once with `pnpm exec playwright install chromium` |
| `pnpm test:e2e:dev-gate` | Playwright tests in `tests/e2e-dev-gate/` against the app with `APP_ENV=dev` on port 3101 (and a second instance without credentials on 3102). `E2E_SKIP_BUILD=1` reuses the build of `pnpm test:e2e` |
| `pnpm test:smoke` | The `@smoke` Playwright subset: home, `/admin` and `/api/health`. Without `SMOKE_BASE_URL` it runs against the local server, like `pnpm test:e2e`. With it, it tests that URL and starts nothing locally (see below) |
| `pnpm db:dev` | Embedded Postgres in the foreground; `--verbose` prints its log |
| `pnpm migrate` | Applies pending migrations from `src/migrations/` to `DATABASE_URL_DIRECT` (Neon's non-pooled URL) when it is set, otherwise to `DATABASE_URL` |
| `pnpm data:quests` | Downloads every quest from the public DofusDB API (about 2,000), the monsters their objectives name (about 1,000) and the whole item catalog (about 21,500, so a guide can list any item), and writes them to the `quests`, `items` and `monsters` collections of the `DATABASE_URL` database, or the `pnpm db:dev` one when it is empty. The download takes about two and a half minutes; writing takes about 10 seconds on the first run against `pnpm db:dev` and under a second after that. Runs with `payload run`. Re-running it changes only what DofusDB changed and never deletes a row |
| `pnpm import:guides <dir> [slug…]` | Imports Squarespace quest pages into `quest-guides` as drafts. `<dir>` is the migration inventory folder (`raw/pages/<slug>.html` and `out/quest_matches.csv`); without slugs it imports the five in `GUIDE_SLUGS` (`scripts/import/squarespace/to-quest-guide.ts`). Downloads each image once into `media`, keyed by its original URL, links quests already in `quests` (run `pnpm data:quests` first) and prints the oddities per page. Writes to the `DATABASE_URL` database, or the `pnpm db:dev` one when it is empty. Re-running it updates the drafts and never publishes or duplicates anything |
| `pnpm migrate:create <name>` | Writes a migration for the schema changes since the last one |
| `pnpm generate:types` | Regenerates `src/payload-types.ts`. Run it after changing a collection and commit the result; CI fails when the file is stale |
| `pnpm generate:importmap` | Regenerates Payload's admin import map after adding admin components |

### Git hooks and gga

`lefthook.yml` defines the hooks and `pnpm install` installs them.

- **pre-commit** formats and lints the staged files, then runs `gga run`. gga sends the staged files and `AGENTS.md` to the Claude Code CLI and blocks the commit when the review fails. `.gga` holds its settings. Without `gga` installed, the hook prints a warning and lets the commit through.
- **commit-msg** rejects titles that are not conventional commits and any `Co-Authored-By` line.

`GGA_PROVIDER` overrides the provider in `.gga` for one run (`GGA_PROVIDER=codex git commit …`). `LEFTHOOK_EXCLUDE=gga git commit …` skips the review once.

### CI

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`. Lint, types, unit tests, integration tests, build and E2E run in parallel after the install job. Integration runs `pnpm test:integration` against an empty Postgres 17 service. E2E builds the app, runs `pnpm migrate` against an empty Postgres 17 service and tests `pnpm start`, then runs the dev gate suite on the same build. `Auditoría` runs `pnpm audit --prod` from the lockfile alone: it fails on a critical advisory and warns on a high one (`docs/legacy/security.md`). The `Pruebas` job passes only when all of them pass; branch protection on `main` requires it.

`Revisión GGA` runs on pull requests only. It reviews the PR diff with `gga run --pr-mode --diff-only` and the Codex CLI, logged in from the `CODEX_AUTH_JSON` secret. It is advisory for now and not part of `Pruebas`, until we see how its verdicts hold up. Without the secret, as on a PR from a fork, it skips with a notice. Runs queue on one concurrency group, so two of them never refresh the Codex token at the same time.
