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
//
// Los de Dofus 3 salen de las exportaciones del cliente de dofusdude/dofus3-main
// (versión 3.7.13.17): statistics_images_96, ui_guidebook_images y misc_images. La flecha
// de XP, la bolsa del inventario y el trofeo solo existen a 24 y 28px: se pintan a ese
// tamaño, sin ampliar.

export type GameIconName = 'combat' | 'kamas' | 'quest' | 'xp' | 'achievement' | 'bag'

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
}

/** El avatar de Torre en sus recomendaciones: 144px, el doble de los 72px a los que se pinta. */
export const TORRE_AVATAR = { src: '/img/torre/avatar.webp', size: 144 }
