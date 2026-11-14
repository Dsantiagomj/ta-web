// Lee una guía de Dofus de la web de Torre (Squarespace) y la convierte en datos: los
// Prerrequisitos, Necesitarás por grupos, la intro, los logros y misiones en su orden, las
// notas entre ellos, las recompensas, el vídeo, el aviso de la checklist y, en las guías paso
// a paso (la Piñata de pino), el cuerpo con sus capturas. El texto queda tal cual lo escribió.
import { youtubeId } from '@/lib/guides/video'

import { parseHtml } from '../squarespace/dom'
import { parsePage, type TextElement } from '../squarespace/parse-page'

/** Un trozo de texto: plano (quizá en negrita) o un enlace. */
export type Segment =
  { t: 'text'; v: string; b?: boolean } | { t: 'link'; v: string; href: string; b?: boolean }

export interface NeedRow {
  /** El texto plano de la fila. */
  text: string
  segs: Segment[]
  /**
   * «1 x Sello de los fundadores (o fabricarlo).»: 1, el nombre y la nota. Sin «1 x» no hay
   * cantidad, pero sí nombre y nota: «Varita pitusa.» da el nombre «Varita pitusa».
   */
  quantity?: number
  name?: string
  note?: string
  /** Toda la fila en negrita. */
  strong?: boolean
  children?: NeedRow[]
}

export interface NeedsGroup {
  /** «Mazmorras»; null para las filas sueltas. */
  name: string | null
  rows: NeedRow[]
}

export interface Needs {
  title: string
  /** Lo que Torre pone entre paréntesis tras el título. */
  note: string | null
  groups: NeedsGroup[]
}

export interface QuestRef {
  name: string
  /** El slug de su guía en la web de Torre, o null si no la enlaza. */
  slug: string | null
  /** Varias misiones de las que se hace una. */
  alternatives?: { name: string; slug: string | null }[]
  /** Lo que sigue al enlace: «(solo empezarla)». */
  note?: string
}

export interface AchievementPart {
  type: 'achievement'
  number?: number
  name: string
  slug: string | null
  quests: QuestRef[]
}

export type Part =
  | AchievementPart
  | { type: 'metalogro'; number?: number; name: string; achievements: Part[] }
  | { type: 'quests'; number?: number; title: string | null; quests: QuestRef[] }
  | { type: 'quest'; number?: number; quest: QuestRef }
  | { type: 'note'; segs: Segment[] }

export type BodyItem =
  { type: 'paragraph'; segs: Segment[] } | { type: 'image'; url: string; alt: string }

export interface DofusGuideSource {
  /** El título grande de la página: «DOFUS ABISAL». */
  heading: string | null
  /** El aviso de la checklist: «YA TENEMOS CHECKLIST DOFUS DE LOS HIELOS». */
  banner: { text: string; href: string } | null
  prerequisites: Segment[][]
  needs: Needs | null
  intro: Segment[][]
  parts: Part[]
  rewards: string[] | null
  /** El ID del vídeo de YouTube. */
  video: string | null
  body: BodyItem[]
}

const SITE = /^https?:\/\/(?:www\.)?torrentearcano\.com/

// ---------- del DOM a texto marcado: **negrita** y [[texto|enlace]] ----------

/** El texto de un nodo con sus negritas y enlaces marcados; las listas anidadas se saltan. */
function marked(node: Node): string {
  let out = ''
  for (const child of node.childNodes) {
    if (child.nodeType === 3) {
      out += child.textContent ?? ''
      continue
    }
    if (child.nodeType !== 1) continue
    const element = child as Element
    const tag = element.tagName.toLowerCase()
    if (tag === 'ul' || tag === 'ol') continue
    if (tag === 'br') out += ' '
    else if (tag === 'a') {
      // La negrita dentro del enlace (<a><strong>…</strong></a>) se marca por fuera.
      const inner = marked(element)
      const link = `[[${inner.replace(/\*\*/g, '')}|${element.getAttribute('href') ?? ''}]]`
      out += /^\s*\*\*[\s\S]*\*\*\s*$/.test(inner) ? `**${link}**` : link
    } else if (tag === 'strong' || tag === 'b') out += `**${marked(element)}**`
    else out += marked(element)
  }
  return out.replace(/ /g, ' ')
}

interface ListItem {
  text: string
  children: ListItem[]
}

function listItems(list: Element): ListItem[] {
  return [...list.children]
    .filter((child) => child.tagName.toLowerCase() === 'li')
    .map((item) => {
      const nested = [...item.children].find((child) =>
        ['ul', 'ol'].includes(child.tagName.toLowerCase()),
      )
      return { text: marked(item).trim(), children: nested ? listItems(nested) : [] }
    })
}

type Block =
  | { tag: string; text: string }
  | { tag: 'ul' | 'ol'; items: ListItem[] }
  | { tag: 'img'; url: string; alt: string }
  | { tag: 'video'; id: string }

function elementBlock(element: TextElement): Block {
  const node = parseHtml(element.html).body.firstElementChild!
  if (element.tag === 'ul' || element.tag === 'ol') {
    return { tag: element.tag, items: listItems(node) }
  }
  return { tag: element.tag, text: marked(node).trim() }
}

// ---------- texto marcado a trozos ----------

/** «**negrita**» y «[[texto|enlace]]» a trozos de texto y enlaces. */
export function inline(source: string): Segment[] {
  // «[[[38,-80]|#]]»: las coordenadas de la Piñata, que no enlazan a nada.
  const src = source.replace(/\[\[(\[-?\d+,\s*-?\d+\])\|#\]\]/g, '$1')
  const segs: Segment[] = []
  let bold = false
  const push = (v: string) => {
    if (!v) return
    const last = segs.at(-1)
    if (last && last.t === 'text' && Boolean(last.b) === bold) last.v += v
    else segs.push(bold ? { t: 'text', v, b: true } : { t: 'text', v })
  }
  let at = 0
  for (const match of src.matchAll(/\*\*|\[\[([^\]|]*)\|([^\]]*)\]\]/g)) {
    push(src.slice(at, match.index))
    if (match[0] === '**') bold = !bold
    else {
      const href = match[2]!.replace(SITE, '')
      if (href === '#') push(match[1]!)
      else segs.push({ t: 'link', v: match[1]!, href, ...(bold ? { b: true } : {}) })
    }
    at = match.index + match[0].length
  }
  push(src.slice(at))
  const first = segs[0]
  if (first?.t === 'text') first.v = first.v.replace(/^\s+/, '')
  const last = segs.at(-1)
  if (last?.t === 'text') last.v = last.v.replace(/\s+$/, '')
  return segs.filter((seg) => seg.t === 'link' || seg.v !== '')
}

const plain = (src: string) =>
  src
    .replace(/\*\*/g, '')
    .replace(/\[\[([^\]|]*)\|[^\]]*\]\]/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
const slugFromHref = (href: string | undefined) =>
  href && href.startsWith('/') ? href.slice(1).replace(/\/$/, '') || null : null
const allBold = (src: string) =>
  /^\s*\*\*/.test(src) && /\*\*[\s.:]*$/.test(src) && !plain(src).includes('[[')
// El punto final es la puntuación de la lista de Torre, no parte del nombre; unos puntos
// suspensivos sí lo son.
const unDot = (s: string) =>
  s
    .replace(/\s+$/, '')
    .replace(/(?<!\.)\.$/, '')
    .trim()

// ---------- Necesitarás ----------

const QUANTITY = /^(\d[\d\s]*)\s*x\s+(.+)$/i

function needRow(item: ListItem): NeedRow {
  const text = plain(item.text)
  const row: NeedRow = { text, segs: inline(item.text) }
  if (allBold(item.text)) row.strong = true
  const match = QUANTITY.exec(text)
  // Una fila con enlaces (emotes, misiones) no es un objeto. Sin «1 x» también queda su
  // nombre, salvo si encabeza otras filas: la importación lo da por objeto solo si un único
  // objeto del juego se llama así.
  const named = match || (!item.children.length && !/:$/.test(unDot(text)))
  if (named && !item.text.includes('[[')) {
    if (match) row.quantity = Number(match[1]!.replace(/\s/g, ''))
    const rest = unDot(match ? match[2]! : text)
    const note = /^(.*?)\s*(\(.*\))$/.exec(rest)
    const name = note ? note[1]! : rest
    if (name) row.name = name
    if (name && note) row.note = note[2]!
  }
  if (item.children.length) row.children = item.children.map(needRow)
  return row
}

// Una fila que acaba en «:» sin hijas encabeza las que le siguen: en el Turquesa y el Ébano
// la lista de Torre perdió el sangrado. Se reagrupan.
function regroup(items: ListItem[]): ListItem[] {
  const out: ListItem[] = []
  let head: ListItem | null = null
  for (const item of items) {
    const text = plain(item.text)
    const isHead =
      !item.children.length && /:\s*(\*\*)?\s*$/.test(item.text) && !QUANTITY.test(text)
    const isGroup = item.children.length > 0 && !QUANTITY.test(text)
    if (isHead) {
      head = { ...item, children: [] }
      out.push(head)
    } else if (isGroup) {
      head = null
      out.push(item)
    } else if (head) head.children.push(item)
    else out.push(item)
  }
  return out
}

function needsGroups(items: ListItem[]): NeedsGroup[] {
  // Cada fila con hijas que no es una cantidad es un grupo («Mazmorras:»); las sueltas van juntas.
  const groups: NeedsGroup[] = []
  let loose: NeedsGroup | null = null
  for (const item of regroup(items)) {
    const name = plain(item.text).replace(/:\s*$/, '')
    if (item.children.length && !QUANTITY.test(name)) {
      groups.push({ name, rows: item.children.map(needRow) })
      loose = null
      continue
    }
    if (!loose) {
      loose = { name: null, rows: [] }
      groups.push(loose)
    }
    loose.rows.push(needRow(item))
  }
  return groups
}

// ---------- logros, metalogros y misiones ----------

const PART = /^(?:\[\[)?\s*(?:\d+\)\s*)?(?:Meta)?[Ll]ogro\b|^\d+\)/
const isPartList = (items: ListItem[]) =>
  items.length > 0 &&
  PART.test(plain(items[0]!.text).replace(/^\[\[/, '')) &&
  !/^Logro: “/.test(plain(items[0]!.text))

function questRef(item: ListItem): QuestRef {
  const segs = inline(item.text)
  const links = segs.filter((seg) => seg.t === 'link')
  if (links.length === 0) return { name: unDot(plain(item.text)), slug: null }
  const refs = links.map((link) => ({ name: unDot(link.v), slug: slugFromHref(link.href) }))
  // Lo que sigue al último enlace es la nota de Torre: «(solo empezarla)».
  const tail = plain(item.text.slice(item.text.lastIndexOf(']]') + 2)).replace(
    /^[.\s]+|[.\s]+$/g,
    '',
  )
  const ref: QuestRef = refs.length > 1 ? { ...refs[0]!, alternatives: refs } : refs[0]!
  if (tail) ref.note = tail
  return ref
}

function part(item: ListItem): Part {
  const text = plain(item.text)
  const numbered = /^(\d+)\)\s*/.exec(text)
  const number = numbered ? Number(numbered[1]) : undefined
  const body = numbered ? text.slice(numbered[0].length) : text
  const link = inline(item.text).find((seg) => seg.t === 'link')
  const children = item.children
  const withNumber = number === undefined ? {} : { number }
  if (/^Metalogro:/i.test(body)) {
    return {
      type: 'metalogro',
      ...withNumber,
      name: unDot(body.replace(/^Metalogro:\s*/i, '').replace(/:\s*$/, '')),
      achievements: children.map(part),
    }
  }
  if (/^Logro\s*:/i.test(body)) {
    const raw =
      link && /logro/i.test(link.v)
        ? link.v.replace(/^Logro:\s*/i, '')
        : (link?.v ?? body.replace(/^Logro\s*:\s*/i, ''))
    return {
      type: 'achievement',
      ...withNumber,
      name: unDot(raw.replace(/:\s*$/, '')),
      slug: link ? slugFromHref(link.href) : null,
      quests: children.map(questRef),
    }
  }
  if (!children.length && link) return { type: 'quest', ...withNumber, quest: questRef(item) }
  // «Prerrequisitos de misiones secundarias:» y sus misiones.
  return {
    type: 'quests',
    ...withNumber,
    title: unDot(body.replace(/:\s*$/, '')),
    quests: children.map(questRef),
  }
}

// ---------- la página ----------

function blocksOf(html: string): Block[] {
  const blocks: Block[] = []
  for (const block of parsePage(html).blocks) {
    if (block.type === 'text') blocks.push(...block.elements.map(elementBlock))
    else if (block.type === 'image') blocks.push({ tag: 'img', url: block.url, alt: block.alt })
    else if (block.type === 'video') {
      const id = youtubeId(block.url)
      if (id) blocks.push({ tag: 'video', id })
    }
  }
  return blocks
}

const isList = (block: Block): block is { tag: 'ul' | 'ol'; items: ListItem[] } => 'items' in block
const isText = (block: Block): block is { tag: string; text: string } => 'text' in block

/**
 * La guía de Dofus de una página de Torre, o null si la página no tiene contenido (los
 * Dofus que aún no tienen guía en su web: quedan «En preparación»).
 */
export function parseDofusGuide(html: string): DofusGuideSource | null {
  const blocks = blocksOf(html).filter((block) => !isText(block) || block.text !== '')
  if (blocks.length === 0) return null
  const guide: DofusGuideSource = {
    heading: null,
    banner: null,
    prerequisites: [],
    needs: null,
    intro: [],
    parts: [],
    rewards: null,
    video: null,
    body: [],
  }
  // Las páginas con capturas son guías paso a paso: lo que sigue a la intro es su cuerpo.
  const narrative = blocks.some((block) => block.tag === 'img')
  let mode: 'pre' | 'needs' | 'rewards' | { title: string } | null = null
  let afterParts = false

  blocks.forEach((block, index) => {
    if (block.tag === 'video' && 'id' in block) {
      guide.video = block.id
      return
    }
    if (block.tag === 'img' && 'url' in block) {
      guide.body.push({ type: 'image', url: block.url, alt: block.alt })
      return
    }
    if (isText(block) && /^h[1-6]$/.test(block.tag)) {
      const link = inline(block.text).find((seg) => seg.t === 'link')
      if (link && link.t === 'link' && /checklist/i.test(link.href)) {
        guide.banner = { text: plain(link.v), href: link.href }
      } else guide.heading ??= plain(block.text)
      return
    }
    if (isText(block)) {
      const text = plain(block.text)
      if (/^Prerrequisitos\s*:/i.test(text)) {
        mode = 'pre'
        return
      }
      if (/^Necesitarás|vas a necesitar en total/i.test(text)) {
        mode = 'needs'
        guide.needs = {
          title: /en total/i.test(text) ? 'Necesitarás en total' : 'Necesitarás',
          note: /\((.*)\)/.exec(text)?.[1] ?? null,
          groups: [],
        }
        return
      }
      if (/^Recompensas/i.test(text)) {
        mode = 'rewards'
        return
      }
      // Un párrafo que acaba en «:» anuncia la lista que le sigue (submisiones, misiones random).
      const next = blocks[index + 1]
      if (
        /:\s*$/.test(text) &&
        next &&
        isList(next) &&
        !isPartList(next.items) &&
        !/^Para obtener/i.test(text)
      ) {
        mode = { title: text.replace(/:\s*$/, '') }
        return
      }
      mode = null
      if (narrative && guide.intro.length)
        guide.body.push({ type: 'paragraph', segs: inline(block.text) })
      else if (guide.parts.length || afterParts)
        guide.parts.push({ type: 'note', segs: inline(block.text) })
      else guide.intro.push(inline(block.text))
      return
    }
    if (!isList(block)) return
    const items = block.items
    if (mode === 'pre') {
      guide.prerequisites.push(...items.map((item) => inline(item.text)))
      return
    }
    if (mode === 'rewards') {
      guide.rewards = items.map((item) => plain(item.text).replace(/\.$/, ''))
      return
    }
    if (isPartList(items)) {
      guide.parts.push(...items.map(part))
      afterParts = true
      mode = null
      return
    }
    if (mode === 'needs' && guide.needs) {
      guide.needs.groups.push(...needsGroups(items))
      return
    }
    if (mode && typeof mode === 'object') {
      guide.parts.push({ type: 'quests', title: mode.title, quests: items.map(questRef) })
      return
    }
    // «Prerrequisitos de misiones secundarias:» como único elemento, con sus misiones debajo.
    if (items.length === 1 && items[0]!.children.length) guide.parts.push(part(items[0]!))
    else guide.parts.push({ type: 'quests', title: null, quests: items.map(questRef) })
  })
  return guide
}
