---
type: operations
title: Legacy link reports and URL map
description: The two read-only reports for the domain cutover - pnpm urls:map, what this site will do with every old Squarespace URL, and pnpm links:legacy, every link the site would still render to Squarespace - with the shared blocker groups, the typo detection and how they are run.
tags: [redirects, cutover, squarespace, links, reports, operations]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-20T11:20:16.585Z
sources:
  - id: openwiki-source-1364a33be7315005959b4797
    resource: repo://.gga
  - id: openwiki-source-a178464933a9522821ca6e94
    resource: repo://scripts/legacy-links/blockers.ts
  - id: openwiki-source-b7d1374c969affd28190192e
    resource: repo://scripts/legacy-links/collect.ts
  - id: openwiki-source-a8547ef5e3c835f5f8f9b480
    resource: repo://scripts/legacy-links/report.ts
  - id: openwiki-source-9f194360bc83aec5a26a9775
    resource: repo://scripts/legacy-links/scan.ts
  - id: openwiki-source-8276fc4d61b410bcc8e2f6a5
    resource: repo://scripts/legacy-links/site-index.ts
  - id: openwiki-source-09dcd48b3439c2272fcf3fb7
    resource: repo://scripts/legacy-links/typos.ts
  - id: openwiki-source-f34c8a4e9e814034ce601295
    resource: repo://scripts/legacy-links/url-map.ts
  - id: openwiki-source-e1c4660eaaf8c4f6b0bc08c0
    resource: repo://scripts/links-legacy.ts
  - id: openwiki-source-c49f8d0ba6e62d43b7ad1ef8
    resource: repo://scripts/url-map.ts
  - id: openwiki-source-8c46585c43c5b7d92d59e6b1
    resource: repo://tests/unit/legacy-blockers.test.ts
  - id: openwiki-source-ea97ac976ff1e41e2f83ab44
    resource: repo://tests/unit/legacy-link-typos.test.ts
  - id: openwiki-source-06e93cc8270d70aa200f2b6e
    resource: repo://tests/unit/legacy-links.test.ts
  - id: openwiki-source-e0abb70027786d74189b4925
    resource: repo://tests/unit/url-map.test.ts
generated: { by: "claude-code", at: "2026-11-20T11:20:16.585Z" }
---

# Legacy link reports and URL map

Before the domain moves from Squarespace to this site, two things must be known: what this site will answer on every URL Squarespace serves today, and which links on this site still point at Squarespace. Two read-only reports answer them. Both read the database and never write to it, both refuse a remote database without `--remote` and production without `--production`, and both keep their logic in `scripts/legacy-links/`. The redirect table they check against is described in [Legacy redirects, sitemap and robots.txt](redirects-and-seo.md).

## What this site has: `readSiteIndex`

`readSiteIndex` (`scripts/legacy-links/site-index.ts`) reads what this site has at `/<slug>`: every published document of the collections with their own page, marking those «En preparación», and the slugs Torre changed (the `redirects` collection). Both reports use it.

## `pnpm urls:map`: every old URL

```
pnpm urls:map [--write] [--sitemap <url or file>] [--remote] [--production]
```

`scripts/url-map.ts` reads Squarespace's sitemap (or a saved copy with `--sitemap`; a sitemap index is followed) and gives each URL one fate with `classifyOldUrl` (`scripts/legacy-links/url-map.ts`), checking in the order the site answers:

1. **Redirected**: a row of the redirect table, with its section, because the proxy answers before any page; or **Gone**, when that row is a 410.
2. **Served**: the home page, one of the site's own routes, or a published document with the same slug. One «En preparación» is served but still waits for Torre, and carries its blocker.
3. **Redirected** with a 308: a slug Torre changed.
4. **Deferred**: classes, dungeons and the inline tools without a page here, which the owner decides before cutover.
5. **Missing**: nothing answers it yet, with who or what unblocks it and a note when there is one.

It prints a summary in Spanish. With `--write` it rewrites `docs/research/url-map.md` in English (backlog B-08): the summary, what is left before cutover grouped by blocker, and every URL with its fate. That file is generated: rerun it after each change to the redirect table or publishing batch, and against production on cutover day while Squarespace still serves its sitemap. The GGA review skips it.

## `pnpm links:legacy`: every link to Squarespace

```
pnpm links:legacy [--remote] [--production]
```

`scripts/links-legacy.ts` lists every link the site would render to Squarespace (`https://www.torrentearcano.com`) or to a path that answers 410 here. `collectLegacyLinks` (`scripts/legacy-links/collect.ts`) reads three sources:

- **Code**: the menu sections that still link to Squarespace (Clases, Mazmorras) and the footer's legal links without a page in «Páginas».
- **Content**: Torre's links in every collection and global that can hold one, published documents in the Publicada state only. `scanLinks` (`scripts/legacy-links/scan.ts`) walks a document by its collection's schema and takes the link and autolink nodes of each rich text and the text fields that are links (`url`, `link`, `href`, `legacyHref`); a title or an imported guide's `originalUrl` is not a link. Users, redirects and the refresh log are skipped.
- **«En preparación»**: the `legacyHref` of what is published but still preparing, which points to Squarespace on purpose until Torre publishes it.

`classifyLink` (`scripts/legacy-links/report.ts`) resolves each link with the site's own rule (`siteLinkHref` and `servedPath`, see [Legacy redirects, sitemap and robots.txt](redirects-and-seo.md)). A link that already goes to this site (a published page, a redirect row, an own route) is only counted. The rest are listed with where the link is, whether it comes from code, content or something «En preparación», and what this site will answer on that path after the cutover (404 or 410).

The report must come back empty on cutover day except the «En preparación» items and the sections Torre decides to keep on Squarespace. Each line is fixed with a published page, a redirect row or an edit in the panel. It also runs against dev (`railway run -s web -e dev -- pnpm links:legacy --remote`) and the local database.

### Typos

A content link that nothing else claims and whose slug is a close misspelling of a page this site serves goes to its own group and names the page it meant, so Torre fixes it in the panel (`/operacion-envenenacion` for `/operacion-envenenamiento`). `typoTarget` (`scripts/legacy-links/typos.ts`) requires the same number of hyphen-separated words, at most one edit per five letters of the longer slug (`editDistance`, shared with the reward typo fixer in `src/lib/text/edit-distance.ts`), and one clear winner: when two pages are equally close, it picks none.

## Blockers

Both reports group what is left by `BlockerKey` (`scripts/legacy-links/blockers.ts`), in the cutover list's order (`BLOCKER_ORDER`), each with a Spanish text for the console and an English one for `docs/`:

| Group | Meaning |
|---|---|
| `classes`, `dungeons`, `tools` | Deferred by the owner on 2026-11-18, to decide before cutover: classes (S-10), dungeons and the Crocantería hub (S-11), the inline tools |
| `S-08`, `S-06` | Waiting for a backlog row: the Krosmoz metalogro and three loose pages (S-08), the Alineamiento achievements with no page here yet (S-06) |
| `S-05`, `dofus-guides`, `pages`, `checklists` | Published «En preparación»: Torre publishes the achievement page, Dofus guide, site page (the legal pages: B-10) or checklist |
| `delta-import` | A guide Torre wrote on Squarespace after the first import, which the delta import brings (see [Inventory and delta import](../data/delta-import.md)) |
| `stub` | An empty stub with no redirect row yet, waiting for its achievement page (B-04, S-05; `pnpm redirects:stubs` names it) |
| `torre-edits` | A link to a path that answers 410 here with no page to replace it: Torre changes it |
| `typo` | A misspelled slug, with the page it meant |
| `undecided` | Nobody has decided yet |

Every group must be empty or decided by the owner before the move. The cutover runbook in AGENTS.md (Redirects) runs `pnpm urls:map --production --write` and then `pnpm links:legacy --production`.

## Tests

- `tests/unit/url-map.test.ts`: reading a sitemap and a sitemap index, each fate in its order (table first with its section, a changed slug as 308, 410, deferred classes and dungeons unless their page is published, missing with its blocker and note, the delta import), the counts, the Spanish console summary and the English document.
- `tests/unit/legacy-links.test.ts`: scanning rich text and link fields with where they are, which collections can hold links, what the site renders and will answer, grouping in the cutover order, and the empty report.
- `tests/unit/legacy-blockers.test.ts`: each blocker and that every one has both texts and a place in the order.
- `tests/unit/legacy-link-typos.test.ts`: one-letter typos, a changed word ending, no match for another word count or too far, no pick on a tie, absolute Squarespace links, and the typo group in the report.
