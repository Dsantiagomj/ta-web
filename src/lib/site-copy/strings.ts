// Los textos del panel de «Ajustes del sitio» y «Portada e índices» (AGENTS.md, The panel
// speaks to Torre): de tú y sin jerga.

const blank = 'Si dejas un campo vacío, la web pone el texto de siempre.'

export const siteCopyStrings = {
  settings: {
    label: 'Ajustes del sitio',
    intro:
      'Lo que sale en todas las páginas: el nombre del sitio, lo que ven Google y las redes, ' +
      `el pie de página y tus redes. ${blank}`,
    tabs: { general: 'General', footer: 'Pie de página', socials: 'Redes' },
    name: {
      label: 'Nombre del sitio',
      description: 'El título de la portada en Google y en las pestañas, y el del © del pie.',
    },
    siteDescription: {
      label: 'Descripción para Google',
      description: 'La frase bajo el título de la portada en Google y al compartirla.',
    },
    ogImage: {
      label: 'Imagen al compartir',
      description:
        'La que enseñan WhatsApp, Discord o X al pegar un enlace de la web. Mejor de 1200 × 630 ' +
        'píxeles, en JPG o PNG. Sin imagen, cada red elige.',
    },
    footer: {
      label: 'Pie de página',
      bio: 'Tu frase, bajo «Torre»',
      liveTitle: 'Directos: título',
      liveText: 'Directos: texto',
      discordTitle: 'Discord: título',
      discordText: 'Discord: texto',
      kofiTitle: 'Ko-fi: título',
      kofiText: 'Ko-fi: texto',
      disclaimer: 'Aviso sobre Ankama',
    },
    socials: {
      label: 'Tus redes',
      description:
        'Los enlaces del pie, de la portada y del menú del móvil. El nombre de usuario es el que ' +
        'sale bajo cada red.',
      networks: {
        twitch: 'Twitch',
        kick: 'Kick',
        youtube: 'YouTube',
        discord: 'Discord',
        kofi: 'Ko-fi',
      },
      url: 'Enlace',
      urlDescription: 'La dirección completa, empezando por https://',
      handle: 'Nombre de usuario',
    },
  },
  indexes: {
    label: 'Portada e índices',
    intro:
      'Los títulos, las entradillas y lo que ve Google de la portada y de los índices ' +
      `/metalogros, /guias-dofus y /checklists. ${blank}`,
    tabs: {
      home: 'Portada',
      metalogros: 'Metalogros',
      dofusGuides: 'Guías de Dofus',
      checklists: 'Checklists',
    },
    homeDescription:
      'En Google, la portada lleva el nombre y la descripción de «Ajustes del sitio».',
    dofusGuidesDescription:
      'La entradilla de /guias-dofus está en Contenido › Índice de guías de Dofus.',
    checklistsDescription: 'La tarjeta «Próximamente» está en Contenido › Índice de checklists.',
    eyebrow: 'Antetítulo',
    title: 'Título',
    lead: 'Entradilla',
    question: 'La pregunta de Torre, sobre el buscador',
    empty: 'Aviso cuando no hay checklists publicadas',
    areas: {
      label: 'Qué vas a encontrar',
      questsText: 'Misiones y logros: texto tras las cifras',
      dofusText: 'Guías de Dofus: texto',
      checklistsText: 'Checklists: texto',
      classesText: 'Clases: texto',
      dungeonsText: 'Mazmorras: texto',
    },
    tour: {
      label: 'Una guía para cada misión',
      description: 'Cada punto lleva su número sobre la parte de la guía de muestra que explica.',
      step: (n: number) => `Punto ${n}`,
      stepText: 'Texto',
      more: 'Botón a las misiones',
    },
    homeChecklists: { label: 'Checklists para ir a por tu Dofus' },
    author: {
      label: 'Las guías son de Torre',
      join: 'Discord: título',
      joinText: 'Discord: texto',
      offlineTitle: 'Sin directo: primera frase, en negrita',
      offlineText: 'Sin directo: el resto',
    },
    seo: {
      label: 'En Google',
      title: 'Título en Google',
      description: 'Descripción en Google',
    },
  },
}
