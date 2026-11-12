/**
 * El tamaño de un icono del juego para --icon: en rem, para que crezca con la fuente raíz
 * (110 % desde 64rem). Un archivo que ya se pinta a su tamaño (la flecha de XP, la bolsa,
 * el trofeo) no pasa de él: nunca se amplía borroso (DESIGN.md, Icon wells).
 */
export function iconSize(px: number, fileSize: number): string {
  const rem = `${px / 16}rem`
  return fileSize > px ? rem : `min(${rem}, ${px}px)`
}
