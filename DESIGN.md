# Design language

The visual rules for the new torrentearcano.com. Structure, density and motion follow the study of duffus.fr in `docs/research/duffus-visual.md`. Color, art and the theme switch are our own. The tokens ship in `src/styles/theme.css`; when it and this file disagree, the CSS wins and this file gets fixed.

## Principles

1. **The game art carries the page.** Real Dofus art only: zone landscapes, NPC renders, monster images, class symbols, item, job and achievement icons. No emoji, stock illustration or hand-drawn generic icons. The interface stays quiet around the art.
2. **Reading first.** Most visits are a player with the game open beside the browser, following one quest. Body text stays at 1rem (16px, 17.6px from 1024px), steps are easy to scan, coordinates copy in one click.
3. **Dense, not cramped.** Lists of 50 quests and checklists of 100 steps must fit on a screen without feeling like a spreadsheet. Small gaps inside components, generous gaps between sections.
4. **Fast by default.** Guide pages are server-rendered with no client JavaScript beyond the shell and one small island that copies coordinates, loads videos on click and opens guide images fullscreen. Motion is CSS unless it lives inside a client island.
5. **One job per color.** `accent` marks progress, links, coordinates and eyebrows; `btn` fills the primary action; `accent-2` marks featured numbers and tags; the section accent marks details. Until 2026-11-16 no color filled a button; Torre's color design (option D) made the primary action a flat fill.
6. **Amakna, dark, by default.** Five themes, each with a dark and a light mode. Amakna, Torrente Arcano, Bonta and Brâkmar are free for everyone; Ocre is premium. Every text pair passes WCAG AA in every theme and mode.

## Tokens

Tokens are CSS custom properties declared in a Tailwind v4 `@theme` block in `src/styles/theme.css`. Why Tailwind v4 names:

- `@theme` emits every token as a plain CSS variable on `:root`, so the same names work as utilities (`bg-surface`, `text-ink-2`, `rounded-card`) and in hand-written CSS (`var(--color-surface)`). The checklist app we lift in phase 2a has 3 400 lines of plain CSS; it can switch to these variables without adopting utilities.
- The namespaces (`--color-*`, `--font-*`, `--text-*`, `--radius-*`, `--shadow-*`, `--ease-*`, `--breakpoint-*`, `--spacing`) are Tailwind's, so utilities are generated without config.
- Tokens Tailwind has no namespace for (z-index, durations, containers for content width) are plain variables with the same naming style: `--z-*`, `--duration-*`, `--width-*`.

**Units (decided 2026-11-12).** This file writes sizes in px at the 16px root because px are easier to read. The code writes them in rem, px ÷ 16 (24px is `1.5rem`, 13px is `0.8125rem`), so raising the root font size scales the whole interface. That covers hand-written CSS, Tailwind arbitrary values (`size-[42px]` becomes `size-10.5`, or `rounded-[0.875rem]` when no scale step matches), container query conditions and keyframe offsets. Hairlines under 3px stay in px so they stay sharp: 1px and 1.5px borders, 2px outlines and their offsets, 1px shadow offsets. An image or icon whose only size is its `width` and `height` attributes renders at that many px, so its CSS also sets the size in rem; the attributes stay, because they reserve the space before the file loads. `tests/unit/css-units.test.ts` fails on a px value of 3 or more in `src/**/*.css` or in a Tailwind arbitrary class. The `sizes` attribute of responsive images stays in px: it only picks which file to download.

**Root size (decided 2026-11-12, Torre's second review of the guide pages: "como si zoomearas un 10 %").** From 1024px (`@media (min-width: 64rem)` in `globals.css`) the root is `font-size: 110%`, so text and interface, header and footer included, render 10 percent bigger: a 16px value draws at 17.6px and the 880px reading column at 968px. Phones and tablets keep the 16px root. Media and container query conditions in rem still count 16px, so breakpoints do not move. A game icon drawn at its file size (the XP arrow, the bag, the trophy) is capped at that size in px (`iconSize` in `src/components/ui/icon-size.ts`), so it is never upscaled.

### Themes

Decided 2026-11-02; changed 2026-11-16 with Torre's color design (option D of the prototype `tmp/mockups/color/`, published at https://ta-prototipos.netlify.app/color/). Five themes named after Dofus places and the Dofus Ocre, each with a dark and a light mode:

| Theme | Access |
|---|---|
| Amakna | free, the default for everyone |
| Torrente Arcano (`arcano`), Bonta, Brâkmar | free |
| Ocre | premium, not offered in the theme picker yet |

The **theme** and the **mode** are two separate settings.

- **Theme** lives on `<html data-theme="amakna|arcano|bonta|brakmar|ocre">`. Anyone picks one of the four free themes in the header's theme picker (Components). It is stored like the mode: a `ta-theme` cookie (so the server can render it) mirrored in `localStorage`. With no cookie, or an unknown value, the page renders Amakna. Ocre renders only when the member's entitlement allows it; a cookie, `localStorage` or client value asking for it is ignored and the page renders Amakna.
- **Mode** lives on `<html data-mode="dark|light">` and is free for everyone. It is stored in a `ta-mode` cookie and mirrored in `localStorage`. Default `dark`.
- **Browser bar**: `<meta name="theme-color">` is the header's `--color-bar` in the theme and mode the server renders (`generateViewport` in the `(frontend)` layout, values in `src/lib/theme/theme-color.ts`, checked against `theme.css`), with `color-scheme` set to the mode. Without cookies that is Amakna dark, like the page. When the theme or the mode changes on the page, `ModeToggle` copies the new `--color-bar` into the meta, so the phone's bar and the header stay one color.
- A small inline `<head>` script sets both before first paint when the cookie is missing and `localStorage` has a valid value (for the theme, only a free one), and rewrites the cookie. The same script sets `data-js`, so CSS can tell when JavaScript runs (the rewards bag, Quest header).

Tokens are CSS custom properties under one selector per theme and mode. Semantic tokens point at them through `@theme inline`, so utilities and plain CSS read the same names:

```css
@theme inline {
  --color-bg: var(--t-bg);
  --color-surface: var(--t-surface);
  --color-accent: var(--t-accent);
  /* one line per semantic color */
}
[data-theme="amakna"][data-mode="dark"] { --t-bg: #14110e; --t-surface: #1f1a16; /* … */ }
[data-theme="amakna"][data-mode="light"] { --t-bg: #f5f0e6; --t-surface: #fffdf8; /* … */ }
/* the same two blocks for arcano, bonta, brakmar, ocre */
```

The Amakna dark block is also the fallback on `:root`, so a page with a missing or unknown attribute still renders correctly.

### Color

Contrast ratios are WCAG 2.x. AA needs 4.5:1 for body text, 3:1 for large text (24px, or 18.66px bold) and for UI parts such as control borders, progress fills and check marks. All ten palettes below were checked as given and pass; no hex needed adjusting. `tests/unit/theme-css.test.ts` checks every text pair in the tables at 4.5:1 and the check mark at 3:1.

Roles:

| Token | Role |
|---|---|
| `--color-bg` | page background, under the art |
| `--color-surface` | cards, step cards, panels |
| `--color-raised` | hover fill, inputs, segmented track |
| `--color-line` | hairlines between rows (decorative, no ratio needed) |
| `--color-ink` | titles, body |
| `--color-ink-2` | lead text, secondary body |
| `--color-muted` | meta, counts, micro labels; also checkbox and input borders (at least 4.87:1 everywhere, well over 3:1) |
| `--color-accent` | progress fills, links and coordinates, the checked checkbox (with a check mark in `--color-bg`), the eyebrow, the theme switch knob, the current nav item, the active tab, focus rings on accent controls |
| `--color-accent-2` | Lilita One featured numbers, tag pills (outline) |
| `--color-btn`, `--color-btn-hi` | the fill of the primary button and its hover fill (option D): the home «Buscar», the header panels' «Ver todo», the Dofus index filter's indicator, the checklist's «Siguiente» and «Completar» |
| `--color-btn-ink` | text and icons on `btn` and `btn-hi` |
| `--color-chip`, `--color-chip-hi` | the fill of pills such as the header search, and its hover fill; text on them is `ink` |
| `--color-bar` | the header and footer bar, and the theme picker's swatch behind the hat |

Focus rings use `--color-ink` (at least 13:1 on bg in every mode) unless the control itself is accent-colored.

#### Amakna (`amakna`, free, the default for everyone)

| Token | Dark | Light |
|---|---|---|
| `--color-bg` | `#14110e` | `#f5f0e6` |
| `--color-surface` | `#1f1a16` | `#fffdf8` |
| `--color-raised` | `#2a241f` | `#ebe3d5` |
| `--color-line` | `#3a332c` | `#d5c9b5` |
| `--color-ink` | `#f6f2ea` | `#1d1813` |
| `--color-ink-2` | `#d6cdc0` | `#43392f` |
| `--color-muted` | `#ab9f90` | `#6b5f52` |
| `--color-accent` | `#b5e04a` | `#3f6d0c` |
| `--color-accent-2` | `#f2c14e` | `#8a5d00` |
| `--color-btn` | `#b5e04a` | `#a8d63c` |
| `--color-btn-hi` | `#c4ea62` | `#b7e24f` |
| `--color-btn-ink` | `#141a05` | `#172105` |
| `--color-chip` | `#4a413a` | `#ddd1bd` |
| `--color-chip-hi` | `#5a5048` | `#d2c4ad` |
| `--color-bar` | `#000000` | `#fffdf8` |


| Pair | Dark | Light |
|---|---|---|
| ink on bg | 16.85 | 15.51 |
| ink on surface | 15.45 | 17.33 |
| ink on raised | 13.72 | 13.82 |
| ink-2 on bg | 11.96 | 9.91 |
| ink-2 on surface | 10.97 | 11.08 |
| ink-2 on raised | 9.74 | 8.84 |
| muted on bg | 7.25 | 5.46 |
| muted on surface | 6.65 | 6.10 |
| muted on raised | 5.91 | 4.87 |
| accent on surface | 11.27 | 6.07 |
| accent on raised | 10.01 | 4.84 |
| accent-2 on surface | 10.28 | 5.67 |
| accent-2 on raised | 9.13 | 4.52 |
| btn-ink on btn | 11.64 | 9.83 |
| btn-ink on btn-hi | 12.96 | 11.15 |
| ink on chip | 8.92 | 11.68 |
| ink on chip-hi | 7.03 | 10.27 |
| ink on bar | 18.81 | 17.33 |
| accent on bar | 13.73 | 6.07 |
| accent as a border on surface (3:1) | 11.27 | 6.07 |
| bg check mark on an accent fill (3:1) | 12.30 | 5.43 |

#### Torrente Arcano (`arcano`, free)

| Token | Dark | Light |
|---|---|---|
| `--color-bg` | `#110f1b` | `#f3f1fa` |
| `--color-surface` | `#1b1828` | `#ffffff` |
| `--color-raised` | `#252136` | `#e7e3f5` |
| `--color-line` | `#383252` | `#cdc6e6` |
| `--color-ink` | `#f1eeff` | `#1b1630` |
| `--color-ink-2` | `#cdc6e8` | `#3f3763` |
| `--color-muted` | `#9d95bd` | `#5f5782` |
| `--color-accent` | `#6fe3ff` | `#0a6a85` |
| `--color-accent-2` | `#c79bff` | `#6b3fc0` |
| `--color-btn` | `#6fe3ff` | `#0a6a85` |
| `--color-btn-hi` | `#94ebff` | `#0d7c9b` |
| `--color-btn-ink` | `#06222b` | `#ffffff` |
| `--color-chip` | `#3b3456` | `#d9d2ee` |
| `--color-chip-hi` | `#4a4268` | `#cdc4e8` |
| `--color-bar` | `#07060d` | `#ffffff` |


| Pair | Dark | Light |
|---|---|---|
| ink on bg | 16.62 | 15.59 |
| ink on surface | 15.24 | 17.44 |
| ink on raised | 13.65 | 13.87 |
| ink-2 on bg | 11.59 | 9.69 |
| ink-2 on surface | 10.63 | 10.84 |
| ink-2 on raised | 9.51 | 8.62 |
| muted on bg | 6.74 | 5.92 |
| muted on surface | 6.18 | 6.62 |
| muted on raised | 5.53 | 5.27 |
| accent on surface | 11.68 | 6.15 |
| accent on raised | 10.45 | 4.89 |
| accent-2 on surface | 7.92 | 6.78 |
| accent-2 on raised | 7.08 | 5.39 |
| btn-ink on btn | 11.10 | 6.15 |
| btn-ink on btn-hi | 12.26 | 4.80 |
| ink on chip | 10.16 | 11.96 |
| ink on chip-hi | 8.11 | 10.51 |
| ink on bar | 17.69 | 17.44 |
| accent on bar | 13.55 | 6.15 |
| accent as a border on surface (3:1) | 11.68 | 6.15 |
| bg check mark on an accent fill (3:1) | 12.73 | 5.50 |

#### Bonta (`bonta`, free)

| Token | Dark | Light |
|---|---|---|
| `--color-bg` | `#0e1320` | `#f2f5fb` |
| `--color-surface` | `#171f31` | `#ffffff` |
| `--color-raised` | `#20293f` | `#e3e9f5` |
| `--color-line` | `#323f5c` | `#c5cfe2` |
| `--color-ink` | `#eef3fc` | `#111a2c` |
| `--color-ink-2` | `#c4cde0` | `#33415c` |
| `--color-muted` | `#8f9bb6` | `#55627d` |
| `--color-accent` | `#8fb8ff` | `#1f4fa8` |
| `--color-accent-2` | `#f0c75e` | `#8a5d00` |
| `--color-btn` | `#8fb8ff` | `#1f4fa8` |
| `--color-btn-hi` | `#a8c8ff` | `#2a5ebf` |
| `--color-btn-ink` | `#0a1730` | `#ffffff` |
| `--color-chip` | `#2f3b57` | `#d3dcee` |
| `--color-chip-hi` | `#3b4969` | `#c6d1e8` |
| `--color-bar` | `#060912` | `#ffffff` |


| Pair | Dark | Light |
|---|---|---|
| ink on bg | 16.65 | 15.92 |
| ink on surface | 14.77 | 17.38 |
| ink on raised | 13.00 | 14.27 |
| ink-2 on bg | 11.61 | 9.37 |
| ink-2 on surface | 10.30 | 10.24 |
| ink-2 on raised | 9.07 | 8.40 |
| muted on bg | 6.65 | 5.61 |
| muted on surface | 5.90 | 6.12 |
| muted on raised | 5.19 | 5.03 |
| accent on surface | 8.20 | 7.66 |
| accent on raised | 7.22 | 6.29 |
| accent-2 on surface | 10.21 | 5.76 |
| accent-2 on raised | 8.99 | 4.73 |
| btn-ink on btn | 8.89 | 7.66 |
| btn-ink on btn-hi | 10.50 | 6.08 |
| ink on chip | 10.01 | 12.62 |
| ink on chip-hi | 8.05 | 11.33 |
| ink on bar | 17.87 | 17.38 |
| accent on bar | 9.92 | 7.66 |
| accent as a border on surface (3:1) | 8.20 | 7.66 |
| bg check mark on an accent fill (3:1) | 9.24 | 7.01 |

#### Brâkmar (`brakmar`, free)

| Token | Dark | Light |
|---|---|---|
| `--color-bg` | `#150d0c` | `#f8f1ee` |
| `--color-surface` | `#211514` | `#ffffff` |
| `--color-raised` | `#2d1d1b` | `#f0e3df` |
| `--color-line` | `#48302d` | `#dbc5bf` |
| `--color-ink` | `#f8eeec` | `#22120f` |
| `--color-ink-2` | `#dac5c1` | `#4b2c27` |
| `--color-muted` | `#ad938e` | `#6e4f49` |
| `--color-accent` | `#ff6a52` | `#a8231a` |
| `--color-accent-2` | `#ffb347` | `#8a4f00` |
| `--color-btn` | `#ff6a52` | `#b3261c` |
| `--color-btn-hi` | `#ff8470` | `#c8342a` |
| `--color-btn-ink` | `#2a0703` | `#ffffff` |
| `--color-chip` | `#4a2f2b` | `#e8d2cc` |
| `--color-chip-hi` | `#5c3a35` | `#dfc4bd` |
| `--color-bar` | `#070302` | `#ffffff` |


| Pair | Dark | Light |
|---|---|---|
| ink on bg | 16.84 | 16.19 |
| ink on surface | 15.59 | 18.08 |
| ink on raised | 14.14 | 14.43 |
| ink-2 on bg | 11.64 | 11.14 |
| ink-2 on surface | 10.78 | 12.44 |
| ink-2 on raised | 9.77 | 9.92 |
| muted on bg | 6.71 | 6.54 |
| muted on surface | 6.21 | 7.30 |
| muted on raised | 5.63 | 5.82 |
| accent on surface | 6.29 | 7.19 |
| accent on raised | 5.71 | 5.74 |
| accent-2 on surface | 9.98 | 6.56 |
| accent-2 on raised | 9.05 | 5.24 |
| btn-ink on btn | 6.58 | 6.54 |
| btn-ink on btn-hi | 7.77 | 5.28 |
| ink on chip | 10.64 | 12.50 |
| ink on chip-hi | 8.73 | 10.99 |
| ink on bar | 18.02 | 18.08 |
| accent on bar | 7.27 | 7.19 |
| accent as a border on surface (3:1) | 6.29 | 7.19 |
| bg check mark on an accent fill (3:1) | 6.79 | 6.44 |

#### Ocre (`ocre`, premium, after the Dofus Ocre)

| Token | Dark | Light |
|---|---|---|
| `--color-bg` | `#14100a` | `#f8f1e2` |
| `--color-surface` | `#1d170e` | `#fffaf0` |
| `--color-raised` | `#281f12` | `#efe2c6` |
| `--color-line` | `#43341d` | `#d4bf95` |
| `--color-ink` | `#f7efe0` | `#23190a` |
| `--color-ink-2` | `#d9c9a8` | `#4a3a1f` |
| `--color-muted` | `#a8977a` | `#6b5838` |
| `--color-accent` | `#ffb534` | `#8a5300` |
| `--color-accent-2` | `#ff8a5c` | `#a3410f` |
| `--color-btn` | `#ffb534` | `#8a5300` |
| `--color-btn-hi` | `#ffc35a` | `#a06200` |
| `--color-btn-ink` | `#2a1a00` | `#ffffff` |
| `--color-chip` | `#4a3b25` | `#e6d4ae` |
| `--color-chip-hi` | `#5a4830` | `#dcc79c` |
| `--color-bar` | `#080603` | `#fffaf0` |


| Pair | Dark | Light |
|---|---|---|
| ink on bg | 16.58 | 15.37 |
| ink on surface | 15.56 | 16.61 |
| ink on raised | 14.19 | 13.47 |
| ink-2 on bg | 11.61 | 9.74 |
| ink-2 on surface | 10.90 | 10.53 |
| ink-2 on raised | 9.94 | 8.54 |
| muted on bg | 6.65 | 6.07 |
| muted on surface | 6.24 | 6.56 |
| muted on raised | 5.69 | 5.32 |
| accent on surface | 10.08 | 6.08 |
| accent on raised | 9.20 | 4.93 |
| accent-2 on surface | 7.66 | 6.08 |
| accent-2 on raised | 6.98 | 4.93 |
| btn-ink on btn | 9.56 | 6.33 |
| btn-ink on btn-hi | 10.60 | 4.95 |
| ink on chip | 9.46 | 11.85 |
| ink on chip-hi | 7.64 | 10.45 |
| ink on bar | 17.71 | 16.61 |
| accent on bar | 11.48 | 6.08 |
| accent as a border on surface (3:1) | 10.08 | 6.08 |
| bg check mark on an accent fill (3:1) | 10.75 | 5.63 |

Rules that follow from the numbers:

- The lowest muted pair is Amakna light muted on raised at 4.87:1, so muted text works on every surface in every theme.
- Accent and accent-2 pass as text on surface and raised everywhere (lowest: Amakna light accent-2 on raised at 4.52:1), so the eyebrow, links, tags and numbers need no theme-specific exceptions.
- Text over game art always sits on a shade. Never put text straight on an image, and never use `--color-muted` on art cards (see Imagery).

### Shared colors

Status colors and section accents are fixed per mode and shared by all five themes. That is the simpler option, and it passes: each hex was checked against `bg`, `surface` and `raised` of every theme in its mode, and the table gives the worst case.

| Token | Dark | Worst case | Light | Worst case |
|---|---|---|---|---|
| `--color-success` | `#a9d266` | 8.34 (Bonta raised) | `#3d6914` | 5.07 (Ocre raised) |
| `--color-warning` | `#f2c14e` | 8.63 (Bonta raised) | `#7a5600` | 5.18 (Ocre raised) |
| `--color-danger` | `#f28466` | 5.70 (Bonta raised) | `#a8381f` | 5.03 (Ocre raised) |
| `--color-info` | `#8fc3e8` | 7.68 (Bonta raised) | `#1d5f86` | 5.39 (Ocre raised) |

### Footer brand colors

Decided 2026-11-16 with Torre's color design (option D): the footer's Discord and Ko-fi cards are flat fills in their brand colors, the same in every theme, per mode. They are tokens in `theme.css` (`[data-mode]` blocks), and `tests/unit/theme-css.test.ts` checks each text pair at 4.5:1, hover included.

| Token | Dark | Light | Text on it |
|---|---|---|---|
| `--color-discord` | `#7c52e8` | `#6a42d8` | `--color-discord-ink` `#ffffff`: 4.97 dark, 6.21 light |
| `--color-discord-hi` (hover) | `#8259ec` | `#7650e2` | 4.58 dark, 5.23 light |
| `--color-kofi` | `#f2c14e` | `#f2c14e` | `--color-kofi-ink` `#241a00`: 10.23 |
| `--color-kofi-hi` (hover) | `#f6cf6e` | `#f6cf6e` | 11.51 |
| `--color-kofi-line` | `#f2c14e` | `#9a6b00` | the 1px border of the header and floating Ko-fi buttons: at least 3:1 on every theme's bar, bg, surface and raised (gold on white is 1.3:1, so light mode takes a deep gold) |

The prototype's dark Discord hover, `#8a63f0`, gives white text 4.10:1; `#8259ec` is the lightest step of the same violet that keeps 4.5:1.

### Section accents

Decided 2026-11-02: each section gets a subtle accent of its own. It is used only for details: the card border, the ring of the icon well in the menu, and the section label. It never fills a button, never colors body text and never replaces `accent` or `accent-2` in their jobs. Pages set it once with `--color-section` on the section's root, so components read one variable.

| Section | Token | Dark | Worst case | Light | Worst case |
|---|---|---|---|---|---|
| Misiones | `--color-sec-misiones` | `#e3c565` | 8.58 | `#77600f` | 4.72 |
| Logros | `--color-sec-logros` | `#f0b45a` | 7.85 | `#8f560a` | 4.67 |
| Guías de Dofus | `--color-sec-dofus` | `#b7dc69` | 9.28 | `#4b6e12` | 4.62 |
| Checklists | `--color-sec-checklists` | `#7fd6c2` | 8.48 | `#17695a` | 5.11 |
| Clases | `--color-sec-clases` | `#ef8a6a` | 5.87 | `#a23c22` | 5.10 |
| Mazmorras | `--color-sec-mazmorras` | `#b99af2` | 6.18 | `#6a43b8` | 5.27 |

Worst cases are on `raised` of Bonta dark and Ocre light. Every value is at least 4.5:1, so the same hex works as label text and as a border (which needs 3:1). A new section, or a new theme, gets these pairs rechecked before it ships.

### Item hues

Decided 2026-11-16 with Torre's color design (option D). Eight hues give each item of a list its own color, the same in every theme, per mode: bright in dark mode, deep in light mode. They are tokens in `theme.css` (`[data-mode]` blocks), and `--color-on-hue` is the ink on a hue fill.

| Token | Dark | Light |
|---|---|---|
| `--color-hue-1` (coral) | `#ff6b5a` | `#c23a28` |
| `--color-hue-2` (gold) | `#f2c14e` | `#946400` |
| `--color-hue-3` (lime) | `#b5e04a` | `#4b7610` |
| `--color-hue-4` (sky) | `#5cb8ff` | `#1d68ae` |
| `--color-hue-5` (teal) | `#45cdb9` | `#0f7a6a` |
| `--color-hue-6` (violet) | `#b08bff` | `#6744c4` |
| `--color-hue-7` (orange) | `#ff9d47` | `#ad540c` |
| `--color-hue-8` (pink) | `#ff7fb6` | `#b23672` |
| `--color-on-hue` | `#14110e` | `#ffffff` |

`tests/unit/theme-css.test.ts` checks every hue as text at 4.5:1 on `bg` and `surface` of every theme in its mode, at 3:1 on `raised` (a border or frame), and `--color-on-hue` at 4.5:1 on each hue. The deep light hues drop to 4.01 on `raised` (Ocre), so a hue never sets text on `raised`: on hover the kicker of a previous or next card turns ink, and the home tour numbers sit on `surface` in light mode.

How they are handed out:

- **Per item.** Each item takes `--v`, the hues in order with `nth-child(8n + k)`: metalogros tiles (`.vd-cell`, counted `of .vd-cell` so the island's panel never shifts them) and achievement cards (`.acards > li`), the achievement page's numbered quests (`.lq__item`), Necesitarás rows (`.lneeds__list > li`), «Cuenta para» (`.metas > li`), the home tour steps, checklists and guide parts (`.tour__step`, `.trio > li`, `.spec__items > *`), the Dofus guide's quest list (`.dg-ql__i`) and the previous and next cards (`.lnav__card`). An item uses its hue for its border, the frame of its icon, its number or its kicker. Its name and body stay ink.
- **Fixed per part.** In the quest header, the achievement sheet and the Dofus guide header, Prerrequisitos is hue 5, Necesitarás hue 1 and Recompensas hue 2. The heading takes the hue as text, and the prerequisites' icons take it as their frame. The metalogros groups are hues 5, 2 and 8, and the Dofus guide's section headings cycle through 2, 5 and 8.
- **Never on checklist pages.** A checklist is one color, the accent (Layout, Dofus checklist).

The prototype also maps the «Necesitarás en total» groups (`-objetos` hue 6, `-tareas` hue 1, `-otros` hue 7), but its selector targets a `section` and those groups are lists, so it never painted. The approved look has ink group titles and one hue per row, and that is what ships.

### Icon wells

Decided 2026-11-05 with guide v4. Game icons sit in wells, like the slots of the game's inventory. Two pairs of tokens, set per mode in `theme.css` from the theme's own colors:

| Token | Dark | Light | Use |
|---|---|---|---|
| `--color-well` | `bg` 55 % over `surface` | `raised` | the coordinates chip |
| `--color-well-line` | `line` 80 % over `ink` | `line` | their 1px border, Torre's avatar ring, the default frame of an icon diamond |
| `--color-slot` | same as `--color-well` | same as `--color-well` | the well behind a full-colour game icon |
| `--color-slot-line` | same as `--color-well-line` | same as `--color-well-line` | its border |

**Diamonds** (decided 2026-11-16, option D). An icon well (`.well`, `IconWell`) is a rotated square drawn behind the icon with `::before`: inset 14 percent, 4px radius, the `--color-well` fill and a 2px border in the frame color `--dia`. The box of the well paints nothing and keeps its size, so the icons and the layout do not move. The default frame is `--color-well-line`. `IconWell` writes what it holds in `data-icon` (an image of a dungeon boss passes `kind="dungeon"`), and the frame follows it: XP hue 3, kamas hue 2, fights and dungeons hue 1, the rewards bag hue 4. Prerequisites take hue 5 and a well inside a list item with a hue takes that item's `--v`. Hover and focus on a copyable name, and hover on the bag, turn the frame `--color-accent`. A well that already sits in a slot box (a Dofus guide's achievement without an icon) drops its diamond. The metalogros index repeats the rule in `metalogros.css`, which loads no `game.css`.

Slots follow the mode (changed 2026-11-12): a dark slot looked out of place in light mode, and the game outlines its icons, so pale ones (the XP arrow, a gold coin, Frostizz, Grasa gelatinosa) still read on a light slot. Wells and slots are decorative (`aria-hidden`, icons with `alt=""`); the text next to them carries the meaning, so their edges need no ratio. Text on a well: ink at least 13.47:1 (Ocre light) and accent at least 4.84:1 (Amakna light, the coordinates chip).

### Typography

Families (decided 2026-11-06 with guide v5, after Torre's review; Montserrat replaced Fredoka and Nunito, which had replaced Barlow and Barlow Condensed with guide v4; Rowdies and Lexend added on 2026-11-16 with Torre's color design, option D of `tmp/mockups/color/`), self-hosted from `src/styles/fonts/` through `next/font/local` (since 2026-11-18; before, `next/font/google` downloaded the same files on every build, and a failed download broke the build), with fallback metrics that prevent layout shift:

| Token | Family | Weights | Fallback stack | Use |
|---|---|---|---|---|
| `--font-title` | Rowdies | 700 | `'Rowdies Fallback Linux', 'Rowdies', Montserrat, system-ui, sans-serif` | page titles (`h1`) and the home section titles, uppercase |
| `--font-ui` | Lexend | 500, 600, 700 | `'Lexend Fallback Linux', 'Lexend', Montserrat, system-ui, sans-serif` | the interface: nav items, buttons, card names, part headings (Prerrequisitos, Necesitarás, Recompensas, section `h2`s), eyebrows |
| `--font-display` | Montserrat | 600, 700 | `'Montserrat Fallback Linux', 'Montserrat', system-ui, sans-serif` | the wordmark, labels and the titles that have not moved to `--font-title` or `--font-ui` yet |
| `--font-body` | Montserrat | 400, 500, 600, 700, 800 | `'Montserrat Fallback Linux', 'Montserrat', system-ui, -apple-system, sans-serif` | body, controls, tables; 800 for amounts and coordinates |
| `--font-accent` | Lilita One | 400 | `'Lilita One Fallback Linux', 'Lilita One', 'Montserrat', system-ui, sans-serif` | featured numbers in the catalog components that still use it (stat tile, item slot quantity, progress bar). Never titles |

Montserrat is a variable font. One latin file (35,508 bytes) holds every weight, so `src/styles/fonts.ts` loads it as a single `next/font/local` instance with one face per weight, 400 to 800, all on that file. Lexend is variable too: one file for 500, 600 and 700. Rowdies is static and only its 700 loads. The files are the latin subset Google Fonts serves, byte for byte, with Google's latin `unicode-range`; `src/styles/fonts/README.md` lists their sources and how to update one.

Two files are preloaded: Montserrat, the body text, and Rowdies, the `h1` of every page. The title is the first thing read and, on pages without an image at the top, the LCP; Rowdies' wide capitals differ from the fallback enough that a late swap could change the title's line breaks (CLS). Lexend and Lilita One load when the page first uses them and show the metric-adjusted fallback until then (`display: swap`): Lexend sets short interface text, where the swap barely moves anything. Keep it that way: a preloaded font always downloads and competes with the CSS and the LCP image. With six Nunito and Fredoka files preloaded, a guide's first screenshot took 1.8 s to arrive on slow 4G. `tests/e2e/fonts.spec.ts` checks the two preloads, Montserrat's single family, the title in Rowdies 700 and that bold text uses the font file instead of a synthesized bold.

Each family's metric-adjusted fallback (`Montserrat Fallback`) is a face on `local(Arial)` in `src/styles/fonts-fallback.css`, with the values `next/font/google` generated. `next/font/local` would compute others from the font file (Montserrat's size-adjust 110.19 percent instead of 112.83), so `fonts.ts` turns its computed fallback off and names these faces instead. Arial is missing on Linux and Android. There the browser paints the system sans, which has other metrics, and with the old fonts the guide header changed line breaks when the web fonts arrived (CLS 0.19 in Lighthouse CI, decided 2026-11-05). `src/styles/fonts-fallback.css` adds one `<Family> Fallback Linux` face per family (Montserrat, Rowdies, Lexend, Lilita One): the same overrides on Liberation Sans and Arimo, which share Arial's metrics, and on Roboto, the closest on Android. The values are the ones `next/font` computes (`calculateSizeAdjustValues` in `next/dist/server/font-utils`); `tests/unit/fonts.test.ts` fails when a family has no face or its values differ. Lexend, which is not preloaded and sets the 600 and 700 headings, also has bold faces, on Arial Bold for `Lexend Fallback` and on Liberation Sans, Arimo and Roboto Bold for `Lexend Fallback Linux`, sized to Lexend's width at each weight: bold is never synthesized, so without them those headings painted in Arial's regular face, 3 percent narrower, and changed line breaks when Lexend arrived (CLS 0.12 on `/metalogros` in Lighthouse CI, 2026-11-17).

The scale and rhythm come from duffus.fr (study, typography). Sizes are rem on a 16px root, 110 percent from 1024px (Tokens, Root size). Page titles are Rowdies 700 in uppercase; the other display sizes use 600.

| Token | Size | Line height | Weight | Tracking | Family | Use |
|---|---|---|---|---|---|---|
| `--text-hero` | `clamp(3rem, 2rem + 4.2vw, 5.75rem)` | 1.02 | 700 | 0 | title, uppercase | home title only |
| `--text-4xl` | `clamp(2.25rem, 1.75rem + 2vw, 3rem)` | 1.02 | 700 | 0 | title, uppercase | page title (`h1`) where no clamp of its own is set (the metalogros index, the 404, the catalog); the guide, Dofus index, checklist and checklists index titles and the home section titles (`.home-h2`, `clamp(2rem, 1.45rem + 2.2vw, 3rem)`) have their own clamp of about the same range |
| `--text-2xl` | 1.875rem | 1.1 | 600 | 0 | display | list page title, `h2` in guide prose |
| `--text-xl` | 1.375rem | 1.2 | 600 | 0 | display | card and block title, `h3`, the wordmark |
| `--text-lg` | 1.125rem | 1.4 | 600 | 0 | body | lead paragraph |
| `--text-base` | 1rem | 1.5 | 400 | 0 | body | body text, never smaller in guide content |
| `--text-sm` | 0.875rem | 1.5 | 400 to 600 | 0 | body | secondary text, controls, table cells |
| `--text-xs` | 0.78rem | 1.45 | 500 to 600 | 0 | body | chips, meta, tab labels |
| `--text-eyebrow` | 0.8125rem | 1.4 | 600 | 0.16em | display, uppercase | eyebrow above a title |
| `--text-micro` | 0.6875rem | 1.4 | 600 | 0.12em | display, uppercase | section labels, table heads, stat labels |
| `--text-figure` | 1.375rem | 1 | 400 | 0 | accent | levels, percentages, stat tile numbers, "0/100" |

Rules:

- Page titles (decided 2026-11-16 with Torre's color design, option D): Rowdies 700 (`--font-title`) in uppercase, line height 1.02, no tracking, on every `h1` (`.hero__t`, `.qhead__title` on guides, achievement pages, Dofus guides and site pages, `.idx__t`, `.dg-h1`, `.ck-h1`, `.ck-head__t`, the 404) and the home section titles (`.home-h2`). Written in normal case in the source; CSS sets the capitals. Beside the achievement sheet (from 1024px) the title's column is narrow up to about 1150px, so there the achievement title also fits its header's width (`min(…, 8.2cqi)`, the header being an inline-size container) and never grows past the guide title's size: uppercase Rowdies is wider than Montserrat, and «La ocasión hace al ladrón» took a third line at 1024px. They replaced Montserrat 600 to 700 in normal case (guide v5, 2026-11-06), which had replaced uppercase Barlow Condensed (guide v4).
- Part headings (Prerrequisitos, Necesitarás, Recompensas, «Cuenta para», the section `h2`s of achievement pages, Dofus guides and the metalogros index, the checklist's `h3`s) are Lexend 700 (`--font-ui`) in sentence case, no tracking; the Necesitarás group names are Lexend 600. Card names (metalogros, Dofus index cards, next quest card, the header panels' tiles and checklist rows) and the home section cards are Lexend 600 to 700, and so are buttons, the footer's headings and links, the checklist tabs and the souls panel's headings. The wordmark stays Montserrat, and so do the micro labels, the achievement quest titles, the callout and Torre's tip headings, the poster names and the prose headings, as specified where each is described. The home's small copy of a guide has the real guide's title: Rowdies 700 in uppercase.
- Eyebrows and micro labels stay uppercase as in the table, written in normal case in the source.
- Eyebrows (`.hero__eyebrow`, `.dg-eyebrow`, `.ck-eyebrow`), breadcrumb links and the coordinates chip (1.5px border and text, 8px radius) are in `--color-accent`; the eyebrows are Lexend (decided 2026-11-16, option D; the Dofus and checklists index eyebrows were in the section color before).
- Guide pages set body text at 1rem with a 1.65 line height; elsewhere it stays at `--text-base`.
- Lilita One is for featured numbers and the words that belong to them ("30 guías"), never for titles or labels. In tables and aligned columns, numbers stay in Montserrat with tabular figures.
- The last word of a list page title may go in `--color-accent` ("Todas las *misiones*").
- Measure: guide prose at most 72ch, the outro 68ch; step text and the text inside callouts and Torre's tips at most 75ch (`--measure`).
- Numbers in tables, counts and progress use `font-variant-numeric: tabular-nums`.
- **Figures** (decided 2026-11-07 with home v9): thousands split with a narrow no-break space (U+202F), never a dot: "1 272". Montserrat and Lilita One have no glyph for it, so `<Amount>` (`src/components/ui/Amount.tsx`) puts it in its own span 0.2em wide and keeps the figure on one line. The header counts, the home page and the `/sistema` catalog (Fichas y progreso) use it. Guide quantities in text strings (rewards, item quantities) still use a no-break space (U+00A0) until they move to `<Amount>`.
- Words never split mid-word: `overflow-wrap: normal; word-break: normal; hyphens: manual` on `body`.

### Spacing

Tailwind v4's single `--spacing: 0.25rem` base, so `p-4` is 16px. The steps in use:

| Step | px | Typical use |
|---|---|---|
| 0.5, 1, 1.5 | 2, 4, 6 | icon to label, chip padding |
| 2, 2.5, 3 | 8, 10, 12 | gaps inside rows and cards, grid gaps on phones |
| 4, 5, 6 | 16, 20, 24 | card padding, grid gaps on desktop, side gutter (16px phone, 24px tablet) |
| 8, 10, 12 | 32, 40, 48 | between blocks in a guide (the desktop side gutter is fluid, see Layout) |
| 16, 20 | 64, 80 | between page sections |

Torre's tips bubble uses `18px 22px 20px` padding; everything else stays on the scale.

### Radii

| Token | Value | Use |
|---|---|---|
| `--radius-xs` | 4px | progress track, tiny thumbnails |
| `--radius-sm` | 8px | item chip icons, table rows on hover, checkboxes (7 to 8px); the flat cards of option D (metalogros tiles, achievement cards, Dofus index cards, next and previous cards, the home area art, checklist quest cards) and Torre's bubble; the guide's icon slots and the rewards bag use 10px (Icon slots and game icons) |
| `--radius-md` | 12px | list rows, inputs that are not pills, tooltips, secondary buttons |
| `--radius-card` | 16px | panels, dropdowns |
| `--radius-lg` | 20px | dungeon and class cards |
| `--radius-pill` | 999px | buttons, chips, search, nav items, tabs |

### Shadows

The interface is mostly flat; depth comes from surface steps. Shadows go under game art and floating layers.

| Token | Value | Use |
|---|---|---|
| `--shadow-art` | `0 2px 6px rgb(0 0 0 / .3), 0 14px 32px rgb(0 0 0 / .35)` | map and step screenshots |
| `--shadow-float` | `0 12px 32px rgb(0 0 0 / .45)` | dropdowns, popovers, the search dialog |
| `--shadow-dialog` | `0 24px 64px rgb(0 0 0 / .55)` | modal dialogs |

In light mode, shadows drop to half their alpha.

### Z-index

| Token | Value | Use |
|---|---|---|
| (none) | -2 | the zone background of quest guides and achievement pages, under the ambience (Zone background) |
| (none) | -1 | the ambience layer, under everything in the page (Ambience) |
| `--z-base` | 0 | content |
| `--z-raised` | 10 | sticky table heads, sticky side column |
| `--z-float` | 40 | the floating Ko-fi button, under the header and its panels |
| `--z-header` | 50 | site header |
| `--z-menu` | 60 | dropdowns, popovers, tooltips |
| `--z-toast` | 90 | toasts |

### Breakpoints and containers

| Token | Value | What changes |
|---|---|---|
| `--breakpoint-sm` | 40rem (640px) | two-column card grids |
| `--breakpoint-md` | 48rem (768px) | desktop header replaces the mobile bar |
| `--breakpoint-lg` | 64rem (1024px) | sticky side column appears next to guides and checklists |
| `--breakpoint-xl` | 80rem (1280px) | full grids (6 to 7 cards per row) |

Components that can sit in different widths (cards in a side column, the checklist in a panel) use container queries (`@container`), not viewport breakpoints.

| Token | Value | Use |
|---|---|---|
| `--width-shot` | 576px (633.6px with the 110 percent root) | a step screenshot on its own |
| `--width-shot-max` | 640px (704px) | a step screenshot in a group of three or more |
| `--width-guide` | 1168px (1284.8px): two shots and the 16px gap | the quest rows of an open checklist step and the previous and next cards; no page column stops at it |
| `--width-media` | 880px (968px) | screenshots outside steps |
| `--width-video` | 1296px (1425.6px): two `--width-shot-max` and the gap | the video |
| `--measure` | 75ch | step text and the text of callouts and Torre's tips |
| `--width-prose` | 800px | catalog prose |

**Full width, left aligned** (Torre, 2026-11-16; no column stops short since 2026-11-17; fluid gutters and a 110rem frame since 2026-11-17). Every page uses the whole viewport minus the side gutters, up to a frame of `--frame-max`, and its content starts at the left gutter. No page is a narrow centered column: the header and footer rows, the guides, the achievement pages, the indexes, the checklists and the home all run from gutter to gutter, so the header, the content and the footer share their left and right edges at every width: the header's logo starts where the page title and the footer content start, and the header's last button and the floating Ko-fi button end where the content ends. Page columns reach the right gutter at any width: a 1920px screen shows no empty band at the right of the page. Until 2026-11-17 the column of quest guides, site pages, achievement pages and Dofus guides stopped at `--width-guide`, which left a band hundreds of pixels wide on Torre's 1728px screen. Inside the column, what would grow without bound stops instead and leaves the rest of its row empty:

- Running text keeps a measure: step text and the text inside callouts and Torre's tips stop at 75ch (`--measure`), prose outside steps at 72ch. The boxes of callouts and Torre's tips, headings, the rules between steps, the quest header's facts, image grids, cards and the achievement sheet use the full width.
- Step screenshots fill the row (Steps): a group of three or more in columns of at most `--width-shot-max`, two per row at 1440px, three at 1728, 1920 and 2560px (the 110rem frame never reaches the 122rem row of a fourth); a pair at half the row each; a single one at `--width-shot`. The video grows up to `--width-video`, two screenshot columns; loose prose images stay at `--width-media`.
- On the achievement page the sheet is pinned to the right gutter and the quest column takes the rest. The previous and next cards stop at `--width-guide`.
- Index grids gain columns instead of stretching cards. The metalogros tiles and the Dofus cards fill the row with `auto-fill` (Dofus cards at least 208px from 1280px, five per row at 1440px as before), and the checklist posters (216px at most) start at the left gutter.
- An open checklist step fills its panel; only its quest rows and its text stop at `--width-guide`, so a quest row keeps its coordinates next to its name.
- From 1600px the footer columns and the home's hero and tour stop at the widths they had when pages were 1400px wide, and spread with `justify-content: space-between`. Their right column meets the right gutter, like the header's buttons.
- Hero and intro paragraphs keep their reading measure (62ch, or 760px) at the left.

Side gutters (`--gutter`, `src/styles/theme.css`): 16px under 640px, 24px up to 1024px, and from 1024px 5 percent of the viewport between 3rem and 8rem (`clamp(3rem, 5vw, 8rem)`, 52.8px to 140.8px with the 110 percent root): 52.8px at 1024px, 72px at 1440px, 86.4px at 1728px, 96px at 1920px, 128px at 2560px. Until 2026-11-17 they stayed at 52.8px on every desktop, and wide screens looked glued to the edges.

The page frame stops at `--frame-max`, 110rem (1936px with the 110 percent root), reached at a 2151px viewport. Wider, the content is centered: at 2560px it runs from 312px to 2248px, more than the 128px gutter on each side. Every full-width box (`.site-hdr__in`, `.site-ft__in`, `.site-ft__legal`, the phone sheet's top bar, each page's `<main>` or wrapper, the floating Ko-fi dock) pads its sides with `--frame-pad`, `max(var(--gutter), (100% - var(--frame-max)) / 2)`, so its own background still runs edge to edge: the header bar, the footer, the page background, the zone background and the particles are never constrained. `--frame-pad` resolves against the box it pads, so only boxes as wide as the viewport use it; a row that bleeds inside a page (the checklist posters, the home's island) bleeds by `--gutter`, which is the same below the frame width. The image `sizes` follow the frame (Imagery).

## Brand

Decided 2026-11-05: Torre chose proposal C, "Emblema" (https://ta-prototipos.netlify.app/logo/#c). The emblem is an original vector drawing taken from his avatar: the conical hat with its glyph, the angled eyes and the grin, in a 64 × 64 box. The drawing lives in `src/components/brand/emblem-art.ts`; `<Emblem>` (`src/components/brand/Emblem.tsx`) renders it inline, and `scripts/build-icons.ts` writes the favicon files from the same paths.

| Part | Color |
|---|---|
| Hat | `--color-accent` |
| Glyph on the hat | the fill under the emblem (`--emblem-cut`, `--color-bg` by default), so it reads as a cut through the hat |
| Eyes and grin | `--color-ink` |

- **Theme colors**: `<Emblem>` paints with the `fill-accent`, `stroke-ink` and `fill-ink` utilities and `stroke: var(--emblem-cut, var(--color-bg))`, so it follows the theme and mode of the nearest `data-theme` and `data-mode`. No hex in the markup. Across the ten palettes accent on bg is at least 5.43:1 (Amakna light) and ink on bg at least 15.37:1, over the 3:1 a graphic needs. The glyph is a cut, so it takes the color under the emblem: `--emblem-cut`, which the header, the sheet's top bar and the footer set to their own fill (`--color-bar`, or `--color-raised` in the light footer), and `--color-bg` elsewhere.
- **Decorative**: `aria-hidden="true"` and `focusable="false"`. The text next to it carries the name, so the header link keeps "Torrente Arcano" as its accessible name.
- **Lockup** (decided 2026-11-07, "Sello"): `<Lockup>` (`src/components/brand/Lockup.tsx`) puts the emblem to the left of the name set in two tight lines, "Torrente" in `--color-ink` and "Arcano" in `--color-accent`, Montserrat 700 at 15px (17px in the desktop header). The whole lockup is one link to the home page named "Torrente Arcano", with an 8px radius so its focus ring has round corners like the other header controls. On hover or focus the hat tilts 9 degrees and the eyes blink once; nothing moves under reduced motion. The header and the footer's legal band use it.
- **Sizes**: 36px in the desktop header and 30px under 768px, 8px from the wordmark (10px from 768px), to its left; 32px in the footer. The full drawing needs 24px or more. Smaller sizes use `variant="simple"`: a taller hat and a bigger grin, with no glyph and no eyes.
- **Favicon**: the browser tab cannot know the visitor's theme, so the favicon is always the default theme, Amakna (it was Arcano until 2026-11-17, when Amakna had long been the default). `icon2.svg` is the simple variant on a tile with a 14/64 corner radius, in Amakna dark, and in Amakna light when the browser uses the light scheme (an embedded `prefers-color-scheme` query; the shapes stay the same, so both stay sharp). `icon1.png` is the same tile at 32px in dark, for browsers without SVG favicons; it comes first so browsers that read SVG pick the SVG. `apple-icon.png` is 180px, the full emblem on a square Amakna dark tile with 16 percent padding (iOS rounds the corners). All three sit in `src/app/(frontend)/`, so Next links them from every public page. The Payload panel links the same files through `admin.meta.icons` and uses the emblem as its logo and nav icon (`src/components/admin/PanelBrand.tsx`). The panel does not load the site's styles, so `src/app/(payload)/custom.scss` paints the emblem with Arcano light or dark, following Payload's own `data-theme`. Change the drawing or the default theme's colors, then run `node scripts/build-icons.ts`; a unit test fails while `icon2.svg` is out of date.
- **Outside the site**: PNG and SVG exports per theme and mode, and a round member icon, are at https://ta-prototipos.netlify.app/logo/descargas/. They are made from the same drawing and are not in the repo.

## Share card

Added 2026-11-18 (backlog S-19). Every page of `/<slug>` has its own image for `og:image`, so a link pasted in WhatsApp or Discord shows a card instead of nothing. `renderShareCard` (`src/lib/seo/share-card-image.tsx`) draws it with `next/og` on the server; what each card holds is in `src/lib/seo/share-card.ts`. Samples of each kind are in `tmp/shots/og/` of the branch that added it.

- **Size and format**: 1200 × 630. A card with a landscape is a JPEG, the rest are palette PNGs. Each stays under 200 KB: the JPEG steps its quality down (82 to 58) until it fits. The seeded cards weigh 9 to 61 KB.
- **Colors**: Amakna dark, the default theme, whatever the visitor picked: `bg` behind, the title in `ink`, the kind label and «Arcano» in `accent` (`SHARE_CARD_COLORS`, which a unit test compares with `theme.css`).
- **Type**: the kind label («Misión», «Logro», «Guía de Dofus», «Checklist», «Página») in Lexend 700, 30px, uppercase with 0.16em tracking. Under it the page's `h1` in Rowdies 700, uppercase, line height 1.02, at 88, 76, 66 or 56px: the largest that fits in three lines (`shareTitleSize`). A longer title stops at three lines with an ellipsis. At the bottom left, the Sello lockup: the emblem at 64px and «Torrente / Arcano» in Lexend 700, 28px. `next/og` cannot read woff2, so the card uses static TTF instances of Rowdies 700 and Lexend 700 in `src/styles/fonts/share-card/`.
- **Art**: a quest guide or an achievement page puts its zone background (Zone background) behind the whole card, under a flat veil of `bg` at 74 percent. That is lighter than the page's 88 percent: the text is large and short, and `ink`, `ink-2` and `accent` still pass 4.5:1 over the veil on a white, a grey and a black map (`tests/unit/share-card.test.ts`). A Dofus guide puts its egg (`dofusEgg`) in a 360px box to the right of the text. Checklists and site pages get the flat card. A file that cannot be read gives the flat card, never an error.
- **Brand card**: the home page and the three indexes share Torre's image from «Ajustes del sitio» when he uploaded one. Without it they use `/og`: the emblem at 200px, «Torrente / Arcano» at 88px and «Guías de Dofus en español» in `ink-2`, flat on `bg`.
- **Flat**: no gradient, glow or shadow. Torre reads those as made with AI.

## Layout

- **Header** (decided 2026-11-07: prototype `tmp/mockups/cabecera-final/`, published at https://ta-prototipos.netlify.app/cabecera-final/; option A of cabecera v2 with the Sello lockup of option C and the shared Dofus and checklists panel of option B). `SiteHeader` in `src/components/site/`, rendered by the `(frontend)` layout on every page. 64px (56px under 768px), sticky at the very top. Since 2026-11-16 (Torre's color design, option D) it is a flat bar from edge to edge, always opaque, from the top of the page: `--color-bar` (near-black in dark mode, the surface color in light mode) with a 1px `--color-line` bottom border, no blur, no shadow, no radius. It replaced the transparent header that turned into `--color-bg` at 92 percent with a backdrop blur once the page scrolled, so the island no longer listens to scroll.
  - **Left**: the Sello lockup (see Brand), then one nav button per section with its game icon and a chevron: Misiones and Dofus. From 1200px; below that the burger opens the sheet (it was 1120px until 2026-11-17: with the theme picker the buttons ran 68px past the right gutter there). Up to 1583px the nav items are compact (0.375rem padding, 0.25rem between icon and label, 0.9375rem type), which leaves room for the Ko-fi button; until 2026-11-17 that was only up to 1279px, then up to 1535px until the fluid gutters (Layout) took 30px more from the row there. The nav items are Lexend 600 (`--font-ui`) in `--color-ink`; on hover they take a `--color-raised` fill and their section color (`--color-section`, set per item from `SECTION_CODE`).
  - **Current section**: the section of the page takes its color in the nav. Quest guides, achievement pages and `/metalogros` mark Misiones; Dofus guides, `/guias-dofus`, `/checklists` and checklist pages mark Dofus, where the checklists live in the menu. Each page's `<main>` carries `data-section` (`pageSection` in `src/components/site/nav.ts`), and `site.css` colors the nav item with the same `data-section` through `body:has(main[data-section=…])`. The layout cannot know which collection a `/<slug>` belongs to without querying it again, so the page states it and CSS pairs them; the home, site pages and the 404 mark nothing.
  - **Próximamente** (decided 2026-11-09, prototype `tmp/mockups/guias-dofus/`, published at https://ta-prototipos.netlify.app/guias-dofus/): Clases and Mazmorras have no pages yet. They stay in the nav after Dofus as plain text (`.np--soon`, `aria-disabled="true"`, a greyed icon, no chevron, no panel, no link, never focused) followed by the «Próximamente» tag (`Soon`: 20px pill, `--color-raised`, `--color-ink-2`, 600 at 0.625rem; `--color-surface` in the light footer, which is `--color-raised` itself). The phone sheet shows them as tiles that do not fold, the footer's Explorar lists them as text with the tag, and the home page cards are disabled the same way. The header search does not find them, nor their classes and dungeons. `soon: true` on the section in `nav.ts` drives all four; removing it brings each back once its pages exist.
  - **Panels**: 20px radius, `--color-surface`, 1px border in the section accent at 35 percent. Each one is a section tile on the left (flat `--color-bg`, no gradient; the section icon in a 64px well, the name and a line with its counts in bold) and the section's art on the right: Misiones has the search button and «Ver todo», its only link, to `/metalogros`, a filled primary button like the Dofus panel's «Ver todas…» (the phone sheet repeats both). No quest or achievement link goes to the old site. Dofus and Checklists share one panel: on the left the «Guías de Dofus» card, the checklists of the `checklists` collection in Torre's order (`loadChecklistNav` in `src/app/(frontend)/site-data.ts`, mapped from `loadChecklists`, cached with the `checklists` and `dofus-guides` tags) and «Ver todas las checklists», which goes to `/checklists`; on the right «Todos los Dofus», the eggs of the Dofus guides collection in Torre's order (`loadDofusNav` in `src/app/(frontend)/site-data.ts`, cached with the `dofus-guides` tag, so a Dofus Torre adds or publishes in the panel appears without a code change), each linking to its page, and «Ver todas las guías de Dofus», which goes to `/guias-dofus`. A Dofus whose guide is not published («En preparación») is a plain `.egg-soon` element with `aria-disabled`, its egg in grayscale at 45 percent and «(en preparación)» for screen readers; the search does not find it. A Publicada checklist links to its page (`/<slug>`). An «En preparación» one with a `legacyHref` links to its Squarespace checklist and tells screen readers «(en preparación: se abre en la web anterior)»; one without it is a plain `.chk__off` element with `aria-disabled`, its egg in grayscale. Each row shows the egg from the checklist's Dofus guide and Torre's one-line description. No text counts the Dofus or the checklists: Torre adds them over time. There is no separate Checklists button. The phone sheet repeats the checklists and «Ver todas las checklists». With no checklist to list, the panel and the sheet leave out the «Checklists» heading, the rows and the link. The guide count is the published guides and the achievement count the published achievement pages in the Publicada state, the same achievements `/metalogros` links (`src/lib/site/counts.ts`), cached with the `guide-pages` tag, which the achievement page and metalogro hooks also expire.
  - **Right**: the Ko-fi button (Ko-fi, below), the search trigger (a pill with "Buscar" from 1440px and `Ctrl K` at its right end from 1664px, 44px tall and 240px wide, filled with `--color-chip` (hover `--color-chip-hi`), `--color-ink` text and a 10px radius; an icon button below; it was 1360px before the theme picker took its room), the theme picker (`ThemePicker`, Components), the mode switch (`ModeToggle`), and the burger below 1200px. From 1440 to 1663px the pill hides `Ctrl K` and may shrink to 11rem (12.5rem from 1664px; with the shortcut at 1600px, Linux left only 10px), and from 1200 to 1279px each nav item has 0.25rem of side padding: text renders about 9px wider on Linux than on macOS, so the row keeps at least 24px free before the right gutter at every width from 1200px on macOS (`tests/e2e/cabecera.spec.ts` checks it). No "Entrar" button until member accounts exist.
  - **Behavior** (`HeaderIsland`, the one client island of the shell): a click opens a panel and closes any other; Esc closes it and returns focus to its button; a click outside or focus leaving the item closes it. `Ctrl K` or `/` opens the search dialog.
  - **Under 768px**: the same flat bar, 56px tall and flush with the top and the sides (it was a floating bar inset 12px with a 16px radius until 2026-11-16). The burger opens a full-height `<dialog>` with one card per section ("Dofus y checklists" for the shared one), each opening in place (an open card's button takes `--color-raised`); the social links sit at the bottom. The dialog's top bar is the header's: `--color-bar`, the same height and side padding, so the lockup does not move and the bar keeps its color when the sheet opens.
  - **Search**: the dialog searches the published quest guides by title, the published achievement pages (Publicada only; one «En preparación» has no page, so it is not searchable) and the metalogros that open, plus what the menu links (sections, Dofus, checklists, classes, dungeons) and the site pages in the Publicada state («Páginas», after the menu groups), accent-insensitive, every word in any order, grouped by type: «Misiones», «Logros», «Metalogros», then the menu groups. Groups go from the best match to the worst with the same title-start ranking; on a tie quests come first, then achievements, metalogros and the menu. An achievement links to its page (`/<slug>`) with «{metalogro} · {n} misiones» as its second line; a metalogro links to its panel (`/metalogros#<anchor>`) with its counts. The status line adds « · {n} logros» and « · {n} metalogros» after the quests. Any group with more than 50 matches shows its best 20, and the line says so for each («más de 50 logros») and ends the found part with «: sigue escribiendo». It shares one engine with the home page's hero search (`src/components/site/search.ts`; spec in the prototype's `tmp/mockups/inicio-v9/SEARCH-SPEC.md`, decided 2026-11-07 with home v9). The hero leaves out the menu's sections, classes and dungeons but searches every other public content type: after quests, achievements and metalogros come the Dofus guides, the checklists and the site pages, with the same rules as the menu (a Dofus or site page only in the Publicada state, a checklist «En preparación» only when it links to Squarespace), from the `content` rows of the shared index, and the status line counts them too (« · {n} Dofus», « · {n} checklists», « · {n} páginas»). With more than one group, each is a listbox group with its title (ARIA APG grouped options), and the arrow keys walk all options in the order they show. The engine and the index load the first time either search is used, and both share one request (see `AGENTS.md`, Next rules). Until the index arrives, the status line says "Cargando las misiones…", also before anything is typed, and the "Ir a" list appears once the search code is in. If loading fails, the line says "No se pudieron cargar las misiones. Vuelve a intentarlo." and the next opening retries.
    - **Matching**: at least 2 letters or digits; with one, the line says "Escribe una letra más para buscar." and nothing is listed. Quests rank by how they match: the title, ignoring opening punctuation (¡ ¿ «), starts with the query; then every word starts a word of the title; then the words appear anywhere. Ties go to the shorter title, then alphabetical.
    - **Cap and status**: up to 50 matching quests all show and the line counts them ("1 misión", "12 misiones"); above 50 the best 20 show and the line says "Más de 50 misiones: sigue escribiendo". Menu matches add " · 2 resultados del menú". With no quest: "Ninguna misión se llama «…». Prueba con otra palabra.", or "Ninguna misión; 2 resultados del menú." when the menu matches.
    - **Results**: each quest has the quest icon, the title and a second line with its level and achievement ("Nivel 20 · La ocasión hace al ladrón"). Every occurrence of every word is marked (`<mark class="hit">`: weight 800 and a 2px `--color-accent` underline, no fill), matched accent-insensitive on the original text. Groups order by their best match, with Misiones first on a tie and the menu groups after it in menu order. The Misiones panel button reads "Buscar una misión".
  - **Links**: pages the app does not have yet link to the Squarespace site with the same slug (`src/lib/site/legacy.ts`). Torre's own links in his texts to `torrentearcano.com/<path>` render relative where this site serves the path and keep the Squarespace address otherwise (`src/lib/site/site-links.ts`, `AGENTS.md`, Redirects).
  - **Search page** (`/buscar?q=…`, 2026-11-18, no mockup: it reuses the hero bar and the dialog's rows): where the home search sends its query without JavaScript. Server markup only, `noindex, follow`, in the site shell: the h1 «Buscar», the label above a field with the query and the filled «Buscar» button (the hero's bar: 2px `--color-well-line` border, `--color-accent` and the focus outline while focused, 14px radius), the `role="status"` line, then the results in the hero's groups and order with the search dialog's rows (`SearchList`, the `<mark class="hit">` marks included). Empty, it asks for a name; with one letter, for two. Styles in `site.css` (`.srch`), which every page loads.
- **Footer** (decided 2026-11-07, same prototype; colors from Torre's color design, option D, 2026-11-16). `SiteFooter` in `src/components/site/`. Its background is `--color-bar` with a 1px `--color-line` top border in dark mode, and `--color-raised` with no border in light mode. Three columns from 1120px, two from 768px, one below:
  - **Torre**: his cut-out avatar (lazy; its shadow is a radial gradient behind it, never a CSS `filter`: with a filter Chrome counts the image as a larger box than it draws, and on a short page like `/checklists` the late portrait became the phone LCP, 3.6 s in Lighthouse CI), "Torre" in `--color-accent-2`, "Juega a Dofus en directo y escribe todas las guías de esta web." and a card that says where he streams. The live state exists since 2026-11-18 (`src/lib/site/live.ts`), but only the home page shows it; this card still says where he streams, not whether he is streaming, until its live version is designed.
  - **Explorar**: the five sections under an accent eyebrow: Misiones y logros, Dofus and Checklists as plain links, Clases and Mazmorras as text with the «Próximamente» tag (see Header).
  - **Comunidad**: the "Únete al Discord" card (a flat `--color-discord` fill, hover `--color-discord-hi`, with its title, line and icon in white; the icon sits in a 20 percent black well), the "Apoya en Ko-fi" card (a flat `--color-kofi` fill, hover `--color-kofi-hi`, with the title, the line and the cup in `--color-kofi-ink`; until 2026-11-16 it had an accent outline and the cup in `--color-accent`, illegible lime on gold once filled), both with a 10px radius, Lexend 700 titles, no border or shadow and `scale(.97)` when pressed, then "Sigue a Torre" with Twitch, Kick and YouTube as inventory slots with their handles, and "Volver arriba". Each link appears once in the footer.
  - **Volver arriba** links to `#arriba`, the id of `<body>`. The page scrolls smoothly to the top (`scroll-behavior: smooth` on `html` under `prefers-reduced-motion: no-preference`; it jumps under reduced motion), and the next Tab lands on the skip link, as on a fresh load. `<html data-scroll-behavior="smooth">` tells Next to turn smooth scrolling off during route changes.
  - **Legal band**: the small Sello lockup, Aviso legal, Política de cookies, Política de privacidad, the copyright year, and the Ankama disclaimer. Each legal link goes to its site page once it is Publicada, and to Torre's Squarespace page while it is «En preparación» or does not exist yet (`legalLinks` in `nav.ts`, from `loadPageNav`).
  - No Instagram. The floating Ko-fi button (below) leaves as the footer comes in.
- **Ko-fi** (2026-11-17, at the user's request; it replaced the anti-pattern «a floating support button»). Besides the footer card, Torre's Ko-fi has a button in the header and a floating one. Both are links to the Ko-fi URL of «Ajustes del sitio» (`socials.kofi.url`, the same as the footer card), open in a new tab with `rel="noopener"` and tell screen readers « (se abre en otra pestaña)». They share the footer card's colors: a flat `--color-kofi` pill (hover `--color-kofi-hi`) with the cup and the text in `--color-kofi-ink` (10.23:1), Lexend 700 at 15px, 44px tall, `scale(.97)` when pressed. A 1px `--color-kofi-line` border gives at least 3:1 against the bar and the page in every theme and mode, and turns `LinkText` under forced colors. `src/components/site/Kofi.tsx`, styles in `site.css`; no JavaScript.
  - **Header button** (`KofiHeaderButton`): first in the right group, before the search. Its accessible name is «Apoya a Torre en Ko-fi (se abre en otra pestaña)». The cup and «Ko-fi» from 768 to 1199px (with the burger) and from 1584px; the cup alone, a 44px circle, from 1280 to 1583px (1535px until the fluid gutters: from 1536 to 1583px the buttons ran up to 31px past the right gutter); not shown from 1200 to 1279px, where the full nav leaves no room, nor under 768px, where the floating button covers it. `tests/e2e/kofi.spec.ts` checks each range for overflow and overlap.
  - **Floating button** (`KofiFloat`): bottom right of every page, the cup and the footer card's title (Torre's `footer.kofiTitle`, «Apoya en Ko-fi»), the cup alone under 640px with the title kept for screen readers. Its right edge sits on the right edge of the page frame, where the content and the header buttons end (plus the safe area), also when a wide screen centers the frame, 16px above the bottom of the screen (plus the safe area), with `--shadow-float`. The layout renders it right before the footer, inside `.kofi-dock`: a box with no height, `position: sticky; bottom: 0`, that the button sticks out of upward. It rides the bottom of the screen down the page and parks on top of the footer when the footer arrives, so it never covers it. Parked there, it fades out over `--duration-base` and turns `visibility: hidden`, and it comes back once it rides the screen again: the dock is a `scroll-state` container and `@container not scroll-state(stuck: bottom)` hides the button. Browsers without scroll-state queries (Safari and Firefox today) leave it parked on the footer, and it scrolls away with the page. It is not a scroll-driven animation on purpose: that animation never finishes, and the E2E helpers that wait for a page's animations to end would wait forever. A page whose footer is on the first screen never shows it, which covers the 404 and the error page on most screens; the 410 page has no layout and no button. No entrance animation: every page load would replay it. Hidden while the home page's result panel is open, and on a Dofus checklist from 1024px, where the diary window fills the screen and its footer («Completar paso», the next step) would sit under it; the header button stays there. Modal dialogs (the search, the phone sheet, the image viewer, the checklist's step sheet) are in the top layer, above it. Not printed.
- **Quest guide** (decided 2026-11-06: guide v5, prototype `tmp/mockups/guia-v5/`, published at https://ta-prototipos.netlify.app/guia-v5/; guide v4 after Torre's review, which replaced option 3 variant B): a flat page, with the content straight on `--color-bg` and no card around it. The free view is the full guide. From top to bottom: the quest header (the quest giver's render, the title, the subtitle, then Prerrequisitos, Necesitarás and Recompensas with the rewards bag); the intro prose; the steps, split by a line; the outro prose and the video. It is one reading column at the left, as wide as the page frame (Layout: the viewport minus the gutters, up to 110rem) at any width, with step text at 75ch and the screenshots filling the row (Layout), 28px from the header (40px from 1024px) and 56px above the page end. Guide v5 dropped the "Pasos" side list and the step numbers. Every part is specified under Quest guide components. There are no achievement tabs, no ticks and no step titles on the page. "Modo compacto" (decided 2026-11-02) is a premium feature that trims the header and the long dialogue blocks; it is enforced on the server like every premium feature (see `AGENTS.md`), so a visitor without the entitlement never receives the compact layout or its toggle.
  - **What renders today** (the page at `/<slug>`, 2026-11-05): only what the guide and its DofusDB quest store. A body with step blocks (the "Paso" block in the panel) renders the blocks before the first step as intro prose, then the steps, then the blocks after the last step as outro prose; a block placed between two steps stays at the end of the step before it, so the reading order never changes. A body without step blocks renders all its blocks in order as prose, with no steps: the page never invents steps from the prose. Fight blocks render where they stand, and the next quest card closes the page when the next quest of the achievement has a published guide (decided 2026-11-06). What is still missing is listed under Content model gaps.
  - **Draft preview**: in draft mode (opened from the panel, see `AGENTS.md`) a bar in `--color-raised` sits above the header with "Vista previa del borrador. Los visitantes ven la versión publicada." and a ghost button "Salir de la vista previa"; the page is `noindex`.
- **Achievement page** (decided 2026-11-07: prototype `tmp/mockups/logro-v2/`, published at https://ta-prototipos.netlify.app/logro-v2/). An achievement page at `/<slug>`, from `achievement-pages`. Since 2026-11-14 it follows option C, «La ficha al lado», of the «Logro más compacto» prototype (`tmp/mockups/logro-v3/`, published at https://ta-prototipos.netlify.app/logro-v3/), chosen by the user and Torre after Torre found the page too long and chaotic: the quests had to show up much sooner. Prerrequisitos, «Necesitarás en total» and «Recompensas del logro» leave the header and form the achievement sheet. From 64rem the page is two columns from gutter to gutter: on the left, taking what the sheet leaves, the breadcrumb, the achievement header, Torre's intro, «Las misiones, en orden», Torre's outro, «Cuenta para» and the previous and next achievement; at the right gutter the sheet, 20rem wide and 48px after the left column, from the top of the breadcrumb down, so it adds no height above the quests. Under 64rem it is one column at the left, as wide as the viewport minus the gutters, in the same order with the sheet between the header and Torre's intro. Its rewards stay visible and Prerrequisitos and «Necesitarás en total» are two rows that open and close. Measured from the top of the breadcrumb to «Las misiones, en orden» on «Cuatro de seis», this went from 1570 to 176px at 1440px and from 2280 to 396px at 390px. (User, 2026-11-10: the metalogro list beside the content was removed; the previous and next achievement move between the achievements of the metalogro. The sheet is not that list: it is this achievement's own facts.) No progress tracking: no checkboxes, counters or «Te toca». Every part is specified under Achievement page components. The page root sets `--color-section: var(--color-sec-logros)`.
- **Metalogros index** (decided 2026-11-07: variant D «Buscador + mosaico», prototype `tmp/mockups/logros-d/` with `tmp/mockups/comun/indice/`, published at https://ta-prototipos.netlify.app/logros-d/). `/metalogros`, from `achievement-groups` and `achievement-pages`. The title «Todos los metalogros», a lead and the totals; the search field; then the metalogros as tiles in three groups: «Misiones generales e historias» in their order, «Zonas» from A to Z and «Eventos de temporada». Specified under Metalogros index components.
- **Dofus guides index** (decided 2026-11-09: prototype `tmp/mockups/guias-dofus/`, published at https://ta-prototipos.netlify.app/guias-dofus/). `/guias-dofus`, from `dofus-guides` and the `dofus-guides-index` global (Torre's intro). The eyebrow «Misiones y logros de cada Dofus», the h1 «Guías de Dofus», Torre's intro, then the search field and the filters (Todos, Primordiales, Evento; only the tags in use) and one collection card per Dofus in Torre's order. No count in the title or the intro: Torre adds Dofus over time. Specified under Dofus guides components.
- **Dofus guide page** (decided 2026-11-09, same prototype; the side list of every Dofus removed on 2026-11-10 at the user's request). A Dofus guide at `/<slug>`, from `dofus-guides`: one column at the left, from gutter to gutter, with the achievement page's gutters. From top to bottom: the breadcrumb «Guías de Dofus», the header (the egg in a slot with a glow in the Dofus color, the h1, «7 logros - 40 misiones - Nivel 180» with the Primordial or Evento tag, and the Prerrequisitos and Recompensas columns as Torre wrote them, side by side from 576px), the checklist card, Torre's intro, Necesitarás, the step-by-step body, «Los logros, en orden» (or «El logro», or «La misión»), the outro, «El vídeo de Torre» and the previous and next Dofus. There is no side column. Everything comes from the collection and what it links; the quests of each achievement come from its achievement page. Live preview as on the quest guides. The page root sets `--color-section: var(--color-sec-dofus)`.
- **Error pages** (2026-11-17): an error inside the site (`src/app/(frontend)/error.tsx`) keeps the header and footer and shows, like the 404, the page title «Algo ha fallado» in Rowdies, one line in `--color-ink-2`, «Volver a intentarlo» as the primary button (it calls Next's `reset`) and «Volver a la portada» as the secondary one. Next loads it on every page, so it stays small: no dependency beyond the button classes. There is no `global-error.tsx`: it added about 1.6 KB of JavaScript to every page, which the guides, at the edge of the 150 KB budget, do not have, so a failure of the layout itself shows Next's default error page.
- **Site page** (2026-11-15, backlog B-09; no new design: the user asked for the quest guide's flat layout). A loose page of Torre's (an emote, a how-to, a legal page) at `/<slug>`, from `pages`: the quest guide's reading column at the left (`.quest`), the breadcrumb («Inicio», and its parent page when it has one that opens), the title as the `h1` in the quest header's type (`.qhead__title`, with the header's bottom line and nothing else of the header), then the body with the quest guide blocks, rendered as on a quest guide (intro prose, steps, outro). No section accent of its own, no next quest card, no progress. The guide page's island (copy coordinates, video, image viewer) is its only client code; live preview as on the quest guides. While a page is «En preparación», `/<slug>` sends the visitor to Torre's Squarespace page (`legacyHref`); with no such link it is a 404. Its body takes the table block too (Quest guide components, Table block), for Torre's tutorials and event guides (backlog D-02).
- **Checklists index** (2026-11-14, ported from the Squarespace hub of `silvestre-checklist`, `src/embeds/hub/`, which the owner preferred to the card grid of 2026-11-13). `/checklists`, from `checklists` and the `checklists-index` global, read as a visitor through `loadChecklists`, the same cached read as the menu. The eyebrow «Paso a paso hasta tu Dofus», the h1 «Checklists», a one-line lead, then one row of posters in Torre's order (the checklist's `order`, the hub's order by default: Silvestre, Hielos, Nebuloso, the «Rush de todos los Dofus», Ocre), with the «???» teaser last when Torre has it on. No count in the title or the lead. Styles in `src/components/checklists/checklists-index.css`, its only stylesheet besides the shell; the island is `ChecklistPostersIsland` (`posters-ui.ts`; the tilt is the shared one in `src/components/ui/tilt.ts`).
  - **Poster**: 3:4 (squatter than the hub's 2:3, which carried a lead line under the name), `--radius-card`, one `<a>` with only the checklist's name (no description). Inside, from the back: the zone scene (`card.scene`, `object-fit: cover`), the NPC peeking from the right and fading downward (`card.npc`; its height, how far it leaves the right edge and its top, in percent of the poster, from `card.npcHeight`, `npcRight`, `npcTop`, defaults 52, -14 and 9), a shade in `--color-bg` from 15 percent at the top to 96 percent at 74 percent, the egg of the checklist's Dofus guide centered at the top (46cqw, at most 7.25rem, since its file is 128px) with a `drop-shadow` glow in the Dofus color, and a holographic foil (`mix-blend-mode: overlay`). A 2px inset border in the Dofus color. The Dofus color is `card.color`, else the guide's color, passed as `--egg`.
  - **Name**: Montserrat 700, `clamp(0.9375rem, 9.5cqw, 1.5rem)`, normal case (the hub's condensed uppercase face is not in the type system), in the Dofus color. The server mixes that color with white (dark) or black (light) until it reaches 4.5:1 on the worst-case shade (`posterInk` in `src/lib/checklists/poster-ink.ts`: each dark theme's `bg` at 96 percent over white art, the lightest of them, and each light theme's `surface` at 92 percent over black art, the darkest; `tests/unit/checklist-poster-ink.test.ts` derives both from `theme.css`), passed as `--egg-ink-dark` and `--egg-ink-light`.
  - **Hover** (mouse only): the poster tilts toward the pointer, up to 9 degrees per axis (`perspective(800px)`, class `is-tilted`), the foil follows the pointer (`--fx`, `--fy`) and goes from 70 to 100 percent opacity, and a glow in the Dofus color fades in (a `::before` layer, so no shadow animates). No tilt under reduced motion or with touch or pen. Pressed: the inner frame scales to .98. Focus: 3px `--color-ink` outline, 4px out.
  - **Progress**: a ring top right (Card, collection) with the browser's weighted percentage in Lilita One and `--color-accent-2`, from `ta-web:progress` and the checklist page's engine, over what that engine needs per published checklist (`src/lib/checklists/poster-progress.ts`). The page ships none of it: the island loads the engine and fetches that data (`GET /api/checklists/poster-progress`) only when the browser has saved progress, and repaints when another tab changes it or the page comes back from the back-forward cache. The server renders it empty and `hidden`, absolutely positioned, so it never shifts layout; nothing shows at 0 percent; 100 percent turns the ring `--color-success`.
  - **En preparación**: one with a `legacyHref` is an ordinary poster that links to Squarespace, with no badge and no progress: for a visitor it is a working checklist. One without it is a plain element with `aria-disabled`, in grayscale with a dashed border and the «En preparación» pill over the art (`--color-surface` at 92 percent with `--color-ink`, `--text-micro` uppercase).
  - **Crown** (the «Rush de todos los Dofus», decided 2026-11-15 with its road): a checklist with `card.crown` (up to six Dofus guides, in Torre's order) shows their eggs instead of the NPC and the single egg, like the old hub's card. The first is large at the top center (40 percent of the poster's width); the next four sit two on each side (22 percent) and the sixth below the center (18 percent), at the hub's positions in `checklists-index.css`. Each egg glows in its guide's color. `pnpm import:checklist-cards` writes the rush's crown: the Vulbis, then the Esmeralda, Púrpura, Turquesa, Marfil and Ébano.
  - **«???» teaser**: Torre's on/off, label («En camino») and text («???»), with a scene and an egg, in the `checklists-index` global. Grayscale, the scene at half brightness, the egg as a black silhouette, the label as the pill; no link, no tilt, no glow.
  - **Layout**: the page takes the height of its content and the footer follows the row. The first two posters load their scene and egg eagerly with `fetchpriority="high"`. One row. The five posters fit from 1024px (at least 9.5rem each, at most 13.5rem, from the left gutter), so the row stays well under the window's height. Narrower, or with more posters, the row scrolls sideways edge to edge with scroll snap, so no poster is ever left alone on a last row: about 2.4 posters on a 390px phone, 3.6 on a tablet, the peek of the next saying the row goes on.
  - **Light mode** (Art cards in light mode): the scene at 55 percent over `--color-surface`, the shade to the surface at 92 percent, the darker name ink and half-strength glows.
  - With no published checklist, a dashed box says «Todavía no hay checklists publicadas.» in place of the row.
- **Dofus checklist** (decided 2026-11-11: prototype A, `tmp/mockups/checklist-a/`). A checklist at `/<slug>`, from `checklists`: the breadcrumb to the Dofus guide, the egg without a frame and its glow in the guide's color, the h1 «Checklist del {name}» and Torre's description. Below sits one window with three tabs: «Diario» (from 1024px the list of steps beside the open step, both scrolling inside the window; on phones the list fills it and a step opens in a bottom sheet), «Prerrequisitos» and «Objetos» (what every step asks for, added up by group; a row that does not count in the totals stays out). The list shows each step's name and Torre's zone under it. A step shows its banner (the start map, its number, its zone and its figure: the image Torre uploaded, or the NPC's render when he uploaded none, named by his optional figure name, else the NPC's name, else the image's alt text), its icon, Torre's text verbatim with his red «Detente aquí» and green «Aquí se resuelve», which steps it closes, Necesitarás by group, its bosses and quests (no achievements section since 2026-11-14, at the user's request: the achievement is linked in Torre's text). Each Necesitarás row is the same whatever its text: «1 ×» and the name on one line (a long name wraps under itself, never under the quantity), and under them, across the text's full width, each alternative («o 1 × Pandapils») and Torre's note («o 30 000 kamas»), in columns of at least 19rem. The step title's size follows its column (`clamp(--text-xl, 8cqi, --text-2xl)`, balanced lines), the zone on the banner wraps to a second line instead of an ellipsis, and so does a long step name in the list. The quest where the step stops lists its objectives with Torre's line in place. Quest givers and coordinates arrive after the page paints. Without JavaScript every step and tab shows, one after another. The Dofus color only tints glows, borders and the banner; text keeps the tokens. Progress lives in the browser (`ta-web:progress`, shared by every checklist) and only shows with JavaScript: the strip above the tabs (the weighted percentage with one decimal, the bar, «N/M pasos» and «Siguiente: N»), a checkbox on each step row, «Completar paso N» in the step footer, the Pendientes, Hechos and Todos filters above the list, a round tick on each quest row that the whole row presses (its name stays a link on top; a quest done elsewhere shows why under its name, «Hecha en el paso N», «Hecha en la checklist del Dofus X» or «La pide “Y”», and cannot be undone there), done objectives struck through up to where the quest stands, a checkbox on each prerequisite with «Marcar todo» and «Limpiar», and a checkbox on each Necesitarás row and Objetos slot. Objetos groups its slots in «Tus próximos pasos» (what the next five pending steps ask for, in an accent frame), «Más adelante» and «Ya utilizados» (hidden while «Solo pasos pendientes» is on), with category chips; a slot not yet owned shows its icon in grayscale. The «⋯» menu sits beside the search field (on phones the search takes its own row with the button at its end, never the button alone on a third row) and opens «Copia de seguridad» (download and restore a JSON file) and «Reiniciar el progreso» (a confirmation dialog that clears only this checklist's steps and quests, prerequisites or items).
  - **One color** (option D, 2026-11-16): a checklist page has no item hues. The window has an 8px radius and a 1px `--color-line` border, as in the prototype. Three parts keep the Dofus-tinted gradients of the old hub on purpose (the user's call, 2026-11-17), the one place where option D's flat surfaces do not apply: the progress strip (`.ck-strip`), the tabs row (`.ck-tabsrow`) and the step banner (`.ck-dh__ban`, `.ck-dh__zone`), whose text keeps its shadow over the map. Step numbers (`.ck-row__n`), the percentage (Rowdies) and the progress fill are `--color-accent`, the zone under a step name is `--color-muted`, the open step row has a 2px inset accent ring on `--color-raised`, and quest cards (`.ck-q`) have a neutral 1px `--color-line` border and 8px radius that turns accent on hover. Icon wells keep the neutral diamond frame, also when they say what they hold (a boss without an image shows the combat icon, whose diamond is hue 1 elsewhere).
  - **Header egg states** (option D): the island writes how the checklist goes on its root, `data-ck-state="todo|doing|done"` on `main.ck` (`progressState` in `src/lib/checklists/progress/state.ts`: 0 is todo, above 0 and under 100 is doing, 100 is done; `paintProgressState` in `progress-shared.ts`, called from `render()` in `progress-ui.ts` and `souls-ui.ts`, so the Ocre does the same). Below 100 percent the egg stays off: grayscale at 45 percent brightness (85 percent and 55 percent opacity in light mode), no glow, and it only floats (`ck-egg-float`, 7px over 3.4s). Without JavaScript, or before the island paints, there is no state and the egg is off and still. At 100 percent it lights up in its real colors with its glow, wiggles twice (`ck-egg-done`, 1.2s) and its glow pulses (`ck-egg-pulse`, 2.4s, infinite). Under reduced motion it shows the final state, off or lit, with no animation. The rush's road egg keeps its own rules (below).
  - **«Rush de todos los Dofus»** (decided 2026-11-15, the prototype `tmp/mockups/rush-todos/`, published at https://ta-prototipos.netlify.app/rush-todos/). A checklist without its own Dofus guide gives several Dofus: its steps' `dofus` are its road, in step order, and step 190 gives two. Its color is `card.color` (the old hub's gold). The breadcrumb only has «Guías de Dofus».
    - **Header egg**: the next Dofus of the road, the first whose step is not done, in grayscale at 60 percent like an item not owned yet (Imagery). A line under the description names it and links its step: «Siguiente Dofus: Dofawa, en el paso 5.» When that step is done, the egg lights up with its glow and a short pulse (600ms, `--ease-out`), and 900ms later the next one rises in (520ms). Step 190 shows both eggs side by side. With every road step done, the last one stays lit and the line says «Camino terminado: … fue el último.». The server renders the first; with JavaScript the egg and the line stay transparent until the island picks the right one (`data-road-ready`), so a visitor with progress never sees the first flash by. `road-ui.ts`, logic in `src/lib/checklists/road.ts`.
    - **«Dofus del camino»**: the last row of the progress strip, under the bar, with a micro heading. One link per road step: its eggs (30px, 34px from 64rem) over its step number, opening that step. Pending eggs are grayscale at 60 percent (in light mode darker, at 80 percent brightness and 90 percent opacity: at 60 percent they nearly vanished on the cream window); done ones glow in their color and pulse once when marked; the next one has a 1.5px accent ring and its number in the accent. The row scrolls sideways inside its own box (`overflow-x: auto`, scroll snap) with faded ends, so the page never scrolls sideways. Eggs sit side by side, never overlapping.
    - **Motion**: under reduced motion nothing pulses or rises, and the next egg replaces the done one at once.
    - A checklist of a single Dofus (`dofusGuide` set) keeps its one egg and has no road row, even if its steps give Dofus.
- **Souls checklist** (the Ocre, «La eterna cosecha», decided 2026-11-14; layout and card decided 2026-11-15, card option A of the prototype `tmp/mockups/ocre-almas/`, published at https://ta-prototipos.netlify.app/ocre-almas/). A checklist of `kind` `souls` at `/<slug>`, with the same header and progress strip as the Dofus checklist (`SoulsParts.tsx`, `souls-ui.ts`, navigation logic in `src/lib/checklists/souls-nav.ts`). It is organized like Torre's old tool (`silvestre-checklist`, `src/tools/cosecha/`), in the site's tokens and both modes.
  - **Tools**: «Por etapa» or «Por región», the Todas, Jefes and Archis filter, the search and «Ocultar las que tengo». The search matches the monster, its dungeon (bosses only), zone and region, accent-insensitive; a number matches that level and «100-150» a range. Its placeholder says so and shows whole down to 360px.
  - **One stage or region at a time.** From 1024px a column beside the panel lists the stages (number, Jefes or Archis, done/total and a thin bar) or the regions (name, done/total and the bar), under the eyebrow «Etapas» or «Regiones». The panel shows the chosen one: its heading («Etapa 1 · Jefes» with the big stage number in accent, or the region's name), «N de M almas», a progress ring with the percentage, the cards, and «Anterior» and «Siguiente» buttons naming the stage or region they open. Below 1024px the list is a row of chips above the panel that scrolls sideways and keeps the chosen chip in view. The type filter changes the list too: only the stages or regions with souls of that type stay, and every count, the panel's «N de M» and the ring count only that type. Regions keep their order (most souls first) under a filter. «Por región» splits the panel by where each soul is fought, as the old tool did: bosses by dungeon, then archmonsters by subzone, each A to Z, each heading with its done/total.
  - **Search** looks through every soul. While it has text, the panel gives way to «Resultados de «…»» with the count, and every stage (or region) with matches shows with only its matches, under its own heading. Choosing a stage or region clears the search.
  - **The URL keeps the choice**: `#etapa=3&tipo=jefes`, `#region=Amakna`, `#por=region`. A reload or a shared link opens the same view, stage or region and filter. The island writes it with `history.replaceState`, so choosing never adds history entries.
  - **Soul card** (option A, Torre's old card in the site's tokens): a fixed-height card with the monster image large in the middle, the name in the display face and «dungeon or zone · Nv. N» under it, both centered and at most two lines each. The copy button sits in the top-left corner and copies the name («Copiado: …» in the toast); the round check sits in the top-right corner. Tapping anywhere else on the card marks it; the copy button never does. A soul not yet owned shows its image in grayscale; an owned one is in color on an accent-tinted card. The checkbox's `aria-label` carries the full text. The card carries no boss or archmonster tag, and nothing replaces it: the filter and the grouping already say it (the user's call, 2026-11-15). Two to five cards per row.
  - **Hiding what you have**: with «Ocultar las que tengo», owned cards fade and shrink out (`data-leave`) before they hide; a soul marked while it is on stays a moment, then leaves. A stage or region with nothing left says «Ya tienes todas las almas de la etapa N.» (or «de esta región»).
  - **Motion** uses transform and opacity only, never a size change. Changing stage or region slides the panel in from the side it comes from (fades in for a filter or view change). Marking a soul pops its check, bounces its image into color and flashes the card border; unmarking shrinks the image a little and back. Completing a stage marks its count and ring in accent, pops them, and throws sparks around the card that completed it; the toast says «¡Etapa N completa!», or «¡Tienes todas las almas!» for the last one. Under reduced motion nothing moves and the toast still shows.
  - Without JavaScript every stage shows one after another, with no list, checks, copy buttons or ring.
- **List pages** (achievements, quests, dungeons, classes): title and subtitle at the left, a toolbar (search with live count, filter pills, "Ocultar hechas"), then a table or card grid.
- **Home** (decided 2026-11-07: prototype `tmp/mockups/inicio-v9/`, published at https://ta-prototipos.netlify.app/inicio-v9/). `src/app/(frontend)/page.tsx` with the sections in `src/components/home/`.
  - **Live strip**: while Torre is live, the first thing under the header links to his Twitch channel; under 640px it is one line, so the search stays on the first screen. The live state comes from Torre's Cloudflare Worker, read on the server and cached for a minute (`src/lib/site/live.ts`, AGENTS.md, Next rules: Revalidate on publish), with the stream title when the worker gives one; a slow or failing worker means not live. `?directo=1` simulates it in development and on dev.
  - **Hero**: the `h1` holds the eyebrow "Guías de Dofus en español" and "Torrente Arcano" (Rowdies 700 uppercase at `--text-hero`, no tracking), the lead, and Torre (172px at most, 1x and 2x) over "¿Qué misión estás haciendo?", the label of the quest search. Beside it (above it under 1024px) the Krosmoz island with the six primordial Dofus. The island is the LCP image on phones: AVIF and WebP at 480, 640 and 960, `fetchpriority="high"`. The island comes before the text in the HTML and each has its own grid cell on desktop, so a paint made while the HTML is still arriving never moves the text (CLS 0.24 in Lighthouse CI when the text came first and `order` lifted the island above it). The eggs bob twice and stop within 5 seconds; nothing moves under reduced motion.
  - **Quest search**: a combobox (WAI-ARIA APG, list autocomplete, no automatic selection) on the shared engine (Search, above). The results float in a panel under the field (`position: absolute`), so opening it, typing, loading or finding nothing never moves the page. Under 1024px an open panel also lays a flat veil of `--color-bg` at 88 percent over the page under the field, so what peeks out below a short panel (half of a two-line heading) does not read as cut; it takes no clicks, so a tap outside still closes the panel. In a bar narrower than 30rem (the hero's column at 1024px) «Buscar» drops its arrow and some padding, so the placeholder shows whole. Arrow keys move the active option (an inset 1.5px `--color-accent` ring on `--color-raised`); an arrow pressed while the list waits to re-rank (90 ms after the last key) ranks it at once and moves in the new list, so a fast typist never loses it, Enter opens it or the first result, Esc closes and a second Esc clears, Tab and a click outside close. A screen reader hears the status from a `role="status"` region 400ms after typing stops. On phones the field scrolls to just under the header and the panel ends above the on-screen keyboard (`visualViewport`). The header's search button stays visible while the field is on screen. Without JavaScript the form sends the query to `/buscar` (Search page, above).
  - **Qué vas a encontrar**: first the quests banner, full width: the four «PNJ representativos» of the metalogros index (Meriana, Enviada de los Doce, Paula Sepe, Draconiros) standing in Astrub's square and breaking the top of the frame, then "Misiones y logros" and "{guides} misiones en {achievements} logros. Búscalas por nombre, zona o historia, de Astrub al Selocalipsis." with both figures in Lilita One and `--color-accent-2`. The figures come from `loadSiteCounts`, the same function as the header's. Then four cards: Guías de Dofus (three eggs), Checklists (three real steps of the Silvestre checklist), Clases (six class heads) and Mazmorras (the Crocantería's last room and the Crunchidor); four in a row from 1280px, 2 × 2 below, with only the title under 640px. Each card's art has an 8px radius and a 2px inset frame in its section color (option D, 2026-11-16). The tour's step numbers take their step's hue (Item hues) as text and border. Card titles are `h3`; the link is the title's text, stretched over the card with `::after`, and the line under it is its `aria-describedby`. Every card links where the header menu links (`SECTIONS` in `nav.ts`). Clases and Mazmorras are «Próximamente» (see Header): the card is a plain `li` (the tag in its title says the state), its art in grayscale at 55 percent, the title in `--color-ink-2` followed by the tag, no link and no hover effect.
  - **Una guía para cada misión**: four numbered points beside a small copy of the real guide of «Seis pies bajo tierra» with the same numbers on its parts (header, coordinates chip, screenshot, Torre's tip). The numbers sit on free corners or after the chip, never on text. Pointing at a point rings its part; on desktop windows at least 840px tall the guide is sticky and the point crossing the middle of the screen rings its part through scroll-driven CSS (`view-timeline`, the ring only changes opacity). No JavaScript: without scroll-driven animations or under reduced motion, the numbers do the pairing.
  - **Checklists para ir a por tu Dofus**: the checklists of the menu (`loadChecklistNav`), in Torre's order, each with its egg, name and description. No figures: step counts change and Torre adds checklists over time. As many per row as fit (three on a 390px phone), shared out evenly between the rows the list needs, so six go three and three, never five and one alone below (`--n` from `ChecklistsSection`, CSS `round()` and container queries; without `round()` the plain auto-fit grid).
  - **Las guías son de Torre**: his portrait, his line, one invitation (the Discord), and the live state: a headline with "Ver directo" while live, otherwise a small notice ("Ahora no está en directo.") above the Twitch, Kick and YouTube links.
  - **Footer on the home page**: no Torre column and no "Sigue a Torre", since the section above says it; the Comunidad cards keep the width they have in the three-column footer (24rem at most) with a 40px icon well. Done in CSS (`body:has(main.home)`), so the footer stays one component.
  - **Motion**: headings, cards and checklists enter on scroll with CSS scroll-driven animations inside `@supports`; nothing moves under reduced motion. The page adds no client JavaScript beyond the hero's search island.

## Components

Every interactive component has these states: default, hover (mouse only), focus-visible, pressed, disabled, and where it applies selected or done. Hover never moves layout; it changes fill, color or a transform.

| Component | Anatomy | States |
|---|---|---|
| Button, primary | decided 2026-11-16 with Torre's color design (option D), replacing the accent outline: a flat `--color-btn` fill with `--color-btn-ink` text (at least 4.5:1 in every theme and mode, `tests/unit/theme-css.test.ts`), Lexend 700, 10px radius, no border, no shadow; 44px high with 24px side padding (`Button`), or the size of its place: the home «Buscar» is 48px and uppercase, «Ver todo» 44px, the checklist's «Siguiente» and «Completar» 40 to 44px; the 404's «Volver a la portada» and the 410 page's are the 44px `ButtonLink`. One per view | hover: `--color-btn-hi` fill; pressed: `scale(.97)` over `--duration-press`, none under reduced motion; focus: the 2px `--color-ink` ring; disabled: 40 percent opacity, no pointer. «Completar» on a done step drops to a `--color-line` outline with `--color-ink-2` text and its tick |
| Button, secondary | pill, 40px, `--color-raised` fill, `--color-ink` text, Lexend 600, optional leading icon. The home's «Ver directo», the checklist's «Marcar todo», backup and reset buttons use it (until 2026-11-17 they kept the accent outline of before option D); reset keeps its text in `--color-danger`, which turns ink on hover (danger on line drops to 3.6:1) | hover: `--color-line` fill (ink on line at least 9.43); pressed: scale |
| Button, ghost | pill, 36px, no fill, `--color-ink-2` text, Lexend 600 | hover: `--color-raised` fill |
| Icon button | 40px circle (44px under `pointer: coarse`), `aria-label` required | as secondary |
| Nav link | pill, 36px, `6px 14px` padding, Lexend 600 in `--color-ink` | hover: `--color-raised` fill and the section color; current section: the section color (Layout, Header) |
| Dropdown panel | 16px radius, opaque `--color-surface` with no blur (the header panels use 20px, Layout), 12px padding, rows of 40px with a 24px game icon | enter and exit per the motion table; Esc and outside click close; arrow keys move |
| Search dialog | native `<dialog>`, 640px wide, input at top, results grouped by type (misión, logro, Dofus, clase) with icons, keyboard selection. The clear × of this and every other search field (checklist, Ocre, Dofus index) is a 16px cross in `--color-muted`, `--color-ink` on hover, never the browser's blue (`globals.css`) | opens on `Ctrl K` or `/`; empty state with recent searches; no-results state with a suggestion |
| Card, collection (Dofus, class, dungeon) | the whole card is one `<a>`; art layer, shade, name in display 600, one line of meta; 1px border in `--color-section`; optional progress ring top right in `--color-accent` with the percentage in Lilita One and `--color-accent-2`. Light-mode treatment below | hover: a soft glow in `--color-section` around the border, art settles from `scale(1.04)` to 1; done: success ring; locked premium: lock badge and the meta says why |
| Stat tile | 14px radius, `--color-raised` fill, optional game icon, number in Lilita One at `--text-figure` in `--color-accent-2` (`white-space: nowrap`), micro label in `--color-ink-2`. The guide page no longer uses it (the XP and kamas rows of Recompensas replaced the Botín tiles); it stays in the catalog for the achievement and checklist pages | static |
| Chip | 22 to 26px pill, `--text-xs`, `--color-raised` fill, `--color-ink-2` text, optional 16px game icon | static; the coordinates chip is its own component (Quest guide components) |
| Segmented tabs | pill track in `--color-raised`; active segment `--color-surface` with `--color-accent` text. The Dofus index filter follows option D instead: a `--color-surface` track with a 1px `--color-line` inset ring and a 12px radius, segments in Lexend 600, and the sliding indicator in `--color-btn` (8px radius, no drop shadow) with the pressed segment's text in `--color-btn-ink`. The fill alone gives 1.67:1 on the track in Amakna light, so the indicator carries an inset 1.5px ring in `--color-btn-ink`: where that ink fades into the track (white on white), the fill itself passes 3:1, so the selected segment always has a 3:1 edge | selected uses `aria-selected` (`aria-pressed` on the filter); arrow keys move between tabs |
| Checkbox | 22px, `--radius-sm`, `--color-muted` border | checked: `--color-accent` fill with a `--color-bg` check mark (at least 5.43:1); pressed: `scale(.9)` for 100ms |
| Progress bar | 10 to 14px track in `--color-bg` (dark) or `--color-raised` with a hairline (light), `--color-accent` fill (at least 4.84:1 against raised, over the 3:1 a fill needs), optional chapter ticks, percentage beside it in Lilita One and `--color-accent-2` | animates `transform: scaleX()` on the fill, never `width` |
| Callout | `--radius-md`, 2px border in its color, its color over a neutral ground of the mode (12 percent over `#141414` in dark mode, 10 percent over white in light mode; until 2026-11-17 it was 9 percent over `--color-bg`, and the gold of «¡Importante!» turned a muddy grey on the bluish grounds of Arcano light and Bonta, `tests/unit/callout-fill.test.ts` keeps each fill within 15 degrees of its color's hue), `16px 20px 18px` padding, `role="note"` named by its title. The title is a plain heading inside the box (Montserrat 600, 1.25rem, `--color-ink`): no ribbon, no tab, no glyph (decided 2026-11-05, guide v4). Text in `--color-ink` (at least 12.64:1 on every fill). In guides, the tip variant renders as Torre's tips instead (Quest guide components) | warning ("¡Importante!"), stop ("¡Alto!"), tip ("Consejo", outside guides) |
| Table | 44px rows, 1px `--color-line` between rows, sticky head row in micro labels, checkbox column first, numbers right-aligned. Torre's tables in guide bodies follow it without the checkbox column and the sticky head (Quest guide components, Table block) | row hover: `--color-raised`; done rows keep their place and tick |
| Tooltip | `--color-raised`, 12px radius, `--text-xs`, 8px offset | shows on hover after 300ms and on focus; never holds the only copy of information |
| Dialog | native `<dialog>` with `showModal()`, 16px radius, `--shadow-dialog`, title in display 600, actions bottom right | confirm destructive actions with a dialog, never `confirm()`; offer "Deshacer" in a toast for 8 seconds after |
| Toast | bottom center, pill or 12px radius, `--color-raised` | auto-dismiss 4 seconds (8 with an undo action); `role="status"` |
| Mode switch | the egg medallion from Dofus Tools, now the dark and light toggle within the chosen theme. The ivory and ebony egg art stay as its two icons; the medallion takes `--color-surface` with a 1px border of `--color-muted` at 70 percent over `--color-line` (at least 3:1 on the bar; `--color-line` gave 1.6:1), so it is light in light mode and dark in dark mode (changed 2026-11-12: a fixed dark fill looked out of place in light mode; until 2026-11-16 it matched the search pill, which now takes `--color-chip`). The knob ring is `--color-accent`. Flat: the eggs carry no glow, and the sparks of a switch are plain dots in `--color-accent` and `--color-accent-2` | `role="switch"` with `aria-checked`; the mode change uses the corner reveal of the old site where View Transitions exist, a plain swap otherwise |
| Theme picker | in the header, right before the mode switch (decided 2026-11-16, option D of the color prototype). A round 40px button (44px on touch screens) with the mode switch's 3:1 border and the emblem's hat in `--color-accent`, plus a chevron in `--color-muted` from 768px. Open, it takes the hover look (`--color-raised` fill, `--color-muted` border), so it differs from the closed button on phones too, where there is no chevron. The menu's label and rows are Lexend (`--font-ui`). Its menu (`--color-surface`, 1px `--color-line`, `--radius-md`, `--shadow-float`, 256px wide under the button; under 768px a fixed panel 16px from the sides, 8px under the header bar) has the micro label «Tema» and one row per free theme: a swatch (the hat in that theme's accent on its `--color-bar`, with its own `data-theme` and the page's `data-mode`, so the tokens resolve inside it), the name, and a check in `--color-accent` on the current one, whose row has the `--color-raised` fill. Ocre is not listed. `src/components/theme-picker/`: the markup is rendered on the server, styles in `theme-picker.css`, which `site.css` imports, and the header island loads its logic (`picker-ui.ts`) with `import()` on first use | a menu button (`aria-haspopup="menu"`, `aria-expanded`, `aria-controls`, named «Tema: <theme>»); rows are `menuitemradio`. Opening focuses the current theme; arrows, Home and End move; Enter or a click applies the theme and keeps the menu open; Escape and a click outside close it and return focus to the button; Tab closes it. Applying sets `data-theme` on `<html>`, writes the `ta-theme` cookie and `localStorage`, and the new colors fade in over the old page with a View Transition (`vt-tema`, 400ms), a plain swap without View Transitions or under reduced motion |
| Tag pill | 22 to 26px pill, `--text-xs`, transparent fill, 1px `--color-accent-2` border and text. Option D fills the tags of the Dofus guides and the metalogros instead: the Dofus «Evento» tag in hue 6 and the primordial one in hue 2 (the guide page's tag pill too), both with `--color-on-hue` text, 6px radius; «En preparación» (`.ztag`, `.acard__prep`) in `--color-chip` with ink text | static, or a link with a hover fill of `--color-raised` |
| Skeleton | blocks in `--color-raised` matching the final layout, used only in client islands and `loading.tsx` | a 1.2s opacity pulse; static under reduced motion |
| Empty state | game art (an NPC or icon), one sentence, one action | e.g. "Aún no has marcado ninguna misión" with "Ver la guía" |

### Art cards in light mode

Decided 2026-11-02: in light mode the art cards are lightened, not kept dark, in every theme.

- **Card**: `--color-surface` under the art, 1px border in `--color-section` (light value, at least 4.62:1 on any light surface, well over the 3:1 a border needs).
- **Art**: zone backgrounds at full color but 55 percent opacity, so they read as a light wash; NPC, boss and egg renders stay at full opacity on top.
- **Shade**: a gradient from transparent to `--color-surface` at 90 percent, covering the part where text sits (bottom on wide cards, left half on mid cards). It replaces the near-black shade of dark mode.
- **Egg and render glow**: `drop-shadow(0 0 10px color-mix(in srgb, var(--color-section) 35%, transparent))`, about half the dark-mode strength (`0 0 18px` at 55 percent). The renders also get `drop-shadow(0 4px 8px rgb(0 0 0 / .18))` so they sit on the card instead of floating.
- **Text on the card**: name in `--color-ink`, meta in `--color-ink-2`. Worst case, black art under a 90 percent surface shade: ink at least 13.23:1 and ink-2 at least 8.15:1 in every light theme. `--color-muted` falls to 4.89:1 there, so muted text is never used on art cards, and the shade never goes under 90 percent. In dark mode the same rule holds: with white art under an 85 percent bg shade, ink stays above 10.7:1 and ink-2 above 6.6:1, while muted drops under 4.5:1.
- **Pills over art** (kicker, level): `--color-surface` at 92 percent with `--color-ink` text, never a dark pill.

### Updated date

Added 2026-11-18 (backlog D-03). The header of a quest guide, an achievement page, a Dofus guide, a site page and a checklist says when Torre last changed the page: «Actualizado el 18 de noviembre de 2026» (`UpdatedDate`, `src/components/ui/UpdatedDate.tsx`). The date sits in a `<time datetime="2026-11-18">`, written in Spanish in Madrid time, the panel's zone. Which date it is: AGENTS.md, Content date.

- **Place**: right under the subtitle, 6px apart (`.qhead__updated`, its own `updated` row in every header grid). Without a subtitle (site pages) it goes under the title. On a checklist it is the last line of the header text, under the description (`.ck-head__updated`).
- **Type**: Montserrat at `--text-sm` (`--text-xs` on the checklist, whose description is already `--text-sm`), in `--color-muted`, which passes over the zone veil.
- **No date, no line.** The souls checklist (the Ocre) has its own header and no line yet.

### Quest guide components

Decided 2026-11-05 from the approved guide v4 prototype, revised 2026-11-06 by guide v5 (it replaced the option 3 variant B components: hero header, level medallion, summary ribbon, step cards with ticks, progress pill and Botín card; v5 removed the step numbers and the "Pasos" side list). They are server components; the only client code is one island that copies coordinates, plays videos, opens images fullscreen and opens and closes the rewards bag (see Coordinates chip, Video facade, Figure and fullscreen viewer, and Quest header). Generic parts live in `src/components/ui/`, game parts in `src/components/game/`. The page root sets `--color-section: var(--color-sec-misiones)`.

Rules shared by all of them:

- **Text never sits on art.** The quest giver's render stands beside the title, and its name is text in the start line under the subtitle.
- **Links** in the header and the prose are underlined, so they never rely on color alone.
- **Focus** follows Accessibility: a 2px `--color-ink` outline, or `--color-accent` on accent-colored controls (the coordinates chip, the copy button).
- **Motion** is CSS only. Every transition below drops to 0.01ms under `prefers-reduced-motion: reduce` through the global rule in `globals.css`.

#### New contrast pairs

Worst case over the five themes, in WCAG 2.x ratios (rechecked 2026-11-16 with the option D palettes; the overlays are measured over white in dark mode and black in light mode).

| Pair | Dark | Light | Needs |
|---|---|---|---|
| accent on well (coordinates chip text) | 6.57 Brâkmar | 4.84 Amakna | 4.5 |
| accent on bg (chip border, links) | 6.79 Brâkmar | 5.43 Amakna | 3 / 4.5 |
| ink-2 on bg (subtitle) | 11.59 Arcano | 9.37 Bonta | 4.5 |
| ink on surface (rewards bag list) | 14.77 Bonta | 16.61 Ocre | 4.5 |
| ink on a callout fill (warning, danger or info over the neutral ground) | 12.64 Ocre | 14.80 Ocre | 4.5 |
| ink on bg 82% over the video poster (play glyph) | 9.75 Bonta | 10.14 Ocre | 3 |
| ink on bg 92% over the page (viewer caption on the backdrop) | 13.59 Bonta | 12.89 Ocre | 4.5 |

#### Quest header

Revised 2026-11-12 after Torre's review (prototype `tmp/mockups/paginas-guia/`, published at https://ta-prototipos.netlify.app/paginas-guia/): a shorter header, with the start line under the subtitle and the facts in one band.

- **Anatomy**: a `<header>` with the `h1` (Rowdies 700 uppercase, `clamp(2rem, 1.45rem + 2.1vw, 3rem)`, line height 1.02, no tracking, `--color-ink`, `text-wrap: balance`), the subtitle in `--color-ink-2`, the start line, and the facts band 18px under it, closed by a 1px `--color-line` rule with 32px above it. The quest giver's render stands alone in a column to the left: 104px wide (112px from 1024px), a 40px gap (44px from 1024px), vertically centered on the text, so it adds no height to the top of the page.
- **Start line**: «Empieza con **Sargento Zaltzom** [-22,-24]» under the subtitle, 6px apart, in `--color-ink-2` at line height 1.5: the NPC name in Montserrat 600 1rem `--color-ink`, then the coordinates chip of the start position (no wrap inside it). Under 576px the chip is hidden, since step 1 right below carries the same one. Without a quest giver render the line still shows, as text only, with no column (decided 2026-11-15: Torre's start NPC and coordinates were hidden on guides whose NPC has no render). The name is Torre's `startNpc`, or the DofusDB NPC's when he wrote none; with no name at all there is no line.
- **Breadcrumb** (decided 2026-11-07 with guide v6, prototype `tmp/mockups/guia-v6/`, published at https://ta-prototipos.netlify.app/guia-v6/): the Breadcrumb of the achievement page (Achievement page components) right above the header, with the guide's parents only: «Metalogros / Astrub / La ocasión hace al ladrón». Under 40rem only the direct parent, «‹ La ocasión hace al ladrón». The achievement is the published achievement page that lists the guide's quest (the first by order if several do); when that page is «En preparación» it has no page, so the breadcrumb ends at the metalogro. A quest in no achievement page has no breadcrumb (`guideBreadcrumb` in `src/lib/achievements/page.ts`).
- **Subtitle**: exactly "Misión de {zona} - Nivel {n} - Misión {k} de {total}", the parts joined with " - ", with no trophy and no link: the breadcrumb names the achievement. The zone is the one Torre wrote in the guide's summary (`summary.zone`) or, when empty, the area of the quest's start map in DofusDB (`quests.zone`, "Astrub"); the level is Torre's (`summary.level`) or the quest's minimum level; the position and the total are the quest's place among the quests of its achievement page (a row of alternatives, such as the class quest, counts as one), or DofusDB's (`quests.achievement`) when the quest has no achievement page. A missing part is left out ("Nivel 20" alone when the quest has no zone and no achievement); with no part at all there is no subtitle. On phones the subtitle wraps between parts, not inside one while it fits, and the " -" ends the line before the break, so a wrapped line never starts with it (`MetaParts` in `src/components/ui/`: each part an inline block, the separator at the end of the previous one).
- **Quest giver**: the NPC that starts the quest, rendered by DofusDB and imported once into Media (see Imagery). From 576px: the render facing right (direction 1) at 84px wide (92px from 1024px), on a flat oval "floor" in `--color-raised` fading to transparent, with nothing under it: the name and the chip are in the start line. Under 576px the header flips: the render facing left (direction 3), 50px wide in a 56px column at least 136px tall (what it took with the name under it), centered, stands right of the title and subtitle, and the start line runs under both. That height absorbs a two-line title that was one line in the fallback font, so the start line and the facts do not move when Montserrat arrives (CLS). The picture uses `<source media="(max-width: 35.99rem)">` for the left-facing render. The render is decorative (`alt=""`). No render, no column: never a placeholder; the start line stays.
- **Facts** (one band since 2026-11-12; stacked from 2026-11-11 until then): three `<section>`s named by their `h2`, in `.facts` inside `.qhead__facts`, which is an inline-size container (`facts`). Under 34rem of band width (phones) they stack, 16px apart. From 34rem, Prerrequisitos and Necesitarás sit side by side (`minmax(0, 1fr) minmax(0, 1.6fr)`, 14px row and 20px column gap) with a 1px `--color-line` rule and 20px before the second, and Recompensas runs as a strip under both, 12px under a 1px `--color-line` rule. From 72rem of band width (about 1600px viewports, since the column reaches the right gutter) Recompensas moves beside the other two, behind the same rule (`fit-content(18rem) minmax(0, 1fr) fit-content(30rem)`), so the header does not grow taller on a wide screen; at 1440px the band is narrower and keeps the strip. With only two facts they share the row (the first `fit-content(18rem)`). Equal thirds were tried and dropped on 2026-11-12: an XP range («1 411 200 a 2 173 360 XP») and a few needed items no longer fit in a third of a 1440px band. Each line is a row at least 40px tall, so the first rows of the facts line up: a 44px slot with the icon, then the text in `--color-ink`, the amounts in Montserrat 800 with tabular figures ("**1 ×** Pico de tofu", "**9 800** a **16 380** XP"). Recompensas has its rows in a wrapping flex line (4px row gap, 24px column gap).
- **Fact titles** (2026-11-12, the same on the achievement and Dofus guide pages): they read as headings, Lexend 700 at 1.125rem, line height 1.3, normal case, 6px above the rows, in the fixed hue of their part (Item hues: Prerrequisitos hue 5, Necesitarás hue 1, Recompensas hue 2). Nothing before them: no bar, chip or accent (the user rejected that as decoration); type alone gives the hierarchy.
  - **Prerrequisitos**: one row per line of the guide's summary, without the final period. A line that names one of the quest's prerequisite quests gets the quest book icon, and links to that quest's guide when it is published. Other lines ("Nivel mínimo 20") are plain text rows with no slot.
  - **Necesitarás**: two lists, items first, then notes, with no box around either.
    - **Items**: the needed items (never quest items, DofusDB super type 14) with their item icon, each copying its name (Item chip and item slot, Copy), in columns of at least 15rem (`repeat(auto-fill, minmax(min(100%, 15rem), 1fr))`, 8px row gap, 24px column gap), at least 13rem inside the band from 34rem: one column beside Prerrequisitos on a guide with a quest giver, two when Necesitarás is wider, one on phones. The quantity keeps its own column, so a name too long for its column wraps under itself, not under «2 ×».
    - **Notes**: 12px below the items, in the same columns but compact: rows at least 28px tall, 4px apart, line height 1.4. A note that starts with a quantity ("1 x Combate (solo).") shows it apart; a note about a combat gets the combat icon in a 28px slot (22px icon). A dungeon note (any note with «mazmorra», even one that also says «combate») gets the same slot with the boss of the dungeon it names, or the dungeon icon when it names no single dungeon (added 2026-11-15): the same matching as «Necesitarás en total» (Achievement page components), and the dungeon Torre picked for that note in this guide («Mazmorras de las notas») wins over the match by name. A slot sits level with the note's first line, which comes down by half the difference between the slot and its line height, so a note that wraps keeps its slot by its first line. Other notes are plain rows.
  - **Recompensas**: Torre's reward fields of the guide (XP, XP mínima, kamas, objects and «Otras recompensas»), each one over the linked quest's DofusDB reward, which fills only what he left empty; a 0 of his removes the figure, and his XP goes with his own minimum, never DofusDB's (`questHeaderProps` in `src/lib/guides/page.ts`). The XP range with the XP arrow, the kamas with the coin stack, the rewards bag with the items in Torre's order (the reverse of DofusDB's), then his other rewards, one plain row per line. With none of them, the guide's rewards text, one plain row per line, never rows made up from it.
    - **By level** (added 2026-11-15): a quest that gives other items depending on the character's level (event quests) shows one line per level tier instead of the loose XP, kamas and bag: Torre's «Por nivel» rows when he wrote two or more, otherwise DofusDB's tiers (`rewards.byLevel`), and with fewer than two the guide looks as above. Each tier is an `<li class="rew-level">` across the whole strip: «Nivel 1 a 109» in Montserrat 700, 0.875rem, `--color-ink-2`, tabular figures, then its rows (XP with the XP arrow, kamas with the coin stack, each item with its slot and «**5 ×** Cupón chocolate») in a wrapping flex line (4px row gap, 16px column gap), denser than the loose rows: 36px tall, a 32px slot, 8px between slot and text. No bag: a tier gives one or two items. Under 34rem of band width the label sits above its rows; from 34rem it takes an 8.5rem column level with the first row. A 1px `--color-line` rule separates tiers; no box, no accent bar. The tier's list is named by its range (`aria-label`) and the visible label is `aria-hidden`, so it is read once. «Otras recompensas» follow the tiers. Nothing moves.
- **Rewards bag** (decided 2026-11-06, guide v5): the item rewards collapse into one row that opens their list. It is a `<button>` (`aria-expanded`, `aria-controls` pointing at the list) holding the game's inventory bag in its slot, "**4** objetos" ("1 objeto" for one) underlined in `--color-muted` (`currentColor` and 2px on hover, with the slot border in `--color-accent`), and a 16px chevron in `--color-ink-2` that turns 180 degrees when open. The list is a `<ul>` named "Objetos de recompensa", one row per item ("**1 ×** Pico de tofu" with its slot), 8px apart. From 576px it opens as a popover 6px under the button: `--color-surface`, 1px `--color-well-line`, 14px radius, `10px 14px 10px 10px` padding, `--shadow-float`, as wide as its longest row up to `min(440px, 100vw - 32px)`. Under 576px it opens inline under the button, without the shadow. It closes on a second click, Esc (focus returns to the button when it was inside), a click outside, or focus leaving it. It opens from the bag's left edge; when that would cross the viewport's right edge (with a 16px margin), the island moves it left by what is missing (`--bag-shift`, set on opening and again whenever the window is resized or the phone rotates while it is open), so it never causes a horizontal scroll. Without JavaScript the list shows under the button: the inline `<head>` script sets `data-js` on `<html>` before first paint, and only then does the CSS hide the closed list with `display: none` (fixed 2026-11-12: a closed list that was only `visibility: hidden` still took room past a 1024px window and gave the page a horizontal scroll). `display` transitions with `allow-discrete`, so the list stays painted while it leaves; closed, it is out of the layout, the tab order and the accessibility tree, and its item icons load when it first opens. The state lives in the button's `aria-expanded`, toggled by the guide island. No item rewards, no bag. Motion: the popover enters from `translateY(-6px) scale(.97)` and opacity 0 over `--duration-base` `--ease-out` (`@starting-style`), and leaves over 150ms.
- **XP range** (decided 2026-11-05): "9 800 a 16 380 XP" is the XP at the step's optimal level up to the XP at the cap, 1.5 times the optimal level, summed over the quest's steps with the game client's formula (`src/lib/dofusdb/quest-rewards.ts`, as DofusDB and Ganymede compute it). The quest stores both: `rewards.experienceMin` and `rewards.experience` (the level 200 value, which is the cap). When they are equal, or the minimum is missing, one figure. Kamas stay a single figure, the optimal level's, as on DofusDB. A level tier's XP and kamas are those of the tier's highest level: the XP weighs 30 percent the lower of that level and the optimal and 70 percent the higher, capped at 1.5 times the lower, and kamas that scale with the character use that level up to the optimal, which gives Torre's figures for every tier («1 329 586 XP» and «14 041 kamas» at 109 in La crisis de fe).
- **Empty parts** are left out: a fact with no rows is not rendered, nor is an empty item or note list of Necesitarás, and with no fact at all there is no facts block.
- **Motion**: none. The title never animates in.

#### Icon slots and game icons

- **Slot**: 44px, 10px radius, `--color-slot` with a 1px `--color-slot-line` border, `aria-hidden`. The icon inside is drawn at 34px, or at its file size when the file is smaller, never upscaled, also with the 110 percent root (Tokens, Root size). A missing item icon leaves the slot empty.
- **Game icons**: a fixed set of original game files, converted losslessly to WebP in `public/img/game/` and listed with their source in `src/components/game/game-icons.ts`. Never copies from fan sites.

| Icon | File | Source | Size |
|---|---|---|---|
| Combat | `combate.webp` | Dofus 3 client, `statistics/2x/21-96.png` (dofusdude/dofus3-main 3.7.13.17, `statistics_images_96`) | 96px |
| Kamas | `kamas.webp` | Dofus 3 client, `statistics/2x/78-96.png` (same export) | 96px |
| Quest book | `mision.webp` | `dofusdb.fr/icons/icon_quests.png` (game UI) | 70px |
| XP arrow | `xp.webp` | Dofus 3 client, `ui/guidebook/feature_494-24.png` (`ui_guidebook_images`) | 24px |
| Achievement trophy | `logro.webp` | Dofus 3 client, `misc/guildrank/87-28.png` (`misc_images`) | 28px |
| Inventory bag | `bolsa.webp` | Dofus 3 client, `ui/guidebook/feature_139-24.png` (`ui_guidebook_images`) | 24px |
| Dungeon | `jefes/crunchidor.webp` | the Crunchidor from DofusDB, the same art as Mazmorras in the header (`src/components/site/nav.ts`); 120 × 144px, drawn contained in the 34px box. «Necesitarás en total», the Dofus guides' Necesitarás and the quest header's notes use it only for a dungeon note that names no single dungeon; the others show their boss (Achievement page components, Dofus guides components, Quest header) | 120px |

The XP arrow, the inventory bag and the trophy only exist at 24 and 28px in the client exports, so they render at that size: the arrow and the bag at 24px in their slots, the trophy at 22px in the subtitle. Torre's avatar for his tips is `public/img/torre/avatar.webp`, 144px, from his own avatar.

#### Item chip and item slot

Two sizes of the same thing: a game item with its icon, quantity and name. Item icons come from our own media (Imagery); a missing icon leaves an empty well, never a placeholder glyph.

- **Item chip** (ribbon, prose): 32px pill, `--color-raised`, 24px icon inset 4px from the left edge, name in `--text-xs` 600 `--color-ink`, then `× 1` in `--color-ink-2` 500. The name copies itself (see Copy below).
- **Item slot** (catalog; the guide page uses the row of Quest header): a 72px well (`--radius-sm`, `--color-raised`, 1px `--color-line`) with the 48px icon; the quantity in Lilita One 0.9375rem `--color-accent-2` in the bottom-right corner, as in the game's inventory; the name under the well, centered, `--text-xs` `--color-ink-2`. Slots are 104 to 112px wide. The name copies itself (see Copy below).
- **Copy** (decided 2026-11-09, made quiet the same day after the user's review): every needed item copies its name, without the quantity, so the player clicks it and pastes the name in the game's search. That is each item row of Necesitarás (the quest header and the achievement page's «Necesitarás en total»), the item chip and the item slot; free-text notes and the rewards bag copy nothing. The name is the control (`CopyName` in `src/components/game/Item.tsx`): the guide's island (`PageEnhancements`) turns it into a button through the same `data-copy` as the coordinates chip, named «Copiar Pluma de Kwak de viento», and its `::after` covers the whole row, chip or slot (`copyhost`), so the icon copies too, with at least a 40px target (44px under `pointer: coarse`).
  - **At rest** the item looks exactly as before: no glyph, no button chrome. Only `cursor: pointer` says it does something.
  - **Hover** (mouse only, `@media (hover: hover) and (pointer: fine)`) on the name or its icon: the name takes `--color-accent` with a 1px underline, a 14px copy glyph fades in right after it (opacity only, `--duration-fast`; not in the chip, where «× 1» follows the name), and the icon's slot gets a faint ring (1px, `--color-accent` at 55 percent). `:focus-visible` shows the same cue plus the standard focus outline. Pressed: `scale(.96)`.
  - **After copying** the glyph turns into a check for 1.6 s (`data-copied`) and the status region announces «Copiado: Pluma de Kwak de viento»; when the clipboard fails it says «No se pudo copiar. Busca «Pluma de Kwak de viento» en el juego.» (`data-copy-failed`).
  - **Touch screens**: no extra chrome; a tap copies and the status shows.
  - **Without JavaScript** it stays text and the glyphs are not drawn.
- **Quantities**: always shown, also `1`; thousands split with a space (`1 000`).
- **Accessibility**: icons have `alt=""` because the name is text next to them. The slot puts the quantity in a visually hidden prefix so it reads "1 × Pico de tofu"; the drawn quantity is `aria-hidden`.
- **Missing or not-owned items** (checklists later): the icon in `grayscale(1)` at 60 percent opacity, as Imagery says.

#### Monster chip and fight block

Decided 2026-11-06 with guide v5: a fight is a list of rows like the header's, not raised chips.

- **Fight block** (`fight`, "Combate" in the panel, allowed in the body and inside a step): monsters from the Monsters collection, each with a quantity (at least 1). The intro line stays in the text before it ("Vas a empezar una lucha contra:").
- **Anatomy**: a `<ul>` that wraps (8px row gap, 28px column gap). Each monster is a row: a 52px slot (`--color-slot`, 10px radius, like Icon slots) with the monster image at 42px, never upscaled, then "**1 ×** Ramán famélico" in `--color-ink`, the quantity in 800 with tabular figures. No level. A monster without an imported image leaves its slot empty.
- **From the import**: `pnpm import:guides` turns a list right after a paragraph ending in "lucha contra:" into the block when every row reads "N x Name" and every name matches a monster in DofusDB's Spanish names (case, extra spaces and a final period ignored; the lowest DofusDB ID wins a tie). One unmatched name keeps the whole list as text and is reported as an oddity ("Monstruo sin casar en un combate: …"). Guides imported before the block existed are converted by `pnpm guides:backfill` (`scripts/backfill-guides.ts`, shared code in `src/lib/guides/fight-lists.ts`).
- **States**: static. **Accessibility**: the list is a list; images have `alt=""`, since the name is text. **Motion**: none.

#### Coordinates chip

- **Anatomy**: an inline 32px chip, 8px radius, `--color-well` fill, a 1.5px `--color-accent` border, a 16px pin icon then the coordinates in Montserrat 800 at 0.9375rem with tabular figures, in `--color-accent` (at least 4.84:1 on the well). The label is the game's notation, `[7,-19]`.
- **What it copies**: `/travel 7,-19`. Pasted in the game chat it sets the autopilot, which is what a reader following a guide wants. The `[x,y]` map link stays as the visible label only; there is no second control to copy it. The start position uses the same chip, under the quest giver.
- **Coordinates in prose**: the renderer of the guide body turns every `[x,y]` written in a text node into a chip. The pattern is two signed integers in square brackets with optional spaces (`[7,-19]`, `[ -1 , 17 ]`); anything else stays text: decimals, a single number, three numbers, or coordinates inside a link or code. A step whose own X and Y do not appear in its text shows them as a chip on the first line of the step.
- **Without JavaScript**: the chip renders as plain text, readable and selectable. The island then turns each chip into a button (`role="button"`, `tabindex="0"`, Enter and Space) and gives it the name `[7,-19], copiar /travel 7,-19`, which starts with the visible text.
- **Feedback**: on copy, a toast "Copiado: /travel 7,-19" in a `role="status"` region (Toast). If the clipboard is refused, the toast says "Escribe /travel 7,-19 en el chat".
- **States**: hover (mouse only) fills it with `--color-raised`; pressed `scale(.95)` over `--duration-press`; focus-visible a 2px `--color-accent` outline. A transparent `::after` grows the target to 44px tall, centered on the chip, without changing the drawn chip or the line height.
- **Motion**: fill over `--duration-fast`; the toast enters per the motion table.

#### Steps

Decided 2026-11-05 (guide v4), revised 2026-11-06 (guide v5): the section is called "Pasos" everywhere a reader or Torre sees it; the panel block is `step` ("Paso"). Steps have no number, no title and no tick on the page, and there is no side list.

- **Anatomy**: a `<section>` named by a visually hidden `h2` "Pasos", holding an `<ol>` 8px under the header. Each step has 32px of padding above and below and a 1px `--color-line` rule on top; the first step has no rule and 28px on top. Inside, the step's blocks are 18px apart, prose in `--color-ink` at most 75ch (`--measure`, since 2026-11-17; from 2026-11-12 it ran as wide as the row of images, which on wide screens made lines too long to read). The `<ol>` gives screen readers the count.
- **Screenshots** (two per row since 2026-11-12, Torre's review; the old site's size since 2026-11-16; filling the row since 2026-11-17): consecutive Image blocks of a step go in one grid (`.figs`, built by `GuideBlocks`): one per row on phones, then equal columns that fill the step from gutter to gutter, 16px apart, 12px radius, `--shadow-art`. The step body is an inline-size container (`step`): two columns, three from 81rem of row, four from 122rem and five from 163rem, so no screenshot in a group of three or more is wider than `--width-shot-max` (704px from 1024px). With the fluid gutters and the 110rem frame the row never reaches 122rem, so a group shows 639 × 376px at 1440px, 507px at 1728px, 564px at 1920px, 634px at 2560px, 450px at 1024px and 358px at 390px. A pair always fills the row: each image is half the row minus half the gap (639px at 1440px, 769px at 1728px, 855px at 1920px, 959px at 2560px), so the second ends at the right gutter. A group of three or four with room for more columns keeps one column per image, up to `--width-shot-max`, with the rest of the row empty. A single image stays at the old site's size, `--width-shot` (634px), or half the row when that is less. Torre's Squarespace site showed them at 634 × 374, 455 × 297 and 343 × 199. From 640px every box is the same shape: `aspect-ratio: 17 / 10`, `object-fit: cover`, centered, like Squarespace's «rellenar». 17:10 is the old site's crop at 1440px; Torre's screenshots range from 1.35 to 1.71 (median about 1.57), so it crops about 4 percent top and bottom of a median one and 10 percent of the squarest; the viewer shows the whole original. On phones nothing is cropped. The step text stops at 75ch and starts at the left gutter like the images. A step with text and one image puts the text above and the image below, never beside the text. Text between images splits them into separate grids. Images outside steps (intro, outro) stop at `--width-media` (968px from 1024px); the videos (the guide's, the achievement page's and the Dofus guide's) grow up to `--width-video` (1425.6px from 1024px), two screenshot columns.
- **Anchor**: each step is `id="paso-N"`, with `scroll-margin-top: 88px`.
- **Fields**: the block has no title, only X, Y and its blocks (the optional panel-only title was removed on 2026-11-07; the migration moved the 4 imported titles into their steps as a first bold paragraph). The block's X and Y show as a chip on the first line only when the text does not already name them.
- **Start sentence**: the importer moves a bare start line ("Habla con Hupe Esse [7,-19] para empezar la misión.") from the body to `summary.startNpc`, `startX` and `startY`, which left step 1 with only its chip. When the first step has no text, the guide has a start NPC and the step's X and Y equal the start coordinates, the page writes that line back around the chip: "Habla con **{NPC}** [x,y] para empezar la misión." Any other step 1 renders as usual (`startSentenceNpc` in `src/lib/guides/step-nav.ts`).

#### Callouts and Torre's tips

- **Callout** ("¡Importante!", "¡Alto!"): as the Callout row of the components table, 18px from the blocks around it inside a step.
- **Torre's tips** (`TorreTips`): the tip callout of a guide is Torre speaking. His avatar in a 72px circle (2px `--color-well-line` ring, `alt=""`, lazy), then a speech bubble 18px away: `--color-surface`, a 2px border in hue 6 (option D, 2026-11-16), 8px radius, `18px 22px 20px` padding, with a caret pointing at the avatar. The caret (`::before`) is a 16px square turned 45 degrees with the same 2px border on its two outer sides, its center on the middle of the box's border (`calc(-0.5rem - 1px)`), so its fill covers the box border inside it and the outline is never cut. Inside, the heading "Recomendaciones de Torre" (Montserrat 600, 1.25rem, `--color-ink`) and the text in `--color-ink`; its lists have hollow circle markers in `--color-accent`, items 10px apart. Inside a step it sits 32px under the block above it. An `<aside>` named by that heading. Under 640px the avatar (56px) sits above the bubble and the caret points up, at the same offset from the top.
- The importer turns "NOTA" paragraphs and Torre's "RECOMENDACIONES" sections into tips (`README.md`, Guide import notes).

#### Table block

Decided 2026-11-18 (backlog D-02; no mockup round: it follows the Table row of the components table and the flat surfaces of option D). Torre's tables for tutorials and event guides, like the 146-row pets table on duffus.fr. The panel block is `table` («Tabla»), offered wherever the other body blocks are: quest guides, Dofus guides, site pages, class and dungeon pages, and inside a step. `GuideTable` in `src/components/game/GuideTable.tsx` renders it on the server with no client code; its CSS lives in `game.css`, which those pages already load.

- **Markup**: a real `<table>`. Column headers are `<th scope="col">` in a `<thead>`; with «La primera columna nombra cada fila» on, each row's first cell is a `<th scope="row">`. The box (`.gtable`) holds the title (`.gtable__title`) and, under it, the scrolling region: a `div` with `role="region"` and `tabindex="0"` (`.gtable__scroll`) around the table. The title sits outside the region, so it stays put while the cells scroll sideways; a `<caption>` scrolled away with them (2026-11-18, the owner's 390px review). The region and the table are both named by the title (`aria-labelledby`), and the title itself is `aria-hidden`, so a screen reader hears it as those two names and not a third time as loose text. Without a title there is no title element, the table has no name of its own and the region is «Tabla:» plus its column headers. The tab stop lets a keyboard user scroll a wide table with the arrow keys.
- **Box**: a flat `--color-surface` box with a 1px `--color-line` border and `--radius-md`, no shadow. It is as wide as the table and at most as wide as the column, left aligned. The title never widens it (`contain: inline-size`): a long title wraps at the table's width, as a caption did. The region rounds its bottom corners to the box's, so a hovered last row does not poke out. Tables may go wider than prose, but a text cell wraps at 40ch, so a column of sentences keeps a reading measure on a wide screen.
- **Rows**: 44px rows with a 1px `--color-line` rule between them, no zebra. The rules are decorative: the cells and their headers carry the structure, so they need no 3:1 ratio. On a mouse, row hover fills the row with `--color-raised`.
- **Type**: the title in Lexend 700 at `--text-lg`, `--color-ink`. Column headers in micro labels (Montserrat 600, `--text-micro`, uppercase, 0.12em tracking) in `--color-muted`, bottom aligned. Cells in Montserrat at `--text-sm`, `--color-ink`, with tabular figures; row headers in 600. Text cells are at least 7rem wide, so a short sentence never ends up one word per line.
- **Alignment**: each column is «Izquierda», «Centro» or «Derecha (cifras)». Right aligned cells do not wrap («1 350» stays whole). The paste helper right-aligns a column whose filled cells are all figures.
- **Narrow screens**: under 48rem the table keeps each column's natural width (40ch at most) and scrolls sideways inside its region, under the title, which stays in view; the page never scrolls sideways (390px: a six-column table is about 940px wide in a 356px box). With row headers on, the first column is sticky at the left edge (`--z-raised`, surface fill, a 1px `--color-line` rule on its right), so a row keeps its name while the reader scrolls. Squeezing the table into the screen instead gave rows six lines tall.
- **No sticky head row**: the Table row of the components table has one, but the region that scrolls sideways is also the head's scroll container, so the head would stick to the region, not the page. A box with its own height and vertical scroll would trap the reader in a nested scroll and clip the printout. Not worth it.
- **Print**: the title, then the whole table: no scrolling, no sticky column, the table at the sheet's width, the title kept with the first rows and no row split across two sheets (Print).
- **Panel**: an optional «Título», «Pegar desde una hoja de cálculo», the row header checkbox, «Columnas» (each an «Encabezado», required, and its «Alineación») and «Filas» (each a list of «Celdas», one text per column). A row may have fewer cells than columns (the rest render empty), never more: saving says which row has too many. Rows start folded and are labelled by their first cells («Fila 3: Tofu · 12 · Astrub»), so Torre finds one among 146 without opening them. «Pegar desde una hoja de cálculo» is a `ui` field (`src/components/admin/TablePaste.tsx`, nothing stored): Torre pastes cells copied from Google Sheets, Excel or a table on another website, and «Rellenar la tabla» replaces the block's columns and rows in the form, without saving. The first pasted row is the headers, quoted cells keep their line breaks as spaces, empty rows and trailing empty columns go, and an empty header becomes «Columna N» for Torre to rename (`parseSpreadsheet` in `src/lib/guides/table-paste.ts`). 146 rows of five cells fill in about 1.5 s.

#### Figure and fullscreen viewer

Decided 2026-11-05: every guide image opens fullscreen. The component is `Figure` in `src/components/ui/`; the viewer lives in the guide island (`PageEnhancements`).

- **Anatomy**: a `<figure>` holding a link around the image (`<picture>`, AVIF then WebP) and the optional `<figcaption>`. The link is a block with the image's `--radius-card` and a `zoom-in` cursor; nothing else is drawn on it.
- **Without JavaScript**: the link points at the original upload (`ImageAsset.original`; the widest WebP for files without one, such as the `/sistema` catalog), so the image still opens, in the same tab. The link carries the original's size in `data-image-width` and `data-image-height`.
- **Viewer**: with the island, a click (no modifier key) opens a native `<dialog>` with `showModal()`. The dialog covers the viewport and is transparent; its `::backdrop` is `--color-bg` at 92 percent. Inside: the original upload (decided 2026-11-12, replacing the widest WebP), scaled to fit the viewport and at most twice its natural size, never cropped: its width is `min(2 × width, the space left, the height left × its ratio)` from `--w` and `--h` (its size from the link) with its `aspect-ratio`, `--radius-md`, `--color-raised` while it loads; the caption under it in `--text-sm` `--color-ink`, centered, at most 72ch, and an Icon button "Cerrar" 12px from the top right corner. The page reserves 64px on top for the button, 16px on the other sides (32px from 768px) and 4rem under the image for the caption. The dialog copies `data-theme` and `data-mode` from the nearest ancestor that has them, so it matches the theme of the image it shows (the `/sistema` sections; on guide pages that is `<html>`).
- **States**: link default and focus-visible (the global 2px `--color-ink` outline, following the radius); viewer closed and open. No hover change on the link beyond the cursor.
- **Closing**: Esc (native), the "Cerrar" button, or a click anywhere outside the image, the caption and the button (the click lands on the dialog itself). Focus then returns to the link that opened it.
- **Accessibility**: the link's name is "Ver imagen a pantalla completa: {alt}" ("Ver imagen a pantalla completa" when the alt is empty), from `uiStrings.figure`. The dialog is named "Imagen a pantalla completa"; the image inside keeps the media record's alt. `showModal()` makes the page inert and moves focus to "Cerrar". The caption, `--color-ink` on the backdrop, keeps at least 12.75:1 (New contrast pairs).
- **Motion**: the backdrop fades in over `--duration-fast`; the image and caption enter from `opacity: 0; transform: translateY(12px) scale(.98)` over `--duration-slow` `--ease-out` (Motion, Dialogs), through `@starting-style`. Closing runs the same way back over `--duration-base` with `--ease-in` while the backdrop fades; the closed dialog keeps its image, so the exit is seen. Under reduced motion the global rule, which also covers `::backdrop`, drops both to 0.01ms.
- **Priority**: the first image of a guide body, in document order, loads with `fetchpriority="high"` and no lazy loading, whether it is an Image block or an image inside a text or callout block. Exactly one image gets it. On phones it is usually below the header, and the LCP is the title; the rest stay lazy. The quest giver's render loads eagerly without `fetchpriority`.
- **Budget**: the viewer adds a few hundred bytes to the island and no dependency. On the page the browser picks the width the column needs through `srcset` and `sizes`; the viewer always loads the original (Imagery).

#### Video facade

- **Anatomy**: a `<figure>` with a 16:9 frame (`--radius-card`, `--shadow-art`, `--color-raised`) holding a link: the poster image (`object-fit: cover`, `alt=""`) and a 72px play badge centered on it (`--color-bg` at 82 percent, 2px `--color-accent` ring, a triangle in `--color-ink`). The caption under it: the video title and "YouTube, Torrente Arcano" in `--text-sm` `--color-muted`.
- **No third-party code until the click**: the page loads no iframe, script or image from YouTube. The poster is our own copy of the thumbnail, stored as media; without one, the frame shows the play badge and the title on `--color-raised`, the title centered under the badge (`--text-lg` under 640px, `--text-xl` above, at most two lines), never over it.
- **Without JavaScript** the link opens the video on YouTube. With the island, a click swaps the link for a `youtube-nocookie.com` iframe with `autoplay=1`, the same title and `allow="autoplay; encrypted-media; picture-in-picture"`, and moves focus into it. The iframe fades in over the poster (`--duration-slow`, `@starting-style`): the link stays under it, `inert` instead of `hidden`, so the poster is still there while the player appears and the link leaves the tab order and the accessibility tree.
- **YouTube only** (decided 2026-11-05): guide videos are YouTube videos. All 44 video embeds in the 1796 legacy Squarespace pages are YouTube (21 of them wrapped in Embedly), so the video block in the panel accepts only an https link that resolves to a YouTube video ID (`youtube.com/watch`, `youtu.be`, `/embed/`, `/shorts/`). If stored data ever holds another URL, the component renders a plain link with the title as a defensive fallback; it is not a supported case.
- **States**: hover (mouse only) scales the badge to 1.06 over `--duration-fast`; focus-visible is a 3px `--color-ink` outline offset -3px inside the frame.
- **Accessibility**: the link's name is "Ver el vídeo: {title}"; the iframe gets the video title.

#### Achievement chain

- **Anatomy**: one line in `--text-sm` `--color-ink-2`: the achievement's 24px icon, "Logro" and the achievement as a link, then "misión 2 de 3:" and the quests of the chain in order, separated by `→` in `--color-ink-2`. Other quests are links; the current one is `--color-ink` 600 text with `aria-current="page"`.
- **Long chains** (more than five quests) show the first, the one before, the current, the one after and the last, with `…` between gaps.
- **Accessibility**: a `<nav aria-label="Cadena del logro">` with an `<ol>`; the arrows are CSS, so a screen reader hears a numbered list. **Motion**: none.

#### Next quest card

Decided 2026-11-06 with guide v5. It closes the guide, 24px under the outro.

- **Data**: the quest in the next position of the same achievement (DofusDB's order, stored per quest as `quests.achievement.position`), only when it has a published guide. The title and link are that guide's; "Nivel {n}" is the next quest's minimum level; "Te la da {NPC} [x,y]" is its first start position in DofusDB; the art is the first image of the next guide, in reading order. A missing part is left out; no next quest, or no published guide, no card (`nextQuestCard` in `src/lib/guides/page.ts`, `findNextQuest` in `src/lib/guides/queries.ts`).
- **Anatomy**: the whole card is one link. `--color-surface`, 1px `--color-well-line`, 8px radius (option D). The previous and next cards of achievement and Dofus guide pages take a 2px border and the kicker in their hue (Item hues). From 640px the art takes 280px on the left (at least 168px tall, `object-fit: cover`); below it sits on top at 16:10. The text, `20px 24px 22px` padding, 6px apart: "Siguiente misión" (1rem `--color-ink-2`), the title (Montserrat 600, `clamp(1.625rem, 1.3rem + 1.2vw, 2.125rem)`, line height 1.05) and "Nivel **25**. Te la da Kerubim Crepin **[3,-17]** al terminar esta." in `--color-ink-2` with the figures in `--color-ink`. The coordinates are plain text here, since a button cannot sit inside a link.
- **States**: hover (mouse only) turns the border `--color-accent` (a previous or next card keeps its hue), fills `--color-raised`, lifts the card 2px (not under reduced motion; the cards that tilt never lift) and the art settles from `scale(1.04)` to 1 over 600ms; focus-visible is a 3px `--color-ink` outline 4px out.

#### Content model gaps

The components above need data the guide does not store yet:

| Part | Needs |
|---|---|
| Video poster | the thumbnail stored as media at import |

### Achievement page components

Decided 2026-11-07 from the logro v2 prototype. Server components in `src/components/achievement/` and `src/components/site/Breadcrumb.tsx`; the only client code is the guide island, for the rewards bag and to keep the sheet open from 64rem. What each part shows comes from `achievementPageView` (`src/lib/achievements/page.ts`).

- **Breadcrumb** (shared with the quest guide): a `<nav aria-label="Ruta de navegación">` with an `<ol role="list">` of the parents only, since the h1 below names the page: «Metalogros / Astrub». Links are `--text-sm` 500 in `--color-accent`, underlined 1px (2px on hover), at least 40px tall, with «/» in `--color-muted` between them drawn by `::before`. 12px above the h1. Under 40rem only the direct parent shows, as a back link «‹ Astrub» 44px tall that may wrap and is never truncated. A JSON-LD `BreadcrumbList` with the current page goes inside the nav. Metalogros links to `/metalogros` and the metalogro to its panel there (`/metalogros#astrub`).
- **Achievement header**: the quest header with the achievement's icon where the quest giver stands (a page Torre wrote without a DofusDB achievement has no icon: the slot stays empty, as in Icon wells), in a slot (56px, 68px from 576px, `--color-slot`, 14 to 16px radius), the h1 and the subtitle «3 misiones - Niveles 15 a 25 - 10 puntos» (the parts joined with « - »; a missing part is left out). Nothing else: the facts are in the sheet (`AchievementHeader`, `lhead--logro`). Under 64rem a 1px `--color-line` rule closes it 20px under the subtitle; from 64rem it has no rule and «Las misiones, en orden» starts 28px under it, after its own rule.
- **Achievement sheet** (`AchievementSheet`, decided 2026-11-14 with option C): Prerrequisitos, «Necesitarás en total» and «Recompensas del logro», in that order (rewards last since 2026-11-14, at the user's request). Each part is a `<section>` named by its `h2` (Montserrat 700, 1.0625rem, `--color-ink`). The rows are denser than the quest header's: 32px slots with 24px icons, text at 15px, rows 4px apart. The rewards are the achievement's for a level 200 character: one XP figure, kamas and the rewards bag (the quest header's, with its popover), in one wrapping row, and they are always visible. Prerrequisitos are Torre's own rows when he wrote any (`prerequisites` on the achievement page: his text, linked to the quest guide he picked when a visitor can see it); otherwise they are the previous quests from outside the achievement, linked to their guide when published, with the quest icon. Prerrequisitos and «Necesitarás en total» are each a native `<details>` whose `<summary>` holds the `h2` and a chevron; the HTML always renders them closed. Under 64rem the sheet is three rows, each closed by a 1px `--color-line` rule: the two folded parts, 52px tall, that open and close on a click, then the rewards with their title over them. Opening slides the height (`::details-content` with `interpolate-size`) over `--duration-base` and turns the chevron; with reduced motion nothing moves, and a browser without `::details-content` opens at once. The summaries carry no counts. The rule under the last row stands in for the top rule of «Las misiones, en orden» when the quests follow the sheet directly. From 64rem the sheet sits in its own column with a 1px rule on its left and 32px inside it; that rule splits two columns, so it takes `--color-muted` at 70 percent over `--color-line`, at least 3:1 on `bg` and `surface` in every theme and mode (`--color-line` alone faded into the zone background in dark mode); its parts stack with a rule and 20px between them, every part open and no chevron. The CSS shows the content of a closed `<details>` there, so it is open without JavaScript and before the island runs; the island then sets `open` (so assistive tech hears it expanded) and stops a click on the summary from folding it. Back under 64rem the island folds them again. An empty part is left out; with no part at all there is no sheet, and the page is the single 880px column (`hasSheet`).
- **Necesitarás en total** (in the sheet since 2026-11-14): up to three groups, each an `h3` (Lexend 600, 1rem, `--color-ink`) naming its list: «Objetos», «Combates y mazmorras» and «Otros». They stack in one column, 14px apart. Items and combats have a slot: items with their icon and the name that copies itself (Item chip, Copy), combats with the combat icon. A dungeon («Mazmorra Malefíscof», any note with «mazmorra») shows the boss of the dungeon it names, or the dungeon icon when it names no single dungeon (Icon slots and game icons). The quantity in 800 and the text form one paragraph, so a label too long for its column goes on under «12 ×», not in a thin column beside it. Each slot sits level with the first line of its label: rows align to the top, and the text comes down by half the difference between the slot and its line height (changed 2026-11-13 after Torre's review: the hanging quantity and the centered slots made ragged rows). Otros comes last, after the lists, as one line of prose rather than a list of rows, because its entries are sentences, not objects: «Otros» inline, then each note as Torre wrote it, separated by a middle dot that screen readers skip (`content: '·' / ''`). It has no slots. The markup stays a list named by its heading. When the sheet is folded and at least 36rem wide (tablets), a list of seven rows or more splits into two columns of at least 15rem, read top to bottom; in the 20rem desktop column every list is one column. An empty group is left out, and with nothing at all there is no part. What goes in it (`achievementPageView`, `src/lib/achievements/page.ts`):
  - The items of the published guides of the achievement's quests, added up, and the notes with a quantity («1 x Combate (solo).»), added up. A quest with alternatives does not count.
  - An item the quests only check you own counts once (fixed 2026-11-14: «El secreto de los dofus: prólogo» asked for «3 × Dofus Turquesa» because three of its quests list it). That is an item whose DofusDB super type is equipment, a pet, a Dofus or a trophy (`itemGroup` gives «equipables», `src/lib/dofus-guides/need-groups.ts`) and that no quest of the achievement hands in: no `bring` objective with that item in the quests' stored stages. It shows the largest quantity one guide asks for, not the sum. Both signals are needed: some quests hand equipment in («Entrégale», such as the koalak set or the «Espada maldita del gran Desangrador»), and over 300 resource rows are used up with no `bring` objective (crafting, dungeon keys). Everything else (resources, consumables, souls, anything a quest takes, an item without a DofusDB ID) keeps adding up.
  - Showing is not handing in (fixed 2026-11-15: «Negro ébano» asked for «3 × Cocobur», the sword its first quest pulls from the rock and the next ones only show). DofusDB uses one objective class for «Entrégale a {npc}: N x {item}» and «Enséñale a {npc}: N x {item}»; its `typeId` tells them apart (3 hands the item over, 2 shows it and keeps it). `pnpm data:quests` stores a shown item as a `show` objective, which is not a `bring` objective, so an equipable that is only shown counts once. The Dofus vulbis, zanahowia, moteado and de los vigilantes are shown, not handed in. Within one quest a shown item is not added up either: the guide's autofilled Necesitarás asks for the largest quantity shown, or for what the quest hands in or uses when that is more («El forjador de leyenda» shows the Cocobur twice and asks for one).
  - The notes without a quantity («Hechizo Captura de almas», «1 kama») as Torre wrote them, once even when several guides repeat them (fixed 2026-11-12: they used to be left out, so Favores encadenados lost three of Torre's lines). Nothing Torre writes is dropped, merged with other text or reworded.
  - A note with a quantity that names an item of the total, ignoring case and accents («2 x Dragopavo pelirrojo.» where another guide links the item), counts for that item instead of showing twice. When the same guide links that item, the note is the same request, not another one: that guide counts the larger of the two quantities, never both (fixed 2026-11-14: «Cuatro de seis» asked for «50 × Esquíritu majestuoso» because «La última piedra» links 25 and its notes say «25 x Esquíritu majestuoso.», and DofusDB's objective takes 25). Between different guides the rules above still apply. A note that says more than the quantity and the item name does not match the item and stays a text row, as Torre wrote it.
  - A dungeon note names a dungeon of the `dungeons` collection (DofusDB's dungeons and their bosses, refreshed by `pnpm data:quests`) only when nothing is in doubt: a wrong boss is worse than the dungeon icon (`src/lib/guides/dungeons.ts`, shared with the Dofus guides). A level band that opens a note («Nivel 80 al 114:», «Nivel 180+:», as in the Cacao and Vigilante Dofus guides) is dropped first: «Nivel 80 al 114: Malefíscof.» is the Fábrica de Malefíscof. What follows «Mazmorra», without the words that name no dungeon («de», «la», «los», «llave», «mazmorra»…), is compared from its longest start to its shortest with a dungeon's full name, then its boss's full name, then the end of either: «Mazmorra de Grunob» is the Akademia de los Goblins of the Director Grunob, «Mazmorra Kimbo con ídolo» the Canopea del Kimbo. A one-word end only counts when it is all the note says («Mazmorra del Rey Gelatina» is not the dungeon of a «Gran Rey»). The text from «Mazmorra» is also compared with full dungeon names that start that way («Mazmorra de los Herreros»), and each parenthesis on its own («Mazmorra de los 4 Jinetes (Tormenta del Selocalipsis)»). A part that matches several dungeons at once (a boss shared by two dungeons, «Real») gives nothing; the note matches only when the parts that give a dungeon all give the same one. Case and accents are ignored, and expeditions, which have no boss, never match. When that finds nothing, it runs again without filler words in the note and the names («el», «la», «de», «del», «los», «las», «llave», «con ídolo»): «Mazmorra Ben Ripata» is the Restos del Roca Negra of Ben el Ripata, «Mazmorra de la Cripta del Chadalid» the Cripta de Chadalid. If that finds nothing either, each part of the note that says «Mazmorra» in the singular is checked for a variant of a name. The words after «Mazmorra», two or more, must all appear in order in one dungeon or boss name, with at most one extra word in the name and at most one word with a typo (one letter in words of five letters or more, two from eight): «Mazmorra Ring Eskarlata» is the Ring del Capitán Eskarlata, «Mazmorra Ratonera de la Rata Negra» the Raratonera de la Rata Negra, «Mazmorra Blop Multicolor» the dungeon of the Blop Multicolor Real. When no name fits, the first word may be a boss's first name, if it has five letters or more, is not a title («Gran», «Rey», «Maestro», «Director»…) and only one boss in the whole game has it: «Mazmorra Anerice la bebesita» is the Mansión de Kuatropatas of Anerice la Fab'huquesa. Dungeons without a boss never match, but in this step they count as candidates when they are not the expedition of a dungeon already there, so a note that looks like one of them stays in doubt. A doubt at any step stops there, and parts that give different dungeons are a doubt too: «Mazmorra Blop Real» fits the Blop Multicolor Real and the four bosses of the Enclave de los Blops, so it keeps the dungeon icon. The row shows the image of the boss the note matched through when it has one. Otherwise it shows the first boss of that dungeon whose image is in Media, and the dungeon icon when none is. The page matches on names first and then loads only the matched bosses' images (`readDungeonBosses`, `src/lib/guides/dungeon-bosses.ts`); the prepared names are kept between renders while the dungeons' names and bosses stay the same. Torre can also pick the dungeon of a note by hand, in the quest guide that has it («Mazmorras de las notas», under Necesitarás: the note as written, with or without its quantity, and the dungeon). A pick wins over the match by name; two guides that pick different dungeons for the same note cancel each other, and the row falls back to the match by name. A pick whose note the quest guide import rewrites away is dropped and reported by the import, and a pick whose dungeon is deleted is removed on the next save, so neither blocks publishing. «Mazmorras nivel 200» and other notes that name no dungeon stay with the dungeon icon unless Torre picks one (`dungeonChooser`, `dungeonPicks`). `pnpm data:quests` ends with the dungeon report, classified by the same code as each page (`achievementNeeds`; `dungeonNoteLabels` for the Dofus guides, which have no picks; `guideDungeonNotes` with each quest guide's own picks for the quest guides, added 2026-11-15): a count line per kind of page, then every dungeon note of the published achievement pages, Dofus guides and quest guides once per way it matched, with its pages, grouped by how it matched (by name, by boss, picked in the panel, or not at all). Each line gives the dungeon, the boss it matched through, «nombre parecido» for a variant, the candidates when it was in doubt, and a warning when the boss has no image in Media, so Torre knows what to rewrite or pick. `pnpm data:dungeon-notes` prints only that report and writes nothing (`src/lib/achievements/dungeon-report-lines.ts`).
  - A note whose text is exactly the name of an imported game item («Piedra de alma mediana», «Llave de la Fábrica de Malefíscof») shows as that item, with its icon and its copyable name, and its quantity when the note has one, added to any quantity another note asks for (`readAchievementPage` looks the names up in `items`; with several items of the same name, the lowest DofusDB ID). Notes that only differ in case or accents from that exact name count as it too, so the total never depends on the order of the guides. Any other note stays a text row.
- **Las misiones, en orden** (a numbered list since 2026-11-12, replacing the quest cards): one row per quest of the achievement (a row of alternatives, such as the class quest, is one row with its name and the lowest level). The position in a solid diamond of the row's hue (option D, 2026-11-16: a square turned 45 degrees in `--v`, with the number in Lexend 700 0.9375rem and `--color-on-hue`, `aria-hidden` since the `<ol>` gives the number) on a 1.5px `--color-line` line that joins the circles from the first to the last; the quest giver's render, 56px tall, on its floor; the title (Montserrat 600, 1.125rem; the name Torre gave the row, and the DofusDB quest name only when he left it empty: «El safari de almas jaras», not «Trofeo de caza»; the metalogros search finds the quest by the same name) and «Nivel 20» under it in `--color-ink-2` (no «Misión 2 -»: the number says it). Rows at least 76px tall, no box. When the quest's guide is published, the title is a link whose `::after` covers the row, so the whole row opens the guide (hover: a `--color-raised` fill); otherwise the row is plain text. With four or more quests, two columns from 600px of main column, read top to bottom (`--rows`): the line ends at the last circle of the first column and starts again at the first of the second. The section starts after a 1px `--color-line` rule with 40px above it (28px under the header from 64rem). Under 64rem, when it follows the sheet directly, the sheet's last rule takes the place of its own.
- **Lo que pide el logro** (added 2026-11-18 for the «Alineamiento» achievements, backlog S-06): an achievement page with no quests (DofusDB gives none) shows, in the place of «Las misiones, en orden» and with the same rule and heading style, «Lo que pide el logro»: DofusDB's description of the achievement in `--color-ink-2` at 1.0625rem, at most `--width-prose` wide, and its objectives in order («Rango 3», «Nivel 130», «Hablar con el jefe de la ciudad»), one row each, at least 48px tall, in the quest titles' type (Montserrat 600, 1.125rem). Each row starts with a 14px diamond in its hue (`--v`), the quest list's marker without a number, because the objectives are met together, not one after another; no line joins them and nothing links. The header counts them («3 objetivos - 5 puntos») instead of «0 misiones», and so do the previous and next cards («**3** objetivos.»). With neither quests nor objectives the section is left out (`AchievementObjectives`).
- **Torre's intro and outro** (decided 2026-11-13): his own text from his Squarespace page, in the guide's prose style (`guide-body`), with his screenshots as figures and his YouTube videos where he put them. A video is a Video facade (Quest guide components) with our copy of the thumbnail as its poster: the page loads nothing from YouTube until the click, and the poster loads lazily, since the video sits low on the page. In the panel, the Entrada and Cierre editors take a «Vídeo» block (YouTube link, title, optional poster) anywhere between paragraphs (`ProseVideoBlock`). `pnpm import:achievement-prose` brings them over once (`AGENTS.md`).
- **Cuenta para**: after Torre's outro and a 1px `--color-line` rule with 32px under it, «Cuenta para» (Lexend 700, 1.25rem) and the game's meta-achievements that require this one, directly or through another, each with its icon in a slot and «Pide 6 logros. **20** puntos.». Left out when there are none. There is no list of the metalogro's achievements on the page (removed 2026-11-10); the metalogros index lists them.
- **Previous and next achievement**: the next quest card with the achievement's icon in a 72px slot instead of art, «Logro anterior» or «Siguiente logro», the name and «**4** misiones. Niveles 25 a 40.». Side by side where each gets about 320px. A `<nav>` named «Logros de {metalogro}».
- **En preparación**: an achievement Torre has not finished (`state: preparing`) has no page (404) and shows wherever it is listed as visible but disabled: a plain element with `aria-disabled="true"`, no link, a dashed `--color-line` border, its icon at 45 percent opacity in grayscale, and the «En preparación» tag (22px pill, `--color-raised`, `--color-ink-2`, 600 at 0.6875rem). It stays in the reading order.

### Metalogros index components

Decided 2026-11-07 from variant D. A server component (`src/components/achievement/MetalogrosIndex.tsx`) and one client island (`MetalogrosIsland.tsx`); what each part shows comes from `metalogrosIndexView` (`src/lib/achievements/metalogros.ts`).

- **Tile**: the metalogro's representative (an NPC render or a monster image, else the first achievement's icon at 44px in an 88px diamond well, so the whole icon sits inside the diamond) on a floor, 120px tall (96px under 40rem), the name (600) and one quiet count in `--color-muted` («7 logros», or its guides as «230 misiones» when it has no achievements). `--color-surface`, a 2px border in its hue (`--v`, Item hues), 8px radius; hover fills `--color-raised`. A tile that opens its zone tilts toward the mouse like the Dofus index cards (Motion, Tilt): `data-tilt`, started by `MetalogrosIsland` after it turns the links into buttons, a shine layer `.vd-tile__foil` in the tile's hue that follows `--fx` and `--fy` (`screen`, `multiply` in light mode, opacity 0 until it tilts), and the representative comes forward (`translateZ(1.75rem) scale(1.06)`). A disabled tile never tilts and has no shine. Achievement cards take a 2px border in their hue too, 8px radius, a flat surface; they do not tilt, so on hover they fill `--color-raised` and rise 2px (not under reduced motion). Six per row at 1440px (as many as fit from there), five from 1024px, two on phones. A metalogro «En preparación» carries the «En preparación» tag.
- **Panel**: with the island, a tile is a button (`aria-expanded`, `aria-controls`) that opens one panel across the whole row right under its row (opening, closing, switching and back or forward run in a «metalogros» view transition: the panel fades, the tiles below and the footer glide to their new place over `--duration-slow`; without view transitions the panel fades in): an `<li>` holding a region named by the metalogro's heading, with its achievement cards and its loose guides («Otras guías»), and a «Cerrar» icon button. The URL hash follows (`#astrub`), back and forward work, and Esc or «Cerrar» close it and return focus to the tile. One panel at a time; the open tile keeps its hue border, takes the `--color-raised` fill and a 2px accent notch pointing at the panel (the prototype does the same). The panel is flat like the tiles: `--color-surface`, a 2px `--color-accent` border and an 8px radius.
- **Achievement card**: the achievement's icon in a slot, the name and «3 misiones · Niv. 15–25»; the whole card links to its page.
- **Search**: a 56px field with a 2px `--color-accent` focus ring, as in the prototype (accent on surface passes 3:1 in every theme), and a combobox (WAI-ARIA APG, listbox popup) that finds metalogros, achievements and quests, accent-insensitive, every word in any order; short Spanish words (de, del, la, las, el, los, y, a, en) need not match, so «misiones del mundo» finds «Misiones de Mundo» (`src/lib/achievements/metalogros-search.ts`). Up to 4 metalogros, 7 achievements and 7 quests. A metalogro opens its panel; an achievement or a quest opens the achievement page. It takes focus on desktops with a mouse, never on touch screens. Hidden without JavaScript.
- **En preparación**: an achievement Torre has not finished is listed but disabled: no link, a 2px dashed `--color-line` border (a disabled tile too), a muted icon, the tag and `aria-disabled`, in the reading order. A metalogro «En preparación» with at least one published achievement still opens; one with nothing published is a disabled tile (no panel), the state derived from the data rather than stored. The search lists both as options with `aria-disabled` that the arrow keys skip and Enter never opens.
- **Without JavaScript**: the tiles link to each metalogro's list, rendered under the grid.

### Dofus guides components

Decided 2026-11-09 from the guias-dofus prototype. Server components in `src/components/dofus/` (`DofusGuideParts.tsx` with its styles in `src/components/achievement/achievement.css`, `DofusIndex.tsx` with `dofus-index.css`) and one client island for the index (`DofusIndexIsland.tsx`); what they show comes from `dofusGuideView` and `dofusIndexView` (`src/lib/dofus-guides/`).

- **Collection card** (the index): a 2px border in the Dofus color and 8px radius, lightened in dark mode or darkened in light mode just enough to reach 3:1 on the background and surface of every theme in that mode (`eggLine` in `src/lib/dofus-guides/egg-line.ts`, passed as `--egg-line-dark` and `--egg-line-light`; the Dofus Plateado's silver was barely visible in light mode) (option D, 2026-11-16; hover also fills `--color-raised`), the egg on a soft glow in the Dofus color, the name (Lexend 600, ink), one line «7 logros - 40 misiones - Nivel 180» in `--color-ink-2` (wrapping between parts, never with a line that starts with the dash, as the quest subtitle) and the Primordial or Evento tag pill in the top left (in a card narrower than 14rem, two per row on phones, where it covered the egg, it goes under the meta line instead, like the «En preparación» tag). The glow is a radial gradient behind the egg (in light mode with a soft shadow under it), never a CSS `filter` on the image: with a filter Chrome counts the egg as a larger box than it draws for the LCP. The whole card is the link (hover: the border and a glow in the Dofus color, `--egg`, with a soft shadow that lifts the card, one `::after` layer that fades in; the egg settles from 1.04; pressed: the `scale` property at .98, which adds to the tilt instead of replacing it). En preparación: a plain element with `aria-disabled`, a 2px dashed border of `--color-muted` at 70 percent over `--color-line` (3:1 on the page in both modes; `--color-line` alone barely outlined the card in light mode), the egg in grayscale, «Nivel 20» only and the «En preparación» tag; it never tilts.
- **3D tilt** (decided 2026-11-15: option A of the dofus-3d prototype, published at https://ta-prototipos.netlify.app/dofus-3d/). With a mouse, a published card (`data-tilt`) tilts toward the pointer like the checklist posters (Motion, Tilt). A shine layer (`.dcard__foil`, `aria-hidden`) follows the pointer (`--fx`, `--fy`): a soft spot in the Dofus color under it and the posters' two diagonal bands, white and the Dofus color (`mix-blend-mode: screen`; in light mode only the Dofus color, with `multiply`). It is at opacity 0 until the card tilts, so a card the mouse is not on looks exactly as before. While tilted the egg comes forward (`translateZ(1.75rem) scale(1.06)` over 300ms). Two per row on phones, three from 640px, four from 1024px, five from 1280px.
- **Search and filters** (the island, which also starts the tilt; hidden without JavaScript): a 48px search field (accent-insensitive, every word, also the Dofus' other names) and a segmented control whose active indicator slides (`transform`). Changing either hides the cards that no longer match inside a view transition of type `guias-dofus` (`smoothUpdate`): the leaving cards fade and shrink, the rest glide to their place; under reduced motion it is instant. A `role="status"` line speaks only while a search or a filter is on («6 encontrados», «Ningún Dofus se llama «…».»).
- **Necesitarás** (made compact on 2026-11-11, at the user's request): groups («Mazmorras», «Recursos») one under the other, 24px apart. In each group, the item rows go first, in the item columns of the quest header's Necesitarás, and Torre's notes after them, in its compact note columns (`needs__items` and `needs__notes` in `game.css`). Notes are sentences, so on Dofus guides their columns share out the row (`auto-fit`, each at most `--width-prose`): a lone note or two do not squeeze into 15rem columns beside an empty row. Torre's order holds within the items and within the notes; only a note written between two items moves after them. A subtitle may stand alone over the next one when Torre nests two headings («1 × Mazmorra:» over «Dependiendo de tu nivel:»): each keeps its own line. An item row is its icon in a slot, «3 ×» in bold and the name, which copies itself (`CopyName`, see Item chip), with Torre's remark («(o fabricarlo)») under the name in `--color-ink-2`; a note row is Torre's text as is. A dungeon note also gets a slot beside its text, with the same rule and matching as «Necesitarás en total» (Achievement page components): the boss of the dungeon it names, or the dungeon icon when it names no single dungeon (decided 2026-11-15, at the user's request). Every note of the «Mazmorras» group is a dungeon note, since Torre or the import put it there («1 × Antro del Dragocerdo» in the Turquesa names its dungeon without saying «Mazmorra»). In «Combates», only a note that says «mazmorra» is one, as on the achievement page; a combat note keeps no slot. Notes in the other groups stay plain text even when they mention a dungeon («Piedras de alma de jefes de mazmorra»). Dofus guides have no hand-picked dungeons, so a note matches by name or boss only. The slot is the compact note slot (28px, the icon at 22px), level with the note's first line, and the note's text does not change (`dungeonNoteLabels` and `NeedRowView` in `src/lib/dofus-guides/page.ts`).
- **Achievements and quests** («Los logros, en orden»): flat, no boxes inside boxes (user, 2026-11-09). A metalogro is an eyebrow «Metalogro 1» and its name under a hairline; an achievement is a heading row (its icon in a 48px slot, the linked name, «3 misiones - Niveles 3 a 6 - 10 puntos», the «En preparación» tag if so) and its quests a list ruled by hairlines: the quest giver, «Misión 1 - Nivel 3» and the title, the whole row opening the guide (hover: a faint `--color-raised` fill and the accent title). Two columns from 600px when there are more than three. A quest without a published guide says «Sin guía todavía». Loose quests and single quests use the same rows, with Torre's note («(solo empezarla)») under the title.
  - The quests are Torre's list for that achievement, as he wrote it (changed 2026-11-15): his rows in his order and his titles («Heh, ¿dónde está Bizcana?», even when the guide or DofusDB spells it another way). The quest giver and the level come from the guide a row links. A row that links several guides («La fatalidad - El destino - La rivalidad») is one row: each piece of the title between « - » or « o » links its own guide, underlined in `--color-accent`, the level is the lowest and there is no quest giver, so the row does not open as a whole. An achievement Torre lists without quests shows none, and the meta line counts only the rows shown. No count of zero is written: an achievement with no quests says «10 puntos», not «0 misiones - 10 puntos». The achievement page's own quests show only on a block added by hand with «Misiones de su página de logro» on.
  - An achievement «En preparación» keeps its tag, and its name links to Torre's page on the Squarespace site when he linked it, until its own page is published.
  - A row of a loose list that Torre links but that is not a quest («Logro: Cazadores cazados» among the Marfil's prerequisites) stays in its place in the list: the quest icon, his text linked where he pointed and his note, with no «Misión 1» line and no «Sin guía todavía». It does not count as a quest.
- **Checklist card**: the egg in a slot, «Ya hay checklist» in the checklists accent and the checklist's name; links to the site's checklist once it is published (changed 2026-11-15), and to Torre's Squarespace checklist while it is «En preparación».
- **Previous and next**: the previous and next published Dofus in Torre's order (an En preparación one is skipped) as next quest cards with the egg, «2 logros - 40 misiones - Nivel 180» under the name.

### Component catalog

Every component above, and the generic ones in the components table that already exist in code, render on `/sistema` with real content, in the five themes and both modes (each section carries its own `data-theme` and `data-mode`), left aligned like every page, each section up to `--width-guide`, with the page title in Rowdies and the section and group titles in Lexend. Since 2026-11-17 it also shows the Ko-fi buttons (the header one with its text and with the cup alone, and the floating one), the theme picker, the metalogros tiles (with a representative, with only an achievement icon, and off) and their achievement cards, the previous and next achievement cards, the checklist header egg in its three states and the zone background under its veil. The page answers 404 in production: it renders only in development (`NODE_ENV=development`), on the dev environment (`APP_ENV=dev`, public but not indexed) and in the E2E run (`E2E_DESIGN_CATALOG=1`, set only by `playwright.config.ts`). `?tema=` and `?modo=` keep a single section, for screenshots. Its last group, «Bloques del panel», renders every panel block in a 3:2 frame, the source of the block picker thumbnails (`AGENTS.md`, Payload rules). It is not in the Lighthouse list. A new component, or a new state, is added there in the same PR.

## Motion

Motion is CSS on server-rendered pages. The Motion library (Framer Motion) is allowed only inside client islands (the checklist app, dialogs with shared-element moves), never on guide pages.

### Tokens

| Token | Value | Use |
|---|---|---|
| `--duration-press` | 100ms | press scale, checkbox tick |
| `--duration-fast` | 160ms | hover color and fill, tabs, chips |
| `--duration-base` | 220ms | dropdowns, popovers, tooltips, toasts |
| `--duration-slow` | 320ms | dialogs, the mobile sheet, progress fill |
| `--duration-enter` | 400ms | hero and section entrance |
| `--ease-out` | `cubic-bezier(.23, 1, .32, 1)` | everything that enters or responds to input |
| `--ease-in` | `cubic-bezier(.5, 0, .75, 0)` | exits |
| `--ease-standard` | `cubic-bezier(.25, .1, .25, 1)` | color and fill changes |

Exits run at about 70 percent of the enter duration (a 220ms dropdown closes in 150ms).

### Rules

- Animate `transform` and `opacity` only. Color and fill transitions on hover are the one exception; no animation of `width`, `height`, `top`, `left`, `margin`, `filter` or `box-shadow` size.
- No layout animation on content pages. Nothing on a guide page moves after it renders, except in response to the reader. The one exception is the ambience (below), which sits behind the content and moves none of it.
- Enter: from `opacity: 0; transform: translateY(8px)` to rest, `--duration-enter`, `--ease-out`. Stagger siblings by 40ms, at most 6 items; the rest appear with the last one.
- Never animate the LCP element (the hero image or title) in from zero opacity.
- Everything that opens also closes with motion, never by vanishing. Elements toggled with `hidden` and native `<dialog>`s do it in CSS alone: `@starting-style` gives the enter its first frame, and `display` (plus `overlay` for dialogs) transitions with `transition-behavior: allow-discrete`, so the element stays painted until its exit ends. While leaving it takes no pointer events. Browsers without discrete transitions still get the enter and close at once.
- Dropdowns and popovers (the header panels, the home page's result panel): from `opacity: 0; transform: translateY(-6px) scale(.97)` with `transform-origin` at the trigger, `--duration-base` in, 150ms out. Switching panels runs both at once. A list attached to its field (the metalogros search) only fades, so it never detaches from the field.
- Dialogs (the search dialog, the image viewer): backdrop fades in `--duration-fast`; panel from `translateY(12px) scale(.98)` over `--duration-slow`, and back over `--duration-base` with `--ease-in`.
- Mobile sheet: slides from the top with `translateY(-100%)` to 0 over `--duration-slow` and back up over `--duration-base`. Its sections fade in from `translateY(-4px)` and fade out before they collapse; heights never animate.
- Search results: each new row fades in over `--duration-fast`; rows that stay while typing do not move.
- Hover and press: every link, button and `summary` changes color, fill, border and underline color over `--duration-fast` with `--ease-standard` (a zero-specificity `:where()` rule in `globals.css`); a component that declares its own `transition` replaces it.
- Card hover: art settles from `scale(1.04)` to 1 over 600ms, border tint over `--duration-fast`. Mouse pointers only, via `@media (hover: hover) and (pointer: fine)`.
- Tilt: the checklist posters, the published Dofus index cards and the metalogros tiles that open a zone tilt toward the mouse, up to 9 degrees per axis (`perspective(800px)`), and return over 150ms with `--ease-out` when it leaves. One module does it for all of them, `startTilt` in `src/components/ui/tilt.ts`, started by each page's island on the elements with `data-tilt`: it writes the inline `transform`, the pointer position as `--fx` and `--fy`, and the class `is-tilted`, which the CSS uses for the shine and the glow (opacity only). Mouse only: touch and pen never tilt. Under reduced motion nothing tilts and nothing transitions. A press on a tilting element scales with the `scale` property, or scales an inner element, because a `transform` in CSS loses to the inline one.
- Scroll reveals: CSS scroll-driven animations (`animation-timeline: view()`) inside `@supports`, on the home and hubs only. Content is visible without them.
- Page transitions (decided 2026-11-09, replacing "none at first"): every link of the site is a plain `<a>` and loads the whole page, so the browser crosses pages with a cross-document view transition (`@view-transition { navigation: auto; types: pagina }` in `globals.css`). The header and footer get a `view-transition-name` only while a «pagina» transition runs and do not move; the new page sits under the old one at full opacity and rises 8px over `--duration-base` while the old one fades out on top over 160ms with `--ease-in`, so the LCP element never enters from zero opacity. The lockup and the 404 link use `<a>` too (`next/link`'s client navigation would skip the transition). Browsers without cross-document view transitions (Firefox today) load the page as before. The mode switch is another view transition without that type, so the header is revealed with the rest of the page.
- Same-document view transitions run from an island through `smoothUpdate` (`src/components/ui/view-transition.ts`), with a type the page's CSS keys on through `:active-view-transition-type()`. Without support or under reduced motion the change applies at once.
- Reduced motion: under `prefers-reduced-motion: reduce` every transition and animation drops to 0.01ms or is removed, scroll reveals are off, smooth scrolling becomes `auto`, page transitions are off (the `@view-transition` rule only exists without reduced motion) and the islands skip their view transitions. Progress fills jump to their value.

### Ambience

Decided 2026-11-15, at the user's request: the particles of the old checklist hub (`silvestre-checklist`, `Hero.jsx`) on every page. `Ambience` in `src/components/site/` renders a layer of 14 empty `<i>` at the end of `<body>` from the `(frontend)` layout. Each particle has a fixed start (`--x`), delay, duration and size (4 to 7px) from `ambience-data.ts`, never random, so the server renders the same markup on every visit. The CSS lives in `ambience.css`, which `site.css` imports, so it adds no stylesheet. There is no JavaScript.

- **Where**: the first screen of the page (`position: absolute` from the top, `100svh` tall, full width, `overflow: hidden`), at `z-index: -1`. It paints over the page background and under everything else, so a surface (a card, the checklist window) covers it and text always sits on top. The particles rise under the header bar, which is opaque. The layer scrolls away with the page, so a reader deep in a guide never sees it.
- **Motion**: particles rise from the bottom of the layer to just under the top and fade in and out on the way (falling leaves and snow go the other way). Only `transform` and `opacity` animate. The keyframes use `cqh` (the layer is a size container), so the same animation fits the page layer and the catalog box. The halo is a static `box-shadow`, never a `filter`.
- **Decoration only**: `aria-hidden`, no text, `pointer-events: none`, `contain: strict`. It cannot shift layout or become the LCP element (empty boxes with gradient backgrounds).
- **Phones**: below 640px only the first 7 particles show; they still span the width.
- **Reduced motion**: `display: none`. No particles at all.
- **Strength**: the layer is at 85 percent opacity in dark mode and 60 percent in light mode, on top of each particle's own fade. Light mode drops the halos.

Each theme and mode sets custom properties (`--amb-anim`, `--amb-bg`, `--amb-glow`, `--amb-shape` and the rest, listed at the top of `ambience.css`) on the element that carries `data-theme` and `data-mode`. They inherit, so the nearest element wins: a `/sistema` section shows its own theme inside an Amakna page. Every other particle uses the second color. The colors come from the theme's `--t-accent` and `--t-accent-2`.

| Theme | Dark | Light |
|---|---|---|
| Arcano | arcane motes in `accent` and `accent-2` with a white core and a halo, rising and swaying (`amb-rise`) | the same motes in the darker light-mode accents, no halo |
| Amakna | fireflies: a pale core in `accent` green and `accent-2` gold, with a halo (`amb-rise`, the old hub's dark mode) | leaves in `accent-2` and `accent` that fall from the top and spin (`amb-fall`, the old hub's light mode) |
| Bonta | white and gold light motes that float up slowly and twinkle (`amb-drift`, 1.25 times slower) | gold and blue dust, same motion |
| Brâkmar | embers with a hot core, from `accent-2` to `accent`, rising fast in a zigzag and flickering (`amb-ember`, 0.65 times the duration) | dark red and amber embers, same motion |
| Ocre | amber and coral sparks that flash as they rise (`amb-spark`) | the same sparks in the darker amber |

**Checklists** keep the old hub's per-checklist effect. `ChecklistView` and `SoulsView` render their own layer (`Ambience fx`) inside the wrapper that carries the Dofus color (`--egg`), and the site layer hides (`body:has(.amb--page)`). Torre picks it in the checklist's «Ambiente» field (`ambience`, read by `checklistAmbience`); since 2026-11-15 it replaces the mapping by old id, and a migration gave Hielos and Silvestre the effect they already had:

| «Ambiente» | Effect |
|---|---|
| Motas del color de su Dofus (`egg`, the default: Nebuloso, Ocre, new ones) | motes in the Dofus color, rising like the fireflies |
| Nieve (`snow`, Hielos) | snow that falls slowly, in both modes (`amb-snow`) |
| Luciérnagas y hojas (`forest`, Silvestre) | the old hub's default: fireflies in dark mode, autumn leaves in light mode |
| Las del tema de la web (`theme`) | no layer of its own: the site's layer, as on any other page |

The catalog shows the layer in a 12rem box in every theme and mode (`Ambience demo`). E2E waits for "every animation finished" skip infinite animations, since the ambience never ends; `tests/e2e/ambiente.spec.ts` covers the layer itself.

## Zone background

Decided 2026-11-16 by Torre, from the full-page variant of the `/color/` prototype (`tmp/mockups/color/final.css`, `html[data-zona][data-fondo='pagina']`). A quest guide or an achievement page shows the landscape of its zone behind the whole page. `ZoneBackground` (`src/components/game/ZoneBackground.tsx`, styles at the end of `game.css`) renders it first inside the page wrapper. It is server markup with no JavaScript.

- **Which image**: the page's own «Fondo de la página» (`background` on the quest guide or achievement page) wins. Without one, the page uses the «Fondo de la zona» of its subarea (`subareas.background`). A quest guide's subarea is the one of its quest's first start map that has one (`startPositions.subAreaId`, saved by `pnpm data:refresh` from DofusDB's map positions), else the first objective's. An achievement page uses the first quest of its list. `readZoneBackground` (`src/lib/zones/read.ts`) resolves it inside the page's cached read, so a visit never queries DofusDB and costs no extra query. No image means the page as before.
- **The image**: DofusDB has no art per zone, so the background is the render of one of the subarea's maps (`https://api.dofusdb.fr/img/maps/1/{mapId}.jpg`, about 1910 × 970). Its «DofusDB» watermark sits 17 to 50px above the bottom edge, so the stored file drops the bottom 7 percent and the right 2 percent (`watermarkCrop`), about 1872 × 902. Payload makes the usual AVIF and WebP variants. The map comes from the subarea's «Mapa del fondo» (`backgroundMapId`) if set. Otherwise it is an outdoor map where the quest of a published guide starts, then the outdoor map of the subarea's main world map nearest the subarea's center (`pickBackgroundMap` in `src/lib/zones/background.ts`). Outdoor maps read as places; indoor ones are mostly black.
- **Layer**: a `position: fixed` element at the top left, the full width and `100lvh` tall, at `z-index: -2`. It sits under the ambience and every surface, and stays still while the page scrolls. It is not `background-attachment: fixed`, which iOS ignores. The `<img>` covers it with `object-fit: cover`, centered.
- **Veil**: a flat `::after` of `--color-bg` at 88 percent in both modes (`--zone-veil`), with no gradient. The prototype's 80 percent (dark) and 84 percent (light) let text drop to 3.1:1 over a bright or dark map, so it was raised on 2026-11-17. Text sits on a mix of the page color and the map, and `tests/unit/zone-veil.test.ts` checks every text color at 4.5:1 over the veil on a white, a mid-grey and a black map in every theme and mode. In dark mode the 88 percent veil is enough. In light mode the hues, `accent`, `accent-2` and `muted` pass 4.5:1 on `bg` with little room, so under the veil they are mixed with 16 percent black (`--zone-ink-shift` on what follows `.zone-bg`); white on a hue fill gains contrast with it. The header bar, the sheet, cards and wells keep their own opaque surfaces, the disabled «Siguiente logro» card too. It works the same in every theme, because the veil is the theme's own `--color-bg`.
- **Rules over the veil**: the dividers of the page (the quest header's rule, the rules between the facts and between steps, the sheet's rows, «Las misiones, en orden», its connecting line and «Cuenta para») take `--zone-rule`, `--color-muted` at 70 percent over `--color-line`, at least 3:1 over the veil on any map and on `--color-surface`. `--color-line` alone dropped to 1.1:1 against the art in Amakna dark. Pages without a zone background keep `--color-line`.
- **Quest header**: the prototype's variant drops the panel behind the quest header (`.qhead` with `background: none`). The quest header here has no panel, so nothing changes.
- **Loading**: decorative, so `aria-hidden`, `alt=""`, `loading="lazy"`, `decoding="async"` and `fetchpriority="low"`, never preloaded. `sizes` follows `object-fit: cover`: `100vw`, or, when the window is taller than the image (`max-aspect-ratio` of the image), the image's ratio times `100vh`, over the 480 to 1600 variants. A 1440px desktop takes the 1600 one, and so does a phone in portrait, where the image fills the height and spreads to about four times the screen width (with `100vw` it took the 800 file and stretched it). The text paints first and stays the LCP element: on 2026-11-16 the seeded guide and achievement had the same LCP element (the title) and the same 145,530 bytes of script with and without the background, at 412 and 1440px, and `tests/e2e/fondo-zona.spec.ts` checks the LCP element.
- **Skipped**: under `prefers-reduced-data: reduce`, `prefers-reduced-transparency: reduce` and in print the layer is `display: none`, which also keeps the lazy image from downloading.
- **Panel**: in a subarea («Subzonas de DofusDB»), an admin presses «Traer fondo de DofusDB» under «Mapa del fondo». The server picks the map, downloads its render, crops it and saves it in Media once per map (`media.gameAsset` `dofusdb-map-render:{mapId}`, alt «Paisaje de {subzona}, en {área}»), then fills both fields. To change it, Torre types another map and presses again, or uploads his own image in «Fondo de la zona». `pnpm zones:backgrounds` does the same for every subarea a published page uses (AGENTS.md).

## Imagery

- Real game art only, imported once and served from R2 behind the CDN domain. Nothing loads from DofusDB or Ankama at runtime.
- Quest giver renders (decided 2026-11-05): `pnpm data:quests` saves each quest-starting NPC in the `npcs` collection with its `look` from DofusDB, then imports two renders into Media: `https://renderer.dofusdb.fr/look/{look as hex}/full/{1|3}/300_300.png`, direction 1 facing right and 3 facing left (`src/lib/dofusdb/npc-render.ts`). The 1000 × 1000 PNG is trimmed to the figure and capped at 720px high before upload; Payload makes its AVIF and WebP. Each file carries a key in `media.gameAsset` (NPC, direction and a hash of the look), so a rerun finds what it uploaded and never duplicates it; a new look uploads new renders and keeps the old ones, because they are ordinary Media records an editor may have used in a guide. A missing look or a renderer failure leaves the NPC without that render, and the next run retries.
- Item icons and monster images (decided 2026-11-06): `pnpm data:quests` imports the 128px PNG of every item that a quest rewards or needs, or that a guide's Necesitarás or rewards list (`https://api.dofusdb.fr/img/items/{iconId}.png`), and of every monster that a quest needs, a fight block names or a dungeon has as its boss (`https://api.dofusdb.fr/img/monsters/{gfxId}.png`), into Media, and links it from the item or monster (`image`). One file per image ID, keyed in `media.gameAsset` (`dofusdb-item-image:{iconId}`, `dofusdb-monster-image:{gfxId}`): items that share an icon share the file, and a rerun downloads nothing it already has. A failed download leaves the slot empty and the next run retries (`src/lib/dofusdb/game-images.ts`). `pnpm guides:backfill --apply` imports the images of the monsters it links. The whole catalog of tens of thousands of items is not imported.
- Torre can replace the art of a game record (an NPC render, a monster, an item icon, an egg, an achievement icon, a dungeon) with his own upload in its «Corrección de Torre», or hide the record. His image wins everywhere the record shows, at the same size and in the same slot as the DofusDB art; a hidden record leaves no empty slot (decided 2026-11-15).
- Every image has AVIF and WebP variants at fixed widths, generated once when the file is uploaded, in the panel or by the importer (decided 2026-11-05, replacing the offline conversion before the import). Payload makes them with sharp (`src/lib/media/sizes.ts`) and stores them next to the original. The app never optimizes images on request.
- Widths: 480, 800, 1200 and 1600 px, each in AVIF (quality 50) and WebP (quality 80). They come from the layout. 480 covers phones at 1x and the 280px card art up to 1.7x. 800 is `--width-prose` at 1x and phones at 2x. 1200 covers phones at 3x and the hero on tablets. 1600 is `--width-prose` and a step screenshot (634px) at 2x, and the full-bleed hero on desktops up to 1600px wide. A width larger than the original is never produced, so nothing is upscaled; 480 is the exception and comes out at the original width, so a 96px icon still gets one AVIF and one WebP. Uploading a 1920px PNG screenshot with all eight variants took about 0.6 s on an Apple M5 (about 2.2 s for a worst-case noise image).
- Animated images (a GIF, WebP or TIFF with more than one frame) get WebP variants only, and they keep every frame and its timing. AVIF has no animation in sharp, so an AVIF variant would be a strip of stacked frames (AGENTS.md, Media). Torre's «Espada de Yopuka» spell GIF on `/yopuka-1` (800 × 477, 99 frames, 7.4 MB) comes out as an animated WebP of 3.1 MB at 800 and 1.3 MB at 480, in about 8 s. With no AVIF, `<picture>` has no AVIF `<source>` and the browser takes the WebP `<img>`.
- Lighthouse's image delivery check only warns (decided 2026-11-05). Lighthouse emulates a phone at 1.75 DPR: a 380px screenshot then needs 665 device pixels, the browser picks the 800w candidate, and the check counts the difference from the 380 CSS px as waste. Real phones at 2x to 3x get the right width from 480/800/1200/1600. In Lighthouse 13 that check also covers formats, so the AVIF and WebP rule is held by `Picture` and the media variants and their tests, not by Lighthouse.
- Markup: `<picture>` with an AVIF `<source>`, then the WebP `<img>`. Both carry `srcset` with `w` descriptors and the same `sizes`. The `<img>` `src`, `width` and `height` are those of the widest WebP, which reserves the space (no layout shift). The original upload, with its size, rides along as `original`: it is the file the fullscreen viewer opens. An image with a single width gets no `srcset` or `sizes`. `mediaImageAsset` (`src/lib/media/image-asset.ts`) builds this from a media record; without variants yet, it falls back to the original. Next's `<Image>` only with a loader that maps to these variants and `unoptimized` set.
- `sizes` per component (`IMAGE_SIZES` in `src/components/ui/image-sizes.ts`):

| Component | `sizes` | Why |
|---|---|---|
| Figure outside steps (`prose`) | `(min-width: 67.3rem) 968px, (min-width: 64rem) 90vw, (min-width: 58rem) 880px, (min-width: 40rem) calc(100vw - 48px), calc(100vw - 32px)` | `--width-media`, 55rem: 968px with the 110 percent root once it fits (a 1075.6px viewport), the row (90 percent of the viewport, the 5 percent gutters; 3px too wide between 1024 and 1056px, where the gutter is still 52.8px) between 1024px and that; 880px from 928px; below, the viewport minus the 24px gutters, and on phones minus the 16px gutters |
| Step screenshots, three or more in a grid (`half`) | `(min-width: 134.5rem) 634px, (min-width: 99rem) calc(30vw - 12px), (min-width: 64rem) calc(45vw - 9px), (min-width: 40rem) calc(50vw - 32px), calc(100vw - 32px)` | the row (90 percent of the viewport from 1024px, 1936px from a 2151px viewport) in two columns, three from a 1584px viewport (81rem of row), minus the 17.6px gaps: 634px each once the frame stops at 110rem, which never reaches the 122rem of a fourth column; at most 704px, so 1408 device pixels at 2x, which the 1600 variant covers |
| A pair of step screenshots (`pair`) | `(min-width: 134.5rem) 959px, (min-width: 64rem) calc(45vw - 9px), (min-width: 40rem) calc(50vw - 32px), calc(100vw - 32px)` | half the row minus half the gap at every width; 959px once the frame stops at 110rem, 1918 device pixels at 2x, so the 1600 variant |
| A single step screenshot (`single`) | `(min-width: 89.3rem) 634px, (min-width: 64rem) calc(45vw - 9px), (min-width: 40rem) calc(50vw - 32px), calc(100vw - 32px)` | half the row minus half the gap, up to `--width-shot` (633.6px), reached at a 1427.6px viewport |
| The video poster (`video`) | `(min-width: 99rem) 1426px, (min-width: 64rem) 90vw, (min-width: 40rem) calc(100vw - 48px), calc(100vw - 32px)` | the row up to `--width-video` (1425.6px), reached at a 1584px viewport |
| Next quest card art | `(min-width: 40rem) 280px, calc(100vw - 32px)` | 280px beside the text from 640px; full card width above the text below |
| Icons (items, monsters, achievements) | none | one width; the icon well fixes the size |

- Changing a width or a format only affects new uploads. `pnpm media:sizes` generates what older records are missing (see `AGENTS.md`, Media).
- The `/sistema` catalog images are static files in `public/img/sistema`. Its screenshots have 480 and 800 widths made once by `scripts/build-catalog-images.ts`, so the catalog exercises `srcset` like real media; its icons keep one width.
- `loading="lazy"` and `decoding="async"` on everything below the first screen; the LCP image gets `fetchpriority="high"` and no lazy loading.
- Aspect ratios:

| Kind | Ratio | Notes |
|---|---|---|
| Step screenshot | 17:10 box, `object-fit: cover`, from 640px; source ratio on phones and in the viewer | 12px radius, `--shadow-art`, columns that fill the row from 640px; a pair at half the row, three or more at most `--width-shot-max`, a single one at most `--width-shot` |
| Start map | 16:9 crop | 12px radius |
| Hero zone art | 21:9 on desktop, 4:3 on phones (art direction through `<source media>`) | fades into `--color-bg` with a `mask-image` gradient |
| Collection card art | card ratio (1:1 for Dofus, 1:1.1 for dungeons) | the NPC or boss render on top keeps its alpha |
| NPC and monster renders | transparent, natural ratio | `drop-shadow` filter as a static style, never animated |
| Quest giver render | transparent, natural ratio (about 1:2.2 once trimmed) | 84 to 92px wide beside the title, 50px on phones; one width, so no `srcset` |
| Icons (items, quests, jobs) and monster images | 1:1, 128px files for items and monsters | 34px in a 44px icon slot, 42px in a 52px monster slot, 24 to 28px for the game UI icons (10px radius, `--color-slot`) |

- Missing or not-yet-owned items show the icon in `grayscale(1)` at 60 percent opacity.
- Picking a zone background for a character: the character must read against the area where it sits. Avoid a zone in the same hue as the character; keep text over the darker part of the image or on a shade.
- Alt text comes from the media record. Decorative art (backgrounds, ornaments) has `alt=""`.

## Print

A printed guide is readable on paper whatever the screen's theme or mode (`@media print` at the end of `globals.css`, no extra stylesheet). The page takes Amakna's light tokens with the page, surface and bar in white, and `color-scheme: light`. The header (with the theme picker and the mode switch), the footer, the floating Ko-fi button, the ambience, the zone background, the skip link and the draft preview notice are not printed. Shadows go, and a figure, a callout, Torre's tips or the next quest card is not split across two sheets, nor a heading left at the bottom of one. A table prints whole: no scrolling box, no sticky column, at the sheet's width and with no row split across two sheets. `tests/unit/print-css.test.ts` checks the tokens against `theme.css` and the hidden parts.

## Accessibility

- WCAG 2.2 AA in every theme and mode. The color tables above list every text pair; new pairs get a ratio before they ship.
- Focus: `outline: 2px solid var(--color-ink); outline-offset: 2px` on every interactive element, `:focus-visible` only. Cards use a 3px outline with 4px offset.
- Targets: 40px minimum, 44px under `pointer: coarse`.
- A control drawn smaller than the target (linked tag, secondary or ghost button, checkbox row) carries the `hit-target` class: a transparent `::after` grows the hit area to the target height without changing what is drawn.
- One `h1` per page; headings in order. `lang="es"` on `<html>`.
- Never nest interactive elements: a card is one `<a>`; a checkbox next to a link is a sibling, not a child.
- Menus, tabs and the search dialog follow the WAI-ARIA patterns (arrow keys, Esc, focus return).
- **External links** (decided 2026-11-18, after «Únete al Discord» replaced the page). A link to another website (Discord, Twitch, Kick, YouTube, Ko-fi, DofusDB, any `http` or `https` address off `torrentearcano.com`) opens in a new tab with `target="_blank" rel="noopener"`, and its accessible name ends with « (se abre en otra pestaña)». The text is `siteShellStrings.newTab`; an `sr-only` span (`NewTabNote`) adds it after the visible text, or a link named by `aria-label` appends it there. `NEW_TAB` in `src/components/site/NewTab.tsx` holds the two attributes, `SiteOrWebLink` picks the tab for an address only known at runtime, and `isExternalHref` (`src/lib/site/external.ts`) decides what is another website. Links within the site, and Torre's old Squarespace pages on `torrentearcano.com`, open in the same tab. Guide rich text keeps Torre's «Abrir en nueva pestaña» for links within the site and opens every external link in a new tab. The YouTube video facade is the exception: it plays in place. `tests/unit/external-links.test.tsx` and `tests/e2e/enlaces-externos.spec.ts` check it.
- State is never color alone: done has a tick and text, premium has a lock and a sentence.
- **Forced colors** (Windows high contrast, `@media (forced-colors: active)`): the browser replaces palette fills and shadows with system colors, so what marks a state uses system colors on purpose: the Dofus index filter's indicator and the checked checkbox in `Highlight` with `HighlightText` on them, the progress fills (bars and the souls ring) in `Highlight`, the open checklist step a 2px `Highlight` outline instead of its inset accent ring, and the Ko-fi buttons a `LinkText` border (`forced-color-adjust: none` where a fill must stay). `tests/e2e/colores-forzados.spec.ts` covers them.
- Toasts use `role="status"`; errors use `role="alert"`.
- Wrap every `localStorage` access in `try/catch`; the page works unsaved in strict private mode.

## Performance budgets

From `docs/legacy/plan.md` section 7, enforced by Lighthouse CI on every PR (`pnpm test:lhci`, assertions in `lighthouserc.cjs`):

| Budget | Limit |
|---|---|
| LCP, mobile on 4G | under 2.5 s |
| CLS | under 0.1 |
| JavaScript on guide pages | under 150 KB compressed |
| JavaScript on checklist pages | under 180 KB compressed, the island about 25 KB |
| Images | every image has explicit size and an AVIF or WebP source |

Measured on a phone emulated at 412px and 1.75 DPR, with a slow 4G network (150 ms RTT, 1.6 Mbps) and a 4x slower CPU applied through DevTools, not simulated (decided 2026-11-05). The simulated mode (Lantern) charges every main-thread script that runs before the LCP to the LCP image: a guide whose first screenshot paints at about 150 ms scored about 3 s. Applied throttling measures when it paints.

What keeps them: server components, fonts through `next/font/local` with fallback metrics, at most three stylesheets per page (`AGENTS.md`, Three stylesheets per page at most), CSS motion, no on-request image work, and the Motion library confined to client islands.

The home's LCP is the Krosmoz isle (`krosmoz-640.avif` at 412 px and 1.75x), not text. Its request shares the first six HTTP/1.1 connections with the two preloaded fonts and the stylesheets, so a fourth stylesheet delays it by a full round trip: on 2026-11-18 the home measured 2,436 to 2,475 ms with four sheets and 2,150 to 2,178 ms with three, in interleaved runs on the same machine.

## Design process

1. Mockups first: two or three options as static HTML or images in `tmp/` (git-ignored), built from these tokens and real game art. No placeholders.
2. The user picks. Nothing gets implemented before that.
3. A functional prototype outside `src/` when a flow is unclear (sticky behavior, a multi-step interaction).
4. Implementation, test first (see `AGENTS.md`).
5. Screenshots at 1440, 1024 and 390 px, in Amakna dark and light (plus any theme the change touches), in `tmp/shots/`, each next to its approved mockup in the PR report.

## Anti-patterns

Carried over from Dofus Tools reviews, plus what the duffus study ruled out.

| Rejected | Do instead |
|---|---|
| A side border accent on the active item | a raised fill or a flat border in the accent |
| Gradient pill buttons, or a fill on secondary actions | a flat `--color-btn` fill for the primary action only |
| "Entrar →" text on a card that is already a link | the whole card is the link; the meta line says where it goes |
| Emoji or generic icons when a game asset exists | the game asset in an icon well |
| The same motif on two neighboring cards | one motif per card |
| A character on a background of its own hue | pick another zone |
| Low-alpha white for secondary text | `--color-ink-2` or `--color-muted` |
| A full-screen loader between pages | server rendering; a layout-shaped skeleton only in client islands |
| Animated blur or canvas effects behind content | a static image with a mask |

## Open questions

None open. The rush's road of Dofus was decided on 2026-11-15 (Dofus checklist, «Rush de todos los Dofus»).

Answered on 2026-11-05:

1. **Image widths**: flexible widths, generated at upload by Payload: 480, 800, 1200 and 1600 px in AVIF and WebP, served with `srcset` and `sizes` (Imagery). Guide images open fullscreen at the widest variant (Figure and fullscreen viewer); since 2026-11-12 the viewer opens the original upload instead.
2. **Hero art**: guide v4 (2026-11-05) has no hero art; the quest giver's render stands beside the title instead (Quest header). A per-zone image library is no longer needed for the guide page.
3. **Callout icons**: game art may replace the `i`, `!` and `×` glyphs only if it clearly conveys the same meaning (tip or info, warning, stop); otherwise the glyphs stay (Callout row).
4. **Start place**: from DofusDB, editable in the panel. Already implemented for the start NPC and position (`startNpc`, `startX`, `startY`, filled through `src/lib/guides/summary.ts` when the guide is created or its quest changes, and on demand with «Rellenar desde DofusDB»; a field Torre empties stays empty).
5. **Video hosts**: YouTube only. All 44 video embeds in the 1796 legacy Squarespace pages are YouTube (Video facade).
