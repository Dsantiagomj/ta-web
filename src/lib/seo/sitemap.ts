// /sitemap.xml (backlog B-02), en código puro: lo que un visitante puede abrir, con la fecha
// de su último cambio. La lectura está en ./read-sitemap.ts y la ruta en src/app/sitemap.ts.

import type { MetadataRoute } from 'next'

import { METALOGROS_PATH } from '@/lib/achievements/page'
import { CHECKLISTS_INDEX_PATH } from '@/lib/checklists/path'
import { DOFUS_INDEX_PATH } from '@/lib/dofus-guides/page'
import { isGuideSlug } from '@/lib/guides/slug'

type Status = 'draft' | 'published' | null
type Doc = { slug: string; updatedAt: string; _status?: Status }
type StateDoc = Doc & { state: string }

export interface SitemapData {
  questGuides: Doc[]
  /** Todas las publicadas, también las En preparación: el índice de metalogros las enseña. */
  achievementPages: StateDoc[]
  achievementGroups: { updatedAt: string; _status?: Status }[]
  dofusGuides: StateDoc[]
  /** La introducción de Torre en /guias-dofus (global dofus-guides-index). */
  dofusIndexUpdatedAt: string | null
  checklists: StateDoc[]
}

const published = (doc: { _status?: Status }) => doc._status !== 'draft'
const isPage = (doc: Doc | StateDoc) =>
  published(doc) && (!('state' in doc) || doc.state === 'published') && isGuideSlug(doc.slug)

function latest(dates: (string | null | undefined)[]): Date | undefined {
  const times = dates.flatMap((date) => (date ? [Date.parse(date)] : [])).filter(Number.isFinite)
  return times.length ? new Date(Math.max(...times)) : undefined
}

/** Las entradas del sitemap: portada, índices y páginas, con URL absolutas y sin repetir. */
export function sitemapEntries(data: SitemapData, siteUrl: string): MetadataRoute.Sitemap {
  const origin = siteUrl.replace(/\/+$/, '')
  const shown = <T extends { _status?: Status; updatedAt: string }>(docs: T[]) =>
    docs.filter(published).map((doc) => doc.updatedAt)

  const metalogros = latest([...shown(data.achievementPages), ...shown(data.achievementGroups)])
  const dofus = latest([...shown(data.dofusGuides), data.dofusIndexUpdatedAt])
  const checklists = latest(shown(data.checklists))
  const home = latest([
    ...shown(data.questGuides),
    metalogros?.toISOString(),
    dofus?.toISOString(),
    checklists?.toISOString(),
  ])

  const entries: MetadataRoute.Sitemap = []
  const seen = new Set<string>()
  const add = (path: string, lastModified: Date | undefined) => {
    const url = `${origin}${path}`
    if (seen.has(url)) return
    seen.add(url)
    entries.push(lastModified ? { url, lastModified } : { url })
  }

  add('/', home)
  add(METALOGROS_PATH, metalogros)
  add(DOFUS_INDEX_PATH, dofus)
  add(CHECKLISTS_INDEX_PATH, checklists)
  for (const docs of [data.questGuides, data.achievementPages, data.dofusGuides, data.checklists]) {
    for (const doc of docs as (Doc | StateDoc)[]) {
      if (isPage(doc)) add(`/${doc.slug}`, latest([doc.updatedAt]))
    }
  }
  return entries
}
