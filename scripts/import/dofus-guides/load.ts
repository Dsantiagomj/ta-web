// Lleva a la colección dofus-guides las guías de Dofus de Torre: crea las que faltan y, al
// repetir, cambia solo los campos que Torre no ha tocado desde la última importación. Lo
// que escribió cada vez se guarda en importSnapshot: un campo que ya no coincide con él lo
// cambió Torre en el panel, y se queda como está.
import type { Payload } from 'payload'

import type { DofusGuide } from '@/payload-types'

import type { LexicalState } from '../rich-text'
import type { DofusCatalogEntry } from './catalog'
import type { ItemMatch } from './game-items'
import { headingGroup, type NeedGroup } from '@/lib/dofus-guides/need-groups'

import { fold } from './fold'
import { siteHref } from './site-links'
import { needClassifiers, normalizeNeeds, type NeedEntry, type Placement } from './normalize-needs'
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
  /**
   * El objeto que se llama así, con cantidad o sin ella: en la base, si no en DofusDB y, si no
   * casa, en singular; null si no hay ninguno o hay duda (gameItems().matchItem).
   */
  findItem: (name: string) => Promise<ItemMatch | null>
  /** Los nombres de los oficios de DofusDB, para poner en «Oficios» las filas que los nombran. */
  jobs: string[]
  /**
   * Los logros de DofusDB que nombran las filas «Logro:», además de los de la base (que solo
   * tiene los de misiones y eventos).
   */
  achievements?: string[]
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
  /** Filas sin cantidad que pasan a ser un objeto (con cantidad 1), en las guías que cambian. */
  withoutQuantity: GainedItem[]
  /** Filas que casaron con un objeto en singular («8 x Bananaranjas»), en las guías que cambian. */
  singular: GainedItem[]
  /** Filas sin cantidad cuya búsqueda falló (DofusDB no respondió): se quedan como nota. */
  lookupFailures: { slug: string; text: string; error: string }[]
  /**
   * Las filas de Necesitarás que cambian de grupo al normalizar (o que estaban sueltas), con
   * el título de Torre del que vienen, en las guías que cambian. Las de «otros» no se pudieron
   * clasificar con certeza.
   */
  needGroups: (Placement & { slug: string })[]
  /** Cómo queda Necesitarás, grupo a grupo y con sus subtítulos, en las guías que cambian. */
  needsAfter: {
    slug: string
    groups: { name: NeedGroup; subtitle?: string; rows: string[] }[]
  }[]
  /** Subtítulos de Torre cuyas filas no iban todas al mismo grupo (van al de la mayoría). */
  mixedSubtitles: { slug: string; subtitle: string; groups: NeedGroup[] }[]
  /** Lo de una lista de misiones que no es una misión con guía y pasó a nota detrás. */
  leftovers: { slug: string; text: string }[]
}

/** Las búsquedas de objetos que se hacen a la vez, para no cargar DofusDB. */
const LOOKUP_CONCURRENCY = 4

/** Las filas de Necesitarás de una guía, con las que van debajo de otras. */
function allNeedRows(source: DofusGuideSource | null): NeedRow[] {
  const walk = (rows: NeedRow[]): NeedRow[] =>
    rows.flatMap((row) => [row, ...walk(row.children ?? [])])
  return walk((source?.needs?.groups ?? []).flatMap((group) => group.rows))
}

type Lookup = { match: ItemMatch | null } | { error: unknown }

/**
 * Busca todos los nombres una vez, como mucho LOOKUP_CONCURRENCY a la vez, antes de cargar
 * las guías. Un fallo se guarda: decide la fila que lo use.
 */
async function lookupAll(
  names: string[],
  find: (name: string) => Promise<ItemMatch | null>,
): Promise<Map<string, Lookup>> {
  const results = new Map<string, Lookup>()
  const queue = [...new Set(names)]
  const worker = async () => {
    for (let name = queue.shift(); name !== undefined; name = queue.shift()) {
      try {
        results.set(name, { match: await find(name) })
      } catch (error) {
        results.set(name, { error })
      }
    }
  }
  await Promise.all(Array.from({ length: LOOKUP_CONCURRENCY }, worker))
  return results
}

/** Una fila de Necesitarás y el objeto con el que casó. */
export interface GainedItem {
  slug: string
  text: string
  item: string
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
 * Los valores por defecto de campos añadidos después de importar: la migración se los da a
 * lo ya guardado, y no son un cambio de Torre (la casilla «Misiones de su página de logro»
 * marcada y una lista de misiones vacía).
 */
const ADDED_DEFAULTS: Record<string, (item: unknown) => boolean> = {
  pageQuests: (item) => item === true,
  ownQuests: (item) => Array.isArray(item) && item.length === 0,
}

/**
 * El valor sin IDs de fila, campos vacíos ni los valores por defecto de campos añadidos, y con
 * las claves en orden, para comparar lo guardado con lo importado: Postgres guarda el texto
 * enriquecido como jsonb, que reordena las claves.
 */
export function comparable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(comparable)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key, item]) => key !== 'id' && item !== null && item !== undefined)
        .filter(([key, item]) => !ADDED_DEFAULTS[key]?.(item))
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

export { fold } from './fold'

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * Los trozos de Torre como HTML. Los enlaces a su web quedan relativos (/slug) si este sitio
 * ya tiene esa página; si no, href los lleva a la de siempre (site-links.ts).
 */
function segmentsHtml(segs: Segment[], href: (link: string) => string): string {
  return segs
    .map((seg) => {
      const text = escapeHtml(seg.v)
      const html = seg.t === 'link' ? `<a href="${escapeHtml(href(seg.href))}">${text}</a>` : text
      return seg.b ? `<strong>${html}</strong>` : html
    })
    .join('')
}

/** El punto final de la lista de Torre no es parte del texto; unos puntos suspensivos sí. */
const unDot = (text: string) => text.replace(/(?<!\.)\.\s*$/u, '').trim()

/**
 * El texto de una fila de misiones de Torre, como lo escribió: hasta su último enlace (lo que
 * sigue es su nota) o, sin enlaces, toda la fila, sin su número de paso. «La fatalidad - El
 * destino - La rivalidad».
 */
export function rowTitle(ref: QuestRef): string {
  const segs = ref.segs ?? []
  const last = segs.map((seg) => seg.t).lastIndexOf('link')
  if (last < 0) return ref.name
  const text = segs
    .slice(0, last + 1)
    .map((seg) => seg.v)
    .join('')
  // «5) Hablar con el Dios Anutrof»: el número de paso de Torre no sale en la página.
  return unDot(text.replace(/\s+/g, ' ').trim()).replace(/^\d+\)\s*/u, '')
}

/** El enlace de una fila que no es una guía de misión («/cazadores-cazados»), o null. */
function linkOf(ref: QuestRef): string | null {
  const link = (ref.segs ?? []).find((seg) => seg.t === 'link')
  return link?.t === 'link' && link.href.startsWith('/') ? link.href : null
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
    withoutQuantity: [],
    singular: [],
    lookupFailures: [],
    needGroups: [],
    needsAfter: [],
    mixedSubtitles: [],
    leftovers: [],
  }
  const lookups = await lookupAll(
    options.guides.flatMap(({ source }) => allNeedRows(source).flatMap((row) => row.name ?? [])),
    options.findItem,
  )
  // Las páginas que este sitio enseña, por slug: un enlace de Torre a otra cosa lleva a su web.
  const live = new Set<string>()
  const linkFor = (href: string) => siteHref(href, (slug) => live.has(slug))
  const html = (segs: Segment[]) => segmentsHtml(segs, linkFor)
  const lexical = (source: string) => (source ? options.htmlToLexical(source) : null)
  const list = (rows: Segment[][]) =>
    rows.length
      ? lexical(`<ul>${rows.map((segs) => `<li>${html(segs)}</li>`).join('')}</ul>`)
      : null
  const paragraphs = (rows: Segment[][]) =>
    rows.length ? lexical(rows.map((segs) => `<p>${html(segs)}</p>`).join('')) : null

  // Las guías de misión y las páginas de logro de la base, por slug y por nombre plegado.
  const guides = await payload.find({
    collection: 'quest-guides',
    limit: 0,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { slug: true, title: true, _status: true },
  })
  const guideBySlug = new Map(guides.docs.map((doc) => [doc.slug, doc.id]))
  const guideByName = new Map(guides.docs.map((doc) => [fold(doc.title), doc.id]))
  const pages = await payload.find({
    collection: 'achievement-pages',
    limit: 0,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { slug: true, name: true, quests: true, state: true, _status: true },
  })
  // Los nombres de las misiones de DofusDB: una fila que se llama así es una misión, aunque
  // aún no tenga guía.
  const quests = await payload.find({
    collection: 'quests',
    limit: 0,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { name: true },
  })
  const questNames = new Set(quests.docs.map((doc) => fold(doc.name)))
  // Lo que un visitante ve en /<slug>: lo publicado y, de los logros y las guías de Dofus, lo
  // que no está En preparación. Una checklist En preparación redirige a la suya: también vale.
  const [dofusPages, checklistPages] = await Promise.all([
    payload.find({
      collection: 'dofus-guides',
      limit: 0,
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { slug: true, state: true, _status: true },
    }),
    payload.find({
      collection: 'checklists',
      limit: 0,
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { slug: true, _status: true },
    }),
  ])
  const published = (doc: { _status?: string | null }) => doc._status === 'published'
  for (const doc of [...guides.docs, ...checklistPages.docs]) {
    if (published(doc)) live.add(doc.slug)
  }
  for (const doc of [...pages.docs, ...dofusPages.docs]) {
    if (published(doc) && doc.state === 'published') live.add(doc.slug)
  }
  const pageBySlug = new Map(pages.docs.map((doc) => [doc.slug, doc]))
  const pageByName = new Map(pages.docs.map((doc) => [fold(doc.name), doc]))
  const classify = needClassifiers(
    await gameNames(payload, options.jobs, options.achievements ?? []),
  )

  for (const { entry, source } of options.guides) {
    const unmatched = (kind: 'logro' | 'misión' | 'objeto', name: string) =>
      report.unmatched.push({ slug: entry.slug, kind, name })

    /** Las guías que enlaza una fila de Torre, en su orden: varias si junta alternativas. */
    const guidesOf = (ref: QuestRef): number[] => {
      const ids = (ref.alternatives ?? [ref]).flatMap((candidate) => {
        const id =
          (candidate.slug && guideBySlug.get(candidate.slug)) ||
          guideByName.get(fold(candidate.name))
        return id ? [id] : []
      })
      return [...new Set(ids)]
    }
    const guideOf = (ref: QuestRef): number | null => guidesOf(ref)[0] ?? null

    /**
     * Cada fila de una lista de misiones, mirada una vez: una misión con guía, una misión sin
     * guía (su nombre es una misión de DofusDB o de la página de logro: se avisa y no se
     * publica) o algo que no es una misión (una explicación, un enlace a un metalogro): una
     * nota, con sus enlaces.
     */
    type Resolved =
      | { kind: 'guide'; ref: QuestRef; guide: number }
      | { kind: 'quest'; ref: QuestRef }
      | { kind: 'note'; ref: QuestRef }
    const resolve = (refs: QuestRef[], known: Set<string> = new Set()): Resolved[] =>
      refs.map((ref) => {
        const guide = guideOf(ref)
        if (guide) return { kind: 'guide', ref, guide }
        const names = (ref.alternatives ?? [ref]).map((candidate) => fold(candidate.name))
        const isQuest = names.some((name) => questNames.has(name) || known.has(name))
        return { kind: isQuest ? 'quest' : 'note', ref }
      })

    const questNote = (refs: QuestRef[]): Record<string, unknown> => {
      for (const ref of refs) report.leftovers.push({ slug: entry.slug, text: ref.name })
      const paragraphs = refs
        .map((ref) => `<p>${html(ref.segs ?? [{ t: 'text', v: ref.name }])}</p>`)
        .join('')
      return { blockType: 'dofusNote', text: lexical(paragraphs) }
    }

    /**
     * Una lista de misiones en bloques, en el orden de Torre: las misiones con guía en
     * dofusQuests (el título, en el primero) y lo que no es una misión como nota en su sitio
     * («Hazla antes de la siguiente:» entre dos misiones parte la lista). Una misión sin guía
     * se avisa y no sale.
     */
    const questBlocks = (title: string | null, refs: QuestRef[]): Record<string, unknown>[] => {
      const blocks: Record<string, unknown>[] = []
      let quests: Record<string, unknown>[] = []
      let notes: QuestRef[] = []
      let titled = false
      const flushQuests = () => {
        if (!quests.length) return
        blocks.push({ blockType: 'dofusQuests', title: titled ? null : title, quests })
        titled = true
        quests = []
      }
      const flushNotes = () => {
        if (notes.length) blocks.push(questNote(notes))
        notes = []
      }
      for (const item of resolve(refs)) {
        const link = linkOf(item.ref)
        if (item.kind === 'note' && !link) {
          flushQuests()
          notes.push(item.ref)
          continue
        }
        flushNotes()
        const row = { title: rowTitle(item.ref), note: item.ref.note ?? null }
        if (item.kind === 'note' && link) {
          // Algo que Torre enlaza que no es una misión: queda en su lista, con su enlace.
          quests.push({ guide: null, ...row, link: linkFor(link) })
          continue
        }
        // Una misión sin guía se avisa y queda en la lista de Torre, sin enlace.
        if (item.kind === 'quest') unmatched('misión', item.ref.name)
        quests.push({ guide: item.kind === 'guide' ? item.guide : null, ...row, link: null })
      }
      flushQuests()
      flushNotes()
      return blocks
    }

    /** La página de logro de un logro de Torre, o null; avisa si sus misiones no coinciden. */
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
      return page
    }

    /**
     * Un logro de Torre con su página: sus misiones son las que él escribe, en su orden, con su
     * texto y sus guías, aunque no escriba ninguna (pageQuests en false). Lo que no es una
     * misión (Zanahowia: cómo hacer el logro) va como nota detrás. link es su enlace al logro,
     * para cuando la página esté En preparación.
     */
    const achievementRef = (
      part: Extract<Part, { type: 'achievement' }>,
      page: NonNullable<ReturnType<typeof findAchievement>>,
    ) => {
      const known = new Set((page.quests ?? []).map((row) => fold(row.name ?? '')))
      const resolved = resolve(part.quests, known)
      const quests = resolved.flatMap((item) =>
        item.kind === 'note'
          ? []
          : [
              {
                title: rowTitle(item.ref),
                guides: guidesOf(item.ref),
                note: item.ref.note ?? null,
              },
            ],
      )
      const notes = resolved.flatMap((item) => (item.kind === 'note' ? [item.ref] : []))
      const ref = {
        achievement: page.id,
        note: null,
        pageQuests: false,
        ownQuests: quests,
        link: part.slug ? `/${part.slug}` : null,
      }
      return { ref, notes }
    }

    const toBlocks = (part: Part): Record<string, unknown>[] => {
      switch (part.type) {
        case 'achievement': {
          const page = findAchievement(part)
          if (page) {
            const { ref, notes } = achievementRef(part, page)
            return [
              { blockType: 'dofusAchievement', ...ref },
              ...(notes.length ? [questNote(notes)] : []),
            ]
          }
          // Sin página de logro, sus misiones no se pierden: van como lista con su nombre.
          return questBlocks(part.name, part.quests)
        }
        case 'metalogro': {
          const notes: QuestRef[] = []
          const achievements = part.achievements.flatMap((inner) => {
            if (inner.type !== 'achievement') return []
            const page = findAchievement(inner)
            if (!page) return []
            const found = achievementRef(inner, page)
            notes.push(...found.notes)
            return [found.ref]
          })
          return [
            { blockType: 'dofusMetalogro', name: part.name, achievements },
            ...(notes.length ? [questNote(notes)] : []),
          ]
        }
        case 'quests':
          return questBlocks(part.title, part.quests)
        case 'quest': {
          const [item] = resolve([part.quest])
          if (item!.kind === 'guide') {
            return [
              {
                blockType: 'dofusQuest',
                guide: item!.guide,
                title: rowTitle(part.quest),
                note: part.quest.note ?? null,
              },
            ]
          }
          if (item!.kind === 'note') return [questNote([part.quest])]
          unmatched('misión', part.quest.name)
          return []
        }
        case 'note':
          return [{ blockType: 'dofusNote', text: lexical(`<p>${html(part.segs)}</p>`) }]
      }
    }

    // Lo que casó sin cantidad o en singular, con el ID del objeto: se informa solo si es nuevo
    // frente a lo guardado.
    type Gained = GainedItem & { id: number }
    const gained = { withoutQuantity: [] as Gained[], singular: [] as Gained[] }
    const needRow = async (
      row: NeedRow,
    ): Promise<{
      block: Record<string, unknown>
      superTypeId?: number | null
      unmatched?: boolean
    }> => {
      if (row.name) {
        const withQuantity = row.quantity !== undefined
        const found = lookups.get(row.name) ?? { match: await options.findItem(row.name) }
        if ('error' in found) {
          // Con cantidad es un objeto seguro: el fallo para la importación. Sin ella, nota.
          if (withQuantity) throw found.error
          const error = found.error instanceof Error ? found.error.message : String(found.error)
          report.lookupFailures.push({ slug: entry.slug, text: row.text, error })
          log(`No se pudo buscar «${row.name}» en ${entry.slug}: queda como nota (${error})`)
        }
        const match = 'match' in found ? found.match : null
        if (match) {
          const line = { slug: entry.slug, text: row.text, item: match.name, id: match.id }
          if (match.singular) gained.singular.push(line)
          else if (!withQuantity) gained.withoutQuantity.push(line)
          const block = {
            blockType: 'needItem',
            item: match.id,
            quantity: row.quantity ?? 1,
            note: row.note ?? null,
          }
          return { block, superTypeId: match.superTypeId }
        }
        // Una fila sin cantidad que no es un objeto es una nota, como siempre: no se avisa.
        if (withQuantity) {
          unmatched('objeto', row.name)
          return { block: noteBlock(row.segs), unmatched: true }
        }
      }
      return { block: noteBlock(row.segs) }
    }
    const noteBlock = (segs: Segment[]) => ({
      blockType: 'needNote',
      text: lexical(`<p>${html(segs)}</p>`),
    })

    // Las filas de Torre con sus títulos encima, del más cercano al más lejano. Una fila con
    // filas debajo («1 x Mazmorra:», «Dependiendo de tu nivel:») es un subtítulo: sus filas
    // van juntas y él encima, con la cantidad y el sentido que le dio Torre. Con dos anidados,
    // el de dentro es el subtítulo y el de fuera va encima, cada uno en su línea (lead).
    const entries = async (
      rows: NeedRow[],
      headings: (string | null)[],
      unit?: string,
      lead: string[] = [],
    ): Promise<NeedEntry[]> => {
      const out: NeedEntry[] = []
      for (const row of rows) {
        if (!row.children?.length) {
          out.push({
            text: row.text,
            headings,
            ...(unit && { unit }),
            ...(lead.length && { lead }),
            ...(await needRow(row)),
          })
          continue
        }
        const heading = row.text.replace(/[:.]\s*$/, '')
        const outer = unit ? [...lead, unit] : lead
        out.push(...(await entries(row.children, [heading, ...headings], heading, outer)))
      }
      return out
    }

    // Los grupos de Necesitarás normalizados, y a dónde fue cada fila.
    let normalized: ReturnType<typeof normalizeNeeds> | null = null
    const needs = async (source: DofusGuideSource) => {
      if (!source.needs) return null
      const all: NeedEntry[] = []
      for (const group of source.needs.groups) {
        const rows = await entries(group.rows, [group.name])
        // Un título que no es un grupo («Recursos y otras movidas») se guarda como subtítulo.
        const heading = group.name && !headingGroup(group.name) ? group.name : undefined
        all.push(...rows.map((row) => (heading ? { ...row, heading } : row)))
      }
      normalized = normalizeNeeds(all, classify)
      return {
        title: source.needs.title === 'Necesitarás' ? null : source.needs.title,
        // La nota de Torre sobre todo Necesitarás va encima de los grupos.
        note: source.needs.note ? `(${source.needs.note})` : null,
        groups: normalized.groups,
      }
    }

    const body = async (items: BodyItem[]) => {
      const blocks: Record<string, unknown>[] = []
      for (const item of items) {
        if (item.type === 'paragraph') {
          blocks.push({
            blockType: 'richText',
            content: lexical(`<p>${html(item.segs)}</p>`),
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

    // Lo que casó o cambió de grupo en Necesitarás: solo si Necesitarás se escribe. Lo casado,
    // solo si la guía guardada aún no tenía ese objeto.
    const reportNeeds = (stored: Set<number>) => {
      const strip = ({ slug, text, item }: Gained): GainedItem => ({ slug, text, item })
      report.withoutQuantity.push(
        ...gained.withoutQuantity.filter((line) => !stored.has(line.id)).map(strip),
      )
      report.singular.push(...gained.singular.filter((line) => !stored.has(line.id)).map(strip))
      if (!normalized) return
      for (const placement of normalized.placements) {
        if (headingGroup(placement.from) !== placement.to) {
          report.needGroups.push({ slug: entry.slug, ...placement })
        }
      }
      for (const { subtitle, groups } of normalized.mixed) {
        report.mixedSubtitles.push({ slug: entry.slug, subtitle, groups })
      }
      if (normalized.outline.length) {
        report.needsAfter.push({ slug: entry.slug, groups: normalized.outline })
      }
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
      reportNeeds(new Set())
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
    if ('needs' in changes) reportNeeds(storedItems(current as DofusGuide))
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
  // Ordenados: el ensayo sale igual en cada pasada.
  const byLine = (a: GainedItem, b: GainedItem) =>
    a.slug.localeCompare(b.slug) || a.text.localeCompare(b.text, 'es')
  report.withoutQuantity.sort(byLine)
  report.singular.sort(byLine)
  return report
}

/** Los objetos que la guía guardada ya tiene en Necesitarás. */
function storedItems(doc: DofusGuide): Set<number> {
  const ids = new Set<number>()
  for (const group of doc.needs?.groups ?? []) {
    for (const row of group.rows ?? []) {
      if (row.blockType !== 'needItem' || row.item == null) continue
      ids.add(typeof row.item === 'object' ? row.item.id : row.item)
    }
  }
  return ids
}

/** Los nombres de mazmorras (con sus jefes), monstruos y logros de la base, y los oficios. */
async function gameNames(payload: Payload, jobs: string[], extraAchievements: string[]) {
  const all = { limit: 0, pagination: false, overrideAccess: true } as const
  const [dungeons, monsters, achievements] = await Promise.all([
    payload.find({
      collection: 'dungeons',
      ...all,
      depth: 1,
      select: { name: true, bosses: true },
      populate: { monsters: { name: true } },
    }),
    payload.find({ collection: 'monsters', ...all, depth: 0, select: { name: true } }),
    payload.find({ collection: 'achievements', ...all, depth: 0, select: { name: true } }),
  ])
  return {
    dungeons: dungeons.docs.map((doc) => ({
      name: doc.name,
      bosses: (doc.bosses ?? []).flatMap((boss) =>
        typeof boss === 'object' && boss.name ? [boss.name] : [],
      ),
    })),
    monsters: monsters.docs.map((doc) => doc.name),
    achievements: [...achievements.docs.map((doc) => doc.name), ...extraAchievements],
    jobs,
  }
}

/**
 * La entradilla del índice /guias-dofus (global dofus-guides-index): la de la web de Torre, solo
 * si aún está vacía. Lo que Torre escriba después en el panel no se toca.
 */
export async function loadDofusIndexIntro(
  payload: Payload,
  options: { intro: string; apply: boolean; htmlToLexical: (html: string) => LexicalState },
): Promise<'puesta' | 'se pondría' | 'se respeta'> {
  const index = await payload.findGlobal({
    slug: 'dofus-guides-index',
    depth: 0,
    overrideAccess: true,
  })
  if (index.intro) return 'se respeta'
  if (!options.apply) return 'se pondría'
  await payload.updateGlobal({
    slug: 'dofus-guides-index',
    data: { intro: options.htmlToLexical(`<p>${escapeHtml(options.intro)}</p>`) },
    overrideAccess: true,
  })
  return 'puesta'
}
