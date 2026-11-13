// Lleva a la entrada y el cierre de las páginas de logro la prosa de Torre en Squarespace
// (prose.ts), con sus capturas y sus vídeos. Las páginas ya existen (pnpm data:quests y
// pnpm import:achievements): solo cambia esos dos campos. Lo que escribió cada vez se guarda
// en importSnapshot, como en las guías de Dofus: un campo que ya no coincide con él, o que
// Torre llenó antes de la primera importación, lo cambió Torre en el panel y se queda como
// está. Una segunda pasada no cambia nada.
import { randomBytes } from 'node:crypto'
import type { Payload } from 'payload'

import { youtubeId } from '@/lib/guides/video'

import { comparable } from '../dofus-guides/load'
import { ImageDownloadError } from '../media-by-url'
import type { LexicalState } from '../rich-text'
import type { AchievementProse, ProseItem } from './prose'

const FIELDS = ['intro', 'outro'] as const
type Field = (typeof FIELDS)[number]
type Imported = Partial<Record<Field, unknown>>

export interface LoadProseOptions {
  /** La prosa leída de cada página cacheada de Squarespace, por su slug. */
  pages: Map<string, AchievementProse>
  /** Sin él solo cuenta lo que haría. */
  apply: boolean
  htmlToLexical: (html: string) => LexicalState
  /**
   * El archivo de Media de una captura de Squarespace; con upload, subiéndolo si falta. Sin
   * upload solo lo busca: null si no está. Una descarga fallida es ImageDownloadError.
   */
  mediaFor: (url: string, alt: string, options: { upload: boolean }) => Promise<number | null>
  /** La portada de un vídeo de YouTube como archivo de Media, igual que mediaFor. */
  posterFor: (videoId: string, options: { upload: boolean }) => Promise<number | null>
  /** Solo las páginas cuyo slug pasa el filtro (las pruebas); sin él, todas. */
  only?: (slug: string) => boolean
  log?: (message: string) => void
}

export interface LoadProseReport {
  updated: number
  unchanged: number
  /** Campos que Torre cambió en el panel y la importación respetó. */
  kept: { slug: string; field: Field }[]
  /** Páginas con prosa en Squarespace. */
  withProse: string[]
  /** Páginas cuya página de Squarespace no tiene prosa: solo las listas. */
  withoutProse: string[]
  /** Páginas de logro sin página cacheada de Squarespace con su slug. */
  missing: string[]
  /** Vídeos y capturas en la prosa leída. */
  videos: number
  images: number
  /** Lo que no se pudo traer (una captura o una portada que no se descargó). */
  oddities: { slug: string; message: string }[]
}

type Node = Record<string, unknown>

/** Un ID como los que pone Payload a los nodos de Lexical; no cuenta al comparar. */
const nodeId = () => randomBytes(12).toString('hex')

const same = (a: unknown, b: unknown) =>
  JSON.stringify(comparable(a) ?? null) === JSON.stringify(comparable(b) ?? null)

/** Vacío: nada guardado, o un texto sin letras, capturas ni vídeos (Torre lo borró todo). */
function isEmpty(value: unknown): boolean {
  if (!value) return true
  const text = JSON.stringify(value)
  return !/"text":"[^"]*\S/.test(text) && !/"type":"(upload|block)"/.test(text)
}

/** Cómo se construye un campo: subiendo lo que falte, o solo con lo que ya está en Media. */
interface Build {
  name: string
  upload: boolean
  /** «(1 de 2)» de cada vídeo de la página, contando la entrada y el cierre juntos. */
  places: Map<ProseItem, string>
  oddities: string[]
}

/** Un archivo de Media, o null si no se pudo descargar (queda anotado). */
async function fetched(
  load: () => Promise<number | null>,
  oddity: (message: string) => string,
  build: Build,
) {
  try {
    return await load()
  } catch (error) {
    // Solo una descarga fallida se anota y se sigue; un error de la base para todo.
    if (!(error instanceof ImageDownloadError)) throw error
    build.oddities.push(oddity(error.message))
    return null
  }
}

/**
 * La prosa como texto enriquecido de Lexical: cada trozo de HTML de Torre tal cual, cada
 * captura como imagen subida y cada vídeo como bloque proseVideo con su portada. Una captura
 * que no se pudo traer se queda fuera y el texto sigue. Sin upload, lo que aún no está en
 * Media va con el ID 0: sirve para comparar, y nunca se escribe. Null si no hay nada.
 */
async function toLexical(
  items: ProseItem[],
  build: Build,
  options: Pick<LoadProseOptions, 'htmlToLexical' | 'mediaFor' | 'posterFor'>,
): Promise<LexicalState | null> {
  if (items.length === 0) return null
  const { upload } = build
  const children: Node[] = []
  for (const item of items) {
    if (item.type === 'html') {
      const state = options.htmlToLexical(item.html) as unknown as { root: { children: Node[] } }
      children.push(...state.root.children)
    } else if (item.type === 'image') {
      const value = await fetched(
        () => options.mediaFor(item.url, item.alt || build.name, { upload }),
        (message) => `Captura sin importar: ${item.url} (${message})`,
        build,
      )
      if (value === null && upload) continue
      children.push({
        type: 'upload',
        version: 3,
        format: '',
        id: nodeId(),
        fields: null,
        relationTo: 'media',
        value: value ?? 0,
      })
    } else {
      const videoId = youtubeId(item.url)!
      const poster = await fetched(
        () => options.posterFor(videoId, { upload }),
        (message) => `Portada del vídeo ${videoId} sin importar (${message})`,
        build,
      )
      children.push({
        type: 'block',
        version: 2,
        format: '',
        fields: {
          id: nodeId(),
          blockName: '',
          blockType: 'proseVideo',
          url: item.url,
          // El de YouTube si Squarespace lo trae; si no, el del logro, único en la página.
          title: item.title ?? `Vídeo guía de ${build.name}${build.places.get(item) ?? ''}`,
          ...(poster !== null && { poster }),
        },
      })
    }
  }
  return {
    root: { type: 'root', format: '', indent: 0, version: 1, direction: null, children },
  } as unknown as LexicalState
}

/** El lugar de cada vídeo sin título entre todos los de la página: «(2 de 3)». */
function videoPlaces(items: ProseItem[]): Map<ProseItem, string> {
  const videos = items.filter((item) => item.type === 'video')
  if (videos.length < 2) return new Map()
  return new Map(videos.map((video, index) => [video, ` (${index + 1} de ${videos.length})`]))
}

export async function loadAchievementProse(
  payload: Payload,
  options: LoadProseOptions,
): Promise<LoadProseReport> {
  const { pages, apply, only = () => true, log = () => {} } = options
  const report: LoadProseReport = {
    updated: 0,
    unchanged: 0,
    kept: [],
    withProse: [],
    withoutProse: [],
    missing: [],
    videos: 0,
    images: 0,
    oddities: [],
  }
  // El último borrador: si Torre tiene uno a medias, la importación lo compara con él.
  const { docs } = await payload.find({
    collection: 'achievement-pages',
    select: {
      name: true,
      slug: true,
      intro: true,
      outro: true,
      importSnapshot: true,
      _status: true,
    },
    sort: 'slug',
    depth: 0,
    draft: true,
    pagination: false,
    overrideAccess: true,
  })

  for (const current of docs.filter((doc) => only(doc.slug))) {
    const prose = pages.get(current.slug)
    if (!prose) {
      report.missing.push(current.slug)
      continue
    }
    const all = [...prose.intro, ...prose.outro]
    if (all.length === 0) report.withoutProse.push(current.slug)
    else report.withProse.push(current.slug)
    report.videos += all.filter((item) => item.type === 'video').length
    report.images += all.filter((item) => item.type === 'image').length

    // Primero se decide, después se sube: un campo que Torre cambió se compara solo con lo
    // que ya está en Media y no sube nada.
    const places = videoPlaces(all)
    const oddities: string[] = []
    const snapshot = (current.importSnapshot ?? {}) as Imported
    const changes: Imported = {}
    const nextSnapshot: Imported = { ...snapshot }
    for (const field of FIELDS) {
      const stored = current[field]
      const edited = field in snapshot ? !same(stored, snapshot[field]) : !isEmpty(stored)
      // Un campo cambia solo si está vacío o sigue como lo dejó la última importación.
      const build: Build = { name: current.name, upload: apply && !edited, places, oddities }
      const data = await toLexical(prose[field], build, options)
      if (same(stored, data)) {
        nextSnapshot[field] = comparable(data) ?? null
        continue
      }
      if (edited) {
        report.kept.push({ slug: current.slug, field })
        continue
      }
      changes[field] = data
      nextSnapshot[field] = comparable(data) ?? null
    }
    for (const message of oddities) report.oddities.push({ slug: current.slug, message })
    if (Object.keys(changes).length === 0) {
      report.unchanged += 1
      continue
    }
    if (apply) {
      // Si Torre tiene un borrador a medias, el cambio va a su borrador y no se publica.
      const status = current._status === 'draft' ? 'draft' : 'published'
      await payload.update({
        collection: 'achievement-pages',
        id: current.id,
        data: { ...changes, importSnapshot: nextSnapshot, _status: status } as never,
        draft: status === 'draft',
        depth: 0,
        overrideAccess: true,
      })
    }
    report.updated += 1
    log(
      `${current.slug}: ${apply ? 'actualizada' : 'se actualizaría'} (${Object.keys(changes).join(', ')})`,
    )
  }
  return report
}
