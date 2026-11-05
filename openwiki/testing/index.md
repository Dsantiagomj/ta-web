# Files

- [Performance budgets (Lighthouse CI)](performance-budgets.md) - How pnpm test:lhci builds and starts the app on the production path, which DESIGN.md budgets lighthouserc.cjs asserts and how runs are aggregated, why LCP uses the best of three runs, and how CI runs it inside the E2E job and keeps the reports.
- [Test suites](test-suites.md) - The six test suites (unit, integration, E2E, dev-gate E2E, smoke and the Lighthouse CI budgets), what each one covers, how each provisions its database and app server, and the guards that keep tests away from real databases.
