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

import { siteShellStrings } from './strings'

const t = siteShellStrings

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
export const DOFUS_GUIDES: NavLink[] = (Object.keys(t.dofus) as (keyof typeof t.dofus)[]).map(
  (slug) => ({ name: t.dofus[slug], href: legacyHref(slug), image: egg(slug) }),
)

export const CHECKLISTS: NavLink[] = [
  {
    name: t.checklistNames.silvestre,
    href: legacyHref('checklist-silvestre'),
    image: { src: '/img/game/checklists/silvestre.webp', size: 200 },
    description: t.checklists.silvestre,
  },
  {
    name: t.checklistNames.hielos,
    href: legacyHref('checklist-dofus-de-los-hielos'),
    image: { src: '/img/game/checklists/hielos.webp', size: 200 },
    description: t.checklists.hielos,
  },
  {
    name: t.checklistNames.ocre,
    href: legacyHref('lista-ocre'),
    image: { src: '/img/game/checklists/ocre.webp', size: 128 },
    description: t.checklists.ocre,
  },
]

// En la web de siempre, Feca y Yopuka llevan un -1 en el slug.
export const CLASSES: NavLink[] = (Object.keys(t.classes) as (keyof typeof t.classes)[]).map(
  (slug) => ({
    name: t.classes[slug],
    href: legacyHref(slug),
    image: head(slug.replace(/-1$/, '')),
  }),
)

export const DUNGEONS: NavLink[] = [
  { name: t.dungeons.acuadomo, href: legacyHref('mazmorra-acuadomo-de-merkator') },
  {
    name: t.dungeons.crocanteria,
    href: legacyHref('mazmorra-crunchidor'),
    image: { src: '/img/game/jefes/crunchidor.webp', size: 120 },
  },
  { name: t.dungeons.fundicion, href: legacyHref('mazmorra-fundicion-de-los-waddictos') },
  { name: t.dungeons.meno, href: legacyHref('mazmorra-nave-del-capitan-meno') },
  { name: t.dungeons.nawidad, href: legacyHref('mazmorras-de-nawidad') },
  { name: t.dungeons.pikabeto, href: legacyHref('pikabeto') },
  { name: t.dungeons.kutulu, href: legacyHref('mazmorra-templo-de-kutulu') },
  { name: t.dungeons.kao, href: legacyHref('mazmorra-templo-del-dios-kao') },
]

// La web de siempre no tiene una página de mazmorras: el enlace general va a la Crocantería,
// la única con el arte de su jefe.
export const SECTIONS: Section[] = [
  {
    key: 'misiones',
    ...t.sections.misiones,
    href: '/metalogros',
    icon: GAME_ICONS.quest,
    accent: 'var(--color-sec-misiones)',
  },
  {
    key: 'dofus',
    ...t.sections.dofus,
    href: legacyHref('guias-dofus'),
    icon: egg('dofus-esmeralda'),
    accent: 'var(--color-sec-dofus)',
  },
  {
    key: 'checklists',
    ...t.sections.checklists,
    href: legacyHref('checklists'),
    icon: CHECKLISTS[0].image!,
    accent: 'var(--color-sec-checklists)',
  },
  {
    key: 'clases',
    ...t.sections.clases,
    href: legacyHref('clases-1'),
    icon: head('feca'),
    accent: 'var(--color-sec-clases)',
  },
  {
    key: 'mazmorras',
    ...t.sections.mazmorras,
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
    name: t.socials.twitch,
    href: 'https://www.twitch.tv/torrentearcano',
    handle: 'torrentearcano',
  },
  { key: 'kick', name: t.socials.kick, href: 'https://kick.com/torretv', handle: 'torretv' },
  {
    key: 'youtube',
    name: t.socials.youtube,
    href: 'https://www.youtube.com/@TorrenteArcano',
    handle: '@TorrenteArcano',
  },
  {
    key: 'discord',
    name: t.socials.discord,
    href: 'https://discord.gg/wgCxwd7b3r',
    handle: 'discord.gg/wgCxwd7b3r',
  },
]

export const social = (key: SocialKey) => SOCIALS.find((s) => s.key === key)!

export const KOFI_URL = 'https://ko-fi.com/torrentearcano'

export const LEGAL_LINKS: NavLink[] = [
  { name: t.legal.notice, href: legacyHref('aviso-legal') },
  { name: t.legal.cookies, href: legacyHref('politica-de-cookies') },
  { name: t.legal.privacy, href: legacyHref('politica-de-privacidad') },
]

export type SearchType = 'mision' | 'seccion' | 'dofus' | 'checklist' | 'clase' | 'mazmorra'

export interface SearchEntry {
  type: SearchType
  name: string
  href: string
  image?: GameImage
  /** La segunda línea del resultado: el nivel y el logro de una misión. */
  detail?: string
}

/**
 * El id del principio de la página, en el <body> del layout: «Volver arriba» enlaza ahí.
 * Al seguirlo, el foco de teclado vuelve a empezar desde arriba, como al cargar la página.
 */
export const TOP_ANCHOR = 'arriba'

/** Lo que enlaza el menú, para la búsqueda de la cabecera. Las misiones llegan aparte. */
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
