// Las 30 páginas de oro de la importación de Squarespace (backlog S-15): las que fija
// pnpm test:import para que un cambio en un conversor que altere contenido real se vea antes
// de la importación delta. Cubren las ramas de cada conversor; el porqué de cada una está en
// tests/fixtures/import-golden/README.md. Sus fuentes recortadas están en
// tests/fixtures/import-golden/pages/ y sus salidas revisadas en .../expected/.

/** Qué conversor lee la página. */
export type GoldenKind = 'quest' | 'achievement' | 'dofus' | 'page' | 'class' | 'dungeon'

export interface GoldenPage {
  slug: string
  kind: GoldenKind
  /** La rama del conversor que fija. */
  why: string
}

const page = (kind: GoldenKind, slug: string, why: string): GoldenPage => ({ slug, kind, why })

export const GOLDEN_PAGES: GoldenPage[] = [
  // Guías de misiones: squarespace/parse-page.ts y squarespace/to-quest-guide.ts.
  page(
    'quest',
    'el-cazador-cazado',
    'la normal: línea de inicio, pasos con coordenadas y capturas',
  ),
  page('quest', 'intoxicacion-profunda', 'un vídeo de YouTube tras la frase de cierre'),
  page('quest', 'operacion-envenenamiento', 'encabezado numerado distinto del título'),
  page(
    'quest',
    'seis-pies-bajo-tierra',
    'avisos IMPORTANTE y RECOMENDACIONES, y listas en los pasos',
  ),
  page(
    'quest',
    'el-safari-de-almas',
    'pasos marcados con «ETAPA n:» de dos en dos, sin línea de inicio',
  ),
  page('quest', 'entretanto-un-renacer', 'la larga: 23 pasos, RECOMENDACIONES y 44 capturas'),
  page('quest', 'gajes-de-la-chocolateria', 'recompensas por nivel («Si eres nivel…»)'),
  page('quest', 'wali-y-la-fabrica-de-chocolate', 'recompensas por nivel y sin Necesitarás'),
  page('quest', 'torcer-el-brazo', 'dos vídeos y sin línea de inicio'),
  page('quest', 'un-lamentable-descuido', 'un bloque de imagen vacío de Squarespace'),
  page('quest', 'el-destino', 'sin pasos: todo prosa y bloques de imagen vacíos'),
  page('quest', 'como-entrar-a-la-casa-de-keprinus', 'cómo entrar: sin resumen ni pasos'),
  page('quest', 'el-calendario-de-la-siega', 'índice de enlaces a otras guías'),
  page('quest', 'toma-de-sangre', 'un enlace a otra web'),
  page('quest', 'emote-dar-un-beso', 'un emote que es guía de misión'),
  page('quest', 'ron-marino', 'vídeo en el último paso, pasos sin coordenadas y «Prerequisitos»'),
  // Prosa de los logros: achievements/prose.ts.
  page('achievement', 'draguisla-tortilla', 'entrada con capturas y vídeo'),
  page('achievement', 'el-guardian-del-puente-de-la-muerte', 'cierre largo con capturas'),
  page('achievement', 'el-perforar-se-va-a-acabar', 'cierre con dos vídeos'),
  // Guías de Dofus: dofus-guides/parse.ts.
  page('dofus', 'dofus-de-los-hielos', 'aviso de su checklist y misiones sueltas'),
  page('dofus', 'dofus-plateado', 'metalogros con sus logros'),
  page('dofus', 'dofus-cacao', 'vídeo, cuatro grupos de Necesitarás y mazmorras por nivel'),
  page('dofus', 'piata-de-pino', 'paso a paso con capturas y recompensas'),
  // Páginas sueltas: pages/convert.ts.
  page('page', 'emotes-global', 'el índice de emotes, con enlaces a sus páginas'),
  page('page', 'emote-soltar-los-gases', 'un emote: texto y dos capturas lado a lado'),
  page('page', 'acceso-pandala-3', 'un cómo llegar con capturas'),
  page('page', 'aviso-legal', 'una página legal larga'),
  // Clases y mazmorras: section-pages/convert.ts.
  page('class', 'feca-1', 'builds de PVM y PVP con su enlace'),
  page('class', 'yopuka-1', 'sin builds reconocidas: texto e imágenes vacías'),
  page('dungeon', 'mazmorra-templo-del-dios-kao', 'texto y capturas, descripción SEO larga'),
]
