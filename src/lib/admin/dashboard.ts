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

/** Las que tienen «Visible en la web» (`state`). Las guías de misiones no lo tienen. */
export const STATE_COLLECTIONS = [
  'achievement-pages',
  'achievement-groups',
  'dofus-guides',
  'checklists',
] as const satisfies readonly EditorialCollection[]

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

/** Una lista del panel, con filtros de igualdad en la dirección, como los pone Payload. */
export function adminListHref(
  adminRoute: string,
  collection: string,
  equals: Record<string, string> = {},
) {
  const query = Object.entries(equals)
    .map(([field, value]) => `${encodeURIComponent(`where[${field}][equals]`)}=${value}`)
    .join('&')
  return `${adminRoute}/collections/${collection}${query ? `?${query}` : ''}`
}

/** Junta listas ya ordenadas de varias colecciones: lo más nuevo primero, hasta `limit`. */
export function mergeRecent<T extends DashboardItem>(lists: T[][], limit: number): T[] {
  return lists
    .flat()
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
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

/**
 * Lo que Torre tiene pendiente: borradores sin publicar, lo que sigue «En preparación», los
 * Dofus cuya página no enlaza su checklist y lo último que cambió.
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

  const [drafts, preparing, dofusWithoutChecklist, recent] = await Promise.all([
    readDrafts(),
    readPreparing(),
    readDofusWithoutChecklist(),
    readRecent(),
  ])
  return { drafts, preparing, dofusWithoutChecklist, recent }

  async function readDrafts(): Promise<Dashboard['drafts']> {
    const perCollection = await Promise.all(
      EDITORIAL_COLLECTIONS.map(async (collection) => {
        // Con draft: true, Payload lee la última versión de cada documento: un borrador es
        // tanto lo nunca publicado como los cambios guardados sobre lo publicado.
        const found = await find(collection, {
          draft: true,
          where: { _status: { equals: 'draft' } },
          sort: '-updatedAt',
          limit: DASHBOARD_LIMITS.drafts,
        })
        const docs = found.docs
        const ids = docs.map((doc) => doc.id)
        const published = ids.length
          ? await find(collection, {
              where: { and: [{ id: { in: ids } }, { _status: { equals: 'published' } }] },
              limit: ids.length,
              select: {},
            })
          : { docs: [] as Doc[] }
        const live = new Set(published.docs.map((doc) => doc.id))
        return {
          total: found.totalDocs,
          items: docs.map((doc) => ({
            ...toItem(collection, doc),
            neverPublished: !live.has(doc.id),
          })),
        }
      }),
    )
    return {
      total: perCollection.reduce((sum, part) => sum + part.total, 0),
      items: mergeRecent(
        perCollection.map((part) => part.items),
        DASHBOARD_LIMITS.drafts,
      ),
    }
  }

  async function readPreparing(): Promise<PreparingGroup[]> {
    const groups = await Promise.all(
      STATE_COLLECTIONS.map(async (collection) => {
        const found = await find(collection, {
          draft: true,
          where: { state: { equals: 'preparing' } },
          sort: '-updatedAt',
          limit: DASHBOARD_LIMITS.preparing,
        })
        return {
          collection,
          label: labels(collection).plural,
          total: found.totalDocs,
          items: found.docs.map((doc) => toItem(collection, doc)),
          listHref: adminListHref(adminRoute, collection, { state: 'preparing' }),
        }
      }),
    )
    return groups.filter((group) => group.total > 0)
  }

  async function readDofusWithoutChecklist(): Promise<Dashboard['dofusWithoutChecklist']> {
    // La tarjeta de la checklist en la página del Dofus sale de `checklist.url`.
    const noLink: Where = {
      or: [{ 'checklist.url': { exists: false } }, { 'checklist.url': { equals: '' } }],
    }
    const found = await find('dofus-guides', {
      draft: true,
      where: noLink,
      sort: 'order',
      limit: DASHBOARD_LIMITS.dofus,
    })
    const docs = found.docs
    const ids = docs.map((doc) => doc.id)
    // Una checklist que ya apunta a ese Dofus: solo falta poner su enlace en la guía.
    const checklists = ids.length
      ? await find('checklists', {
          draft: true,
          where: { dofusGuide: { in: ids } },
          limit: ids.length * 2,
        })
      : { docs: [] as Doc[] }
    const byGuide = new Map<number, string>()
    for (const checklist of checklists.docs as Doc[]) {
      const guide = checklist.dofusGuide
      const guideId = typeof guide === 'object' && guide ? (guide as Doc).id : guide
      if (typeof guideId === 'number' && typeof checklist.name === 'string') {
        byGuide.set(guideId, checklist.name)
      }
    }
    return {
      total: found.totalDocs,
      items: docs.map((doc) => ({
        ...toItem('dofus-guides', doc),
        checklistName: byGuide.get(doc.id) ?? null,
      })),
    }
  }

  async function readRecent(): Promise<DashboardItem[]> {
    const lists = await Promise.all(
      EDITORIAL_COLLECTIONS.map(async (collection) => {
        const found = await find(collection, {
          draft: true,
          sort: '-updatedAt',
          limit: DASHBOARD_LIMITS.recent,
        })
        return found.docs.map((doc) => toItem(collection, doc))
      }),
    )
    return mergeRecent(lists, DASHBOARD_LIMITS.recent)
  }
}
