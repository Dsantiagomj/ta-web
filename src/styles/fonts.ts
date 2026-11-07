import { Lilita_One, Montserrat } from 'next/font/google'

// next/font descarga las fuentes al compilar y las sirve desde la propia web, con
// métricas de respaldo ajustadas para que el cambio de fuente no mueva el contenido.
// Montserrat es el texto y los titulares (DESIGN.md, Typography; guía v5).
//
// Montserrat es una fuente variable: Google sirve un solo archivo latin (unos 35 KB) con
// todos los pesos, así que los cinco que usa la interfaz salen de él y es lo único que se
// precarga. La primera pantalla de una guía ya usa casi todos: 400 el texto, 600 los
// títulos de las columnas y el nombre del PNJ, 700 el título y las negritas, 800 las
// cantidades y las coordenadas; 500 los controles y chips. Una sola familia con todos sus
// pesos: el navegador nunca sintetiza una negrita (tests/e2e/fonts.spec.ts).
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-montserrat',
  display: 'swap',
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

export const fontVariables = [montserrat, lilitaOne].map((font) => font.variable).join(' ')
