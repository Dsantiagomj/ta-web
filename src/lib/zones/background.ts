// El fondo de zona de las guías de misión y las páginas de logro (DESIGN.md, Zone
// background): el render de un mapa de DofusDB de la subzona de la página, guardado en Media
// sin la marca de DofusDB. Aquí, la lógica pura: de qué subzona es una página, qué mapa se
// elige y qué parte del render se guarda.

/** El render de un mapa a escala 1 (unos 1910 × 970 px). */
export const ZONE_RENDER_URL = (mapId: number) => `https://api.dofusdb.fr/img/maps/1/${mapId}.jpg`

/** La clave del render en Media (media.gameAsset): un archivo por mapa, nunca duplicado. */
export const zoneRenderKey = (mapId: number) => `dofusdb-map-render:${mapId}`

type MaybeId = number | null | undefined

/** Lo que hace falta de una misión guardada para saber su subzona. */
export interface ZoneQuest {
  startPositions?: { mapId?: MaybeId; subAreaId?: MaybeId }[] | null
  stages?: { objectives?: { subAreaId?: MaybeId }[] | null }[] | null
}

/**
 * La subzona de una misión: la del primer mapa de inicio que la tiene (la guarda el refresco
 * de datos del juego) y, si no, la del primer objetivo que la tiene. Null sin misión poblada.
 */
export function questSubAreaId(quest: ZoneQuest | number | null | undefined): number | null {
  if (!quest || typeof quest !== 'object') return null
  for (const position of quest.startPositions ?? []) {
    if (position.subAreaId != null) return position.subAreaId
  }
  for (const stage of quest.stages ?? []) {
    for (const objective of stage.objectives ?? []) {
      if (objective.subAreaId != null) return objective.subAreaId
    }
  }
  return null
}

/** La misión que da la zona de una página de logro: la primera de su lista. */
export function achievementZoneQuest<Q extends object>(
  rows: { quests?: (Q | number | null)[] | null }[] | null | undefined,
): Q | null {
  for (const row of rows ?? []) {
    for (const quest of row.quests ?? []) {
      if (quest && typeof quest === 'object') return quest
    }
  }
  return null
}

/** Un mapa de la subzona, como lo da DofusDB en map-positions. */
export interface ZoneMap {
  id: number
  outdoor?: boolean | null
  worldMap?: number | null
  posX?: number | null
  posY?: number | null
}

/** El mapa del mundo con más mapas de exterior de la subzona: su superficie. */
function mainWorldMap(outdoor: ZoneMap[]): number | null {
  const counts = new Map<number, number>()
  for (const map of outdoor) {
    if (map.worldMap == null || map.worldMap < 0) continue
    counts.set(map.worldMap, (counts.get(map.worldMap) ?? 0) + 1)
  }
  let best: number | null = null
  for (const [worldMap, count] of counts) {
    if (best === null || count > counts.get(best)!) best = worldMap
  }
  return best
}

/** El mapa más cercano al centro de los demás; en un empate, el primero. */
function nearestToCenter(maps: ZoneMap[]): ZoneMap | undefined {
  const placed = maps.filter((map) => map.posX != null && map.posY != null)
  if (placed.length === 0) return maps[0]
  const x = placed.reduce((sum, map) => sum + map.posX!, 0) / placed.length
  const y = placed.reduce((sum, map) => sum + map.posY!, 0) / placed.length
  let best = placed[0]!
  let bestDistance = Infinity
  for (const map of placed) {
    const distance = (map.posX! - x) ** 2 + (map.posY! - y) ** 2
    if (distance < bestDistance) {
      best = map
      bestDistance = distance
    }
  }
  return best
}

/**
 * El mapa cuyo render será el fondo de una subzona: el que pide Torre; si no, el de exterior
 * donde empieza la misión de una guía publicada (`preferred`, en orden); si no, el de
 * exterior del mundo principal de la subzona más cercano a su centro; sin exteriores, el
 * primero. Null si la subzona no tiene mapas.
 */
export function pickBackgroundMap({
  maps,
  preferred,
  requested,
}: {
  maps: ZoneMap[]
  preferred: number[]
  requested?: number | null
}): number | null {
  if (requested != null) return requested
  const outdoor = maps.filter((map) => map.outdoor)
  const outdoorIds = new Set(outdoor.map((map) => map.id))
  const start = preferred.find((id) => outdoorIds.has(id))
  if (start !== undefined) return start
  const world = mainWorldMap(outdoor)
  const surface = outdoor.filter((map) => world === null || map.worldMap === world)
  return (nearestToCenter(surface) ?? maps[0])?.id ?? null
}

// Lo que se quita del render: la marca «DofusDB» va de 17 a 50 px del borde de abajo en un
// render de 970 px de alto (y de 23 a 187 px del de la derecha). Quitar el 7 % de abajo la
// borra entera; el 2 % de la derecha limpia el borde. Proporcional, por si el render cambia
// de escala.
const CROP_BOTTOM = 0.07
const CROP_RIGHT = 0.02

/** La parte del render que se guarda, para sharp.extract: sin la marca de DofusDB. */
export function watermarkCrop(width: number, height: number) {
  return {
    left: 0,
    top: 0,
    width: Math.round(width * (1 - CROP_RIGHT)),
    height: Math.round(height * (1 - CROP_BOTTOM)),
  }
}

/** El texto alternativo del render: la subzona y, si es otra, su área. */
export function zoneBackgroundAlt({
  name,
  areaName,
}: {
  name: string
  areaName?: string | null
}): string {
  return areaName && areaName !== name ? `Paisaje de ${name}, en ${areaName}` : `Paisaje de ${name}`
}
