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
    buttons: 'Botones',
    chips: 'Chips y etiquetas',
    callouts: 'Avisos',
    figures: 'Fichas y progreso',
    checkbox: 'Casilla',
    cards: 'Tarjetas',
    torre: 'Recomendaciones de Torre',
    header: 'Cabecera de la misión',
    wells: 'Huecos de iconos',
    items: 'Objetos',
    fight: 'Combate',
    coordinates: 'Coordenadas',
    steps: 'Pasos',
    next: 'Siguiente misión',
    chain: 'Cadena del logro',
    video: 'Vídeo',
    image: 'Captura',
  },
  notes: {
    brand:
      'El emblema a 16, 30, 36 y 64 px; a 16 px, la versión simplificada. Después, el logo Sello de la cabecera y del pie: pasa el ratón y el sombrero se inclina. Toma los colores del tema y el modo de la sección.',
    site: 'El panel de Dofus y checklists del menú, abierto y quieto, y el pie del sitio.',
    torre: 'El consejo de una guía: Torre hablando, con su avatar y un bocadillo.',
    header:
      'Seis pies bajo tierra, con el PNJ, el logro, el rango de XP y la bolsa de objetos (púlsala); Intoxicación profunda, sin PNJ ni logro y con un objeto sin icono.',
    wells:
      'Los iconos del juego en sus huecos, oscuros también en modo claro; el último, sin icono, queda vacío.',
    coordinates:
      'Los [x,y] de la prosa se convierten en chips; pulsar copia /travel x,y. Sin JavaScript son texto.',
    steps:
      'Separados por una línea, sin números, títulos ni casillas; el 3 lleva la chincheta del paso.',
    video: 'Con portada y sin portada. Nada de YouTube carga hasta pulsar.',
    image:
      'Pulsa la captura para verla a pantalla completa; Esc, Cerrar o un clic fuera la cierran. Sin JavaScript abre el archivo.',
  },
  demo: {
    brand: 'Torrente Arcano',
    siteCounts: { guides: 1272, achievements: 274 },
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
    nextEyebrow: 'Siguiente misión del logro',
    nextMeta: 'Kerubim Crepin te la da al terminar esta.',
  },
}
