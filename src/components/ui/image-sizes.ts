/**
 * El atributo sizes de cada sitio donde va una imagen con varios anchos (DESIGN.md,
 * Imagery): cuánto ocupa en la ventana, para que el navegador elija el archivo.
 */
export const IMAGE_SIZES = {
  // La fila del contenido (DESIGN.md, Layout): la ventana menos los márgenes de 16px en el
  // móvil y 24px en la tableta; desde 64rem (raíz al 110 %), el 90 % de la ventana, porque el
  // margen es el 5 % (3rem, 52,8px, entre 1024 y 1056px: sizes da 3px de más ahí), hasta que
  // el contenido llega a 110rem (1936px) con la ventana a 2151px. Las media queries de sizes
  // van en rem de 16px, como las del CSS.
  //
  // Las capturas sueltas de la prosa (--width-media, 55rem): 968px desde que caben enteras
  // (ventana de 1075,6px); entre 928px y 1024px, 880px.
  prose:
    '(min-width: 67.3rem) 968px, (min-width: 64rem) 90vw, ' +
    '(min-width: 58rem) 880px, (min-width: 40rem) calc(100vw - 48px), calc(100vw - 32px)',
  // Tres o más capturas de un paso desde 40rem (DESIGN.md, Steps): columnas que llenan la fila
  // con huecos de 1rem (17,6px con la raíz al 110 %). Dos columnas; tres desde que la fila
  // mide 81rem (1425,6px, ventana de 1584px). Con el contenido parado en 110rem (ventana de
  // 2152px) son tres de 634px: la fila nunca llega a las 122rem de la cuarta. Ninguna pasa de
  // 40rem (704px); a 2x piden como mucho 1408px: la variante de 1600. En el móvil, una por
  // fila.
  half:
    '(min-width: 134.5rem) 634px, (min-width: 99rem) calc(30vw - 12px), ' +
    '(min-width: 64rem) calc(45vw - 9px), ' +
    '(min-width: 40rem) calc(50vw - 32px), calc(100vw - 32px)',
  // Una pareja: media fila menos medio hueco en cualquier pantalla; la segunda acaba en el
  // margen derecho. Con el contenido parado en 110rem, 959px (1918 a 2x: la variante de 1600).
  pair:
    '(min-width: 134.5rem) 959px, (min-width: 64rem) calc(45vw - 9px), ' +
    '(min-width: 40rem) calc(50vw - 32px), calc(100vw - 32px)',
  // Una sola: media fila, hasta 36rem (633,6px), el tamaño de la web anterior, que alcanza
  // con la ventana a 1427,6px.
  single:
    '(min-width: 89.3rem) 634px, (min-width: 64rem) calc(45vw - 9px), ' +
    '(min-width: 40rem) calc(50vw - 32px), calc(100vw - 32px)',
  // El vídeo (--width-video, 81rem: 1425,6px desde 64rem): la fila hasta que cabe entero,
  // con la ventana a 1584px.
  video:
    '(min-width: 99rem) 1426px, (min-width: 64rem) 90vw, ' +
    '(min-width: 40rem) calc(100vw - 48px), calc(100vw - 32px)',
  // Arte de cabecera: a sangre, de borde a borde.
  hero: '100vw',
  // Arte de la tarjeta de la siguiente misión (guía v5): 280px desde 640px; debajo, a lo
  // ancho de la columna, la ventana menos los márgenes de 16px.
  card: '(min-width: 40rem) 280px, calc(100vw - 32px)',
} as const
