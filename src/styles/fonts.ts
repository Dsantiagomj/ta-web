import { Barlow, Barlow_Condensed, Lilita_One } from 'next/font/google'

// next/font descarga las fuentes al compilar y las sirve desde la propia web, con
// métricas de respaldo ajustadas para que el cambio de fuente no mueva el contenido.
const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
  display: 'swap',
})

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-barlow-condensed',
  display: 'swap',
})

const lilitaOne = Lilita_One({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-lilita-one',
  display: 'swap',
})

export const fontVariables = [barlow.variable, barlowCondensed.variable, lilitaOne.variable].join(
  ' ',
)
