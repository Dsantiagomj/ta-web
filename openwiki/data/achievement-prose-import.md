---
type: workflow
title: Achievement prose import
description: How pnpm import:achievement-prose reads Torre's Squarespace achievement pages, separates his intro and outro prose from the template lists the new page computes, uploads screenshots and video posters once, and writes the two rich text fields under the importSnapshot rule so reruns never undo panel edits.
tags: [import, squarespace, achievements, lexical, media, idempotence]
sources:
  - id: openwiki-source-9dfa5c8bbbe23b07c3f246f9
    resource: repo://scripts/import/achievements/alignment.ts
  - id: openwiki-source-048c6cc9612cedfa2505c240
    resource: repo://scripts/import/achievements/load-alignment.ts
  - id: openwiki-source-4f8284350483721001a22067
    resource: repo://scripts/import/achievements/load-prose.ts
  - id: openwiki-source-f58371ff7e126ee2dc86f80d
    resource: repo://scripts/import/achievements/prose.ts
  - id: openwiki-source-d6f1e829c0341e0f776c0395
    resource: repo://scripts/import/achievements/read-pages.ts
  - id: openwiki-source-c567f09baaab6d4a5cf69f76
    resource: repo://scripts/import/achievements/squarespace-source.ts
  - id: openwiki-source-5f5b0b3a227c3a5603a8af8f
    resource: repo://scripts/import/import-achievement-prose.ts
  - id: openwiki-source-64606d35f696cb9a48dee37d
    resource: repo://scripts/import/import-alignment-achievements.ts
  - id: openwiki-source-5405923907e430198e1340e6
    resource: repo://scripts/import/media-by-url.ts
  - id: openwiki-source-b1290e6299419041ad1c504b
    resource: repo://tests/integration/import-achievement-prose.test.ts
  - id: openwiki-source-acf83a7634abf1e37b79d0a8
    resource: repo://tests/unit/import-achievement-pages.test.ts
  - id: openwiki-source-dced4de190c01b84097489cb
    resource: repo://tests/unit/import-achievement-prose.test.ts
  - id: openwiki-source-6ea04f4ad817c1daf0e775f8
    resource: repo://tests/unit/import-alignment-achievements.test.ts
generated: { by: "claude-code", at: "2026-11-20T11:20:16.585Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-20T11:20:16.585Z
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

Two kinds of page change that split (`AchievementProseOptions`):

- **A page with no DofusDB achievement** (El guardián del puente de la muerte, `dofusDb: false`). DofusDB gives it no Prerrequisitos, Necesitarás or Recompensas, so only Torre says them: those labels, their group labels and their lists are collected apart (`summary`) and appended to the intro in their order instead of being dropped.
- **A page that shows no quests** (the «Alineamiento» achievements, `quests: false`). Its lists are not the quest list: the first list after the title stays in the intro, and after a template label only the first list is template, so his own lists of quests stay as prose.

The result is two ordered lists of HTML fragments, images and videos. `read-pages.ts` reads each page with its `dofusDb` and `quests` flags (`AchievementPageRef`) and releases each parsed document right after reading it, because happy-dom keeps about 8 MB per page. `squarespace-source.ts` holds what this script and `pnpm achievements:alineamiento` share: `squarespacePageReader` (the cached `<from>/<slug>.html`, or a download from Torre's site with a 30-second timeout, null on 404) and `proseMedia` (the HTML-to-Lexical converter and the screenshot and poster uploads).

## Building and writing the fields

`loadAchievementProse` (`scripts/import/achievements/load-prose.ts`) reads every achievement page's latest draft (`draft: true`), so it compares against a draft Torre has in progress. For each of `intro` and `outro`:

1. **Decide first.** A field counts as edited by Torre when it differs from what the last import wrote (`importSnapshot`), or, if the import never wrote it, when it is not empty. Empty means nothing stored, or text with no letters, images or videos.
2. **Build.** The prose becomes Lexical JSON: each HTML fragment through the shared HTML-to-Lexical converter, each screenshot as an upload node, and each video as a `proseVideo` block with its poster (see [Guide body blocks](../cms/blocks.md)). A video without a title gets the page's name with its place among all the page's videos, intro and outro together («(2 de 3)»). Files are uploaded only when the run applies and the field is not edited, so a kept field uploads nothing.
3. **Compare.** If the built field equals the stored one, only the snapshot is refreshed. If Torre edited it, it is kept and reported. Otherwise it is written and the snapshot records it.

Comparison ignores the node ids Payload adds and the key order Postgres returns. A page with nothing to change is not written, so a second run changes nothing. When Torre has a draft in progress, the update goes to that draft and is not published.

**Media.** Screenshots come from Squarespace's CDN and posters from YouTube through `mediaByUrl` (`scripts/import/media-by-url.ts`), which looks a file up by its `originalUrl` and uploads it only once, so reruns reuse files. A failed download raises `ImageDownloadError`: that image or poster is left out, reported as an oddity, and the text stays. Any other error, such as a database error, stops the run.

## Alineamiento pages: `pnpm achievements:alineamiento`

DofusDB gives the «Alineamiento» achievements (category 43, under Misiones) no quests, so `ensureAchievementPages` never creates their pages (see [Achievement data model](../achievements/achievement-data.md)). Torre has one Squarespace page per achievement, linked from his `/logros` index under «Alineamiento», with his own slugs («logro-a-sus-ordenes»).

```
pnpm achievements:alineamiento [--from <folder>] [--apply] [--remote] [--production]
```

Run it after `pnpm data:refresh`, which stores each achievement's description and objectives. It reads `/logros` (cached or downloaded like the prose import) and:

1. `alignmentLinks` (`scripts/import/achievements/alignment.ts`) takes the links under the «Alineamiento» heading, up to the next heading: from each paragraph its first link to Torre's site (the slug) and the rest of the text as a note.
2. `matchAlignment` pairs each DofusDB achievement of the category with Torre's link of the same name, ignoring case, accents and punctuation; each achievement matches at most once.
3. `loadAlignmentPages` (`load-alignment.ts`) skips an achievement that already has a page (drafts included) and a slug something else already uses (`isRootSlugTaken`: another page, a site route or a redirect row). With `--apply` it creates the rest with Torre's slug, `state: preparing` and published, and lets the fill hook copy the name, metalogro, order, points and rewards from DofusDB. It never changes a page that exists.
4. It then brings each new page's prose as the prose import does, with `quests: false`.

The report lists the pages created (or that would be), the existing ones with their slug and Torre's, the taken slugs, the achievements Torre does not list and the links that match no achievement. Without `--apply` it writes and uploads nothing. The page itself shows the achievement's DofusDB objectives in place of quests (see [Achievement page](../achievements/achievement-page.md)).

## Tests

- `tests/unit/import-achievement-prose.test.ts`: separating prose from the template on cached pages in `tests/fixtures/squarespace/logros/`.
- `tests/unit/import-achievement-pages.test.ts`: reading the pages.
- `tests/unit/import-alignment-achievements.test.ts`: reading the «Alineamiento» list under its heading and matching by folded name, never matching an achievement twice.
- `tests/integration/import-achievement-prose.test.ts`: dry run, writing both fields with a video and a screenshot in place, an idempotent second run, Torre's edits surviving while untouched fields stay current, the update going to Torre's draft, pages missing from the cache, a failed download versus a database error, and video numbering across intro and outro.
