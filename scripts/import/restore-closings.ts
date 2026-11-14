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
 * era solo la frase, lo añade como texto propio detrás del último paso. Si el final ya
 * empieza por la frase, o no aparece el párrafo recortado (Torre lo cambió), no toca nada.
 */
export function restoreClosing(
  body: Block[],
  closing: { sentence: string; paragraph: LexicalNode },
): { status: RestoreStatus; body: Block[] } {
  const lastStep = body.map((block) => block.blockType).lastIndexOf('step')
  const sentence = comparable(closing.sentence)
  const full = comparable(plain(closing.paragraph))
  const rest = comparable(full.slice(sentence.length))
  const texts = body
    .map((block, index) => ({ block, index }))
    .filter(({ block, index }) => index > lastStep && block.blockType === 'richText')

  for (const { block } of texts) {
    const paragraphs = rootOf(block)?.children ?? []
    if (paragraphs.some((node) => comparable(plain(node)).startsWith(sentence))) {
      return { status: 'present', body }
    }
  }
  if (!rest) {
    if (lastStep === -1) return { status: 'notFound', body }
    const inserted: Block = {
      blockType: 'richText',
      content: { root: { type: 'root', version: 1, children: [closing.paragraph] } },
    }
    return {
      status: 'inserted',
      body: [...body.slice(0, lastStep + 1), inserted, ...body.slice(lastStep + 1)],
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
    }
  }
  return { status: 'notFound', body }
}

export interface RestoreClosingsOptions {
  /** La carpeta del inventario de la migración (raw/pages/<slug>.html). */
  dir: string
  apply: boolean
  slugs?: string[]
  log?: (message: string) => void
}

export type RestoreClosingsResult = Record<
  RestoreStatus | 'guides' | 'noSource' | 'noClosing' | 'published' | 'drafts',
  number
>

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
    present: 0,
    restored: 0,
    inserted: 0,
    notFound: 0,
    published: 0,
    drafts: 0,
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
    let body = (guide.body ?? []) as Block[]
    let changed = false
    closings.forEach((closing, index) => {
      const paragraph = paragraphs[index]
      if (!paragraph) {
        result.notFound += 1
        return
      }
      const restored = restoreClosing(body, { sentence: closing.sentence, paragraph })
      result[restored.status] += 1
      if (restored.status === 'notFound') log(`Guía ${slug}: no aparece el párrafo de cierre`)
      if (restored.status === 'restored' || restored.status === 'inserted') {
        body = restored.body
        changed = true
      }
    })
    if (!changed) continue
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
