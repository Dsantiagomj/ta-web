---
type: workflow
title: Release review
description: How pnpm review:release reviews everything between the last release tag and origin/main with Claude before release.yml runs - the files it picks with the .gga patterns, how the diff is split into batches without losing lines, the read-only reviewer in a throwaway worktree, the verdict, the report and the exit code.
tags: [release, review, ai, tooling, git]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-12T11:00:44.802Z
sources:
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-a7e2a4607c045b94a04fc01e
    resource: repo://scripts/review-release-plan.ts
  - id: openwiki-source-b6d2ac28f484617caef7e1ad
    resource: repo://scripts/review-release.ts
  - id: openwiki-source-2611e2e323e5d7a70b803425
    resource: repo://tests/unit/review-release.test.ts
generated: { by: "claude-code", at: "2026-11-12T11:00:44.802Z" }
---

# Release review

`pnpm review:release` (`scripts/review-release.ts`) is a review of a whole release, run by hand before launching `release.yml` (see [Deployment and releases](../operations/deployment.md)). The per-commit gga review only sees one commit's staged files; this one sees everything that ships at once. It is local tooling: it needs the `claude` CLI and writes nothing to the repo.

```sh
pnpm review:release                 # from the last release tag to origin/main
pnpm review:release --since v0.4.0  # from another ref
pnpm review:release --dry-run       # list the batches, call no model
```

`parseReviewArgs` accepts only `--since <ref>` (or `--since=<ref>`) and `--dry-run`, and ignores a leading `--` that pnpm may pass. Anything else, or `--since` without a value, exits with 2.

## What it reviews

1. It fetches `origin main` and the tags and takes the commit of `origin/main`.
2. The start is `--since`, or the last tag matching `v[0-9]*` reachable from `origin/main`. Without one it asks for `--since` and exits with 2. When the start is `origin/main` itself there is nothing to review and it exits with 0.
3. It lists the files changed in `<since>...origin/main`, deleted ones included (`--diff-filter=ACMRD`).
4. `selectReviewFiles` keeps the files gga would review, using the `FILE_PATTERNS` and `EXCLUDE_PATTERNS` of `.gga` as they are in `origin/main`, matched the way gga 2.10 does: a pattern starting with `*` matches the end of the path, any other matches the whole path or the file name as a bash glob. Without `FILE_PATTERNS`, everything is reviewed.

The diff is taken once with fixed flags (no color, no external diff or textconv, `a/` and `b/` prefixes) so it looks the same on every machine, and split per file by `splitDiffByFile`.

## Batches

A release is too big for one prompt, so the diff goes in batches of at most `RELEASE_REVIEW_BATCH_CHARS` characters (120,000 by default):

- `reviewPieces` keeps each file whole when it fits. A file that does not fit is split by `splitFileDiff` into "parte i de n": by hunk, and a hunk that alone does not fit by line, each continuation starting with its `@@` line marked "(continued)". Every part repeats the file header. No line of the diff is dropped.
- `planBatches` packs the pieces in order up to the limit; a piece still over the limit (one huge line) goes alone in its batch.

The whole diff matters, not only the final files: what a release deletes is not in the checkout.

With `--dry-run` the script prints each batch with its files and sizes and stops.

## The reviewer

The script adds a detached worktree of `origin/main` next to the repo, in `<parent>/<repo>-worktrees/revision-release-<run id>`. The run id makes each run's folder its own, so two reviews never share or delete each other's worktree; an existing folder with that name is an error. The rules come from `AGENTS.md` as it is in `origin/main`.

Each batch runs `claude --print` in that worktree, with:

- the model `RELEASE_REVIEW_MODEL` (default `fable`);
- only the `Read`, `Grep` and `Glob` tools, with `Bash`, `Edit`, `Write`, `NotebookEdit`, `WebFetch`, `WebSearch`, `Agent` and `Task` also denied explicitly;
- `--strict-mcp-config`, so no MCP server and no external service, and `--no-session-persistence`.

The prompt (`buildReviewPrompt`) gives the range, the batch number, the files and the diff, says the working directory is exactly what ships, and asks only for real defects the diff introduces or exposes: bugs, security, data loss, broken contracts and violations of `AGENTS.md`, not style. The answer must start with exactly `STATUS: PASSED` or `STATUS: FAILED`, then one finding per line as `path:line - severity - what and why`, in Spanish.

Batches run `RELEASE_REVIEW_JOBS` at a time (3 by default) through `mapWithConcurrency`. Each has `RELEASE_REVIEW_TIMEOUT_MINUTES` (20 by default); at the limit the process gets `SIGTERM` and, 10 seconds later, `SIGKILL`. A batch counts as an error when it times out, when `claude` exits with a non-zero code, or when the first non-empty line of its answer is not an exact `STATUS` line (`parseReviewStatus`).

The worktree is removed with `git worktree remove` when the batches finish, also on failure. Ctrl-C or `SIGTERM` stops the running reviewers, removes the worktree and exits with 130. Only the worktree this run created is removed, and only through git.

## Report and exit code

The report goes next to the worktrees, outside the repo: `<parent>/<repo>-worktrees/revision-release-<since>..<sha>.md`, with any character outside `A-Za-z0-9._-` in the start ref replaced so a ref like `release/1` creates no folder. `renderReport` writes the range, the model, the count of passed, failed and errored batches, and each batch's files and answer. The script prints the path and the summary and exits with 1 when any batch failed or errored, 0 otherwise.

## Configuration

| Variable | Default | |
|---|---|---|
| `RELEASE_REVIEW_MODEL` | `fable` | Claude model |
| `RELEASE_REVIEW_JOBS` | 3 | Batches at once |
| `RELEASE_REVIEW_TIMEOUT_MINUTES` | 20 | Per batch |
| `RELEASE_REVIEW_BATCH_CHARS` | 120000 | Diff characters per batch |

They are read from the process environment; a numeric value that is not a positive integer stops the script with exit code 2. `.env.example` lists them under local tools. See [Environment configuration](../architecture/configuration.md).

## Tests

`tests/unit/review-release.test.ts` covers the git-free half in `scripts/review-release-plan.ts`: reading `.gga` patterns, gga's matching rules, file selection, splitting the diff per file (with renames), batching, splitting a large file by hunk and by line without losing a line, the "parte i de n" pieces, the `STATUS` verdict, the arguments, the worktree and report paths, the prompt, the summary and the report.

## Related pages

- [CI and quality gates](ci-and-quality-gates.md): the per-commit gga review and the PR checks
- [Deployment and releases](../operations/deployment.md)
