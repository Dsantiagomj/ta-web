// Las páginas de clase y de mazmorra de Torre en Squarespace (backlog S-10 y S-11), con su
// slug de siempre (feca-1 y yopuka-1 llevan su -1). El título es su primer encabezado con
// otras mayúsculas: la importación comprueba que solo cambian las mayúsculas y, si no, deja el
// encabezado en el texto. El índice /clases-1 no está: es una cuadrícula de imágenes que
// esperará al diseño de la sección. Todas llegan En preparación, como borrador.

export interface SectionPageEntry {
  slug: string
  title: string
  /** Si sale en la lista del menú al crearla; después lo decide Torre. */
  inMenu: boolean
}

const entry = (slug: string, title: string, inMenu = true): SectionPageEntry => ({
  slug,
  title,
  inMenu,
})

export const CLASS_CATALOG: SectionPageEntry[] = [
  entry('feca-1', 'Feca'),
  entry('osamodas', 'Osamodas'),
  entry('sram', 'Sram'),
  entry('anutrof', 'Anutrof'),
  entry('xelor', 'Xelor'),
  entry('zurcarak', 'Zurcarák'),
  entry('aniripsa', 'Aniripsa'),
  entry('yopuka-1', 'Yopuka'),
  entry('sadida', 'Sadida'),
  entry('ocra', 'Ocra'),
  entry('pandawa', 'Pandawa'),
  entry('sacrogrito', 'Sacrógrito'),
  entry('tymador', 'Tymador'),
  entry('zobal', 'Zobal'),
  entry('steamer', 'Steamer'),
  entry('selotrop', 'Selotrop'),
  entry('hipermago', 'Hipermago'),
  entry('forjalanza', 'Forjalanza'),
  entry('uginak', 'Uginak'),
]

// El menú de hoy enlaza ocho mazmorras; los dos jefes de Nawidad y el Palacio de Dientinea
// (su slug en Squarespace es pagina-nueva) no salen en él, y siguen sin salir.
export const DUNGEON_CATALOG: SectionPageEntry[] = [
  entry('mazmorra-templo-del-dios-kao', 'Templo del Dios Kao'),
  entry('mazmorra-crunchidor', 'Crocantería'),
  entry('pikabeto', 'Pikabeto'),
  entry('mazmorras-de-nawidad', 'Mazmorras de Nawidad'),
  entry('gruente', 'Cómo vencer al Gruñente', false),
  entry('minotobola-de-nawidad', 'Cómo vencer al Minotobola de Nawidad', false),
  entry('mazmorra-templo-de-kutulu', 'Templo de Kutulú'),
  entry('mazmorra-nave-del-capitan-meno', 'Nave del Capitán Meno'),
  entry('mazmorra-acuadomo-de-merkator', 'Acuadomo de Merkator'),
  entry('mazmorra-fundicion-de-los-waddictos', 'Fundición de los Waddictos'),
  entry('pagina-nueva', 'Palacio de Dientinea', false),
]
