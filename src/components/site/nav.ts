// Lo que enlazan la cabecera y el pie de todo el sitio (DESIGN.md, Layout: Header y
// Footer). Lo que aún no tiene página aquí enlaza a la web de siempre con su slug.
//
// El arte es del juego, en public/img/game, y se pinta a su tamaño o más pequeño:
// - dofus/: el icono de objeto de algunos Dofus en DofusDB (128px), para el arte del menú. La
//   lista de los Dofus sale de la colección de guías de Dofus (loadDofusNav).
// - checklists/silvestre.webp: el Dofus Silvestre de DofusDB (200px), el icono de la sección
//   Checklists. La lista de las checklists sale de su colección (loadChecklistNav).
// - clases/: las cabezas de clase de la exportación del cliente de Dofus 3
//   (dofusdude/dofus3-main 3.7.13.17, class_head_images_64): 64px.
// - jefes/crunchidor.webp: el Crunchidor de DofusDB, reducido a 120px de ancho. Las otras
//   siete mazmorras aún no tienen el arte de su jefe y llevan el icono de una puerta.

import { GAME_ICONS } from '@/components/game/game-icons'
import { CHECKLISTS_INDEX_PATH } from '@/lib/checklists/path'
import { DOFUS_INDEX_PATH } from '@/lib/dofus-guides/page'
import type { PageNavItem } from '@/lib/pages/page'
import { type SectionNavDoc, sectionNavLinks } from '@/lib/section-pages/nav'
import { legacyHref } from '@/lib/site/legacy'
import {
  navigationDefaults,
  type SectionKey,
  type SiteSocials,
  siteSettingsDefaults,
} from '@/lib/site-copy/defaults'

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

export type { SectionKey }

export interface Section {
  key: SectionKey
  /** El nombre corto, el del botón del menú. */
  label: string
  /** El nombre completo, el del pie y la ficha del panel. */
  title: string
  /** La frase bajo el nombre en el panel y el móvil; vacía, la cifra de la sección. */
  description: string
  href: string
  icon: GameImage
  /** El acento de la sección (DESIGN.md, Section accents). */
  accent: string
  /** Aún sin páginas: sale con «Próximamente», sin enlace ni panel. */
  soon?: true
}

const egg = (slug: string): GameImage => ({ src: `/img/game/dofus/${slug}.webp`, size: 128 })
const head = (slug: string): GameImage => ({ src: `/img/game/clases/${slug}.webp`, size: 64 })

/**
 * Un Dofus del menú y de la búsqueda, de la colección de guías de Dofus (loadDofusNav): con
 * enlace si su guía está publicada; sin él, apagado.
 */
export interface DofusNavItem {
  name: string
  href?: string
  image?: GameImage
}

/**
 * Los tres huevos de siempre de la tarjeta de las guías de Dofus del menú, mientras Torre no
 * elija otros en «Navegación» (resolveNavigation).
 */
export const DOFUS_FEATURED: GameImage[] = navigationDefaults.featuredDofus.map(egg)

/**
 * Una checklist del menú, del pie y de la portada, de su colección (loadChecklistNav): con
 * enlace a su página si está Publicada, a Squarespace si está En preparación y lo tiene.
 */
export interface ChecklistNavItem {
  name: string
  /** Único en la colección: la clave de la fila. */
  slug: string
  href?: string
  /** El enlace lleva a la web anterior (Squarespace): aún no tiene página aquí. */
  legacy?: true
  description?: string
  image?: GameImage
}

/** Una clase o una mazmorra de siempre, con el slug de su página en la web de Torre. */
export type SectionLink = NavLink & { slug: string }

const legacyLink = (slug: string, name: string, image?: GameImage): SectionLink => ({
  slug,
  name,
  href: legacyHref(slug),
  ...(image && { image }),
})

// Las de siempre: lo que sale sin nada en las colecciones de clases y mazmorras. En la web de
// siempre, Feca y Yopuka llevan un -1 en el slug.
export const CLASSES: SectionLink[] = (Object.keys(t.classes) as (keyof typeof t.classes)[]).map(
  (slug) => legacyLink(slug, t.classes[slug], head(slug.replace(/-1$/, ''))),
)

export const DUNGEONS: SectionLink[] = [
  legacyLink('mazmorra-acuadomo-de-merkator', t.dungeons.acuadomo),
  legacyLink('mazmorra-crunchidor', t.dungeons.crocanteria, {
    src: '/img/game/jefes/crunchidor.webp',
    size: 120,
  }),
  legacyLink('mazmorra-fundicion-de-los-waddictos', t.dungeons.fundicion),
  legacyLink('mazmorra-nave-del-capitan-meno', t.dungeons.meno),
  legacyLink('mazmorras-de-nawidad', t.dungeons.nawidad),
  legacyLink('pikabeto', t.dungeons.pikabeto),
  legacyLink('mazmorra-templo-de-kutulu', t.dungeons.kutulu),
  legacyLink('mazmorra-templo-del-dios-kao', t.dungeons.kao),
]

/**
 * Las clases del menú, de su colección (loadSectionNav): Publicada lleva a su página, En
 * preparación a su enlace de Squarespace y, sin página, al de siempre. Sin ninguna, CLASSES.
 */
export const classLinks = (docs: SectionNavDoc[] = []): SectionLink[] =>
  sectionNavLinks(CLASSES, docs)

/** Las mazmorras del menú, de su colección, con la misma regla que las clases. */
export const dungeonLinks = (docs: SectionNavDoc[] = []): SectionLink[] =>
  sectionNavLinks(DUNGEONS, docs)

/** Lo que va en el código de cada sección: su dirección, su icono y su color. */
const SECTION_CODE: Record<SectionKey, Pick<Section, 'href' | 'icon' | 'accent'>> = {
  misiones: { href: '/metalogros', icon: GAME_ICONS.quest, accent: 'var(--color-sec-misiones)' },
  dofus: {
    href: DOFUS_INDEX_PATH,
    icon: egg('dofus-esmeralda'),
    accent: 'var(--color-sec-dofus)',
  },
  checklists: {
    href: CHECKLISTS_INDEX_PATH,
    icon: { src: '/img/game/checklists/silvestre.webp', size: 200 },
    accent: 'var(--color-sec-checklists)',
  },
  clases: {
    href: legacyHref('clases-1'),
    icon: head('feca'),
    accent: 'var(--color-sec-clases)',
  },
  mazmorras: {
    href: DUNGEONS[1].href,
    icon: DUNGEONS[1].image!,
    accent: 'var(--color-sec-mazmorras)',
  },
}

/**
 * Una sección con lo que Torre escribe en «Navegación» (los nombres, la frase, si está
 * próximamente) y lo que va en el código.
 */
export function navSection({
  key,
  label,
  title,
  description,
  soon,
}: {
  key: SectionKey
  label: string
  title: string
  description: string
  soon: boolean
}): Section {
  return { key, label, title, description, ...SECTION_CODE[key], ...(soon && { soon: true }) }
}

// Las secciones de siempre, en su orden: las del menú mientras Torre no guarde «Navegación».
// Clases y Mazmorras aún no tienen páginas aquí: salen con «Próximamente» y sin enlace en el
// menú, el móvil, el pie y la portada. Sus listas siguen aquí para cuando lleguen.
export const SECTIONS: Section[] = navigationDefaults.sections.map(navSection)

export const section = (key: SectionKey) => SECTIONS.find((s) => s.key === key)!

/**
 * La sección de una página, en su <main>: la cabecera pinta el botón de esa sección en su
 * color (site.css). Las checklists van dentro de Dofus en el menú, así que marcan «dofus».
 */
export const pageSection = (key: Extract<SectionKey, 'misiones' | 'dofus'>) =>
  ({ 'data-section': key }) as const

export type SocialKey = 'twitch' | 'kick' | 'youtube' | 'discord'

export interface Social {
  key: SocialKey
  name: string
  href: string
  handle: string
}

const SOCIAL_KEYS: SocialKey[] = ['twitch', 'kick', 'youtube', 'discord']

/**
 * Las redes de Torre en el orden del pie, con su nombre, de «Ajustes del sitio»
 * (resolveSiteSettings); sin ajustes, las de siempre.
 */
export function socialLinks(socials: SiteSocials = siteSettingsDefaults.socials): Social[] {
  return SOCIAL_KEYS.map((key) => ({
    key,
    name: t.socials[key],
    href: socials[key].url,
    handle: socials[key].handle,
  }))
}

export const SOCIALS: Social[] = socialLinks()

export const social = (key: SocialKey, socials?: SiteSocials) =>
  socialLinks(socials).find((s) => s.key === key)!

export const KOFI_URL = siteSettingsDefaults.socials.kofi.url

/** Las páginas legales del pie, por su slug en la colección pages (backlog B-10). */
const LEGAL_PAGES = [
  { name: t.legal.notice, slug: 'aviso-legal' },
  { name: t.legal.cookies, slug: 'politica-de-cookies' },
  { name: t.legal.privacy, slug: 'politica-de-privacidad' },
] as const

/**
 * Los enlaces legales del pie: a su página de la colección pages si está Publicada, a su
 * página de Squarespace si está En preparación, y sin página aquí, a la de Squarespace con
 * el mismo slug, como hasta ahora (loadPageNav).
 */
export function legalLinks(pages: PageNavItem[] = []): NavLink[] {
  return LEGAL_PAGES.map(({ name, slug }) => ({
    name,
    href: pages.find((page) => page.slug === slug)?.href ?? legacyHref(slug),
  }))
}

/** Los enlaces legales sin leer la colección: el catálogo /sistema. */
export const LEGAL_LINKS: NavLink[] = legalLinks()

export type SearchType =
  | 'mision'
  | 'logro'
  | 'metalogro'
  | 'seccion'
  | 'dofus'
  | 'checklist'
  | 'clase'
  | 'mazmorra'
  | 'pagina'

export interface SearchEntry {
  type: SearchType
  name: string
  href: string
  image?: GameImage
  /** La segunda línea del resultado: el nivel y el logro de una misión, el metalogro de un logro. */
  detail?: string
}

/**
 * El id del principio de la página, en el <body> del layout: «Volver arriba» enlaza ahí.
 * Al seguirlo, el foco de teclado vuelve a empezar desde arriba, como al cargar la página.
 */
export const TOP_ANCHOR = 'arriba'

/**
 * Lo que enlaza el menú, para la búsqueda de la cabecera. Las misiones llegan aparte. Lo que
 * aún no tiene página (Clases, Mazmorras, los Dofus en preparación) no se encuentra; una
 * checklist En preparación, solo si enlaza a Squarespace, como en el menú. Las páginas
 * sueltas (loadPageNav), solo las que se abren aquí. Las secciones, las de «Navegación».
 */
export function searchIndex(
  dofus: DofusNavItem[] = [],
  checklists: ChecklistNavItem[] = [],
  pages: PageNavItem[] = [],
  sections: Section[] = SECTIONS,
): SearchEntry[] {
  return [
    ...sections
      .filter((sec) => !sec.soon)
      .map(({ title, href, icon }) => ({
        type: 'seccion' as const,
        name: title,
        href,
        image: icon,
      })),
    ...dofus.flatMap(({ name, href, image }) =>
      href ? [{ type: 'dofus' as const, name, href, image }] : [],
    ),
    ...checklists.flatMap(({ name, href, image }) =>
      href ? [{ type: 'checklist' as const, name, href, image }] : [],
    ),
    ...pages.flatMap(({ name, href, legacy }) =>
      href && !legacy ? [{ type: 'pagina' as const, name, href }] : [],
    ),
  ]
}
