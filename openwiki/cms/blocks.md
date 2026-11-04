---
type: component
title: Guide body blocks
description: The Payload blocks in src/blocks/ that make up a quest guide's body (rich text, image, video and callout), their fields and validation, how Postgres stores them, and the tests that pin them down.
tags: [payload, blocks, quest-guides, lexical, content-model]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-04T20:02:15.357Z
sources:
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-4cb726c5c0ec08529a89bf26
    resource: repo://src/blocks/CalloutBlock.ts
  - id: openwiki-source-9fc249cbcc23760458b89f17
    resource: repo://src/blocks/ImageBlock.ts
  - id: openwiki-source-27363e3cad65dad5db477db7
    resource: repo://src/blocks/RichTextBlock.ts
  - id: openwiki-source-f39acc8c60346c7f65fe191c
    resource: repo://src/blocks/VideoBlock.ts
  - id: openwiki-source-d58a4d3cf178bb2fa2e94831
    resource: repo://src/collections/Media.ts
  - id: openwiki-source-7a2723ea85824e431ff5eb54
    resource: repo://src/collections/QuestGuides.ts
  - id: openwiki-source-4b8e99ccf872ed7c776196a6
    resource: repo://src/migrations/20261104_124207_quest_guides.ts
  - id: openwiki-source-dfda0f9810a7fbac89e48a40
    resource: repo://src/payload-types.ts
  - id: openwiki-source-2c42ff828c6d8e213a2f7416
    resource: repo://src/payload.config.ts
  - id: openwiki-source-7b27bf36255a812248aa50e8
    resource: repo://tests/integration/quest-guides-access.test.ts
  - id: openwiki-source-ae7421f61722d14d3413a918
    resource: repo://tests/unit/quest-guide-blocks.test.ts
  - id: openwiki-source-1970468d3fcc651d5071b312
    resource: repo://tests/unit/quest-guides-collection.test.ts
generated: { by: "claude-code", at: "2026-11-04T12:46:56.619Z" }
---

# Guide body blocks

A quest guide's body is a Payload `blocks` field: an ordered list where each item is one of a fixed set of block types. The block definitions live one per file in `src/blocks/`, and `src/collections/QuestGuides.ts` puts four of them in its `body` field, in this order: `RichTextBlock`, `ImageBlock`, `VideoBlock`, `CalloutBlock`. An editor in `/admin` adds, reorders and removes blocks freely; the panel labels the list "Contenido" and each item "Bloque".

The blocks only exist in the content model today. No public route renders a guide yet, so nothing on the site reads them.

## The four blocks

Each block sets a `slug` (stored as the item's `blockType`), Spanish panel labels, and an `interfaceName`, so `pnpm generate:types` emits a named TypeScript interface (`RichTextBlock`, `ImageBlock`, `VideoBlock`, `CalloutBlock` in `src/payload-types.ts`) instead of an inline type.

| Block | `blockType` | Fields |
|---|---|---|
| `RichTextBlock` ("Texto") | `richText` | `content`: rich text, required, localized |
| `ImageBlock` ("Imagen") | `image` | `image`: upload to `media`, required; `caption`: text, localized |
| `VideoBlock` ("Vídeo") | `video` | `url`: text, required, validated by `validateVideoUrl`; `title`: text, localized |
| `CalloutBlock` ("Aviso") | `callout` | `variant`: select `tip` ("Consejo"), `warning` ("Cuidado") or `stop` ("Alto"), required, default `tip`; `content`: rich text, required, localized |

### Rich text

`RichTextBlock` and `CalloutBlock` use the `richText` field type with no editor of their own, so they take the global `lexicalEditor()` from `src/payload.config.ts`. These are the first rich text fields in the project, which is why the admin import map now carries the Lexical field, cell, diff and feature components. See [Payload CMS configuration](payload-config.md).

### Image

`ImageBlock` points at a `media` document instead of storing a file itself. The alternative text is not a block field: it lives on the media document (`alt` is required there), so the same screenshot keeps one alt text wherever it is used. The block adds only an optional, localized caption. Media is publicly readable, which lets an anonymous read of a published guide populate the image at `depth: 1`. See [Media storage](../media/storage.md).

### Video

`VideoBlock` stores a URL to embed, for YouTube or any other site that allows embedding. `validateVideoUrl` follows Payload's validator contract (return `true` or an error string):

- an empty value (`undefined`, `null`, `''`) fails, because the URL is required;
- a value that `new URL()` cannot parse fails;
- a parsed URL passes only when its protocol is `https:`. Plain `http:` is rejected because the site is served over https and the browser would block a mixed-content embed.

Every failure returns the same Spanish message, "Tiene que ser una URL que empiece por https://".

### Callout

`CalloutBlock` is a highlighted notice inside the guide. `variant` picks its tone; the database stores it as a Postgres enum with the same three values and the `tip` default.

## How blocks are stored

The `20261104_124207_quest_guides` migration gives each block type its own table, named after the collection and the block slug: `quest_guides_blocks_rich_text`, `quest_guides_blocks_image`, `quest_guides_blocks_video` and `quest_guides_blocks_callout`. Each row carries `_order` (position in the list), `_parent_id` (the guide), `_path` (the field path, `body`), a string `id` and an optional `block_name`. Localized fields go to a matching `_locales` table keyed by `_locale`; rich text is stored there as `jsonb`.

`quest_guides_blocks_image.image_id` references `media.id` with `ON DELETE set null`, so deleting a media file leaves the block in place with no image rather than deleting it.

Because the collection has drafts and versions, every block table has a twin under `_quest_guides_v_blocks_*` that holds the body of each saved version. See [Collections and access](collections.md) and [Database and migrations](../data/database.md).

## Tests

- `tests/unit/quest-guide-blocks.test.ts` pins each block's slug and field shapes (type, `required`, `localized`, the upload's `relationTo: 'media'`), the callout options and default, and `validateVideoUrl`: YouTube and Vimeo https URLs pass; empty values, `http:` and a URL with no scheme fail.
- `tests/unit/quest-guides-collection.test.ts` checks that the collection's `body` offers exactly `richText`, `image`, `video` and `callout`.
- `tests/integration/quest-guides-access.test.ts` saves a published guide with one block of each type through the local API, reads it back anonymously at `depth: 1`, and checks the block order, the populated image (with its `alt`), the video URL and the callout variant.

## Adding a block

1. Write the unit test for the block's fields first, next to the existing ones.
2. Add `src/blocks/<Name>Block.ts` exporting a `Block` with a `slug`, Spanish `labels` and an `interfaceName`; mark text that a translator would change as `localized: true`.
3. Add it to the `blocks` array of the collection that should offer it.
4. Run `pnpm migrate:create <name>` (each block adds tables, plus their version twins), `pnpm generate:types`, and `pnpm generate:importmap` if the block brings new admin components. Commit all of them.

AGENTS.md names two more blocks, dialogue and step, to be added when the guide page design needs them.

## Related pages

- [Collections and access](collections.md)
- [Payload CMS configuration](payload-config.md)
- [Media storage](../media/storage.md)
- [Database and migrations](../data/database.md)
