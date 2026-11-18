---
type: concept
title: Zone background
description: The landscape of a quest guide's or achievement page's zone, fixed behind the whole page under a flat veil. Where the image comes from (the page's own upload or its subarea's, a cropped DofusDB map render), how the panel button and pnpm zones:backgrounds fill it, how pages read it inside their cached read, and the CSS that keeps text and rules readable over it.
tags: [frontend, zone-background, subareas, dofusdb, media, accessibility, performance]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-18T11:06:38.803Z
sources:
  - id: openwiki-source-4a5208ee002f2e6da1e00546
    resource: repo://scripts/zone-backgrounds.ts
  - id: openwiki-source-49969ab7321802b7685c534f
    resource: repo://src/collections/zone-background-field.ts
  - id: openwiki-source-e5af2dd3ba3611213f7b4cff
    resource: repo://src/components/admin/ZoneBackgroundButton.tsx
  - id: openwiki-source-7ba3e6f5057719fdf70c6941
    resource: repo://src/components/game/game.css
  - id: openwiki-source-187c07aaac79953b10defe9e
    resource: repo://src/components/game/ZoneBackground.tsx
  - id: openwiki-source-273f067cfdf4642d554d72d2
    resource: repo://src/endpoints/zone-background.ts
  - id: openwiki-source-60e471d2f48d300cdb8293f0
    resource: repo://src/lib/zones/backfill.ts
  - id: openwiki-source-0ea598c55dee67445d1c39bb
    resource: repo://src/lib/zones/background.ts
  - id: openwiki-source-b294c0a1322121b959884eaf
    resource: repo://src/lib/zones/fill.ts
  - id: openwiki-source-f739f9787bd4d60736bef041
    resource: repo://src/lib/zones/read.ts
  - id: openwiki-source-4416cc7317c4d82e3e3b5a9d
    resource: repo://tests/e2e/fondo-zona.spec.ts
  - id: openwiki-source-5bc1bf3e63433094c2d46303
    resource: repo://tests/integration/zone-background.test.ts
  - id: openwiki-source-2d8ede14f19a3d075537d22e
    resource: repo://tests/integration/zone-backgrounds-script.test.ts
  - id: openwiki-source-06d266da76beca86f5df0753
    resource: repo://tests/unit/zone-background-layer.test.tsx
  - id: openwiki-source-54e102c54fd6743f9b6650d2
    resource: repo://tests/unit/zone-background.test.ts
  - id: openwiki-source-4fa62811fc3dcaa57ade9b47
    resource: repo://tests/unit/zone-veil.test.ts
generated: { by: "claude-code", at: "2026-11-18T11:06:38.803Z" }
---

# Zone background

A quest guide or an achievement page shows the landscape of its zone behind the whole page (DESIGN.md, Zone background, decided by Torre on 2026-11-16 from the full-page variant of the color prototype). The image is server markup with no JavaScript, it never loads from DofusDB at runtime, and a page without one renders as before.

## Which image a page gets

`readZoneBackground(payload, { override, quest })` (`src/lib/zones/read.ts`) resolves it on the server:

1. **The page's own image.** Quest guides and achievement pages share an optional sidebar upload, `background` («Fondo de la página», `pageBackgroundField` in `src/collections/zone-background-field.ts`). When it is set, it wins.
2. **The subarea's image.** Otherwise the page uses its quest's subarea. `questSubAreaId` (`src/lib/zones/background.ts`) takes the `subAreaId` of the quest's first start position that has one (saved by `pnpm data:refresh` from DofusDB's map positions, see [DofusDB game data refresh](../data/dofusdb-refresh.md)), else the first objective's. An achievement page uses the first quest of its list (`achievementZoneQuest`). The query finds the `subareas` row with that `dofusId` and a `background`, as a visitor (`overrideAccess: false`).
3. **Nothing.** No override and no subarea with a background returns `null`, and the page renders no layer.

Both readers call it inside their cached read: the quest guide's `readGuide` (`src/app/(frontend)/[slug]/data.ts`) with the guide's `background` and quest, and `readAchievementPage` (`src/lib/achievements/queries.ts`) with the page's `background` and first quest. The result travels in the `unstable_cache` entry, so a visit costs no extra query; an entry stored before the field existed has no `zoneBackground` and renders without one. Saving a subarea expires the `guide-pages` and `achievement-pages` tags. See [Public quest guide page](guide-page.md) and [Achievement page](../achievements/achievement-page.md).

## Where the subarea's image comes from

A subarea (`subareas`, see [Collections and access](../cms/collections.md)) is DofusDB data, read-only in the panel except two fields that belong to Torre: `background` («Fondo de la zona», an upload to `media`) and `backgroundMapId` («Mapa del fondo», the DofusDB map whose render it is). Only an admin updates a subarea, and `scopeSubAreaWrite` puts every other field back to its saved value on a panel save; the refresh writes without a user and sends only its own fields, so it never touches the background.

DofusDB has no art per zone, so the background is the render of one of the subarea's maps, `https://api.dofusdb.fr/img/maps/1/{mapId}.jpg` (`ZONE_RENDER_URL`, about 1910 × 970). `fillZoneBackground(payload, subAreaId, { mapId })` (`src/lib/zones/fill.ts`) does the work:

1. **Pick the map.** The `mapId` asked for, else the subarea's saved `backgroundMapId`, else `pickBackgroundMap` over the subarea's maps (`mapIds` from DofusDB's `subareas`, then their `map-positions`, kept in the subarea's order): an outdoor map where the quest of a published guide starts (`guideStartMaps`), then the outdoor map of the subarea's main world map (the one with most outdoor maps) nearest the center of the others, then the first map. Outdoor maps read as places; indoor ones are mostly black. No maps means `no-maps`.
2. **Store the render once per map.** `renderMedia` looks for a Media file whose `gameAsset` is `dofusdb-map-render:{mapId}` and reuses it; otherwise it downloads the render (30-second timeout, its own User-Agent, refusing a non-image response), crops it and uploads it. The «DofusDB» watermark sits 17 to 50 px above the bottom edge, so `watermarkCrop` drops the bottom 7 percent and the right 2 percent, proportionally, about 1872 × 902; `cropZoneRender` re-encodes the result as JPEG at quality 85, and Payload makes the usual AVIF and WebP sizes. The alt text is «Paisaje de {subzona}, en {área}», or without the area when it repeats the name (`zoneBackgroundAlt`).
3. **Save both fields** on the subarea. If DofusDB fails, it throws and the subarea stays as it was.

Like other imported game art, the file carries a `gameAsset` key, so `refuseGameAssetDelete` keeps panel users from deleting it, and the delete guard refuses to delete a Media file a subarea, a quest guide or an achievement page uses as its background (see [Admin panel](../cms/admin-panel.md)).

### In the panel

`ZoneBackgroundButton` (`src/components/admin/ZoneBackgroundButton.tsx`) is the description of «Mapa del fondo». For an admin on a saved subarea it adds «Traer fondo de DofusDB», which posts the typed map (or nothing) to `POST /api/subareas/:id/zone-background` and announces the result in a status line: working, done, DofusDB gave no map, not allowed, or failed. On success it puts the new Media and map into the form as their saved values, so the form does not look edited. To change the image, Torre types another map and presses again, or uploads his own image in «Fondo de la zona».

The endpoint (`src/endpoints/zone-background.ts`, mounted by the `subareas` collection) answers 401 without a user, 403 for a non-admin, 400 for a non-numeric subarea or a map that is not a positive integer, 404 when DofusDB gives no map, 502 when the download or crop fails, and 200 with `{ mapId, mediaId }`; every answer is `Cache-Control: no-store`.

### `pnpm zones:backgrounds`

`scripts/zone-backgrounds.ts` fills the subareas that published pages use and that still have no background (`src/lib/zones/backfill.ts`). `pendingZones` collects the published quest guides and the published achievement pages in state `published` that have no background of their own, groups them by the subarea of their quest, and keeps the subareas without a background. Without `--apply` it only lists them, with the pages that use each one; with `--apply` it runs `fillZoneBackground` on each, and one failure does not stop the others. It only fills what is empty, so running it again changes nothing. It goes through `databaseScriptRefusal`, so a remote database needs `--remote` and production `--production`, and exits with an error when any subarea was left without a background. Run it after the `zone_backgrounds` migration and a `pnpm data:refresh`, which stores the subarea of each start map.

## The layer

`ZoneBackground` (`src/components/game/ZoneBackground.tsx`, styles at the end of `game.css`) renders first inside the page wrapper, before `<main>`:

- **Position.** `.zone-bg` is `position: fixed` at the top left, full width and `100lvh` tall (the large viewport, so a collapsing mobile browser bar leaves no gap), at `z-index: -2`: under the ambience particles and every surface, still while the page scrolls. It is not `background-attachment: fixed`, which iOS ignores. The image covers it with `object-fit: cover`, centered.
- **Veil.** `.zone-bg::after` is a flat layer of `--color-bg` at 88 percent (`--zone-veil`) in both modes, with no gradient. The prototype's 80 and 84 percent let text drop to 3.1:1 over a bright or dark map. Because the veil is the theme's own background, it works the same in every theme. Header bar, sheet, cards and wells keep their own opaque surfaces.
- **Text over the veil.** In dark mode 88 percent is enough. In light mode the hues, `accent`, `accent-2` and `muted` pass 4.5:1 on the background with little room, so on everything after `.zone-bg` they are mixed with 16 percent black (`--zone-ink-shift`).
- **Rules over the veil.** Everything after `.zone-bg` gets `--zone-rule`, `--color-muted` at 70 percent over `--color-line`, which reaches 3:1 over the veil on any map and on `--color-surface`. The page dividers (the quest header's rule, the rules between facts and between steps, the achievement sheet and its quest line) use `var(--zone-rule, var(--color-line))`, so pages without a zone background keep `--color-line`, which alone dropped to 1.1:1 against the art.
- **Loading.** The layer is decorative: `aria-hidden`, `alt=""`, `loading="lazy"`, `decoding="async"` and `fetchPriority="low"`, never preloaded. `sizes` follows `object-fit: cover`: `100vw`, or, when the window is taller than the image, the image's ratio times `100vh` (`(max-aspect-ratio: w/h) …vh, 100vw`), so a phone in portrait takes a file wide enough instead of stretching the 800px one about four times. The page text stays the LCP element.
- **Skipped.** Under `prefers-reduced-data: reduce`, `prefers-reduced-transparency: reduce` and in print the layer is `display: none`, which also keeps the lazy image from downloading. The print stylesheet hides it too (see [Styles and layout shell](styles-and-shell.md)).

## Tests

- `tests/unit/zone-background.test.ts`: the quest's subarea from the first start map, then the first objective; an achievement page's first quest; Torre's requested map winning even indoors; the outdoor start map of a published guide preferred; the main world map's outdoor map nearest the center; the first map without outdoor maps and `null` without maps; the watermark crop and its scaling; the render URL; the alt text.
- `tests/unit/zone-background-layer.test.tsx`: the layer is decorative and hidden from screen readers, lazy with low priority, and offers AVIF and WebP at the width the image covers.
- `tests/unit/zone-background-fields.test.ts`: a background in use cannot be deleted.
- `tests/unit/zone-veil.test.ts`: the veil is stronger than the prototype's; in every theme and mode each text color passes 4.5:1 over the veil on a white, a mid-grey and a black map, and the rules pass 3:1 over the veil and over the surface.
- `tests/integration/zone-background.test.ts`: the endpoint without a session, as an editor and with a bad map; an admin bringing the cropped render and saving it; another map brought, and a repeat that neither downloads again nor duplicates; the refresh renaming a subarea without touching its background; a panel account changing only the background, and an editor not editing it; a published guide's start map chosen; a quest taking its start map's subarea background; the page's own image winning; no subarea background, no background.
- `tests/integration/zone-backgrounds-script.test.ts`: a dry run lists the published pages' subareas without a background and fetches nothing; `--apply` fills them; a second run does nothing.
- `tests/e2e/fondo-zona.spec.ts`: a seeded guide and achievement page with the landscape fixed behind the whole page and the title still the LCP element; the veil at 88 percent in both modes; the rules not falling back to `--color-line`; the disabled next-achievement card opaque over the landscape; light-mode hue text darkened over the veil; and a guide and an achievement without a zone rendering no layer.

## Related pages

- [Public quest guide page](guide-page.md)
- [Achievement page](../achievements/achievement-page.md)
- [Collections and access](../cms/collections.md)
- [DofusDB game data refresh](../data/dofusdb-refresh.md)
- [Styles and layout shell](styles-and-shell.md)
