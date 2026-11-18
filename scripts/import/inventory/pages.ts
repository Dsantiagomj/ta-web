// Lo que cambió en la web de Torre entre dos inventarios (el del 2026-11-02 y uno nuevo): por
// página, su texto, sus imágenes, sus vídeos de YouTube, sus bloques de código y sus enlaces.
// No se fía del lastmod del sitemap: Torre llena páginas sin que cambie (el informe del
// 2026-11-18). Código puro, sin red ni disco: lo usan refresh-inventory.ts y la importación delta.

export const SITE = 'https://www.torrentearcano.com'

/** Las rutas del sitemap de Squarespace, en su orden y sin repetir. */
export function sitemapPaths(xml: string): string[] {
  const paths = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)]
    .map(([, loc]) => loc!)
    .filter((loc) => loc.startsWith(SITE))
    .map((loc) => loc.slice(SITE.length) || '/')
  return [...new Set(paths)]
}

/** El nombre del archivo de una ruta, como en el inventario: «/a/b» → «a__b», «/» → «index». */
export function pageFileSlug(pathname: string): string {
  const slug = pathname.replace(/^\/+|\/+$/g, '')
  return slug ? slug.replace(/\//g, '__') : 'index'
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  laquo: '«',
  raquo: '»',
}

function decodeEntities(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] === '#') {
      const point =
        code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : Number(code.slice(1))
      return Number.isFinite(point) && point <= 0x10ffff ? String.fromCodePoint(point) : entity
    }
    return ENTITIES[code.toLowerCase()] ?? entity
  })
}

/** Lo que se compara de una página: lo que Torre escribe, no la plantilla de Squarespace. */
export interface PageFeatures {
  title: string
  text: string
  words: number
  images: string[]
  videos: string[]
  /** Un resumen de los bloques de código sin espacios; vacío si no tiene. */
  code: string
  links: string[]
}

/** Un hash corto y estable (FNV-1a): solo para saber si dos bloques de código son iguales. */
function shortHash(text: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

const sorted = (values: Iterable<string>) => [...new Set(values)].sort()

export function pageFeatures(html: string): PageFeatures {
  const main = /<main[\s>][\s\S]*?<\/main>/.exec(html)?.[0] ?? html
  // El nombre del archivo de cada imagen del CDN: Squarespace cambia la ruta, no el nombre.
  const images = sorted(
    [...main.matchAll(/data-src="(https:\/\/images\.squarespace-cdn\.com[^"]+)"/g)].map(([, url]) =>
      url!.replace(/\?.*$/, '').split('/').at(-1)!,
    ),
  )
  const videos = sorted(
    [
      ...main.matchAll(/(?:youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([\w-]{11})/g),
    ].map(([, id]) => id!),
  )
  const codes = [
    ...main.matchAll(
      /<div class="sqs-block code-block[\s\S]*?<div class="sqs-block-content">([\s\S]*?)<\/div>\s*<\/div>/g,
    ),
  ].map(([, code]) => code!.replace(/\s+/g, ''))
  const links = sorted(
    [...main.matchAll(/href="([^"#]+)"/g)].map(([, href]) => decodeEntities(href!)),
  )
  const text = decodeEntities(
    main.replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim()
  const title = decodeEntities(/<title>([\s\S]*?)<\/title>/.exec(html)?.[1] ?? '')
    .replace(/\s+—\s+Torrente Arcano\s*$/, '')
    .trim()
  return {
    title,
    text,
    words: text ? text.split(' ').length : 0,
    images,
    videos,
    code: codes.length ? shortHash(codes.join('')) : '',
    links,
  }
}

export type PageStatus =
  | 'same'
  | 'changed'
  /** Un esbozo vacío que ahora tiene contenido (menos de 20 palabras y ahora 40 o más). */
  | 'filled'
  /** Lo contrario: una página que se quedó casi sin texto. */
  | 'emptied'
  | 'new'
  | 'removed'

export interface PageDelta {
  path: string
  slug: string
  status: PageStatus
  title: string
  wordsBefore: number
  wordsAfter: number
  imagesAdded: string[]
  imagesRemoved: string[]
  videosAdded: string[]
  videosRemoved: string[]
  codeChanged: boolean
  linksAdded: string[]
  linksRemoved: string[]
  /** Los trozos de texto que cambian, palabra a palabra («antes» → «después»). */
  text: { before: string; after: string }[]
}

const minus = (a: string[], b: string[]) => a.filter((value) => !b.includes(value))

const MAX_DIFF_WORDS = 8000

/** Los trozos distintos entre dos listas de palabras (subsecuencia común más larga). */
export function wordChanges(
  before: string[],
  after: string[],
): { before: string; after: string }[] {
  if (before.length > MAX_DIFF_WORDS || after.length > MAX_DIFF_WORDS) {
    return [{ before: `(${before.length} palabras)`, after: `(${after.length} palabras)` }]
  }
  // Sin lo común del principio y del final, la tabla es pequeña: los cambios de Torre son cortos.
  let start = 0
  while (start < before.length && start < after.length && before[start] === after[start]) start += 1
  let end = 0
  while (
    end < before.length - start &&
    end < after.length - start &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  ) {
    end += 1
  }
  const a = before.slice(start, before.length - end)
  const b = after.slice(start, after.length - end)
  const width = b.length + 1
  const table = new Uint32Array((a.length + 1) * width)
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i * width + j] =
        a[i] === b[j]
          ? table[(i + 1) * width + j + 1]! + 1
          : Math.max(table[(i + 1) * width + j]!, table[i * width + j + 1]!)
    }
  }
  const changes: { before: string; after: string }[] = []
  let removed: string[] = []
  let added: string[] = []
  const flush = () => {
    if (removed.length || added.length) {
      changes.push({ before: removed.join(' '), after: added.join(' ') })
    }
    removed = []
    added = []
  }
  let i = 0
  let j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      flush()
      i += 1
      j += 1
    } else if (
      j < b.length &&
      (i === a.length || table[i * width + j + 1]! >= table[(i + 1) * width + j]!)
    ) {
      added.push(b[j]!)
      j += 1
    } else {
      removed.push(a[i]!)
      i += 1
    }
  }
  flush()
  return changes
}

/** Qué cambió en una ruta entre dos inventarios; null en un lado si la página no estaba. */
export function comparePage(
  pathname: string,
  before: PageFeatures | null,
  after: PageFeatures | null,
): PageDelta {
  const empty: PageFeatures = {
    title: '',
    text: '',
    words: 0,
    images: [],
    videos: [],
    code: '',
    links: [],
  }
  const a = before ?? empty
  const b = after ?? empty
  const sameText = a.text === b.text
  const sameRest =
    a.images.join('\n') === b.images.join('\n') &&
    a.videos.join('\n') === b.videos.join('\n') &&
    a.code === b.code &&
    a.links.join('\n') === b.links.join('\n')
  let status: PageStatus
  if (!before) status = 'new'
  else if (!after) status = 'removed'
  else if (sameText && sameRest) status = 'same'
  else if (a.words < 20 && b.words >= 40) status = 'filled'
  else if (a.words >= 40 && b.words < 20) status = 'emptied'
  else status = 'changed'
  return {
    path: pathname,
    slug: pageFileSlug(pathname),
    status,
    title: b.title || a.title,
    wordsBefore: a.words,
    wordsAfter: b.words,
    imagesAdded: minus(b.images, a.images),
    imagesRemoved: minus(a.images, b.images),
    videosAdded: minus(b.videos, a.videos),
    videosRemoved: minus(a.videos, b.videos),
    codeChanged: a.code !== b.code,
    linksAdded: minus(b.links, a.links),
    linksRemoved: minus(a.links, b.links),
    text:
      status === 'changed' && !sameText
        ? wordChanges(a.text ? a.text.split(' ') : [], b.text ? b.text.split(' ') : [])
        : [],
  }
}

const STATUS_NAMES: Record<PageStatus, string> = {
  same: 'Sin cambios',
  changed: 'Cambiadas',
  filled: 'Esbozos que ahora tienen contenido',
  emptied: 'Páginas que se quedaron sin texto',
  new: 'Nuevas en el sitemap',
  removed: 'Fuera del sitemap',
}

const clip = (text: string) => (text.length > 160 ? `${text.slice(0, 157)}…` : text)

/** El informe del inventario: los totales y, por estado, cada página que no sigue igual. */
export function inventoryReport(deltas: PageDelta[]): string[] {
  const lines: string[] = []
  const count = (status: PageStatus) => deltas.filter((delta) => delta.status === status).length
  lines.push(
    Object.entries(STATUS_NAMES)
      .map(([status, name]) => `${name}: ${count(status as PageStatus)}`)
      .join(' · '),
  )
  for (const status of ['filled', 'new', 'changed', 'emptied', 'removed'] as const) {
    const pages = deltas.filter((delta) => delta.status === status)
    if (!pages.length) continue
    lines.push('', `${STATUS_NAMES[status]} (${pages.length}):`)
    for (const delta of pages) {
      const parts = [`${delta.wordsBefore} → ${delta.wordsAfter} palabras`]
      if (delta.imagesAdded.length || delta.imagesRemoved.length) {
        parts.push(`imágenes +${delta.imagesAdded.length} −${delta.imagesRemoved.length}`)
      }
      if (delta.videosAdded.length || delta.videosRemoved.length) {
        parts.push(`vídeos +${delta.videosAdded.length} −${delta.videosRemoved.length}`)
      }
      if (delta.codeChanged) parts.push('código')
      if (delta.linksAdded.length || delta.linksRemoved.length) {
        parts.push(`enlaces +${delta.linksAdded.length} −${delta.linksRemoved.length}`)
      }
      lines.push(`- ${delta.path} «${delta.title}»: ${parts.join(', ')}`)
      for (const change of delta.text.slice(0, 6)) {
        lines.push(`    «${clip(change.before)}» → «${clip(change.after)}»`)
      }
      if (delta.text.length > 6) lines.push(`    … y ${delta.text.length - 6} cambios más`)
    }
  }
  return lines
}
