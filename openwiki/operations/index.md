# Files

- [Deployment and releases](deployment.md) - How ta-web reaches Railway, from the infrastructure-as-code service definition through dev auto-deploys with a post-deploy smoke to the owner-only production release workflow.
- [Dev environment: public, never indexed](dev-gate.md)
- [Error monitoring with Sentry](error-monitoring.md) - Server-only error reporting to Sentry, when it turns on, how events are tagged with environment and release, what data collection is switched off, and how build-time source map upload works.
- [Health and readiness endpoints](health-check.md) - The public GET /api/health liveness endpoint, which never touches the database, and GET /api/ready, which pings Postgres with bounded time and without poisoning the pool; their response contracts, the single-flight database check, and who calls each.
- [Legacy redirects, sitemap and robots.txt](redirects-and-seo.md) - How old Squarespace URLs are answered with a 301, 307 or 410 by src/proxy.ts from one validated table, how the generated stubs section is rebuilt, what /sitemap.xml lists and how it is cached, and what robots.txt says in each environment.
