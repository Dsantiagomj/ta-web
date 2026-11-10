// Lleva a la colección dofus-guides las guías de Dofus de Torre: crea las que faltan y, al
// repetir, cambia solo los campos que Torre no ha tocado desde la última importación. Lo
// que escribió cada vez se guarda en importSnapshot: un campo que ya no coincide con él lo
// cambió Torre en el panel, y se queda como está.
import type { Payload } from 'payload'

import type { DofusGuide } from '@/payload-types'

import type { LexicalState } from '../rich-text'
import type { DofusCatalogEntry } from './catalog'
import type { BodyItem, DofusGuideSource, NeedRow, Part, QuestRef, Segment } from './parse'

const SITE = 'https://www.torrentearcano.com'

export interface DofusGuideInput {
  entry: DofusCatalogEntry
  /** Lo leído de su página, o null si no tiene contenido (queda En preparación). */
  source: DofusGuideSource | null
}

export interface LoadDofusGuidesOptions {
  guides: DofusGuideInput[]
  /** Sin él solo cuenta y avisa de lo que haría. */
  apply: boolean
  htmlToLexical: (html: string) => LexicalState
  /** El ID en Payload del objeto de DofusDB, importándolo con su icono si falta; null si no existe. */
  ensureItem: (dofusId: number) => Promise<number | null>
  /** El ID del objeto que se llama así, buscándolo en DofusDB si no está; null si no hay ninguno. */
  findItem: (name: string) => Promise<number | null>
  /** El archivo de Media de una captura de Squarespace, subiéndolo si falta. */
  mediaFor: (url: string, alt: string) => Promise<number>
  /** La portada de un vídeo de YouTube como archivo de Media; null si no se pudo traer. */
  posterFor: (videoId: string) => Promise<number | null>
  log?: (message: string) => void
}

export interface LoadDofusGuidesReport {
  created: number
  updated: number
  unchanged: number
  /** Campos que Torre cambió en el panel y la importación respetó. */
  kept: { slug: string; field: string }[]
  unmatched: { slug: string; kind: 'logro' | 'misión' | 'objeto'; name: string }[]
  /** Logros cuya lista de misiones en la página de Torre no es la de su página de logro. */
  differences: { slug: string; achievement: string; torre: string[]; page: string[] }[]
}

/** Los campos que escribe la importación; el resto (el estado incluido al repetir) es de Torre. */
const IMPORTED_FIELDS = [
  'dofus',
  'name',
  'order',
  'state',
  'level',
  'tag',
  'color',
  'aliases',
  'prerequisites',
  'needs',
  'rewards',
  'intro',
  'parts',
  'body',
  'video',
  'videoPoster',
  'checklist',
  'originalUrl',
] as const

type ImportedField = (typeof IMPORTED_FIELDS)[number]
type Imported = Partial<Record<ImportedField, unknown>>

/**
 * El valor sin IDs de fila ni campos vacíos y con las claves en orden, para comparar lo
 * guardado con lo importado: Postgres guarda el texto enriquecido como jsonb, que reordena
 * las claves.
 */
export function comparable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(comparable)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key, item]) => key !== 'id' && item !== null && item !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, item]) => [key, comparable(item)]),
    )
  }
  return value
}

const same = (a: unknown, b: unknown) =>
  JSON.stringify(comparable(a) ?? null) === JSON.stringify(comparable(b) ?? null)

/** Lo importado campo a campo, vacíos incluidos: un campo vacío también es un valor de partida. */
const snapshotOf = (data: Imported): Imported =>
  Object.fromEntries(IMPORTED_FIELDS.map((field) => [field, comparable(data[field]) ?? null]))

/** Minúsculas, sin tildes ni puntuación: para casar los nombres de Torre con los del juego. */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim()
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Los trozos de Torre como HTML: los enlaces a su web quedan relativos (/slug). */
function segmentsHtml(segs: Segment[]): string {
  return segs
    .map((seg) => {
      const text = escapeHtml(seg.v)
      const html = seg.t === 'link' ? `<a href="${escapeHtml(seg.href)}">${text}</a>` : text
      return seg.b ? `<strong>${html}</strong>` : html
    })
    .join('')
}

export async function loadDofusGuides(
  payload: Payload,
  options: LoadDofusGuidesOptions,
): Promise<LoadDofusGuidesReport> {
  const log = options.log ?? (() => {})
  const report: LoadDofusGuidesReport = {
    created: 0,
    updated: 0,
    unchanged: 0,
    kept: [],
    unmatched: [],
    differences: [],
  }
  const lexical = (html: string) => (html ? options.htmlToLexical(html) : null)
  const list = (rows: Segment[][]) =>
    rows.length
      ? lexical(`<ul>${rows.map((segs) => `<li>${segmentsHtml(segs)}</li>`).join('')}</ul>`)
      : null
  const paragraphs = (rows: Segment[][]) =>
    rows.length ? lexical(rows.map((segs) => `<p>${segmentsHtml(segs)}</p>`).join('')) : null

  // Las guías de misión y las páginas de logro de la base, por slug y por nombre plegado.
  const guides = await payload.find({
    collection: 'quest-guides',
    limit: 0,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { slug: true, title: true },
  })
  const guideBySlug = new Map(guides.docs.map((doc) => [doc.slug, doc.id]))
  const guideByName = new Map(guides.docs.map((doc) => [fold(doc.title), doc.id]))
  const pages = await payload.find({
    collection: 'achievement-pages',
    limit: 0,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { slug: true, name: true, quests: true },
  })
  const pageBySlug = new Map(pages.docs.map((doc) => [doc.slug, doc]))
  const pageByName = new Map(pages.docs.map((doc) => [fold(doc.name), doc]))

  for (const { entry, source } of options.guides) {
    const unmatched = (kind: 'logro' | 'misión' | 'objeto', name: string) =>
      report.unmatched.push({ slug: entry.slug, kind, name })

    const findGuide = (ref: QuestRef): number | null => {
      for (const candidate of ref.alternatives ?? [ref]) {
        const id =
          (candidate.slug && guideBySlug.get(candidate.slug)) ||
          guideByName.get(fold(candidate.name))
        if (id) return id
      }
      unmatched('misión', ref.name)
      return null
    }

    const questRows = (refs: QuestRef[]) =>
      refs.flatMap((ref) => {
        const guide = findGuide(ref)
        return guide ? [{ guide, note: ref.note ?? null }] : []
      })

    const findAchievement = (part: Extract<Part, { type: 'achievement' }>) => {
      const page =
        (part.slug && pageBySlug.get(part.slug)) || pageByName.get(fold(part.name)) || null
      if (!page) {
        unmatched('logro', part.name)
        return null
      }
      const pageQuests = (page.quests ?? []).map((row) => row.name ?? '')
      const torre = part.quests.map((quest) => quest.name)
      if (torre.map(fold).join('|') !== pageQuests.map(fold).join('|')) {
        report.differences.push({
          slug: entry.slug,
          achievement: part.name,
          torre,
          page: pageQuests,
        })
      }
      return page.id
    }

    const toBlocks = (part: Part): Record<string, unknown>[] => {
      switch (part.type) {
        case 'achievement': {
          const achievement = findAchievement(part)
          if (achievement) return [{ blockType: 'dofusAchievement', achievement, note: null }]
          // Sin página de logro, sus misiones no se pierden: van como lista con su nombre.
          return [{ blockType: 'dofusQuests', title: part.name, quests: questRows(part.quests) }]
        }
        case 'metalogro': {
          const achievements = part.achievements.flatMap((inner) =>
            inner.type === 'achievement'
              ? [findAchievement(inner)].flatMap((id) =>
                  id ? [{ achievement: id, note: null }] : [],
                )
              : [],
          )
          return [{ blockType: 'dofusMetalogro', name: part.name, achievements }]
        }
        case 'quests':
          return [{ blockType: 'dofusQuests', title: part.title, quests: questRows(part.quests) }]
        case 'quest': {
          const guide = findGuide(part.quest)
          return guide ? [{ blockType: 'dofusQuest', guide, note: part.quest.note ?? null }] : []
        }
        case 'note':
          return [{ blockType: 'dofusNote', text: lexical(`<p>${segmentsHtml(part.segs)}</p>`) }]
      }
    }

    const needRow = async (row: NeedRow): Promise<Record<string, unknown>> => {
      if (row.quantity !== undefined && row.name) {
        const item = await options.findItem(row.name)
        if (item) {
          return { blockType: 'needItem', item, quantity: row.quantity, note: row.note ?? null }
        }
        unmatched('objeto', row.name)
      }
      return { blockType: 'needNote', text: lexical(`<p>${segmentsHtml(row.segs)}</p>`) }
    }

    const needs = async (source: DofusGuideSource) => {
      if (!source.needs) return null
      const groups: { name: string | null; rows: Record<string, unknown>[] }[] = []
      if (source.needs.note) {
        groups.push({
          name: null,
          rows: [
            { blockType: 'needNote', text: lexical(`<p>(${escapeHtml(source.needs.note)})</p>`) },
          ],
        })
      }
      for (const group of source.needs.groups) {
        let current = { name: group.name, rows: [] as Record<string, unknown>[] }
        groups.push(current)
        for (const row of group.rows) {
          if (!row.children?.length) {
            current.rows.push(await needRow(row))
            continue
          }
          // «1 x Mazmorra:» con sus opciones debajo: un grupo propio con ese nombre.
          groups.push({
            name: row.text.replace(/[:.]\s*$/, ''),
            rows: await Promise.all(row.children.map(needRow)),
          })
          current = { name: null, rows: [] }
          groups.push(current)
        }
      }
      return {
        title: source.needs.title === 'Necesitarás' ? null : source.needs.title,
        groups: groups.filter((group) => group.rows.length > 0),
      }
    }

    const body = async (items: BodyItem[]) => {
      const blocks: Record<string, unknown>[] = []
      for (const item of items) {
        if (item.type === 'paragraph') {
          blocks.push({
            blockType: 'richText',
            content: lexical(`<p>${segmentsHtml(item.segs)}</p>`),
          })
        } else {
          blocks.push({
            blockType: 'image',
            image: await options.mediaFor(item.url, item.alt || entry.name),
          })
        }
      }
      return blocks
    }

    const checklist = source?.banner
      ? { name: `Checklist ${entry.name}`, url: `${SITE}${source.banner.href}` }
      : (entry.checklist ?? { name: null, url: null })

    const data: Imported = {
      dofus: await options.ensureItem(entry.dofusId),
      name: entry.name,
      order: options.guides.findIndex((guide) => guide.entry === entry) + 1,
      state: source ? 'published' : 'preparing',
      level: entry.level,
      tag: entry.tag,
      color: entry.color,
      aliases: entry.aliases ?? null,
      prerequisites: source ? list(source.prerequisites) : null,
      needs: (source && (await needs(source))) || { title: null, groups: [] },
      rewards: source?.rewards
        ? list(source.rewards.map((text) => [{ t: 'text', v: text }]))
        : null,
      intro: source ? paragraphs(source.intro) : null,
      parts: source ? source.parts.flatMap(toBlocks) : [],
      body: source ? await body(source.body) : [],
      video: source?.video ? `https://www.youtube.com/watch?v=${source.video}` : null,
      videoPoster: source?.video ? await options.posterFor(source.video) : null,
      checklist,
      originalUrl: entry.page ? `${SITE}/${entry.slug}` : null,
    }

    const existing = await payload.find({
      collection: 'dofus-guides',
      where: { slug: { equals: entry.slug } },
      limit: 1,
      depth: 0,
      draft: true,
      overrideAccess: true,
    })
    const current = existing.docs[0]

    if (!current) {
      if (options.apply) {
        await payload.create({
          collection: 'dofus-guides',
          data: {
            ...data,
            slug: entry.slug,
            importSnapshot: snapshotOf(data),
            _status: 'published',
          } as never,
          depth: 0,
          overrideAccess: true,
        })
      }
      report.created += 1
      log(`${entry.slug}: ${options.apply ? 'creada' : 'se crearía'} (${data.state})`)
      continue
    }

    // Un campo cambia solo si sigue como lo dejó la última importación.
    const snapshot = (current.importSnapshot ?? {}) as Imported
    const changes: Imported = {}
    const nextSnapshot: Imported = { ...snapshot }
    for (const field of IMPORTED_FIELDS) {
      const stored = (current as DofusGuide)[field as keyof DofusGuide]
      if (same(stored, data[field])) {
        nextSnapshot[field] = comparable(data[field]) ?? null
        continue
      }
      if (field in snapshot && !same(stored, snapshot[field])) {
        report.kept.push({ slug: entry.slug, field })
        continue
      }
      changes[field] = data[field]
      nextSnapshot[field] = comparable(data[field]) ?? null
    }
    if (Object.keys(changes).length === 0) {
      report.unchanged += 1
      continue
    }
    if (options.apply) {
      // Si Torre tiene un borrador a medias, el cambio va a su borrador y no se publica.
      const status = current._status === 'draft' ? 'draft' : 'published'
      await payload.update({
        collection: 'dofus-guides',
        id: current.id,
        data: { ...changes, importSnapshot: nextSnapshot, _status: status } as never,
        draft: status === 'draft',
        depth: 0,
        overrideAccess: true,
      })
    }
    report.updated += 1
    log(
      `${entry.slug}: ${options.apply ? 'actualizada' : 'se actualizaría'} (${Object.keys(changes).join(', ')})`,
    )
  }
  return report
}
