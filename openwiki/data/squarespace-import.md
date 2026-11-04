---
type: workflow
title: Squarespace import
description: How the Squarespace import reads a cached Squarespace page, orders its blocks, and turns it into a quest guide draft (summary, start NPC, body blocks, oddities), and how prose becomes Payload's Lexical rich text. Loading into Payload is not built yet.
tags: [import, squarespace, quest-guides, lexical, scripts]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-04T16:22:11.904Z
sources:
  - id: openwiki-source-f235d856bed1fd44853c5195
    resource: repo://.prettierignore
  - id: openwiki-source-d2cae621c91b518c9e5f5e6d
    resource: repo://docs/legacy/plan.md
  - id: openwiki-source-c8e16e16c743abca9f070b43
    resource: repo://docs/legacy/security.md
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-0e8df94882ff3664a5b6176f
    resource: repo://scripts/import/rich-text.ts
  - id: openwiki-source-db5dc5bd52b38a655df3ff57
    resource: repo://scripts/import/squarespace/dom.ts
  - id: openwiki-source-8705b1c7dce71caa28081c52
    resource: repo://scripts/import/squarespace/parse-page.ts
  - id: openwiki-source-b51400beea5fa80f14019dae
    resource: repo://scripts/import/squarespace/quest-matches.ts
  - id: openwiki-source-fd0bec8778f0f03626754905
    resource: repo://scripts/import/squarespace/to-quest-guide.ts
  - id: openwiki-source-d5617545465b10f7c4424728
    resource: repo://tests/unit/import-parse-page.test.ts
  - id: openwiki-source-fe4a14de069bb6226ad2a447
    resource: repo://tests/unit/import-quest-matches.test.ts
  - id: openwiki-source-7c48f921336671c0ca29e644
    resource: repo://tests/unit/import-rich-text.test.ts
  - id: openwiki-source-299c190cabc2f0753a302110
    resource: repo://tests/unit/import-to-quest-guide.test.ts
generated: { by: "claude-code", at: "2026-11-04T16:22:11.904Z" }
---

# Squarespace import

Phase 1 moves torrentearcano.com from Squarespace into Payload. The plan in `docs/legacy/plan.md` (section 8) splits it into extract, transform, media, load and review queue. `scripts/import/` holds the first two for quest guides. It reads a cached Squarespace page and returns a guide draft plus a list of oddities. Nothing in this code writes to Payload yet: the loader, image download and media records are still to come.

| File | What it does |
|---|---|
| `scripts/import/squarespace/dom.ts` | Parses HTML with happy-dom, with scripts and loading turned off |
| `scripts/import/squarespace/parse-page.ts` | Reads a page: its title and its blocks in reading order |
| `scripts/import/squarespace/to-quest-guide.ts` | Turns a parsed page into a quest guide draft; lists the demo slugs |
| `scripts/import/squarespace/quest-matches.ts` | Reads the slug to DofusDB quest IDs table |
| `scripts/import/rich-text.ts` | Converts guide prose HTML into Lexical with the editor from Payload's config |

## Parsing untrusted HTML

Squarespace HTML is not trusted. `dom.ts` keeps one happy-dom `Window` for the whole process, with JavaScript evaluation, script, CSS and iframe loading, computed styles and all navigation disabled. `parseHtml` parses a full document or a fragment (a fragment lands inside `body`). `normalizedText` returns an element's text with all whitespace, non-breaking spaces included, collapsed to single spaces. The import compares markers such as "Prerrequisitos" against that text.

happy-dom was already in the tree through `@lexical/headless`, pinned by a security override. It is now also a direct dev dependency at the same version (`docs/legacy/security.md`).

## Reading a page

`parsePage(html)` returns `{ title, blocks }`.

- **Title.** Squarespace embeds a context JSON in a script tag. The title comes from its `"collection":{"title":…}` entry, not from the all-caps H2 at the top of the page. With no context, `title` is `null`.
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

1. **Summary.** A line starting with `Prerrequisitos`, `Necesitarás` or `Recompensas` (accents and case ignored, optional colon) opens that field. Labels are checked before any heading rule, so a label that arrives as an H1 or H2 still opens its field. Text after the label and the following elements of the same text block go into it, one line each; a list gives one line per item. The field values are those lines joined with newlines. These lines never reach the body.
2. **Title heading.** Only the first H1 or H2 before any content is dropped, because it repeats the title. Any later heading is handled like other text: inside a summary block it adds a line to that field, otherwise it stays in the body as prose.
3. **Closing sentence.** A paragraph starting with "Aquí termina la misión" (also "¡Y aquí se termina la misión…") loses that first sentence only. The rest of the paragraph stays in the body; a paragraph with nothing else disappears.
4. **Start line.** The first paragraph starting with "Habla con X [x,y]" or "La misión empieza hablando con X [x,y]" fills `summary.startNpc` (without a leading el/la/los/las), `startX` and `startY`. "Habla con" counts only when its sentence says "para empezar", because the phrase appears in the middle of many guides. When the sentence says nothing more than that ("…para empezar la misión."), only that sentence leaves the body and the rest of the paragraph stays. When it carries more (when or where to go), the whole paragraph stays in the body. The trimming walks text nodes, so bold and links in the rest of the paragraph survive.
5. **Callouts.** A paragraph starting with all-caps `IMPORTANTE` or `CUIDADO` becomes a `callout` block with variant `warning`; `NOTA` becomes `tip`. Lowercase "Cuidado, …" is plain prose. A paragraph left over after trimming rules 3 and 4 is checked again here.
6. **Prose.** Everything else is prose. Consecutive prose elements are joined into one `richText` block, still as HTML.

Image blocks become `image` blocks with the original URL; an image without alt text takes the guide title as alt. Video blocks become `video` blocks. Unknown blocks are left out of the body.

Oddities, collected rather than thrown:

- the slug fails the collection's `validateSlug`;
- the page has no Squarespace title;
- no DofusDB quest is linked;
- a `Prerrequisitos`, `Necesitarás` or `Recompensas` block is missing (one entry each);
- no start line was found;
- each unknown Squarespace block, by type.

The body and summary match the guide fields in [Collections and access](../cms/collections.md#quest-guides-editorial-guides-with-drafts) and the blocks in [Guide body blocks](../cms/blocks.md).

## Rich text

The draft keeps prose and callouts as HTML. `createHtmlToLexical(config)` builds the editor config from Payload's sanitized config (`editorConfigFactory.default`) and returns a function that runs Payload's `convertHTMLToLexical` on an HTML string. `convertHTMLToLexical` expects a JSDOM-shaped constructor, so a small class wraps `parseHtml` and exposes `window.document`. Paragraphs, bold, links and lists come out as Lexical nodes from the same editor the panel uses.

## Quest matches

The Squarespace inventory in `out/` (outside the repo, described in `docs/legacy/plan.md`) includes `quest_matches.csv`. `parseQuestMatches(csv)` reads it into a map from slug to `{ questIds, ambiguous }`: `quest_ids` holds space-separated DofusDB IDs and `ambiguous` is true when the column says `True`. The CSV parser handles quoted fields with commas and doubled quotes. A slug not in the file has no match.

## Demo guides

`GUIDE_SLUGS` lists the five guides of the first import, the exit of phase 0: `el-cazador-cazado`, `intoxicacion-profunda`, `operacion-envenenamiento`, `entretanto-un-renacer` and `seis-pies-bajo-tierra`. Between them they cover a normal guide with several screenshots, one with a video, one with no DofusDB quest, a long one and one with a warning.

## Tests

The unit tests run on trimmed copies of those five pages in `tests/fixtures/squarespace/`. Prettier ignores that directory so the parser reads the files exactly as saved.

- `import-parse-page.test.ts`: title from the context, row and column order, top-level text elements, image URL and alt, unknown blocks.
- `import-to-quest-guide.test.ts`: the five slugs are valid, summary and start NPC, what leaves the body, prose and image order, callouts, video, oddities.
- `import-rich-text.test.ts`: paragraphs, bold, links and lists through Payload's editor.
- `import-quest-matches.test.ts`: IDs per slug, quoted commas, ambiguous rows.

See [Test suites](../testing/test-suites.md).

## Related pages

- [Collections and access](../cms/collections.md)
- [Guide body blocks](../cms/blocks.md)
- [DofusDB game data refresh](dofusdb-refresh.md)
- [Test suites](../testing/test-suites.md)
