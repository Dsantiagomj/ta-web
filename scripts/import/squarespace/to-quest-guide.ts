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

// La etiqueta abre un consejo hasta su primera lista; las recomendaciones al inicio
// de un bloque continúan en el paso de la lucha. Las etiquetas ampliadas se conservan.
const RECOMMENDATIONS = /^RECOMENDACI(?:ÓN|ON|ONES)(?!\p{L})/u
const BARE_RECOMMENDATIONS = /^RECOMENDACI(?:ÓN|ON|ONES)\s*:?$/u
const RECOMMENDATIONS_LABEL = /^\s*RECOMENDACI(?:ÓN|ON|ONES)\s*:\s*/u

// Pasos. En las 1272 guías de misiones de Squarespace, Torre no marca los pasos con
// encabezados: cada bloque de texto va seguido de sus capturas. Esa unidad, un bloque de
// texto con las capturas que lo siguen, es un paso sin título; un bloque de texto sin
// capturas va con el siguiente. El primer [x,y] de la unidad, contando la línea de
// inicio que sale al resumen, son sus coordenadas. Lo que va antes del bloque con la
// línea de inicio («Habla con … para empezar») es la entrada. La frase de cierre («Aquí
// termina la misión…») y lo que la sigue, o el texto que queda tras las últimas capturas,
// es el final. Con menos de dos unidades (sin capturas, o un solo bloque) la guía queda
// como prosa. Solo una guía (el-safari-de-almas) marca sus pasos, con un párrafo «ETAPA 1:
// El safari de las almas ancebas:»; si hay marcas, mandan ellas: cada una abre un paso con
// ese título que sigue hasta la siguiente, y la última, como una unidad, se queda con el
// texto que le sigue hasta sus capturas. Un título nunca se inventa.
const STEP_MARKER = /^ETAPA\s+\d+\s*:\s*(.*?)\s*:?$/u

const NO_STEPS =
  'Sin pasos: ni marcas «ETAPA n:» ni bloques de texto con sus capturas; la guía queda como prosa'

/** Las primeras coordenadas de un texto, o null. */
function firstCoordinates(text: string): { x: number; y: number } | null {
  return splitCoordinates(text).find((part) => typeof part !== 'string') ?? null
}

/**
 * Marcas internas mientras se recorre la página: el principio de cada bloque de texto
 * (`start`: lleva la línea de inicio), el texto de cada elemento tal como venía (para las
 * coordenadas), un marcador «ETAPA n:» y la frase de cierre.
 */
type Marker =
  | { blockType: 'textBlock'; start: boolean; continues: boolean }
  | { blockType: 'source'; text: string }
  | { blockType: 'stepStart'; title: string }
  | { blockType: 'closing' }
type Draft = ContentBlock | Marker

function isContent(draft: Draft): draft is ContentBlock {
  return ['richText', 'image', 'video', 'callout'].includes(draft.blockType)
}

function isMedia(draft: Draft): boolean {
  return draft.blockType === 'image' || draft.blockType === 'video'
}

/** Un paso en construcción: sus bloques, su texto original y si ya tiene capturas. */
interface Unit {
  title?: string
  text: string[]
  body: ContentBlock[]
  media: boolean
}

const newUnit = (title?: string): Unit => ({ title, text: [], body: [], media: false })

function toStep(unit: Unit): StepBlock {
  const coordinates = firstCoordinates(unit.text.join(' '))
  return {
    blockType: 'step',
    ...(unit.title && { title: unit.title }),
    ...coordinates,
    body: unit.body,
  }
}

/** Pasos por marcas «ETAPA n:»: cada una hasta la siguiente; la última, como una unidad. */
function markedSteps(drafts: Draft[]): GuideBlock[] {
  const intro: ContentBlock[] = []
  const units: Unit[] = []
  const outro: ContentBlock[] = []
  const markers = drafts.filter((draft) => draft.blockType === 'stepStart').length
  let ending = false
  for (const draft of drafts) {
    const unit = units.at(-1)
    if (ending || draft.blockType === 'closing') {
      ending = true
      if (isContent(draft)) outro.push(draft)
    } else if (draft.blockType === 'stepStart') {
      units.push(newUnit(draft.title))
      units.at(-1)!.text.push(draft.title)
    } else if (!unit) {
      if (isContent(draft)) intro.push(draft)
    } else if (draft.blockType === 'textBlock') {
      // El último paso acaba al empezar un bloque de texto después de sus capturas.
      if (units.length === markers && unit.media && !draft.continues) ending = true
    } else if (draft.blockType === 'source') {
      unit.text.push(draft.text)
    } else if (isContent(draft)) {
      unit.body.push(draft)
      unit.media ||= isMedia(draft)
    }
  }
  return [...intro, ...units.map(toStep), ...outro]
}

/** Pasos sin título por unidades de texto y capturas, o null si no hay al menos dos. */
function unitSteps(drafts: Draft[]): GuideBlock[] | null {
  // Lo de antes del bloque con la línea de inicio es la entrada, capturas y vídeos
  // incluidos: se aparta antes de agrupar, para que no cuente como paso.
  const startBlock = drafts.findIndex((draft) => draft.blockType === 'textBlock' && draft.start)
  const intro = drafts.slice(0, Math.max(startBlock, 0)).filter(isContent)
  const units: Unit[] = []
  const outro: ContentBlock[] = []
  let unit = newUnit()
  let ending = false
  // Una unidad sin capturas no es un paso: lo suyo pasa al final.
  const close = () => {
    if (unit.media) units.push(unit)
    else outro.push(...unit.body)
    unit = newUnit()
  }
  for (const draft of drafts.slice(Math.max(startBlock, 0))) {
    if (ending) {
      if (isContent(draft)) outro.push(draft)
    } else if (draft.blockType === 'closing') {
      close()
      ending = true
    } else if (draft.blockType === 'textBlock') {
      if (unit.media && !draft.continues) {
        units.push(unit)
        unit = newUnit()
      }
    } else if (draft.blockType === 'source') {
      unit.text.push(draft.text)
    } else if (isContent(draft)) {
      unit.body.push(draft)
      unit.media ||= isMedia(draft)
    }
  }
  if (!ending) close()
  return units.length >= 2 ? [...intro, ...units.map(toStep), ...outro] : null
}

/**
 * Reparte el cuerpo en entrada, pasos y final: por las marcas «ETAPA n:» si las hay, si no
 * por unidades de texto y capturas. Sin pasos, el cuerpo en orden y la rareza.
 */
function nestSteps(drafts: Draft[], oddities: string[]): GuideBlock[] {
  if (drafts.some((draft) => draft.blockType === 'stepStart')) return markedSteps(drafts)
  const steps = unitSteps(drafts)
  if (steps) return steps
  oddities.push(NO_STEPS)
  return drafts.filter(isContent)
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

/** Recomendaciones en construcción: el párrafo de la etiqueta y lo que llevan. */
interface Recommendations {
  heading: string
  html: string[]
  /** Hasta su primera lista, las recomendaciones se quedan también con los párrafos. */
  takesParagraphs: boolean
}

/**
 * Abre las recomendaciones con su párrafo: la etiqueta sola no aporta texto; detrás de
 * «RECOMENDACIONES:», el consejo en mayúscula; si la etiqueta dice más («RECOMENDACIONES
 * PARA LA TERCERA LUCHA:»), el párrafo entero.
 */
function openRecommendations(element: TextElement): Recommendations {
  const open = (html: string[], takesParagraphs: boolean) => ({
    heading: element.html,
    html,
    takesParagraphs,
  })
  if (BARE_RECOMMENDATIONS.test(element.text)) return open([], true)
  const paragraph = parseHtml(element.html).body.firstElementChild
  const label = RECOMMENDATIONS_LABEL.exec(paragraph?.textContent ?? '')
  if (!paragraph || !label) return open([element.html], true)
  if (!dropLeadingText(paragraph, label[0].length)) return open([], true)
  capitalizeFirst(paragraph)
  return open([paragraph.outerHTML], false)
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
  let prose: string[] = []
  let heading: string | undefined
  let start: Start | undefined
  // El H2 del título es el primer elemento de la página; ninguno después lo es.
  let seenElement = false

  const flush = () => {
    if (prose.length) body.push({ blockType: 'richText', html: prose.join('') })
    prose = []
  }
  let tip: Recommendations | undefined
  const closeTip = () => {
    if (!tip) return
    // Una etiqueta sin nada detrás se queda como prosa: un consejo vacío no dice nada.
    if (tip.html.length)
      body.push({ blockType: 'callout', variant: 'tip', html: tip.html.join('') })
    else prose.push(tip.heading)
    tip = undefined
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

    // Cada bloque de texto empieza aparte: un paso es un bloque con sus capturas.
    flush()
    const textBlock = { blockType: 'textBlock' as const, start: false, continues: false }
    body.push(textBlock)
    let blockText = false
    // Prerrequisitos, Necesitarás y Recompensas ocupan cada uno su bloque de texto.
    let summaryField: SummaryField | undefined
    for (let element of block.elements) {
      if (!element.text) continue
      const first = !seenElement
      seenElement = true
      const firstInBlock = !blockText
      blockText = true
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

      const list = element.tag === 'ul' || element.tag === 'ol'
      if (tip && (list || tip.takesParagraphs)) {
        body.push({ blockType: 'source', text: element.text })
        tip.html.push(element.html)
        tip.takesParagraphs &&= !list
        continue
      }
      closeTip()
      if (!list && RECOMMENDATIONS.test(element.text)) {
        flush()
        body.push({ blockType: 'source', text: element.text })
        // Al principio de un bloque, el bloque sigue en el paso de la lucha.
        textBlock.continues ||= firstInBlock
        tip = openRecommendations(element)
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
        continue
      }
      // Las frases de inicio y cierre son párrafos; en listas o encabezados se respetan.
      const paragraph = element.tag === 'p'
      if (paragraph && CLOSING.test(element.text)) {
        flush()
        body.push({ blockType: 'closing' })
        const rest = withoutClosing(element)
        if (!rest) continue
        element = trimmed(rest)
      } else {
        // El texto tal como venía, línea de inicio incluida: de él salen las coordenadas.
        body.push({ blockType: 'source', text: element.text })
        const found = paragraph && !start ? readStart(element) : null
        if (found) {
          start = found
          textBlock.start = true
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
    closeTip()
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
  const stepOddities: string[] = []
  const nested = nestSteps(body, stepOddities)

  return {
    guide: {
      title: title(),
      slug: source.slug,
      originalUrl: `${SITE_URL}/${source.slug}`,
      summary,
      body: nested,
      questDofusIds: source.questDofusIds,
    },
    oddities: [...oddities, ...stepOddities, ...blockOddities],
  }
}
