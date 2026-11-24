import type { Mode, Theme } from '@/lib/theme/theme'

// Textos del catálogo de componentes (/sistema). Solo lo ven el equipo y las pruebas.

export const catalogStrings = {
  title: 'Sistema de diseño',
  metaTitle: 'Sistema de diseño · Torrente Arcano',
  lead: 'Cada componente de DESIGN.md con contenido real, en los cinco temas y los dos modos. Solo existe en desarrollo, en el entorno dev y en las pruebas E2E.',
  jump: 'Ir a',
  themes: {
    arcano: 'Arcano',
    amakna: 'Amakna',
    bonta: 'Bonta',
    brakmar: 'Brâkmar',
    ocre: 'Ocre',
  } satisfies Record<Theme, string>,
  modes: { dark: 'oscuro', light: 'claro' } satisfies Record<Mode, string>,
  section: (theme: string, mode: string) => `${theme} · ${mode}`,
  groups: {
    brand: 'Marca',
    site: 'Cabecera y pie del sitio',
    kofi: 'Ko-fi',
    buttons: 'Botones',
    chips: 'Chips y etiquetas',
    callouts: 'Avisos',
    figures: 'Fichas y progreso',
    theme: 'Selector de tema',
    checkbox: 'Casilla',
    cards: 'Tarjetas',
    torre: 'Recomendaciones de Torre',
    header: 'Cabecera de la misión',
    wells: 'Huecos de iconos',
    items: 'Objetos',
    fight: 'Combate',
    table: 'Tabla',
    coordinates: 'Coordenadas',
    steps: 'Pasos',
    next: 'Siguiente misión',
    chain: 'Cadena del logro',
    video: 'Vídeo',
    image: 'Captura',
    dofus: 'Guías de Dofus',
    checklists: 'Índice de checklists',
    eggs: 'Huevo de la checklist',
    zone: 'Fondo de zona',
    ambience: 'Ambiente',
    achievement: 'Página de logro',
    blocks: 'Bloques del panel',
  },
  notes: {
    brand:
      'El emblema a 16, 30, 36 y 64 px; a 16 px, la versión simplificada. Después, el logo Sello de la cabecera y del pie: pasa el ratón y el sombrero se inclina. Toma los colores del tema y el modo de la sección.',
    site: 'El panel de Dofus y checklists del menú, abierto y quieto, y el pie del sitio.',
    kofi: 'El botón de la cabecera sobre su barra, con su texto y con la taza sola (de 1280 a 1583px), y el flotante, que en el sitio va abajo a la derecha y se va al llegar al pie. En el móvil, el flotante es solo la taza.',
    ambience:
      'Las partículas que suben hacia la cabecera en lo alto de cada página, aquí en su caja, con el aspecto del tema y el modo de la sección. Con movimiento reducido no sale ninguna.',
    torre: 'El consejo de una guía: Torre hablando, con su avatar y un bocadillo.',
    header:
      'Seis pies bajo tierra, con el PNJ, el logro, el rango de XP, un objeto de Necesitarás (púlsalo: copia su nombre) y la bolsa de objetos (púlsala); Intoxicación profunda, sin PNJ ni logro y con un objeto sin icono.',
    items:
      'El chip y la casilla de un objeto: en reposo, como siempre; con el ratón encima, el nombre se subraya en accent y aparece el icono de copiar. Pulsar el nombre o el icono copia el nombre, sin la cantidad, para buscarlo en el juego. Sin JavaScript son texto.',
    wells:
      'Los iconos del juego en su rombo: el marco toma el color de lo que llevan (la XP en el tono 3, los kamas en el 2, el combate y la mazmorra en el 1) y el resto, el neutro. El último, sin icono, queda vacío.',
    cards:
      'Un panel; las fichas del índice de metalogros (con su PNJ y la capa de brillo que en el índice sigue al ratón; solo con el icono de su logro; apagada) y sus tarjetas de logro; y el logro anterior y el siguiente de una página de logro, el siguiente En preparación.',
    theme:
      'El botón de la cabecera con el sombrero en el acento del tema; su menú lista los cuatro temas gratis. Aquí no se abre: lo abre la isla de la cabecera.',
    eggs: 'El huevo de la cabecera de una checklist sin empezar, a medias y terminada (data-ck-state): apagado y flotando hasta el 100 %, encendido con su brillo al terminar.',
    zone: 'El paisaje de la zona de una guía o un logro bajo el velo plano del fondo, con texto en tinta, en muted y en un tono encima.',
    coordinates:
      'Los [x,y] de la prosa se convierten en chips; pulsar copia /travel x,y. Sin JavaScript son texto.',
    steps:
      'Separados por una línea, sin números, títulos ni casillas; el 3 lleva la chincheta del paso.',
    video: 'Con portada y sin portada. Nada de YouTube carga hasta pulsar.',
    table:
      'Una tabla de Torre: su título, la primera columna como encabezado de fila y las cifras a la derecha. Si no cabe, se desplaza de lado dentro de su caja (se enfoca con el teclado) y la primera columna se queda a la vista.',
    dofus:
      'Tarjetas del índice (una con su etiqueta, otra En preparación, apagada y sin enlace), la ficha de la guía (Prerrequisitos y Necesitarás por grupos, una fila por línea; el objeto copia su nombre) y un logro con sus misiones en la lista numerada del logro, en una columna.',
    checklists:
      'Tarjetas del índice: una Publicada que abre su página, una En preparación que abre la web anterior y lo dice, y otra sin enlace, apagada.',
    achievement:
      'La ficha del logro, como en la columna del escritorio: las recompensas (la bolsa se abre), Prerrequisitos y Necesitarás en total en sus grupos (Objetos, Combates y mazmorras, y Otros en una línea; el objeto copia su nombre); y otra con un solo grupo. En el móvil, Prerrequisitos y Necesitarás se pliegan. Las misiones en orden, numeradas: un logro corto en una columna y uno largo en dos; la misión sin guía publicada no es un enlace.',
    image:
      'Pulsa la captura para verla a pantalla completa; Esc, Cerrar o un clic fuera la cierran. Sin JavaScript abre el archivo.',
    blocks:
      'Cada bloque que Torre añade en el panel, como se ve en la web, en un marco de 3:2: de aquí salen las miniaturas del selector de bloques (pnpm panel:block-thumbs, en Arcano oscuro). Debajo, el nombre del bloque en el código.',
  },
  demo: {
    brand: 'Torrente Arcano',
    /** El título de la tarjeta de Ko-fi del pie, que también lleva el flotante. */
    kofi: 'Apoya en Ko-fi',
    siteCounts: { guides: 1272, achievements: 274 },
    /** Unos Dofus del menú, como los da la colección (loadDofusNav): uno En preparación. */
    dofusNav: [
      { name: 'Dofawa', href: '/dofawa', image: { src: '/img/game/dofus/dofawa.webp', size: 128 } },
      {
        name: 'Dofus Esmeralda',
        href: '/dofus-esmeralda',
        image: { src: '/img/game/dofus/dofus-esmeralda.webp', size: 128 },
      },
      { name: 'Jyfus', image: { src: '/img/game/dofus/jyfus.webp', size: 128 } },
      {
        name: 'Dofus Abisal',
        href: '/dofus-abisal',
        image: { src: '/img/game/dofus/dofus-abisal.webp', size: 128 },
      },
    ],
    /** Unas checklists del menú, como las da la colección (loadChecklistNav). */
    checklistNav: [
      {
        name: 'Dofus Nebuloso',
        slug: 'checklist-nebuloso',
        href: '/checklist-nebuloso',
        description: 'Del primer paso en Pandala al Nebuloso.',
        image: { src: '/img/game/dofus/dofus-esmeralda.webp', size: 128 },
      },
      {
        name: 'Dofus Silvestre',
        slug: 'checklist-silvestre',
        href: 'https://www.torrentearcano.com/checklist-silvestre',
        legacy: true as const,
        description: 'Con la guía de Sandglass.',
        image: { src: '/img/game/checklists/silvestre.webp', size: 200 },
      },
    ],
    /** Una cifra con miles (Amount) y lo que cuenta. */
    amountUnit: ' misiones',
    primary: 'Entrar',
    copy: 'Copiar',
    secondary: 'Ver la guía',
    ghost: 'Ocultar hechas',
    disabled: 'Apagado',
    link: 'Enlace',
    search: 'Buscar',
    daily: 'Diaria',
    zone: 'Astrub',
    progress: 'Pasos hechos',
    hideDone: 'Ocultar hechas',
    done: 'Hecha',
    unavailable: 'No disponible',
    panel: 'Un panel sobre surface, sin borde ni sombra.',
    zoneText: 'Habla con Hupe Esse para empezar la misión.',
    zoneMuted: 'Misión de Astrub - Nivel 20',
    zoneHeading: 'Recompensas',
  },
}
