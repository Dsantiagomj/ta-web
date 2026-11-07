// Lo que enlazan la cabecera y el pie de todo el sitio (DESIGN.md, Layout: Header y
// Footer). Lo que aún no tiene página aquí enlaza a la web de siempre con su slug.
//
// El arte es del juego, en public/img/game, y se pinta a su tamaño o más pequeño:
// - dofus/: el icono de objeto de cada Dofus en DofusDB (128px).
// - checklists/: el Dofus de cada checklist, de DofusDB (Silvestre y Hielos a 200px, Ocre a 128px).
// - clases/: las cabezas de clase de la exportación del cliente de Dofus 3
//   (dofusdude/dofus3-main 3.7.13.17, class_head_images_64): 64px.
// - jefes/crunchidor.webp: el Crunchidor de DofusDB, reducido a 120px de ancho. Las otras
//   siete mazmorras aún no tienen el arte de su jefe y llevan el icono de una puerta.

import { GAME_ICONS } from '@/components/game/game-icons'
import { legacyHref } from '@/lib/site/legacy'

export interface GameImage {
  src: string
  /** El tamaño del archivo, el máximo al que se pinta. */
  size: number
}

export interface NavLink {
  name: string
  href: string
  image?: GameImage
  description?: string
}

export type SectionKey = 'misiones' | 'dofus' | 'checklists' | 'clases' | 'mazmorras'

export interface Section {
  key: SectionKey
  /** El nombre corto, el del botón del menú. */
  label: string
  /** El nombre completo, el del pie y la ficha del panel. */
  title: string
  href: string
  icon: GameImage
  /** El acento de la sección (DESIGN.md, Section accents). */
  accent: string
}

const egg = (slug: string): GameImage => ({ src: `/img/game/dofus/${slug}.webp`, size: 128 })
const head = (slug: string): GameImage => ({ src: `/img/game/clases/${slug}.webp`, size: 64 })

// El orden de la web de siempre: el de la guía de Dofus de Torre.
export const DOFUS_GUIDES: NavLink[] = [
  ['dofawa', 'Dofawa'],
  ['dofus-plateado', 'Dofus Plateado'],
  ['dofus-cacao', 'Dofus Cacao'],
  ['dofus-zanahowia', 'Dofus Zanahowia'],
  ['dosaurio', 'Dosaurio'],
  ['dokoko', 'Dokoko'],
  ['dofus-esmeralda', 'Dofus Esmeralda'],
  ['dofus-vigilante', 'Dofus de los Vigilantes'],
  ['dofus-purpura', 'Dofus Púrpura'],
  ['domakuro', 'Domakuro'],
  ['dorigami', 'Dorigami'],
  ['dofus-turquesa', 'Dofus Turquesa'],
  ['dofus-ocre', 'Dofus Ocre'],
  ['dofus-vulbis', 'Dofus Vulbis'],
  ['dofus-de-los-hielos', 'Dofus de los Hielos'],
  ['dofus-moteado', 'Dofus Moteado'],
  ['dofus-ebano', 'Dofus Ébano'],
  ['dofus-marfil', 'Dofus Marfil'],
  ['dofus-abisal', 'Dofus Abisal'],
].map(([slug, name]) => ({ name, href: legacyHref(slug), image: egg(slug) }))

export const CHECKLISTS: NavLink[] = [
  {
    name: 'Dofus Silvestre',
    href: legacyHref('checklist-silvestre'),
    image: { src: '/img/game/checklists/silvestre.webp', size: 200 },
    description: '100 pasos con la guía de Sandglass',
  },
  {
    name: 'Dofus de los Hielos',
    href: legacyHref('checklist-dofus-de-los-hielos'),
    image: { src: '/img/game/checklists/hielos.webp', size: 200 },
    description: '70 pasos, de la isla de Frigost al final',
  },
  {
    name: 'Almas del Ocre',
    href: legacyHref('lista-ocre'),
    image: { src: '/img/game/checklists/ocre.webp', size: 128 },
    description: 'Las almas de la eterna cosecha, una a una',
  },
]

// En la web de siempre, Feca y Yopuka llevan un -1 en el slug.
export const CLASSES: NavLink[] = [
  ['aniripsa', 'Aniripsa'],
  ['anutrof', 'Anutrof'],
  ['feca-1', 'Feca'],
  ['forjalanza', 'Forjalanza'],
  ['hipermago', 'Hipermago'],
  ['ocra', 'Ocra'],
  ['osamodas', 'Osamodas'],
  ['pandawa', 'Pandawa'],
  ['sacrogrito', 'Sacrógrito'],
  ['sadida', 'Sadida'],
  ['selotrop', 'Selotrop'],
  ['sram', 'Sram'],
  ['steamer', 'Steamer'],
  ['tymador', 'Tymador'],
  ['uginak', 'Uginak'],
  ['xelor', 'Xelor'],
  ['yopuka-1', 'Yopuka'],
  ['zobal', 'Zobal'],
  ['zurcarak', 'Zurcarák'],
].map(([slug, name]) => ({ name, href: legacyHref(slug), image: head(slug.replace(/-1$/, '')) }))

export const DUNGEONS: NavLink[] = [
  { name: 'Acuadomo de Merkator', href: legacyHref('mazmorra-acuadomo-de-merkator') },
  {
    name: 'Crocantería',
    href: legacyHref('mazmorra-crunchidor'),
    image: { src: '/img/game/jefes/crunchidor.webp', size: 120 },
  },
  { name: 'Fundición de los waddictos', href: legacyHref('mazmorra-fundicion-de-los-waddictos') },
  { name: 'Nave del Capitán Meno', href: legacyHref('mazmorra-nave-del-capitan-meno') },
  { name: 'Nawidad', href: legacyHref('mazmorras-de-nawidad') },
  { name: 'Pikabeto', href: legacyHref('pikabeto') },
  { name: 'Templo de Kutulú', href: legacyHref('mazmorra-templo-de-kutulu') },
  { name: 'Templo del Dios Kao', href: legacyHref('mazmorra-templo-del-dios-kao') },
]

// La web de siempre no tiene una página de mazmorras: el enlace general va a la Crocantería,
// la única con el arte de su jefe.
export const SECTIONS: Section[] = [
  {
    key: 'misiones',
    label: 'Misiones',
    title: 'Misiones y logros',
    href: legacyHref('metalogros'),
    icon: GAME_ICONS.quest,
    accent: 'var(--color-sec-misiones)',
  },
  {
    key: 'dofus',
    label: 'Dofus',
    title: 'Dofus',
    href: legacyHref('guias-dofus'),
    icon: egg('dofus-esmeralda'),
    accent: 'var(--color-sec-dofus)',
  },
  {
    key: 'checklists',
    label: 'Checklists',
    title: 'Checklists',
    href: legacyHref('checklists'),
    icon: CHECKLISTS[0].image!,
    accent: 'var(--color-sec-checklists)',
  },
  {
    key: 'clases',
    label: 'Clases',
    title: 'Clases',
    href: legacyHref('clases-1'),
    icon: head('feca'),
    accent: 'var(--color-sec-clases)',
  },
  {
    key: 'mazmorras',
    label: 'Mazmorras',
    title: 'Mazmorras',
    href: DUNGEONS[1].href,
    icon: DUNGEONS[1].image!,
    accent: 'var(--color-sec-mazmorras)',
  },
]

export const section = (key: SectionKey) => SECTIONS.find((s) => s.key === key)!

export type SocialKey = 'twitch' | 'kick' | 'youtube' | 'discord'

export interface Social {
  key: SocialKey
  name: string
  href: string
  handle: string
}

export const SOCIALS: Social[] = [
  {
    key: 'twitch',
    name: 'Twitch',
    href: 'https://www.twitch.tv/torrentearcano',
    handle: 'torrentearcano',
  },
  { key: 'kick', name: 'Kick', href: 'https://kick.com/torretv', handle: 'torretv' },
  {
    key: 'youtube',
    name: 'YouTube',
    href: 'https://www.youtube.com/@TorrenteArcano',
    handle: '@TorrenteArcano',
  },
  { key: 'discord', name: 'Discord', href: 'https://discord.gg/wgCxwd7b3r', handle: 'Comunidad' },
]

export const social = (key: SocialKey) => SOCIALS.find((s) => s.key === key)!

export const KOFI_URL = 'https://ko-fi.com/torrentearcano'

export const LEGAL_LINKS: NavLink[] = [
  { name: 'Aviso legal', href: legacyHref('aviso-legal') },
  { name: 'Política de cookies', href: legacyHref('politica-de-cookies') },
  { name: 'Política de privacidad', href: legacyHref('politica-de-privacidad') },
]

export type SearchType = 'seccion' | 'dofus' | 'checklist' | 'clase' | 'mazmorra'

export interface SearchEntry {
  type: SearchType
  name: string
  href: string
  image?: GameImage
}

/** Lo que encuentra la búsqueda de la cabecera mientras no hay búsqueda de guías. */
export function searchIndex(): SearchEntry[] {
  const of = (type: SearchType, links: NavLink[]) =>
    links.map(({ name, href, image }) => ({ type, name, href, image }))
  return [
    ...SECTIONS.map(({ title, href, icon }) => ({
      type: 'seccion' as const,
      name: title,
      href,
      image: icon,
    })),
    ...of('dofus', DOFUS_GUIDES),
    ...of('checklist', CHECKLISTS),
    ...of('clase', CLASSES),
    ...of('mazmorra', DUNGEONS),
  ]
}
