---
type: data model
title: Site settings, index texts and navigation
description: The «Ajustes del sitio», «Portada e índices» and «Navegación» globals that let Torre edit the site name, description, share image, footer, social links, the home and index copy and the menu sections and featured Dofus, how empty fields fall back to the built-in text, how pages read them through a cache tag, and pnpm seed:site-copy.
tags: [site-copy, globals, payload, metadata, cache, seed, navigation]
sources:
  - id: openwiki-source-92731ee12f8edc4d50be198e
    resource: repo://scripts/seed-site-copy.ts
  - id: openwiki-source-e662deaf5fc4b6bc8b7128a5
    resource: repo://src/app/(frontend)/site-data.ts
  - id: openwiki-source-153285322f1fa0bfb7572570
    resource: repo://src/collections/delete-guard.ts
  - id: openwiki-source-39afe86b52965c905da37bef
    resource: repo://src/components/site/nav.ts
  - id: openwiki-source-235314341fcbbcc37ee21742
    resource: repo://src/globals/IndexTexts.ts
  - id: openwiki-source-66dbb4d960232b7c95cf77e8
    resource: repo://src/globals/Navigation.ts
  - id: openwiki-source-67b6d2da80f2712a983f21b4
    resource: repo://src/globals/site-copy-fields.ts
  - id: openwiki-source-d1de97b311dc05e8b68ee137
    resource: repo://src/globals/SiteSettings.ts
  - id: openwiki-source-47d03de2f800a9862b140ec2
    resource: repo://src/lib/site-copy/cache.ts
  - id: openwiki-source-cb3dbcfdf661be407e9f170b
    resource: repo://src/lib/site-copy/defaults.ts
  - id: openwiki-source-7fbcaf4df1ea92f8b9b24efd
    resource: repo://src/lib/site-copy/link.ts
  - id: openwiki-source-70a68757393f697687fb55e0
    resource: repo://src/lib/site-copy/metadata.ts
  - id: openwiki-source-811b90631e6a253e11b290ca
    resource: repo://src/lib/site-copy/navigation.ts
  - id: openwiki-source-30cca9aed1f14e366d9d50fa
    resource: repo://src/lib/site-copy/queries.ts
  - id: openwiki-source-d5fbbaf4ab99dbf225277e84
    resource: repo://src/lib/site-copy/resolve.ts
  - id: openwiki-source-4cd5acba535d7e293dbbf2dd
    resource: repo://src/lib/site-copy/seed.ts
  - id: openwiki-source-45d3a3fa020aa956d217eed4
    resource: repo://tests/e2e/panel-textos.spec.ts
  - id: openwiki-source-6d5181f8350df174de7a3fa0
    resource: repo://tests/integration/navigation.test.ts
  - id: openwiki-source-62728e600bb10c5c92b06a27
    resource: repo://tests/integration/site-copy.test.ts
  - id: openwiki-source-03885279a3ff378ba0ce7104
    resource: repo://tests/unit/navigation.test.ts
  - id: openwiki-source-e143e77e4afab8ee1384b59a
    resource: repo://tests/unit/site-copy-globals.test.ts
  - id: openwiki-source-86595b9ce8f4f0db42624896
    resource: repo://tests/unit/site-copy-seed.test.ts
  - id: openwiki-source-a725082c4dfc2b9a4d985fd5
    resource: repo://tests/unit/site-copy.test.ts
generated: { by: "claude-code", at: "2026-11-17T11:00:20.552Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-17T11:00:20.552Z
---

# Site settings, index texts and navigation

Three Payload globals hold the copy that used to be hard-coded in the frontend's string modules, so Torre can change it in the panel without a deploy:

| Global | Panel label | Slug | What it holds |
|---|---|---|---|
| `SiteSettings` (`src/globals/SiteSettings.ts`) | «Ajustes del sitio» | `site-settings` | What every page shows: the site name and description, the share image, the footer copy and the social links |
| `IndexTexts` (`src/globals/IndexTexts.ts`) | «Portada e índices» | `index-texts` | The home page copy and the title, lead and SEO text of `/metalogros`, `/guias-dofus` and `/checklists` |
| `Navigation` (`src/globals/Navigation.ts`) | «Navegación» | `navigation` | The menu sections (order, names, short phrase, shown or hidden, «Próximamente») and the three featured Dofus of the menu's Dofus card |

All three sit in the panel's «Ajustes» group. Anyone reads them, because the site reads them as a visitor; a panel account updates them. Each one's `afterChange` hook (`revalidateSiteCopyAfterChange` in `src/globals/site-copy-fields.ts`) expires the `site-copy` cache tag, so the next visit reads the new text.

## The fields

Every text field comes from `copyField(name, label, default)`: a localized `text` or, for long copy, `textarea`, whose `defaultValue` is the built-in text from `src/lib/site-copy/defaults.ts`. A new document therefore opens with the text the site already shows, and Torre edits it in place.

«Ajustes del sitio» has three unnamed tabs:

- **General**: `name`, `description` and `ogImage`, an upload to Media used as the share image of every page.
- **Pie**: the `footer` group with the bio, the live, Discord and Ko-fi titles and texts, and the disclaimer.
- **Redes**: the `socials` group with one group per network (`twitch`, `kick`, `youtube`, `discord`, `kofi`), each with a `url` and, where the default has one, a `handle`. The `url` is validated by `validateLinkUrl` (`src/lib/site-copy/link.ts`): empty is fine, otherwise it must be a complete `http://` or `https://` address. The panel field is `LinkUrlField`, which shows that message under the field before saving (see [Panel dashboard and editing aids](panel-editing-aids.md)).

«Portada e índices» has one named tab per page:

- `home`: eyebrow, title, lead and question of the hero, the «Áreas» texts (quests, Dofus, checklists, classes, dungeons), the guided tour's title, lead, steps and «more» link, the checklists section and the author section (see [Home page](../frontend/home-page.md)).
- `metalogros`: title, lead and an `seo` group (title and description).
- `dofusGuides`: eyebrow, title and `seo`.
- `checklists`: eyebrow, title, lead, the message shown with no checklist, and `seo`.

The delete guard counts `ogImage` as a use of its image, so an image set as the share image cannot be deleted (see [Admin panel](admin-panel.md)). The schema arrived in the `20261115_215951_site_copy` migration.

«Navegación» is described in its own section below.

## Reading them: written text wins, empty falls back

`readSiteSettings` and `readIndexTexts` (`src/lib/site-copy/queries.ts`) read each global as a visitor (`overrideAccess: false`), the share image populated at `depth: 1`, and pass it through `src/lib/site-copy/resolve.ts`:

- `withDefaults(defaults, stored)` walks the default tree and takes, field by field, the stored text when it is non-blank and the default otherwise. Only keys present in the defaults count, so the site never renders a field it does not know.
- `resolveSiteSettings` also drops a social link that is not a web address (a `javascript:` URL, a fragment) back to its default, and turns `ogImage` into `{ url, width, height, alt }` from the original upload, which crawlers and social networks read better than the WebP variants, or `null` without a file.

So clearing a field in the panel brings back the built-in text rather than an empty heading.

`src/app/(frontend)/site-data.ts` wraps both reads in `unstable_cache` under the `site-copy` tag with a 600-second `revalidate` (`src/lib/site-copy/cache.ts`), as `loadSiteSettings` and `loadIndexTexts`; `loadNavigation` does the same for «Navegación» (see below). Writes made outside the server, such as the seed script, show within those ten minutes.

## Where the site uses them

- The frontend layout's `generateMetadata` returns `metadataBase` plus `siteMetadata(settings)`: title, description and Open Graph with the site name, `es_ES` and the share image (`src/lib/site-copy/metadata.ts`). The layout passes `settings.socials` to the header and the whole settings object to the footer (see [Site shell and search](../frontend/site-shell-and-search.md)).
- Every `/<slug>` page spreads `openGraphDefaults(settings)` into its Open Graph data, so guides, achievement pages, Dofus guides, standalone pages and checklists share the site name and image.
- The three indexes build their metadata with `indexMetadata(path, texts.<index>.seo, settings)`: title, description, canonical path and Open Graph. Their components take the index texts as a prop and fall back to `indexTextDefaults` when rendered without them (in tests and the component catalog). See [Metalogros index](../achievements/metalogros-index.md), [Dofus guides index](../dofus-guides/dofus-guides-index.md) and [Checklists index](../checklists/checklists-index.md).
- The home page reads `texts.home` for its hero, areas, tour, checklists and author sections.

## «Navegación»: the menu sections and the featured Dofus

«Navegación» decides what the header, the mobile sheet, the footer's «Explorar» column and the home page's areas show of the five site sections (`NAV_SECTION_KEYS`: `misiones`, `dofus`, `checklists`, `clases`, `mazmorras`). It holds Torre's choices only; each section's address, icon and color stay in code (`SECTION_CODE` in `src/components/site/nav.ts`), because they depend on routes and on the design's colors.

- **`sections`**: an array with exactly one row per section (`minRows` and `maxRows` both five, starting from `navigationDefaults.sections`). Each row has a read-only `key`, the localized `label` (the menu button), `title` (the full name, used in the footer, the menu panel, the mobile sheet and search) and `description` (the short phrase under the name in the menu panel and the sheet), a «Sale en la web» checkbox (`visible`) and a «Próximamente» checkbox (`soon`). Checklists has no menu button or phrase of its own, so its `label` and `description` are hidden in the panel. Dragging the rows sets the order. `validateNavSections` refuses a save with a section missing or repeated; a section is hidden by unticking «Sale en la web», not by deleting its row.
- **`featuredDofus`**: up to three Dofus guides (`relationTo: 'dofus-guides'`, no creating from the picker). `validateFeaturedDofus` accepts three or none.

`resolveNavigation(stored)` (`src/lib/site-copy/navigation.ts`, pure code) turns the stored global into what the site renders:

- Rows follow Torre's order; the first row of each key counts, unknown or repeated keys are ignored, and a missing section is appended in the usual order.
- An empty text or an unset checkbox takes the built-in value from `navigationDefaults`. Hidden sections are dropped, and each remaining row becomes a `Section` through `navSection`, which adds the code-owned address, icon and accent.
- The featured eggs come from the chosen guides as a visitor sees them: an unpublished guide, or one without an egg (Torre's or its item's, with its correction), is dropped, and with none left the menu shows the three default eggs (`DOFUS_FEATURED`).

`readNavigation` reads the global with `draft: false` and `overrideAccess: false`, populating only the guide's name, egg and item at `depth: 3`. `loadNavigation` caches it under both the `site-copy` tag (saving the global expires it) and the `dofus-guides` tag (a featured guide or its egg changing expires it). With the built-in values, the site renders the same menu as before the global existed; Clases and Mazmorras start as «Próximamente». The delete guard refuses to delete a Dofus guide the global features. The schema arrived in the `20261116_115937_navigation` migration. How the shell uses the result is in [Site header, footer and search](../frontend/site-shell-and-search.md) and [Home page](../frontend/home-page.md).

## Seeding the built-in text

A global that nobody has saved has no row: Payload returns each field's `defaultValue`, but nothing is stored. `pnpm seed:site-copy [--apply] [--remote] [--production]` (`scripts/seed-site-copy.ts`, logic in `src/lib/site-copy/seed.ts`) writes the built-in text into every empty field of the three globals so Torre sees it in the panel.

- It refuses a remote database without `--remote` and production without `--production` before starting Payload (`databaseScriptRefusal`).
- `copyFills` lists the empty text fields with their path and default. A global never saved counts as all empty and is saved whole.
- Without `--apply` it only prints what it would fill. With it, it updates each global with `withDefaults(defaults, stored)`: written text stays as it is and non-text fields such as the share image are not sent, so Payload leaves them alone. A rerun fills nothing.
- «Navegación» goes through `navigationSeed` instead: it fills the empty names and phrases of each section, appends any missing section in the usual order, keeps Torre's order and checkboxes, and, when no featured Dofus is chosen, picks the guides of the three default eggs by slug, only if all three exist; otherwise the report notes the missing slugs.

## Tests

- `tests/unit/site-copy.test.ts`: `withDefaults`, `copyFills`, social link fallback, the share image and the metadata helpers.
- `tests/unit/site-copy-globals.test.ts`: the two globals' fields, defaults, access and hooks.
- `tests/unit/site-copy-seed.test.ts`: the seed plan and report, «Navegación» included.
- `tests/unit/navigation.test.ts`: `resolveNavigation`, the two validators and the global's config.
- `tests/integration/navigation.test.ts`: access, refused saves, what the site reads (order, names, checkboxes, featured eggs of published guides only) and the seed against a real database.
- `tests/e2e/panel-navegacion.spec.ts`: changing the Dofus phrase of the mobile menu in «Navegación».
- `tests/integration/site-copy.test.ts`: reading and seeding against a real database.
- `tests/e2e/panel-textos.spec.ts`: editing the copy in the panel and seeing it on the site.
