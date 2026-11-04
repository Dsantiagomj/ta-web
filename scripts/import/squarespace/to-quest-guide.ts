import { validateSlug } from '@/collections/QuestGuides'

import { normalizedText, parseHtml } from './dom'
import type { SquarespacePage, TextElement } from './parse-page'

/**
 * Las cinco guías de la primera importación (salida de la fase 0): una normal con
 * varias capturas, una con vídeo, una sin misión en DofusDB, una larga y una con aviso.
 */
export const GUIDE_SLUGS = [
  'el-cazador-cazado',
  'intoxicacion-profunda',
  'operacion-envenenamiento',
  'entretanto-un-renacer',
  'seis-pies-bajo-tierra',
] as const

export const SITE_URL = 'https://www.torrentearcano.com'

export type GuideBlock =
  | { blockType: 'richText'; html: string }
  | { blockType: 'image'; url: string; alt: string }
  | { blockType: 'video'; url: string }
  | { blockType: 'callout'; variant: 'warning' | 'tip'; html: string }

export interface GuideSummary {
  prerequisites?: string
  needs?: string
  rewards?: string
  startNpc?: string
  startX?: number
  startY?: number
}

/** Una guía lista para cargar: la prosa sigue en HTML hasta que el cargador la pasa a Lexical. */
export interface GuideDraft {
  title: string
  slug: string
  originalUrl: string
  summary: GuideSummary
  body: GuideBlock[]
  questDofusIds: number[]
}

export interface ConvertedGuide {
  guide: GuideDraft
  oddities: string[]
}

type SummaryField = 'prerequisites' | 'needs' | 'rewards'

const SUMMARY_LABELS: Record<SummaryField, string> = {
  prerequisites: 'Prerrequisitos',
  needs: 'Necesitarás',
  rewards: 'Recompensas',
}

// "Habla con" aparece en mitad de muchas guías: solo es el inicio si dice "para empezar".
const START =
  /^\s*(Habla con|La misión empieza hablando con)\s+(.+?)\s*\[\s*(-?\d+)\s*,\s*(-?\d+)\s*\]/
// Lo que puede seguir a las coordenadas en una línea de inicio sin más información.
const BARE_START_TAIL = /^\s*(?:para empezar (?:la|esta) misión)?\s*[.!]?\s*$/i
const SENTENCE_END = /[.!?](?=\s|$)/
const CLOSING = /^[¡¿]?\s*(?:y\s+)?aquí\s+(?:se\s+)?termina\s+la\s+misión/i
// En mayúsculas: "Cuidado, …" en minúscula es prosa normal.
const CALLOUT = /^(IMPORTANTE|CUIDADO|NOTA)\b/

/** Sin tildes y en minúsculas, para comparar etiquetas escritas de varias formas. */
function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

function summaryLabel(text: string): { field: SummaryField; rest: string } | null {
  for (const [field, label] of Object.entries(SUMMARY_LABELS) as [SummaryField, string][]) {
    const folded = fold(label)
    if (fold(text).startsWith(folded) && /^(\s|:|$)/.test(text.slice(label.length))) {
      return { field, rest: text.slice(label.length).replace(/^\s*:?\s*/, '') }
    }
  }
  return null
}

/** Una lista da una línea por elemento; cualquier otro elemento, una línea. */
function lines(element: TextElement): string[] {
  if (element.tag !== 'ul' && element.tag !== 'ol') return [element.text]
  return [...parseHtml(element.html).querySelectorAll('li')].map(normalizedText).filter(Boolean)
}

/** Fin de la primera frase a partir de `from`, con el espacio que la separa de la siguiente. */
function sentenceCut(raw: string, from: number): number {
  const end = SENTENCE_END.exec(raw.slice(from))
  const sentence = end ? from + end.index + 1 : raw.length
  return sentence + (/^\s*/.exec(raw.slice(sentence))?.[0].length ?? 0)
}

/**
 * Quita los primeros `count` caracteres de texto de un párrafo nodo a nodo, para no
 * perder el formato del resto. Devuelve el HTML que queda, o null si no queda texto.
 */
function dropLeadingText(paragraph: Element, count: number): string | null {
  const walker = paragraph.ownerDocument.createTreeWalker(paragraph, 4 /* SHOW_TEXT */)
  const emptied: Node[] = []
  let pending = count
  for (let node = walker.nextNode(); node && pending > 0; node = walker.nextNode()) {
    const text = node.textContent ?? ''
    node.textContent = text.slice(pending)
    pending -= Math.min(pending, text.length)
    if (!node.textContent) emptied.push(node)
  }
  // Fuera también las etiquetas que quedaron vacías (<strong></strong>).
  for (const node of emptied) {
    let empty: Node = node
    while (empty.parentNode && empty.parentNode !== paragraph && !empty.parentNode.textContent) {
      empty = empty.parentNode
    }
    empty.parentNode?.removeChild(empty)
  }
  return normalizedText(paragraph) ? paragraph.outerHTML : null
}

type Start = { npc: string; x: number; y: number; html: string | null }

/**
 * Reconoce la línea de inicio ("Habla con PNJ [x,y] para empezar…"). Su frase solo sale
 * del cuerpo cuando no dice nada más que eso; con más información (cuándo, dónde) se
 * queda entera. `html` es lo que queda del párrafo, o null si no queda nada.
 */
function readStart(element: TextElement): Start | null {
  const paragraph = parseHtml(element.html).body.firstElementChild
  const raw = paragraph?.textContent ?? ''
  const match = START.exec(raw)
  if (!paragraph || !match) return null

  // La frase acaba después de las coordenadas: un nombre como "Sr. X" no la corta.
  const cut = sentenceCut(raw, match[0].length)
  const sentence = raw.slice(match[0].length, cut)
  if (match[1] === 'Habla con' && !/para empezar/i.test(sentence)) return null

  return {
    npc: match[2]!.replace(/^(el|la|los|las)\s+/, '').trim(),
    x: Number(match[3]),
    y: Number(match[4]),
    html: BARE_START_TAIL.test(sentence) ? dropLeadingText(paragraph, cut) : element.html,
  }
}

/** Quita la frase de cierre ("Aquí termina la misión…") y deja el resto del párrafo. */
function withoutClosing(element: TextElement): string | null {
  const paragraph = parseHtml(element.html).body.firstElementChild
  if (!paragraph) return null
  return dropLeadingText(paragraph, sentenceCut(paragraph.textContent ?? '', 0))
}

/**
 * Convierte una página de Squarespace en una guía de misión. Nunca lanza por el
 * contenido: lo que no encaja queda en `oddities` para revisarlo en el panel.
 */
export function toQuestGuide(
  page: SquarespacePage,
  source: { slug: string; questDofusIds: number[] },
): ConvertedGuide {
  const blockOddities: string[] = []
  const summaryLines: Partial<Record<SummaryField, string[]>> = {}
  const body: GuideBlock[] = []
  let prose: string[] = []
  let heading: string | undefined
  let start: Start | undefined
  let started = false

  const flush = () => {
    if (prose.length) body.push({ blockType: 'richText', html: prose.join('') })
    prose = []
  }
  const title = () => page.title ?? heading ?? source.slug

  for (const block of page.blocks) {
    if (block.type !== 'text') {
      started = true
      if (block.type === 'unknown') {
        blockOddities.push(`Bloque de Squarespace sin convertir: ${block.sqspType}`)
        continue
      }
      flush()
      body.push(
        block.type === 'image'
          ? { blockType: 'image', url: block.url, alt: block.alt || title() }
          : { blockType: 'video', url: block.url },
      )
      continue
    }

    // Prerrequisitos, Necesitarás y Recompensas ocupan cada uno su bloque de texto.
    let summaryField: SummaryField | undefined
    for (let element of block.elements) {
      if (!element.text) continue
      // Las etiquetas del resumen van primero: a veces llegan como encabezado.
      const label = summaryLabel(element.text)
      if (label) {
        summaryField = label.field
        const fieldLines = (summaryLines[summaryField] ??= [])
        if (label.rest) fieldLines.push(label.rest)
        continue
      }
      // Solo el primer H1/H2, antes del contenido, repite el título; los demás son contenido.
      if (!started && heading === undefined && /^h[12]$/.test(element.tag)) {
        heading = element.text
        continue
      }
      if (summaryField) {
        summaryLines[summaryField]?.push(...lines(element))
        continue
      }

      started = true
      // Lo que queda de un párrafo recortado se trata como prosa, aviso incluido.
      const trimmed = (html: string): TextElement => ({
        ...element,
        html,
        text: normalizedText(parseHtml(html).body),
      })
      if (CLOSING.test(element.text)) {
        const rest = withoutClosing(element)
        if (!rest) continue
        element = trimmed(rest)
      } else if (!start) {
        const found = readStart(element)
        if (found) {
          start = found
          if (!found.html) continue
          element = trimmed(found.html)
        }
      }
      const callout = CALLOUT.exec(element.text)
      if (callout) {
        flush()
        body.push({
          blockType: 'callout',
          variant: callout[1] === 'NOTA' ? 'tip' : 'warning',
          html: element.html,
        })
        continue
      }
      prose.push(element.html)
    }
  }
  flush()

  const summary: GuideSummary = {}
  const oddities: string[] = []
  if (validateSlug(source.slug) !== true) oddities.push(`Slug no válido: ${source.slug}`)
  if (!page.title) oddities.push('Sin título de página en Squarespace')
  if (!source.questDofusIds.length) oddities.push('Sin misión de DofusDB enlazada')
  for (const [field, label] of Object.entries(SUMMARY_LABELS) as [SummaryField, string][]) {
    const found = summaryLines[field]
    if (found) summary[field] = found.join('\n')
    else oddities.push(`Falta el bloque ${label}`)
  }
  if (start) {
    summary.startNpc = start.npc
    summary.startX = start.x
    summary.startY = start.y
  } else {
    oddities.push('No se encontró la línea de inicio (PNJ y coordenadas)')
  }

  return {
    guide: {
      title: title(),
      slug: source.slug,
      originalUrl: `${SITE_URL}/${source.slug}`,
      summary,
      body,
      questDofusIds: source.questDofusIds,
    },
    oddities: [...oddities, ...blockOddities],
  }
}
