// Lleva a la colección pages las páginas sueltas de Torre (convert.ts): crea las que faltan,
// las de su catálogo en su estado (las legales En preparación, con su enlace a Squarespace),
// y al repetirse solo cambia un campo que sigue como lo dejó la última importación
// (importSnapshot, como en las guías de Dofus). Lo que Torre cambió en el panel, y su
// «Visible en la web», no se tocan nunca. Una página con un borrador suyo a medias tampoco.
import { ValidationError, type Payload } from 'payload'

import { ROOT_SLUG_COLLECTIONS, type RootSlugCollection } from '@/collections/root-slug'
import { isLegacySource } from '@/lib/redirects/table'
import { legacyHref } from '@/lib/site/legacy'

import { comparable } from '../dofus-guides/load'
import { ImageDownloadError } from '../media-by-url'
import type { LexicalState } from '../rich-text'
import type { PageEntry } from './catalog'
import type { ConvertedPage, PagePiece } from './convert'

const FIELDS = ['title', 'body', 'seo', 'legacyHref', 'parent'] as const
type Field = (typeof FIELDS)[number]
type Values = Partial<Record<Field, unknown>>

export interface LoadSitePagesOptions {
  /** Cada página del catálogo con lo leído de Squarespace; null si allí no está. */
  pages: { entry: PageEntry; page: ConvertedPage | null }[]
  /** Sin él solo cuenta lo que haría: no escribe ni sube nada. */
  apply: boolean
  htmlToLexical: (html: string) => LexicalState
  /**
   * El archivo de Media de una captura de Squarespace; con upload, subiéndolo si falta. Sin
   * upload solo lo busca: null si no está. Una descarga fallida es ImageDownloadError.
   */
  mediaFor: (url: string, alt: string, options: { upload: boolean }) => Promise<number | null>
  log?: (message: string) => void
}

export interface LoadSitePagesReport {
  created: string[]
  updated: string[]
  unchanged: string[]
  /** Campos que Torre cambió en el panel y la importación respetó. */
  kept: { slug: string; field: Field }[]
  /** Páginas con un borrador de Torre a medias: no se tocan. */
  drafts: string[]
  /** Páginas del catálogo que no están en Squarespace. */
  missing: string[]
  /** Páginas cuya dirección ya usa otra colección del sitio (una guía, un logro): no se crean. */
  taken: string[]
  /** Capturas en lo leído. */
  images: number
  oddities: { slug: string; message: string }[]
}

type Block = Record<string, unknown>
type StoredPage = Record<string, unknown> & { id: number; slug: string; _status?: string | null }

export const same = (a: unknown, b: unknown) =>
  JSON.stringify(comparable(a) ?? null) === JSON.stringify(comparable(b) ?? null)

/** Vacío: nada guardado, o un valor sin nada dentro. */
export const isEmpty = (value: unknown) => {
  const plain = comparable(value)
  return (
    plain === undefined ||
    plain === null ||
    plain === '' ||
    (Array.isArray(plain) && plain.length === 0) ||
    (typeof plain === 'object' && Object.keys(plain as object).length === 0)
  )
}

/**
 * El cuerpo como bloques de la colección: cada trozo de HTML de Torre en un bloque de texto,
 * cada captura en un bloque de imagen y cada vídeo en un bloque de vídeo. Sin upload, lo que
 * aún no está en Media va con el ID 0: sirve para comparar y nunca se escribe. Una captura que
 * no se pudo traer se anota y se queda fuera.
 */
export async function buildBody(
  pieces: PagePiece[],
  name: string,
  upload: boolean,
  oddities: string[],
  options: Pick<LoadSitePagesOptions, 'htmlToLexical' | 'mediaFor'>,
): Promise<Block[]> {
  const body: Block[] = []
  for (const piece of pieces) {
    if (piece.type === 'html') {
      body.push({ blockType: 'richText', content: options.htmlToLexical(piece.html) })
    } else if (piece.type === 'video') {
      body.push({ blockType: 'video', url: piece.url, ...(piece.title && { title: piece.title }) })
    } else {
      try {
        const id = await options.mediaFor(piece.url, piece.alt || name, { upload })
        if (id === null && upload) continue
        body.push({ blockType: 'image', image: id ?? 0 })
      } catch (error) {
        // Solo una descarga fallida se anota y se sigue; un error de la base para todo.
        if (!(error instanceof ImageDownloadError)) throw error
        oddities.push(`Captura sin importar: ${piece.url} (${error.message})`)
      }
    }
  }
  return body
}

export async function loadSitePages(
  payload: Payload,
  options: LoadSitePagesOptions,
): Promise<LoadSitePagesReport> {
  const { apply, log = () => {} } = options
  const report: LoadSitePagesReport = {
    created: [],
    updated: [],
    unchanged: [],
    kept: [],
    drafts: [],
    missing: [],
    taken: [],
    images: 0,
    oddities: [],
  }

  /** La última versión de la página del slug: si Torre tiene un borrador, ese. */
  const stored = async (slug: string) =>
    (
      await payload.find({
        collection: 'pages',
        where: { slug: { equals: slug } },
        depth: 0,
        draft: true,
        limit: 1,
        pagination: false,
        overrideAccess: true,
      })
    ).docs[0] as unknown as StoredPage | undefined

  for (const { entry, page } of options.pages) {
    if (!page) {
      report.missing.push(entry.slug)
      continue
    }
    report.images += page.pieces.filter((piece) => piece.type === 'image').length
    const oddities = [...page.oddities]
    const current = await stored(entry.slug)
    if (current?._status === 'draft') {
      report.drafts.push(entry.slug)
      log(`${entry.slug}: tiene un borrador sin publicar, no se toca`)
      continue
    }

    const parent = entry.parent ? ((await stored(entry.parent))?.id ?? null) : null
    if (entry.parent && parent === null && apply) {
      oddities.push(`Sin su página superior ${entry.parent}: las migas van a la portada`)
    }
    // Primero se decide con lo que ya está en Media; se sube solo lo que se va a escribir.
    const values = async (upload: boolean, notes: string[]): Promise<Values> => ({
      title: page.title,
      body: await buildBody(page.pieces, page.title, upload, notes, options),
      seo: page.seo,
      legacyHref: entry.state === 'preparing' ? legacyHref(entry.slug) : null,
      parent,
    })

    if (!current && (await takenElsewhere(payload, entry.slug))) {
      report.taken.push(entry.slug)
      log(`${entry.slug}: su dirección ya es de otra página del sitio, no se crea`)
      continue
    }
    if (!current) {
      const notes: string[] = []
      const data = await values(apply, notes)
      oddities.push(...notes)
      if (apply) {
        try {
          await payload.create({
            collection: 'pages',
            data: {
              ...data,
              slug: entry.slug,
              state: entry.state,
              importSnapshot: snapshotOf(data),
              _status: 'published',
            } as never,
            depth: 0,
            overrideAccess: true,
          })
        } catch (error) {
          // La dirección ya es de otra página del sitio (rejectSharedSlug): esa ya tiene casa.
          if (!(error instanceof ValidationError) || !slugRejected(error)) throw error
          report.taken.push(entry.slug)
          log(`${entry.slug}: su dirección ya es de otra página del sitio, no se crea`)
          continue
        }
      }
      report.created.push(entry.slug)
      log(`${entry.slug}: ${apply ? 'creada' : 'se crearía'} (${entry.state})`)
      for (const message of oddities) report.oddities.push({ slug: entry.slug, message })
      continue
    }

    const snapshot = (current.importSnapshot ?? {}) as Values
    const probe = await values(false, [])
    const changes: Field[] = []
    const nextSnapshot: Values = { ...snapshot }
    for (const field of FIELDS) {
      const value = current[field]
      const edited = field in snapshot ? !same(value, snapshot[field]) : !isEmpty(value)
      if (same(value, probe[field])) {
        nextSnapshot[field] = comparable(probe[field]) ?? null
      } else if (edited) {
        report.kept.push({ slug: entry.slug, field })
      } else {
        changes.push(field)
      }
    }
    if (changes.length === 0) {
      report.unchanged.push(entry.slug)
      for (const message of oddities) report.oddities.push({ slug: entry.slug, message })
      continue
    }
    const notes: string[] = []
    const data = changes.includes('body') && apply ? await values(true, notes) : probe
    oddities.push(...notes)
    const update = Object.fromEntries(changes.map((field) => [field, data[field]]))
    for (const field of changes) nextSnapshot[field] = comparable(data[field]) ?? null
    if (apply) {
      await payload.update({
        collection: 'pages',
        id: current.id,
        data: { ...update, importSnapshot: nextSnapshot, _status: 'published' } as never,
        depth: 0,
        overrideAccess: true,
      })
    }
    report.updated.push(entry.slug)
    log(`${entry.slug}: ${apply ? 'actualizada' : 'se actualizaría'} (${changes.join(', ')})`)
    for (const message of oddities) report.oddities.push({ slug: entry.slug, message })
  }
  return report
}

/** Lo importado campo a campo, vacíos incluidos: un campo vacío también es un valor de partida. */
const snapshotOf = (data: Values): Values =>
  Object.fromEntries(FIELDS.map((field) => [field, comparable(data[field]) ?? null]))

/** Si Payload rechazó el slug (lo usa otra colección o la tabla de redirecciones). */
export const slugRejected = (error: ValidationError) =>
  (error.data?.errors ?? []).some((problem) => problem.path === 'slug')

/** Si otra colección de la raíz, publicada o en borrador, o la tabla de redirecciones usa el slug. */
export async function takenElsewhere(
  payload: Payload,
  slug: string,
  self: RootSlugCollection = 'pages',
): Promise<boolean> {
  if (isLegacySource(slug)) return true
  for (const collection of ROOT_SLUG_COLLECTIONS.filter((other) => other !== self)) {
    const { docs } = await payload.find({
      collection,
      where: { slug: { equals: slug } },
      draft: true,
      limit: 1,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    if (docs.length > 0) return true
  }
  return false
}
