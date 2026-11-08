// El arte de la portada: archivos estáticos de public/img (AGENTS.md, Media), ya en AVIF y
// WebP a los anchos que pide la maquetación. Los de public/img/inicio los genera
// scripts/build-home-images.ts; los iconos y los huevos son los del menú (public/img/game).

import type { ImageAsset } from '@/components/ui/types'

/** Un arte con sus anchos en public/img/inicio, en AVIF y WebP; la proporción da el alto. */
function art(name: string, widths: number[], ratio: number): ImageAsset {
  const at = (width: number, ext: string) => `/img/inicio/${name}-${width}.${ext}`
  const widest = widths.at(-1)!
  return {
    src: at(widest, 'webp'),
    avif: at(widest, 'avif'),
    width: widest,
    height: Math.round(widest / ratio),
    srcSet: widths.map((width) => ({ src: at(width, 'webp'), width })),
    avifSrcSet: widths.map((width) => ({ src: at(width, 'avif'), width })),
  }
}

/** La isla flotante del Krosmoz, la imagen principal de la portada en el móvil. */
export const KROSMOZ = art('krosmoz', [480, 640, 960], 960 / 417)

/** Torre sobre la pregunta del hero, a 1x y 2x de sus 172px como mucho. */
export const TORRE_ASK = art('torre-pregunta', [172, 344], 1)

/** Los seis Dofus primordiales alrededor de la isla, con su sitio y su profundidad. */
export const ORBS = [
  { slug: 'dofus-esmeralda', x: '50%', y: '8%' },
  { slug: 'dofus-purpura', x: '86%', y: '24%' },
  { slug: 'dofus-turquesa', x: '88%', y: '72%' },
  { slug: 'dofus-ocre', x: '54%', y: '93%' },
  { slug: 'dofus-ebano', x: '13%', y: '76%' },
  { slug: 'dofus-marfil', x: '11%', y: '26%' },
].map((orb, i) => ({ ...orb, src: `/img/game/dofus/${orb.slug}.webp`, delay: `${i / 10}s` }))
