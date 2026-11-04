import { Barlow, Barlow_Condensed, Lilita_One } from 'next/font/google'

// next/font descarga las fuentes al compilar y las sirve desde la propia web, con
// métricas de respaldo ajustadas para que el cambio de fuente no mueva el contenido.
//
// Se precargan solo las familias del primer pintado: Barlow Condensed (titular, que es
// el LCP, cabecera y etiquetas) y Barlow (el texto). Sin precargar Barlow, su cambio
// de fuente mueve el párrafo de la portada (CLS). Una fuente precargada se descarga
// siempre, se use o no, y compite con el CSS que bloquea el pintado; Lilita One la
// pide el navegador cuando un número la usa y, mientras, pinta con el respaldo.
const barlow = Barlow({
  subsets: ['latin'],
  // 400 texto, 500 y 600 controles y chips, 700 las negritas del cuerpo.
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
  display: 'swap',
})

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  // Los pesos display de la escala de DESIGN.md: 700 (xl, eyebrow, micro) y 800 (hero a 2xl).
  weight: ['700', '800'],
  variable: '--font-barlow-condensed',
  display: 'swap',
})

const lilitaOne = Lilita_One({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-lilita-one',
  display: 'swap',
  preload: false,
})

export const fontVariables = [barlow.variable, barlowCondensed.variable, lilitaOne.variable].join(
  ' ',
)
