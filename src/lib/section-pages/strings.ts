// Los textos del panel de las páginas de clase y de mazmorra (AGENTS.md, Language). Sus
// páginas públicas aún no existen: mientras tanto el sitio enlaza su página de Squarespace.

const shared = {
  titleDescription: 'El título grande de la página.',
  stateDescription:
    'Su página en esta web llega más adelante: de momento déjala En preparación. Con «Enlace ' +
    'en Squarespace», el menú lleva a tu web antigua. Pulsa «Publicar cambios» arriba para ' +
    'que lo que cambies salga en la web.',
  notYet:
    'La página de esta web aún no existe: déjala En preparación y el menú llevará a tu web ' +
    'antigua.',
  legacyHrefDescription:
    'La página en Squarespace mientras esta no esté lista. Deja de usarse al publicarla.',
  inMenuDescription: 'Quítalo para que no salga en la lista del menú.',
  menuNameDescription: 'Opcional. Vacío: el nombre de siempre del menú o, si no tiene, el título.',
  bodyDescription: 'El texto, las capturas y los vídeos, con los mismos bloques que las guías.',
  seoDescription:
    'Opcional. Sin título SEO se usa el de la página; sin descripción, el principio del texto.',
  tabs: { content: 'Contenido', seo: 'SEO' },
} as const

export const classPageStrings = {
  ...shared,
  slugDescription:
    'La de la página, la misma que en tu web: feca-1. Si la cambias en una página publicada, ' +
    'los enlaces que la gente guardó dejan de funcionar.',
  tabs: { builds: 'Builds', content: 'Texto', seo: shared.tabs.seo },
  bodyDescription: 'Opcional: la guía de la clase, con los mismos bloques que las guías.',
  pvm: 'Builds PVM',
  pvp: 'Builds PVP',
  build: 'Build',
  buildsDescription: 'Cada build es una imagen y, si quieres, el enlace al que lleva.',
  buildName: 'Nombre',
  buildNameDescription: 'Opcional: el nombre de la fila en el panel, como «Fuego».',
  buildImage: 'Imagen',
  buildLink: 'Enlace',
  buildLinkDescription: 'Adónde lleva la imagen, como la build en Dofusbook.',
} as const

export const dungeonPageStrings = {
  ...shared,
  slugDescription:
    'La de la página, la misma que en tu web: mazmorra-crunchidor. Si la cambias en una ' +
    'página publicada, los enlaces que la gente guardó dejan de funcionar.',
  dungeon: 'Mazmorra del juego',
  dungeonDescription: 'Opcional: la mazmorra de DofusDB, con sus jefes y su nivel.',
} as const

export type SectionPageStrings = typeof classPageStrings | typeof dungeonPageStrings
