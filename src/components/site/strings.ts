// Los textos de la cabecera y el pie del sitio (AGENTS.md, Language). Los nombres y las frases
// de las secciones son de «Navegación» (src/lib/site-copy/defaults.ts).
export const siteShellStrings = {
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
  /** Lo que lee un lector de pantalla tras una checklist que aún enlaza a Squarespace. */
  legacyChecklist: ' (en preparación: se abre en la web anterior)',
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
  /** El Ko-fi de la cabecera: la taza y «Ko-fi»; el nombre completo, para el lector de pantalla. */
  kofi: {
    label: 'Ko-fi',
    name: 'Apoya a Torre en Ko-fi',
  },
  /** Lo que lee un lector de pantalla tras un enlace que se abre en otra pestaña. */
  newTab: ' (se abre en otra pestaña)',
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
    // Sin cifras: Torre suma checklists con el tiempo.
    checklistsSeeAll: 'Ver todas las checklists',
    clasesBlurb: ['Las ', ' clases con sus equipos de PvM y PvP.'] as const,
    mazmorrasBlurb: ['Las ', ' mazmorras: monstruos, sinergias y cómo vencer al jefe.'] as const,
  },
  sheet: {
    dofusTitle: 'Dofus y checklists',
  },
  // Los textos del pie que son de Torre (su frase, los directos, Discord, Ko-fi y el aviso)
  // están en «Ajustes del sitio» (src/lib/site-copy/defaults.ts); aquí, los rótulos.
  footer: {
    torre: 'Torre',
    explore: 'Explorar',
    community: 'Comunidad',
    follow: 'Sigue a Torre',
    up: 'Volver arriba',
    legal: 'Legal',
    copyright: (year: number, name: string) => `© ${year} ${name}`,
  },
}
