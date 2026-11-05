---
type: architecture
title: Design system components
description: The generic UI components in src/components/ui and the quest guide components in src/components/game, how they are styled, the single PageEnhancements client island that copies coordinates, plays videos and opens images fullscreen, and the pure helpers in src/lib/guides they rely on.
tags: [design-system, components, frontend, accessibility, client-island]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-05T11:00:19.182Z
sources:
  - id: openwiki-source-fbd21844e7a1a5ca44748d2c
    resource: repo://src/app/(frontend)/sistema/CatalogSection.tsx
  - id: openwiki-source-102ac9d3e731f9c02830d89f
    resource: repo://src/app/(frontend)/sistema/page.tsx
  - id: openwiki-source-2eb0999cc1d17838f97d190b
    resource: repo://src/components/game/AchievementChain.tsx
  - id: openwiki-source-eca286f3a0883e1803538ba2
    resource: repo://src/components/game/BotinCard.tsx
  - id: openwiki-source-cf3fb6a3e2124aa6edb72c22
    resource: repo://src/components/game/Coordinates.tsx
  - id: openwiki-source-7ba3e6f5057719fdf70c6941
    resource: repo://src/components/game/game.css
  - id: openwiki-source-19f12d3490c610e681abdc9c
    resource: repo://src/components/game/HeroHeader.tsx
  - id: openwiki-source-2c139f34b50dd107e988159d
    resource: repo://src/components/game/PageEnhancements.tsx
  - id: openwiki-source-e470214683feb6927dd498bd
    resource: repo://src/components/game/StagesTimeline.tsx
  - id: openwiki-source-fa5e19158960e876b0c64eba
    resource: repo://src/components/game/strings.ts
  - id: openwiki-source-f67df233dae44a6261a3dce2
    resource: repo://src/components/game/SummaryRibbon.tsx
  - id: openwiki-source-b7873b6b1a7bfb135bc0f569
    resource: repo://src/components/game/VideoFacade.tsx
  - id: openwiki-source-05c9a42e142e8a8796dbb308
    resource: repo://src/components/ui/Button.tsx
  - id: openwiki-source-8463c54295dc5c710d9c0338
    resource: repo://src/components/ui/Figure.tsx
  - id: openwiki-source-da1687298e4439edac4a41be
    resource: repo://src/components/ui/Picture.tsx
  - id: openwiki-source-e9c7a3c0dbc8cf950008da76
    resource: repo://src/components/ui/strings.ts
  - id: openwiki-source-8f0ef4d5ed917e5396cdb8e2
    resource: repo://src/components/ui/ui.css
  - id: openwiki-source-ceae51c9393b901fd8fffc80
    resource: repo://src/lib/guides/coordinates.ts
  - id: openwiki-source-c2c770807aee2aa0cc927079
    resource: repo://src/lib/guides/display.ts
  - id: openwiki-source-5d625b6c9ec96bb42f058c48
    resource: repo://src/lib/guides/video.ts
  - id: openwiki-source-6da1dc6084491f36a7252e5d
    resource: repo://tests/unit/coordinates.test.ts
  - id: openwiki-source-606ffdd80bc08b7948b6125a
    resource: repo://tests/unit/display-format.test.ts
  - id: openwiki-source-0dce08d52a9be6f19ead446b
    resource: repo://tests/unit/game-components.test.tsx
  - id: openwiki-source-ec6f86966a8f8c08cdb73603
    resource: repo://tests/unit/ui-components.test.tsx
  - id: openwiki-source-b58f839a189d87a7e1f37d39
    resource: repo://vitest.config.mts
generated: { by: "claude-code", at: "2026-11-05T11:00:19.182Z" }
---

# Design system components

The components specified in `DESIGN.md` (Components, Quest guide components) live in two folders:

- `src/components/ui/`: generic parts any page can use (button, icon button, chip, tag pill, callout, stat tile, progress bar, checkbox, card, picture, figure).
- `src/components/game/`: the quest guide parts (hero header, level medallion, summary ribbon, item chip and slot, monster chip and fight block, coordinates chip, stages timeline, Botín card, achievement chain, video facade) plus `PageEnhancements`, the one client island.

All of them except `PageEnhancements` are server components with no state. On `main` the only page that renders them is the [component catalog at `/sistema`](component-catalog.md); the quest guide page they were designed for does not exist yet.

## Styling conventions

- **Utilities first.** Most styling is Tailwind utility classes on the design tokens from `src/styles/theme.css` (`bg-raised`, `text-ink-2`, `rounded-pill`, `duration-(--duration-fast)`). See [Styles, tokens and site shell](styles-and-shell.md).
- **Hand-written CSS for what utilities express badly.** `ui.css` holds the callout's mixed background, the checkbox, the progress bar, the hit-target rule and the fullscreen viewer. `game.css` holds the hero art mask and shading, the coordinates chip, the stages timeline and its progress pill, the Botín card, the achievement chain arrows, the video facade and the "Copiado" toast. Each component imports the stylesheet it needs. Both files use only tokens, and animate only `transform`, `opacity` and colors, so the global reduced-motion rule in `globals.css` turns all motion off.
- **Mode-dependent values come from variables.** `game.css` reads values such as the hero shade and art opacity from variables set on `:root`, `[data-mode='dark']` and `[data-mode='light']` instead of from an ancestor selector, so a light section inside a dark page gets the light values.
- **`cx()`** (`ui/cx.ts`) joins class names and drops empty ones.
- **Text lives in string modules.** `ui/strings.ts` (`uiStrings`) and `game/strings.ts` (`gameStrings`) hold every Spanish label, so a second language would translate those modules.
- **Images are already converted.** `ImageAsset` (`ui/types.ts`) is a WebP `src`, an optional `avif` and the file's `width` and `height`. The app never optimizes images on request.

### Hit targets

Controls drawn smaller than 40px carry the `hit-target` class together with Tailwind's `relative`. In `ui.css`, `.hit-target::after` is a transparent box, centered vertically, `max(100%, 40px)` tall, and `max(100%, 44px)` under `pointer: coarse`. It enlarges the area that receives clicks and taps without changing the drawing or the line height. `Button`, `ButtonLink`, the linked `TagPill` and `Checkbox` use it; a `TagPill` without a link does not. The coordinates chip has its own `::after` rule in `game.css` for the same purpose.

## Generic components (`src/components/ui/`)

| Component | What it renders |
|---|---|
| `Button`, `ButtonLink`, `buttonClass()` | A pill `<button type="button">` or `<a>` with `data-variant`. Primary is an `--color-accent` outline, 44px high (40px with `compact`), filled with `--color-raised` on hover; secondary is a raised fill; ghost has no fill. No color is ever used as a button fill. Pressed scales to 0.96; disabled drops to 40 percent opacity |
| `IconButton` | A round button with only an icon; its `label` prop becomes the required accessible name |
| `Chip` | A 26px raised pill for short data, optionally with an icon |
| `TagPill` | An `--color-accent-2` outlined tag; with `href` it is a link and a hit target |
| `Callout` | A note with a tinted background in its variant's color (`tip`, `warning`, `stop`) and a default title from `uiStrings.callout` ("Consejo", "Importante", "Alto"), which a `title` prop can replace |
| `StatTile` | A large figure with its label, using `formatAmount` so the number never wraps |
| `ProgressBar` | A server-rendered `role="progressbar"` bar with its percentage; the value is clamped to 0–100 percent and the fill moves with `transform`, never `width` |
| `Checkbox` | A native checkbox inside its label |
| `Card` | A surface panel; with `href` the whole card is one link (never a link inside another) and the border takes the section color on hover |
| `Picture` | A `<picture>` with an AVIF `<source>` when present and a WebP `<img>` with explicit `width` and `height`. It is lazy by default; `priority` drops lazy loading and sets `fetchPriority="high"` |
| `Figure` | A guide screenshot with an optional caption. The image is wrapped in a link to the WebP file (`data-image-viewer`, `data-image-avif`, a `zoom-in` cursor) named "Ver imagen a pantalla completa: {alt}" |

## Quest guide components (`src/components/game/`)

| Component | What it renders |
|---|---|
| `HeroHeader` | Breadcrumbs, title, optional subtitle and level medallion, over the quest art when there is some. The art is decorative (`alt=""`), may have a separate mobile source, and is loaded with `fetchPriority="high"` because it is the LCP candidate. Without art the same grid sits on the background. The section is labelled by its title through a `useId()` id, so several headers on one page never clash |
| `LevelMedallion` | The quest level in a circle with an `--color-accent-2` ring, read as "Nivel N" |
| `SummaryRibbon` | Where the quest starts, what it requires and what it needs, plus a link to the reward (`#botin` by default). Missing parts are not rendered; with no data at all it renders nothing |
| `ItemChip`, `ItemSlot` | An item on one line (24px icon, name, quantity), or an inventory slot (48px icon in a 72px slot, the quantity in the corner, read as "1 × Pico de tofu"). Without an icon the slot stays empty |
| `MonsterChip`, `FightBlock` | A monster with art, "N × Name" and an optional level; the fight block is a list of them |
| `CoordinatesChip`, `CoordinatesText`, `TravelButton` | `[x,y]` shown as the game writes it, carrying `data-copy="/travel x,y"`. `CoordinatesText` turns every `[x,y]` in a prose string into a chip. `TravelButton` is the compact primary button that copies the start position |
| `StagesTimeline`, `StageCard` | An ordered list of stage cards with a numbered badge, title, optional coordinates chip and content. With `ticks`, each badge is the label of a visually hidden checkbox and a progress pill counts checked stages (see below) |
| `BotinCard` | The reward at the end of the stages: XP and kamas stat tiles, one slot per item and an optional achievement chain. With nothing to show it renders nothing |
| `AchievementChain` | The achievement's quests on one line: the current quest as text with `aria-current="page"`, the others as links. Arrows are CSS, so a screen reader hears a numbered list. Chains longer than five are trimmed by `chainWindow` |
| `VideoFacade` | See below |

### The stages progress pill without JavaScript

The pill is pure CSS. `.stages__track` resets a CSS counter and every checked `.stage__check` increments it; the pill prints the counter as the done count next to `/total`. To light the segments, `StagesTimeline` renders an inline `<style>` with one `:has()` rule per stage: when the checkbox `#{scope}-eN` is checked, segment `N` gets the accent color. The pill comes after the list in the DOM so the counter already has its value, and is drawn on top. The `id` is cleaned first (`cssId`) so it is a valid selector: anything outside letters, digits, `_` and `-` becomes `-`, and a leading digit gets an `e-` prefix. A stage's `done` flag only sets the checkbox's initial state; member progress does not exist yet.

### Video facade

`VideoFacade` loads no third-party code until the reader clicks. It resolves the stored URL with `youtubeId`. For a YouTube video it renders a link to `youtube.com/watch?v=…` carrying `data-video-embed` (the `youtube-nocookie.com/embed/…?autoplay=1` URL) and `data-video-title`, named "Ver el vídeo: {title}", over our own poster image or, without one, the title. The caption reads "{title} · YouTube, Torrente Arcano". If stored data holds a non-YouTube URL, it renders a plain link with the title instead of failing; the panel's video block accepts only YouTube links (see [Guide body blocks](../cms/blocks.md)).

## The client island: `PageEnhancements`

`PageEnhancements` (`"use client"`) is the only client code these components need. A page renders it once. It listens with event delegation on `document`, so it needs no props and works for any number of chips, videos and figures. Without it every feature still works in a plainer form: a chip is selectable text, a video is a link to YouTube, a figure is a link to its image file.

On mount it turns every `[data-copy]` element into a button (`role="button"`, `tabIndex=0`, and `aria-label` from `data-copy-label`, which starts with the visible text: "[1,-17], copiar /travel 1,-17"). Then it handles:

- **Copy.** A click on a `[data-copy]` element, or Enter or Space on one, writes its value to the clipboard and shows "Copiado: /travel x,y" in a `role="status"` toast for 4 seconds. If the clipboard write fails, the toast says "Escribe /travel x,y en el chat" instead.
- **Video.** A click without a modifier key on `a[data-video-embed]` creates an iframe with that `src`, the video title, `allow="autoplay; encrypted-media; picture-in-picture"` and fullscreen allowed, hides the link (React owns the node, so it is hidden rather than removed), inserts the iframe after it and focuses it.
- **Fullscreen image.** A click without a modifier key on `a[data-image-viewer]` reads the link's WebP URL, the AVIF URL, the image's alt and size, the figure's caption, and the `data-theme` and `data-mode` of the nearest themed ancestor. It then opens a native `<dialog>` with `showModal()`, which makes the page inert. The dialog is named "Imagen a pantalla completa", copies that theme and mode so the viewer matches the image's section, and shows a "Cerrar" icon button, the image as a `<picture>` and the caption. Esc (native), the button, or a click on the dialog itself (outside the image, caption and button) closes it, and focus returns to the link that opened it.

With any modifier key held (Ctrl, Cmd, Shift, Alt), video and figure links behave as normal links. AGENTS.md allows exactly this one island on guide pages, inside the 150 KB JavaScript budget (see [Performance budgets](../testing/performance-budgets.md)).

## Helpers in `src/lib/guides/`

These are pure functions with no React or Payload dependency:

- **`coordinates.ts`**: `formatCoordinates` writes `[x,y]`; `travelCommand` writes `/travel x,y`, which starts the in-game autopilot from the chat; `parseCoordinates` reads a text that is only `[x,y]` (optional sign and spaces, at most three digits per number) or returns `null`; `splitCoordinates` splits prose into text and coordinates in order, leaving anything that does not match as text.
- **`display.ts`**: `formatThousands` separates thousands with a plain space (`24 316`); `formatAmount` uses a no-break space so a figure never splits across lines; `chainWindow` keeps a chain of five or fewer whole and otherwise keeps the first, previous, current, next and last quests, with `null` marking each gap. The module has no dependencies so the island can import it through `gameStrings` without pulling in the summary code.
- **`video.ts`**: `youtubeId` returns the 11-character video ID from `watch?v=`, `youtu.be/`, `/embed/` and `/shorts/` links on the YouTube and `youtube-nocookie.com` hosts, or `null`; `youtubeEmbedUrl` builds the `youtube-nocookie.com` embed URL with `autoplay=1`; `youtubeWatchUrl` builds the watch URL.

## Tests

- `tests/unit/ui-components.test.tsx` and `tests/unit/game-components.test.tsx` render each component with `renderToStaticMarkup` and check the markup: button types and variants, accessible names, `Picture` sources, lazy loading and priority, the `Figure` link and its name without alt, which controls are hit targets, the hero's art priority and unique heading ids, the ribbon and Botín rendering nothing without data, the timeline with and without ticks and its id cleanup, the chain's current quest and trimming, the video facade with no iframe and its non-YouTube fallback, and the island's closed, named dialog and status region. `vitest.config.mts` includes `.test.tsx` files for these.
- `tests/unit/coordinates.test.ts`, `tests/unit/display-format.test.ts` and `tests/unit/video-url.test.ts` cover the helpers.
- `tests/e2e/sistema.spec.ts` checks the behavior in a browser, including axe WCAG 2.2 AA. See [Component catalog](component-catalog.md).

## Related pages

- [Component catalog (/sistema)](component-catalog.md)
- [Styles, tokens and site shell](styles-and-shell.md)
- [Theme and mode](theme-and-mode.md)
- [Guide body blocks](../cms/blocks.md)
- [Performance budgets](../testing/performance-budgets.md)
