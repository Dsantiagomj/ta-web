---
type: subsystem
title: Admin panel for editors
description: How the Payload panel is shaped for Torre, a non-technical editor - plain Spanish labels, menu groups and branding, custom admin components, admin and editor roles with a last-admin guard, refusal to delete anything a guide still references or any game art, and fields that lock once saved.
tags: [payload, admin, access-control, roles, panel, editors]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-14T11:00:46.827Z
sources:
  - id: openwiki-source-54dc13df301cba186b948930
    resource: repo://src/app/(payload)/custom.scss
  - id: openwiki-source-05f379ec302676e4aba3f51c
    resource: repo://src/collections/AchievementGroups.ts
  - id: openwiki-source-931b952fdbc6f599d8c88e75
    resource: repo://src/collections/AchievementPages.ts
  - id: openwiki-source-153285322f1fa0bfb7572570
    resource: repo://src/collections/delete-guard.ts
  - id: openwiki-source-708be0163b21a8d064e79c3c
    resource: repo://src/collections/DofusGuides.ts
  - id: openwiki-source-eec436a9dcb7734a62bf153f
    resource: repo://src/collections/editorial-access.ts
  - id: openwiki-source-14b74cda6fb31c51d7062a0d
    resource: repo://src/collections/locked-once-saved.ts
  - id: openwiki-source-d58a4d3cf178bb2fa2e94831
    resource: repo://src/collections/Media.ts
  - id: openwiki-source-7a2723ea85824e431ff5eb54
    resource: repo://src/collections/QuestGuides.ts
  - id: openwiki-source-c46dfd6e94656494b7d9df7b
    resource: repo://src/collections/Users.ts
  - id: openwiki-source-94e2f9e375bd23f24e192e98
    resource: repo://src/lib/admin/locked-row.ts
  - id: openwiki-source-9d056b50271cc5d3275bd3d9
    resource: repo://src/lib/admin/references.ts
  - id: openwiki-source-589bfa7373a4546b25115691
    resource: repo://src/lib/admin/strings.ts
  - id: openwiki-source-283eae30e65b21a6738bd616
    resource: repo://src/migrations/20261114_011851_users_roles.ts
  - id: openwiki-source-2c42ff828c6d8e213a2f7416
    resource: repo://src/payload.config.ts
generated: { by: "claude-code", at: "2026-11-14T11:00:46.827Z" }
---

# Admin panel for editors

The Payload panel at `/admin` is where Torre, who came from Squarespace and is not technical, writes every guide. The panel conventions come from the backlog items A-01 to A-23 in `docs/research/backlog.md`. They fall into four groups: how the panel speaks, who can do what, what cannot be deleted, and which fields lock.

## How the panel speaks

- **Plain Spanish, with tú and no jargon.** Labels, descriptions and messages live in `src/lib/admin/strings.ts` (`panelStrings`) and collection strings files. The slug field is «Dirección en la web» (`SLUG_LABEL` in `src/collections/slug-field.ts`); Torre's `state` field is «Visible en la web». `panelStrings.translations` overrides some of Payload's own Spanish words, so the header's «Estado» only means Payload's publish status («Borrador, sin publicar», «Publicado en la web», «Con cambios sin publicar»).
- **Menu order and groups.** The menu follows the order of the `collections` array in `src/payload.config.ts`, and each collection names its group through `panelStrings.groups`: «Contenido» (quest guides, achievement pages, metalogros, Dofus guides, checklists), «Imágenes» (media), «Datos del juego (solo lectura)» (quests, items, monsters, dungeons, NPCs, subareas, achievement categories, achievements) and «Ajustes» (panel accounts).
- **Hidden until it means something.** Every collection sets `hideAPIURL: true`. With one locale, `src/app/(payload)/custom.scss` hides the locale switch and the «— Español» suffix of localized fields; `tests/unit/admin-panel-config.test.ts` fails if a second locale is added without removing that rule.
- **Branding.** `PanelBrand.tsx` replaces Payload's logo and icon with the Torrente Arcano emblem and adds a welcome above the login form; the panel uses the site's icons and a title suffix.

AGENTS.md prefers admin config over custom components. The custom ones live in `src/components/admin/`, with their strings and pure logic in `src/lib/admin/`; adding one requires `pnpm generate:importmap`:

| Component | Where it shows | What it does |
|---|---|---|
| `RowLabels.tsx` | Array rows | Labels rows by their text instead of «Paso 17»: a checklist step by its first segment or its zone, a segment by its kind and text, other rows by a text or relationship field (`src/lib/admin/row-labels.ts`) |
| `SlugDescription.tsx` | Under «Dirección en la web» | Shows the full public address live, or the message saving would give when the slug cannot be saved (`src/lib/admin/slug.ts`) |
| `CopyValueDescription.tsx` | A checklist step's identifier | A copy button, so Torre can paste a stepId into «Pasos que termina» |
| `LockedOnceSavedText.tsx` | A checklist prerequisite's key | Editable in a new row, read-only once saved |
| `PanelBrand.tsx` | Login and navigation | Logo, icon and login welcome |

## Roles

Panel accounts (`src/collections/Users.ts`) have a `role`, `admin` or `editor` (`PANEL_ROLES` in `src/collections/editorial-access.ts`). Members of the site will use Better Auth, not this collection.

| Action | Editor | Admin |
|---|---|---|
| Create, edit and publish content | Yes | Yes |
| Delete media, achievement pages, metalogros | No | Yes |
| Delete a quest guide with a non-empty `originalUrl`, or a Dofus guide or checklist with `importSnapshot` (made by an import) | No | Yes |
| Delete content made by hand | Yes | Yes |
| Change a locked field once saved | No | Yes |
| Read and edit accounts | Only their own, without changing their role | All |
| Create, delete and unlock accounts | No | Yes |

`adminOrNotImported(marker)` builds the delete rule for collections that imports also fill: an admin deletes anything; an editor gets a `where` that matches only documents whose marker is empty (a blank `originalUrl` counts as empty). A duplicate drops the marker (`clearOnDuplicate`, a `beforeDuplicate` field hook), so the copy belongs to the editor who made it. An account without a role, such as a session from before roles, is not an admin (`isAdminUser`).

**Account rules.** A new account defaults to `editor`. `firstAccountIsAdmin`, a `beforeChange` hook, makes the first account (created in `/admin` on an empty database) an admin, or nobody could manage the others. `keepAnAdmin`, a `beforeOperation` hook, refuses any delete or role change, single or bulk, that would leave no admin. It runs once per operation because Payload runs a bulk operation's per-document hooks in parallel, where a per-document check could let every admin go. The role is saved to the JWT. The login locks an account for 10 minutes after 5 failed attempts, pinned explicitly because dev is public. Migration `20261114_011851_users_roles` made every account that existed then an admin.

## Nothing a guide points at can be deleted

Deleting something a guide uses used to leave a hole with no warning (A-17). `refuseReferencedDelete(target)` in `src/collections/delete-guard.ts` is a `beforeDelete` hook on media, achievement pages, metalogros, quest guides and Dofus guides. `REFERRERS` lists, for each target, the collections and exact field paths that hold a reference:

| Target | Referenced from |
|---|---|
| `media` | quest guide body images, a Dofus guide's `videoPoster` and body images, a checklist step's figure image, icon and banner, achievement page prose |
| `achievement-pages` | Dofus guide achievement parts |
| `quest-guides` | Dofus guide quest parts, a metalogro's `guides` |
| `achievement-groups` | an achievement page's `group` |
| `dofus-guides` | a checklist's `dofusGuide` |

For every referrer it queries both the published documents and the latest drafts (a draft published later would leave the same hole), all at once, each limited to 10 names plus a total. If anything refers to the target, the hook throws a 409 with a message naming up to 10 guides and the count («Esta imagen sale en 4 guías: …», `src/lib/admin/references.ts`).

Achievement page prose is Lexical JSON, which Payload cannot query as a tree. `prosePaths` asks for upload nodes (`value`) and the `poster` of video blocks at each depth down to `PROSE_DEPTH` (6) levels. Images in other rich text are not counted. A new relationship or upload field that points at one of these collections must add its path to `REFERRERS`.

**Game art.** `refuseGameAssetDelete` refuses, for any request with a user, to delete media with `gameAsset` set: item and achievement icons, monster images and NPC renders that the DofusDB refresh imported and game data links. Trusted jobs without a user can still delete it.

## Fields locked once saved

Some fields break data when edited (A-23). Each says why in its help text (`panelStrings.locks`).

**`lockedOnceSet(name)`** (`src/collections/editorial-access.ts`) is a field `access.update` rule: anyone fills the field while it is empty; once it holds a value only an admin can change it, and Payload silently keeps the saved value when an editor sends another. It guards `order` (quest guides do not have one; achievement pages, metalogros, Dofus guides and checklists do) and the DofusDB link of each editorial collection: `quest` on quest guides, `achievement` on achievement pages, `category` on metalogros, `dofus` on Dofus guides. `order` moves the page in lists and menus; the link feeds every autofilled field.

**`keepSavedValue`** (`src/collections/locked-once-saved.ts`) guards a checklist prerequisite's `key`, which holds every member's tick for that row, so it never changes once saved, for anyone. It finds the saved row by its id across every group, since dragging a row elsewhere does not make it new (`src/lib/admin/locked-row.ts`). Payload gives a fresh id to a row that arrives without one before any field hook runs, which would make it look new; `rememberRowsWithoutId`, a `beforeOperation` hook that sees the raw request, records those rows in `req.context` so they cannot replace a saved row's key.

## Tests

- `tests/integration/panel-roles.test.ts` and `tests/integration/users-access.test.ts`: who can do what, the first-account and last-admin rules, and imported content.
- `tests/integration/users-roles-migration.test.ts`: existing accounts become admins.
- `tests/integration/delete-references.test.ts`: the delete guard across collections, drafts and prose.
- `tests/integration/field-locks.test.ts`: `lockedOnceSet` and the prerequisite key.
- `tests/unit/delete-guard.test.ts`, `admin-references.test.ts`, `admin-locked-row.test.ts`, `admin-row-labels.test.ts`, `admin-slug-problem.test.ts`, `admin-components.test.tsx` and `admin-panel-config.test.ts`: the pure pieces and the config.
- `tests/e2e/panel.spec.ts` and `tests/e2e/panel-papeles.spec.ts`: the panel in a browser, including the roles.
