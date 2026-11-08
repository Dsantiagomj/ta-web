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

/** La plaza de Astrub, el fondo del cartel de las misiones. */
export const ASTRUB = art('astrub', [480, 800, 1200, 1600], 1600 / 695)

/** Los cuatro «PNJ representativos» del índice de metalogros, de pie en la plaza. */
export const CAST = [
  art('npc-2205', [414], 414 / 480), // Meriana
  art('npc-4355', [244], 244 / 480), // Enviada de los Doce
  art('npc-4356', [238], 238 / 480), // Paula Sepe
  art('npc-6167', [185], 185 / 480), // Draconiros
]

/** Tres huevos de Dofus con guía que no salen en otra parte de la portada. */
export const DOFUS_TRIO = ['dofawa', 'dosaurio', 'dofus-abisal'].map(
  (slug) => `/img/game/dofus/${slug}.webp`,
)

/** Seis cabezas de clase, como las pinta el panel de Clases (64px). */
export const CLASS_HEADS = ['yopuka', 'feca', 'ocra', 'aniripsa', 'sram', 'zurcarak'].map(
  (slug) => `/img/game/clases/${slug}.webp`,
)

/** La última sala de la Crocantería y su jefe, el Crunchidor. */
export const CROCANTERIA = art('crocanteria', [480, 960], 960 / 505)
export const CRUNCHIDOR = art('crunchidor', [334], 334 / 400)

/** La guía de «Seis pies bajo tierra» en pequeño: Hupe Esse, la captura y los objetos. */
export const GIVER_RIGHT = art('npc-4412-se', [168], 168 / 362)
export const GIVER_LEFT = art('npc-4412-so', [100], 100 / 215)
export const STEP_SHOT = art('guia-paso', [480, 800], 800 / 551)
export const REWARD_ITEMS = [
  { id: 366, name: 'Pico de tofu' },
  { id: 373, name: 'Intestino de araknáusea' },
  { id: 388, name: 'Pelos de arakna enferma' },
  { id: 2491, name: 'Ojo de arakmutada' },
].map((item) => ({ ...item, image: art(`item-${item.id}`, [64], 1) }))

/** El retrato de Torre en «Las guías son de Torre». */
export const TORRE = art('torre', [256, 512], 1)
