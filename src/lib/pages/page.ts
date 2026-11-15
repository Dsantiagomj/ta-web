// Las páginas sueltas de Torre (backlog B-09), en código puro: qué hace /<slug>, sus
// metadatos, sus migas y cómo las enlaza el sitio. La lectura está en ./queries.ts y la
// página en src/app/(frontend)/[slug]/SitePageView.tsx.

import { buildBreadcrumb, type BreadcrumbData } from '@/lib/achievements/page'
import type { PageState } from '@/lib/achievements/strings'
import type { GuideDoc } from '@/lib/guides/page'
import { legacyRoute, type LegacyRoute } from '@/lib/site/legacy'

import { sitePageStrings as s } from './strings'

/** Lo que una página superior aporta a las migas. */
type ParentDoc = { title: string; slug: string; state?: PageState | null }

/** Lo que la página lee de pages; Page encaja. */
export interface SitePageDoc {
  title: string
  slug: string
  state?: PageState | null
  legacyHref?: string | null
  parent?: number | ParentDoc | null
  body?: GuideDoc['body']
  seo?: { metaTitle?: string | null; metaDescription?: string | null } | null
}

/** La descripción SEO más larga que muestra Google. */
const DESCRIPTION_MAX = 160

/** Qué hace /<slug> con la página: la misma regla que las checklists. */
export function sitePageRoute(page: SitePageDoc, preview: boolean, siteUrl: string): LegacyRoute {
  return legacyRoute(page, preview, siteUrl)
}

type LexicalNode = { type?: string; text?: unknown; children?: LexicalNode[] }
type Body = NonNullable<SitePageDoc['body']>
type BodyBlock = Body[number]

/** El texto plano de un texto enriquecido, párrafo a párrafo. */
function plainText(content: unknown): string {
  const paragraphs: string[] = []
  const inline = (nodes: LexicalNode[] = []): string =>
    nodes
      .map((node) => (typeof node.text === 'string' ? node.text : inline(node.children)))
      .join('')
  const root = (content as { root?: { children?: LexicalNode[] } } | null)?.root
  for (const node of root?.children ?? []) {
    const text = inline(node.children ?? [])
      .replace(/\s+/g, ' ')
      .trim()
    if (text) paragraphs.push(text)
  }
  return paragraphs.join(' ')
}

/** El primer texto de la página, en el orden del cuerpo, entrando en los pasos. */
function firstText(blocks: BodyBlock[] | null | undefined): string {
  for (const block of blocks ?? []) {
    const text =
      block.blockType === 'richText' || block.blockType === 'callout'
        ? plainText(block.content)
        : block.blockType === 'step'
          ? firstText(block.body as BodyBlock[] | null | undefined)
          : ''
    if (text) return text
  }
  return ''
}

/** Corta en la última palabra que cabe, con puntos suspensivos. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text
  const room = text.slice(0, max - s.ellipsis.length + 1)
  const cut = room.lastIndexOf(' ')
  return `${(cut > 0 ? room.slice(0, cut) : room.slice(0, -1)).trimEnd()}${s.ellipsis}`
}

/**
 * El título y la descripción de la página: los de su SEO si Torre los escribió; si no, su
 * título y el principio de su texto (o el título, sin texto).
 */
export function sitePageSeo(page: SitePageDoc): { title: string; description: string } {
  const title = page.seo?.metaTitle?.trim() || page.title
  const description =
    page.seo?.metaDescription?.trim() || clip(firstText(page.body), DESCRIPTION_MAX) || page.title
  return { title, description }
}

/** La página superior, si está poblada y se puede abrir. */
function shownParent(parent: SitePageDoc['parent']): ParentDoc | null {
  if (!parent || typeof parent !== 'object') return null
  return parent.state === 'published' ? parent : null
}

/** Las migas: la portada y, si la tiene y se abre, su página superior. */
export function sitePageBreadcrumb(page: SitePageDoc, siteUrl: string): BreadcrumbData {
  const parent = shownParent(page.parent)
  return buildBreadcrumb(
    [
      { name: s.home, href: '/' },
      ...(parent ? [{ name: parent.title, href: `/${parent.slug}` }] : []),
    ],
    { name: page.title, href: `/${page.slug}` },
    siteUrl,
  )
}

/** Una página para los enlaces del sitio: el pie y la búsqueda. */
export interface PageNavItem {
  name: string
  slug: string
  /** Su página si está Publicada; su página de Squarespace si está En preparación y la tiene. */
  href?: string
  /** El enlace lleva a la web anterior (Squarespace). */
  legacy?: true
}

/** Las páginas como las enlaza el sitio, en el orden en que llegan. */
export function pageNavItems(
  docs: Pick<SitePageDoc, 'title' | 'slug' | 'state' | 'legacyHref'>[],
): PageNavItem[] {
  return docs.map((doc) => {
    const base = { name: doc.title, slug: doc.slug }
    if (doc.state === 'published') return { ...base, href: `/${doc.slug}` }
    const legacy = doc.legacyHref?.trim()
    return legacy ? { ...base, href: legacy, legacy: true as const } : base
  })
}
