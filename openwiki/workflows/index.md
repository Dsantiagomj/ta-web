# Files

- [CI and quality gates](ci-and-quality-gates.md) - The checks every change passes, from local git hooks (format, lint, AI review, conventional commits) to the CI jobs, the Pruebas aggregator required on main, the dependency audit rule and the advisory GGA review.
- [Local development](local-development.md) - How to set up and run ta-web on a laptop with no Docker or system Postgres, the scripts you use day to day, how to change the schema, and how to reset local data.
- [Release review](release-review.md) - How pnpm review:release reviews everything between the last release tag and origin/main with Claude before release.yml runs - the files it picks with the .gga patterns, how the diff is split into batches without losing lines, the read-only reviewer in a throwaway worktree, the verdict, the report and the exit code.
