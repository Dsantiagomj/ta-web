import { Lexend, Lilita_One, Montserrat, Rowdies } from 'next/font/google'

// next/font descarga las fuentes al compilar y las sirve desde la propia web, con
// métricas de respaldo ajustadas para que el cambio de fuente no mueva el contenido.
// Montserrat es el texto, Rowdies los títulos de página y Lexend la interfaz (DESIGN.md,
// Typography; diseño de color de Torre, opción D).
//
// Montserrat es una fuente variable: Google sirve un solo archivo latin (unos 35 KB) con
// todos los pesos, así que los cinco que usa el texto salen de él. 400 el texto, 600 los
// nombres, 700 las negritas, 800 las cantidades y las coordenadas; 500 los controles y
// chips. Una sola familia con todos sus pesos: el navegador nunca sintetiza una negrita
// (tests/e2e/fonts.spec.ts).
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-montserrat',
  display: 'swap',
})

// Rowdies 700, el h1 de cada página, en mayúsculas. Se precarga: el título es lo primero
// que se lee y, en las páginas sin imagen arriba, el LCP; si llegara tarde, sus mayúsculas
// anchas cambiarían los saltos de línea del título al pintarse (CLS).
const rowdies = Rowdies({
  subsets: ['latin'],
  weight: '700',
  variable: '--font-rowdies',
  display: 'swap',
})

// Lexend, la interfaz: el menú, los botones, los nombres de las tarjetas y los encabezados
// de las partes. Es variable (un archivo para los tres pesos) y no se precarga: son textos
// cortos que el respaldo de métricas ajustadas pinta casi igual mientras llega.
const lexend = Lexend({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-lexend',
  display: 'swap',
  preload: false,
})

// Lilita One, solo para cifras destacadas del catálogo; la pide el navegador cuando algo la
// usa y, mientras, pinta con el respaldo de métricas ajustadas.
const lilitaOne = Lilita_One({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-lilita-one',
  display: 'swap',
  preload: false,
})

export const fontVariables = [montserrat, rowdies, lexend, lilitaOne]
  .map((font) => font.variable)
  .join(' ')
