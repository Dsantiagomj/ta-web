// Las checklists del índice /checklists, del menú, del pie y de la portada, de la colección
// checklists: lo que Torre añade o publica en el panel aparece sin tocar el código. Código
// puro: queries.ts las lee y esto decide qué se enseña y adónde lleva cada una.
import type { ChecklistNavItem } from '@/components/site/nav'
import type { ImageAsset } from '@/components/ui/types'
import type { PageState } from '@/lib/achievements/strings'
import { mediaImageAsset } from '@/lib/media/image-asset'
import type { Media } from '@/payload-types'

import { posterInk } from './poster-ink'

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
  /** La tarjeta del índice: la escena, el PNJ con su encuadre (en % de la tarjeta) y el color. */
  card?: {
    scene?: Relation<Media>
    npc?: Relation<Media>
    npcHeight?: number | null
    npcRight?: number | null
    npcTop?: number | null
    color?: string | null
  } | null
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
  /** El de la tarjeta si Torre puso uno; si no, el de la guía de su Dofus. */
  color?: string
  /** El color del nombre en la tarjeta, legible sobre la sombra de cada modo. */
  ink?: { dark: string; light: string }
  /** La zona de fondo de la tarjeta. */
  scene?: ImageAsset
  /** El PNJ que asoma por la derecha. */
  npc?: ImageAsset
  /** Su encuadre, en % de la tarjeta; lo que falte, el de siempre. */
  npcFit?: { height?: number; right?: number; top?: number }
}

/** La tarjeta «???» del final del índice: la siguiente checklist que prepara Torre. */
export interface ChecklistTeaser {
  /** La píldora de arriba («En camino»). */
  label?: string
  /** El nombre («???»). */
  text: string
  scene?: ImageAsset
  egg?: ImageAsset
}

/** El global checklists-index como lo lee readChecklistTeaser. */
export interface ChecklistTeaserDoc {
  teaser?: {
    enabled?: boolean | null
    label?: string | null
    text?: string | null
    scene?: Relation<Media>
    egg?: Relation<Media>
  } | null
}

const object = <T>(value: Relation<T>): T | null =>
  value && typeof value === 'object' ? value : null

const text = (value: string | null | undefined) => value?.trim() || undefined

function link(doc: ChecklistDoc): Pick<ChecklistEntry, 'href' | 'legacy'> {
  if (doc.state === 'published') return { href: `/${doc.slug}` }
  const legacy = text(doc.legacyHref)
  return legacy ? { href: legacy, legacy: true } : {}
}

const image = (value: Relation<Media> | undefined) => mediaImageAsset(object(value ?? null))

/** El encuadre del PNJ con lo que Torre escribió; sin nada, ninguno. */
function npcFit(card: ChecklistDoc['card']): ChecklistEntry['npcFit'] {
  const fit = {
    ...(card?.npcHeight != null && { height: card.npcHeight }),
    ...(card?.npcRight != null && { right: card.npcRight }),
    ...(card?.npcTop != null && { top: card.npcTop }),
  }
  return Object.keys(fit).length ? fit : undefined
}

/**
 * Las checklists con su enlace, en el orden en que llegan: el de la base (readChecklists
 * ordena por order y name), sin reordenar aquí.
 */
export function checklistEntries(docs: readonly ChecklistDoc[]): ChecklistEntry[] {
  return docs.map((doc) => {
    const guide = object(doc.dofusGuide)
    const egg = image(object(guide?.dofus)?.image)
    const description = text(doc.description)
    const color = text(doc.card?.color) ?? text(guide?.color)
    const ink = posterInk(color)
    const scene = image(doc.card?.scene)
    const npc = image(doc.card?.npc)
    const fit = npcFit(doc.card)
    return {
      name: doc.name,
      slug: doc.slug,
      state: doc.state,
      ...link(doc),
      ...(description && { description }),
      ...(egg && { egg }),
      ...(color && { color }),
      ...(ink && { ink }),
      ...(scene && { scene }),
      ...(npc && { npc }),
      ...(fit && { npcFit: fit }),
    }
  })
}

/** La tarjeta «???» si Torre la tiene encendida y con texto; si no, null. */
export function checklistTeaser(
  doc: ChecklistTeaserDoc | null | undefined,
): ChecklistTeaser | null {
  const teaser = doc?.teaser
  const name = text(teaser?.text)
  if (!teaser?.enabled || !name) return null
  const label = text(teaser.label)
  const scene = image(teaser.scene)
  const egg = image(teaser.egg)
  return {
    ...(label && { label }),
    text: name,
    ...(scene && { scene }),
    ...(egg && { egg }),
  }
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
