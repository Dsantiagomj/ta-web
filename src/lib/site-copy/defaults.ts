// Los textos del sitio que Torre edita en el panel (src/globals/SiteSettings.ts,
// IndexTexts.ts y Navigation.ts), con el texto de siempre: el valor de partida de cada campo,
// lo que sale en la web mientras el campo está vacío y lo que escribe pnpm seed:site-copy. Lo
// que no es contenido (botones, etiquetas para lectores de pantalla, avisos de error) sigue en
// el módulo de textos de cada parte.

/** Ajustes del sitio: lo que sale en todas las páginas. */
export const siteSettingsDefaults = {
  name: 'Torrente Arcano',
  description: 'Guías de misiones, logros, clases y checklists de Dofus.',
  footer: {
    bio: 'Juega a Dofus en directo y escribe todas las guías de esta web.',
    liveTitle: 'Directos en Twitch y en Kick',
    liveText: 'Si sigues el canal, Twitch te avisa cuando empieza.',
    discordTitle: 'Únete al Discord',
    discordText: 'Dudas de misiones y avisos de directos.',
    kofiTitle: 'Apoya en Ko-fi',
    kofiText: 'Las guías son gratis. Invita a Torre a un café.',
    disclaimer:
      'Dofus es un MMORPG publicado por Ankama. Torrente Arcano es una página web no oficial y no está afiliada ni asociada con Ankama. Algunas ilustraciones y contenidos son propiedad de Ankama y de Dofus.',
  },
  socials: {
    twitch: { url: 'https://www.twitch.tv/torrentearcano', handle: 'torrentearcano' },
    kick: { url: 'https://kick.com/torretv', handle: 'torretv' },
    youtube: { url: 'https://www.youtube.com/@TorrenteArcano', handle: '@TorrenteArcano' },
    discord: { url: 'https://discord.gg/wgCxwd7b3r', handle: 'discord.gg/wgCxwd7b3r' },
    kofi: { url: 'https://ko-fi.com/torrentearcano' },
  },
}

/** Un punto de «Una guía para cada misión»: el número es el de su parte en el dibujo. */
const tourStep = (title: string, text: string) => ({ title, text })

/** Portada e índices: los títulos, entradillas y SEO de la portada y de cada índice. */
export const indexTextDefaults = {
  home: {
    eyebrow: 'Guías de Dofus en español',
    title: 'Torrente Arcano',
    lead: 'Misiones, logros y Dofus explicados paso a paso, con capturas y coordenadas para copiar en el chat.',
    question: '¿Qué misión estás haciendo?',
    areas: {
      title: 'Qué vas a encontrar',
      /** Tras las cifras de las guías y los logros, que pone la web. */
      questsText: 'Búscalas por nombre, zona o historia, de Astrub al Selocalipsis.',
      dofusText: 'Lo que pide cada Dofus y las misiones del logro que lo da, cada una con su guía.',
      checklistsText: 'Marca lo hecho y ve lo que falta.',
      classesText: 'Los equipos de cada clase para PvM y para PvP, uno por elemento.',
      dungeonsText:
        'Las mazmorras explicadas por Torre: qué hace cada monstruo y cómo vencer al jefe.',
    },
    tour: {
      title: 'Una guía para cada misión',
      lead: 'Hechas para seguirlas con el juego abierto al lado. Así es una por dentro.',
      step1: tourStep(
        'Lo que hace falta, arriba del todo',
        'Quién da la misión y dónde, los prerrequisitos, lo que vas a necesitar y las recompensas, con los iconos del juego.',
      ),
      step2: tourStep(
        'Coordenadas que se copian',
        'Un clic copia el /travel; lo pegas en el chat y el autopiloto te lleva.',
      ),
      step3: tourStep(
        'Una captura en cada paso',
        'Grande, para reconocer el sitio y el diálogo. Se abre a pantalla completa.',
      ),
      step4: tourStep(
        'Los consejos de Torre',
        'En los combates difíciles, a quién atacar primero y qué evitar.',
      ),
      more: 'Ver las misiones y logros',
    },
    checklists: {
      title: 'Checklists para ir a por tu Dofus',
      lead: 'Para los Dofus más largos, paso a paso. Sin cuenta: el progreso se guarda en tu navegador.',
    },
    author: {
      title: 'Las guías son de Torre',
      lead: 'Torre juega a Dofus en directo y escribe todas las guías de esta web.',
      join: 'Únete al Discord de la comunidad',
      joinText: 'Para resolver dudas de misiones y enterarte de los directos.',
      offlineTitle: 'Ahora no está en directo.',
      offlineText: 'Emite en Twitch y en Kick; si sigues el canal, Twitch te avisa cuando empiece.',
    },
  },
  metalogros: {
    title: 'Todos los metalogros',
    lead: 'Busca una zona, un logro o una misión, o elige una zona para ver sus logros.',
    seo: {
      title: 'Todos los metalogros de Dofus',
      description:
        'Los metalogros de Dofus por zona, con sus logros y sus misiones en orden. Busca una ' +
        'zona, un logro o una misión.',
    },
  },
  dofusGuides: {
    eyebrow: 'Misiones y logros de cada Dofus',
    title: 'Guías de Dofus',
    seo: {
      title: 'Guías de Dofus',
      description:
        'Las guías de Torre para conseguir cada Dofus: qué pide, qué logros y misiones lo dan y ' +
        'en qué orden hacerlos.',
    },
  },
  checklists: {
    eyebrow: 'Paso a paso hasta tu Dofus',
    title: 'Checklists',
    lead:
      'Marca lo hecho y ve lo que falta, de la primera misión al Dofus. Sin cuenta: el progreso ' +
      'se guarda en tu navegador.',
    empty: 'Todavía no hay checklists publicadas. Vuelve pronto: Torre está preparando la primera.',
    seo: {
      title: 'Checklists de Dofus',
      description:
        'Las checklists de Torre para conseguir cada Dofus paso a paso: marca lo hecho y ve lo ' +
        'que falta.',
    },
  },
}

/** Las secciones del menú, en el orden de siempre. Su dirección, icono y color van en el código. */
export const NAV_SECTION_KEYS = ['misiones', 'dofus', 'checklists', 'clases', 'mazmorras'] as const

export type SectionKey = (typeof NAV_SECTION_KEYS)[number]

export interface NavSectionRow {
  key: SectionKey
  /** El nombre corto, el del botón del menú. */
  label: string
  /** El nombre completo: el pie, el panel del menú, el móvil y la búsqueda. */
  title: string
  /**
   * La frase bajo el nombre en el panel del menú y en el móvil. Vacía, la web pone la cifra de
   * guías (Misiones), de clases o de mazmorras.
   */
  description: string
  visible: boolean
  /** Aún sin páginas: sale con «Próximamente», sin enlace ni panel. */
  soon: boolean
}

const navRow = (
  key: SectionKey,
  label: string,
  title: string,
  { description = '', soon = false }: { description?: string; soon?: boolean } = {},
): NavSectionRow => ({ key, label, title, description, visible: true, soon })

/**
 * Navegación: las secciones del menú, el móvil, el pie y la portada, y los tres Dofus de la
 * tarjeta de las guías de Dofus del menú, por el slug de su guía.
 */
export const navigationDefaults = {
  sections: [
    navRow('misiones', 'Misiones', 'Misiones y logros'),
    navRow('dofus', 'Dofus', 'Dofus', {
      description: 'Las guías de Dofus y los checklists para conseguirlos.',
    }),
    navRow('checklists', 'Checklists', 'Checklists'),
    navRow('clases', 'Clases', 'Clases', { soon: true }),
    navRow('mazmorras', 'Mazmorras', 'Mazmorras', { soon: true }),
  ],
  featuredDofus: ['dofus-turquesa', 'dofus-esmeralda', 'dofus-ocre'],
}

export type SiteSettingsTexts = typeof siteSettingsDefaults
export type IndexTexts = typeof indexTextDefaults
export type SiteSocials = SiteSettingsTexts['socials']
export type IndexSeo = IndexTexts['metalogros']['seo']
