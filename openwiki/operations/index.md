# Files

- [Deployment and releases](deployment.md) - How ta-web reaches Railway, from the infrastructure-as-code service definition through dev auto-deploys with a post-deploy smoke to the owner-only production release workflow.
- [Dev environment gate](dev-gate.md) - How the dev deployment is kept private and out of search engines with basic auth in the Next proxy, a fail-closed 503 when credentials are missing, one exempt health path, a noindex header and an environment-aware robots.txt.
- [Error monitoring with Sentry](error-monitoring.md) - Server-only error reporting to Sentry, when it turns on, how events are tagged with environment and release, what data collection is switched off, and how build-time source map upload works.
- [Health check endpoint](health-check.md) - The public GET /api/health endpoint, its response contract, how it pings Postgres with bounded time and without poisoning the pool, how concurrent checks share one ping, and who depends on it.
