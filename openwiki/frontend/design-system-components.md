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
  - id: openwiki-source-50ca1ca5ab53b47fd9c6cb08
    resource: repo://src/components/game/FightBlock.tsx
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
  - id: openwiki-source-6cff2d4708de0764643bcffe
    resource: repo://src/components/game/Item.tsx
  - id: openwiki-source-7210dc2eb7a672fb3927dcaa
    resource: repo://src/components/game/NextQuestCard.tsx
  - id: openwiki-source-2c139f34b50dd107e988159d
    resource: repo://src/components/game/PageEnhancements.tsx
  - id: openwiki-source-0fefd458c48e12ce07e2db27
    resource: repo://src/components/game/QuestFacts.tsx
  - id: openwiki-source-231761ea7db75e92c98c9a96
    resource: repo://src/components/game/QuestHeader.tsx
  - id: openwiki-source-2af618ad6444b669e5dc63fd
    resource: repo://src/components/game/QuestSteps.tsx
  - id: openwiki-source-fa5e19158960e876b0c64eba
    resource: repo://src/components/game/strings.ts
  - id: openwiki-source-b7873b6b1a7bfb135bc0f569
    resource: repo://src/components/game/VideoFacade.tsx
  - id: openwiki-source-331597871b0120059a553705
    resource: repo://src/components/ui/Amount.tsx
  - id: openwiki-source-05c9a42e142e8a8796dbb308
    resource: repo://src/components/ui/Button.tsx
  - id: openwiki-source-ebd8e5116da4505aad0851bd
    resource: repo://src/components/ui/Callout.tsx
  - id: openwiki-source-8463c54295dc5c710d9c0338
    resource: repo://src/components/ui/Figure.tsx
  - id: openwiki-source-f73e21dac630e0cc973bed2f
    resource: repo://src/components/ui/icon-size.ts
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
  - id: openwiki-source-6afa3e8bb087a9d88b87786d
    resource: repo://tests/unit/amount.test.tsx
  - id: openwiki-source-6da1dc6084491f36a7252e5d
    resource: repo://tests/unit/coordinates.test.ts
  - id: openwiki-source-3406b948c35715146f1380ae
    resource: repo://tests/unit/css-units.test.ts
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
generated: { by: "claude-code", at: "2026-11-14T11:00:46.827Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-14T11:00:46.827Z
---

# Design system components

The components specified in `DESIGN.md` (Components, Quest guide components) live in two folders:

- `src/components/ui/`: generic parts any page can use (button, icon button, chip, tag pill, callout, stat tile, progress bar, checkbox, card, picture, figure, amount).
- `src/components/game/`: the quest guide parts (quest header with the quest giver, the three fact columns with the rewards bag, icon wells and the fixed game icons, item chip and slot, fight block, coordinates chip, steps, next quest card, Torre's tips, achievement chain, video facade, and `GuideBody`/`GuideRichText`, which render a guide's blocks) plus `PageEnhancements`, the one client island.
- `src/components/brand/`: the Torrente Arcano emblem and the Sello lockup.

The achievement page parts live in `src/components/achievement/` (see [Achievement page](../achievements/achievement-page.md)) and the site header and footer in `src/components/site/` (see [Site header, footer and search](site-shell-and-search.md)). The achievement page reuses `QuestFacts` and `PageEnhancements` from here.

All of them except `PageEnhancements` are server components with no state. The [public quest guide page](guide-page.md) renders the game components with a real guide; the [component catalog at `/sistema`](component-catalog.md) shows every component and state side by side.

## Styling conventions

- **Utilities first.** Most styling is Tailwind utility classes on the design tokens from `src/styles/theme.css` (`bg-raised`, `text-ink-2`, `rounded-pill`, `duration-(--duration-fast)`). See [Styles, tokens and site shell](styles-and-shell.md).
- **Hand-written CSS for what utilities express badly.** `ui.css` holds the callout box, the checkbox, the progress bar, the hit-target rule and the fullscreen viewer. `game.css` holds the single reading column of the guide page, the quest header with the NPC and its three columns, the rewards bag, the icon wells, the coordinates chip, the fight block, the steps, the next quest card, Torre's speech bubble, the achievement chain arrows, the video facade and the "Copiado" toast. Each component imports the stylesheet it needs. Both files use only tokens, and animate only `transform`, `opacity` and colors, so the global reduced-motion rule in `globals.css` turns all motion off.
- **Mode-dependent values come from variables.** `game.css` reads values that change with the mode, such as the icon well colors, from variables `theme.css` sets on `[data-mode]` instead of from an ancestor selector, so a light section inside a dark page gets the light values.
- **Sizes in rem.** Code writes sizes in rem (px ÷ 16), so raising the root font, 110 % from 64rem in `globals.css`, scales the whole interface; that covers hand-written CSS and Tailwind values (`size-10.5`, not `size-[42px]`). Only hairlines under 3px stay in px. `tests/unit/css-units.test.ts` fails on any other px value.
- **Inline styles only pass data.** A `style={…}` only sets custom properties that carry data into the CSS, such as an icon's size in `--icon`, the emblem's size in `--emblem` or the viewer image's `--w` and `--h`. `css-units.test.ts` fails on a `style` with any other key.
- **`cx()`** (`ui/cx.ts`) joins class names and drops empty ones.
- **Text lives in string modules.** `ui/strings.ts` (`uiStrings`) and `game/strings.ts` (`gameStrings`) hold every Spanish label, so a second language would translate those modules.
- **Images are already converted.** `ImageAsset` (`ui/types.ts`) is a WebP `src`, an optional `avif`, the file's `width` and `height`, and optional `srcSet`/`avifSrcSet` lists of narrower widths. The app never optimizes images on request; `IMAGE_SIZES` (`ui/image-sizes.ts`) holds the `sizes` value for each slot, such as `prose`, the reading column (880 px from 58rem, the viewport minus its margins below), and `card`, the next quest card's art (280 px from 40rem).

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
| `Figure` | A guide screenshot with an optional caption, sized with `IMAGE_SIZES.prose` by default or a narrower `sizes` when it sits in a step's two-column grid. The image is wrapped in a link to the uploaded original (`image.original`, falling back to the widest WebP) with `data-image-viewer`, the original's `data-image-width` and `data-image-height` and a `zoom-in` cursor, named "Ver imagen a pantalla completa: {alt}". `priority` marks the screenshot that may be the LCP |
| `Amount` | A figure with its thousands separated by a narrow no-break space (U+202F): "1 272", never "1.272" and never split across lines (DESIGN.md, Typography: Numbers). Montserrat and Lilita One lack that character, so each separator sits in its own `span.amount__th`. Its styles are in `globals.css`, because the site header uses it on every page and `ui.css` would be one more render-blocking stylesheet |

## Quest guide components (`src/components/game/`)

| Component | What it renders |
|---|---|
| `QuestHeader` | The guide's header (DESIGN.md, Quest header): the title as the page's `h1` (or `h2` in the catalog), a subtitle such as "Misión de Astrub - Nivel 20 - Misión 2 de 3" (the achievement itself is in the breadcrumb, not linked here), a start line «Empieza con **{NPC}** [x,y]» with the quest giver's name and start coordinates chip, the giver's render, and the three `QuestFacts` parts. What is missing is not rendered: no subtitle part without data, no giver column without a render |
| `QuestFacts` | The three parts, shared by the guide header and the achievement header, in one `.facts` band inside `.qhead__facts`, an inline-size container: under 34rem of band width they stack; from 34rem Prerrequisitos and Necesitarás sit side by side (`1fr` and `1.6fr`) with Recompensas below. The parts are: "Prerrequisitos", "Necesitarás" and "Recompensas" (the achievement header shows only "Prerrequisitos" and "Recompensas del logro"; its «Necesitarás en total» is a separate zone, see [Achievement page](../achievements/achievement-page.md)). "Necesitarás" is two lists: the items (`needs__items`), in columns of at least 15rem (three in the 880px column, one on a phone), each name a `CopyName`; then the notes (`needs__notes`), in the same columns but tighter, with a small combat icon. Each list is rendered only when it has rows; notes and the bag copy nothing. The Dofus guides' Necesitarás uses the same two lists. Each line has an icon well (a quest icon for a prerequisite quest, the item's icon, the combat icon for a fight note, XP and kamas). XP shows as a range ("9 800 a 16 380 XP") when the minimum is known. Reward items go in the rewards bag: a disclosure button with the game's bag icon and "4 objetos" ("1 objeto") that opens their list. Without JavaScript the list shows below the button; with it (`data-js` on `<html>`) it starts closed and `PageEnhancements` opens and closes it. A column without rows is not rendered |
| Quest giver (inside `QuestHeader`) | The NPC render in a `<picture>`: facing left below 36rem, where it sits right of the title, and facing right above, next to the title. The image is decorative and stands alone; the NPC's name and the start coordinates chip are text in the header's start line |
| `IconWell`, `GAME_ICONS` | A 44px slot for a game icon, like an inventory cell, with the mode's background, so it is light in light mode (DESIGN.md, Icon wells). `GAME_ICONS` (`game-icons.ts`) lists the seven fixed icons (combat, kamas, quest, XP, achievement, bag, and the dungeon boss used for dungeons), original game files converted to lossless WebP under `public/img/game/`, with each file's size; `OBJECTIVE_ICONS` maps each quest objective kind of the checklists (NPC, bring, map, craft, free, fight) to its 64px icon; icons are drawn at 34px or their file size if smaller (the XP arrow and the bag are 24px, the trophy 28px), never enlarged. The size reaches the CSS in rem through `--icon` (`src/components/ui/icon-size.ts`), so icons grow with the root font, 110 % from 64rem, without passing a file's own size. An item image goes in the same well. Without an icon the well stays empty, never a substitute |
| `ItemChip`, `ItemSlot` | An item on one line (24px icon, name, quantity), or an inventory slot (48px icon in a 72px slot, the quantity in the corner, read as "1 × Pico de tofu"). Without an icon the slot stays empty. The name is a `CopyName` and the chip or slot is its `copyhost`, so clicking the icon copies too |
| `CopyName` | An item name that copies itself, without the quantity, to paste in the game's search (DESIGN.md, Item chip and item slot, Copy). It carries `data-copy` with the name, the label "Copiar {name}" and its own failure message ("No se pudo copiar. Busca «{name}» en el juego."). Its `::after` covers the enclosing `copyhost`. At rest it looks like plain text; the copy icon and the check appear only on hover or focus, and the chip variant never shows the icon. Without JavaScript it is text |
| `FightBlock` | A fight in the guide (DESIGN.md, Monster chip and fight block): one row per monster, its image in a 52px well (drawn at 42px, never enlarged) and "1 × Name". Without an imported image the well stays empty |
| `CoordinatesChip`, `CoordinatesText`, `TravelButton` | A pin icon and `[x,y]` as the game writes it, carrying `data-copy="/travel x,y"`. `CoordinatesText` turns every `[x,y]` in a prose string into a chip. `TravelButton` is the compact primary button that copies the start position |
| `QuestSteps` | The steps (DESIGN.md, Steps), one after another in the reading column, separated by a line: an `<ol>` of `li[data-step]` with the step's anchor as `id` and its content. No numbers, titles or checkboxes; the list is an `<ol>`, so a screen reader says the number, and a visually hidden "Pasos" heading labels the section. A step whose text does not name its coordinates starts with a coordinates chip; a first step with no text at the start coordinates gets a start sentence with the NPC's name and the chip (`startNpc`) |
| `NextQuestCard` | The next quest of the achievement, at the end of the guide (DESIGN.md, Next quest card): the whole card is one link to its guide, with its first screenshot as art, "Siguiente misión", the title, and its level and giver with coordinates. What is missing is not rendered |
| `TorreTips` | Torre's recommendations (DESIGN.md, Torre's tips): his decorative avatar and a speech bubble with the heading "Recomendaciones de Torre". A `tip` callout in a guide renders as this |
| `GuideBody`, `GuideSteps`, `GuideBlocks` | Render a guide's blocks on the server: rich text, `Figure`, `VideoFacade`, `FightBlock`, a `Callout` for warnings and `TorreTips` for tips. `GuideBody` wraps the introduction or closing; `GuideSteps` feeds `QuestSteps` with one anchor, pin and block list per step. Consecutive screenshots of a step go together in a `.figs` grid, two per row from 40rem (a single one too), each with the narrower `sizes`. Headings inside a step start at `h3`, inside a callout at `h4` |
| `GuideRichText` | A Lexical state rendered with Payload's `RichText` and custom converters: every `[x,y]` in text becomes a coordinates chip except inside a link or code, links keep only `http`, `https`, `mailto` and same-site URLs (`safeHref`), a link to the old Squarespace site that ends in an empty `#` (an imported coordinate that pointed at the guide itself) is dropped so its text is plain prose again and its `[x,y]` becomes a chip, an internal link to a guide points at `/<slug>`, new-tab links get `noopener noreferrer`, headings are clamped to at least the given level so the guide title stays the only `h1`, an uploaded image renders as a `Figure` (only the first one gets priority when asked), a video block inside the text (`proseVideo`) renders as a `VideoFacade` with its optional poster, and unknown nodes render nothing |
| `AchievementChain` | The achievement's quests on one line: the current quest as text with `aria-current="page"`, the others as links. Arrows are CSS, so a screen reader hears a numbered list. Chains longer than five are trimmed by `chainWindow` |
| `VideoFacade` | See below |

## Brand (`src/components/brand/`)

`Lockup` (`lockup.css`) is the Sello lockup: the emblem with the wordmark, in a header size and a footer size (in rem), used by the site header and footer.

`Emblem` draws the Torrente Arcano emblem as an inline SVG (DESIGN.md, Brand): the hat in `--color-accent`, the glyph in `--color-bg` and the face in `--color-ink`, so it follows the theme and mode it sits in. It is decorative (`aria-hidden`, not focusable) and reserves its size with `width` and `height`; the CSS draws it at that size in rem (`--emblem`), so it grows with the root font. The `simple` variant, for 16px, keeps only the hat and the grin. The drawing lives in `emblem-art.ts`, shared with `scripts/build-icons.ts`, which builds the favicon and the iOS icon (see [Styles, tokens and site shell](styles-and-shell.md#site-shell)).

### Video facade

`VideoFacade` loads no third-party code until the reader clicks. It resolves the stored URL with `youtubeId`. For a YouTube video it renders a link to `youtube.com/watch?v=…` carrying `data-video-embed` (the `youtube-nocookie.com/embed/…?autoplay=1` URL) and `data-video-title`, named "Ver el vídeo: {title}", over our own poster image or, without one, the title. The caption reads "{title} · YouTube, Torrente Arcano". If stored data holds a non-YouTube URL, it renders a plain link with the title instead of failing; the panel's video block accepts only YouTube links (see [Guide body blocks](../cms/blocks.md)).

## The client island: `PageEnhancements`

`PageEnhancements` (`"use client"`) is the only client code these components need. A page renders it once. It listens with event delegation on `document`, so it needs no props and works for any number of chips, videos, figures and bags. Without it every feature still works in a plainer form: a chip is selectable text, a video is a link to YouTube, a figure is a link to its image file, the rewards bag's list shows open.

On mount it turns every `[data-copy]` element into a button (`role="button"`, `tabIndex=0`, and `aria-label` from `data-copy-label`, which starts with the visible text: "[1,-17], copiar /travel 1,-17"). Then it handles:

- **Copy.** A click on a `[data-copy]` element, or Enter or Space on one, writes its value to the clipboard and shows "Copiado: {value}" in a `role="status"` toast for 4 seconds. The element gets `data-copied` for 1.6 seconds, which turns an item's copy icon into a check. If the clipboard write fails, the toast shows the element's `data-copy-failed` message when it has one (items) or "Escribe /travel x,y en el chat" (coordinates).
- **Video.** A click without a modifier key on `a[data-video-embed]` creates an iframe with that `src`, the video title, `allow="autoplay; encrypted-media; picture-in-picture"` and fullscreen allowed, makes the link `inert` (React owns the node, so it is not removed, and it stays under the player as its poster while the iframe fades in, out of the tab order and the accessibility tree), inserts the iframe after it and focuses it.
- **Fullscreen image.** A click without a modifier key on `a[data-image-viewer]` reads the link's URL (the uploaded original), the original's width and height (falling back to the thumbnail's, which has the same proportion), the image's alt, the figure's caption, and the `data-theme` and `data-mode` of the nearest themed ancestor. It then opens a native `<dialog>` with `showModal()`, which makes the page inert. The dialog is named "Imagen a pantalla completa", copies that theme and mode so the viewer matches the image's section, and shows a "Cerrar" icon button, the original image and the caption. The image's size passes to `ui.css` as `--w` and `--h`, which fit it to the screen and enlarge it up to twice its size. Esc (native), the button, or a click on the dialog itself (outside the image, caption and button) closes it, and focus returns to the link that opened it. The image stays inside the closed dialog so its exit animation is visible (DESIGN.md, Motion).

- **Rewards bag.** The bag's button is a disclosure: its state lives in its `aria-expanded`, and `game.css` shows the list from it when `data-js` is set. A click on the button toggles it; a click outside an open bag, focus leaving it, or Esc closes it. Esc also returns focus to the button when focus was inside. When it opens, the list starts at the bag's left edge and shifts left by whatever would overflow the window with a 16px margin (`--bag-shift`), so it never causes horizontal scroll; a window resize or rotation repositions any open bag.

With any modifier key held (Ctrl, Cmd, Shift, Alt), video and figure links behave as normal links. AGENTS.md allows exactly this one island on guide pages, inside the 150 KB JavaScript budget (see [Performance budgets](../testing/performance-budgets.md)).

## Helpers in `src/lib/guides/`

These are pure functions with no React or Payload dependency:

- **`coordinates.ts`**: `formatCoordinates` writes `[x,y]`; `travelCommand` writes `/travel x,y`, which starts the in-game autopilot from the chat; `parseCoordinates` reads a text that is only `[x,y]` (optional sign and spaces, at most three digits per number) or returns `null`; `splitCoordinates` splits prose into text and coordinates in order, leaving anything that does not match as text.
- **`display.ts`**: `formatThousands` separates thousands with a plain space (`24 316`), the form summaries are written in; `formatAmount` uses a narrow no-break space so a figure never splits across lines; `chainWindow` keeps a chain of five or fewer whole and otherwise keeps the first, previous, current, next and last quests, with `null` marking each gap. The module has no dependencies so the island can import it through `gameStrings` without pulling in the summary code.
- **`video.ts`**: `youtubeId` returns the 11-character video ID from `watch?v=`, `youtu.be/`, `/embed/` and `/shorts/` links on the YouTube and `youtube-nocookie.com` hosts, or `null`; `youtubeEmbedUrl` builds the `youtube-nocookie.com` embed URL with `autoplay=1`; `youtubeWatchUrl` builds the watch URL.

## Tests

- `tests/unit/ui-components.test.tsx` and `tests/unit/game-components.test.tsx` render each component with `renderToStaticMarkup` and check the markup: button types and variants, accessible names, `Picture` sources, lazy loading and priority, the `Figure` link and its name without alt, which controls are hit targets, the coordinates chip's pin, the fight block, the next quest card with and without art, the quest header (title, subtitle with "Misión 2 de 3" and no link, the giver's two renders, the start line with its name and chip, the `.facts` band, the three columns with icons and the XP range, the rewards bag and its singular, nothing rendered without data), item chips, slots and Necesitarás items that copy their name without the quantity while notes and the bag copy nothing, Necesitarás items before notes in separate lists, the bag icon and icon wells at 34px at most drawn in rem, steps without numbers, Torre's tips, the chain's current quest and trimming, the video facade with no iframe and its non-YouTube fallback, and the island's closed, named dialog and status region. `vitest.config.mts` includes `.test.tsx` files for these.
- `tests/unit/guide-body.test.tsx` covers `GuideRichText` (chips in prose but not in links or code, unsafe links as text, empty old-site `#` links as text with their chip, `noopener` on new tabs, heading clamping, priority for the first image only, unknown nodes) and inline videos as facades, and `GuideBody`/`GuideSteps` (block order, step anchors, pins only when the text does not name the coordinates, step 1's start sentence, screenshots paired in a grid, warning and tip rendering).
- `tests/unit/css-units.test.ts` scans the stylesheets and components for px values of 3 or more and for inline styles that set anything but custom properties.
- `tests/unit/emblem.test.tsx` covers `Emblem` (decorative, sized, drawn in rem, theme colors, the simple variant) and the standalone SVG and favicon built from it.
- `tests/unit/amount.test.tsx` covers `Amount`'s U+202F separator in its own span; `tests/unit/coordinates.test.ts`, `tests/unit/display-format.test.ts` and `tests/unit/video-url.test.ts` cover the helpers.
- `tests/e2e/sistema.spec.ts` checks the behavior in a browser, including axe WCAG 2.2 AA. See [Component catalog](component-catalog.md).

## Related pages

- [Component catalog (/sistema)](component-catalog.md)
- [Styles, tokens and site shell](styles-and-shell.md)
- [Theme and mode](theme-and-mode.md)
- [Public quest guide page](guide-page.md)
- [Guide body blocks](../cms/blocks.md)
- [Performance budgets](../testing/performance-budgets.md)
