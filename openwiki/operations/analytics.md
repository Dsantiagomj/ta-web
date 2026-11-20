---
type: operations
title: Analytics with Umami
description: How ta-web counts page views with a self-hosted Umami through its own small inline script, without cookies or personal data, how two environment variables turn it on in production only, and how the tests keep it off or point it at a fake Umami.
tags: [analytics, umami, privacy, operations, testing]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-20T11:20:16.585Z
sources:
  - id: openwiki-source-d60a6f0f1e9b6eab797ff859
    resource: repo://.railway/railway.ts
  - id: openwiki-source-e97ce5e3668d477e63c70413
    resource: repo://playwright.dev-gate.config.ts
  - id: openwiki-source-f0b0dfee6a793bb5e8050714
    resource: repo://scripts/lhci-env.ts
  - id: openwiki-source-7a2845694b67f1018000b585
    resource: repo://src/app/(frontend)/layout.tsx
  - id: openwiki-source-805634794c8e4fbf34a2f5bc
    resource: repo://src/lib/analytics/umami.ts
  - id: openwiki-source-92d3ab1ac58352db5a7208ba
    resource: repo://tests/e2e-dev-gate/analitica.spec.ts
  - id: openwiki-source-32431d29f06d622fcef95733
    resource: repo://tests/e2e/analitica.spec.ts
  - id: openwiki-source-15d81576125ffd9d62dc8605
    resource: repo://tests/e2e/app-server.ts
  - id: openwiki-source-dd62398385d25039a9f7793a
    resource: repo://tests/unit/umami.test.ts
generated: { by: "claude-code", at: "2026-11-20T11:20:16.585Z" }
---

# Analytics with Umami

Page views go to a self-hosted Umami (backlog S-18), its own Railway service with its own Postgres. The site sets no cookies, sends no personal data and shows no consent banner.

## The tracker

Umami's own `script.js` would be one more request and several KB on pages that sit at the edge of their 150 KB JavaScript budget (see [Performance budgets](../testing/performance-budgets.md)). The site sends the same request itself instead. `umamiScript` (`src/lib/analytics/umami.ts`) returns an inline script of under 1 KB, which the frontend layout puts in `<head>` next to the mode script, so it adds no file to the page's JavaScript.

What it sends and when:

- `POST {UMAMI_HOST}/api/send` with `{ type: 'event', payload: { website, hostname, language, referrer, screen, title, url } }`, the shape Umami's script uses, through `fetch` with `keepalive` and `credentials: 'omit'`.
- Once when the page finishes loading, and once per App Router route change: it wraps `history.pushState` and `history.replaceState` and listens to `popstate`. It waits 300 ms after a change so the new page's title is in place, as Umami's script does.
- `url` is the path alone, without query or hash. A change that keeps the path (an anchor, a query, Next's own `replaceState`) is not a new view. The previous path becomes the referrer of the next view.
- A navigation before `load` is not lost and not counted twice. A network error is caught and ignored.

The configuration enters the script as JSON with every `<` escaped, so no value can close the `<script>` tag.

## Turning it on

`umamiConfig(process.env)` decides on every request whether the layout renders the script:

| Condition | Result |
|---|---|
| The dev environment (`isDevEnvironment`) | Off, even with both variables set, so test visits never mix with real ones |
| `UMAMI_WEBSITE_ID` is not a UUID | Off: only a UUID ever enters the script, never free text from the environment |
| `UMAMI_HOST` is not an `http` or `https` URL, or carries credentials | Off |
| Both valid | On, with the host's origin and path without a trailing slash (Umami may live under a path) |

Because the variables are read per request, changing them needs a restart, not a build. Only production declares them in `.railway/railway.ts`, with `preserve()` (see [Environment configuration](../architecture/configuration.md)).

Owner setup, once: in Umami, Settings, Websites, «Add website» with the production domain; copy its Website ID from the website's edit page; in Railway's production `web` service set `UMAMI_HOST` to Umami's public URL (no trailing slash) and `UMAMI_WEBSITE_ID` to that ID, then redeploy. The site has no Content Security Policy today; one added later needs Umami's origin in `connect-src`.

## How the tests keep it off

- **Main E2E suite and Lighthouse.** The app servers always start with both variables blank (`appEnv` in `tests/e2e/app-server.ts`, `lhciEnv` in `scripts/lhci-env.ts`), so no test counts a visit even when the shell has them.
- **Analytics server.** `pnpm test:e2e` starts a second server on the same build and database (`analyticsWebServer`), on `E2E_ANALYTICS_PORT` (default `E2E_PORT` + 2), with Umami pointed at `https://umami.e2e.invalid`. `tests/e2e/analitica.spec.ts` intercepts every request to it and to any `/api/send` (`tests/e2e/analytics-capture.ts`), so nothing leaves the machine. It checks that the main server renders no script and sends nothing, that each loaded page sends one visit with its path and title and no cookies, and that App Router route changes count once per path. The analytics server only starts locally, not against `SMOKE_BASE_URL`.
- **Dev gate suite.** `playwright.dev-gate.config.ts` sets both variables on a `APP_ENV=dev` server, and `tests/e2e-dev-gate/analitica.spec.ts` checks that dev renders no script and sends no visit.
- **Unit tests.** `tests/unit/umami.test.ts` covers `umamiConfig` (both variables, a host under a path, invalid IDs and hosts, the dev environment) and runs the script against a fake window: the visit on load and not before, path only, each route change with the new title and previous page, no repeat for the same path, `popstate`, a navigation before load, a network error, the escaped JSON and the size under 1 KB.
