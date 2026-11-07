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
  /** Resumen de DofusDB: objetos que pide la misión, con sus cantidades en el mismo orden. */
  need?: { items?: number[] | null; quantities?: number[] | null } | null
  steps?: RawQuestStep[] | null
}

export interface RawQuestStep {
  id: number
  optimalLevel: number
  duration: number
  /** Varias entradas por tramos de nivel; la última es la del nivel más alto. */
  rewards?: RawQuestReward[] | null
  objectives?: RawQuestObjective[] | null
}

export interface RawQuestReward {
  experienceRatio: number
  kamasRatio: number
  /** Pares [ID del objeto, cantidad]. */
  itemsReward?: number[][] | null
  emotesReward?: number[] | null
  spellsReward?: number[] | null
  titlesReward?: number[] | null
  jobsReward?: number[] | null
}

/** Un objetivo de etapa. El significado de parameter0… depende de className. */
export interface RawQuestObjective {
  id: number
  className: string
  parameters?: Partial<Record<`parameter${0 | 1 | 2 | 3 | 4}`, number>> | null
}

export interface RawItem {
  id: number
  name?: LocalizedText | null
  level?: number | null
  typeId?: number | null
  iconId?: number | null
  /** El tipo del objeto, que DofusDB añade por typeId; de él solo usamos el supertipo. */
  type?: { superTypeId?: number | null } | null
}

export interface RawMonster {
  id: number
  name?: LocalizedText | null
  /** El ID de su imagen; DofusDB lo llama gfxId. */
  gfxId?: number | null
}

/** Un objeto o monstruo por su ID de DofusDB, con su cantidad. */
export interface QuantityByDofusId {
  dofusId: number
  quantity: number
}

/** Recompensas de una misión para un personaje de nivel 200. */
export interface QuestRewards {
  experience: number
  /** La XP en el nivel óptimo de cada etapa: el principio del rango. */
  experienceMin: number
  kamas: number
  items: QuantityByDofusId[]
  emoteIds: number[]
  spellIds: number[]
  titleIds: number[]
  jobIds: number[]
}

/** Lo que pide una misión, sacado de need.items y de los objetivos de sus etapas. */
export interface QuestNeeds {
  items: QuantityByDofusId[]
  monsters: QuantityByDofusId[]
  /** Algún objetivo pide descubrir un mapa o una zona. */
  walksMaps: boolean
}

export interface RawNpc {
  id: number
  name?: LocalizedText | null
  /** Su apariencia, como «{74||3=12993798,4=16707303}»: lo que pinta el renderizador. */
  look?: string | null
}

/** Un mapa del juego: `id` es el mapId y posX/posY sus coordenadas. */
export interface RawMapPosition {
  id: number
  posX?: number | null
  posY?: number | null
  subAreaId?: number | null
}

/** Una subzona («Ciudad de Astrub»); de ella solo usamos su área. */
export interface RawSubArea {
  id: number
  areaId?: number | null
}

/** Un área («Astrub»): la zona de la misión. */
export interface RawArea {
  id: number
  name?: LocalizedText | null
}

/** Un logro; need.quests son sus misiones, en el orden del juego. */
export interface RawAchievement {
  id: number
  name?: LocalizedText | null
  slug?: LocalizedText | null
  need?: { quests?: number[] | null } | null
  categoryId?: number | null
  iconId?: number | null
  points?: number | null
  level?: number | null
  /** Su orden dentro de la categoría. */
  order?: number | null
  /** Los objetivos, que DofusDB añade a cada logro: lo que el juego cuenta para darlo. */
  objectives?: (RawAchievementObjective | null)[] | null
  /** Las recompensas, que DofusDB también añade. */
  rewards?: (RawAchievementReward | null)[] | null
}

/** Un objetivo de logro: «(Qf=1975)» es terminar esa misión, «(OA=1671)» tener ese logro. */
export interface RawAchievementObjective {
  id: number
  order?: number | null
  criterion?: string | null
  name?: LocalizedText | null
}

/** Una fila de recompensas; criterions puede limitarla a un tramo de nivel (PL>150&PL<201). */
export interface RawAchievementReward {
  id: number
  criterions?: string | null
  kamasRatio?: number | null
  experienceRatio?: number | null
  itemsReward?: number[] | null
  itemsQuantityReward?: number[] | null
}

/** Una categoría de logros («Astrub», dentro de «Misiones»). */
export interface RawAchievementCategory {
  id: number
  name?: LocalizedText | null
  /** 0 en las categorías de primer nivel. */
  parentId?: number | null
  order?: number | null
}

/** Un logro del juego que pide este, directamente o a través de otro. */
export interface MappedMetaAchievement {
  dofusId: number
  name: string
  points: number | null
  /** Cuántos logros pide. */
  achievements: number
  iconId: number | null
}

/** Los datos de un logro para la colección achievements. */
export interface MappedAchievement {
  dofusId: number
  name: string
  iconId: number | null
  points: number | null
  level: number | null
  order: number | null
  categoryDofusId: number | null
  /** Una fila por misión del logro; varias misiones en una fila son alternativas. */
  quests: { name: string | null; questDofusIds: number[] }[]
  rewards: { experience: number; kamas: number; items: QuantityByDofusId[] }
  countsFor: MappedMetaAchievement[]
}

/** Los datos de una categoría para la colección achievement-categories. */
export interface MappedAchievementCategory {
  dofusId: number
  name: string
  parentDofusId: number | null
  order: number | null
}

/** El logro de una misión y su posición en él (misión 2 de 3). */
export interface QuestAchievement {
  dofusId: number
  name: string
  /** El slug de su página, como en la web de Torre: la-ocasion-hace-al-ladron. */
  slug: string
  position: number
  total: number
}

/** Los datos de un PNJ para la colección npcs. */
export interface MappedNpc {
  dofusId: number
  name: string
  look: string | null
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
  /** El área del mapa de inicio («Astrub»), o null. */
  zone: string | null
  achievement: QuestAchievement | null
  prerequisiteDofusIds: number[]
  rewards: QuestRewards
  needs: QuestNeeds
}

/** Los datos de un objeto para la colección items. */
export interface MappedItem {
  dofusId: number
  name: string
  level: number | null
  typeId: number | null
  /** 14 son los objetos de misión. */
  superTypeId: number | null
  iconId: number | null
}

/** Los datos de un monstruo para la colección monsters. */
export interface MappedMonster {
  dofusId: number
  name: string
  iconId: number | null
}
