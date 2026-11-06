/**
 * El atributo sizes de cada sitio donde va una imagen con varios anchos (DESIGN.md,
 * Imagery): cuánto ocupa en la ventana, para que el navegador elija el archivo.
 */
export const IMAGE_SIZES = {
  // La columna de los pasos (guía v4): 852px desde 1152px, junto a la lista «Pasos»; por
  // debajo, la ventana menos los márgenes y el número del paso (108px) y, en el móvil, donde
  // la captura va a todo el ancho, menos los márgenes de 16px.
  prose: '(min-width: 72rem) 852px, (min-width: 40rem) calc(100vw - 108px), calc(100vw - 2rem)',
  // Arte de cabecera: a sangre, de borde a borde.
  hero: '100vw',
  // Arte de la tarjeta de la siguiente misión: 240px desde 640px; debajo, a lo ancho.
  card: '(min-width: 40rem) 240px, calc(100vw - 2rem)',
} as const
