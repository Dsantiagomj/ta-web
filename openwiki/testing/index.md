# Files

- [Import golden tests](import-golden.md) - How pnpm test:import pins the Squarespace import converters on thirty saved pages, how the pages are trimmed and compared as stable JSON, and how pnpm import:golden-refresh downloads them again before a delta import so a person reviews the diff and accepts it with -u.
- [Performance budgets (Lighthouse CI)](performance-budgets.md) - How pnpm test:lhci builds and starts the app on the production path, which DESIGN.md budgets lighthouserc.cjs asserts and how runs are aggregated, why LCP uses the best of three runs, and how CI runs it inside the E2E job and keeps the reports.
- [Test suites](test-suites.md) - The seven test suites (unit, integration, import golden pages, E2E, dev-gate E2E, smoke and the Lighthouse CI budgets), what each one covers, how each provisions its database and app server, and the guards that keep tests away from real databases.
