---
type: workflow
title: CI and quality gates
description: The checks every change passes, from local git hooks (format, lint, AI review, conventional commits) to the CI jobs, the Pruebas aggregator required on main, the dependency audit rule and the advisory GGA review.
tags: [ci, github-actions, git-hooks, lefthook, security, code-review]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-04T00:29:31.647Z
sources:
  - id: openwiki-source-1364a33be7315005959b4797
    resource: repo://.gga
  - id: openwiki-source-a498d12b0fe420504dc2f1dd
    resource: repo://.github/actions/setup/action.yml
  - id: openwiki-source-164e2da859b5277df81c7d94
    resource: repo://.github/workflows/ci.yml
  - id: openwiki-source-f235d856bed1fd44853c5195
    resource: repo://.prettierignore
  - id: openwiki-source-72b816a72bb5f72d95b334ea
    resource: repo://lefthook.yml
  - id: openwiki-source-40275cb92c3610938f16ade3
    resource: repo://pnpm-workspace.yaml
  - id: openwiki-source-07c2e95fae4957fea0a4f592
    resource: repo://scripts/hooks/commit-msg.sh
  - id: openwiki-source-de5a7370ff2798c2513d3fab
    resource: repo://scripts/hooks/gga-review.sh
  - id: openwiki-source-d3495e3108db609ea7dcace0
    resource: repo://tests/unit/commit-msg.test.ts
generated: { by: "claude-code", at: "2026-11-04T00:29:31.647Z" }
---

# CI and quality gates

Checks run in two places: git hooks on the developer's machine, and the `CI` workflow on GitHub. Branch protection on `main` requires one aggregated check, `Pruebas`.

## Local git hooks

`lefthook.yml` defines the hooks. `pnpm install` installs them, since `lefthook` is allowed to run its install script in `pnpm-workspace.yaml`. Lefthook is a Go binary, so the hooks do not depend on a separate npm runtime.

### pre-commit

Runs in order (`piped: true`) and stops at the first failure:

1. **formato**: `prettier --write --ignore-unknown` on staged `ts, tsx, js, mjs, cjs, json, css, yml, yaml` files; fixes are re-staged. Markdown is not in the list, so doc tables keep their hand alignment. `.prettierignore` also skips every `*.md` file and the whole `openwiki/` directory, which OpenWiki generates.
2. **lint**: `eslint --fix` on staged JS/TS files; fixes are re-staged.
3. **gga**: `scripts/hooks/gga-review.sh` runs `gga run`, an AI review of the staged files against `AGENTS.md`. If `gga` is not installed it prints a warning and lets the commit through.

`.gga` configures the review: provider `claude` (the Claude Code CLI), overridable per run with `GGA_PROVIDER`; it reviews `ts, tsx, js, mjs, css, md`; it excludes generated files (lockfile, Payload types and import map, migrations, `.d.ts`, minified files, `.next`); `STRICT_MODE` treats an ambiguous verdict as a failure; timeout 300 s; PR base branch `main`.

`LEFTHOOK_EXCLUDE=gga git commit …` skips the review once. AGENTS.md forbids skipping hooks (`--no-verify`, `LEFTHOOK=0`, `LEFTHOOK_EXCLUDE`) unless the user asks.

### commit-msg

`scripts/hooks/commit-msg.sh`:

- Rejects any non-comment line starting with `Co-Authored-By:` (case-insensitive), checked first so even git-generated messages cannot carry it.
- Passes `Merge …`, `Revert "…`, `fixup!`, `squash!` and `amend!` subjects.
- Otherwise requires a conventional commit subject: `type(scope)!: description` with type in `feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert`, an optional scope without spaces or parentheses, an optional `!`, and a non-space character after `: `.

`tests/unit/commit-msg.test.ts` runs the script against sample messages.

## The CI workflow

`.github/workflows/ci.yml` runs on every pull request and every push to `main`. A new push to a PR cancels the previous run; runs on `main` are never cancelled. Workflow-level permissions are `contents: read`, and `PAYLOAD_SECRET` is a fixed dummy value.

Each job uses the composite action `.github/actions/setup`: pnpm, Node from `.nvmrc` with `check-latest: true` (the runner image's Node 24 may predate the `engines` floor of 24.22.1) and the pnpm store cache, then `pnpm install --frozen-lockfile`.

| Job | Name | What it runs |
|---|---|---|
| `install` | Instalación | The setup action, to warm the cache |
| `lint` | Lint y formato | `pnpm lint`, `pnpm format:check` |
| `typecheck` | Tipos | `pnpm typecheck`, then `pnpm generate:types` and `git diff --exit-code -- src/payload-types.ts` |
| `unit` | Unitarias | `pnpm test` |
| `build` | Build | `pnpm build`, with `.next/cache` cached by lockfile and `src/**` hashes |
| `integration` | Integración | `pnpm test:integration` against an empty `postgres:17.11` service |
| `e2e` | E2E | `pnpm test:e2e` against an empty `postgres:17.11` service, then `pnpm test:e2e:dev-gate` on the same build; Playwright report uploaded on failure |
| `audit` | Auditoría | Dependency audit, see below |
| `pruebas` | Pruebas | Aggregator |
| `gga` | Revisión GGA | Advisory AI review, PRs only |

All test jobs depend only on `install` and run in parallel. The integration and E2E jobs apply the committed migrations to an empty database; nothing uses schema push.

### Pruebas

`Pruebas` runs with `if: always()`, needs every job except `gga`, and fails unless every result is `success` (a skipped or cancelled job also fails it). Branch protection requires it, and the release workflow checks that it passed on the commit being released. See [Deployment and releases](../operations/deployment.md).

### Dependency audit

The `audit` job reads `pnpm-lock.yaml` only; it does not install anything.

- `pnpm audit --prod --audit-level critical` fails the job. A new critical advisory in a production dependency blocks every PR until it is fixed or explicitly accepted, on purpose: it means production has a known critical hole.
- `pnpm audit --prod --audit-level high` only adds a warning annotation, so a fresh high advisory does not freeze the repo while it is assessed.
- Dev-only advisories do not count; they never reach the server.

Transitive security fixes are applied as `overrides` in `pnpm-workspace.yaml` (pnpm 11 ignores the `pnpm` field of `package.json`). Current overrides: `dompurify` (via the admin's Monaco editor), `happy-dom` (via `@lexical/headless`, which the import will use on untrusted HTML), `esbuild` scoped to `@esbuild-kit/core-utils`, and `minimatch@10` scoped to the 10.x line, because ESLint plugins still call minimatch 3 as a function and 11.x no longer allows that. A critical advisory accepted without a fix is listed under `auditConfig.ignoreGhsas` in `pnpm-workspace.yaml`; the reasoning for each accepted risk is recorded in `docs/security.md`.

### Revisión GGA

Runs only on pull requests and is not part of `Pruebas`. It writes the `CODEX_AUTH_JSON` secret to `~/.codex/auth.json` with restrictive permissions, installs pinned versions of the Codex CLI and gga, fetches `main` locally and runs `gga run --pr-mode --diff-only` with `GGA_PROVIDER=codex`. The credentials file is deleted at the end even on failure. Without the secret (for example on a fork PR) it skips with a notice. All runs share one concurrency group without cancellation, so two runs never refresh the same Codex token at once.

## Related pages

- [Test suites](../testing/test-suites.md)
- [Deployment and releases](../operations/deployment.md)
- [Local development](local-development.md)
