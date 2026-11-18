// Lee de la base, sin escribir nada, cada enlace que el sitio pintaría hacia la web de
// Squarespace (pnpm links:legacy, scripts/links-legacy.ts):
// - del código: las secciones del menú que enlazan a Squarespace (Clases, Mazmorras) y los
//   enlaces legales del pie sin página en «Páginas»;
// - del contenido: los enlaces de Torre (texto rico y campos de enlace) de lo publicado que se
//   ve en el sitio, en cada colección y global que puede guardarlos, que este sitio no sirve
//   o que responden 410;
// - el `legacyHref` de lo publicado En preparación, que lleva a Squarespace a propósito hasta
//   que Torre lo publica.
// Lo que ya va a este sitio (página publicada, redirección, ruta propia) solo se cuenta. Cada
// enlace por resolver lleva quién o qué lo desbloquea (blockers.ts).
import type { CollectionConfig, Field, GlobalConfig, Payload } from 'payload'

import { legalLinks } from '@/components/site/nav'
import { pageNavItems } from '@/lib/pages/page'
import { readPageNav } from '@/lib/pages/queries'
import { readNavigation } from '@/lib/site-copy/queries'
import { readLiveSlugs } from '@/lib/site/live-slugs'
import type { LiveSlug } from '@/lib/site/site-links'

import { blockerOf, type BlockerContext } from './blockers'
import { classifyLink, type LegacyLinkEntry, needsAttention, type RelativeCounts } from './report'
import { type FoundLink, hasLinkFields, scanLinks } from './scan'
import { preparingIn, readSiteIndex } from './site-index'

/** Colecciones con enlaces que no son de Torre ni se pintan en el sitio. */
const SKIPPED = new Set(['users', 'redirects', 'game-data-refreshes'])

/** Cuántos documentos se leen de una vez: los cuerpos de las guías pesan. */
const PAGE_SIZE = 100

type Doc = Record<string, unknown> & { id: number | string }

const label = (config: CollectionConfig | GlobalConfig, fallback: string) => {
  const singular =
    'labels' in config && config.labels && typeof config.labels.singular === 'string'
      ? config.labels.singular
      : 'label' in config && typeof config.label === 'string'
        ? config.label
        : null
  return singular ?? fallback
}

const hasField = (fields: readonly Field[], name: string): boolean =>
  fields.some((field) => {
    if ('name' in field && field.name === name) return true
    if (field.type === 'tabs')
      return field.tabs.some((tab) => !('name' in tab && tab.name) && hasField(tab.fields, name))
    if (field.type === 'row' || field.type === 'collapsible') return hasField(field.fields, name)
    return false
  })

export interface CollectedLinks {
  entries: LegacyLinkEntry[]
  relative: RelativeCounts
}

class Collector {
  readonly entries: LegacyLinkEntry[] = []
  readonly relative: RelativeCounts = { page: 0, redirect: 0, route: 0 }

  constructor(
    readonly live: LiveSlug,
    readonly context: BlockerContext,
  ) {}

  /** Un enlace del contenido: a la lista si pinta a Squarespace o a un 410; si no, se cuenta. */
  content(href: string, where: string) {
    const link = classifyLink(href, this.live)
    if (!link) return
    if (needsAttention(link)) {
      const blocker = blockerOf(link.path, link.served, this.context)
      this.entries.push({ source: 'content', where, href, served: link.served, blocker })
    } else if (link.served && link.served !== 'gone') {
      this.relative[link.served] += 1
    }
  }

  /** Algo de código o En preparación que lleva a Squarespace a propósito. */
  fixed(source: 'code' | 'preparing', href: string, where: string, note?: string) {
    const link = classifyLink(href, this.live)
    if (!link || link.rendered.startsWith('/')) return
    const blocker = blockerOf(link.path, link.served, this.context)
    this.entries.push({ source, where, href, served: link.served, blocker, ...(note && { note }) })
  }
}

/** Las secciones del menú y los enlaces legales del pie que el código manda a Squarespace. */
async function codeLinks(payload: Payload, out: Collector) {
  const [navigation, pages] = await Promise.all([readNavigation(payload), readPageNav(payload)])
  for (const section of navigation.sections) {
    out.fixed(
      'code',
      section.href,
      `Menú, pie y portada: sección «${section.title}»`,
      section.soon ? 'hoy no se enlaza: «Próximamente»' : undefined,
    )
  }
  const inCollection = new Set(pages.map((page) => page.slug))
  for (const legal of legalLinks(pageNavItems(pages))) {
    const slug = legal.href.split('/').at(-1) ?? ''
    // La que existe en «Páginas» sale En preparación con su legacyHref.
    if (inCollection.has(slug)) continue
    out.fixed('code', legal.href, `Pie: «${legal.name}»`, 'sin página en «Páginas»')
  }
}

/** Los IDs de las páginas de logro que se ven: un logro que la tiene enlaza a ella. */
async function liveAchievementIds(payload: Payload): Promise<Set<number | string>> {
  const { docs } = await payload.find({
    collection: 'achievement-pages',
    where: { and: [{ _status: { equals: 'published' } }, { state: { equals: 'published' } }] },
    select: {},
    depth: 0,
    draft: false,
    pagination: false,
    overrideAccess: true,
  })
  return new Set(docs.map((doc) => doc.id))
}

/**
 * Si el sitio pinta ese enlace. El de un logro de una guía de Dofus solo se pinta mientras su
 * página de logro no se ve; con página, el logro enlaza a ella.
 */
function rendered(found: FoundLink, collection: string, achievements: Set<number | string>) {
  if (collection !== 'dofus-guides' || !found.field.endsWith('link')) return true
  const achievement = found.parent.achievement
  const id = typeof achievement === 'object' && achievement ? (achievement as Doc).id : achievement
  return !(typeof id === 'number' || typeof id === 'string') || !achievements.has(id)
}

async function collectionLinks(
  payload: Payload,
  config: CollectionConfig,
  out: Collector,
  achievements: Set<number | string>,
) {
  const blocks = (slug: string) => payload.config.blocks?.find((block) => block.slug === slug)
  const title = (config.admin?.useAsTitle as string | undefined) ?? 'id'
  const withState = hasField(config.fields, 'state')
  const name = label(config, config.slug)
  for (let page = 1; ; page += 1) {
    const result = await payload.find({
      collection: config.slug as 'pages',
      ...(config.versions && { where: { _status: { equals: 'published' } } }),
      depth: 0,
      draft: false,
      limit: PAGE_SIZE,
      page,
      sort: 'id',
      overrideAccess: true,
    })
    for (const doc of result.docs as unknown as Doc[]) {
      const slug = typeof doc.slug === 'string' ? ` (/${doc.slug})` : ''
      const where = `${name} «${String(doc[title] ?? doc.id)}»${slug}`
      const links = scanLinks(config.fields, doc, { blocks })
      if (withState && doc.state !== 'published') {
        // Sin página: solo se pinta su enlace a Squarespace.
        for (const found of links) {
          if (found.field === 'legacyHref') out.fixed('preparing', found.href, where)
        }
        continue
      }
      for (const found of links) {
        if (found.field === 'legacyHref' || !rendered(found, config.slug, achievements)) continue
        out.content(found.href, `${where}, ${found.field}`)
      }
    }
    if (!result.hasNextPage) break
  }
}

async function globalLinks(payload: Payload, config: GlobalConfig, out: Collector) {
  const blocks = (slug: string) => payload.config.blocks?.find((block) => block.slug === slug)
  const doc = await payload.findGlobal({
    slug: config.slug as 'site-settings',
    depth: 0,
    draft: false,
    overrideAccess: true,
  })
  for (const found of scanLinks(config.fields, doc, { blocks })) {
    out.content(found.href, `Ajuste «${label(config, config.slug)}», ${found.field}`)
  }
}

export async function collectLegacyLinks(payload: Payload): Promise<CollectedLinks> {
  const slugs = new Set(await readLiveSlugs(payload))
  const site = await readSiteIndex(payload)
  const out = new Collector((slug) => slugs.has(slug), { preparing: preparingIn(site) })
  const blocks = (slug: string) => payload.config.blocks?.find((block) => block.slug === slug)
  await codeLinks(payload, out)
  const achievements = await liveAchievementIds(payload)
  for (const config of payload.config.collections) {
    if (SKIPPED.has(config.slug) || config.upload || !hasLinkFields(config.fields, blocks)) continue
    await collectionLinks(payload, config, out, achievements)
  }
  for (const config of payload.config.globals) {
    if (hasLinkFields(config.fields, blocks)) await globalLinks(payload, config, out)
  }
  return { entries: out.entries, relative: out.relative }
}
