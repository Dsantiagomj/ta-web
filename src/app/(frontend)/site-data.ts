import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import { CHECKLISTS_REVALIDATE, CHECKLISTS_TAG } from '@/lib/checklists/cache'
import { checklistEntries, checklistNavItems, checklistTeaser } from '@/lib/checklists/list'
import { readChecklists, readChecklistTeaser } from '@/lib/checklists/queries'
import { DOFUS_GUIDES_REVALIDATE, DOFUS_GUIDES_TAG } from '@/lib/dofus-guides/cache'
import { dofusNavItems } from '@/lib/dofus-guides/nav'
import { readDofusList } from '@/lib/dofus-guides/queries'
import { GUIDE_PAGES_REVALIDATE, GUIDE_PAGES_TAG } from '@/lib/guides/cache'
import { PAGES_REVALIDATE, PAGES_TAG } from '@/lib/pages/cache'
import { pageNavItems } from '@/lib/pages/page'
import { readPageNav } from '@/lib/pages/queries'
import { SECTION_PAGES_REVALIDATE, SECTION_PAGES_TAG } from '@/lib/section-pages/cache'
import { readSectionNav } from '@/lib/section-pages/queries'
import { countSiteGuides } from '@/lib/site/counts'
import { fetchLiveState, LIVE_REVALIDATE, liveUrl } from '@/lib/site/live'
import { SITE_COPY_REVALIDATE, SITE_COPY_TAG } from '@/lib/site-copy/cache'
import { readIndexTexts, readNavigation, readSiteSettings } from '@/lib/site-copy/queries'

// Las cifras de la cabecera cambian cuando cambian las guías: la misma etiqueta de caché
// que las páginas de guía, que los hooks de quest-guides caducan al guardar.
export const loadSiteCounts = unstable_cache(
  async () => countSiteGuides(await getPayload({ config })),
  ['site-counts'],
  { tags: [GUIDE_PAGES_TAG], revalidate: GUIDE_PAGES_REVALIDATE },
)

// Los Dofus del menú y de la búsqueda: cambian con las guías de Dofus y sus huevos, que
// caducan esta etiqueta al guardar (src/lib/dofus-guides/cache.ts).
export const loadDofusNav = unstable_cache(
  async () => dofusNavItems(await readDofusList(await getPayload({ config }))),
  ['dofus-nav'],
  { tags: [DOFUS_GUIDES_TAG], revalidate: DOFUS_GUIDES_REVALIDATE },
)

// Las checklists, una sola lectura en caché para el índice /checklists, el menú, el pie, la
// búsqueda y la portada: la caducan las checklists y las guías de Dofus, de donde salen el
// huevo y el color (src/lib/checklists/cache.ts).
export const loadChecklists = unstable_cache(
  async () => checklistEntries(await readChecklists(await getPayload({ config }))),
  ['checklists'],
  { tags: [CHECKLISTS_TAG], revalidate: CHECKLISTS_REVALIDATE },
)

/** Lo que pinta el menú de cada checklist, sacado de loadChecklists. */
export const loadChecklistNav = async () => checklistNavItems(await loadChecklists())

// La tarjeta «???» del índice, del global checklists-index: su hook caduca esta etiqueta.
export const loadChecklistTeaser = unstable_cache(
  async () => checklistTeaser(await readChecklistTeaser(await getPayload({ config }))),
  ['checklist-teaser'],
  { tags: [CHECKLISTS_TAG], revalidate: CHECKLISTS_REVALIDATE },
)

// Las páginas sueltas para el pie (los enlaces legales) y la búsqueda: las caducan los hooks
// de las páginas (src/lib/pages/cache.ts).
export const loadPageNav = unstable_cache(
  async () => pageNavItems(await readPageNav(await getPayload({ config }))),
  ['page-nav'],
  { tags: [PAGES_TAG], revalidate: PAGES_REVALIDATE },
)

// Las clases y mazmorras publicadas, para las listas del menú (classLinks, dungeonLinks): las
// caducan los hooks de sus colecciones (src/lib/section-pages/cache.ts).
export const loadSectionNav = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    const [classes, dungeons] = await Promise.all([
      readSectionNav(payload, 'class-pages'),
      readSectionNav(payload, 'dungeon-pages'),
    ])
    return { classes, dungeons }
  },
  ['section-nav'],
  { tags: [SECTION_PAGES_TAG], revalidate: SECTION_PAGES_REVALIDATE },
)

// «Ajustes del sitio»: el pie, las redes y los metadatos de todas las páginas. Su hook y el de
// «Portada e índices» caducan esta etiqueta al guardar (src/lib/site-copy/cache.ts).
export const loadSiteSettings = unstable_cache(
  async () => readSiteSettings(await getPayload({ config })),
  ['site-settings'],
  { tags: [SITE_COPY_TAG], revalidate: SITE_COPY_REVALIDATE },
)

// «Portada e índices»: los títulos, entradillas y SEO de la portada y de los tres índices.
export const loadIndexTexts = unstable_cache(
  async () => readIndexTexts(await getPayload({ config })),
  ['index-texts'],
  { tags: [SITE_COPY_TAG], revalidate: SITE_COPY_REVALIDATE },
)

// «Navegación»: las secciones del menú, el pie y la portada, y los Dofus de la tarjeta del
// menú. Caduca al guardarla (la etiqueta de los textos del sitio) y con las guías de Dofus y sus
// huevos, de donde salen los destacados.
export const loadNavigation = unstable_cache(
  async () => readNavigation(await getPayload({ config })),
  ['navigation'],
  { tags: [SITE_COPY_TAG, DOFUS_GUIDES_TAG], revalidate: SITE_COPY_REVALIDATE },
)

// El directo de Torre, del worker de Twitch (src/lib/site/live.ts): una petición por minuto
// como mucho, sea cual sea el tráfico. Al caducar se sirve el valor de antes mientras se pide
// el nuevo, y un worker caído o lento se guarda como «sin directo», así que nunca frena una
// página más de una vez por minuto.
export const loadLiveState = unstable_cache(
  async () => fetchLiveState(liveUrl(process.env)),
  ['twitch-live'],
  { revalidate: LIVE_REVALIDATE },
)
