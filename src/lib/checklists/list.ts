// Las checklists del índice /checklists, del menú, del pie y de la portada, de la colección
// checklists: lo que Torre añade o publica en el panel aparece sin tocar el código. Código
// puro: queries.ts las lee y esto decide qué se enseña y adónde lleva cada una.
import type { ChecklistNavItem } from '@/components/site/nav'
import type { ImageAsset } from '@/components/ui/types'
import type { PageState } from '@/lib/achievements/strings'
import { mediaImageAsset } from '@/lib/media/image-asset'
import type { Media } from '@/payload-types'

/** El huevo se pinta a 60px como mucho en el menú: basta su archivo de 128px. */
const EGG_SIZE = 128

type Relation<T> = number | T | null | undefined

/** Una checklist como la lee readChecklists: sin pasos, con el huevo y el color de su Dofus. */
export interface ChecklistDoc {
  name: string
  slug: string
  state: PageState
  order?: number | null
  description?: string | null
  legacyHref?: string | null
  dofusGuide?: Relation<{
    color?: string | null
    dofus?: Relation<{ image?: Relation<Media> }>
  }>
}

/** Una checklist del índice. */
export interface ChecklistEntry {
  name: string
  slug: string
  state: PageState
  /**
   * Su página del sitio si está Publicada; la de Squarespace si está En preparación y tiene
   * `legacyHref`; ninguno si no.
   */
  href?: string
  /** El enlace lleva a la web anterior (Squarespace). */
  legacy?: true
  description?: string
  egg?: ImageAsset
  color?: string
}

const object = <T>(value: Relation<T>): T | null =>
  value && typeof value === 'object' ? value : null

const text = (value: string | null | undefined) => value?.trim() || undefined

function link(doc: ChecklistDoc): Pick<ChecklistEntry, 'href' | 'legacy'> {
  if (doc.state === 'published') return { href: `/${doc.slug}` }
  const legacy = text(doc.legacyHref)
  return legacy ? { href: legacy, legacy: true } : {}
}

/**
 * Las checklists con su enlace, en el orden en que llegan: el de la base (readChecklists
 * ordena por order y name), sin reordenar aquí.
 */
export function checklistEntries(docs: readonly ChecklistDoc[]): ChecklistEntry[] {
  return docs.map((doc) => {
    const guide = object(doc.dofusGuide)
    const egg = mediaImageAsset(object(object(guide?.dofus)?.image))
    const description = text(doc.description)
    const color = text(guide?.color)
    return {
      name: doc.name,
      slug: doc.slug,
      state: doc.state,
      ...link(doc),
      ...(description && { description }),
      ...(egg && { egg }),
      ...(color && { color }),
    }
  })
}

/** Lo que pinta el menú de cada checklist: lo justo, que va en cada página. */
export function checklistNavItems(entries: readonly ChecklistEntry[]): ChecklistNavItem[] {
  return entries.map((entry) => ({
    name: entry.name,
    slug: entry.slug,
    ...(entry.href && { href: entry.href }),
    ...(entry.legacy && { legacy: true as const }),
    ...(entry.description && { description: entry.description }),
    ...(entry.egg && { image: { src: entry.egg.src, size: EGG_SIZE } }),
  }))
}
