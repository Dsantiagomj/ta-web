/**
 * El atributo sizes de cada sitio donde va una imagen con varios anchos (DESIGN.md,
 * Imagery): cuánto ocupa en la ventana, para que el navegador elija el archivo.
 */
export const IMAGE_SIZES = {
  // Las capturas sueltas de la prosa (--width-media): 55rem. Desde 64rem la raíz
  // es el 110 %, así que miden 968px y los márgenes de 3rem, 52,8px; hasta que caben enteras
  // (1073,6px), la ventana menos los márgenes. Entre 928px y 1024px, 880px; por debajo, la ventana menos los
  // márgenes de 24px y, en el móvil, menos los de 16px. Las media queries de sizes van en rem
  // de 16px, como las del CSS.
  prose:
    '(min-width: 67.1rem) 968px, (min-width: 64rem) calc(100vw - 106px), ' +
    '(min-width: 58rem) 880px, (min-width: 40rem) calc(100vw - 48px), calc(100vw - 32px)',
  // Tres o más capturas de un paso desde 40rem (DESIGN.md, Steps): columnas que llenan la fila del
  // paso, la ventana menos los márgenes (3rem, 52,8px desde 64rem; 24px y 16px debajo), con
  // huecos de 1rem (17,6px con la raíz al 110 %). Dos columnas; tres desde que la fila mide
  // 81rem (1425,6px, ventana de 1531,2px), cuatro desde 122rem (2147,2px, ventana de
  // 2252,8px) y cinco desde 163rem (2868,8px, ventana de 2974,4px): ninguna pasa de 40rem
  // (704px). En el móvil, una por fila. A 2x piden como mucho 1408px: la variante de 1600.
  half:
    '(min-width: 185.9rem) calc(20vw - 35px), (min-width: 140.8rem) calc(25vw - 40px), ' +
    '(min-width: 95.7rem) calc(33.33vw - 47px), (min-width: 64rem) calc(50vw - 62px), ' +
    '(min-width: 40rem) calc(50vw - 32px), calc(100vw - 32px)',
  // Una pareja: media fila menos medio hueco en cualquier pantalla; la segunda acaba en el
  // margen derecho. A 2560px, 1218px (2437 a 2x: la variante de 1600).
  pair: '(min-width: 64rem) calc(50vw - 62px), (min-width: 40rem) calc(50vw - 32px), calc(100vw - 32px)',
  // Una sola: media fila, hasta 36rem (633,6px), el tamaño de la web anterior, que alcanza
  // con la ventana a 1390,4px.
  single:
    '(min-width: 86.9rem) 634px, (min-width: 64rem) calc(50vw - 62px), ' +
    '(min-width: 40rem) calc(50vw - 32px), calc(100vw - 32px)',
  // El vídeo (--width-video, 81rem: 1425,6px desde 64rem): la columna menos los márgenes
  // hasta que cabe entero, con la ventana a 1531,2px.
  video:
    '(min-width: 95.7rem) 1426px, (min-width: 64rem) calc(100vw - 106px), ' +
    '(min-width: 40rem) calc(100vw - 48px), calc(100vw - 32px)',
  // Arte de cabecera: a sangre, de borde a borde.
  hero: '100vw',
  // Arte de la tarjeta de la siguiente misión (guía v5): 280px desde 640px; debajo, a lo
  // ancho de la columna, la ventana menos los márgenes de 16px.
  card: '(min-width: 40rem) 280px, calc(100vw - 32px)',
} as const
