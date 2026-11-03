# Torrente Arcano

The new torrentearcano.com: Dofus quest guides, achievements, classes and checklists, with member accounts and premium features. It replaces the Squarespace site and the embeds served from `silvestre-checklist`.

Stack: Next.js + Payload CMS 3, Postgres, Cloudflare R2, Better Auth.

The plan, decisions and phases are in [docs/plan.md](docs/plan.md). Agent rules are in [AGENTS.md](AGENTS.md) and visual rules in [DESIGN.md](DESIGN.md).

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

### Smoke tests against a deployed URL

The `@smoke` tests only read, so they can run against dev or prod after a deploy. Set `SMOKE_BASE_URL` and Playwright skips the build, the migrations and the local database:

```sh
SMOKE_BASE_URL=https://dev.example.com pnpm test:smoke
# Behind basic auth, both variables or neither:
SMOKE_BASE_URL=https://dev.example.com SMOKE_BASIC_AUTH_USER=… SMOKE_BASIC_AUTH_PASSWORD=… pnpm test:smoke
```

Playwright reads these variables from the shell, never from `.env`, so a leftover value cannot point `pnpm test:e2e` at a deployment. The `Smoke` workflow (`.github/workflows/smoke.yml`) runs the same command from Actions, by hand (`workflow_dispatch`) or from another workflow (`workflow_call`) with a `base_url` input. No deploy calls it yet; the dev deploy and release workflows will (`docs/infra.md`, section 7).

`GET /api/health` returns `200` with `{ status, db, version, commit }` when the database answers within 2 s, and `503` with `{ status: 'error', db: 'error' }` when it does not. It needs no auth and is never cached.

### Scripts

| Script | What it does |
|---|---|
| `pnpm dev`, `pnpm build`, `pnpm start` | Next.js |
| `pnpm lint`, `pnpm format`, `pnpm format:check` | ESLint (Next config) and Prettier. Prettier skips Markdown, so doc tables stay hand-aligned |
| `pnpm typecheck` | `next typegen`, then `tsc --noEmit` |
| `pnpm test` | Vitest unit tests in `tests/unit/` |
| `pnpm test:e2e` | Playwright tests in `tests/e2e/`, on the production path: `pnpm build`, `pnpm migrate` on an empty database, then `pnpm start` on port 3100. With `DATABASE_URL` empty it starts `pnpm db:dev` if needed and recreates the separate `torrente_arcano_e2e` database, so your dev data is untouched. `E2E_SKIP_BUILD=1` reuses the last build. Install the browser once with `pnpm exec playwright install chromium` |
| `pnpm test:smoke` | The `@smoke` Playwright subset: home, `/admin` and `/api/health`. Without `SMOKE_BASE_URL` it runs against the local server, like `pnpm test:e2e`. With it, it tests that URL and starts nothing locally (see below) |
| `pnpm db:dev` | Embedded Postgres in the foreground; `--verbose` prints its log |
| `pnpm migrate` | Applies pending migrations from `src/migrations/` to `DATABASE_URL` |
| `pnpm migrate:create <name>` | Writes a migration for the schema changes since the last one |
| `pnpm generate:types` | Regenerates `src/payload-types.ts`. Run it after changing a collection and commit the result; CI fails when the file is stale |
| `pnpm generate:importmap` | Regenerates Payload's admin import map after adding admin components |

### Git hooks and gga

`lefthook.yml` defines the hooks and `pnpm install` installs them.

- **pre-commit** formats and lints the staged files, then runs `gga run`. gga sends the staged files and `AGENTS.md` to the Claude Code CLI and blocks the commit when the review fails. `.gga` holds its settings. Without `gga` installed, the hook prints a warning and lets the commit through.
- **commit-msg** rejects titles that are not conventional commits and any `Co-Authored-By` line.

`GGA_PROVIDER` overrides the provider in `.gga` for one run (`GGA_PROVIDER=codex git commit …`). `LEFTHOOK_EXCLUDE=gga git commit …` skips the review once.

### CI

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`. Lint, types, unit tests, build and E2E run in parallel after the install job. E2E builds the app, runs `pnpm migrate` against an empty Postgres 17 service and tests `pnpm start`. `Auditoría` runs `pnpm audit --prod` from the lockfile alone: it fails on a critical advisory and warns on a high one (`docs/security.md`). The `Pruebas` job passes only when all of them pass; branch protection will require it.

`Revisión GGA` runs on pull requests only. It reviews the PR diff with `gga run --pr-mode --diff-only` and the Codex CLI, logged in from the `CODEX_AUTH_JSON` secret. It is advisory for now and not part of `Pruebas`, until we see how its verdicts hold up. Without the secret, as on a PR from a fork, it skips with a notice. Runs queue on one concurrency group, so two of them never refresh the Codex token at the same time.
