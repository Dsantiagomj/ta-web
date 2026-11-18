// Qué o quién desbloquea una URL vieja que este sitio aún no sirve: la lista del día del
// corte (AGENTS.md, Redirects) agrupa por esto lo que dejan pnpm links:legacy y
// pnpm urls:map. Código puro.
// - Aplazado, lo decide el dueño antes del corte (2026-11-18): las clases, las mazmorras y
//   las tres herramientas incrustadas. Ni redirección ni 410.
// - Lo publicado En preparación: Torre lo publica, según su colección.
// - Lo que espera una fila del backlog (S-06, S-08), un esbozo sin fila (B-04) o un cambio de
//   Torre en el panel; y lo que nadie ha decidido todavía.
import type { ServedKind } from '@/lib/site/site-links'

import { CLASS_CATALOG, DUNGEON_CATALOG } from '../import/section-pages/catalog'
import { LEGACY_STUBS } from '../redirects/stubs'

export type BlockerKey =
  | 'classes'
  | 'dungeons'
  | 'tools'
  | 'S-08'
  | 'S-06'
  | 'S-05'
  | 'dofus-guides'
  | 'pages'
  | 'checklists'
  | 'stub'
  | 'torre-edits'
  | 'undecided'

/** El texto de cada bloqueo: en español para la consola, en inglés para docs/. */
export const BLOCKERS: Record<BlockerKey, { es: string; en: string }> = {
  classes: {
    es: 'Aplazado: clases (S-10), se decide antes del corte',
    en: 'Deferred: classes (S-10), decide before cutover',
  },
  dungeons: {
    es: 'Aplazado: mazmorras y el hub de la Crocantería (S-11), se decide antes del corte',
    en: 'Deferred: dungeons and the Crocantería hub (S-11), decide before cutover',
  },
  tools: {
    es: 'Aplazado: las herramientas incrustadas, se decide antes del corte',
    en: 'Deferred: the inline tools, decide before cutover',
  },
  'S-08': {
    es: 'S-08: el metalogro Krosmoz y las tres páginas sueltas (Torre)',
    en: 'S-08: the Krosmoz metalogro and the three loose pages (Torre)',
  },
  'S-06': {
    es: 'S-06: los 22 logros de Alineamiento, sin página aquí (datos y Torre)',
    en: 'S-06: the 22 Alineamiento achievements, no page here yet (data and Torre)',
  },
  'S-05': {
    es: 'Torre publica la página de logro En preparación (S-05)',
    en: 'Torre publishes the achievement page «En preparación» (S-05)',
  },
  'dofus-guides': {
    es: 'Torre publica la guía de Dofus En preparación',
    en: 'Torre publishes the Dofus guide «En preparación»',
  },
  pages: {
    es: 'Torre publica la página suelta En preparación (las legales: B-10)',
    en: 'Torre publishes the site page «En preparación» (legal pages: B-10)',
  },
  checklists: {
    es: 'Torre publica la checklist En preparación',
    en: 'Torre publishes the checklist «En preparación»',
  },
  stub: {
    es: 'Esbozo vacío sin fila: espera su página de logro (B-04, S-05; pnpm redirects:stubs dice cuál)',
    en: 'Empty stub with no row: waits for its achievement page (B-04, S-05; `pnpm redirects:stubs` names it)',
  },
  'torre-edits': {
    es: 'Torre cambia el enlace: aquí da 410 y nada lo sustituye',
    en: 'Torre edits the link: it answers 410 here and nothing replaces it',
  },
  undecided: {
    es: 'Sin decidir: una página, una fila de redirección o un cambio en el panel',
    en: 'Undecided: a page, a redirect row or an edit in the panel',
  },
}

/** El orden de la lista del corte: lo aplazado, el backlog, lo que publica Torre y lo demás. */
export const BLOCKER_ORDER: readonly BlockerKey[] = [
  'classes',
  'dungeons',
  'tools',
  'S-08',
  'S-06',
  'S-05',
  'dofus-guides',
  'pages',
  'checklists',
  'stub',
  'torre-edits',
  'undecided',
]

const slugs = (...list: string[]) => new Set(list)

/** Aplazado por el dueño el 2026-11-18. El índice /clases-1 no está en el catálogo. */
const DEFERRED: [BlockerKey, ReadonlySet<string>][] = [
  ['classes', slugs('clases-1', ...CLASS_CATALOG.map((entry) => entry.slug))],
  ['dungeons', slugs(...DUNGEON_CATALOG.map((entry) => entry.slug))],
  ['tools', slugs('mascotas', 'team-builder', 'sets-y-clases')],
]

/** Lo que espera una fila del backlog, sin documento aquí todavía. */
const KNOWN: [BlockerKey, ReadonlySet<string>][] = [
  [
    'S-08',
    slugs(
      'metalogro-krosmoz',
      'logro-misiones-extra-de-vulkania',
      'el-guardian-del-puente-de-la-muerte',
      'el-caballero-negro-y-rosa',
    ),
  ],
  [
    'S-06',
    slugs(
      'logro-a-sus-ordenes',
      'en-guardia',
      'de-cabo-acabo',
      'galones-son-amores',
      'si-mi-coma-andante',
      'aspirador',
      'teniente-pendiente',
      'soy-el-capitan-de-la-nave-tengo-el-controool',
      'comando-y-mando',
      'coronel-miaumiabert',
      'servicio-a-la-comunidad',
      'ordeno-y-mando',
      'hasta-nueva-orden',
      'orden-del-dia',
      'mantener-en-orden',
      'poner-orden',
      'todo-esta-en-orden',
      'en-otra-orden-de-cosas',
      'tus-deseos-son-ordenes',
      'tus-deseos-son-desordenes',
      'la-diligencia',
      'solo-un-pinchacito',
    ),
  ],
  // Las legales sin documento en «Páginas»: el pie las enlaza igual (legalLinks).
  ['pages', slugs('aviso-legal', 'politica-de-cookies', 'politica-de-privacidad')],
]

/** El porqué de algunas URL sin decidir, para quien decide. */
const NOTES: Record<string, string> = {
  'hablar-con-volkaragnar':
    'Page Torre added on 2026-11-15, after the import: the last step of the Dofus Forjalava. Torre decides: import it as a quest guide, or a redirect row to `/dofus-forjalava`',
}

/** Quién publica lo En preparación de cada colección. */
const PREPARING: Record<string, BlockerKey> = {
  'achievement-pages': 'S-05',
  'dofus-guides': 'dofus-guides',
  pages: 'pages',
  checklists: 'checklists',
  'class-pages': 'classes',
  'dungeon-pages': 'dungeons',
}

const STUBS = new Set(LEGACY_STUBS.map((stub) => stub.slug))

/** El slug de una ruta («/Feca-1/?x#y» → «feca-1»). */
export const slugOfPath = (path: string) =>
  path
    .split(/[?#]/u)[0]!
    .replace(/^\/+|\/+$/gu, '')
    .toLowerCase()

export interface BlockerContext {
  /** La colección de lo publicado En preparación con ese slug, o null. */
  preparing: (slug: string) => string | null
}

/** Qué o quién desbloquea una ruta que este sitio no sirve (o que da 410). */
export function blockerOf(
  path: string,
  served: ServedKind | null,
  { preparing }: BlockerContext,
): BlockerKey {
  const slug = slugOfPath(path)
  const deferred = DEFERRED.find(([, set]) => set.has(slug))
  if (deferred) return deferred[0]
  const collection = preparing(slug)
  if (collection) return PREPARING[collection] ?? 'undecided'
  const known = KNOWN.find(([, set]) => set.has(slug))
  if (known) return known[0]
  if (served === 'gone') return 'torre-edits'
  if (STUBS.has(slug)) return 'stub'
  return 'undecided'
}

/** Si una ruta está aplazada (clases, mazmorras, herramientas): su bloqueo, o null. */
export function deferredOf(path: string): BlockerKey | null {
  const slug = slugOfPath(path)
  return DEFERRED.find(([, set]) => set.has(slug))?.[0] ?? null
}

/** La nota de una URL sin decidir, en inglés (va a docs/research/url-map.md). */
export const noteOf = (path: string): string | undefined => NOTES[slugOfPath(path)]
