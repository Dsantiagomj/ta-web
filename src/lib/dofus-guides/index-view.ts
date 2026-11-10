// El índice de las guías de Dofus (DESIGN.md, Dofus guides index): una tarjeta por Dofus, en
// el orden de Torre, con lo que guarda la colección. Código puro: la página lo pinta en el
// servidor y la isla del índice filtra las tarjetas con matchesDofus.

import type { ImageAsset } from '@/components/ui/types'
import { mediaImageAsset } from '@/lib/media/image-asset'
import type { Media } from '@/payload-types'

import { dofusMeta, type DofusListDoc } from './page'
import { dofusGuideStrings, dofusPageStrings } from './strings'

export type DofusTag = 'primordial' | 'event'
export type DofusFilter = 'all' | DofusTag

export interface DofusCard {
  name: string
  slug: string
  href?: string
  disabled: boolean
  egg?: ImageAsset
  color?: string
  tag?: DofusTag
  tagLabel?: string
  /** «7 logros - 40 misiones - Nivel 180»; solo «Nivel 20» si está En preparación. */
  meta: string
  /** El nombre y los otros nombres, sin tildes ni mayúsculas, para la búsqueda. */
  search: string
}

export interface DofusIndexView {
  cards: DofusCard[]
  /** Los filtros que tienen sentido: ninguno si ningún Dofus lleva etiqueta. */
  filters: DofusFilter[]
}

/** Minúsculas y sin tildes, para buscar como se escribe. */
export const foldText = (text: string) =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es').trim()

export function dofusIndexView(docs: DofusListDoc[]): DofusIndexView {
  const cards = docs.map((doc): DofusCard => {
    const disabled = doc.state !== 'published'
    const egg = mediaImageAsset(doc.egg && typeof doc.egg === 'object' ? (doc.egg as Media) : null)
    const tag = doc.tag ?? undefined
    const meta = disabled
      ? dofusMeta({ achievements: 0, quests: 0, level: doc.level })
      : dofusMeta(doc)
    return {
      name: doc.name,
      slug: doc.slug,
      ...(!disabled && { href: `/${doc.slug}` }),
      disabled,
      ...(egg && { egg }),
      ...(doc.color && { color: doc.color }),
      ...(tag && { tag, tagLabel: dofusGuideStrings.tags[tag] }),
      meta: meta.join(dofusPageStrings.metaSeparator),
      search: foldText([doc.name, doc.aliases ?? ''].join(' ')),
    }
  })
  const tags = (['primordial', 'event'] as const).filter((tag) =>
    cards.some((card) => card.tag === tag),
  )
  return { cards, filters: tags.length ? ['all', ...tags] : [] }
}

/** Si una tarjeta pasa la búsqueda (cada palabra, en cualquier orden) y el filtro. */
export function matchesDofus(
  card: { search: string; tag?: DofusTag },
  query: string,
  filter: DofusFilter,
): boolean {
  if (filter !== 'all' && card.tag !== filter) return false
  const words = foldText(query).split(/\s+/).filter(Boolean)
  return words.every((word) => card.search.includes(word))
}
