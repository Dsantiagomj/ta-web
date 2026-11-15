// Las páginas sueltas de Torre en Squarespace que pasan a la colección pages (backlog B-09,
// S-12, B-10), con su slug de siempre (emote-sealar-con-el-dedo es su URL real). El emote
// «Dar un beso» no está: ya es una guía de misión (/emote-dar-un-beso). El título es
// su primer encabezado con otras mayúsculas: la importación comprueba que solo cambian las
// mayúsculas y, si no, deja el encabezado en el texto. Las legales llegan En preparación:
// mencionan anuncios y un banner de cookies que ya no aplican, y Torre las reescribe.

export interface PageEntry {
  slug: string
  title: string
  /** Publicada o En preparación al crearla; después lo decide Torre. */
  state: 'published' | 'preparing'
  /** El slug de su página superior, para las migas. */
  parent?: string
}

export const PAGE_CATALOG: PageEntry[] = [
  { slug: 'emotes-global', title: 'Emotes', state: 'published' },
  {
    slug: 'emote-sealar-con-el-dedo',
    title: 'Señalar con el dedo',
    state: 'published',
    parent: 'emotes-global',
  },
  {
    slug: 'emote-soltar-los-gases',
    title: 'Soltar los gases',
    state: 'published',
    parent: 'emotes-global',
  },
  {
    slug: 'acceso-pandala-3',
    title: 'Cómo acceder a la dimensión Wukin y Wukang',
    state: 'published',
  },
  { slug: 'camino-a-stim-power', title: 'Camino a Stim Power', state: 'published' },
  // No repite /ayudar-a-los-weyes-magos (la página del logro): explica el Wegalo de Nawidad.
  { slug: 'weyes-magos', title: 'Wegalo de los Weyes Magos', state: 'published' },
  { slug: 'aviso-legal', title: 'Aviso Legal', state: 'preparing' },
  {
    slug: 'politica-de-cookies',
    title: 'Política de Cookies de torrentearcano.com',
    state: 'preparing',
  },
  { slug: 'politica-de-privacidad', title: 'Política de Privacidad', state: 'preparing' },
]
