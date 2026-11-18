// El mapa de URL viejas (backlog B-08, pnpm urls:map, scripts/url-map.ts): cada URL del
// sitemap de Squarespace y lo que este sitio hará con ella tras el cambio de dominio. Código
// puro: el script lee el sitemap y la base y escribe docs/research/url-map.md.
// Orden: la tabla de redirecciones (el proxy responde antes que la página), una ruta propia,
// un documento publicado con ese slug, un slug que Torre cambió (308), lo aplazado y, si no,
// lo que falta con quién o qué lo desbloquea (blockers.ts).
import { isReservedSlug } from '@/lib/guides/slug'
import legacyUrls from '@/lib/redirects/legacy-urls.json'
import { lookupLegacyUrl, type LegacySections } from '@/lib/redirects/table'
import { ownSitePath } from '@/lib/site/site-links'

import {
  BLOCKER_ORDER,
  type BlockerKey,
  BLOCKERS,
  blockerOf,
  deferredOf,
  noteOf,
  slugOfPath,
} from './blockers'

/** Lo que este sitio tiene en /<slug> (site-index.ts lo lee de la base). */
export interface SiteIndex {
  /** Cada documento publicado, por slug: su colección y si está En preparación. */
  documents: ReadonlyMap<string, { collection: string; preparing: boolean }>
  /** Las direcciones que Torre cambió: slug viejo → slug nuevo (308). */
  slugMoves: ReadonlyMap<string, string>
}

export type UrlFate =
  | { kind: 'served'; collection: string; preparing: false }
  | { kind: 'served'; collection: string; preparing: true; blocker: BlockerKey }
  | { kind: 'redirect'; to: string; status: number; section: string }
  | { kind: 'gone'; section: string }
  | { kind: 'deferred'; blocker: BlockerKey }
  | { kind: 'missing'; blocker: BlockerKey; note?: string }

export interface UrlMapRow {
  path: string
  fate: UrlFate
}

/** La sección de legacy-urls.json de cada URL de la tabla. */
const SECTION_OF = new Map(
  Object.entries(legacyUrls as LegacySections).flatMap(([name, section]) =>
    [...Object.keys(section.moved ?? {}), ...(section.gone ?? [])].map((path) => [path, name]),
  ),
)

const decode = (text: string) =>
  text
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&quot;/gu, '"')
    .replace(/&apos;/gu, "'")
    .replace(/&amp;/gu, '&')

/**
 * Las rutas de las páginas de un sitemap de Squarespace (solo las de la web de Torre, sin
 * repetir) y los sitemaps que lista si es un índice. Las <image:loc> no cuentan.
 */
export function parseSitemap(xml: string): { pages: string[]; sitemaps: string[] } {
  const locs = (tag: string) =>
    [...xml.matchAll(new RegExp(`<${tag}>[\\s\\S]*?<loc>([^<]*)</loc>`, 'gu'))].map(([, loc]) =>
      decode(loc!.trim()),
    )
  const pages = new Set<string>()
  for (const loc of locs('url')) {
    const path = ownSitePath(loc)
    if (path !== null) pages.add(path)
  }
  return { pages: [...pages], sitemaps: locs('sitemap') }
}

/** Qué hará este sitio con una URL vieja tras el cambio de dominio. */
export function classifyOldUrl(path: string, site: SiteIndex): UrlFate {
  const rule = lookupLegacyUrl(path.split(/[?#]/u)[0]!)
  if (rule) {
    const section = SECTION_OF.get(`/${slugOfPath(path)}`) ?? ''
    return rule.status === 410
      ? { kind: 'gone', section }
      : { kind: 'redirect', to: rule.to, status: rule.status, section }
  }
  const slug = slugOfPath(path)
  if (slug === '' || isReservedSlug(slug)) {
    return { kind: 'served', collection: 'route', preparing: false }
  }
  const doc = site.documents.get(slug)
  if (doc) {
    if (!doc.preparing) return { kind: 'served', collection: doc.collection, preparing: false }
    const blocker = blockerOf(path, 'page', { preparing: () => doc.collection })
    return { kind: 'served', collection: doc.collection, preparing: true, blocker }
  }
  const moved = site.slugMoves.get(slug)
  if (moved) return { kind: 'redirect', to: `/${moved}`, status: 308, section: 'redirects' }
  const deferred = deferredOf(path)
  if (deferred) return { kind: 'deferred', blocker: deferred }
  const note = noteOf(path)
  return {
    kind: 'missing',
    blocker: blockerOf(path, null, { preparing: () => null }),
    ...(note && { note }),
  }
}

export const buildUrlMap = (paths: readonly string[], site: SiteIndex): UrlMapRow[] =>
  paths.map((path) => ({ path, fate: classifyOldUrl(path, site) }))

export interface UrlMapCounts {
  total: number
  /** Con el mismo slug, En preparación incluido. */
  served: number
  preparing: number
  redirect: number
  gone: number
  deferred: number
  missing: number
}

export function urlMapCounts(rows: readonly UrlMapRow[]): UrlMapCounts {
  const count = (kind: UrlFate['kind']) => rows.filter((row) => row.fate.kind === kind).length
  return {
    total: rows.length,
    served: count('served'),
    preparing: rows.filter((row) => row.fate.kind === 'served' && row.fate.preparing).length,
    redirect: count('redirect'),
    gone: count('gone'),
    deferred: count('deferred'),
    missing: count('missing'),
  }
}

/** Lo que queda antes del corte: aplazado, En preparación o sin página. */
const blockerOfRow = ({ fate }: UrlMapRow): BlockerKey | null =>
  fate.kind === 'deferred' || fate.kind === 'missing'
    ? fate.blocker
    : fate.kind === 'served' && fate.preparing
      ? fate.blocker
      : null

const pendingByBlocker = (rows: readonly UrlMapRow[]) =>
  BLOCKER_ORDER.map((blocker) => ({
    blocker,
    rows: rows.filter((row) => blockerOfRow(row) === blocker),
  })).filter((group) => group.rows.length > 0)

/** El resumen de la consola, en español. */
export function urlMapSummary(rows: readonly UrlMapRow[]): string[] {
  const c = urlMapCounts(rows)
  return [
    `URL de Squarespace: ${c.total}. Mismo slug: ${c.served} (${c.preparing} En preparación). Redirección: ${c.redirect}. 410: ${c.gone}. Aplazadas: ${c.deferred}. Faltan: ${c.missing}.`,
    ...(c.preparing + c.deferred + c.missing ? ['Por resolver antes del corte:'] : []),
    ...pendingByBlocker(rows).map(
      ({ blocker, rows }) => `  ${BLOCKERS[blocker].es}: ${rows.length}`,
    ),
  ]
}

const COLLECTION_TEXT: Record<string, string> = {
  route: 'Own routes',
  'quest-guides': 'Quest guides',
  'achievement-pages': 'Achievement pages',
  'dofus-guides': 'Dofus guides',
  checklists: 'Checklists',
  pages: 'Site pages',
  'class-pages': 'Class pages',
  'dungeon-pages': 'Dungeon pages',
}

const code = (text: string) => `\`${text}\``

function fateText(fate: UrlFate): string {
  switch (fate.kind) {
    case 'served':
      return fate.preparing ? 'Served, «En preparación»' : 'Served'
    case 'deferred':
      return 'Deferred'
    case 'missing':
      return 'Missing'
    default:
      return fate.kind
  }
}

export interface UrlMapMeta {
  /** La fecha del informe (AAAA-MM-DD). */
  generated: string
  /** La base leída: dev, production o local. */
  source: string
  /** El sitemap leído. */
  sitemap: string
}

/** docs/research/url-map.md, en inglés como todo docs/. */
export function urlMapMarkdown(rows: readonly UrlMapRow[], meta: UrlMapMeta): string {
  const c = urlMapCounts(rows)
  const out: string[] = [
    '# Old URL to new page map',
    '',
    `Generated by \`pnpm urls:map --write\` on ${meta.generated}, from Squarespace's sitemap (${meta.sitemap}) against the ${meta.source} database. Do not edit it by hand: rerun it after each change to the redirect table or publishing batch, and against production on cutover day (\`AGENTS.md\`, Redirects). Backlog B-08.`,
    '',
    "Each URL in the sitemap ends in one of five fates. **Served**: a page here has the same slug (a quest guide, achievement page, Dofus guide, checklist, site page or one of the site's own routes); «En preparación» ones are served but still wait for Torre. **Redirected**: a row in `src/lib/redirects/legacy-urls.json` (or a slug Torre changed, 308). **Gone**: 410. **Deferred**: classes, dungeons and the inline tools, which the owner decides before cutover (2026-11-18). **Missing**: nothing answers it yet; the blocker says who or what unblocks it.",
    '',
    '## Summary',
    '',
    '| Fate | URLs |',
    '|---|---|',
    `| Served by the same slug | ${c.served} |`,
    `| of which «En preparación» | ${c.preparing} |`,
    `| Redirected | ${c.redirect} |`,
    `| Gone (410) | ${c.gone} |`,
    `| Deferred | ${c.deferred} |`,
    `| Missing | ${c.missing} |`,
    `| Total | ${c.total} |`,
    '',
    '## Left before cutover, by blocker',
  ]
  const pending = pendingByBlocker(rows)
  if (pending.length === 0) out.push('', 'Nothing left.')
  for (const { blocker, rows: group } of pending) {
    out.push('', `### ${BLOCKERS[blocker].en} (${group.length})`, '', '| Old URL | Today | Note |')
    out.push('|---|---|---|')
    for (const { path, fate } of group) {
      const note = fate.kind === 'missing' ? (fate.note ?? '') : ''
      out.push(`| ${code(path)} | ${fateText(fate)} | ${note} |`)
    }
  }

  const redirects = rows.flatMap((row) =>
    row.fate.kind === 'redirect' ? [{ path: row.path, fate: row.fate }] : [],
  )
  out.push('', `## Redirected (${redirects.length})`, '', '| Old URL | To | Status | Section |')
  out.push('|---|---|---|---|')
  for (const { path, fate } of redirects) {
    out.push(`| ${code(path)} | ${code(fate.to)} | ${fate.status} | ${code(fate.section)} |`)
  }

  const gone = rows.flatMap((row) =>
    row.fate.kind === 'gone' ? [{ path: row.path, fate: row.fate }] : [],
  )
  out.push('', `## Gone (${gone.length})`, '', '| Old URL | Section |', '|---|---|')
  for (const { path, fate } of gone) out.push(`| ${code(path)} | ${code(fate.section)} |`)

  out.push('', `## Served by the same slug (${c.served})`)
  for (const collection of Object.keys(COLLECTION_TEXT)) {
    const served = rows.filter(
      (row) => row.fate.kind === 'served' && row.fate.collection === collection,
    )
    if (served.length === 0) continue
    out.push('', `### ${COLLECTION_TEXT[collection]} (${served.length})`, '')
    for (const { path, fate } of served) {
      out.push(
        `- ${code(path)}${fate.kind === 'served' && fate.preparing ? ' («En preparación»)' : ''}`,
      )
    }
  }
  return `${out.join('\n')}\n`
}
