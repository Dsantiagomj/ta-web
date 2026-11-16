// Los textos del panel de «Ajustes del sitio», «Portada e índices» y «Navegación» (AGENTS.md,
// The panel speaks to Torre): de tú y sin jerga.

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
  navigation: {
    label: 'Navegación',
    intro:
      'Las secciones del menú de arriba, del menú del móvil, del pie y de la portada: su ' +
      'nombre, su frase, su orden y si salen. También los tres Dofus de la tarjeta de las guías ' +
      'de Dofus del menú. Si dejas un nombre vacío, la web pone el de siempre.',
    sections: {
      label: 'Secciones',
      singular: 'Sección',
      plural: 'Secciones',
      description:
        'Arrastra una sección para cambiar su sitio en el menú y en el pie. Lo que no cambia ' +
        'es adónde lleva, su dibujo ni su color.',
    },
    key: 'Sección',
    menuLabel: {
      label: 'Nombre en el menú',
      description: 'El botón del menú de arriba, en el ordenador. Mejor corto.',
    },
    title: {
      label: 'Nombre completo',
      description: 'En el pie, en el menú del móvil y en la búsqueda.',
    },
    description: {
      label: 'Frase corta',
      description:
        'Bajo el nombre, en el menú. Si la dejas vacía, sale la cifra de guías, de clases o de ' +
        'mazmorras.',
    },
    visible: {
      label: 'Sale en la web',
      description: 'Desmárcala para quitar la sección del menú, del pie y de la portada.',
    },
    soon: {
      label: 'Próximamente',
      description:
        'Sale apagada, con «Próximamente» y sin enlace: para lo que aún no tiene páginas.',
    },
    featured: {
      label: 'Dofus destacados',
      description:
        'Los tres huevos de la tarjeta «Guías de Dofus» del menú de arriba, en este orden. ' +
        'Elige tres guías publicadas, o ninguna para dejar los de siempre.',
    },
    errors: {
      missing: (names: string) =>
        `Falta ${names}. Cada sección va una vez; para quitar una de la web, desmarca ` +
        '«Sale en la web».',
      repeated: (names: string) =>
        `${names} va más de una vez. Deja una sola fila de cada sección.`,
      featured: 'Elige tres Dofus, o ninguno para dejar los de siempre.',
    },
    seed: {
      missingGuide: (slugs: string) =>
        `no encuentra la guía de Dofus ${slugs}; deja los Dofus destacados sin elegir.`,
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
