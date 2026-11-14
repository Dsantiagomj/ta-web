// Devuelve la frase de cierre («Aquí termina la misión.») a las guías importadas antes de
// que el importador la conservara. La frase se lee de la página de Squarespace guardada en
// la carpeta del inventario (raw/pages/<slug>.html) y vuelve al párrafo del que salió, al
// principio del final, como lo deja ahora `pnpm import:guides`. Lo usa
// scripts/backfill-guides.ts (pnpm guides:backfill).
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Payload } from 'payload'

import type { QuestGuide } from '@/payload-types'

import { createHtmlToLexical } from './rich-text'
import { releaseDom } from './squarespace/dom'
import { parsePage } from './squarespace/parse-page'
import { closingParagraphs } from './squarespace/to-quest-guide'

type LexicalNode = { type?: string; text?: string; children?: LexicalNode[] }
type Block = { blockType: string; content?: unknown; [field: string]: unknown }

export type RestoreStatus = 'restored' | 'inserted' | 'present' | 'notFound'

/** Por qué no se pudo devolver un párrafo de cierre. */
export type NotFoundReason =
  'sin el párrafo recortado' | 'sin paso detrás del que ponerlo' | 'párrafo vacío'

export interface RestoreResult {
  status: RestoreStatus
  reason?: NotFoundReason
  body: Block[]
  /** El bloque donde quedó el párrafo, para poner el siguiente cierre detrás. */
  at?: number
}

function plain(node: LexicalNode): string {
  if (node.type === 'text') return node.text ?? ''
  return (node.children ?? []).map(plain).join('')
}

/** Para comparar textos: NFC y espacios colapsados. */
function comparable(value: string): string {
  return value.normalize('NFC').replace(/\s+/gu, ' ').trim()
}

function rootOf(block: Block): (LexicalNode & { children: LexicalNode[] }) | null {
  const root = (block.content as { root?: LexicalNode } | undefined)?.root
  return root ? { ...root, children: root.children ?? [] } : null
}

/**
 * Pone el párrafo de cierre entero (`paragraph`, ya en Lexical) en el final de la guía, a
 * partir del bloque que sigue al último paso (sin pasos, en todo el cuerpo): cambia el
 * párrafo recortado, el que dice lo mismo sin la primera frase, por el entero. Si el párrafo
 * era solo la frase, lo añade como texto propio detrás del último paso, o detrás de `after`
 * (el cierre anterior), para que varios queden en su orden. Ya está si el final tiene ese
 * párrafo entero: dos cierres que empiezan por la misma frase no se tapan. Si no aparece el
 * párrafo recortado (Torre lo cambió), no toca nada y dice por qué.
 */
export function restoreClosing(
  body: Block[],
  closing: { sentence: string; paragraph: LexicalNode },
  after?: number,
): RestoreResult {
  const lastStep = body.map((block) => block.blockType).lastIndexOf('step')
  const sentence = comparable(closing.sentence)
  const full = comparable(plain(closing.paragraph))
  const rest = comparable(full.slice(sentence.length))
  const texts = body
    .map((block, index) => ({ block, index }))
    .filter(({ block, index }) => index > lastStep && block.blockType === 'richText')

  for (const { block, index } of texts) {
    const paragraphs = rootOf(block)?.children ?? []
    if (paragraphs.some((node) => comparable(plain(node)) === full)) {
      return { status: 'present', body, at: index }
    }
  }
  if (!rest) {
    const anchor = after ?? lastStep
    if (anchor === -1)
      return { status: 'notFound', reason: 'sin paso detrás del que ponerlo', body }
    const inserted: Block = {
      blockType: 'richText',
      content: { root: { type: 'root', version: 1, children: [closing.paragraph] } },
    }
    return {
      status: 'inserted',
      body: [...body.slice(0, anchor + 1), inserted, ...body.slice(anchor + 1)],
      at: anchor + 1,
    }
  }
  for (const { block, index } of texts) {
    const root = rootOf(block)!
    const at = root.children.findIndex((node) => comparable(plain(node)) === rest)
    if (at === -1) continue
    const children = root.children.map((node, i) => (i === at ? closing.paragraph : node))
    const content = { ...(block.content as object), root: { ...root, children } }
    return {
      status: 'restored',
      body: body.map((candidate, i) => (i === index ? { ...block, content } : candidate)),
      at: index,
    }
  }
  return { status: 'notFound', reason: 'sin el párrafo recortado', body }
}

/**
 * Todos los cierres de una página, uno tras otro (Torre a veces deja dos): cada uno se busca
 * por su párrafo entero y los que se añaden van detrás del anterior.
 */
export function restoreAll(
  body: Block[],
  closings: { sentence: string; paragraph: LexicalNode | undefined }[],
): {
  body: Block[]
  statuses: { status: RestoreStatus; reason?: NotFoundReason }[]
  changed: boolean
} {
  let current = body
  let after: number | undefined
  let changed = false
  const statuses = closings.map(({ sentence, paragraph }) => {
    if (!paragraph) return { status: 'notFound' as const, reason: 'párrafo vacío' as const }
    const result = restoreClosing(current, { sentence, paragraph }, after)
    if (result.at !== undefined) after = result.at
    if (result.status === 'restored' || result.status === 'inserted') {
      current = result.body
      changed = true
    }
    return result.reason
      ? { status: result.status, reason: result.reason }
      : { status: result.status }
  })
  return { body: current, statuses, changed }
}

export interface RestoreClosingsOptions {
  /** La carpeta del inventario de la migración (raw/pages/<slug>.html). */
  dir: string
  apply: boolean
  slugs?: string[]
  log?: (message: string) => void
}

/** Las guías leídas y cambiadas, y los párrafos de cierre por cómo quedaron. */
export interface RestoreClosingsResult {
  guides: number
  noSource: number
  noClosing: number
  /** Guías con algún párrafo devuelto (en seco, las que lo tendrían). */
  changed: number
  published: number
  drafts: number
  paragraphs: {
    present: number
    restored: number
    inserted: number
    notFound: Partial<Record<NotFoundReason, number>>
  }
}

/**
 * Recorre las guías por su última versión y devuelve la frase de cierre a las que su página
 * de Squarespace la tiene. Como los combates: lo último publicado se guarda
 * publicado y un borrador se guarda como borrador. Repetirlo no cambia nada.
 */
export async function restoreClosings(
  payload: Payload,
  options: RestoreClosingsOptions,
): Promise<RestoreClosingsResult> {
  const log = options.log ?? (() => {})
  const toLexical = await createHtmlToLexical(payload.config)
  const result: RestoreClosingsResult = {
    guides: 0,
    noSource: 0,
    noClosing: 0,
    changed: 0,
    published: 0,
    drafts: 0,
    paragraphs: { present: 0, restored: 0, inserted: 0, notFound: {} },
  }
  const ids = await payload.find({
    collection: 'quest-guides',
    pagination: false,
    depth: 0,
    draft: true,
    select: { slug: true },
    ...(options.slugs && { where: { slug: { in: options.slugs } } }),
    overrideAccess: true,
  })

  for (const { id, slug } of ids.docs) {
    result.guides += 1
    let html: string
    try {
      html = await readFile(path.join(options.dir, 'raw', 'pages', `${slug}.html`), 'utf8')
    } catch {
      result.noSource += 1
      continue
    }
    const closings = closingParagraphs(parsePage(html))
    if (closings.length === 0) {
      result.noClosing += 1
      await releaseDom()
      continue
    }
    const paragraphs = closings.map(
      (closing) => (toLexical(closing.html) as unknown as { root: LexicalNode }).root.children?.[0],
    )
    await releaseDom()
    const guide: QuestGuide = await payload.findByID({
      collection: 'quest-guides',
      id,
      depth: 0,
      draft: true,
      overrideAccess: true,
    })
    // Cada párrafo de cierre, uno tras otro: Torre a veces deja dos (Leyenda del otoño).
    const restored = restoreAll(
      (guide.body ?? []) as Block[],
      closings.map((closing, index) => ({
        sentence: closing.sentence,
        paragraph: paragraphs[index],
      })),
    )
    for (const { status, reason } of restored.statuses) {
      if (status !== 'notFound') result.paragraphs[status] += 1
      else {
        const counts = result.paragraphs.notFound
        counts[reason!] = (counts[reason!] ?? 0) + 1
        log(`Guía ${slug}: párrafo de cierre ${reason}`)
      }
    }
    if (!restored.changed) continue
    result.changed += 1
    const body = restored.body
    if (!options.apply) {
      log(`Guía ${slug}: cierre por restaurar`)
      continue
    }
    const published = guide._status === 'published'
    await payload.update({
      collection: 'quest-guides',
      id,
      data: {
        body: body as QuestGuide['body'],
        _status: published ? 'published' : 'draft',
      },
      draft: !published,
      depth: 0,
      overrideAccess: true,
    })
    if (published) result.published += 1
    else result.drafts += 1
    log(`Guía ${slug}: cierre restaurado${published ? '' : ' (borrador)'}`)
  }
  return result
}
