---
type: testing
title: Import golden tests
description: How pnpm test:import pins the Squarespace import converters on thirty saved pages, how the pages are trimmed and compared as stable JSON, and how pnpm import:golden-refresh downloads them again before a delta import so a person reviews the diff and accepts it with -u.
tags: [testing, import, squarespace, golden, vitest]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-20T11:20:16.585Z
sources:
  - id: openwiki-source-164e2da859b5277df81c7d94
    resource: repo://.github/workflows/ci.yml
  - id: openwiki-source-74598fbf01c884dc0f03c47f
    resource: repo://scripts/import/golden/catalog.ts
  - id: openwiki-source-785a3ebae51c8ffe42e51883
    resource: repo://scripts/import/golden/convert.ts
  - id: openwiki-source-1472c2738e543a72822ab0fe
    resource: repo://scripts/import/golden/line-diff.ts
  - id: openwiki-source-d5b245583c3d39350d311b5a
    resource: repo://scripts/import/golden/refresh.ts
  - id: openwiki-source-a6a7eedb4b7c5916ecf40fb4
    resource: repo://scripts/import/golden/stable-json.ts
  - id: openwiki-source-805510b46e08ea688e542ce8
    resource: repo://scripts/import/golden/trim-source.ts
  - id: openwiki-source-1a0a7b490170f9adbc7441c8
    resource: repo://scripts/import/refresh-golden.ts
  - id: openwiki-source-6eb739d1a9b83dd96dbc161b
    resource: repo://tests/import/golden-pages.test.ts
  - id: openwiki-source-e607a47afb6ad1d96c7da66f
    resource: repo://tests/unit/import-golden-line-diff.test.ts
  - id: openwiki-source-038c39328b89279111e34640
    resource: repo://tests/unit/import-golden-refresh.test.ts
  - id: openwiki-source-bc7f5a7a2c975b61ce209ef0
    resource: repo://tests/unit/import-golden-stable-json.test.ts
  - id: openwiki-source-2d4c660d982837f76ee5aa0e
    resource: repo://tests/unit/import-golden-trim-source.test.ts
  - id: openwiki-source-6084df42bc550c2967b0e6f1
    resource: repo://vitest.import.config.mts
generated: { by: "claude-code", at: "2026-11-20T11:20:16.585Z" }
---

# Import golden tests

The Squarespace import converters (quest guides, achievement prose, Dofus guides, site pages, class and dungeon pages) turn Torre's pages into what ta-web stores. A change to a converter that alters real content must show up before the delta import, the last re-import before the domain cutover (backlog S-15; see [Inventory and delta import](../data/delta-import.md)). `pnpm test:import` does that on thirty saved pages, without a database or the network.

## The suite

`pnpm test:import` runs Vitest with its own config, `vitest.import.config.mts`, over `tests/import/**/*.test.ts`. `tests/import/golden-pages.test.ts` checks three things:

- The catalog (`GOLDEN_PAGES` in `scripts/import/golden/catalog.ts`) has 30 pages, no repeats, each with a saved source and a reviewed output, and nothing else in the folders.
- Each page converts exactly to its reviewed output. Run with `-u`, the test writes the new outputs instead.
- The prose of each output reaches Lexical (`scripts/import/rich-text.ts`) without losing text or links.

CI runs it in its own job, «Importación» (see [CI and quality gates](../workflows/ci-and-quality-gates.md)).

## The fixtures

`tests/fixtures/import-golden/` holds two folders and a README that explains why each page is there:

| Folder | Content |
|---|---|
| `pages/<slug>.html` | The live page trimmed by `trimSource` (`scripts/import/golden/trim-source.ts`) to what the converters read: the `<title>`, the SEO description, the collection title of Squarespace's context JSON and every `<article>` whole, without the attributes no converter reads (block scripts and styles, image sizes, breakpoint styles). The header, scripts, styles and footer go: they are two thirds of the page and change on every visit |
| `expected/<slug>.json` | The converter output, reviewed block by block against the live page, written by `stableJson` (`scripts/import/golden/stable-json.ts`): keys sorted at every depth, arrays in reading order, `undefined` fields dropped, a final newline. Two equal conversions give the same text, so a diff shows only what changed |

The pages were picked by running the converters over the 1,272 cached quest guides of the inventory crawl and grouping them by the branches they take (oddities, callouts, steps, videos, summary fields): the common quest guide shape, a video after the closing line, a numbered heading that differs from the title, warning and tip callouts, «ETAPA n:» steps, the longest guide, rewards by level, an empty Squarespace image block, a guide with no steps, links to other guides and other sites, a misspelled «Prerequisitos», achievement prose (one page without a DofusDB achievement), Dofus guides, site pages, class pages and a dungeon page. Checklists are not there: their import reads a copy of `silvestre-checklist`, not Squarespace.

`goldenOutput` (`scripts/import/golden/convert.ts`) calls each page's converter the way the `import-*.ts` scripts do, up to the Payload load: prose stays HTML and images and videos stay as their original URLs. It fixes the inputs the load takes from elsewhere: quest guides get no DofusDB match (that comes from the inventory's `quest_matches.csv`), achievement pages have a DofusDB achievement unless the catalog marks them `noDofusDb`, and no page counts as live on this site, so Torre's links to his own pages go to Squarespace unless they hit a reserved route or the redirect table.

## Refreshing before a delta import

```
pnpm import:golden-refresh   # downloads the 30 pages and prints the diff
pnpm test:import             # fails on every page whose output changed
pnpm test:import -u          # after reviewing each diff against the live page
```

`scripts/import/refresh-golden.ts` runs `refreshGoldenPages` (`scripts/import/golden/refresh.ts`, with the network and the disk injected): it downloads each page from Torre's site one at a time with a pause between them, trims it, and prints, page by page, how the converter's output differs from the reviewed one as a git-style line diff (`lineDiff`, `scripts/import/golden/line-diff.ts`: `-` and `+` lines with three lines of context and `@@` hunk headers). A page with no reviewed output yet shows whole as added.

It writes only `pages/`, never the reviewed outputs, a database or Media. It refuses a page that no longer answers 200, that redirects to another slug, or whose trimmed copy converts differently from the full page: that page keeps its old copy, the other pages go on, and the script exits 1. A person reviews the diff, which shows what Torre changed on Squarespace as the import reads it, and only then accepts it with `pnpm test:import -u`.

## Unit tests of the tooling

- `tests/unit/import-golden-trim-source.test.ts`: what the trim keeps and drops, every `<article>` in order, the attributes removed, a page without description or context, and the converters reading the same from the trimmed and the full page.
- `tests/unit/import-golden-stable-json.test.ts`: sorted keys, arrays in order, dropped `undefined`, untouched `null` and multi-line text, and rejecting values JSON cannot keep (a `Map`, a non-finite number).
- `tests/unit/import-golden-line-diff.test.ts`: no output for equal texts, changed lines with context, added and removed lines, separate and merged hunks, and a diff against an empty text.
- `tests/unit/import-golden-refresh.test.ts`: pages downloaded in sequence with a pause and saved trimmed, the diff of changed pages and the list of unchanged ones, a page without a reviewed output, a page that fails or redirects keeping its source, a trim that would change the output, and a network error on one page not stopping the rest.
