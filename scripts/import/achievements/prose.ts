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

const REWARDS = /^recompensas\b/i
const NEEDS = /^(para (estas|las|este|esta)\b.*necesitar|necesitar[áa]s\b)/i
const PREREQUISITES = /^prerrequisitos\b/i
const QUESTS = /^misiones del logro\b/i
const TEXT_TAGS = /^(p|h[1-6]|blockquote)$/

const isText = (piece: Piece) => TEXT_TAGS.test(piece.tag)
const isRewards = (piece: Piece) => isText(piece) && REWARDS.test(piece.text)

/** Un rótulo de la plantilla: Necesitarás, Recompensas, Prerrequisitos o «Misiones del logro». */
function isTemplateHeader(piece: Piece): boolean {
  if (!isText(piece)) return false
  return [REWARDS, NEEDS, PREREQUISITES, QUESTS].some((pattern) => pattern.test(piece.text))
}

/** El rótulo de un grupo de Necesitarás: «Combates:», «Recursos y otras movidas:». */
function isGroupLabel(piece: Piece): boolean {
  return isText(piece) && piece.text.endsWith(':') && piece.text.split(' ').length <= 4
}

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
 * plantilla. Si su última frase presenta una lista («…las misiones del tutorial:»), la lista
 * va con ella. Devuelve también dónde sigue la página.
 */
function readIntro(list: Piece[], from: number): { intro: Piece[]; next: number } {
  let at = from
  while (at < list.length && list[at]!.tag !== 'ul' && !isTemplateHeader(list[at]!)) at += 1
  const intro = list.slice(from, at)
  const last = intro.at(-1)
  if (last && isText(last) && last.text.endsWith(':') && list[at]?.tag === 'ul') {
    intro.push(list[at]!)
    at += 1
  }
  return { intro, next: at }
}

/**
 * La prosa del resto de la página, sin la plantilla: un rótulo de la plantilla y las listas
 * que lo siguen son plantilla, y una lista justo después de otra lista o de un rótulo también.
 * Una lista después de prosa es de esa prosa. Antes de las recompensas, un rótulo corto
 * («Combates:») con su lista es un grupo de Necesitarás.
 */
function readProse(list: Piece[], from: number): Piece[] {
  const rewardsAt = list.reduce((last, piece, at) => (isRewards(piece) ? at : last), -1)
  const prose: Piece[] = []
  let afterTemplate = true
  for (let at = from; at < list.length; at += 1) {
    const piece = list[at]!
    const inNeeds = at < rewardsAt
    if (isTemplateHeader(piece) || (inNeeds && afterTemplate && isGroupLabel(piece))) {
      afterTemplate = true
    } else if (piece.tag === 'ul' && afterTemplate) {
      // Sigue la plantilla.
    } else {
      afterTemplate = false
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
    list[start]?.tag === 'ul' || list.some((piece) => isRewards(piece) || NEEDS.test(piece.text))
  if (!templated) return { intro: items(list.slice(start)), outro: [] }
  const { intro, next } = readIntro(list, start)
  return { intro: items(intro), outro: items(readProse(list, next)) }
}
