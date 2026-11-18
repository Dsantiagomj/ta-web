import localFont from 'next/font/local'

// Las fuentes viven en el repositorio (src/styles/fonts/, con su licencia): next/font/local
// las sirve desde la propia web y el build no sale a la red. Con next/font/google cada build
// las descargaba de Google y, cuando Google fallaba, el build entero caía. Son los mismos
// archivos woff2 que servía Google, solo el subconjunto latin (README.md de la carpeta).
// Montserrat es el texto, Rowdies los títulos de página y Lexend la interfaz (DESIGN.md,
// Typography; diseño de color de Torre, opción D).
//
// Turbopack nombra la familia como la constante: «Montserrat» en el CSS es este nombre, y
// las pruebas E2E lo leen así. El rango latin es el de Google, para que un carácter de otro
// alfabeto use el respaldo como antes.
//
// Respaldo de métricas ajustadas: next/font/local calcularía otros valores desde el archivo
// (Montserrat: size-adjust 110,19 % en vez de 112,83 %), así que se apaga y cada familia usa
// «<Familia> Fallback», declarada en fonts-fallback.css con los valores que generaba
// next/font/google. Así el cambio de fuente mueve el contenido igual que antes (CLS).

// Montserrat es una fuente variable: un solo archivo latin (unos 35 KB) con todos los pesos,
// así que los cinco que usa el texto salen de él. 400 el texto, 600 los nombres, 700 las
// negritas, 800 las cantidades y las coordenadas; 500 los controles y chips. Una sola familia
// con todos sus pesos: el navegador nunca sintetiza una negrita (tests/e2e/fonts.spec.ts).
const Montserrat = localFont({
  src: [
    { path: './fonts/montserrat-latin.woff2', weight: '400', style: 'normal' },
    { path: './fonts/montserrat-latin.woff2', weight: '500', style: 'normal' },
    { path: './fonts/montserrat-latin.woff2', weight: '600', style: 'normal' },
    { path: './fonts/montserrat-latin.woff2', weight: '700', style: 'normal' },
    { path: './fonts/montserrat-latin.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-montserrat',
  display: 'swap',
  adjustFontFallback: false,
  fallback: ['Montserrat Fallback'],
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
    },
  ],
})

// Rowdies 700, el h1 de cada página, en mayúsculas. Se precarga: el título es lo primero
// que se lee y, en las páginas sin imagen arriba, el LCP; si llegara tarde, sus mayúsculas
// anchas cambiarían los saltos de línea del título al pintarse (CLS).
const Rowdies = localFont({
  src: [{ path: './fonts/rowdies-700-latin.woff2', weight: '700', style: 'normal' }],
  variable: '--font-rowdies',
  display: 'swap',
  adjustFontFallback: false,
  fallback: ['Rowdies Fallback'],
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
    },
  ],
})

// Lexend, la interfaz: el menú, los botones, los nombres de las tarjetas y los encabezados
// de las partes. Es variable (un archivo para los tres pesos) y no se precarga: son textos
// cortos que el respaldo de métricas ajustadas pinta casi igual mientras llega.
const Lexend = localFont({
  src: [
    { path: './fonts/lexend-latin.woff2', weight: '500', style: 'normal' },
    { path: './fonts/lexend-latin.woff2', weight: '600', style: 'normal' },
    { path: './fonts/lexend-latin.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-lexend',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  fallback: ['Lexend Fallback'],
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
    },
  ],
})

// Lilita One, solo para cifras destacadas del catálogo; la pide el navegador cuando algo la
// usa y, mientras, pinta con el respaldo de métricas ajustadas. Su familia en el CSS es
// «LilitaOne» (el nombre de la constante); solo se usa por --font-lilita-one.
const LilitaOne = localFont({
  src: [{ path: './fonts/lilita-one-400-latin.woff2', weight: '400', style: 'normal' }],
  variable: '--font-lilita-one',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  fallback: ['Lilita One Fallback'],
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
    },
  ],
})

export const fontVariables = [Montserrat, Rowdies, Lexend, LilitaOne]
  .map((font) => font.variable)
  .join(' ')
