// La prosa de Torre en sus páginas de logro de Squarespace: lo que escribe antes de las
// misiones (la entrada) y lo que va después de las listas (el cierre), con sus capturas y
// sus vídeos en su sitio. Código puro: lee la página ya parseada (squarespace/parse-page.ts)
// y separa la prosa de las listas que la página nueva saca de DofusDB y de las guías.
//
// Las páginas siguen una plantilla: el título (h2), la lista de misiones, «Para estas
// misiones, vas a necesitar en total:» con sus listas, «Recompensas del logro:» con la suya.
// Lo que no es eso es prosa. Ante la duda, una lista es de la plantilla: una lista suelta en
// la página nueva repetiría lo que ya enseña.
import { youtubeId, youtubeWatchUrl } from '@/lib/guides/video'

import type { PageBlock, SquarespacePage } from '../squarespace/parse-page'

export type ProseItem =
  | { type: 'html'; html: string }
  | { type: 'image'; url: string; alt: string }
  | { type: 'video'; url: string; title: string | null }

export interface AchievementProse {
  intro: ProseItem[]
  outro: ProseItem[]
}

/** Una pieza de la página en orden de lectura, con su texto para reconocer la plantilla. */
interface Piece {
  tag: string
  text: string
  item: ProseItem | null
}

// Los rótulos de la plantilla, tal como los escribe Torre en sus 247 páginas (sin los dos
// puntos, sin mayúsculas). Solo el rótulo exacto: «Para este logro vas a necesitar mucha
// paciencia» es una frase suya, no la plantilla.
const NEEDS_HEADERS = new Set([
  'para estas misiones, vas a necesitar en total',
  'para las misiones de este logro, necesitaras',
  'necesitaras',
])
const REWARDS_HEADERS = new Set(['recompensas del logro', 'recompensas'])
const OTHER_HEADERS = new Set(['prerrequisitos', 'misiones del logro'])
// Los grupos de Necesitarás que Torre escribe como rótulo aparte («Combates:» y su lista).
// Solo estos: un subtítulo suyo corto («Consejo importante:») es prosa.
const GROUP_LABELS = new Set([
  'combates',
  'mazmorras',
  'recursos',
  'recursos y otras movidas',
  'objetos',
  'otros',
  'misiones',
])
const TEXT_TAGS = /^(p|h[1-6]|blockquote)$/

const isText = (piece: Piece) => TEXT_TAGS.test(piece.tag)

/** El texto de un rótulo para compararlo: sin tildes, mayúsculas ni los dos puntos finales. */
function label(piece: Piece): string | null {
  if (!isText(piece)) return null
  return piece.text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('es')
    .replace(/\s+/g, ' ')
    .replace(/\s*:$/, '')
    .trim()
}

const isNeedsHeader = (piece: Piece) => NEEDS_HEADERS.has(label(piece) ?? '')
const isRewards = (piece: Piece) => REWARDS_HEADERS.has(label(piece) ?? '')

/** Un rótulo de la plantilla: Necesitarás, Recompensas, Prerrequisitos o «Misiones del logro». */
function isTemplateHeader(piece: Piece): boolean {
  const text = label(piece) ?? ''
  return NEEDS_HEADERS.has(text) || REWARDS_HEADERS.has(text) || OTHER_HEADERS.has(text)
}

/** El rótulo de un grupo de Necesitarás: «Combates:», «Recursos y otras movidas:». */
const isGroupLabel = (piece: Piece) => GROUP_LABELS.has(label(piece) ?? '')

function pieces(blocks: PageBlock[]): Piece[] {
  return blocks.flatMap((block): Piece[] => {
    if (block.type === 'text') {
      return block.elements
        .filter((element) => element.text)
        .map((element) => ({
          tag: element.tag,
          text: element.text,
          item: { type: 'html', html: element.html },
        }))
    }
    if (block.type === 'image') {
      return [{ tag: 'img', text: '', item: { type: 'image', url: block.url, alt: block.alt } }]
    }
    if (block.type === 'video') {
      const id = youtubeId(block.url)
      // Solo YouTube (DESIGN.md, Video facade): otro vídeo no se puede pintar.
      if (!id) return []
      return [
        {
          tag: 'video',
          text: '',
          item: { type: 'video', url: youtubeWatchUrl(id), title: block.title ?? null },
        },
      ]
    }
    return []
  })
}

const items = (list: Piece[]) => list.flatMap((piece) => (piece.item ? [piece.item] : []))

/**
 * La entrada: lo que va entre el título y la primera lista o el primer rótulo de la
 * plantilla. Una lista que presenta una frase suya («…las misiones del tutorial:») va con
 * ella, y la entrada sigue. Devuelve también dónde sigue la página.
 */
function readIntro(list: Piece[], from: number): { intro: Piece[]; next: number } {
  const intro: Piece[] = []
  let at = from
  while (at < list.length && !isTemplateHeader(list[at]!)) {
    const piece = list[at]!
    if (piece.tag === 'ul') {
      // Una lista que presenta la frase anterior («…te recomiendo:») es de la entrada; si
      // no, es la de las misiones y la entrada acaba.
      const last = intro.at(-1)
      if (!last || !isText(last) || !last.text.endsWith(':')) break
    }
    intro.push(piece)
    at += 1
  }
  return { intro, next: at }
}

/**
 * La prosa del resto de la página, sin la plantilla: un rótulo de la plantilla y las listas
 * que lo siguen son plantilla, y una lista justo después de otra lista o de un rótulo también.
 * Una lista después de prosa es de esa prosa. Dentro del bloque de Necesitarás (desde su
 * rótulo, mientras solo sigan listas y rótulos de grupo), un rótulo de grupo conocido
 * («Combates:») es plantilla. El bloque acaba con la primera prosa o con otro rótulo, haya o
 * no recompensas después.
 */
function readProse(list: Piece[], from: number): Piece[] {
  const prose: Piece[] = []
  let afterTemplate = true
  let inNeeds = false
  for (let at = from; at < list.length; at += 1) {
    const piece = list[at]!
    if (isTemplateHeader(piece)) {
      afterTemplate = true
      inNeeds = isNeedsHeader(piece)
    } else if (inNeeds && afterTemplate && isGroupLabel(piece)) {
      // Un grupo de Necesitarás: su lista sigue.
    } else if (piece.tag === 'ul' && afterTemplate) {
      // Sigue la plantilla.
    } else {
      afterTemplate = false
      inNeeds = false
      prose.push(piece)
    }
  }
  return prose
}

/**
 * La entrada y el cierre de una página de logro. Lo que Torre escribe entre las misiones y
 * las recompensas (las milicias de las capturas) va al principio del cierre: en la página
 * nueva, las recompensas están en la cabecera y lo que sigue a las misiones es el cierre. Una
 * página sin la plantilla (sin listas al empezar, sin Necesitarás ni recompensas) es toda
 * entrada.
 */
export function achievementProse(page: SquarespacePage): AchievementProse {
  const list = pieces(page.blocks)
  const title = list.findIndex((piece) => /^h[12]$/.test(piece.tag))
  const start = title + 1
  const templated =
    list[start]?.tag === 'ul' || list.some((piece) => isRewards(piece) || isNeedsHeader(piece))
  if (!templated) return { intro: items(list.slice(start)), outro: [] }
  const { intro, next } = readIntro(list, start)
  return { intro: items(intro), outro: items(readProse(list, next)) }
}
