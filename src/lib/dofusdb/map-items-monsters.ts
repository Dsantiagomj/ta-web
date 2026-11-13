import { spanish } from './map-quest'
import type {
  MappedDungeon,
  MappedItem,
  MappedMonster,
  RawDungeon,
  RawItem,
  RawMonster,
} from './types'

/** Convierte un objeto de DofusDB en los datos de la colección items. */
export function mapItem(raw: RawItem): MappedItem {
  return {
    dofusId: raw.id,
    // El nombre es obligatorio en la colección: sin texto, al menos el ID.
    name: spanish(raw.name) ?? `Objeto ${raw.id}`,
    level: raw.level ?? null,
    typeId: raw.typeId ?? null,
    superTypeId: raw.type?.superTypeId ?? null,
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

/**
 * Convierte una mazmorra de DofusDB en los datos de la colección dungeons, con sus jefes por
 * el ID de Payload de su monstruo, en el orden de DofusDB. Los que no están se omiten.
 */
export function mapDungeon(
  raw: RawDungeon,
  monsterIds: Map<number, number>,
): { dungeon: MappedDungeon; missingBosses: number } {
  const bosses: number[] = []
  let missingBosses = 0
  for (const dofusId of raw.bosses ?? []) {
    const id = monsterIds.get(dofusId)
    if (id === undefined) missingBosses += 1
    else bosses.push(id)
  }
  return {
    dungeon: { dofusId: raw.id, name: spanish(raw.name) ?? `Mazmorra ${raw.id}`, bosses },
    missingBosses,
  }
}
