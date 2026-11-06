---
type: workflow
title: Squarespace import
description: How the Squarespace import reads a cached Squarespace page, orders its blocks, and turns it into a quest guide draft (summary, start NPC, body blocks, oddities), how prose becomes Payload's Lexical rich text, and how pnpm import:guides loads the guides and their images into Payload as drafts.
tags: [import, squarespace, quest-guides, lexical, scripts]
sources:
  - id: openwiki-source-f235d856bed1fd44853c5195
    resource: repo://.prettierignore
  - id: openwiki-source-2615540ec7553288b52f775d
    resource: repo://docs/legacy/infra.md
  - id: openwiki-source-d2cae621c91b518c9e5f5e6d
    resource: repo://docs/legacy/plan.md
  - id: openwiki-source-c8e16e16c743abca9f070b43
    resource: repo://docs/legacy/security.md
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-9e87f9929ce6181cecc80fe9
    resource: repo://scripts/import/import-guides.ts
  - id: openwiki-source-3fc9f0484081f9ab441d6219
    resource: repo://scripts/import/load-quest-guides.ts
  - id: openwiki-source-0e8df94882ff3664a5b6176f
    resource: repo://scripts/import/rich-text.ts
  - id: openwiki-source-db5dc5bd52b38a655df3ff57
    resource: repo://scripts/import/squarespace/dom.ts
  - id: openwiki-source-28a674deb733b9f3b5db61d2
    resource: repo://scripts/import/squarespace/fetch-image.ts
  - id: openwiki-source-8705b1c7dce71caa28081c52
    resource: repo://scripts/import/squarespace/parse-page.ts
  - id: openwiki-source-b51400beea5fa80f14019dae
    resource: repo://scripts/import/squarespace/quest-matches.ts
  - id: openwiki-source-fd0bec8778f0f03626754905
    resource: repo://scripts/import/squarespace/to-quest-guide.ts
  - id: openwiki-source-d58a4d3cf178bb2fa2e94831
    resource: repo://src/collections/Media.ts
  - id: openwiki-source-5cd8fc4d5a65c01359ed92e2
    resource: repo://tests/integration/import-quest-guides.test.ts
  - id: openwiki-source-bf890cc4722b5033a81aa698
    resource: repo://tests/unit/import-fetch-image.test.ts
  - id: openwiki-source-d5617545465b10f7c4424728
    resource: repo://tests/unit/import-parse-page.test.ts
  - id: openwiki-source-fe4a14de069bb6226ad2a447
    resource: repo://tests/unit/import-quest-matches.test.ts
  - id: openwiki-source-7c48f921336671c0ca29e644
    resource: repo://tests/unit/import-rich-text.test.ts
  - id: openwiki-source-299c190cabc2f0753a302110
    resource: repo://tests/unit/import-to-quest-guide.test.ts
generated: { by: "claude-code", at: "2026-11-06T15:25:11.354Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-06T15:25:11.354Z
---

# Squarespace import

Phase 1 moves torrentearcano.com from Squarespace into Payload. The plan in `docs/legacy/plan.md` (section 8) splits it into extract, transform, media, load and review queue. `scripts/import/` covers extract, transform and load for quest guides. It reads a cached Squarespace page, turns it into a guide draft (introduction, steps and closing) plus a list of oddities, and `pnpm import:guides` saves the drafts and their images in Payload; Payload generates each image's AVIF and WebP sizes on upload. The review queue and the other page types are still to come.

| File | What it does |
|---|---|
| `scripts/import/squarespace/dom.ts` | Parses HTML with happy-dom, with scripts and loading turned off; `releaseDom` frees the shared window between pages |
| `scripts/import/squarespace/parse-page.ts` | Reads a page: its title and its blocks in reading order |
| `scripts/import/squarespace/to-quest-guide.ts` | Turns a parsed page into a quest guide draft; lists the demo slugs |
| `scripts/import/squarespace/quest-matches.ts` | Reads the slug to DofusDB quest IDs table |
| `scripts/import/rich-text.ts` | Converts guide prose HTML into Lexical with the editor from Payload's config |
| `scripts/import/load-quest-guides.ts` | Saves converted guides and their images in Payload through the local API |
| `scripts/import/squarespace/fetch-image.ts` | Downloads an image from Squarespace's CDN, refusing any other URL or response |
| `scripts/import/import-guides.ts` | The `pnpm import:guides` command: reads the inventory, converts and loads |

## Parsing untrusted HTML

Squarespace HTML is not trusted. `dom.ts` keeps one shared happy-dom `Window`, with JavaScript evaluation, script, CSS and iframe loading, computed styles and all navigation disabled. happy-dom keeps every document it parses in that window (about 8 MB per page), so `releaseDom()` closes it and the next parse opens a fresh one. `pnpm import:guides` calls it after converting each page, and the loader after turning each guide's body into Lexical; documents parsed before the call are no longer valid. `parseHtml` parses a full document or a fragment (a fragment lands inside `body`). `normalizedText` returns an element's text with all whitespace, non-breaking spaces included, collapsed to single spaces. The import compares markers such as "Prerrequisitos" against that text.

happy-dom was already in the tree through `@lexical/headless`, pinned by a security override. It is now also a direct dev dependency at the same version (`docs/legacy/security.md`).

## Reading a page

`parsePage(html)` returns `{ title, blocks }`.

- **Title.** Squarespace embeds a context JSON in a script tag. The title comes from its `"collection":{"title":…}` entry, not from the all-caps H2 at the top of the page. With no context, or when the entry has an escape that is not valid JSON, `title` is `null` instead of the import failing.
- **Order.** Squarespace's fluid engine places each block with a CSS `grid-area: row / column`. The HTML order does not match what readers see. For each `article [data-fluid-engine]` section, `parsePage` reads the section's `<style>`, prefers the desktop rule (inside `@media (min-width: 768px)`, the layout Torre builds) over the mobile one Squarespace generates, and sorts blocks by row and then column. Blocks with no position go last. Sections keep their page order.
- **Blocks.** Each block has a `data-sqsp-block` type:

| Squarespace type | Parsed as |
|---|---|
| `text` | `text`, with each top-level element's tag, outer HTML and normalized text |
| `image` | `image`, with the original URL (`data-image`, else `data-src`) without its query string, and the trimmed `alt` (empty when missing) |
| `embed` | `video`, with an `https` URL. An Embedly wrapper is unwrapped to the YouTube URL in its `url` (or `src`) parameter. A URL that does not end up as `https`, such as `javascript:` or `data:` (also inside Embedly's `url`), is not a video |
| anything else, or an image or embed without a usable URL | `unknown`, keeping the Squarespace type; the converter lists it as an oddity |

## From page to guide

`toQuestGuide(page, { slug, questDofusIds })` returns `{ guide, oddities }`. It never throws on content. Anything that does not fit goes into `oddities`, meant for review in the panel.

The `guide` has `title`, `slug`, `originalUrl` (`https://www.torrentearcano.com/<slug>`), a `summary`, a `body` and the `questDofusIds`. The title is the Squarespace page title, then the leading heading, then the slug.

Rules, in the order the converter applies them to each text element:

1. **Summary.** A line starting with `Prerrequisitos`, `Necesitarás` or `Recompensas` followed by a colon (accents and case ignored) opens that field. The colon is required: "Necesitarás hablar con…" is prose. In the cached pages, all 2469 real labels have the colon and the 11 colonless lines are prose. Labels are checked first, so a label that arrives as an H1 or H2 still opens its field. Text after the label and the following elements of the same text block go into it, one line each, headings included (`<p>Prerrequisitos:</p><h2>Nivel mínimo 70</h2>` fills the prerequisites); a list gives one line per item. The field values are those lines joined with newlines. `Necesitarás` text goes to `summary.needs.notes`, not to the item list, which DofusDB fills when the guide is loaded (see below). A label with no text after it and no following lines leaves its field empty, which counts as a missing block. These lines never reach the body.
2. **Title heading.** Only an H1 or H2 that is the very first element of the page, with no text element or other block before it, is dropped as the title heading. Every later heading is body content. The dropped heading is compared with the page title ignoring accents, case, punctuation and a leading number such as "29. ". When the page has a title and the two differ, an oddity keeps the heading's full text for review, because the heading is sometimes the fuller name. Measured over the 1272 cached quest pages, the first H2 matched the title in 1029, matched once a leading number was removed in 194, and differed in 48, for example "Coleccionista de publicidad impresa en apuros" against the title "Coleccionista de publicidad".
3. **Closing sentence.** A paragraph starting with "Aquí termina la misión" (also "¡Y aquí se termina la misión…") loses that first sentence only. A sentence ends at `.`, `!`, `?` or `…`. The rest of the paragraph stays in the body; a paragraph with nothing else disappears.
4. **Start line.** The first paragraph starting with "Habla con X [x,y]" or "La misión empieza hablando con X [x,y]" fills `summary.startNpc` (without a leading el/la/los/las), `startX` and `startY`. "Habla con" counts only when its sentence says "para empezar", because the phrase appears in the middle of many guides. When the sentence says nothing more than that ("…para empezar la misión."), only that sentence leaves the body and the rest of the paragraph stays. When it carries more (when or where to go), the whole paragraph stays in the body. The trimming walks text nodes, so bold and links in the rest of the paragraph survive.

   Rules 3 and 4 apply only to `<p>` elements. A list item or heading with the same words stays whole in the body, and a start line inside a list does not fill the summary.
5. **Step markers.** A paragraph (not a list) matching `ETAPA <n>: <title>` opens a titled step and leaves the body; see [Steps](#steps).
6. **Recommendations.** A paragraph starting with all-caps `RECOMENDACIÓN`, `RECOMENDACION` or `RECOMENDACIONES` opens a `tip` callout. A bare label ("RECOMENDACIONES:") adds no text and the callout takes the following paragraphs up to and including the first list. A label with the advice in the same paragraph is stripped, the advice starts with a capital letter, and only a list right after it joins the callout. A label that says more ("RECOMENDACIONES PARA LA TERCERA LUCHA:") stays in the callout whole. A bare label with nothing after it stays as prose. When the label opens a text block, that block continues the previous step, so the advice lands in the step of the fight it is about.
7. **Callouts.** A paragraph starting with all-caps `IMPORTANTE`, `CUIDADO` or `ATENCIÓN` (with or without a leading `¡`) becomes a `callout` block with variant `warning`; `NOTA` becomes `tip`. The label is removed when a colon or exclamation mark follows it ("IMPORTANTE:", "¡ATENCIÓN, ATENCIÓN!"), without losing the formatting of the rest, and the remaining text starts with a capital letter; "CUIDADO CON EL MISSCLICK", with no colon or exclamation, is the sentence itself and stays whole. Lowercase "Cuidado, …" is plain prose. A paragraph left over after trimming rules 3 and 4 is checked again here.
8. **Prose.** Everything else is prose. Consecutive prose elements of the same Squarespace text block are joined into one `richText` block, still as HTML; each text block starts a new one.

Image blocks become `image` blocks with the original URL; an image without alt text takes the guide title as alt. Video blocks become `video` blocks. Unknown blocks are left out of the body.

### Steps

After the walk, `nestSteps` splits the body into an introduction, `step` blocks and a closing. A step carries an optional `title`, the first `[x,y]` found in its original text as `x` and `y` (the start line counts, even though it left the body), and its own content blocks. A title is never invented.

- **Marked steps.** When the page has `ETAPA n:` markers (only `el-safari-de-almas` does), they decide: each opens a step titled with the text after the colon, running until the next marker. The last one ends at the first text block that starts after its screenshots, unless a recommendations block continues it. Content before the first marker is the introduction; the closing sentence and what follows it are the closing. A marker with no title gives an untitled step; lowercase or mid-sentence "etapa" is prose.
- **Unit steps.** Otherwise Torre's pages mark nothing, but each text block is followed by its screenshots. A text block plus the screenshots and videos after it is one untitled step; a text block with no screenshots joins the next. Everything before the text block holding the start line is the introduction, screenshots and videos included. The closing sentence and what follows it, or text left after the last screenshots, is the closing.
- **No steps.** With fewer than two units (no screenshots, or a single block), the body stays as prose in page order and an oddity says so: "Sin pasos: ni marcas «ETAPA n:» ni bloques de texto con sus capturas; la guía queda como prosa". The five demo guides all split into untitled steps; "Seis pies bajo tierra" gives the eight steps of the design prototype.

Oddities, collected rather than thrown:

- the slug fails the collection's `validateSlug`;
- the page has no Squarespace title;
- no DofusDB quest is linked;
- a `Prerrequisitos`, `Necesitarás` or `Recompensas` block is missing or has a label but no text (one entry each);
- no start line was found;
- the body could not be split into steps;
- each unknown Squarespace block, by type;
- a dropped title heading that differs from the page title, with its text.

The body and summary match the guide fields in [Collections and access](../cms/collections.md#quest-guides-editorial-guides-with-drafts) and the blocks in [Guide body blocks](../cms/blocks.md).

## Rich text

The draft keeps prose and callouts as HTML. `createHtmlToLexical(config)` builds the editor config from Payload's sanitized config (`editorConfigFactory.default`) and returns a function that runs Payload's `convertHTMLToLexical` on an HTML string. `convertHTMLToLexical` expects a JSDOM-shaped constructor, so a small class wraps `parseHtml` and exposes `window.document`. Paragraphs, bold, links and lists come out as Lexical nodes from the same editor the panel uses. The returned state is typed as a `richText` block's `content` from the generated Payload types, so the loader can put it straight into a block.

## Quest matches

The Squarespace inventory in `out/` (outside the repo, described in `docs/legacy/plan.md`) includes `quest_matches.csv`. `parseQuestMatches(csv)` reads it into a map from slug to `{ questIds, ambiguous }`: `quest_ids` holds space-separated DofusDB IDs and `ambiguous` is true when the column says `True`. The CSV parser handles quoted fields with commas and doubled quotes, and a leading byte order mark (BOM) such as Excel writes is stripped. When the `slug`, `quest_ids` or `ambiguous` column is missing, `parseQuestMatches` throws `quest_matches.csv no tiene la columna «…»` instead of silently losing every match. A slug not in the file has no match.

## Loading into Payload

`loadQuestGuides(payload, guides, { fetchImage, log })` saves converted guides. It is a trusted server job, so every local API call passes `overrideAccess: true`. The image download is injected (`fetchImage`), which lets the integration test run without network.

- **Quest.** A guide links a single quest. The loader looks up every DofusDB ID of the batch in `quests` once, at `depth: 1` so item and prerequisite names come populated for the summary fill. When a guide names exactly one DofusDB ID (repeats count once), it links that quest's Payload ID; an ID missing from `quests` becomes the oddity "Misión de DofusDB … sin importar en quests", so run `pnpm data:quests` first. When a guide names several IDs, it links none rather than pick one at random, and records the oddity "Varias misiones de DofusDB (a, b): sin enlazar, elige una en el panel" so Torre chooses. No guide in the Squarespace inventory matches more than one quest, so this is a safeguard. See [DofusDB game data refresh](dofusdb-refresh.md).
- **Images.** Each image block becomes a `media` record keyed by its original URL. The loader first checks a per-run map, then searches `media` by `originalUrl`, and downloads and creates the record only when neither has it. A re-run or a second guide using the same image reuses the record. New records get the block's alt text and the `originalUrl`. An image that fails to download is dropped from the body and noted ("Imagen sin importar: …"); the guide still loads.
- **Body.** Rich text and callouts go through `createHtmlToLexical`; videos keep their URL. A step becomes a `step` block with its `title`, `x` and `y` (`null` when absent) and its own content blocks converted the same way.
- **Guides.** It finds the guide by `slug` (drafts included) and writes `title`, `slug`, `originalUrl`, `summary`, `quest` and `body` with `_status: 'draft'`. It never publishes: a published guide gets a new draft and stays published as it was until Torre publishes the draft.
- **Summary.** It sends the whole `summary` group every time: `prerequisites`, `rewards`, `startNpc`, `startX`, `startY` and `needs` (`notes` plus an empty `items` list), with `null` for whatever the conversion did not bring. Payload keeps group fields that an update leaves out, so without this a value removed from the Squarespace page would stay stored, and every run would see a difference and save another version.
- **DofusDB fill before comparing.** The collection's `beforeValidate` hook fills every empty summary field from the guide's linked quest on save (see [Writing a quest guide](../cms/guide-authoring.md)), so the stored guide differs from the raw conversion. The loader therefore applies the same pure functions, `summaryToFill` and `applySummaryFill` from `src/lib/guides/summary.ts`, with the linked quest before comparing and writing. Converted and stored guides then compare equal and a rerun saves no version. A value removed from Squarespace is replaced by DofusDB's value once, or cleared when DofusDB gives none, and the next run finds the guide unchanged. Torre's Squarespace text always wins over DofusDB, because only empty fields are filled. The hook also fills an empty `seo` group from the quest; the loader neither sends nor compares `seo`.
- **Unchanged guides.** Before writing, it compares the six written fields (`title`, `slug`, `originalUrl`, `summary`, `quest`, `body`) with the stored draft, ignoring IDs (block IDs and the random link IDs Lexical adds) and empty values Payload returns as `null`. An equal guide is left alone, so a re-run adds no empty versions.
- **Invalid slug.** A guide whose slug fails `validateSlug` is skipped and counted.

It returns counts (`guides`: created, updated, unchanged, skipped; `media`: created, reused) and the oddities per slug, conversion and load together.

## Running it

```sh
pnpm import:guides <inventory dir> [slug…]
```

`package.json` runs `payload run scripts/import/import-guides.ts`, like the DofusDB refresh. `<inventory dir>` is the migration inventory folder: the script reads `raw/pages/<slug>.html` and `out/quest_matches.csv` from it. Without slugs it imports the five in `GUIDE_SLUGS`. An ambiguous match in `quest_matches.csv` links no quest and adds the oddity "Cruce ambiguo con DofusDB, sin enlazar", so Torre decides in the panel. The script prints the number of pages read, one line per guide, every oddity as `Rareza en <slug>: …`, and the totals with the elapsed time. On failure it prints `La importación de guías falló:` and exits with code 1, because `payload run` exits 0 whenever the script returns without throwing.

- **Target database**: whatever `DATABASE_URL` points to, or the `pnpm db:dev` database when it is empty. Run `pnpm migrate` (or `pnpm dev` once) on a fresh database first.
- **Images**: they go wherever media storage points, local disk or R2. See [Media storage](../media/storage.md).
- **Sizes**: Payload generates the AVIF and WebP sizes when the loader uploads the original. See [Media storage](../media/storage.md).
- **Cost**: on a laptop, the five demo guides took about 83 s and uploaded 73 images; a second run found the five guides unchanged and reused the 73 images.

### Downloading images safely

Image URLs come from Squarespace HTML, which is not trusted, so `createImageFetcher()` refuses anything it was not built for. It throws before making any request when the URL:

- does not parse, or is not `https`;
- is on any host other than `images.squarespace-cdn.com`, the only host the 21 618 images in the inventory use (a look-alike such as `images.squarespace-cdn.com.evil.com` fails too);
- names a port.

The request does not follow redirects (`redirect: 'error'`), because a redirect could lead to another host, and it times out after 30 s. An HTTP error, or a response whose `content-type` is not `image/*`, throws as well. Each failure reaches the loader, which records the image as an oddity and keeps the guide.

The CDN serves WebP to any client that accepts it, `*/*` included, so the `Accept` header names only the type of the file's extension (PNG, JPEG, GIF or WebP) to get the original file back. The file name comes from the URL path, with Squarespace's `+` turned back into spaces.

### Dev by default; production needs the owner's yes

The command writes to whatever database `DATABASE_URL` names, with no confirmation prompt. The infrastructure access rules (`docs/legacy/infra.md`, section 8) give agents full access to dev and read access to prod: prod writes, database changes included, go through `release.yml` or need Daniel's explicit yes for that one action. Run it locally or against dev. Do not point `DATABASE_URL` at production without that yes.

## Demo guides

`GUIDE_SLUGS` lists the five guides of the first import, the exit of phase 0: `el-cazador-cazado`, `intoxicacion-profunda`, `operacion-envenenamiento`, `entretanto-un-renacer` and `seis-pies-bajo-tierra`. Between them they cover a normal guide with several screenshots, one with a video, one with no DofusDB quest, a long one and one with a warning.

## Tests

The unit tests run on trimmed copies of those five pages in `tests/fixtures/squarespace/`. Prettier ignores that directory so the parser reads the files exactly as saved.

- `import-parse-page.test.ts`: title from the context (and no title for a bad escape), row and column order, top-level text elements, image URL and alt, unknown blocks.
- `import-to-quest-guide.test.ts`: the five slugs are valid, summary and start NPC, what leaves the body, prose and image order, callouts and their labels (`ATENCIÓN` included), video, oddities; steps (the eight untitled steps of "Seis pies bajo tierra", every demo guide split without the prose oddity, intro screenshots staying in the introduction, `ETAPA n:` markers with and without a title); and Torre's recommendations (no real page keeps the label as prose, no text is lost, the callout's extent, singular and unbolded labels, continuing the previous step).
- `import-rich-text.test.ts`: paragraphs, bold, links and lists through Payload's editor.
- `import-quest-matches.test.ts`: IDs per slug, quoted commas, ambiguous rows, a header with a BOM, a missing column.
- `import-fetch-image.test.ts`: downloads from the CDN with name and type and without following redirects; refuses `http`, other hosts, an internal IP, `localhost` and a look-alike subdomain without making the request; refuses a non-image response and an HTTP error.

The integration test `tests/integration/import-quest-guides.test.ts` loads the five fixture pages into the integration database with a fake `fetchImage` that returns a 1×1 PNG. It checks drafts with the content block types, untitled steps saved with their coordinates and screenshots, a titled step from an `ETAPA n:` marker, the existing quest linked, one `media` record per image with its URL and alt, the oddities (including quests missing from `quests`), a second run that changes, downloads and versions nothing, one new draft for a changed guide, the `needs` notes saved from the page, a summary field that disappears being filled from the linked quest's start position and needs without extra versions on the next run, no drafts visible to anonymous readers, an invalid slug skipped, and a guide with two DofusDB IDs saved with no quest and the "Varias misiones de DofusDB" oddity. It removes its guides, media and quests before and after.

See [Test suites](../testing/test-suites.md).

## Related pages

- [Writing a quest guide](../cms/guide-authoring.md)
- [Collections and access](../cms/collections.md)
- [Guide body blocks](../cms/blocks.md)
- [Media storage](../media/storage.md)
- [DofusDB game data refresh](dofusdb-refresh.md)
- [Test suites](../testing/test-suites.md)
