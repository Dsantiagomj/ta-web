import { validateSlug } from '@/collections/QuestGuides'
import { splitCoordinates } from '@/lib/guides/coordinates'

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

/** Un bloque de contenido: el cuerpo de la guía o el de un paso. */
export type ContentBlock =
  | { blockType: 'richText'; html: string }
  | { blockType: 'image'; url: string; alt: string }
  | { blockType: 'video'; url: string }
  | { blockType: 'callout'; variant: 'warning' | 'tip'; html: string }

/** Un paso (bloque Paso): título, coordenadas si las tiene y su propio contenido. */
export interface StepBlock {
  blockType: 'step'
  /** Sin título, la página pone «Paso N». */
  title?: string
  x?: number
  y?: number
  body: ContentBlock[]
}

export type GuideBlock = ContentBlock | StepBlock

export interface GuideSummary {
  prerequisites?: string
  /** El texto de Necesitarás va a las notas; la lista de objetos la rellena DofusDB. */
  needs?: { notes: string }
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
const SENTENCE_END = /[.!?…](?=\s|$)/
const CLOSING = /^[¡¿]?\s*(?:y\s+)?aquí\s+(?:se\s+)?termina\s+la\s+misión/i
// Avisos: un párrafo que empieza por una de estas etiquetas en mayúsculas ("Cuidado, …"
// en minúscula es prosa normal). Son las que usa Torre en las 1272 guías de misiones:
// «¡ATENCIÓN!» (60 párrafos), «IMPORTANTE:», «NOTA:» y «CUIDADO». Cada una da un tipo.
const CALLOUT_LABELS: Record<'warning' | 'tip', string[]> = {
  warning: ['IMPORTANTE', 'CUIDADO', 'ATENCIÓN'],
  tip: ['NOTA'],
}
const CALLOUT = new RegExp(`^¡?(${Object.values(CALLOUT_LABELS).flat().join('|')})(?!\\p{L})`, 'u')

// Pasos. En las 1272 guías de misiones de Squarespace, Torre no marca los pasos con
// encabezados: cada bloque de texto va seguido de sus capturas, sin título. Solo una
// guía (el-safari-de-almas) los marca, con un párrafo «ETAPA 1: El safari de las almas
// ancebas:». Ese párrafo, en mayúsculas y al principio, es la única marca que se
// reconoce: abre un paso con ese título, y el primer [x,y] del paso son sus coordenadas.
// El paso sigue hasta el siguiente marcador; el último acaba con su bloque de texto y las
// capturas que lo siguen, y lo demás es el cierre. Sin marcadores, la guía queda como
// prosa: un título nunca se inventa.
const STEP_MARKER = /^ETAPA\s+\d+\s*:\s*(.*?)\s*:?$/u

/** Las primeras coordenadas de un texto, o null. */
function firstCoordinates(text: string): { x: number; y: number } | null {
  return splitCoordinates(text).find((part) => typeof part !== 'string') ?? null
}

/** Texto plano de los bloques de texto de un paso, en orden. */
function stepText(body: ContentBlock[]): string {
  return body
    .map((block) => ('html' in block ? normalizedText(parseHtml(block.html).body) : ''))
    .join(' ')
}

/** Marca interna mientras se recorre la página: dónde empieza un paso y dónde acaba un bloque de texto. */
type Draft = ContentBlock | { blockType: 'stepStart'; title: string } | { blockType: 'textEnd' }

/**
 * Agrupa los bloques en pasos según las marcas: lo de antes del primero es la entrada; el
 * último paso se cierra al acabar su bloque de texto y las capturas o vídeos que lo siguen.
 */
function nestSteps(drafts: Draft[]): GuideBlock[] {
  const intro: GuideBlock[] = []
  const steps: StepBlock[] = []
  const outro: ContentBlock[] = []
  let lastStart = -1
  drafts.forEach((draft, index) => {
    if (draft.blockType === 'stepStart') lastStart = index
  })
  // 'open': el último paso aún lee su texto; 'media': solo admite sus capturas; 'outro': cierre.
  let last: 'open' | 'media' | 'outro' = 'open'
  drafts.forEach((draft, index) => {
    if (draft.blockType === 'stepStart') {
      // Sin título, el paso no lleva: la página pone «Paso N».
      steps.push({ blockType: 'step', ...(draft.title && { title: draft.title }), body: [] })
      return
    }
    if (draft.blockType === 'textEnd') {
      if (index > lastStart && last === 'open') last = 'media'
      return
    }
    const step = steps.at(-1)
    if (!step) intro.push(draft)
    else if (index < lastStart || last === 'open') step.body.push(draft)
    else if (last === 'media' && (draft.blockType === 'image' || draft.blockType === 'video')) {
      step.body.push(draft)
    } else {
      last = 'outro'
      outro.push(draft)
    }
  })
  for (const step of steps) {
    const coordinates = firstCoordinates(`${step.title ?? ''} ${stepText(step.body)}`)
    if (coordinates) Object.assign(step, coordinates)
  }
  return [...intro, ...steps, ...outro]
}

/** Sin tildes y en minúsculas, para comparar etiquetas escritas de varias formas. */
function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

function summaryLabel(text: string): { field: SummaryField; rest: string } | null {
  for (const [field, label] of Object.entries(SUMMARY_LABELS) as [SummaryField, string][]) {
    const folded = fold(label)
    // Con dos puntos: "Necesitarás hablar con…" es prosa, no la etiqueta del resumen.
    if (fold(text).startsWith(folded) && /^\s*:/.test(text.slice(label.length))) {
      return { field, rest: text.slice(label.length).replace(/^\s*:\s*/, '') }
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

/** Pone en mayúscula la primera letra del texto de un nodo. */
function capitalizeFirst(node: Element): void {
  const walker = node.ownerDocument.createTreeWalker(node, 4 /* SHOW_TEXT */)
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    const value = text.textContent ?? ''
    const first = value.search(/\S/)
    if (first === -1) continue
    text.textContent =
      value.slice(0, first) + value.charAt(first).toLocaleUpperCase('es') + value.slice(first + 1)
    return
  }
}

/**
 * Quita la etiqueta del principio de un aviso («IMPORTANTE:», «¡ATENCIÓN, ATENCIÓN!»): el
 * título del aviso ya la dice. Solo con dos puntos o exclamación detrás, porque
 * «CUIDADO CON EL MISSCLICK» es la frase, no una etiqueta. Lo que queda empieza en
 * mayúscula; sin nada detrás de la etiqueta, el aviso se queda como estaba.
 */
function withoutCalloutLabel(html: string, variant: keyof typeof CALLOUT_LABELS): string {
  const paragraph = parseHtml(html).body.firstElementChild
  if (!paragraph) return html
  const words = CALLOUT_LABELS[variant].join('|')
  const label = new RegExp(
    `^\\s*¡?\\s*(?:${words})(?:\\s*,\\s*¡?\\s*(?:${words}))*\\s*[!:]+\\s*`,
    'u',
  ).exec(paragraph.textContent ?? '')
  if (!label || !dropLeadingText(paragraph, label[0].length)) return html
  capitalizeFirst(paragraph)
  return paragraph.outerHTML
}

/** Texto comparable: sin tildes, mayúsculas, signos ni la numeración inicial ("29. "). */
function comparable(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/^\d+ /, '')
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
  const body: Draft[] = []
  let steps = 0
  let prose: string[] = []
  let heading: string | undefined
  let start: Start | undefined
  // El H2 del título es el primer elemento de la página; ninguno después lo es.
  let seenElement = false

  const flush = () => {
    if (prose.length) body.push({ blockType: 'richText', html: prose.join('') })
    prose = []
  }
  const title = () => page.title ?? heading ?? source.slug

  for (const block of page.blocks) {
    if (block.type !== 'text') {
      seenElement = true
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
      const first = !seenElement
      seenElement = true
      // Las etiquetas del resumen van primero: a veces llegan como encabezado.
      const label = summaryLabel(element.text)
      if (label) {
        summaryField = label.field
        const fieldLines = (summaryLines[summaryField] ??= [])
        if (label.rest) fieldLines.push(label.rest)
        continue
      }
      if (summaryField) {
        summaryLines[summaryField]?.push(...lines(element))
        continue
      }
      if (first && /^h[12]$/.test(element.tag)) {
        heading = element.text
        // A veces el H2 es más completo que el título: se anota para revisarlo.
        if (page.title !== null && comparable(element.text) !== comparable(page.title)) {
          blockOddities.push(`Encabezado distinto del título: «${element.text}»`)
        }
        continue
      }

      // Lo que queda de un párrafo recortado se trata como prosa, aviso incluido.
      const trimmed = (html: string): TextElement => ({
        ...element,
        html,
        text: normalizedText(parseHtml(html).body),
      })
      // Un párrafo «ETAPA n: título» abre un paso; no es prosa.
      const marker = element.tag !== 'ul' && element.tag !== 'ol' && STEP_MARKER.exec(element.text)
      if (marker) {
        flush()
        body.push({ blockType: 'stepStart', title: marker[1]! })
        steps += 1
        continue
      }
      // Las frases de inicio y cierre son párrafos; en listas o encabezados se respetan.
      const paragraph = element.tag === 'p'
      if (paragraph && CLOSING.test(element.text)) {
        const rest = withoutClosing(element)
        if (!rest) continue
        element = trimmed(rest)
      } else if (paragraph && !start) {
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
        const variant = CALLOUT_LABELS.tip.includes(callout[1]!) ? 'tip' : 'warning'
        body.push({
          blockType: 'callout',
          variant,
          html: withoutCalloutLabel(element.html, variant),
        })
        continue
      }
      prose.push(element.html)
    }
    // Con pasos, cada bloque de texto se cierra aparte: el último paso acaba con el suyo.
    if (steps > 0) {
      flush()
      body.push({ blockType: 'textEnd' })
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
    // Una etiqueta sola, sin texto, es un bloque que falta: va a la cola de revisión.
    if (!found?.length) oddities.push(`Falta el bloque ${label}`)
    else if (field === 'needs') summary.needs = { notes: found.join('\n') }
    else summary[field] = found.join('\n')
  }
  if (start) {
    summary.startNpc = start.npc
    summary.startX = start.x
    summary.startY = start.y
  } else {
    oddities.push('No se encontró la línea de inicio (PNJ y coordenadas)')
  }
  if (steps === 0) oddities.push('Sin pasos marcados («ETAPA n: título»): la guía queda como prosa')
  const nested = nestSteps(body)

  return {
    guide: {
      title: title(),
      slug: source.slug,
      originalUrl: `${SITE_URL}/${source.slug}`,
      summary,
      body: nested,
      questDofusIds: source.questDofusIds,
    },
    oddities: [...oddities, ...blockOddities],
  }
}
