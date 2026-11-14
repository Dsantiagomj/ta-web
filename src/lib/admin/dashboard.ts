import type { CollectionSlug, Payload, Where } from 'payload'

import type { User } from '@/payload-types'

// A-13 (docs/research/backlog.md): el panel de control responde qué trabajar hoy. Todo se
// lee como la cuenta del panel (overrideAccess: false), igual que lo vería en las listas.

/** Las colecciones de Torre, en el orden del menú. */
export const EDITORIAL_COLLECTIONS = [
  'quest-guides',
  'achievement-pages',
  'achievement-groups',
  'dofus-guides',
  'checklists',
] as const satisfies readonly CollectionSlug[]

export type EditorialCollection = (typeof EDITORIAL_COLLECTIONS)[number]

/** Cuántas filas enseña cada parte: el panel de control es un resumen, no una lista. */
export const DASHBOARD_LIMITS = { drafts: 8, preparing: 5, dofus: 12, recent: 8 } as const

export type DashboardItem = {
  collection: EditorialCollection
  collectionLabel: string
  id: number
  title: string
  updatedAt: string
  href: string
}

export type DraftItem = DashboardItem & { neverPublished: boolean }
export type DofusItem = DashboardItem & { checklistName: string | null }

export type PreparingGroup = {
  collection: EditorialCollection
  label: string
  total: number
  items: DashboardItem[]
  listHref: string
}

export type Dashboard = {
  drafts: { total: number; items: DraftItem[] }
  preparing: PreparingGroup[]
  dofusWithoutChecklist: { total: number; items: DofusItem[] }
  recent: DashboardItem[]
}

/** La vista de edición de un documento: /admin/collections/dofus-guides/7. */
export function adminDocHref(adminRoute: string, collection: string, id: number | string) {
  return `${adminRoute}/collections/${collection}/${id}`
}

/** La vista de crear un documento nuevo: /admin/collections/media/create. */
export function adminCreateHref(adminRoute: string, collection: string) {
  return `${adminRoute}/collections/${collection}/create`
}

/** Una lista del panel, con filtros de igualdad en la dirección, como los pone Payload. */
export function adminListHref(
  adminRoute: string,
  collection: string,
  equals: Record<string, string> = {},
) {
  const query = new URLSearchParams(
    Object.entries(equals).map(([field, value]) => [`where[${field}][equals]`, value]),
  ).toString()
  return `${adminRoute}/collections/${collection}${query ? `?${query}` : ''}`
}

const time = (item: DashboardItem) => {
  const parsed = Date.parse(item.updatedAt)
  return Number.isNaN(parsed) ? -Infinity : parsed
}

/**
 * Junta listas de varias colecciones: lo más nuevo primero, hasta `limit`. Lo que no tiene
 * fecha va al final.
 */
export function mergeRecent<T extends DashboardItem>(lists: T[][], limit: number): T[] {
  return lists
    .flat()
    .sort((a, b) => time(b) - time(a))
    .slice(0, limit)
}

type Doc = { id: number; title?: unknown; name?: unknown; updatedAt?: unknown } & Record<
  string,
  unknown
>

type Label = string | Record<string, string> | ((...args: never[]) => unknown) | undefined

/** Una etiqueta de Payload como texto: la española si es un objeto por idioma. */
function labelText(label: Label, fallback: string): string {
  if (typeof label === 'string') return label
  if (label && typeof label === 'object') return label.es ?? Object.values(label)[0] ?? fallback
  return fallback
}

const PUBLISHED: Where = { _status: { equals: 'published' } }
const DRAFT: Where = { _status: { equals: 'draft' } }

const filled = (value: unknown) => typeof value === 'string' && value.trim() !== ''

/** Lo que pinta la tarjeta de la checklist en la página del Dofus: nombre y enlace. */
const hasChecklistCard = (doc: Doc) => {
  const checklist = doc.checklist as { name?: unknown; url?: unknown } | null | undefined
  return filled(checklist?.name) && filled(checklist?.url)
}

const relationId = (value: unknown) =>
  typeof value === 'object' && value ? (value as Doc).id : value

/**
 * Lo que Torre tiene pendiente: borradores sin publicar, lo publicado «En preparación», los
 * Dofus publicados cuya página no enseña su checklist y lo último que cambió. Todas las
 * consultas van a la vez: ninguna depende de otra.
 */
export async function readDashboard(payload: Payload, user: User): Promise<Dashboard> {
  const adminRoute = payload.config.routes?.admin ?? '/admin'
  const asUser = { overrideAccess: false, user, depth: 0 } as const

  const labels = (collection: EditorialCollection) => {
    const config = payload.collections[collection]?.config.labels as
      { singular?: Label; plural?: Label } | undefined
    const singular = labelText(config?.singular, collection)
    return { singular, plural: labelText(config?.plural, singular) }
  }

  const toItem = (collection: EditorialCollection, doc: Doc): DashboardItem => {
    const title = typeof doc.title === 'string' ? doc.title : doc.name
    return {
      collection,
      collectionLabel: labels(collection).singular,
      id: doc.id,
      title: typeof title === 'string' && title.trim() ? title : `#${doc.id}`,
      updatedAt: typeof doc.updatedAt === 'string' ? doc.updatedAt : '',
      href: adminDocHref(adminRoute, collection, doc.id),
    }
  }

  // Las cinco colecciones tienen tipos distintos; aquí solo se leen campos comunes.
  const find = async (
    collection: EditorialCollection,
    options: Record<string, unknown>,
  ): Promise<{ docs: Doc[]; totalDocs: number }> => {
    const found = await payload.find({
      collection,
      ...asUser,
      ...options,
    } as Parameters<Payload['find']>[0])
    return found as unknown as { docs: Doc[]; totalDocs: number }
  }

  const preparingGroup = (collection: EditorialCollection, docs: Doc[], total: number) => ({
    collection,
    label: labels(collection).plural,
    total,
    items: docs.slice(0, DASHBOARD_LIMITS.preparing).map((doc) => toItem(collection, doc)),
    listHref: adminListHref(adminRoute, collection, { state: 'preparing' }),
  })

  const perCollection = Promise.all(
    EDITORIAL_COLLECTIONS.map(async (collection) => {
      const [drafts, neverPublished, latest] = await Promise.all([
        // Con draft: true, Payload lee la última versión de cada documento: un borrador es
        // tanto lo nunca publicado como los cambios guardados sobre lo publicado.
        find(collection, {
          draft: true,
          where: DRAFT,
          sort: '-updatedAt',
          limit: DASHBOARD_LIMITS.drafts,
        }),
        // Sin versión publicada, lo guardado sigue como borrador en la colección. Mismo orden
        // y límite: los nunca publicados de la lista de arriba están todos aquí.
        find(collection, {
          where: DRAFT,
          sort: '-updatedAt',
          limit: DASHBOARD_LIMITS.drafts,
          select: {},
        }),
        find(collection, { draft: true, sort: '-updatedAt', limit: DASHBOARD_LIMITS.recent }),
      ])
      const never = new Set(neverPublished.docs.map((doc) => doc.id))
      return {
        draftTotal: drafts.totalDocs,
        drafts: drafts.docs.map((doc) => ({
          ...toItem(collection, doc),
          neverPublished: never.has(doc.id),
        })),
        recent: latest.docs.map((doc) => toItem(collection, doc)),
      }
    }),
  )

  // Los logros y los metalogros pueden ser cientos: se cuentan y se enseñan los últimos.
  const preparingLarge = Promise.all(
    (['achievement-pages', 'achievement-groups'] as const).map(async (collection) => {
      const found = await find(collection, {
        where: { and: [PUBLISHED, { state: { equals: 'preparing' } }] },
        sort: '-updatedAt',
        limit: DASHBOARD_LIMITS.preparing,
      })
      return preparingGroup(collection, found.docs, found.totalDocs)
    }),
  )

  // Las guías de Dofus y las checklists son pocas: se leen enteras, una vez, y de ellas sale
  // todo lo demás.
  const dofusGuides = find('dofus-guides', { where: PUBLISHED, sort: 'order', pagination: false })
  const checklists = find('checklists', { where: PUBLISHED, sort: 'order', pagination: false })

  const [collections, large, dofus, lists] = await Promise.all([
    perCollection,
    preparingLarge,
    dofusGuides,
    checklists,
  ])

  const byState = (docs: Doc[]) => docs.filter((doc) => doc.state === 'preparing')
  const preparingDofus = byState(dofus.docs)
  const preparingLists = byState(lists.docs)
  const preparing = [
    ...large,
    preparingGroup('dofus-guides', preparingDofus, preparingDofus.length),
    preparingGroup('checklists', preparingLists, preparingLists.length),
  ].filter((group) => group.total > 0)

  // La primera checklist publicada, en el orden de Torre, que apunta a cada Dofus.
  const checklistOf = new Map<unknown, string>()
  for (const list of lists.docs) {
    const guide = relationId(list.dofusGuide)
    if (guide !== undefined && !checklistOf.has(guide) && typeof list.name === 'string') {
      checklistOf.set(guide, list.name)
    }
  }
  const withoutCard = dofus.docs.filter((doc) => !hasChecklistCard(doc))

  return {
    drafts: {
      total: collections.reduce((sum, part) => sum + part.draftTotal, 0),
      items: mergeRecent(
        collections.map((part) => part.drafts),
        DASHBOARD_LIMITS.drafts,
      ),
    },
    preparing,
    dofusWithoutChecklist: {
      total: withoutCard.length,
      items: withoutCard.slice(0, DASHBOARD_LIMITS.dofus).map((doc) => ({
        ...toItem('dofus-guides', doc),
        checklistName: checklistOf.get(doc.id) ?? null,
      })),
    },
    recent: mergeRecent(
      collections.map((part) => part.recent),
      DASHBOARD_LIMITS.recent,
    ),
  }
}
