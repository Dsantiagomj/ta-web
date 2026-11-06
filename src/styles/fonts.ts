import { Fredoka, Lilita_One, Nunito } from 'next/font/google'

// next/font descarga las fuentes al compilar y las sirve desde la propia web, con
// métricas de respaldo ajustadas para que el cambio de fuente no mueva el contenido.
// Nunito es el texto y Fredoka los titulares (DESIGN.md, Typography; guía v4).
//
// Se precargan solo dos archivos: Nunito 400, el texto, y Fredoka 600, los titulares (el
// título de la guía y el de la portada). Una fuente precargada se descarga siempre y
// compite con el CSS y con la imagen LCP por la red; con seis pesos precargados, la primera
// captura de una guía tardaba 1,8 s en bajar en 4G lento. Los demás pesos (Nunito 500, 600,
// 700 y 800, Fredoka 500) y Lilita One los pide el navegador cuando algo los usa y,
// mientras, pinta con el respaldo de métricas ajustadas.
//
// next/font precarga por instancia, no por peso, así que cada familia va en dos
// instancias: la del peso precargado y la del resto. Turbopack declara las dos con el
// mismo nombre de familia ("Nunito", "Fredoka"), así que el navegador ve una sola familia
// con todos sus pesos y elige el archivo de cada peso: nunca sintetiza una negrita.
// tests/e2e/fonts.spec.ts lo comprueba en la página.
const nunito = Nunito({
  subsets: ['latin'],
  // 400: el texto del primer pintado.
  weight: '400',
  variable: '--font-nunito',
  display: 'swap',
})

const nunitoOnDemand = Nunito({
  subsets: ['latin'],
  // 500 y 600 controles y chips, 700 las negritas del cuerpo, 800 cantidades y coordenadas.
  weight: ['500', '600', '700', '800'],
  variable: '--font-nunito-on-demand',
  display: 'swap',
  preload: false,
})

const fredoka = Fredoka({
  subsets: ['latin'],
  // 600: los titulares, de la marca al título de la guía.
  weight: '600',
  variable: '--font-fredoka',
  display: 'swap',
})

const fredokaOnDemand = Fredoka({
  subsets: ['latin'],
  // 500: la navegación.
  weight: '500',
  variable: '--font-fredoka-on-demand',
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
// @font-face de esos pesos, entra en la página. Los estilos solo usan --font-nunito y
// --font-fredoka, que nombran la familia entera.
export const fontVariables = [nunito, nunitoOnDemand, fredoka, fredokaOnDemand, lilitaOne]
  .map((font) => font.variable)
  .join(' ')
