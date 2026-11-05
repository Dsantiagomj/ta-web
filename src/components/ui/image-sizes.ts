/**
 * El atributo sizes de cada sitio donde va una imagen con varios anchos (DESIGN.md,
 * Imagery): cuánto ocupa en la ventana, para que el navegador elija el archivo.
 */
export const IMAGE_SIZES = {
  // Columna de lectura (--width-prose, 800px) más los márgenes laterales de 24px, que caben
  // desde 53rem (848px); por debajo, la ventana menos los márgenes de 16px.
  prose: '(min-width: 53rem) 800px, calc(100vw - 2rem)',
  // Arte de cabecera: a sangre, de borde a borde.
  hero: '100vw',
  // Arte de la tarjeta de la siguiente misión: 240px desde 640px; debajo, a lo ancho.
  card: '(min-width: 40rem) 240px, calc(100vw - 2rem)',
} as const
