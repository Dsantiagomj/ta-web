---
type: architecture
title: Design system components
description: The generic UI components in src/components/ui and the quest guide components in src/components/game, how they are styled, the single PageEnhancements client island that copies coordinates, plays videos and opens images fullscreen, and the pure helpers in src/lib/guides they rely on.
tags: [design-system, components, frontend, accessibility, client-island]
sources:
  - id: openwiki-source-cb49e3c4d1015b8673e71275
    resource: repo://src/app/(frontend)/%5Bslug%5D/page.tsx
  - id: openwiki-source-102ac9d3e731f9c02830d89f
    resource: repo://src/app/(frontend)/sistema/page.tsx
  - id: openwiki-source-df5293cef721793cede8497d
    resource: repo://src/components/brand/Emblem.tsx
  - id: openwiki-source-2eb0999cc1d17838f97d190b
    resource: repo://src/components/game/AchievementChain.tsx
  - id: openwiki-source-cf3fb6a3e2124aa6edb72c22
    resource: repo://src/components/game/Coordinates.tsx
  - id: openwiki-source-2b96a3b7e01c32a9b8203dd0
    resource: repo://src/components/game/game-icons.ts
  - id: openwiki-source-7ba3e6f5057719fdf70c6941
    resource: repo://src/components/game/game.css
  - id: openwiki-source-14a42937e4b81401fbe9cbee
    resource: repo://src/components/game/GuideBody.tsx
  - id: openwiki-source-9f8d7f132d35b6a713f94e20
    resource: repo://src/components/game/GuideRichText.tsx
  - id: openwiki-source-92d3a40706dee422b9828270
    resource: repo://src/components/game/IconWell.tsx
  - id: openwiki-source-2c139f34b50dd107e988159d
    resource: repo://src/components/game/PageEnhancements.tsx
  - id: openwiki-source-231761ea7db75e92c98c9a96
    resource: repo://src/components/game/QuestHeader.tsx
  - id: openwiki-source-2af618ad6444b669e5dc63fd
    resource: repo://src/components/game/QuestSteps.tsx
  - id: openwiki-source-fa5e19158960e876b0c64eba
    resource: repo://src/components/game/strings.ts
  - id: openwiki-source-b7873b6b1a7bfb135bc0f569
    resource: repo://src/components/game/VideoFacade.tsx
  - id: openwiki-source-05c9a42e142e8a8796dbb308
    resource: repo://src/components/ui/Button.tsx
  - id: openwiki-source-ebd8e5116da4505aad0851bd
    resource: repo://src/components/ui/Callout.tsx
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
  - id: openwiki-source-8728a958dd5a79ae9c3ca846
    resource: repo://src/styles/theme.css
  - id: openwiki-source-6da1dc6084491f36a7252e5d
    resource: repo://tests/unit/coordinates.test.ts
  - id: openwiki-source-606ffdd80bc08b7948b6125a
    resource: repo://tests/unit/display-format.test.ts
  - id: openwiki-source-82f08a433a1f3b4a0e0ee9bb
    resource: repo://tests/unit/emblem.test.tsx
  - id: openwiki-source-0dce08d52a9be6f19ead446b
    resource: repo://tests/unit/game-components.test.tsx
  - id: openwiki-source-40683541093829b688fc32ef
    resource: repo://tests/unit/guide-body.test.tsx
  - id: openwiki-source-ec6f86966a8f8c08cdb73603
    resource: repo://tests/unit/ui-components.test.tsx
  - id: openwiki-source-b58f839a189d87a7e1f37d39
    resource: repo://vitest.config.mts
generated: { by: "claude-code", at: "2026-11-06T15:25:11.354Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-06T15:25:11.354Z
---

# Design system components

The components specified in `DESIGN.md` (Components, Quest guide components) live in two folders:

- `src/components/ui/`: generic parts any page can use (button, icon button, chip, tag pill, callout, stat tile, progress bar, checkbox, card, picture, figure).
- `src/components/game/`: the quest guide parts (quest header with the quest giver, icon wells and the fixed game icons, item chip and slot, monster chip and fight block, coordinates chip, steps and the "Pasos" side list, Torre's tips, achievement chain, video facade, and `GuideBody`/`GuideRichText`, which render a guide's blocks) plus `PageEnhancements`, the one client island.
- `src/components/brand/`: the Torrente Arcano emblem.

All of them except `PageEnhancements` are server components with no state. The [public quest guide page](guide-page.md) renders the game components with a real guide; the [component catalog at `/sistema`](component-catalog.md) shows every component and state side by side.

## Styling conventions

- **Utilities first.** Most styling is Tailwind utility classes on the design tokens from `src/styles/theme.css` (`bg-raised`, `text-ink-2`, `rounded-pill`, `duration-(--duration-fast)`). See [Styles, tokens and site shell](styles-and-shell.md).
- **Hand-written CSS for what utilities express badly.** `ui.css` holds the callout box, the checkbox, the progress bar, the hit-target rule and the fullscreen viewer. `game.css` holds the guide page grid, the quest header with the NPC and its three columns, the icon wells, the coordinates chip, the steps and the "Pasos" side list, Torre's speech bubble, the achievement chain arrows, the video facade and the "Copiado" toast. Each component imports the stylesheet it needs. Both files use only tokens, and animate only `transform`, `opacity` and colors, so the global reduced-motion rule in `globals.css` turns all motion off.
- **Mode-dependent values come from variables.** `game.css` reads values that change with the mode, such as the icon well colors, from variables `theme.css` sets on `[data-mode]` instead of from an ancestor selector, so a light section inside a dark page gets the light values.
- **`cx()`** (`ui/cx.ts`) joins class names and drops empty ones.
- **Text lives in string modules.** `ui/strings.ts` (`uiStrings`) and `game/strings.ts` (`gameStrings`) hold every Spanish label, so a second language would translate those modules.
- **Images are already converted.** `ImageAsset` (`ui/types.ts`) is a WebP `src`, an optional `avif`, the file's `width` and `height`, and optional `srcSet`/`avifSrcSet` lists of narrower widths. The app never optimizes images on request; `IMAGE_SIZES` (`ui/image-sizes.ts`) holds the `sizes` value for each slot, such as `prose`, the step column (852 px from 72rem next to the side list, the viewport minus margins and the step number below).

### Hit targets

Controls drawn smaller than 40px carry the `hit-target` class together with Tailwind's `relative`. In `ui.css`, `.hit-target::after` is a transparent box, centered vertically, `max(100%, 40px)` tall, and `max(100%, 44px)` under `pointer: coarse`. It enlarges the area that receives clicks and taps without changing the drawing or the line height. `Button`, `ButtonLink`, the linked `TagPill` and `Checkbox` use it; a `TagPill` without a link does not. The coordinates chip (drawn 32px high) has its own `::after` rule in `game.css` for the same purpose.

## Generic components (`src/components/ui/`)

| Component | What it renders |
|---|---|
| `Button`, `ButtonLink`, `buttonClass()` | A pill `<button type="button">` or `<a>` with `data-variant`. Primary is an `--color-accent` outline, 44px high (40px with `compact`), filled with `--color-raised` on hover; labels are semibold sentence case; secondary is a raised fill; ghost has no fill. No color is ever used as a button fill. Pressed scales to 0.96; disabled drops to 40 percent opacity |
| `IconButton` | A round button with only an icon; its `label` prop becomes the required accessible name |
| `Chip` | A 26px raised pill for short data, optionally with an icon |
| `TagPill` | An `--color-accent-2` outlined tag; with `href` it is a link and a hit target |
| `Callout` | A box with a border in its variant's color (`tip`, `warning`, `stop`) and a plain heading inside it (`h3` by default, set by `headingLevel`) that labels the `role="note"` aside. The default title comes from `uiStrings.callout` ("Consejo", "¡Importante!", "¡Alto!") and a `title` prop can replace it. No ribbon or glyph |
| `StatTile` | A large figure with its label, using `formatAmount` so the number never wraps |
| `ProgressBar` | A server-rendered `role="progressbar"` bar with its percentage; the value is clamped to 0–100 percent and the fill moves with `transform`, never `width` |
| `Checkbox` | A native checkbox inside its label |
| `Card` | A surface panel; with `href` the whole card is one link (never a link inside another) and the border takes the section color on hover |
| `Picture` | A `<picture>` with an AVIF `<source>` when present and a WebP `<img>` with explicit `width` and `height`. With narrower widths it writes `srcset` and `sizes` in both formats. It is lazy by default; `priority` drops lazy loading and sets `fetchPriority="high"` |
| `Figure` | A guide screenshot with an optional caption, sized with `IMAGE_SIZES.prose`. The image is wrapped in a link to the widest WebP file (`data-image-viewer`, `data-image-avif`, a `zoom-in` cursor) named "Ver imagen a pantalla completa: {alt}". `priority` marks the screenshot that may be the LCP |

## Quest guide components (`src/components/game/`)

| Component | What it renders |
|---|---|
| `QuestHeader` | The guide's header (DESIGN.md, Quest header): the title as the page's `h1` (or `h2` in the catalog), a subtitle such as "Misión de Astrub - Nivel 20 - Misión 2 del logro …" with a link to the achievement and its trophy icon, the quest giver, and up to three columns: "Prerrequisitos", "Necesitarás" and "Recompensas". Each line has an icon well (a quest icon for a prerequisite quest, the item's icon, the combat icon for a fight note, XP and kamas). XP shows as a range ("9 800 a 16 380 XP") when the minimum is known. What is missing is not rendered: no column without data, no giver column without a render |
| Quest giver (inside `QuestHeader`) | The NPC render in a `<picture>`: facing left below 36rem, where it sits right of the title, and facing right above, next to the title. The image is decorative; the NPC's name is text below it, with the start coordinates chip |
| `IconWell`, `GAME_ICONS` | A dark square slot for a game icon, like an inventory cell, dark in light mode too so the full-color icon reads (DESIGN.md, Icon wells). `GAME_ICONS` (`game-icons.ts`) lists the five fixed icons (combat, kamas, quest, XP, achievement), original game files converted to lossless WebP under `public/img/game/`, with each file's size; icons are drawn at 32px or their file size if smaller, never enlarged. Without an icon the well stays empty, never a substitute |
| `ItemChip`, `ItemSlot` | An item on one line (24px icon, name, quantity), or an inventory slot (48px icon in a 72px slot, the quantity in the corner, read as "1 × Pico de tofu"). Without an icon the slot stays empty |
| `MonsterChip`, `FightBlock` | A monster with art, "N × Name" and an optional level; the fight block is a list of them |
| `CoordinatesChip`, `CoordinatesText`, `TravelButton` | A pin icon and `[x,y]` as the game writes it, carrying `data-copy="/travel x,y"`. `CoordinatesText` turns every `[x,y]` in a prose string into a chip. `TravelButton` is the compact primary button that copies the start position |
| `QuestSteps` | The numbered steps (DESIGN.md, Steps): an `<ol>` of `li[data-step]` with the step's anchor as `id`, a number in its well that sticks to the top while scrolling, and the step's content. No titles and no checkboxes; a visually hidden "Pasos" heading labels the section. A step whose text does not name its coordinates starts with a coordinates chip |
| `StepTracker` | The "Pasos" side list beside the guide from 1152px (DESIGN.md, Steps side list): a `nav` with one link per step to its anchor, with its number, label and `x,y`. Without JavaScript it is a list of links; `PageEnhancements` marks the step being read. With no entries it renders nothing |
| `TorreTips` | Torre's recommendations (DESIGN.md, Torre's tips): his decorative avatar and a speech bubble with the heading "Recomendaciones de Torre". A `tip` callout in a guide renders as this |
| `GuideBody`, `GuideSteps`, `GuideBlocks` | Render a guide's blocks on the server: rich text, `Figure`, `VideoFacade`, a `Callout` for warnings and `TorreTips` for tips. `GuideBody` wraps the introduction or closing; `GuideSteps` feeds `QuestSteps` with one anchor, pin and block list per step. Headings inside a step start at `h3`, inside a callout at `h4` |
| `GuideRichText` | A Lexical state rendered with Payload's `RichText` and custom converters: every `[x,y]` in text becomes a coordinates chip except inside a link or code, links keep only `http`, `https`, `mailto` and same-site URLs (`safeHref`), an internal link to a guide points at `/<slug>`, new-tab links get `noopener noreferrer`, headings are clamped to at least the given level so the guide title stays the only `h1`, an uploaded image renders as a `Figure` (only the first one gets priority when asked) and unknown nodes render nothing |
| `AchievementChain` | The achievement's quests on one line: the current quest as text with `aria-current="page"`, the others as links. Arrows are CSS, so a screen reader hears a numbered list. Chains longer than five are trimmed by `chainWindow` |
| `VideoFacade` | See below |

## Brand (`src/components/brand/`)

`Emblem` draws the Torrente Arcano emblem as an inline SVG (DESIGN.md, Brand): the hat in `--color-accent`, the glyph in `--color-bg` and the face in `--color-ink`, so it follows the theme and mode it sits in. It is decorative (`aria-hidden`, not focusable) and reserves its size with `width` and `height`. The `simple` variant, for 16px, keeps only the hat and the grin. The drawing lives in `emblem-art.ts`, shared with `scripts/build-icons.ts`, which builds the favicon and the iOS icon (see [Styles, tokens and site shell](styles-and-shell.md#site-shell)).

### Video facade

`VideoFacade` loads no third-party code until the reader clicks. It resolves the stored URL with `youtubeId`. For a YouTube video it renders a link to `youtube.com/watch?v=…` carrying `data-video-embed` (the `youtube-nocookie.com/embed/…?autoplay=1` URL) and `data-video-title`, named "Ver el vídeo: {title}", over our own poster image or, without one, the title. The caption reads "{title} · YouTube, Torrente Arcano". If stored data holds a non-YouTube URL, it renders a plain link with the title instead of failing; the panel's video block accepts only YouTube links (see [Guide body blocks](../cms/blocks.md)).

## The client island: `PageEnhancements`

`PageEnhancements` (`"use client"`) is the only client code these components need. A page renders it once. It listens with event delegation on `document`, so it needs no props and works for any number of chips, videos, figures and steps. Without it every feature still works in a plainer form: a chip is selectable text, a video is a link to YouTube, a figure is a link to its image file, the "Pasos" list is a list of links.

On mount it turns every `[data-copy]` element into a button (`role="button"`, `tabIndex=0`, and `aria-label` from `data-copy-label`, which starts with the visible text: "[1,-17], copiar /travel 1,-17"). Then it handles:

- **Copy.** A click on a `[data-copy]` element, or Enter or Space on one, writes its value to the clipboard and shows "Copiado: /travel x,y" in a `role="status"` toast for 4 seconds. If the clipboard write fails, the toast says "Escribe /travel x,y en el chat" instead.
- **Video.** A click without a modifier key on `a[data-video-embed]` creates an iframe with that `src`, the video title, `allow="autoplay; encrypted-media; picture-in-picture"` and fullscreen allowed, hides the link (React owns the node, so it is hidden rather than removed), inserts the iframe after it and focuses it.
- **Fullscreen image.** A click without a modifier key on `a[data-image-viewer]` reads the link's WebP URL, the AVIF URL, the image's alt and size, the figure's caption, and the `data-theme` and `data-mode` of the nearest themed ancestor. It then opens a native `<dialog>` with `showModal()`, which makes the page inert. The dialog is named "Imagen a pantalla completa", copies that theme and mode so the viewer matches the image's section, and shows a "Cerrar" icon button, the image as a `<picture>` and the caption. Esc (native), the button, or a click on the dialog itself (outside the image, caption and button) closes it, and focus returns to the link that opened it.

- **Current step.** An `IntersectionObserver` watches every `[data-step]` with a `rootMargin` from `stepBandMargin(innerHeight)`, which leaves only the band between 30 and 40 percent of the viewport height. The step crossing that band gets `data-current`, and its side list link gets `aria-current="step"`. Until the reader reaches the steps, the first one is current. The margin is in pixels (`rootMargin` percentages are measured against the viewport width), so the observer is rebuilt when the window height changes.

With any modifier key held (Ctrl, Cmd, Shift, Alt), video and figure links behave as normal links. AGENTS.md allows exactly this one island on guide pages, inside the 150 KB JavaScript budget (see [Performance budgets](../testing/performance-budgets.md)).

## Helpers in `src/lib/guides/`

These are pure functions with no React or Payload dependency:

- **`coordinates.ts`**: `formatCoordinates` writes `[x,y]`; `travelCommand` writes `/travel x,y`, which starts the in-game autopilot from the chat; `parseCoordinates` reads a text that is only `[x,y]` (optional sign and spaces, at most three digits per number) or returns `null`; `splitCoordinates` splits prose into text and coordinates in order, leaving anything that does not match as text.
- **`display.ts`**: `formatThousands` separates thousands with a plain space (`24 316`); `formatAmount` uses a no-break space so a figure never splits across lines; `chainWindow` keeps a chain of five or fewer whole and otherwise keeps the first, previous, current, next and last quests, with `null` marking each gap; `stepBandMargin` gives the side list's observer margin. The module has no dependencies so the island can import it through `gameStrings` without pulling in the summary code.
- **`video.ts`**: `youtubeId` returns the 11-character video ID from `watch?v=`, `youtu.be/`, `/embed/` and `/shorts/` links on the YouTube and `youtube-nocookie.com` hosts, or `null`; `youtubeEmbedUrl` builds the `youtube-nocookie.com` embed URL with `autoplay=1`; `youtubeWatchUrl` builds the watch URL.

## Tests

- `tests/unit/ui-components.test.tsx` and `tests/unit/game-components.test.tsx` render each component with `renderToStaticMarkup` and check the markup: button types and variants, accessible names, `Picture` sources, lazy loading and priority, the `Figure` link and its name without alt, which controls are hit targets, the coordinates chip's pin, the quest header (title, subtitle parts, the giver's two renders and text name, the three columns with icons and the XP range, nothing rendered without data), icon wells, steps and the side list, Torre's tips, the chain's current quest and trimming, the video facade with no iframe and its non-YouTube fallback, and the island's closed, named dialog and status region. `vitest.config.mts` includes `.test.tsx` files for these.
- `tests/unit/guide-body.test.tsx` covers `GuideRichText` (chips in prose but not in links or code, unsafe links as text, `noopener` on new tabs, heading clamping, priority for the first image only, unknown nodes) and `GuideBody`/`GuideSteps` (block order, step anchors, pins only when the text does not name the coordinates, warning and tip rendering).
- `tests/unit/emblem.test.tsx` covers `Emblem` (decorative, sized, theme colors, the simple variant) and the standalone SVG and favicon built from it.
- `tests/unit/coordinates.test.ts`, `tests/unit/display-format.test.ts` and `tests/unit/video-url.test.ts` cover the helpers.
- `tests/e2e/sistema.spec.ts` checks the behavior in a browser, including axe WCAG 2.2 AA. See [Component catalog](component-catalog.md).

## Related pages

- [Component catalog (/sistema)](component-catalog.md)
- [Styles, tokens and site shell](styles-and-shell.md)
- [Theme and mode](theme-and-mode.md)
- [Public quest guide page](guide-page.md)
- [Guide body blocks](../cms/blocks.md)
- [Performance budgets](../testing/performance-budgets.md)
