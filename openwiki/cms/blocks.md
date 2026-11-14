---
type: component
title: Guide body blocks
description: The Payload blocks in src/blocks/ that make up a quest guide's body (rich text, image, video and callout), their fields and validation, how Postgres stores them, and the tests that pin them down.
tags: [payload, blocks, quest-guides, lexical, content-model]
sources:
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-4cb726c5c0ec08529a89bf26
    resource: repo://src/blocks/CalloutBlock.ts
  - id: openwiki-source-1e3208624c299657cbf60465
    resource: repo://src/blocks/FightBlock.ts
  - id: openwiki-source-9fc249cbcc23760458b89f17
    resource: repo://src/blocks/ImageBlock.ts
  - id: openwiki-source-2c8962e2c6b449aac46f9e28
    resource: repo://src/blocks/ProseVideoBlock.ts
  - id: openwiki-source-27363e3cad65dad5db477db7
    resource: repo://src/blocks/RichTextBlock.ts
  - id: openwiki-source-ad08ffda0491e36563bfa2bc
    resource: repo://src/blocks/StepBlock.ts
  - id: openwiki-source-f39acc8c60346c7f65fe191c
    resource: repo://src/blocks/VideoBlock.ts
  - id: openwiki-source-153285322f1fa0bfb7572570
    resource: repo://src/collections/delete-guard.ts
  - id: openwiki-source-d58a4d3cf178bb2fa2e94831
    resource: repo://src/collections/Media.ts
  - id: openwiki-source-38614666f550e90edceb8c65
    resource: repo://src/collections/prose-editor.ts
  - id: openwiki-source-7a2723ea85824e431ff5eb54
    resource: repo://src/collections/QuestGuides.ts
  - id: openwiki-source-7c8d27e389afcc66bc579a2f
    resource: repo://src/lib/guides/step-nav.ts
  - id: openwiki-source-2f2b90aba3af4142e443ba84
    resource: repo://src/lib/guides/strings.ts
  - id: openwiki-source-5d625b6c9ec96bb42f058c48
    resource: repo://src/lib/guides/video.ts
  - id: openwiki-source-4b8e99ccf872ed7c776196a6
    resource: repo://src/migrations/20261104_124207_quest_guides.ts
  - id: openwiki-source-8815e507ece46280f40fa33f
    resource: repo://src/migrations/20261105_135506_guide_step_block.ts
  - id: openwiki-source-6cded578ebe9709336be56d3
    resource: repo://src/migrations/20261107_020402_guide_v5_game_images_fight.ts
  - id: openwiki-source-c115716f2f607a78ad9be606
    resource: repo://src/migrations/20261107_143215_remove_step_title.ts
  - id: openwiki-source-dfda0f9810a7fbac89e48a40
    resource: repo://src/payload-types.ts
  - id: openwiki-source-2c42ff828c6d8e213a2f7416
    resource: repo://src/payload.config.ts
  - id: openwiki-source-7b27bf36255a812248aa50e8
    resource: repo://tests/integration/quest-guides-access.test.ts
  - id: openwiki-source-298528b36bd97573076646d2
    resource: repo://tests/integration/remove-step-title-migration.test.ts
  - id: openwiki-source-ae7421f61722d14d3413a918
    resource: repo://tests/unit/quest-guide-blocks.test.ts
  - id: openwiki-source-1970468d3fcc651d5071b312
    resource: repo://tests/unit/quest-guides-collection.test.ts
  - id: openwiki-source-d474a682c3ea9ebeaa53059c
    resource: repo://tests/unit/video-url.test.ts
generated: { by: "claude-code", at: "2026-11-14T11:00:46.827Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-14T11:00:46.827Z
---

# Guide body blocks

A quest guide's body is a Payload `blocks` field: an ordered list where each item is one of a fixed set of block types. The block definitions live one per file in `src/blocks/`, and `src/collections/QuestGuides.ts` puts six of them in its `body` field, in this order: `RichTextBlock`, `ImageBlock`, `VideoBlock`, `CalloutBlock`, `FightBlock`, `StepBlock`. An editor in `/admin` adds, reorders and removes blocks freely; the panel labels the list "Contenido" and each item "Bloque".

The public guide page at `/[slug]` renders them: `GuideBody` maps each block to a component (`Callout`, `Figure`, `VideoFacade`, `FightBlock`, the rich text renderer), and the steps render one after another, separated by a line. See [Public quest guide page](../frontend/guide-page.md).

## The blocks

Each block sets a `slug` (stored as the item's `blockType`), Spanish panel labels, and an `interfaceName`, so `pnpm generate:types` emits a named TypeScript interface (`RichTextBlock`, `ImageBlock`, `VideoBlock`, `CalloutBlock`, `FightBlock`, `StepBlock` in `src/payload-types.ts`) instead of an inline type.

| Block | `blockType` | Fields |
|---|---|---|
| `RichTextBlock` ("Texto") | `richText` | `content`: rich text, required, localized |
| `ImageBlock` ("Imagen") | `image` | `image`: upload to `media`, required; `caption`: text, localized |
| `VideoBlock` ("Vídeo") | `video` | `url`: text, required, validated by `validateVideoUrl`; `title`: text, localized |
| `CalloutBlock` ("Aviso") | `callout` | `variant`: select `tip` ("Consejo"), `warning` ("Cuidado") or `stop` ("Alto"), required, default `tip`; `content`: rich text, required, localized |
| `FightBlock` ("Combate") | `fight` | `monsters`: array, required, at least one row, each with `monster` (relationship to `monsters`, required) and `quantity` (number, required, minimum 1, default 1) |
| `StepBlock` ("Paso") | `step` | `x`, `y`: numbers validated by `validateStepCoordinate`; `body`: its own blocks field with the five blocks above, no nested steps |

### Rich text

`RichTextBlock` and `CalloutBlock` use the `richText` field type with no editor of their own, so they take the global `lexicalEditor()` from `src/payload.config.ts` (with the panel's Spanish placeholder). These were the first rich text fields in the project, which is why the admin import map carries the Lexical field, cell, diff and feature components. See [Payload CMS configuration](payload-config.md).

### Image

`ImageBlock` points at a `media` document instead of storing a file itself. The alternative text is not a block field: it lives on the media document (`alt` is required there), so the same screenshot keeps one alt text wherever it is used. The block adds only an optional, localized caption. Media is publicly readable, which lets an anonymous read of a published guide populate the image at `depth: 1`. See [Media storage](../media/storage.md).

### Video

`VideoBlock` stores a link to a YouTube video. Guides carry YouTube videos only: DESIGN.md records that all 44 video embeds in the legacy Squarespace pages are YouTube. The panel description reads "Enlace al vídeo en YouTube (youtube.com o youtu.be)". `validateVideoUrl` follows Payload's validator contract (return `true` or an error string):

- an empty value (`undefined`, `null`, `''`) fails, because the URL is required;
- a value that does not start with `https://` fails, so plain `http:` links and bare `youtube.com/...` strings are rejected;
- otherwise the value passes only when `youtubeId` (`src/lib/guides/video.ts`) extracts an 11-character video ID from it. That accepts `youtube.com/watch?v=`, `youtu.be/`, `/embed/` and `/shorts/` links on the YouTube and `youtube-nocookie.com` hosts, and rejects other sites (Vimeo) and YouTube links that do not point at a video (a channel page, a `v=` value of the wrong length).

Every failure returns the same Spanish message, "Tiene que ser un enlace https a un vídeo de YouTube".

The block is meant to be rendered by `VideoFacade`, which loads nothing from YouTube until the reader clicks. See [Design system components](../frontend/design-system-components.md).

### Callout

`CalloutBlock` is a highlighted notice inside the guide. `variant` picks its tone; the database stores it as a Postgres enum with the same three values and the `tip` default.

### Fight

`FightBlock` is a fight in the guide (DESIGN.md, Monster chip and fight block): the DofusDB monsters you fight, each with a quantity. The sentence that introduces it ("Vas a empezar una lucha contra:") goes in the text block before it. The page renders the monsters with their images, which `pnpm data:quests` imports into Media for every monster a guide shows (see [DofusDB refresh](../data/dofusdb-refresh.md)). Imported guides turn their monster lists into fight blocks; see [Squarespace import](../data/squarespace-import.md).

### Step

`StepBlock` is one step of the quest walkthrough (DESIGN.md, Steps). Its `body` offers rich text, image, video, callout and fight, but not another step, so steps never nest. A step has no title: the page never showed one. `x` and `y` are the step's main map position; when the step text does not already name them, they appear as a coordinates chip at the start of the step (`stepPin` in `src/lib/guides/step-nav.ts`).

The step title existed until the `20261107_143215_remove_step_title` migration. Before dropping the title tables, it moves every non-empty title into a new first text block of its step: a paragraph with the title in bold, the same shape the importer gives "ETAPA n:" markers. The step's other blocks move down one place. It does this in the guide and in all its versions, giving the new block the same ID in both.

`validateStepCoordinate` enforces "both or neither" and whole numbers. A filled value that is not an integer fails with "Las coordenadas del juego son números enteros."; an empty value fails with "Pon X e Y, o deja las dos vacías." only when its sibling is filled, so the error lands on the missing field.

## Video inside prose

`ProseVideoBlock` (`src/blocks/ProseVideoBlock.ts`, `blockType` `proseVideo`) is not a body block. It is a Lexical block that the shared prose editor (`src/collections/prose-editor.ts`) adds to the default features through `BlocksFeature`, so Torre can drop a YouTube video between paragraphs of an achievement page's intro and outro. It has a required `url` (validated by the same `validateVideoUrl`), a required `title` (shown under the video and read by screen readers) and an optional `poster` upload; without a poster the facade shows the title. It is separate from `VideoBlock` because it carries its own poster. The page renders it as the video facade, so nothing loads from YouTube until a click. See [Achievement page](../achievements/achievement-page.md).

## How blocks are stored

The `20261104_124207_quest_guides` migration gives each block type its own table, named after the collection and the block slug: `quest_guides_blocks_rich_text`, `quest_guides_blocks_image`, `quest_guides_blocks_video` and `quest_guides_blocks_callout`. The `20261105_135506_guide_step_block` migration added `quest_guides_blocks_step` (with numeric `x` and `y`) and a `_locales` table for the title, which `20261107_143215_remove_step_title` drops. The `20261107_020402_guide_v5_game_images_fight` migration added `quest_guides_blocks_fight` and its `quest_guides_blocks_fight_monsters` rows. Each row carries `_order` (position in the list), `_parent_id` (the guide), `_path` (the field path, `body`), a string `id` and an optional `block_name`. Localized fields go to a matching `_locales` table keyed by `_locale`; rich text is stored there as `jsonb`.

`quest_guides_blocks_image.image_id` references `media.id` with `ON DELETE set null`, so at the database level deleting a media file would leave the block in place with no image. In practice the panel refuses that delete: the media collection's delete guard finds body images (`body.image`, which also covers images inside steps) in published guides and drafts and names the guides (see [Admin panel](admin-panel.md)).

Because the collection has drafts and versions, every block table has a twin under `_quest_guides_v_blocks_*` that holds the body of each saved version. See [Collections and access](collections.md) and [Database and migrations](../data/database.md).

## Tests

- `tests/unit/quest-guide-blocks.test.ts` pins each block's slug and field shapes (type, `required`, `localized`, the upload's `relationTo: 'media'`), the video field's YouTube-only description, the callout options and default, and `validateVideoUrl`: `watch`, `youtu.be`, `embed` and `shorts` links pass; Vimeo links, YouTube links that are not a video, empty values, `http:` and a URL with no scheme fail.
- The same file covers the fight block (slug `fight`, monsters from DofusDB with a quantity) and the step block: slug and labels, no title, the coordinate fields, a body of the other blocks with no steps inside, and `validateStepCoordinate` (both or neither, integers only).
- `tests/integration/remove-step-title-migration.test.ts` runs the title migration and checks that each title becomes a bold first block of its step and the step's blocks move down one place.
- `tests/unit/quest-guides-collection.test.ts` checks that the collection's `body` offers exactly `RichTextBlock`, `ImageBlock`, `VideoBlock`, `CalloutBlock`, `FightBlock` and `StepBlock`.
- `tests/integration/quest-guides-access.test.ts` saves a published guide with one block of each type through the local API, reads it back anonymously at `depth: 1`, and checks the block order, the populated image (with its `alt`), the video URL and the callout variant.

## Adding a block

1. Write the unit test for the block's fields first, next to the existing ones.
2. Add `src/blocks/<Name>Block.ts` exporting a `Block` with a `slug`, Spanish `labels` and an `interfaceName`; mark text that a translator would change as `localized: true`.
3. Add it to the `blocks` array of the collection that should offer it.
4. Run `pnpm migrate:create <name>` (each block adds tables, plus their version twins), `pnpm generate:types`, and `pnpm generate:importmap` if the block brings new admin components. Commit all of them.

AGENTS.md names one more block, dialogue, to be added when the guide page design needs it.

## Related pages

- [Collections and access](collections.md)
- [Guide authoring](guide-authoring.md)
- [Public quest guide page](../frontend/guide-page.md)
- [Payload CMS configuration](payload-config.md)
- [Media storage](../media/storage.md)
- [Database and migrations](../data/database.md)
- [Design system components](../frontend/design-system-components.md)
