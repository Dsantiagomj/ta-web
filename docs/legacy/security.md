# Dependency security

How we track advisories in our dependencies, and which ones we accept for now.

## Audit of 2026-11-03

`pnpm audit` reported 22 advisories (3 critical, 9 high, 6 moderate, 4 low). With `--prod`, 21 (3 critical, 9 high, 5 moderate, 4 low).

| Package | Before | After | How |
|---|---|---|---|
| `next`, `eslint-config-next` | 16.3.8 | 16.4.2 | Direct upgrade. Fixes the two critical RCEs (Image Optimization API, `use cache`) and the Server Actions DoS |
| `payload`, `@payloadcms/*` | 3.91.0 | 3.92.1 | Direct upgrade. Brings undici 7.30.1, which closes 9 undici advisories |
| `sharp` | 0.35.4 | 0.35.5 | Direct upgrade (librsvg) |
| `embedded-postgres` | 17.10.0-beta.17 | 17.11.0-beta.19 | Direct upgrade. Postgres 17.11 for `pnpm db:dev` and E2E; CI uses `postgres:17.11` |
| `dompurify` (via `monaco-editor` in the admin) | 3.4.15 | 3.4.17 | Override |
| `happy-dom` (via `@lexical/headless`) | 20.14.6 | 21.0.4 | Override, and a direct dev dependency at the same version: the import (`scripts/import/`) parses untrusted Squarespace HTML with it, with scripts and resource loading off |
| `esbuild` (via `drizzle-kit` > `@esbuild-kit/core-utils`) | 0.18.20 | 0.25.12 | Override scoped to `@esbuild-kit/core-utils`. drizzle-kit 0.31.7 declares the old loader but its bundles never load it |
| `minimatch` 10.x (via `typescript-eslint`) | 10.2.6 | 11.0.1 | Override scoped to `minimatch@10` |
| Node | `>=24.0.0` | `>=24.22.1` | `engines.node`; 24.22.1 is a security release |

Overrides live under `overrides:` in `pnpm-workspace.yaml`. pnpm 11 ignores the `pnpm` field of `package.json` and prints a warning saying so.

Some versions are younger than our two-week rule (Payload 3.92.1, embedded-postgres 17.11.0-beta.19, minimatch 11.0.1). Security fixes override that rule. The commits say which.

After the change, `pnpm audit` reports 2 advisories (1 moderate, 1 low) and `pnpm audit --prod` reports 1 (low). Both are below.

## Accepted risks

| Advisory | Severity | Where | Why we accept it |
|---|---|---|---|
| [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4), `deepmerge` prototype poisoning | low | `payload` > `deepmerge` 4.3.1, production | No patched version exists. Payload merges its own config with it, not visitor input. Drop it from this list when Payload or deepmerge ships a fix |
| [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), `glob` AbortSignal cancellation bypass | moderate | `@sentry/nextjs` > `@sentry/bundler-plugins` > `glob` 13.0.6, production dependency used at build time | The fix is glob 14.0.2, a major version the Sentry plugins do not declare (`^13.0.6`, still in `@sentry/nextjs` 11.10.0). The plugins glob our own `.next` output to find source maps, with no attacker-controlled patterns or signals, and the upload is off until `SENTRY_AUTH_TOKEN` exists. Drop it when the Sentry plugins move to glob 14 |
| [GHSA-c475-qrg2-pj4r](https://github.com/advisories/GHSA-c475-qrg2-pj4r), `basic-ftp` CPU DoS parsing a directory listing | high | `@lhci/cli` > `proxy-agent` > `pac-proxy-agent` > `get-uri` > `basic-ftp` 5.3.1, dev only (`pnpm test:lhci`) | The fix is basic-ftp 6.2.1 and later, a major version that `get-uri` (`^5.3.1`, also in its latest release) does not declare. The code only runs to fetch a PAC file over `ftp://` when a PAC proxy is configured; Lighthouse CI here only talks to `localhost` and never configures one. Drop it when `get-uri` moves to basic-ftp 6 |
| [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), `minimatch` globparts DoS | moderate | `minimatch` 3.1.5 via ESLint and its plugins, dev only | The only fix is 11.x, and 11.x no longer exports a callable function. `eslint-plugin-react`, `eslint-plugin-jsx-a11y` and `eslint-plugin-import` call `require('minimatch')(…)`, so a global override breaks those rules at runtime (`m is not a function`). It only runs on our own lint globs. Revisit when ESLint 10 and the plugins move off minimatch 3 |

## CI rule

The `Auditoría` job in `.github/workflows/ci.yml` runs on every PR and push to `main`, and `Pruebas` requires it. It reads `pnpm-lock.yaml` and installs nothing.

- `pnpm audit --prod --audit-level critical` fails the job.
- `pnpm audit --prod --audit-level high` only adds a warning annotation.

A critical advisory published tomorrow blocks every PR, including unrelated ones. We want that: it means production has a known critical hole, and the fix comes first. A high one warns instead, so a new advisory doesn't freeze the repo while we look at it. Dev-only advisories don't count, because they never reach the server.

When an advisory has no fix and we decide to live with it, add it to the table above. If it is critical, also list its GHSA id under `auditConfig.ignoreGhsas` in `pnpm-workspace.yaml` so the job passes again. Remove both when the fix lands.

Run `pnpm audit` (all dependencies) by hand after every dependency upgrade, and record new accepted risks here.
