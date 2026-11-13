// Los iconos fijos del juego que usa la cabecera de la guía (DESIGN.md, Game icons): son
// archivos del juego originales, convertidos a WebP sin pérdida y guardados en
// public/img/game. Nunca copias de otras webs de fans. Se pintan a su tamaño o más
// pequeños, nunca ampliados más allá de su archivo.
//
// | Icono   | Archivo del juego                                                  | Tamaño |
// | combate | statistics/2x/21-96.png (estadísticas del cliente, Dofus 3)        | 96px   |
// | kamas   | statistics/2x/78-96.png (estadísticas del cliente, Dofus 3)        | 96px   |
// | misión  | icon_quests.png de dofusdb.fr/icons (interfaz de Dofus)            | 70px   |
// | xp      | ui/guidebook/feature_494-24.png (guía del juego, Dofus 3)          | 24px   |
// | logro   | misc/guildrank/87-28.png (rangos de gremio, Dofus 3)               | 28px   |
// | bolsa   | ui/guidebook/feature_139-24.png (guía del juego, Dofus 3)          | 24px   |
// | mazmorra| jefes/crunchidor.webp: el Crunchidor de DofusDB, el arte de Mazmorras  | 120px  |
//
// Los de Dofus 3 salen de las exportaciones del cliente de dofusdude/dofus3-main
// (versión 3.7.13.17): statistics_images_96, ui_guidebook_images y misc_images. La flecha
// de XP, la bolsa del inventario y el trofeo solo existen a 24 y 28px: se pintan a ese
// tamaño, sin ampliar.
//
// Los iconos de los objetivos de misión de las checklists son los que eligió la checklist
// antigua (OBJ_ICONS de silvestre-checklist): iconos de objetos del juego de DofusDB, de
// 128px reducidos a 64px. El de combate es el de arriba.

import type { QuestObjectiveKind } from '@/lib/dofusdb/types'

export type GameIconName = 'combat' | 'kamas' | 'quest' | 'xp' | 'achievement' | 'bag' | 'dungeon'

export interface GameIconFile {
  src: string
  /** El tamaño del archivo, que es el máximo al que se pinta. */
  size: number
}

export const GAME_ICONS: Record<GameIconName, GameIconFile> = {
  combat: { src: '/img/game/combate.webp', size: 96 },
  kamas: { src: '/img/game/kamas.webp', size: 96 },
  quest: { src: '/img/game/mision.webp', size: 70 },
  xp: { src: '/img/game/xp.webp', size: 24 },
  achievement: { src: '/img/game/logro.webp', size: 28 },
  bag: { src: '/img/game/bolsa.webp', size: 24 },
  // El mismo jefe que ilustra Mazmorras en la cabecera (site/nav.ts): 120 × 144px.
  dungeon: { src: '/img/game/jefes/crunchidor.webp', size: 120 },
}

/** El avatar de Torre en sus recomendaciones: 144px, el doble de los 72px a los que se pinta. */
export const TORRE_AVATAR = { src: '/img/torre/avatar.webp', size: 144 }

/** El icono de cada clase de objetivo de misión, en las checklists. */
export const OBJECTIVE_ICONS: Record<QuestObjectiveKind, GameIconFile> = {
  npc: { src: '/img/game/objetivos/npc.webp', size: 64 },
  bring: { src: '/img/game/objetivos/bring.webp', size: 64 },
  map: { src: '/img/game/objetivos/map.webp', size: 64 },
  craft: { src: '/img/game/objetivos/craft.webp', size: 64 },
  free: { src: '/img/game/objetivos/free.webp', size: 64 },
  fight: { src: '/img/game/combate.webp', size: 96 },
}
