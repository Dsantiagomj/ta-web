import { Barlow, Barlow_Condensed, Lilita_One } from 'next/font/google'

// next/font descarga las fuentes al compilar y las sirve desde la propia web, con
// métricas de respaldo ajustadas para que el cambio de fuente no mueva el contenido.
//
// Se precargan solo dos archivos: Barlow 400, el texto, y Barlow Condensed 800, los
// titulares (la cabecera de la guía y el titular de la portada). Una fuente precargada se
// descarga siempre y compite con el CSS y con la imagen LCP por la red; con los seis pesos
// precargados, la primera captura de una guía tardaba 1,8 s en bajar en 4G lento. Los
// demás pesos (Barlow 500, 600 y 700, Barlow Condensed 700) y Lilita One los pide el
// navegador cuando algo los usa y, mientras, pinta con el respaldo de métricas ajustadas.
//
// next/font precarga por instancia, no por peso, así que cada familia va en dos
// instancias: la del peso precargado y la del resto. Turbopack declara las dos con el
// mismo nombre de familia ("Barlow", "Barlow Condensed"), así que el navegador ve una sola
// familia con todos sus pesos y elige el archivo de cada peso: nunca sintetiza una
// negrita. tests/e2e/fonts.spec.ts lo comprueba en la página.
const barlow = Barlow({
  subsets: ['latin'],
  // 400: el texto del primer pintado.
  weight: '400',
  variable: '--font-barlow',
  display: 'swap',
})

const barlowOnDemand = Barlow({
  subsets: ['latin'],
  // 500 y 600 controles y chips, 700 las negritas del cuerpo.
  weight: ['500', '600', '700'],
  variable: '--font-barlow-on-demand',
  display: 'swap',
  preload: false,
})

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  // 800: hero a 2xl en la escala de DESIGN.md.
  weight: '800',
  variable: '--font-barlow-condensed',
  display: 'swap',
})

const barlowCondensedOnDemand = Barlow_Condensed({
  subsets: ['latin'],
  // 700: xl, eyebrow y micro.
  weight: '700',
  variable: '--font-barlow-condensed-on-demand',
  display: 'swap',
  preload: false,
})

const lilitaOne = Lilita_One({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-lilita-one',
  display: 'swap',
  preload: false,
})

// Las variables de las instancias bajo demanda también van en <html>: así su CSS, con las
// @font-face de esos pesos, entra en la página. Los estilos solo usan --font-barlow y
// --font-barlow-condensed, que nombran la familia entera.
export const fontVariables = [
  barlow,
  barlowOnDemand,
  barlowCondensed,
  barlowCondensedOnDemand,
  lilitaOne,
]
  .map((font) => font.variable)
  .join(' ')
