---
type: component
title: Media storage
description: How Payload uploads go to Cloudflare R2 or to local disk, why the S3 settings are all-or-nothing, how public CDN URLs are built, and why the app never resizes images on request.
tags: [media, storage, cloudflare-r2, s3, images]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-04T00:16:52.047Z
sources:
  - id: openwiki-source-50a18d054b596a7ed0eeffb0
    resource: repo://next.config.ts
  - id: openwiki-source-baf8ef0ad43916de8d10e9b0
    resource: repo://scripts/build-mode-eggs.ts
  - id: openwiki-source-d58a4d3cf178bb2fa2e94831
    resource: repo://src/collections/Media.ts
  - id: openwiki-source-47a80445306e82d0ef444872
    resource: repo://src/lib/media/storage.ts
  - id: openwiki-source-2c42ff828c6d8e213a2f7416
    resource: repo://src/payload.config.ts
  - id: openwiki-source-034e7fb4a132a9270c2ca2d0
    resource: repo://tests/unit/media-storage.test.ts
generated: { by: "claude-code", at: "2026-11-04T00:16:52.047Z" }
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

## Image variants: generated offline, never on request

The app does not optimize images when they are requested:

- `next.config.ts` sets `images.unoptimized: true`, so there is no Next image optimizer and no per-request resizing bill.
- The `media` collection defines no `imageSizes`. Payload stores the original and records its width and height through `sharp`.
- AVIF and WebP variants are produced before import and listed in the record's `variants` array (`key`, `width`, `format`). The Squarespace import that fills it is planned (`scripts/import/`, phase 1).

The one example in the repo today is `scripts/build-mode-eggs.ts`, which turns the two PNG icons in `public/img/mode/` into AVIF (quality 70) and WebP (quality 85) at 28px and 56px for the mode toggle.

Media records also keep alt text and credits (both localized) and the original Squarespace URL. Images come from the real game only; nothing loads from DofusDB or Ankama at runtime (AGENTS.md, Media).

## Tests

- `tests/unit/media-storage.test.ts`: `null` with no variables, full settings, region and base URL handling, the error listing missing variables, blanks treated as missing, and `mediaFileUrl` joining and encoding.
- The integration suite forces the disk backend by blanking every `S3_*` variable and `MEDIA_BASE_URL` (`tests/integration/env.ts`), then uploads a 1×1 PNG through the local API.

## Related pages

- [Collections and access](../cms/collections.md)
- [Environment configuration](../architecture/configuration.md)
