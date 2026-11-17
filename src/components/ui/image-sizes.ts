/**
 * El atributo sizes de cada sitio donde va una imagen con varios anchos (DESIGN.md,
 * Imagery): cuánto ocupa en la ventana, para que el navegador elija el archivo.
 */
export const IMAGE_SIZES = {
  // Las capturas sueltas de la prosa y el vídeo (--width-media): 55rem. Desde 64rem la raíz
  // es el 110 %, así que miden 968px y los márgenes de 3rem, 52,8px; hasta que caben enteras
  // (1073,6px), la ventana menos los márgenes. Entre 928px y 1024px, 880px; por debajo, la ventana menos los
  // márgenes de 24px y, en el móvil, menos los de 16px. Las media queries de sizes van en rem
  // de 16px, como las del CSS.
  prose:
    '(min-width: 67.1rem) 968px, (min-width: 64rem) calc(100vw - 106px), ' +
    '(min-width: 58rem) 880px, (min-width: 40rem) calc(100vw - 48px), calc(100vw - 32px)',
  // Las capturas de un paso desde 40rem (DESIGN.md, Steps): dos por fila, de media columna
  // menos la mitad del hueco de 1rem (17,6px con la raíz al 110 %), hasta que cada una llega
  // a 36rem (633,6px), con la ventana a 1390,4px; desde ahí la fila mete más capturas, todas
  // de 36rem, así que ninguna pasa de 634px en ninguna pantalla. En el móvil, una por fila.
  // A 2x pide 1268px: la variante de 1600.
  half:
    '(min-width: 86.9rem) 634px, (min-width: 64rem) calc(50vw - 62px), ' +
    '(min-width: 40rem) calc(50vw - 32px), calc(100vw - 32px)',
  // Arte de cabecera: a sangre, de borde a borde.
  hero: '100vw',
  // Arte de la tarjeta de la siguiente misión (guía v5): 280px desde 640px; debajo, a lo
  // ancho de la columna, la ventana menos los márgenes de 16px.
  card: '(min-width: 40rem) 280px, calc(100vw - 32px)',
} as const
