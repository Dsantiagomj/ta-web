// El marco de las páginas (DESIGN.md, Layout): el margen lateral y el ancho del contenido a
// cada ancho de ventana. Los márgenes son de 16px en el móvil y 24px en la tableta; desde
// 1024px crecen con la ventana, el 5 % de su ancho entre 3rem y 8rem (con la raíz al 110 %:
// 52,8px y 140,8px). El contenido no pasa de 110rem (1936px): en una pantalla más ancha va
// centrado y los fondos siguen de borde a borde.

const ROOT = 17.6

/** El ancho máximo del contenido: 110rem con la raíz al 110 %. */
export const FRAME_MAX = 110 * ROOT

/** El margen lateral a ese ancho de ventana. */
export function gutter(width: number) {
  if (width < 640) return 16
  if (width < 1024) return 24
  return Math.min(Math.max(3 * ROOT, 0.05 * width), 8 * ROOT)
}

/** Dónde empieza y acaba el contenido de la página a ese ancho de ventana. */
export function frame(width: number) {
  const content = Math.min(width - 2 * gutter(width), FRAME_MAX)
  const left = (width - content) / 2
  return { left, right: width - left, width: content }
}
