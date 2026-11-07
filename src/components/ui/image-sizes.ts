/**
 * El atributo sizes de cada sitio donde va una imagen con varios anchos (DESIGN.md,
 * Imagery): cuánto ocupa en la ventana, para que el navegador elija el archivo.
 */
export const IMAGE_SIZES = {
  // La columna de lectura de la guía (guía v5): 880px desde 928px; por debajo, la ventana
  // menos los márgenes de 24px y, en el móvil, menos los de 16px.
  prose: '(min-width: 58rem) 880px, (min-width: 40rem) calc(100vw - 48px), calc(100vw - 32px)',
  // Arte de cabecera: a sangre, de borde a borde.
  hero: '100vw',
  // Arte de la tarjeta de la siguiente misión: 240px desde 640px; debajo, a lo ancho.
  card: '(min-width: 40rem) 240px, calc(100vw - 2rem)',
} as const
