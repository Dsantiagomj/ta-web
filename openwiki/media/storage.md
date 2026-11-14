---
type: component
title: Media storage
description: How Payload uploads go to Cloudflare R2 or to local disk, why the S3 settings are all-or-nothing, how public CDN URLs are built, and why the app never resizes images on request.
tags: [media, storage, cloudflare-r2, s3, images]
sources:
  - id: openwiki-source-50a18d054b596a7ed0eeffb0
    resource: repo://next.config.ts
  - id: openwiki-source-baf8ef0ad43916de8d10e9b0
    resource: repo://scripts/build-mode-eggs.ts
  - id: openwiki-source-3fc9f0484081f9ab441d6219
    resource: repo://scripts/import/load-quest-guides.ts
  - id: openwiki-source-52bd7f492006181f268b8ce3
    resource: repo://scripts/media-sizes.ts
  - id: openwiki-source-153285322f1fa0bfb7572570
    resource: repo://src/collections/delete-guard.ts
  - id: openwiki-source-d58a4d3cf178bb2fa2e94831
    resource: repo://src/collections/Media.ts
  - id: openwiki-source-7c66f643dce69fb67291a883
    resource: repo://src/lib/db/script-guard.ts
  - id: openwiki-source-35adf9ddd0461732aa114ae7
    resource: repo://src/lib/dofusdb/game-images.ts
  - id: openwiki-source-8dfc57c57c9b90054e3c47fe
    resource: repo://src/lib/media/image-asset.ts
  - id: openwiki-source-8b2827e4ec1d6adb07aad1c1
    resource: repo://src/lib/media/regenerate.ts
  - id: openwiki-source-ea297fb6a1a94e91662773e5
    resource: repo://src/lib/media/sizes.ts
  - id: openwiki-source-47a80445306e82d0ef444872
    resource: repo://src/lib/media/storage.ts
  - id: openwiki-source-2c42ff828c6d8e213a2f7416
    resource: repo://src/payload.config.ts
  - id: openwiki-source-35c9ea6f75f53bd3fad443d0
    resource: repo://tests/unit/media-regenerate.test.ts
  - id: openwiki-source-034e7fb4a132a9270c2ca2d0
    resource: repo://tests/unit/media-storage.test.ts
generated: { by: "claude-code", at: "2026-11-14T11:00:46.827Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-14T11:00:46.827Z
---

# Media storage

Uploads to the `media` collection go to Cloudflare R2 when it is configured and to the local `./media` directory otherwise. The switch is `mediaStorage()` in `src/lib/media/storage.ts`, a wrapper around `@payloadcms/storage-s3` (R2 speaks the S3 API), registered as the only plugin in `src/payload.config.ts`.

## Choosing the backend

`readS3Settings(env)` reads six variables:

| Variable | Required | Default |
|---|---|---|
| `S3_ENDPOINT` | yes | |
| `S3_BUCKET` | yes | |
| `S3_ACCESS_KEY_ID` | yes | |
| `S3_SECRET_ACCESS_KEY` | yes | |
| `S3_REGION` | no | `auto` |
| `MEDIA_BASE_URL` | no | none; trailing slashes are stripped |

Blank values count as missing. The four required ones are all-or-nothing:

- **None set** → `null`. The plugin is registered with `enabled: false` and Payload writes to `upload.staticDir` (`media`). This is the local and test default.
- **All set** → the plugin uploads to the bucket.
- **Some set** → it throws at startup: `Configuración de R2 incompleta, faltan: …`. A half-configured deploy fails loudly instead of quietly writing to the container's disk, which would lose files on the next deploy.

The plugin always runs with `alwaysInsertFields: true`. It adds its columns (for example `prefix` and `_objectkey` in the `media` table) whether or not R2 is enabled, so the schema and migrations do not depend on the environment.

## File URLs

Without `MEDIA_BASE_URL`, file URLs go through Payload (`/api/media/file/...`), which applies collection access before streaming.

With `MEDIA_BASE_URL` (the bucket's CDN domain), the plugin config for `media` sets:

- `disablePayloadAccessControl: true`, so Payload does not proxy file downloads;
- `generateFileURL`, which calls `mediaFileUrl(baseUrl, prefix, filename)`.

`mediaFileUrl` joins the base URL, an optional prefix and the filename, dropping empty parts and URL-encoding each path segment while keeping `/` separators, so names with spaces or accents still produce valid URLs. Media is publicly readable anyway (see [Collections and access](../cms/collections.md)), so bypassing Payload for file bytes does not expose anything new.

## Image sizes: generated on upload, never on request

The app does not optimize images when they are requested. `next.config.ts` sets `images.unoptimized: true`, so there is no Next image optimizer and no per-request resizing bill. Instead Payload generates the variants with `sharp` when a file is uploaded, from the panel or from the import, and stores them next to the original in R2 or on disk.

`mediaImageSizes` (`src/lib/media/sizes.ts`) is the collection's `imageSizes`: every width in `IMAGE_WIDTHS` (480, 800, 1200 and 1600) in AVIF (quality 50) and WebP (quality 80), named `<format>-<width>` (`avif-480`, `webp-1600`). Only the width is fixed, so the height follows the original's proportions. Payload skips a size wider than the original; the 480 size sets `withoutEnlargement`, so even a 96px icon gets one AVIF and one WebP at its own width. The panel thumbnail is the narrowest WebP. Each size adds URL, width, height, MIME type, file size and filename columns on `media` (migration `20261105_103713_media_image_sizes`).

`mediaImageAsset(media)` (`src/lib/media/image-asset.ts`) turns a populated media document into the `ImageAsset` that `Picture` and `Figure` render: the widest WebP as the main file with its size, the uploaded file as `original` with its own size (the fullscreen viewer opens it), the widest AVIF, and `srcSet` and `avifSrcSet` lists when a format has more than one width. A record without variants falls back to the original; an unpopulated relation or a file without URL or size gives `null`. See [Design system components](../frontend/design-system-components.md).

### Backfilling missing sizes: `pnpm media:sizes`

Files uploaded before Payload generated sizes have none. `pnpm media:sizes` (`scripts/media-sizes.ts`) pages through `media`, asks `missingImageSizes` which sizes a record should have for its width and MIME type but has no file for, and re-uploads the original through Payload with the same filename and `overwriteExistingFiles`, so Payload creates the sizes and guides that link the file do not change. Records that are complete, or are not images `sharp` converts, are left alone, so the command can be rerun at no cost. It prints counts and exits with code 1 when any file failed.

`originalReader` finds each original where it lives:

- with an absolute URL (R2 behind the `MEDIA_BASE_URL` CDN domain), it downloads it;
- with R2 credentials but no `MEDIA_BASE_URL`, the URL is Payload's relative path, so it reads the object from the bucket with the AWS S3 SDK, using `s3ClientConfig` and the key `mediaObjectKey` computes the way `storage-s3` does (the record's prefix and `_objectKey`, sanitized); a failure names the bucket and key but never the credentials;
- otherwise it reads `staticDir/<filename>` from disk, rejecting a filename that would leave that directory.

Before Payload starts, `regenerationRefusal` stops the run in the wrong place. It delegates to `databaseScriptRefusal` (`src/lib/db/script-guard.ts`), the guard `pnpm import:achievements` and `pnpm guides:backfill` share: in production (`APP_ENV`, `RAILWAY_ENVIRONMENT_NAME` or `NODE_ENV` set to `production`) it requires `--production`, and against a `DATABASE_URL` whose host is not local it requires `--remote` (or `--production`), because a remote dev database cannot be told apart from production. An unreadable URL counts as remote. The package script ends in `--`, so `pnpm media:sizes --remote` reaches the script.

### Other generated images

`scripts/build-mode-eggs.ts` turns the two PNG icons in `public/img/mode/` into AVIF (quality 70) and WebP (quality 85) at 28px and 56px for the mode toggle. `scripts/build-catalog-images.ts` produced the AVIF and WebP widths of the `/sistema` sample images, and `scripts/build-icons.ts` the favicon and iOS icon.

## Images from the Squarespace import

`pnpm import:guides` stores each guide image as one `media` record holding the original file, with the block's alt text and `originalUrl` set to the image's Squarespace URL; Payload generates its sizes on that upload. Before downloading, the loader looks the URL up in `media`, so a re-run or a second guide using the same image reuses the record instead of uploading it again. The files go to whichever backend this page describes, local disk or R2. See [Squarespace import](../data/squarespace-import.md#loading-into-payload).

## Game art from DofusDB

`pnpm data:quests` imports game art from DofusDB into `media`, each file once, keyed by the unique `gameAsset`, so the refresh looks the key up before downloading and never stores a file twice:

- NPC renders, keyed by the NPC, the direction and a hash of its look. See [DofusDB game data refresh](../data/dofusdb-refresh.md#npcs-and-their-renders).
- Achievement icons, item icons and monster images (including the bosses of every dungeon, which «Necesitarás en total» draws for a dungeon a note names), the 128 px PNGs DofusDB serves, keyed `dofusdb-<kind>-image:<id>`; items sharing an icon share the file. See [DofusDB game data refresh](../data/dofusdb-refresh.md#game-images).

Payload generates their sizes on that upload like any other image.

Media records also keep alt text and credits (both localized) and the original Squarespace URL. Images come from the real game only; nothing loads from DofusDB or Ankama at runtime (AGENTS.md, Media).

## In the panel

The panel calls the collection «Imágenes» and lists the file name, alt text and last change, searchable by alt and file name. Any panel account can upload and edit; only an administrator can delete. Two `beforeDelete` guards from `src/collections/delete-guard.ts` refuse a delete even then: `refuseGameAssetDelete` keeps game art (a record with `gameAsset`), which only the DofusDB refresh brings and its data links, from being deleted by any signed-in account, and `refuseReferencedDelete('media')` refuses while any quest guide uses the image, in its published version or its latest draft (an image block, an image inside rich text, or a video poster). The `gameAsset` field shows only on game art, and `originalUrl` shows read-only only on imported records. See [Admin panel](../cms/admin-panel.md).

## Tests

- `tests/unit/media-storage.test.ts`: `null` with no variables, full settings, region and base URL handling, the error listing missing variables, blanks treated as missing, `mediaFileUrl` joining and encoding, and `mediaObjectKey` (no prefix, prefix plus `_objectKey`, a `..` prefix kept inside its folder).
- `tests/unit/media-regenerate.test.ts`: `regenerationRefusal` (local runs, `--production` in production, `--remote` for a remote database, an unreadable URL, the flags passed through `--`), `originalReader` reading from the bucket, the public URL or disk, an R2 error that names the key and not the credentials, and a filename that leaves its folder.
- The integration suite forces the disk backend by blanking every `S3_*` variable and `MEDIA_BASE_URL` (`tests/integration/env.ts`), then uploads a 1×1 PNG through the local API.

## Related pages

- [Collections and access](../cms/collections.md)
- [Environment configuration](../architecture/configuration.md)
- [Squarespace import](../data/squarespace-import.md)
- [DofusDB game data refresh](../data/dofusdb-refresh.md)
- [Public quest guide page](../frontend/guide-page.md)
