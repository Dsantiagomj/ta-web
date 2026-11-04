---
type: operations
title: Error monitoring with Sentry
description: Server-only error reporting to Sentry, when it turns on, how events are tagged with environment and release, what data collection is switched off, and how build-time source map upload works.
tags: [observability, sentry, errors, privacy]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-04T00:16:52.047Z
sources:
  - id: openwiki-source-50a18d054b596a7ed0eeffb0
    resource: repo://next.config.ts
  - id: openwiki-source-2dcb4ef15a24888e2bf6e8b3
    resource: repo://src/instrumentation.ts
  - id: openwiki-source-c31449ae998e78dd836b84bc
    resource: repo://src/lib/monitoring/sentry.ts
  - id: openwiki-source-7b3622645d9508310c14db47
    resource: repo://tests/unit/next-config.test.ts
  - id: openwiki-source-62048cd47900a7a4048ed58c
    resource: repo://tests/unit/sentry-options.test.ts
generated: { by: "claude-code", at: "2026-11-04T00:16:52.047Z" }
---

# Error monitoring with Sentry

Server errors from the deployed `dev` and `production` environments go to Sentry (org `dsmjdev`, project `ta-web`, US region). Nothing else is sent: no browser errors, no performance traces, no local or CI events.

## Scope: server only

- `src/instrumentation.ts` initializes the SDK only when `NEXT_RUNTIME` is `nodejs`. There is no `instrumentation-client.ts`, so no browser SDK, session replay or feedback widget. Guide pages carry no client JavaScript beyond the shell, and Lighthouse enforces a 150 KB budget; a browser SDK could later be loaded lazily outside the guides if client errors become necessary.
- There is no edge runtime to cover: the Next 16 proxy runs in Node and no route asks for edge.
- The Sentry options module is imported dynamically inside `register()`. It pulls in the dev-gate module, which uses `node:crypto`, and that must not end up in another runtime's bundle.
- `onRequestError = Sentry.captureRequestError` reports errors from server components, route handlers and the proxy. Before `Sentry.init` it is a no-op.

## When it initializes

`sentryServerOptions(env)` in `src/lib/monitoring/sentry.ts` returns `undefined`, and the SDK never starts, unless both hold:

1. `SENTRY_DSN` is set (it is trimmed).
2. The environment resolves to a deployed one: `dev` by the same rule as the dev gate (`APP_ENV` or `RAILWAY_ENVIRONMENT_NAME` equal to `dev`), or `production` when either variable equals `production`.

A DSN in a local `.env` therefore sends nothing, and an unknown environment sends nothing.

## Event tagging

- `environment` is `dev` or `production`.
- `release` is the deployed commit from `deployedCommit` (`RAILWAY_GIT_COMMIT_SHA`, then `GIT_COMMIT_SHA`), the same value `/api/health` reports. When no commit is known, `release` is omitted instead of invented.

## Data collection is off

Sentry SDK 11 collects broadly by default. The options switch each category off explicitly through `dataCollection`: user info (including IP), cookies, HTTP headers, HTTP bodies, URL query parameters, GraphQL documents and variables, GenAI inputs and outputs, database query data, queue data and stack frame local variables. Member data or secrets could appear in any of them.

`SentryServerOptions` is typed from `Parameters<typeof Sentry.init>[0]`, so if the SDK renames or removes an option the type check fails. That is how the move from `sendDefaultPii` in version 11 surfaced.

No `tracesSampleRate` is set. Any value, even `0`, makes the SDK install tracing instrumentation on every request; leaving it out keeps the overhead and transaction quota at zero.

## Build-time configuration

`next.config.ts` wraps the config with `withSentryConfig`:

- Source maps are uploaded only when `SENTRY_AUTH_TOKEN` is set at build time; otherwise `sourcemaps.disable` is true and the build never contacts Sentry. The token is declared in the Railway IaC but not yet populated.
- `routeManifestInjection: false`: the route manifest only helps a browser SDK and would list `/admin`.
- `telemetry: false`: the plugin does not report its own build data.
- `silent` unless `CI` is set.

`withSentryConfig` also enables `experimental.clientTraceMetadata`, which adds `sentry-trace` and `baggage` meta tags to every page for a browser SDK to continue the trace. With no browser SDK they are useless and would publish the DSN public key, so the config deletes that key after wrapping. `tests/unit/next-config.test.ts` asserts it stays undefined.

## Tests

`tests/unit/sentry-options.test.ts` covers: no DSN means off, even in production; local and CI produce no options; dev and production detection; trimmed DSN and every data-collection flag off; no traces sample rate; release equal to the deployed commit; no release without a commit.

## Related pages

- [Environment configuration](../architecture/configuration.md)
- [Request pipeline](../architecture/request-pipeline.md)
- [Deployment and releases](deployment.md)
