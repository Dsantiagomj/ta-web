// Los Dofus de la página de guías de Torre (torrentearcano.com/guias-dofus), en su orden.
// Copiado del manifiesto del embed de guías de silvestre-checklist
// (src/embeds/guias/manifest.js, 2026-11-09): nombre, etiqueta, nivel, color y otros nombres.
// El ID es el del objeto en DofusDB (tipo 23), casado por su icono: el del Cacao y el del
// Vulbis aparecen dos veces en DofusDB y se usa el del nivel de Torre. Es la semilla de la
// importación; después, todo esto se cambia en el panel.

export interface DofusCatalogEntry {
  /** El slug de su guía, el mismo que en la web de Torre. */
  slug: string
  name: string
  /** Si Torre tiene una página para él; sin ella el Dofus queda En preparación. */
  page: boolean
  tag: 'primordial' | 'event' | null
  level: number
  color: string
  /** El ID del objeto Dofus en DofusDB. */
  dofusId: number
  aliases?: string
  /** Su checklist, cuando la página de Torre no la anuncia con un aviso. */
  checklist?: { name: string; url: string }
}

/** La entradilla de la página de guías de Dofus de Torre, tal cual. */
export const DOFUS_INDEX_INTRO =
  'Descubre aquí todas las diferentes guías de los Dofus: primordiales, de evento y muchos más. ' +
  'Podrás conocer qué misiones y logros son necesarios para obtener el Dofus que quieras, y la ' +
  'manera más eficiente para no repetir contenido.'

export const DOFUS_CATALOG: readonly DofusCatalogEntry[] = [
  {
    slug: 'dofawa',
    name: 'Dofawa',
    page: true,
    tag: null,
    level: 6,
    color: '#ff9118',
    dofusId: 7113,
  },
  {
    slug: 'dofus-plateado',
    name: 'Dofus Plateado',
    page: true,
    tag: null,
    level: 20,
    color: '#dce1c9',
    dofusId: 19629,
  },
  {
    slug: 'jyfus',
    name: 'Jyfus',
    page: true,
    tag: 'event',
    level: 20,
    color: '#8fc44a',
    dofusId: 30356,
  },
  {
    slug: 'dofus-cacao',
    name: 'Dofus Cacao',
    page: true,
    tag: 'event',
    level: 50,
    color: '#ebb838',
    dofusId: 20833,
  },
  {
    slug: 'dofus-zanahowia',
    name: 'Dofus Zanahowia',
    page: true,
    tag: null,
    level: 60,
    color: '#ff9118',
    dofusId: 972,
    aliases: 'zanahoria',
  },
  {
    slug: 'dosaurio',
    name: 'Dosaurio',
    page: true,
    tag: 'event',
    level: 80,
    color: '#52abff',
    dofusId: 10907,
  },
  {
    slug: 'dokoko',
    name: 'Dokoko',
    page: true,
    tag: null,
    level: 80,
    color: '#aa6237',
    dofusId: 17078,
  },
  {
    slug: 'dofus-kalipto',
    name: 'Dofus Kalipto',
    page: false,
    tag: null,
    level: 100,
    color: '#97d03a',
    dofusId: 8072,
    aliases: 'kaliptus',
  },
  {
    slug: 'dofus-vigilante',
    name: 'Dofus Vigilante',
    page: true,
    tag: null,
    level: 100,
    color: '#1fdcd1',
    dofusId: 16061,
  },
  {
    slug: 'dolmanax',
    name: 'Dolmanax',
    page: true,
    tag: null,
    level: 100,
    color: '#eb69af',
    dofusId: 13344,
  },
  {
    slug: 'dofus-esmeralda',
    name: 'Dofus Esmeralda',
    page: true,
    tag: 'primordial',
    level: 100,
    color: '#2ecd68',
    dofusId: 737,
  },
  {
    slug: 'dofus-purpura',
    name: 'Dofus Púrpura',
    page: true,
    tag: 'primordial',
    level: 110,
    color: '#ba374b',
    dofusId: 694,
  },
  {
    slug: 'dotruz',
    name: 'Dotruz',
    page: true,
    tag: null,
    level: 110,
    color: '#f578b4',
    dofusId: 15235,
  },
  {
    slug: 'domakuro',
    name: 'Domakuro',
    page: true,
    tag: null,
    level: 120,
    color: '#6e737d',
    dofusId: 23237,
  },
  {
    slug: 'dorigami',
    name: 'Dorigami',
    page: true,
    tag: null,
    level: 150,
    color: '#eef0f6',
    dofusId: 23408,
  },
  {
    slug: 'dofus-ocre',
    name: 'Dofus Ocre',
    page: true,
    tag: 'primordial',
    level: 160,
    color: '#d18b23',
    dofusId: 7754,
    checklist: { name: 'Almas del Ocre', url: 'https://www.torrentearcano.com/lista-ocre' },
  },
  {
    slug: 'dofus-turquesa',
    name: 'Dofus Turquesa',
    page: true,
    tag: 'primordial',
    level: 160,
    color: '#1fd5d5',
    dofusId: 739,
  },
  {
    slug: 'dofzzbz',
    name: 'Dofzzbz',
    page: true,
    tag: null,
    level: 170,
    color: '#e8703a',
    dofusId: 31794,
  },
  {
    slug: 'dofus-vulbis',
    name: 'Dofus Vulbis',
    page: true,
    tag: null,
    level: 180,
    color: '#eb4623',
    dofusId: 6980,
  },
  {
    slug: 'dofus-de-los-hielos',
    name: 'Dofus de los Hielos',
    page: true,
    tag: null,
    level: 180,
    color: '#47c4ff',
    dofusId: 7043,
  },
  {
    slug: 'misiones-nebuloso',
    name: 'Dofus Nebuloso',
    page: true,
    tag: null,
    level: 180,
    color: '#875cd2',
    dofusId: 8698,
  },
  {
    slug: 'dofus-abisal',
    name: 'Dofus Abisal',
    page: true,
    tag: null,
    level: 180,
    color: '#2a5aaa',
    dofusId: 18043,
  },
  {
    slug: 'dofus-marfil',
    name: 'Dofus Marfil',
    page: true,
    tag: 'primordial',
    level: 180,
    color: '#ebdcb4',
    dofusId: 7115,
  },
  {
    slug: 'dofus-forjalava',
    name: 'Dofus Forjalava',
    page: true,
    tag: null,
    level: 180,
    color: '#ee5a1f',
    dofusId: 19398,
  },
  {
    slug: 'dofus-ebano',
    name: 'Dofus Ébano',
    page: true,
    tag: 'primordial',
    level: 180,
    color: '#7d6996',
    dofusId: 7114,
  },
  {
    slug: 'dofus-centelleante',
    name: 'Dofus Centelleante',
    page: true,
    tag: null,
    level: 180,
    color: '#dee9f6',
    dofusId: 20286,
  },
  {
    slug: 'dofus-moteado',
    name: 'Dofus Moteado',
    page: true,
    tag: null,
    level: 180,
    color: '#ebeef2',
    dofusId: 7112,
  },
  {
    slug: 'piata-de-pino',
    name: 'Piñata de Pino',
    page: true,
    tag: null,
    level: 180,
    color: '#51b268',
    dofusId: 27803,
  },
  {
    slug: 'dofus-pesadilla',
    name: 'Dofus Pesadilla',
    page: true,
    tag: null,
    level: 180,
    color: '#69379b',
    dofusId: 26066,
  },
  {
    slug: 'dofus-silvestre',
    name: 'Dofus Silvestre',
    page: true,
    tag: null,
    level: 180,
    color: '#b0d62d',
    dofusId: 29134,
    checklist: {
      name: 'Checklist Dofus Silvestre',
      url: 'https://www.torrentearcano.com/checklist-silvestre',
    },
  },
]
