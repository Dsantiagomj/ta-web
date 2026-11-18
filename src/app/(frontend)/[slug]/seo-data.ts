import { achievementPageStrings } from '@/lib/achievements/strings'
import { checklistRoute } from '@/lib/checklists/page'
import { checklistPageStrings } from '@/lib/checklists/strings'
import { contentDate } from '@/lib/content-date/format'
import { dofusEgg } from '@/lib/dofus-guides/egg'
import { dofusPageStrings } from '@/lib/dofus-guides/strings'
import { guideSeo } from '@/lib/guides/page'
import { sitePageRoute, sitePageSeo } from '@/lib/pages/page'
import type { ShareCard } from '@/lib/seo/share-card'
import { SITE_URL } from '@/lib/site/origin'

import { loadAchievementPage } from './achievement-data'
import { loadChecklist } from './checklist-data'
import { loadGuidePage } from './data'
import { loadDofusGuide } from './dofus-data'
import { loadSitePage } from './page-data'

/** Lo que dicen de una página de /<slug> sus metadatos, su JSON-LD y su tarjeta al compartir. */
export interface SlugSeo {
  title: string
  description: string
  /** El título visible (el h1): el titular del JSON-LD y el de la tarjeta. */
  headline: string
  url: string
  preview: boolean
  card: ShareCard
  dates: { published: string | null; modified: string | null }
  /** Las guías, los logros, las guías de Dofus y las páginas sueltas llevan un Article. */
  article: boolean
}

/** Título y descripción de un logro: el nombre y cuántas misiones tiene. */
function achievementSeo(name: string, quests: number) {
  const s = achievementPageStrings.seo
  return { title: s.title(name), description: s.description(name, quests) }
}

/**
 * Lo que dicen los metadatos de la página del slug, o null si no hay página (o la que hay
 * lleva a Squarespace). Las lecturas son las de la página, en caché y una vez por petición.
 */
export async function slugSeo(slug: string): Promise<SlugSeo | null> {
  const page = await loadGuidePage(slug)
  if (page) {
    const { guide } = page
    const zone = page.zoneBackground?.src
    return {
      ...guideSeo(guide),
      headline: guide.title,
      url: `/${guide.slug}`,
      preview: page.preview,
      card: {
        kind: 'quest',
        title: guide.title,
        art: zone ? { kind: 'zone', src: zone } : null,
      },
      dates: contentDate(guide),
      article: true,
    }
  }
  const achievement = await loadAchievementPage(slug)
  if (achievement) {
    const { name, quests } = achievement.page
    const zone = achievement.zoneBackground?.src
    return {
      ...achievementSeo(name, quests?.length ?? 0),
      headline: name,
      url: `/${achievement.page.slug}`,
      preview: achievement.preview,
      card: { kind: 'achievement', title: name, art: zone ? { kind: 'zone', src: zone } : null },
      dates: contentDate(achievement.page),
      article: true,
    }
  }
  const dofus = await loadDofusGuide(slug)
  if (dofus) {
    const { seo } = dofusPageStrings
    const { guide } = dofus
    // El huevo original, el PNG que subió Torre o el icono del objeto: el más nítido.
    const egg = dofusEgg(guide)?.url
    return {
      title: seo.title(guide.name),
      description: seo.description(guide.name),
      headline: guide.name,
      url: `/${guide.slug}`,
      preview: dofus.preview,
      card: { kind: 'dofus', title: guide.name, art: egg ? { kind: 'egg', src: egg } : null },
      dates: contentDate(guide),
      article: true,
    }
  }
  const site = await loadSitePage(slug)
  if (site) {
    if (sitePageRoute(site.page, site.preview, SITE_URL).kind !== 'page') return null
    return {
      ...sitePageSeo(site.page),
      headline: site.page.title,
      url: `/${site.page.slug}`,
      preview: site.preview,
      card: { kind: 'page', title: site.page.title },
      dates: contentDate(site.page),
      article: true,
    }
  }
  const checklist = await loadChecklist(slug)
  if (
    checklist &&
    checklistRoute(checklist.checklist, checklist.preview, SITE_URL).kind === 'page'
  ) {
    const { name, description, slug: url } = checklist.checklist
    // Una checklist de almas se llama por su nombre («Almas del Ocre»).
    const title = checklist.checklist.kind === 'souls' ? name : checklistPageStrings.title(name)
    return {
      title,
      description: description || checklistPageStrings.seoDescription(name),
      headline: title,
      url: `/${url}`,
      preview: checklist.preview,
      card: { kind: 'checklist', title },
      dates: contentDate(checklist.checklist),
      article: false,
    }
  }
  return null
}
