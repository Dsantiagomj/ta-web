import { spanish } from './map-quest'
import type { MappedItem, MappedMonster, RawItem, RawMonster } from './types'

/** Convierte un objeto de DofusDB en los datos de la colección items. */
export function mapItem(raw: RawItem): MappedItem {
  return {
    dofusId: raw.id,
    // El nombre es obligatorio en la colección: sin texto, al menos el ID.
    name: spanish(raw.name) ?? `Objeto ${raw.id}`,
    level: raw.level ?? null,
    typeId: raw.typeId ?? null,
    iconId: raw.iconId ?? null,
  }
}

/** Convierte un monstruo de DofusDB en los datos de la colección monsters. */
export function mapMonster(raw: RawMonster): MappedMonster {
  return {
    dofusId: raw.id,
    name: spanish(raw.name) ?? `Monstruo ${raw.id}`,
    iconId: raw.gfxId ?? null,
  }
}
