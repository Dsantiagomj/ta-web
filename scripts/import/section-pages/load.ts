// Lleva a class-pages o dungeon-pages las páginas de Torre (convert.ts): crea las que faltan
// como borrador En preparación, con su enlace a Squarespace y su sitio en el menú del catálogo,
// y al repetirse solo cambia un campo que sigue como lo dejó la última importación
// (importSnapshot, como en las páginas sueltas). Lo que Torre cambió en el panel, su «Visible
// en la web» y su menú no se tocan nunca. Todo lo que escribe es un borrador: nada sale en la
// web hasta que Torre publica.
import { ValidationError, type Payload } from 'payload'

import { legacyHref } from '@/lib/site/legacy'

import { comparable } from '../dofus-guides/load'
import { ImageDownloadError } from '../media-by-url'
import type { ConvertedPage } from '../pages/convert'
import {
  buildBody,
  isEmpty,
  same,
  slugRejected,
  takenElsewhere,
  type LoadSitePagesOptions,
} from '../pages/load'
import type { SectionPageEntry } from './catalog'
import type { ClassBuild, ConvertedClassPage } from './convert'

type Collection = 'class-pages' | 'dungeon-pages'

const FIELDS = ['title', 'body', 'seo', 'legacyHref', 'pvmBuilds', 'pvpBuilds'] as const
type Field = (typeof FIELDS)[number]
type Values = Partial<Record<Field, unknown>>

export interface LoadSectionPagesOptions extends Pick<
  LoadSitePagesOptions,
  'apply' | 'htmlToLexical' | 'mediaFor' | 'log'
> {
  collection: Collection
  /** Cada página del catálogo con lo leído de Squarespace; null si allí no está. */
  pages: { entry: SectionPageEntry; page: ConvertedPage | ConvertedClassPage | null }[]
}

export interface LoadSectionPagesReport {
  created: string[]
  updated: string[]
  unchanged: string[]
  /** Campos que Torre cambió en el panel y la importación respetó. */
  kept: { slug: string; field: Field }[]
  /** Páginas del catálogo que no están en Squarespace. */
  missing: string[]
  /** Páginas cuya dirección ya usa otra colección del sitio: no se crean. */
  taken: string[]
  /** Imágenes en lo leído: capturas y builds. */
  images: number
  oddities: { slug: string; message: string }[]
}

type Stored = Record<string, unknown> & { id: number; slug: string }

const hasBuilds = (page: ConvertedPage | ConvertedClassPage): page is ConvertedClassPage =>
  'builds' in page

/**
 * Las builds como filas: su imagen en Media y su enlace. Sin upload, lo que aún no está en
 * Media va con el ID 0, que sirve para comparar y nunca se escribe. Una imagen que no se pudo
 * traer se anota y se queda fuera.
 */
async function buildRows(
  builds: ClassBuild[],
  name: string,
  upload: boolean,
  oddities: string[],
  mediaFor: LoadSectionPagesOptions['mediaFor'],
) {
  const rows: Record<string, unknown>[] = []
  for (const build of builds) {
    try {
      const id = await mediaFor(build.url, build.alt || name, { upload })
      if (id === null && upload) continue
      rows.push({ image: id ?? 0, ...(build.link && { link: build.link }) })
    } catch (error) {
      if (!(error instanceof ImageDownloadError)) throw error
      oddities.push(`Build sin importar: ${build.url} (${error.message})`)
    }
  }
  return rows
}

export async function loadSectionPages(
  payload: Payload,
  options: LoadSectionPagesOptions,
): Promise<LoadSectionPagesReport> {
  const { apply, collection, log = () => {} } = options
  const fields: readonly Field[] =
    collection === 'class-pages' ? FIELDS : FIELDS.filter((field) => !field.endsWith('Builds'))
  const report: LoadSectionPagesReport = {
    created: [],
    updated: [],
    unchanged: [],
    kept: [],
    missing: [],
    taken: [],
    images: 0,
    oddities: [],
  }

  for (const { entry, page } of options.pages) {
    if (!page) {
      report.missing.push(entry.slug)
      continue
    }
    const builds = hasBuilds(page) ? page.builds : { pvm: [], pvp: [] }
    report.images +=
      page.pieces.filter((piece) => piece.type === 'image').length +
      builds.pvm.length +
      builds.pvp.length
    const oddities = [...page.oddities]
    const flush = () => {
      for (const message of oddities) report.oddities.push({ slug: entry.slug, message })
    }

    // Primero se decide con lo que ya está en Media; se sube solo lo que se va a escribir.
    const values = async (upload: boolean, notes: string[]): Promise<Values> => {
      const all: Values = {
        title: page.title,
        body: await buildBody(page.pieces, page.title, upload, notes, options),
        seo: page.seo,
        legacyHref: legacyHref(entry.slug),
        pvmBuilds: await buildRows(builds.pvm, page.title, upload, notes, options.mediaFor),
        pvpBuilds: await buildRows(builds.pvp, page.title, upload, notes, options.mediaFor),
      }
      return Object.fromEntries(fields.map((field) => [field, all[field]]))
    }

    const current = (
      await payload.find({
        collection,
        where: { slug: { equals: entry.slug } },
        depth: 0,
        draft: true,
        limit: 1,
        pagination: false,
        overrideAccess: true,
      })
    ).docs[0] as unknown as Stored | undefined

    if (!current && (await takenElsewhere(payload, entry.slug, collection))) {
      report.taken.push(entry.slug)
      log(`${entry.slug}: su dirección ya es de otra página del sitio, no se crea`)
      continue
    }
    if (!current) {
      const notes: string[] = []
      const data = await values(apply, notes)
      oddities.push(...notes)
      if (apply) {
        const snapshot = Object.fromEntries(
          fields.map((field) => [field, comparable(data[field]) ?? null]),
        )
        try {
          await payload.create({
            collection,
            data: {
              ...data,
              slug: entry.slug,
              state: 'preparing',
              inMenu: entry.inMenu,
              importSnapshot: snapshot,
              _status: 'draft',
            } as never,
            draft: true,
            depth: 0,
            overrideAccess: true,
          })
        } catch (error) {
          if (!(error instanceof ValidationError) || !slugRejected(error)) throw error
          report.taken.push(entry.slug)
          log(`${entry.slug}: su dirección ya es de otra página del sitio, no se crea`)
          continue
        }
      }
      report.created.push(entry.slug)
      log(`${entry.slug}: ${apply ? 'creada' : 'se crearía'} como borrador En preparación`)
      flush()
      continue
    }

    const snapshot = (current.importSnapshot ?? {}) as Values
    const probe = await values(false, [])
    const changes: Field[] = []
    const nextSnapshot: Values = { ...snapshot }
    for (const field of fields) {
      const value = current[field]
      const edited = field in snapshot ? !same(value, snapshot[field]) : !isEmpty(value)
      if (same(value, probe[field])) nextSnapshot[field] = comparable(probe[field]) ?? null
      else if (edited) report.kept.push({ slug: entry.slug, field })
      else changes.push(field)
    }
    if (changes.length === 0) {
      report.unchanged.push(entry.slug)
      flush()
      continue
    }
    const notes: string[] = []
    const uploads = changes.some((field) => field === 'body' || field.endsWith('Builds'))
    const data = uploads && apply ? await values(true, notes) : probe
    oddities.push(...notes)
    for (const field of changes) nextSnapshot[field] = comparable(data[field]) ?? null
    if (apply) {
      await payload.update({
        collection,
        id: current.id,
        data: {
          ...Object.fromEntries(changes.map((field) => [field, data[field]])),
          importSnapshot: nextSnapshot,
          _status: 'draft',
        } as never,
        draft: true,
        depth: 0,
        overrideAccess: true,
      })
    }
    report.updated.push(entry.slug)
    log(`${entry.slug}: ${apply ? 'actualizada' : 'se actualizaría'} (${changes.join(', ')})`)
    flush()
  }
  return report
}
