---
type: workflow
title: CI and quality gates
description: The checks every change passes, from local git hooks (format, lint, AI review, conventional commits) to the CI jobs, the Pruebas aggregator required on main, the dependency audit rule and the advisory GGA review.
tags: [ci, github-actions, git-hooks, lefthook, security, code-review]
sources:
  - id: openwiki-source-1364a33be7315005959b4797
    resource: repo://.gga
  - id: openwiki-source-a498d12b0fe420504dc2f1dd
    resource: repo://.github/actions/setup/action.yml
  - id: openwiki-source-164e2da859b5277df81c7d94
    resource: repo://.github/workflows/ci.yml
  - id: openwiki-source-f235d856bed1fd44853c5195
    resource: repo://.prettierignore
  - id: openwiki-source-c8e16e16c743abca9f070b43
    resource: repo://docs/legacy/security.md
  - id: openwiki-source-72b816a72bb5f72d95b334ea
    resource: repo://lefthook.yml
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-40275cb92c3610938f16ade3
    resource: repo://pnpm-workspace.yaml
  - id: openwiki-source-8a351af10d89cd949447bf39
    resource: repo://scripts/ci/playwright-chromium.sh
  - id: openwiki-source-07c2e95fae4957fea0a4f592
    resource: repo://scripts/hooks/commit-msg.sh
  - id: openwiki-source-de5a7370ff2798c2513d3fab
    resource: repo://scripts/hooks/gga-review.sh
  - id: openwiki-source-d3495e3108db609ea7dcace0
    resource: repo://tests/unit/commit-msg.test.ts
  - id: openwiki-source-ced3a64571b8d5ee005bfe33
    resource: repo://tests/unit/gga-review-hook.test.ts
generated: { by: "claude-code", at: "2026-11-12T11:00:44.802Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-12T11:00:44.802Z
---

# CI and quality gates

Checks run in two places: git hooks on the developer's machine, and the `CI` workflow on GitHub. Branch protection on `main` requires one aggregated check, `Pruebas`.

## Local git hooks

`lefthook.yml` defines the hooks. `pnpm install` installs them, since `lefthook` is allowed to run its install script in `pnpm-workspace.yaml`. Lefthook is a Go binary, so the hooks do not depend on a separate npm runtime.

### pre-commit

Runs in order (`piped: true`) and stops at the first failure:

1. **formato**: `prettier --write --ignore-unknown` on staged `ts, tsx, js, mjs, cjs, json, css, yml, yaml` files; fixes are re-staged. Markdown is not in the list, so doc tables keep their hand alignment. `.prettierignore` also skips every `*.md` file, the whole `openwiki/` directory, which OpenWiki generates, and `tests/fixtures/squarespace/`, the saved Squarespace pages the import parser reads as they are.
2. **lint**: `eslint --fix` on staged JS/TS files; fixes are re-staged.
3. **gga**: `scripts/hooks/gga-review.sh` runs `gga run`, an AI review of the staged files against `AGENTS.md`. If `gga` is not installed it prints a warning and lets the commit through. gga calls `claude --print` without a model, which would use Claude Code's default model, possibly an expensive one, so the hook exports `ANTHROPIC_MODEL` as `GGA_CLAUDE_MODEL` or `sonnet`; an `ANTHROPIC_MODEL` already in the shell does not change it (`tests/unit/gga-review-hook.test.ts`).

`.gga` configures the review: provider `claude` (the Claude Code CLI), overridable per run with `GGA_PROVIDER`; it reviews `ts, tsx, js, mjs, css, md`; it excludes generated files (lockfile, Payload types and import map, migrations, `.d.ts`, minified files, `.next`) and the third-party agent skills in `.claude/skills/`, which `skills-lock.json` pins by hash; `STRICT_MODE` treats an ambiguous verdict as a failure; timeout 300 s; PR base branch `main`.

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
| `e2e` | E2E | `pnpm test:e2e` against an empty `postgres:17.11` service, then `pnpm test:e2e:dev-gate` (the app in dev mode: public, with `noindex`) and `pnpm test:lhci` (the Lighthouse CI budgets) on the same build; the Lighthouse reports are uploaded as the `lighthouse` artifact (7 days) unless the run was cancelled, and the Playwright report on failure |
| `audit` | Auditoría | Dependency audit, see below |
| `pruebas` | Pruebas | Aggregator |
| `gga` | Revisión GGA | Advisory AI review, PRs only |

The `e2e` job installs Playwright's Chromium, or only its system dependencies when the browser comes from the cache, through `scripts/ci/playwright-chromium.sh`, with a 20-minute step limit. The runner image already has Google Chrome and almost all of its libraries, so the script first checks whether Chromium launches and calls apt only if it does not; each download or apt attempt has a 5-minute limit and is retried after 15 s and 30 s. This came after the Ubuntu mirrors' DNS failed for hours on 2026-11-11 and apt hung. The smoke workflow uses the same script.

All test jobs depend only on `install` and run in parallel. The integration and E2E jobs apply the committed migrations to an empty database; nothing uses schema push.

The budgets run inside the E2E job rather than in a job of their own so the app is not compiled twice: `pnpm test:lhci` runs with `E2E_SKIP_BUILD=1` and reuses that job's build, Postgres service and Playwright Chromium. A budget failure therefore fails `e2e` and `Pruebas`. See [Performance budgets](../testing/performance-budgets.md).

### Pruebas

`Pruebas` runs with `if: always()`, needs every job except `gga`, and fails unless every result is `success` (a skipped or cancelled job also fails it). Branch protection requires it, and the release workflow checks that it passed on the commit being released. See [Deployment and releases](../operations/deployment.md).

### Dependency audit

The `audit` job reads `pnpm-lock.yaml` only; it does not install anything.

- `pnpm audit --prod --audit-level critical` fails the job. A new critical advisory in a production dependency blocks every PR until it is fixed or explicitly accepted, on purpose: it means production has a known critical hole.
- `pnpm audit --prod --audit-level high` only adds a warning annotation, so a fresh high advisory does not freeze the repo while it is assessed.
- Dev-only advisories do not count; they never reach the server.

Transitive security fixes are applied as `overrides` in `pnpm-workspace.yaml` (pnpm 11 ignores the `pnpm` field of `package.json`). Current overrides: `dompurify` (via the admin's Monaco editor), `happy-dom` (via `@lexical/headless`; it is also a direct dev dependency at the same version, because the [Squarespace import](../data/squarespace-import.md) parses untrusted HTML with it), `esbuild` scoped to `@esbuild-kit/core-utils`, and `minimatch@10` scoped to the 10.x line, because ESLint plugins still call minimatch 3 as a function and 11.x no longer allows that. A critical advisory accepted without a fix is listed under `auditConfig.ignoreGhsas` in `pnpm-workspace.yaml`; the reasoning for each accepted risk is recorded in `docs/legacy/security.md`. Its accepted list today: `deepmerge` (low, via Payload, no patched version), `glob` 13 (moderate, via the Sentry build plugins), `basic-ftp` (high, dev only, via `@lhci/cli`; only reachable when fetching a PAC file over `ftp://`, which Lighthouse CI against `localhost` never does) and `minimatch` 3 (moderate, dev only, via ESLint plugins).

### Revisión GGA

Runs only on pull requests and is not part of `Pruebas`. It writes the `CODEX_AUTH_JSON` secret to `~/.codex/auth.json` with restrictive permissions, installs pinned versions of the Codex CLI and gga, fetches `main` locally and runs `gga run --pr-mode --diff-only` with `GGA_PROVIDER=codex`. The credentials file is deleted at the end even on failure. Without the secret (for example on a fork PR) it skips with a notice. All runs share one concurrency group without cancellation, so two runs never refresh the same Codex token at once.

## Related pages

- [Test suites](../testing/test-suites.md)
- [Deployment and releases](../operations/deployment.md)
- [Local development](local-development.md)
- [Performance budgets](../testing/performance-budgets.md)
- [Release review](release-review.md): `pnpm review:release`, the AI review of everything entering a release, run by hand before `release.yml`
