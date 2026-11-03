# Visual study of duffus.fr

Status: study done on 2026-11-02 with Playwright (Chromium 1248) on ten routes, each at 1440, 1024 and 390 px, in dark and light. Values come from `getComputedStyle`, the site's stylesheets and frame sampling during transitions. Screenshots and recordings stay out of the repo because they are third-party content; they live in the git-ignored `tmp/duffus/` folder of whoever ran the study.

duffus.fr is the visual reference named in `docs/plan.md` section 7. We take its structure, density and motion. We do not take its colors, its wording or its layout pixel for pixel. `DESIGN.md` turns the verdicts below into our rules.

## How the site is built

- React SPA on Vite. The HTML shell is empty, so nothing renders without JavaScript. Client-side routing shows a full-screen loader (the logo egg pulsing on a dark field) for about half a second between pages.
- Barlow at weights 400 to 900, one family for everything. Root size 16px; most sizes are rem fractions (0.78rem, 0.88rem, 0.92rem, 0.98rem).
- Theme on `<html data-theme="dark|light">`, saved in `localStorage` as `duffus-theme`. Dark is the default.
- Colors are CSS custom properties on `:root` with French names (`--bloc`, `--texte-2`, `--nv-panneau`). Most surfaces are white or black at low alpha over a blurred radial background, not solid colors.
- Ads from several networks (Google, Criteo, ID5, Blockthrough). They delay `networkidle` past 60 seconds. We have no ads, so none of that applies to us.

Routes sampled: `/`, `/guides`, `/guide/dofus-emeraude`, `/quetes`, `/quete/convoi-humanitaire`, `/donjons`, `/donjon/crypte-de-kardorim`, `/succes`, `/objets`, `/almanax`.

## Measured values

### Typography

| Role | Size / line height | Weight | Tracking | Case |
|---|---|---|---|---|
| Home wordmark | 93.6px / 0.88 | 900 | -0.04em | as written |
| Guide title (`/guide/*`) | 43.2px / 1.1 | 700 | -0.03em | sentence |
| Section title on home | 37.4px / 1.12 | 900 | -0.02em | sentence |
| List page title (`/quetes`) | 28px / 1.15 | 800 | -0.02em | sentence, last word in accent |
| Card or block title | 20.8px / 1.2 | 800 | normal | sentence |
| Body | 15.5 to 16px / 1.5 | 400 | normal | |
| Secondary body, subtitles | 14.08px / 1.5 | 400 | normal | |
| Controls (filters, nav) | 14.08 to 15.68px | 500 to 700 | normal | |
| Meta, chips, tab labels | 12.16 to 12.8px / 1.5 | 400 to 600 | normal | |
| Eyebrow above a title | 13.6px | 400 | 0.17em | uppercase, accent |
| Section label, table head | 9.9 to 11.5px | 700 to 800 | 0.08 to 0.14em | uppercase |

What stands out: big titles are tight (negative tracking, line height near 1), small labels are spaced and uppercase, and the body never goes under 15px in guide content. Eleven distinct sizes appear on a single quest page, but they cluster on a scale of roughly 0.7, 0.78, 0.88, 1, 1.3, 1.75, 2.7 rem plus the hero.

### Spacing, containers and grid

- Gaps cluster at 2, 4, 6, 8, 10, 12, 16, 18, 24, 28, 32, 48, 56 and 64px. Small gaps (6 to 12px) dominate inside components; 48 to 64px separate sections.
- Containers: 1400px (header and home), 1416px with gutters, 1220px (quest table), 1200 to 1320px (grids), 1100px (quest hero card), 800px (quest step column).
- Grids: Dofus cards 7 columns of 161 by 150px with 12px gaps at 1440; dungeon cards 6 columns of about 212 by 204px; tool cards on the home in 4 columns.
- Breakpoints in the CSS: 400, 560, 600, 760, 768, 780, 900, 1000, 1200, 1500, 1600 and 1700px, plus `(hover: hover) and (pointer: fine)` and `(pointer: coarse)`. Each component picks its own, so there is no shared scale.

### Shape, borders, shadows

- Radii: 999px for pills (buttons, chips, search, nav items), 28px for the home hero card and Dofus cards, 20px for dungeon cards, 16px for step cards and dropdown panels, 12 to 14px for stat tiles and the white call to action, 10px for list items, 6 to 8px for table rows and icon wells, 4px for the progress track.
- Borders: almost none. Where they exist they are 1px white at 6 to 13 percent alpha (table rows, separators). Card edges come from a translucent fill (`rgba(255,255,255,.04)` in dark) against the background.
- Shadows: rare. Map screenshots carry `0 2px 6px rgba(0,0,0,.3), 0 14px 32px rgba(0,0,0,.35)`. Active and progress elements get an accent glow `0 0 5px` at 70 percent. Menus have no shadow; they rely on blur.

### Header and navigation

- Fixed, 74px high, transparent, `z-index: 50`. Brand left; plain links (Guides, Archimonstres, Avis de recherche); four dropdown groups in accent color (Encyclopédie, Outils, Stuffs, Builder); a solid accent pill "Se connecter" (133 by 44px, 999px radius, 14px bold dark text); the theme toggle (56 by 30px pill); Discord and an info icon.
- Nav links are 36px high pills with `6px 14px` padding; hover fills a faint pill. Transition `color, background, transform .18s`.
- Dropdowns: panels with `rgba(24,24,24,.89)`, `backdrop-filter: blur(16px) saturate(1.5)`, 16px radius, 12px padding, no border or shadow. Each item has a small game icon. Opening animates `opacity` and `transform` over 220ms.
- Under 760px the header becomes a floating rounded bar (16px inset from the edges) and a burger opens a full-height sheet of full-width rows over a blurred page.
- Search is a command palette on Ctrl K. The trigger is hidden at 1440 in the sampled build; the stylesheet defines its overlay (`gs-voile`, 150ms ease-out fade) and panel (`gs-entre`, 200ms, from `translateY(-6px) scale(.97)`).

### Cards

- Dofus card (`/guides`): 161 by 150px, 28px radius, translucent fill, the egg icon centered, name in 13.8px bold, level range in muted 11.8px, a completion percentage in a small ring badge at top right. Layers inside: background art, overlay, halo. Hover tints the border with the accent (`border-color, box-shadow, background .25s`), fades the halo in (`opacity .3s`) and settles the background art from about 1.07 to 1 scale over 600ms.
- Dungeon card (`/donjons`): 20px radius, the boss render centered over a faint circular ornament, title over the render's feet, a footer row with a "Niv. 40" pill and a five-star difficulty pill.
- Tool card (home): icon, title, one-line description. No call-to-action text; the whole card is the link.
- Stat tile: 118 by 59px, 14px radius, icon left, number in bold over an uppercase micro label ("1 092 QUÊTES").

### Controls and states

| Control | Measured |
|---|---|
| Primary button | solid accent pill, 44px high, 24px side padding, 14px bold, dark text |
| Secondary call to action | white fill, black text, 12px radius, 46px high, chevron after the label |
| Filter button | 40px pill, `rgba(255,255,255,.04)` fill, 14px medium, icon before the label |
| Search field | 40px pill, `rgba(0,0,0,.18)` fill, icon at left, a live count at right ("616/616") |
| Segmented tabs | 29px high, 13px radius; active tab in accent text on accent at 18 percent; idle at 50 percent white; `background-color, color .16s cubic-bezier(.23,1,.32,1)` |
| Chip | 22px pill, 12px text, 4 percent fill; used for zone and coordinates; coordinates copy on click |
| Checkbox | 22px square, 7px radius, `transform .1s` on press |
| Progress bar | 14px track, 4px radius, `rgba(0,0,0,.32)`, segmented ticks per chapter, percentage beside it |
| Tooltip | `--infobulle` solid panel (`#282824` in dark), enters with `translateY(4px)` to 0 |
| Scroll to top | round button bottom right, fades from 0 to .85 after the first screen |
| Support pill | fixed bottom right, 60px high, always visible |

States: hover is a fill step (`--bloc` 4 percent to `--bloc-survol` 8 percent) plus a color change, never a lift. Press scales to about .96 over 160ms with `cubic-bezier(.23,1,.32,1)`. Done items in lists keep their row and tick the checkbox; a "hide done" toggle filters them out. Empty icon slots use `grayscale(1)` (`--slot-vide`).

Loading: the route loader described above. No skeletons were seen. No empty-state screens were reachable without an account.

### Page anatomy

- Quest page: a hero card (1100px) with the NPC render left, breadcrumb eyebrow, title, description with "Lire la suite", level and zone; at right the start map screenshot with coordinates and nearest zaap, each with a copy button; rewards (XP range, kamas, item icons). Then "Infos rapides": required level, prerequisites as linked rows, related achievement, dungeon, and items needed with quantities and an expand chevron per item. Then the steps: a vertical column of 16px-radius cards (`18px 22px` padding), each with a round type badge in the left gutter (talk, gather, move, fight), the NPC render, "Parlez à" plus the NPC name in gold, and dialogue choices as numbered pills. Step screenshots sit between cards at 800px wide with a 16px radius. A "Mode compact" switch at the top trims the hero.
- Dofus guide page: a character render on a pedestal at left with a vertical timeline, title block centered, a warning callout for requirements, a summary strip (recommended level, prerequisites 0/14, quests 0/8, dungeons, segmented progress bar, percentage), chapters as numbered sections whose rows have a checkbox, NPC avatar, quest name and zone and coordinate chips. A sticky right column holds the Dofus card and tabs ("Chapitres", "Objets nécessaires") with chapter cards showing an image and a done count.
- List pages (`/quetes`, `/donjons`, `/objets`): centered title with the last word in accent, one-line subtitle, a toolbar (search with count, filter pills), then a table or grid. The quest table has 40 to 45px rows, a checkbox column, a type icon, and accent uppercase column heads.

### Motion

| What | Duration | Easing | Properties |
|---|---|---|---|
| Color and fill on hover | 150 to 180ms | `ease` | color, background, opacity |
| Press | 100 to 160ms | `cubic-bezier(.23,1,.32,1)` | scale |
| Tabs, chips | 120 to 160ms | `cubic-bezier(.23,1,.32,1)` | background-color, color |
| Dropdown panels | 220ms | `ease` | opacity, transform |
| Search overlay and panel | 150ms and 200ms | `ease-out`, `cubic-bezier(.23,1,.32,1)` | opacity; translateY(-6px) scale(.97) to rest |
| Card hover | 250 to 600ms | `ease` | border-color, halo opacity, art scale |
| Section and hero enter | 500 to 800ms | `cubic-bezier(.23,1,.32,1)` or `ease` | opacity plus translateY(8 to 30px), translateX for the map, a small blur on the NPC |
| Scroll reveals | 600 to 700ms | `cubic-bezier(.23,1,.32,1)` | opacity, translate; triggered by a class (`est-revele`) |
| Ambient | continuous | | canvas fog layers at 5 to 10 percent opacity drifting behind quest heroes |

`cubic-bezier(.23,1,.32,1)` (a strong ease-out) is the signature curve. Keyframes in the CSS: `fadeInUp` (30px, 800ms), `fadeIn`, `scaleIn` (from .9), `bd-entre` (from `translate(-20px) scale(.96)`), `djCardIn` (10px). The stylesheet has a `prefers-reduced-motion: reduce` block. Framer Motion writes inline `opacity` and `transform` on hero pieces during entrance; on page change the loader shows first, then the hero pieces enter.

### Light theme

The light theme is a mid grey-green (`#3E3F3C` base under lighter radial blobs) with white text. It reads as a second dark theme, not a light one.

## Verdicts

Context for every verdict: about 1 800 server-rendered guide pages that must stay under 150 KB of JavaScript, checklists with per-member progress, members and premium features, and a reader who often has the game open beside the browser.

### Typography

| Pattern | Verdict | Why |
|---|---|---|
| Sentence-case titles | Skip | Decided 2026-11-02: page and section titles are uppercase Barlow Condensed, as on Dofus Tools and Torre's site; card titles and body stay in normal case |
| One family, Barlow | Adapt | Decided 2026-11-02: we keep the Dofus Tools families, Barlow Condensed for display, Barlow for body, Lilita One only for accents such as big step numbers. Barlow is what duffus uses for body, so the two sit well together |
| The type scale, weights and rhythm | Adopt | Tight, heavy titles over a 16px body at 1.5, uppercase spaced micro labels. We take the scale and apply it to our families (`DESIGN.md`, type tokens) |
| Last word of a page title in accent | Adopt | Cheap, readable hierarchy on list pages ("Todas las misiones") |
| Body under 15px in guide steps | Skip | Torre's guides are long reading; our body stays at 16px |

### Layout and navigation

| Pattern | Verdict | Why |
|---|---|---|
| Fixed transparent 74px header | Adapt | We keep a header that does not hide content, but solid once the page scrolls, because guide screenshots under a transparent bar hurt legibility. Height 64px |
| Dropdown groups with game icons | Adopt | Our nav has the same shape (Misiones, Logros, Dofus, Clases, Mazmorras, Herramientas) and every group has real game icons |
| Blurred menu panels | Adapt | Keep the look, but with a near-opaque fallback where `backdrop-filter` is missing or slow |
| Solid accent sign-in pill in the header | Adopt | One clear primary action per view |
| Floating mobile bar plus full-sheet menu | Adopt | Works well at 390px; the sheet rows are big tap targets |
| Command palette on Ctrl K | Adopt | 1 800 guides plus achievements need fast search; it sits on Postgres full text (plan section 4). It is the one client island in the shell |
| Content widths 1400, 1200, 1100, 800 | Adopt | Maps to our pages: hubs and tables, cards grids, guide hero, step column |
| Per-component breakpoints | Skip | Twelve breakpoints is drift. We use a short shared set plus container queries for components |

### Components

| Pattern | Verdict | Why |
|---|---|---|
| Translucent fills instead of borders | Adapt | We use solid surface tokens so contrast is predictable and AA can be checked, with 1px hairlines where rows need separating |
| Low-alpha secondary text (40 to 54 percent white) | Skip | Several of these fail AA on their backgrounds; our muted text is a solid token at 4.5:1 or more |
| Dofus card with progress ring | Adopt | Our guías cards already do this; the progress badge becomes live with member progress |
| Dungeon card with boss render, level and difficulty pills | Adopt | Same data exists for our dungeon guides |
| Tool card where the whole card is the link | Adopt | Matches our old rule against "Entrar →" on cards |
| Stat tiles with icon, number and micro label | Adopt | Home and guide summaries; numbers come from the database |
| Quest hero with NPC, map, coordinates, rewards | Adopt | This is the structure Torre's guides already have (Prerrequisitos, Necesitarás, Recompensas, NPC, coordinates); the import turns it into fields |
| Step cards with type badge in the gutter | Adopt | Gives 1 272 quest guides a consistent rhythm; badge types come from the step block type |
| Numbered dialogue choices | Adopt | Torre writes these as text today; a dialogue block makes them scannable |
| Coordinates chip that copies for `/travel` | Adopt | We already ship a copy-coordinates script; it becomes a component |
| Summary strip with segmented progress | Adopt | The checklist summary, keyed to member progress |
| Sticky side column with tabs (chapters, items) | Adopt | The checklist's needs panel and step index |
| Quest table with checkbox column and "hide done" | Adopt | Achievement indexes become tickable lists that write to global progress |
| Search field with live result count | Adopt | Tells the reader the filter worked |
| Segmented tabs with accent tint | Adopt | Replaces ad hoc toggles |
| White secondary call to action | Skip | A pure white block is the loudest thing on the page in dark mode and fights the game art |
| Floating support pill | Skip | It covers content on phones. Ko-fi goes in the header menu and footer |
| Scroll-to-top button | Adopt | Quest pages run to 16 000px |
| "Mode compact" switch | Adapt | Useful for players who already know a quest. Decided 2026-11-02: it is a premium feature, enforced on the server; the free view is the full guide |
| Empty slots in grayscale | Adopt | Clear "not yet" state for items and achievements without extra color |

### Motion

| Pattern | Verdict | Why |
|---|---|---|
| Strong ease-out `cubic-bezier(.23,1,.32,1)` | Adopt | It is the feel the plan asks for; it becomes our `--ease-out` |
| 150 to 220ms for hover, press, menus | Adopt | Quick enough that nothing feels slow on a 1 000-row list |
| Press scale on buttons and chips | Adopt | Transform only, cheap |
| Hero entrance on load | Adapt | CSS keyframes on server-rendered markup, no JavaScript, 400ms instead of 600 to 800ms, and never on the LCP image |
| Full-screen route loader | Skip | We render on the server; a loader would add a blank frame before content we already have |
| Scroll reveals by class | Adapt | CSS scroll-driven animation on hubs and the home only, with content visible when unsupported; none inside guide bodies |
| Card art settling on hover | Adopt | Transform and opacity, mouse pointers only |
| Blur on entering pieces | Skip | Filter animation is expensive on low-end phones |
| Canvas fog behind heroes | Skip | Continuous work for decoration; a static image with a CSS mask gives the depth |
| Framer Motion on every page | Skip | Motion ships only inside client islands (checklist, dialogs); guide pages use CSS |

### Color and theming

| Pattern | Verdict | Why |
|---|---|---|
| Lime accent and grey-green palette | Skip | Their identity, not ours |
| Dark by default with a toggle | Adopt | Already our rule; our toggle is the egg switch |
| Light theme as a lighter dark | Skip | Each of our six themes has a real light mode |
| Theme in `localStorage` on `<html data-theme>` | Adapt | Only the dark or light mode works this way for us (cookie plus `localStorage`, set before first paint). The theme itself is rendered by the server, because five of our six themes are premium |

## What this changes in our plan

- The guide page structure in Torre's content maps onto duffus's quest page almost one to one. That supports turning Prerrequisitos, Necesitarás, Recompensas, the start NPC and coordinates into fields during the import (plan section 8, step 2).
- Search as a command palette needs a server endpoint over the Postgres full-text index and one small client island. Budget it inside the shell's JavaScript.
- Member progress makes the Dofus cards, the summary strip and the quest table live. Until phase 4 they read the browser's progress.
