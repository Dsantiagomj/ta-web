import { normalizedText, parseHtml } from './dom'

export interface TextElement {
  tag: string
  html: string
  /** Texto plano con los espacios colapsados, para reconocer marcadores. */
  text: string
}

export type PageBlock =
  | { type: 'text'; elements: TextElement[] }
  | { type: 'image'; url: string; alt: string }
  | { type: 'video'; url: string; title?: string }
  | { type: 'unknown'; sqspType: string }

export interface SquarespacePage {
  /** El título de la página en Squarespace (no el H2 en mayúsculas), o null si falta. */
  title: string | null
  blocks: PageBlock[]
}

type GridPosition = { row: number; column: number }

// El título de la página va en el JSON de contexto que Squarespace incrusta en un script.
const CONTEXT_TITLE = /"collection":\{"title":"((?:[^"\\]|\\.)*)"/

function pageTitle(html: string): string | null {
  const match = CONTEXT_TITLE.exec(html)
  if (!match) return null
  try {
    return (JSON.parse(`"${match[1]}"`) as string).trim() || null
  } catch {
    // Un escape que no es JSON no debe tumbar la importación: la página queda sin título.
    return null
  }
}

// Fluid engine coloca cada bloque con `grid-area: fila/columna/…`. La regla dentro de
// `@media (min-width: 768px)` es la de escritorio, la que maqueta Torre; la de fuera es
// la de móvil, que Squarespace genera sola.
const GRID_AREA =
  /(@media \(min-width: 768px\)\s*\{\s*)?\.fe-block-([\w-]+)\s*\{\s*grid-area:\s*(\d+)\s*\/\s*(\d+)/g

function gridPositions(css: string): Map<string, GridPosition> {
  const mobile = new Map<string, GridPosition>()
  const desktop = new Map<string, GridPosition>()
  for (const [, isDesktop, id, row, column] of css.matchAll(GRID_AREA)) {
    ;(isDesktop ? desktop : mobile).set(id!, { row: Number(row), column: Number(column) })
  }
  return new Map([...mobile, ...desktop])
}

function blockId(element: Element): string | undefined {
  for (const name of element.classList) {
    if (name.startsWith('fe-block-')) return name.slice('fe-block-'.length)
  }
  return undefined
}

function textBlock(block: Element): PageBlock {
  const content = block.querySelector('[data-sqsp-text-block-content]')
  const elements = [...(content?.children ?? [])].map((element) => ({
    tag: element.tagName.toLowerCase(),
    html: element.outerHTML,
    text: normalizedText(element),
  }))
  return { type: 'text', elements }
}

function imageBlock(block: Element): PageBlock {
  const image = block.querySelector('img')
  const url = image?.getAttribute('data-image') || image?.getAttribute('data-src') || ''
  if (!image || !url) return { type: 'unknown', sqspType: 'image' }
  // Sin parámetros de tamaño: la URL del original es la que identifica la imagen.
  return { type: 'image', url: url.split('?')[0]!, alt: image.getAttribute('alt')?.trim() ?? '' }
}

/** URL https del vídeo. Embedly envuelve el vídeo de YouTube y lleva la URL original en `url`. */
function videoUrl(src: string): string | null {
  let url: URL
  try {
    url = new URL(src, 'https://www.torrentearcano.com')
  } catch {
    return null
  }
  if (url.hostname.endsWith('embedly.com')) {
    const inner = url.searchParams.get('url') ?? url.searchParams.get('src')
    return inner ? videoUrl(inner) : null
  }
  url.protocol = 'https:'
  // Las URL opacas (javascript:, data:) no cambian de protocolo: no son vídeos.
  return url.protocol === 'https:' ? url.href : null
}

// Embedly pone a todos sus iframes el mismo título, que no dice qué vídeo es.
const GENERIC_VIDEO_TITLE = /^youtube embed$/i

function embedBlock(block: Element): PageBlock {
  const iframe = block.querySelector('iframe')
  const src = iframe?.getAttribute('src')
  const url = src ? videoUrl(src) : null
  if (!url) return { type: 'unknown', sqspType: 'embed' }
  // El título que YouTube da al vídeo por oEmbed, si Squarespace lo copió al iframe.
  const title = iframe?.getAttribute('title')?.trim()
  return title && !GENERIC_VIDEO_TITLE.test(title)
    ? { type: 'video', url, title }
    : { type: 'video', url }
}

function readBlock(feBlock: Element): PageBlock | null {
  const block = feBlock.querySelector('[data-sqsp-block]')
  if (!block) return null
  const type = block.getAttribute('data-sqsp-block') ?? ''
  if (type === 'text') return textBlock(block)
  if (type === 'image') return imageBlock(block)
  if (type === 'embed') return embedBlock(block)
  return { type: 'unknown', sqspType: type }
}

/**
 * Lee una página cacheada de Squarespace: su título y sus bloques en orden de lectura.
 * Cada sección de fluid engine se ordena por fila y columna de escritorio, no por el
 * orden del HTML; las secciones siguen el orden de la página.
 */
export function parsePage(html: string): SquarespacePage {
  const document = parseHtml(html)
  const blocks: PageBlock[] = []

  for (const section of document.querySelectorAll('article [data-fluid-engine]')) {
    const positions = gridPositions(section.querySelector('style')?.textContent ?? '')
    const position = (element: Element) =>
      positions.get(blockId(element) ?? '') ?? { row: Infinity, column: Infinity }
    const ordered = [...section.querySelectorAll('.fe-block')].sort((a, b) => {
      const [first, second] = [position(a), position(b)]
      return first.row - second.row || first.column - second.column
    })
    for (const element of ordered) {
      const block = readBlock(element)
      if (block) blocks.push(block)
    }
  }

  return { title: pageTitle(html), blocks }
}
