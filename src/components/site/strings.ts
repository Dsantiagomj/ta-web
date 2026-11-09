import type { SectionKey } from './nav'

// Los textos de la cabecera y el pie del sitio (AGENTS.md, Language).
export const siteShellStrings = {
  /**
   * Los 30 Dofus de la guía de Torre, en su orden (el de su página de guías de Dofus), por el
   * nombre del archivo de su huevo en public/img/game/dofus.
   */
  dofus: {
    dofawa: 'Dofawa',
    'dofus-plateado': 'Dofus Plateado',
    jyfus: 'Jyfus',
    'dofus-cacao': 'Dofus Cacao',
    'dofus-zanahowia': 'Dofus Zanahowia',
    dosaurio: 'Dosaurio',
    dokoko: 'Dokoko',
    'dofus-kalipto': 'Dofus Kalipto',
    'dofus-vigilante': 'Dofus Vigilante',
    dolmanax: 'Dolmanax',
    'dofus-esmeralda': 'Dofus Esmeralda',
    'dofus-purpura': 'Dofus Púrpura',
    dotruz: 'Dotruz',
    domakuro: 'Domakuro',
    dorigami: 'Dorigami',
    'dofus-ocre': 'Dofus Ocre',
    'dofus-turquesa': 'Dofus Turquesa',
    dofzzbz: 'Dofzzbz',
    'dofus-vulbis': 'Dofus Vulbis',
    'dofus-de-los-hielos': 'Dofus de los Hielos',
    'dofus-nebuloso': 'Dofus Nebuloso',
    'dofus-abisal': 'Dofus Abisal',
    'dofus-marfil': 'Dofus Marfil',
    'dofus-forjalava': 'Dofus Forjalava',
    'dofus-ebano': 'Dofus Ébano',
    'dofus-centelleante': 'Dofus Centelleante',
    'dofus-moteado': 'Dofus Moteado',
    'pinata-de-pino': 'Piñata de Pino',
    'dofus-pesadilla': 'Dofus Pesadilla',
    'dofus-silvestre': 'Dofus Silvestre',
  },
  checklistNames: {
    silvestre: 'Dofus Silvestre',
    hielos: 'Dofus de los Hielos',
    ocre: 'Almas del Ocre',
  },
  /** Las 19 clases, por su slug (Feca y Yopuka llevan un -1 en la web de siempre). */
  classes: {
    aniripsa: 'Aniripsa',
    anutrof: 'Anutrof',
    'feca-1': 'Feca',
    forjalanza: 'Forjalanza',
    hipermago: 'Hipermago',
    ocra: 'Ocra',
    osamodas: 'Osamodas',
    pandawa: 'Pandawa',
    sacrogrito: 'Sacrógrito',
    sadida: 'Sadida',
    selotrop: 'Selotrop',
    sram: 'Sram',
    steamer: 'Steamer',
    tymador: 'Tymador',
    uginak: 'Uginak',
    xelor: 'Xelor',
    'yopuka-1': 'Yopuka',
    zobal: 'Zobal',
    zurcarak: 'Zurcarák',
  },
  dungeons: {
    acuadomo: 'Acuadomo de Merkator',
    crocanteria: 'Crocantería',
    fundicion: 'Fundición de los waddictos',
    meno: 'Nave del Capitán Meno',
    nawidad: 'Nawidad',
    pikabeto: 'Pikabeto',
    kutulu: 'Templo de Kutulú',
    kao: 'Templo del Dios Kao',
  },
  socials: {
    twitch: 'Twitch',
    kick: 'Kick',
    youtube: 'YouTube',
    discord: 'Discord',
    kofi: 'Ko-fi',
  },
  /** La etiqueta de lo que aún no tiene página: Clases y Mazmorras. */
  soon: 'Próximamente',
  /** Lo que lee un lector de pantalla tras el nombre de un Dofus que Torre aún no tiene escrito. */
  preparing: ' (en preparación)',
  sections: {
    misiones: { label: 'Misiones', title: 'Misiones y logros' },
    dofus: { label: 'Dofus', title: 'Dofus' },
    checklists: { label: 'Checklists', title: 'Checklists' },
    clases: { label: 'Clases', title: 'Clases' },
    mazmorras: { label: 'Mazmorras', title: 'Mazmorras' },
  } satisfies Record<SectionKey, { label: string; title: string }>,
  checklists: {
    silvestre: '100 pasos con la guía de Sandglass',
    hielos: '70 pasos, de la isla de Frigost al final',
    ocre: 'Las almas de la eterna cosecha, una a una',
  },
  legal: {
    notice: 'Aviso legal',
    cookies: 'Política de cookies',
    privacy: 'Política de privacidad',
  },
  skip: 'Saltar al contenido',
  brand: 'Torrente Arcano',
  brandTop: 'Torrente',
  brandAccent: 'Arcano',
  nav: 'Principal',
  currentSection: ' (sección actual)',
  menu: 'Menú',
  closeMenu: 'Cerrar el menú',
  search: 'Buscar',
  searchShortcut: 'Ctrl K',
  searchLabel: 'Buscar (Ctrl K)',
  panels: {
    misionesBlurb: (guides: number, achievements: number) =>
      [
        (guides === 1 ? ' misión paso a paso' : ' misiones paso a paso') +
          (achievements === 1
            ? ', en '
            : guides === 1
              ? ', ordenada en sus '
              : ', ordenadas en sus '),
        achievements === 1 ? ' logro.' : ' logros.',
      ] as const,
    misionesSearch: 'Buscar una misión',
    misionesSearchHint: 'También un Dofus o un checklist.',
    misionesAll: 'Ver todo',
    dofusFeatured: 'Guías por Dofus',
    // Sin cifras: Torre suma Dofus con el tiempo.
    dofusFeaturedTitle: 'Guías de Dofus',
    dofusFeaturedText: 'Lo que pide cada huevo y el logro que lo da.',
    dofusAll: 'Todos los Dofus',
    dofusSeeAll: 'Ver todas las guías de Dofus',
    checklists: 'Checklists',
    clasesBlurb: ['Las ', ' clases con sus equipos de PvM y PvP.'] as const,
    mazmorrasBlurb: ['Las ', ' mazmorras: monstruos, sinergias y cómo vencer al jefe.'] as const,
  },
  sheet: {
    dofusTitle: 'Dofus y checklists',
    dofusBlurb: 'Las guías de Dofus y los checklists para conseguirlos.',
  },
  footer: {
    torre: 'Torre',
    bio: 'Juega a Dofus en directo y escribe todas las guías de esta web.',
    liveTitle: 'Directos en Twitch y en Kick',
    liveText: 'Si sigues el canal, Twitch te avisa cuando empieza.',
    explore: 'Explorar',
    community: 'Comunidad',
    discordTitle: 'Únete al Discord',
    discordText: 'Dudas de misiones y avisos de directos.',
    kofiTitle: 'Apoya en Ko-fi',
    kofiText: 'Las guías son gratis. Invita a Torre a un café.',
    follow: 'Sigue a Torre',
    up: 'Volver arriba',
    legal: 'Legal',
    copyright: (year: number) => `© ${year} Torrente Arcano`,
    disclaimer:
      'Dofus es un MMORPG publicado por Ankama. Torrente Arcano es una página web no oficial y no está afiliada ni asociada con Ankama. Algunas ilustraciones y contenidos son propiedad de Ankama y de Dofus.',
  },
}
