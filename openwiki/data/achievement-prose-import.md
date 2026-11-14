---
type: workflow
title: Achievement prose import
description: How pnpm import:achievement-prose reads Torre's Squarespace achievement pages, separates his intro and outro prose from the template lists the new page computes, uploads screenshots and video posters once, and writes the two rich text fields under the importSnapshot rule so reruns never undo panel edits.
tags: [import, squarespace, achievements, lexical, media, idempotence]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-14T11:00:46.827Z
sources:
  - id: openwiki-source-4f8284350483721001a22067
    resource: repo://scripts/import/achievements/load-prose.ts
  - id: openwiki-source-f58371ff7e126ee2dc86f80d
    resource: repo://scripts/import/achievements/prose.ts
  - id: openwiki-source-d6f1e829c0341e0f776c0395
    resource: repo://scripts/import/achievements/read-pages.ts
  - id: openwiki-source-5f5b0b3a227c3a5603a8af8f
    resource: repo://scripts/import/import-achievement-prose.ts
  - id: openwiki-source-5405923907e430198e1340e6
    resource: repo://scripts/import/media-by-url.ts
  - id: openwiki-source-b1290e6299419041ad1c504b
    resource: repo://tests/integration/import-achievement-prose.test.ts
  - id: openwiki-source-acf83a7634abf1e37b79d0a8
    resource: repo://tests/unit/import-achievement-pages.test.ts
generated: { by: "claude-code", at: "2026-11-14T11:00:46.827Z" }
---

# Achievement prose import

Achievement pages already exist when this import runs: `pnpm data:quests` creates them from DofusDB and `pnpm import:achievements` copies Torre's metalogro index onto them (see [Importing Torre's achievement pages](achievements-import.md)). What is missing is Torre's own writing on each page: the text before the quests and the text after the lists, with his screenshots and YouTube videos. `pnpm import:achievement-prose` brings that into the `intro` and `outro` rich text fields of `achievement-pages` and changes nothing else.

## Running it

```
pnpm import:achievement-prose [--from <folder>] [--apply] [--remote] [--production]
```

- Without `--from` it downloads `https://www.torrentearcano.com/<slug>` for every achievement page; with `--from` it reads `<folder>/<slug>.html`, the cached crawl.
- Without `--apply` it is a dry run: it counts and reports, and neither writes nor uploads.
- It refuses a remote database without `--remote` and production without `--production` (`databaseScriptRefusal`), before Payload starts.

The report lists the pages with and without prose, the pages with no Squarespace page, how many it updated or left unchanged, the fields it kept because Torre edited them, and every oddity (a screenshot or poster that failed to download).

## Separating prose from the template

`scripts/import/achievements/prose.ts` is pure code over the page already parsed by the Squarespace parser (see [Squarespace import](squarespace-import.md)). Torre's pages follow a template: the title, the quest list, «Para estas misiones, vas a necesitar en total:» with its lists, and «Recompensas del logro:» with its own. The new page builds those lists from DofusDB and the guides (see [Achievement page](../achievements/achievement-page.md)), so the import must leave them out and keep everything else.

- **Template labels** are matched exactly, ignoring accents, case and the final colon. «Para este logro vas a necesitar mucha paciencia» is his sentence, not the label.
- **The intro** is everything between the title and the first list or template label. A list introduced by one of his sentences («…las misiones del tutorial:») stays with that sentence and the intro continues.
- **The rest of the page**: a template label and the lists after it are template, and so is a list right after another list or label. A list after prose belongs to that prose. Inside the «Necesitarás» block, a known group label («Combates:») is template; a short subtitle of his own («Consejo importante:») is prose.
- When in doubt, a list is treated as template, because a stray list on the new page would repeat what it already shows.

The result is two ordered lists of HTML fragments, images and videos. `read-pages.ts` releases each parsed document right after reading it, because happy-dom keeps about 8 MB per page.

## Building and writing the fields

`loadAchievementProse` (`scripts/import/achievements/load-prose.ts`) reads every achievement page's latest draft (`draft: true`), so it compares against a draft Torre has in progress. For each of `intro` and `outro`:

1. **Decide first.** A field counts as edited by Torre when it differs from what the last import wrote (`importSnapshot`), or, if the import never wrote it, when it is not empty. Empty means nothing stored, or text with no letters, images or videos.
2. **Build.** The prose becomes Lexical JSON: each HTML fragment through the shared HTML-to-Lexical converter, each screenshot as an upload node, and each video as a `proseVideo` block with its poster (see [Guide body blocks](../cms/blocks.md)). A video without a title gets the page's name with its place among all the page's videos, intro and outro together («(2 de 3)»). Files are uploaded only when the run applies and the field is not edited, so a kept field uploads nothing.
3. **Compare.** If the built field equals the stored one, only the snapshot is refreshed. If Torre edited it, it is kept and reported. Otherwise it is written and the snapshot records it.

Comparison ignores the node ids Payload adds and the key order Postgres returns. A page with nothing to change is not written, so a second run changes nothing. When Torre has a draft in progress, the update goes to that draft and is not published.

**Media.** Screenshots come from Squarespace's CDN and posters from YouTube through `mediaByUrl` (`scripts/import/media-by-url.ts`), which looks a file up by its `originalUrl` and uploads it only once, so reruns reuse files. A failed download raises `ImageDownloadError`: that image or poster is left out, reported as an oddity, and the text stays. Any other error, such as a database error, stops the run.

## Tests

- `tests/unit/import-achievement-prose.test.ts`: separating prose from the template on cached pages in `tests/fixtures/squarespace/logros/`.
- `tests/unit/import-achievement-pages.test.ts`: reading the pages.
- `tests/integration/import-achievement-prose.test.ts`: dry run, writing both fields with a video and a screenshot in place, an idempotent second run, Torre's edits surviving while untouched fields stay current, the update going to Torre's draft, pages missing from the cache, a failed download versus a database error, and video numbering across intro and outro.
