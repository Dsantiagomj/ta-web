// El huevo de un Dofus en la web: el índice, el menú, el póster de su checklist y la cabecera
// de la guía y de la checklist. Código puro.

import { corrected, hiddenByTorre, type Correction } from '@/lib/game-data/correction'
import type { Media } from '@/payload-types'

type Ref<T> = number | T | null | undefined

interface EggSource {
  /** El huevo que subió Torre en la guía del Dofus. */
  egg?: Ref<Media>
  /** El objeto Dofus de DofusDB, con su imagen y la corrección de Torre. */
  dofus?: Ref<{ image?: Ref<Media>; correction?: Correction | null }>
}

const object = <T>(value: Ref<T>): T | null =>
  value && typeof value === 'object' ? (value as T) : null

/**
 * El huevo que subió Torre en la guía gana; sin él, la imagen del objeto Dofus con su
 * corrección, o ninguna si Torre ocultó el objeto. Sin poblar, null.
 */
export function dofusEgg(guide: EggSource | null | undefined): Media | null {
  const own = object(guide?.egg)
  if (own) return own
  const dofus = object(guide?.dofus)
  if (!dofus || hiddenByTorre(dofus)) return null
  return object(corrected(dofus).image)
}
