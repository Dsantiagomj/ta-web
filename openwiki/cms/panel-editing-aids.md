---
type: subsystem
title: Panel dashboard and editing aids
description: The panel features that help Torre work - the «Pendiente» dashboard that replaces Payload's collection grid, the panel guide at /admin/guia and a line per collection, the one-line «En la web» publish status, three live preview sizes, tabs on long forms, labelled rows, the checklist step outline and step and objective pickers, the color picker, and the accessibility names added to Payload's controls.
tags: [payload, admin, panel, dashboard, accessibility, checklists]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-15T11:00:17.514Z
sources:
  - id: openwiki-source-708be0163b21a8d064e79c3c
    resource: repo://src/collections/DofusGuides.ts
  - id: openwiki-source-233b23210c0976422cfcb8f0
    resource: repo://src/collections/field-tabs.ts
  - id: openwiki-source-b8ba80851b51332e590ccfed
    resource: repo://src/components/admin/ColorField.tsx
  - id: openwiki-source-297fac5ff26d4e592262a3c5
    resource: repo://src/components/admin/PanelA11y.tsx
  - id: openwiki-source-e61fca19fd9274a2b22965b7
    resource: repo://src/components/admin/PanelGuide.tsx
  - id: openwiki-source-990f1cd4ee63709cb8ffc39c
    resource: repo://src/components/admin/PublishStatus.tsx
  - id: openwiki-source-c37365279b9dd8320b557c91
    resource: repo://src/components/admin/StepOutline.tsx
  - id: openwiki-source-1bbc3e6f58549d5e0e7eeecd
    resource: repo://src/components/admin/StepRefField.tsx
  - id: openwiki-source-e16e139fd5e136b007485681
    resource: repo://src/components/admin/StopObjectiveField.tsx
  - id: openwiki-source-a7371ddcaee8097eeffe6662
    resource: repo://src/lib/admin/a11y-fixes.ts
  - id: openwiki-source-337e6f640b09837764c23c06
    resource: repo://src/lib/admin/checklist-pickers.ts
  - id: openwiki-source-e43c332bc061e0267b6104f4
    resource: repo://src/lib/admin/dashboard.ts
  - id: openwiki-source-21608b24def9c73939548b30
    resource: repo://src/lib/admin/live-preview.ts
  - id: openwiki-source-a70d61852b4fc9e65288e597
    resource: repo://src/lib/admin/panel-guide.ts
  - id: openwiki-source-213086ebe5f3f73403a7bc21
    resource: repo://src/lib/admin/publish-status.ts
  - id: openwiki-source-a4c5e7d3ddb81b5d954d0a18
    resource: repo://src/lib/admin/row-labels.ts
  - id: openwiki-source-a15ada278555c9db5f9be92c
    resource: repo://src/lib/admin/step-outline.ts
  - id: openwiki-source-2c42ff828c6d8e213a2f7416
    resource: repo://src/payload.config.ts
  - id: openwiki-source-555fe60f70722da3d8252927
    resource: repo://tests/e2e/panel-ola2.spec.ts
generated: { by: "claude-code", at: "2026-11-15T11:00:17.514Z" }
---

# Panel dashboard and editing aids

Beyond roles, delete protection and locked fields (see [Admin panel](admin-panel.md)), the panel has a set of aids for Torre, each tied to a backlog item in `docs/research/backlog.md`. The components live in `src/components/admin/`; their strings and pure logic live in `src/lib/admin/`, so the logic is unit-tested without React. Adding a component requires `pnpm generate:importmap`.

## «Pendiente», the dashboard (A-13)

`src/payload.config.ts` replaces Payload's dashboard view with `Dashboard` (`src/components/admin/Dashboard.tsx`). Instead of the grid of collections, which the menu already has, it answers what to work on today. `readDashboard` (`src/lib/admin/dashboard.ts`) reads everything as the signed-in account (`overrideAccess: false`), so it shows what that account would see in the lists. It covers the five editorial collections (`EDITORIAL_COLLECTIONS`) and returns four parts, each capped (`DASHBOARD_LIMITS`):

| Part | What it lists |
|---|---|
| «Borradores sin publicar» (8) | The latest drafts across the collections, newest first, marked «Nunca publicada» or «Cambios sin publicar» |
| «En preparación» (5 per collection) | Published documents whose `state` is `preparing`, per collection, with a link to the filtered list. Achievement pages and metalogros can number in the hundreds, so they are counted and only the latest are shown; Dofus guides and checklists are few and read whole |
| «Guías de Dofus sin checklist» (12) | Dofus guides whose page has no checklist card, with a hint when a published checklist already points at that Dofus |
| «Cambios recientes» (8) | The latest saved versions across the collections |

It also has shortcuts to create a quest guide, a Dofus guide, an achievement page, a checklist or upload an image, and a link to the panel guide.

## The panel guide (A-14)

`PanelGuide` is a custom admin view at `/admin/guia` (`PANEL_GUIDE_PATH`), linked from the end of the menu by `PanelGuideNavLink`. A custom view gets neither the panel template nor a session check on its own, so it adds both: without a user it redirects to the login. It says which role the account has and explains drafts, publishing, «Visible en la web» and «En preparación» (with how each collection shows a preparing document, from `preparingOnSite`), game data from DofusDB, images, versions as the undo button, the web address, and what is in each part of the panel. That last section lists only the collections this account can see, each with its description.

The same descriptions sit above each collection's list: `withPanelDescriptions` (`src/lib/admin/panel-guide.ts`) wraps the `collections` array in the Payload config and sets `admin.description` from `panelStrings.collections`.

## «En la web», the publish status (A-16)

For a page to show on the site it needs two things: «Visible en la web» set to Publicada and «Publicar cambios». The `PublishStatus` field says the result in one line at the top of the sidebar of every editorial document. `withPublishStatus` (`src/lib/admin/live-preview.ts`) inserts it as the first sidebar field; it is a UI field and stores nothing.

The client component fetches the published version from the REST API, because that is what a visitor sees; a later draft only adds a note. `publishStatus` (`src/lib/admin/publish-status.ts`) picks the tone and text:

| Tone | When |
|---|---|
| `hidden` | in the trash, not saved yet, never published (a draft), or the check failed |
| `loading` | the published version is still on its way |
| `preparing` | the published version is «En preparación»; the text depends on the collection (an achievement page shows dimmed without a page, a checklist links to its Squarespace page or not) |
| `pending` | visible, with drafts saved after the published version |
| `live` | visible, nothing pending |

Unsaved form changes add «Lo que acabas de cambiar aún no está guardado».

## Live preview sizes (A-20)

`pagePreview` (`src/lib/admin/live-preview.ts`) is shared by the collections that have a page at `/<slug>` (quest guides, achievement pages, Dofus guides and checklists). It opens `/vista-previa` with the latest draft, live and in a separate tab, with three sizes (`livePreviewBreakpoints`): «Móvil» 390 × 844, «Tableta» 1024 × 768 and «Escritorio» 1440 × 900, the widths of the `DESIGN.md` screenshots.

## Tabs on long forms (A-18, A-22)

Long forms are split into unnamed tabs. An unnamed tab only arranges the form; the stored data and its paths do not change, so no migration is needed.

- quest guides: «Contenido», «Resumen», «SEO»;
- achievement pages: «Misiones», «Texto», «Recompensas»;
- Dofus guides: their own tabs (see [Dofus guide data model](../dofus-guides/dofus-guide-data.md));
- a checklist step: «Texto», «Misiones», «Necesitarás», «Imágenes».

The checklist step uses `placeInTabs` (`src/collections/field-tabs.ts`), which throws if a named field is missing from every tab, appears in two, or does not exist. A field left out would silently drop from the schema, and the next migration would delete its column.

## Labelled rows

`RowLabels.tsx` labels array rows by their content instead of Payload's «Paso 01» (`src/lib/admin/row-labels.ts`):

- a checklist step by the text of its first segment, or its zone;
- a segment by its text and, when it is not plain, its kind;
- a Dofus guide «Necesitarás» group by its group («Grupo 3: Consumibles»);
- other rows by a text or relationship field, such as a quest or an item.

Long arrays (achievement quests, «Necesitarás» rows, steps, segments) start collapsed.

## Checklist step tools (A-18, A-19)

- **Step outline.** `StepOutline` is a UI field above the steps: one line per step with buttons to move it up or down, and Alt with the arrow keys (or Home and End) when it has focus. It moves the form rows like the drag handle does, so each step keeps its stepId and nothing changes until saving. It reads the steps from Payload's form state (`src/lib/admin/step-outline.ts`) and re-renders only when what it shows changes.
- **Step pickers.** `StepRefField` replaces copying a stepId in «Pasos que termina», «También termina», «Avanza los pasos» and «La termina el paso»: steps are picked by name, every step but the field's own. It still stores stepIds. A new step can be picked before saving, because its stepId is born with the row. A chosen id that is no longer a step stays listed so it can be removed.
- **Stop objective picker.** `StopObjectiveField` lists the objectives of the stop's quest by text, numbered from 1, stage after stage, loaded from the API. It stores the same index from 0. The saved value always shows and can be cleared, also while loading or when it is no longer in the quest, and the field says when the quest has no objectives yet or loading failed.

The pickers' logic (`ownStepIndex`, `refOptions`, `objectiveOptions`, `objectivePickerOptions`) is in `src/lib/admin/checklist-pickers.ts`.

## Color picker (A-22)

`ColorField` wraps Payload's own text field (label, help, errors and styles) for a Dofus guide's color and a checklist card's color, and validates the color in the browser before saving. `ColorSwatch`, mounted as `beforeInput`, is a native color picker that writes into the same field, so it still stores `#2a5aaa`. While dragging it leaves the form alone and writes once on release.

## Accessibility (A-21)

Payload renders some controls without an accessible name, and its config cannot reach them. `PanelA11y`, mounted as a panel provider, watches the DOM and runs `src/lib/admin/a11y-fixes.ts`, which names those controls when a name is missing. Every name it writes is marked (`data-ta-<attribute>`), so a name Payload set is never overwritten. Fixed names are set once; names that depend on content (a row's checkbox, the lock, «Versiones») are recomputed on each pass. Changes inside a text editor do not trigger a pass. If Payload changes that HTML, the panel's axe tests catch it.

## Tests

- `tests/unit/admin-dashboard.test.ts` and `tests/integration/admin-dashboard.test.ts`: the dashboard parts and limits.
- `tests/unit/admin-panel-guide.test.ts` and `admin-panel-guide-view.test.tsx`: the guide and the collection lines.
- `tests/unit/admin-publish-status.test.ts`, `admin-publish-status-component.test.tsx` and `tests/integration/panel-read-versions.test.ts`: the status line and reading the published version.
- `tests/unit/collection-tabs.test.ts` and `admin-panel-wave2.test.ts`: the tabs and the live preview sizes.
- `tests/unit/admin-row-labels.test.ts`, `admin-step-outline.test.ts` and `admin-checklist-pickers.test.ts`: row labels, the outline and the pickers.
- `tests/unit/admin-color-field.test.tsx`: the color picker.
- `tests/unit/admin-a11y-fixes.test.ts` and `admin-panel-a11y-provider.test.tsx`: the accessibility names.
- `tests/e2e/panel-ola2.spec.ts` and `tests/e2e/panel-a11y.spec.ts`: these aids in a browser, and axe on the panel with no exceptions.
