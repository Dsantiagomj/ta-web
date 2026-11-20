---
type: workflow
title: Inventory and delta import
description: How pnpm import:inventory downloads a new copy of Torre's Squarespace site and finds what changed page by page, and how pnpm import:delta brings those changes into ta-web without undoing his panel edits.
tags: [import, squarespace, delta, inventory, snapshot]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-20T11:20:16.585Z
sources:
  - id: openwiki-source-db16179834669d2157817073
    resource: repo://scripts/import/delta/load-delta.ts
  - id: openwiki-source-a2b5042247113f7486387ee8
    resource: repo://scripts/import/delta/match.ts
  - id: openwiki-source-8de10f0f41a44def7aa18964
    resource: repo://scripts/import/delta/metalogros.ts
  - id: openwiki-source-cdd407bd154f9b686a52bad5
    resource: repo://scripts/import/delta/rule.ts
  - id: openwiki-source-41364a3767e783fcafdc44a1
    resource: repo://scripts/import/import-delta.ts
  - id: openwiki-source-9aea8802c167ca35e756965c
    resource: repo://scripts/import/inventory/crawl.ts
  - id: openwiki-source-fa3b9a6583f3c7ceb32ca847
    resource: repo://scripts/import/inventory/pages.ts
  - id: openwiki-source-cef34e667bfef4c1d83f10a2
    resource: repo://scripts/import/refresh-inventory.ts
  - id: openwiki-source-90c704377da5e9094ba6d791
    resource: repo://tests/unit/import-delta-match.test.ts
  - id: openwiki-source-543e08ca6214d2441dc3c8fa
    resource: repo://tests/unit/import-delta-metalogros.test.ts
  - id: openwiki-source-2f2ec8e40dabb629cd641813
    resource: repo://tests/unit/import-delta-rule.test.ts
  - id: openwiki-source-5636ae1cf09d884062e421a3
    resource: repo://tests/unit/import-inventory.test.ts
generated: { by: "claude-code", at: "2026-11-20T11:20:16.585Z" }
---

# Inventory and delta import

The first import (see [Squarespace import](squarespace-import.md)) read an inventory of Torre's site taken on 2026-11-02. Torre kept writing on Squarespace afterwards: he filled empty stubs with whole quest guides, changed pages and added new ones. Before the domain cutover those changes have to reach ta-web, and they must not overwrite what Torre already changed in the panel. Two commands do it:

1. `pnpm import:inventory` downloads a new inventory and reports what changed against the previous one.
2. `pnpm import:delta` reads both inventories and brings the changes in.

Both keep the old inventory read-only. Inventories live outside any checkout, next to the repo (`../ta-web-inventario/<date>`); the first one is `silvestre-checklist-worktrees/migracion`.

## `pnpm import:inventory`

```
pnpm import:inventory --to <new folder> [--previous <last inventory>] [--delay <ms>] [--refresh] [--compare-only]
```

`scripts/import/refresh-inventory.ts` downloads Squarespace's sitemap and every page in it into the same layout as the first inventory: `raw/sitemap.xml`, `raw/pages/<slug>.html` (a path `/a/b` becomes `a__b`, `/` becomes `index`) and `raw/pages/_meta.json`.

- **Gently.** One page at a time with a pause between them (1 s by default, at least 500 ms). `fetchPage` (`scripts/import/inventory/crawl.ts`) retries a 429 or a 5xx up to three times with a growing wait, because Squarespace cut 45 of 1,798 requests on 2026-11-18. It follows a redirect only while it stays on the site and saves the final page's body.
- **Resumable.** A rerun downloads only what is missing or failed; `--refresh` downloads everything again and `--compare-only` downloads nothing.
- **Exit code.** The run exits 1 while any page failed, listing them, so a rerun picks them up.

It writes the comparison to `out/delta.json` and `out/delta.txt` in the new folder and never writes to the previous one.

### What counts as a change

Squarespace's sitemap `lastmod` does not move when Torre fills a page, so the comparison reads every page (`scripts/import/inventory/pages.ts`, pure code shared with the delta import). `pageFeatures` looks only inside `<main>`, so the Squarespace template does not count, and keeps:

- the visible text and its word count;
- the image file names on Squarespace's CDN (the CDN changes the path, not the name);
- the YouTube video IDs;
- a short hash of the code blocks;
- the links;
- the page title without « — Torrente Arcano».

`comparePage` gives each path one status:

| Status | Meaning |
|---|---|
| `same` | text, images, videos, code and links are all equal |
| `filled` | a stub with fewer than 20 words that now has 40 or more |
| `emptied` | the opposite: a page of 40 words or more that dropped under 20 |
| `changed` | anything else that differs; the report shows the changed text runs word by word (`wordChanges`, a longest common subsequence) |
| `new` / `removed` | the path entered or left the sitemap |

`compareInventories` (`scripts/import/inventory/read.ts`) runs this over the union of both sitemaps, and `inventoryReport` prints the totals and every page that is not `same`, grouped by status.

## `pnpm import:delta`

```
pnpm import:delta --from <new inventory> --previous <last inventory> [--apply] [--remote] [--production]
```

`scripts/import/import-delta.ts` refuses a remote or production database without its flag before Payload starts, compares the inventories and calls `loadDelta` (`scripts/import/delta/load-delta.ts`). It decides everything first and uploads after: without `--apply` it writes nothing and uploads nothing to Media, and reports page by page what it would do. Run it after `pnpm import:inventory` and after the redirect table that drops the stubs Torre filled has been deployed (`FILLED_STUBS` in `scripts/redirects/stubs.ts`; see [Legacy redirects, sitemap and robots.txt](../operations/redirects-and-seo.md)).

Only pages whose status is `changed`, `filled` or `new` are handled. Each one goes to one of these paths.

### New quest guides

A stub Torre filled or a new page becomes a quest guide when its text looks like one (`looksLikeQuestGuide`: two of the three summary labels Prerrequisitos, Necesitarás and Recompensas, or Prerrequisitos with coordinates) and its slug is never one (`neverQuestGuide`: checklists and their `-datos` pages, metalogros and `logro-` pages). Its DofusDB quest comes from `questMatcher` (`scripts/import/delta/match.ts`), the same cross the first inventory used: by the slug, with Squarespace's dropped `ñ` and with `n`, also without a trailing number, and by the title with and without Torre's type prefix («Logro:», «Misión:»). Several matches are ambiguous and the guide stays unlinked, with an oddity.

A page whose path is still a source in the legacy redirect table is reported as blocked by the table instead of created, because the proxy would answer that URL before the page. The rest go through the normal guide import (`loadQuestGuides`), so they are created as drafts with their images uploaded once.

### Quest guides already imported

A changed page belongs to an imported guide when its slug is the last segment of that guide's `originalUrl` (`sourceSlug`). For each one whose page changed, the importer builds what it makes from the previous page and from the new one and applies `deltaUpdate` (`scripts/import/delta/rule.ts`) field by field over `TRACKED_FIELDS`:

- A field that already equals the new value does not change, and the snapshot records it.
- With an `importSnapshot`, a field changes only while it still equals the snapshot.
- Without one (a guide from the first import), a field changes only when it is exactly what the importer makes from the previous inventory's page. Anything else, including a field Torre emptied, is his: it stays and is listed.
- A field kept as Torre's keeps its snapshot, so the next run still sees it as his.

This is stricter than the guide import's own rerun rule: without a snapshot, `pnpm import:guides` counts a field as Torre's only when it differs from Squarespace and is not empty, so a field he emptied would be filled again. The guide is saved with the status it had (a published guide stays published) and with its new snapshot; a run with no content change only records the snapshot. As in the guide import, a hand-picked dungeon whose note is gone from Notes is removed. The body's images are uploaded only after the decision, when the run applies.

### Achievement pages

An achievement page whose Squarespace page changed gets its prose through the prose import (`loadAchievementProse`), which follows its own snapshot rule (see [Achievement prose import](achievement-prose-import.md)). The report lists which fields would change and the screenshots or posters it would upload.

### Metalogros

Metalogro pages are only reported. A metalogro's achievements come from its DofusDB category and its loose guides are Torre's choice in the panel, so the import never changes them. For each changed page that the redirect table sends to a `/metalogros#<anchor>`, `compareMetalogro` (`scripts/import/delta/metalogros.ts`) compares the slugs the Squarespace page links (`linkedSlugs`) with the panel: what Squarespace links and the panel lacks, with what that slug is here (an achievement page of another metalogro, a quest guide missing from «Otras guías», or nothing), and what the panel has that Squarespace does not link. Guides created in the same run count as guides.

### What it does not handle

A changed page that belongs to a Dofus guide, checklist, standalone page or class or dungeon page is listed with the command that owns it (`pnpm import:dofus-guides`, `pnpm import:checklists`, `pnpm import:pages`, `pnpm import:section-pages`), not changed. So is a page whose slug a hand-made quest guide already uses, a nested path, a slug that is never a quest guide, and a page that does not look like one.

`deltaReport` prints each section and the totals: new guides and the ones blocked by the table, the guides updated and the fields kept as Torre's, the prose updates, the metalogro comparisons and the untreated pages, plus what was written when the run applies.

## Before a delta import

The converters' output is pinned by the golden pages of `pnpm test:import`. Before a delta import, `pnpm import:golden-refresh` downloads those pages again and prints how their converted output changed, so a change in Squarespace's markup shows up before it reaches the database (see [Import golden tests](../testing/import-golden.md)).

## Tests

- `tests/unit/import-inventory.test.ts`: sitemap paths and file names, `pageFeatures` reading only `<main>`, the statuses (including a filled stub and a new image), `wordChanges`, the report, and `fetchPage` retrying, following a redirect on the site and refusing one that leaves it.
- `tests/unit/import-delta-rule.test.ts`: `deltaUpdate` with and without a snapshot, a field Torre emptied, the snapshot written after a save, and a field the previous page cannot rebuild.
- `tests/unit/import-delta-match.test.ts`: the quest cross by slug, title and trailing number, ambiguous matches, slug variants, and which pages are quest guides.
- `tests/unit/import-delta-metalogros.test.ts`: `linkedSlugs` and `compareMetalogro`.
