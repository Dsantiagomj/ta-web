// Lo que leemos de las respuestas de DofusDB. Cada fila trae muchos más campos; solo se
// tipan los que usamos.

/** Textos traducidos de DofusDB: { es, fr, en, de, pt }. */
export type LocalizedText = Partial<Record<'es' | 'fr' | 'en' | 'de' | 'pt', string>>

export interface RawQuest {
  id: number
  name: LocalizedText
  levelMin?: number | null
  levelMax?: number | null
  categoryId?: number | null
  startCriterion?: string | null
  startPosition?: ({ mapId?: number | null; npcId?: number | null } | null)[] | null
  need?: { quests?: number[] | null } | null
}

export interface RawNpc {
  id: number
  name?: LocalizedText | null
}

/** Un mapa del juego: `id` es el mapId y posX/posY sus coordenadas. */
export interface RawMapPosition {
  id: number
  posX?: number | null
  posY?: number | null
}

/** Los datos de una misión para la colección quests, más sus prerrequisitos por ID de DofusDB. */
export interface MappedQuest {
  dofusId: number
  name: string
  levelMin: number | null
  levelMax: number | null
  categoryId: number | null
  startCriterion: string | null
  startPositions: {
    npcId: number | null
    npcName: string | null
    mapId: number | null
    x: number | null
    y: number | null
  }[]
  prerequisiteDofusIds: number[]
}
