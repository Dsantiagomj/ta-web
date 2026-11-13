// El mapa de los esbozos vacíos de Squarespace (backlog B-04), en código puro: cada esbozo va
// a la página de su logro cuando un visitante puede abrirla; queda sin fila (404) mientras esa
// página esté En preparación, y da 410 solo si no hay página que esperar.
// El esbozo es el nombre de un logro o el de una de sus misiones; casa por los datos de
// DofusDB que ya tiene ta-web (las misiones con su logro, los logros con su lista). Lo usa
// build-stub-redirects.ts, que lee esos datos y escribe la sección `stubs` de la tabla.

import type { LegacyStub } from './stubs.ts'

export interface StubData {
  achievements: {
    id: number
    dofusId: number
    name: string
    quests?: { name?: string | null }[] | null
  }[]
  quests: { name: string; achievement?: { dofusId?: number | null } | null }[]
  /** Las páginas de logro: su logro (el ID del documento) y su estado. */
  pages: { slug: string; state: string; achievement: number | null }[]
  /** Cada documento de las colecciones de /<slug>; `page` si un visitante la ve. */
  documents: { slug: string; collection: string; page: boolean }[]
}

export type StubOutcome =
  | {
      slug: string
      kind: 'moved'
      to: string
      via: 'achievement' | 'quest' | 'override'
      achievement?: string
    }
  | { slug: string; kind: 'gone'; reason: 'unmatched' | 'no-page'; achievement?: string }
  /** Su página de logro existe pero no se ve todavía: sin fila, 404 hasta que se publique. */
  | { slug: string; kind: 'pending'; achievement: string; page: string }
  /** Casa con varios logros: sin fila hasta que Torre elija uno en STUB_OVERRIDES. */
  | { slug: string; kind: 'ambiguous'; candidates: string[] }
  | { slug: string; kind: 'skipped'; reason: 'document' | 'other-section'; detail: string }

/**
 * Esbozos cuya página no es de logro: los Dofus que Torre tiene en una guía de Dofus con otro
 * slug. Solo valen si el destino es una página que un visitante ve.
 */
export const STUB_OVERRIDES: Record<string, string> = {
  'dofus-nebuloso': 'misiones-nebuloso',
}

function slugOf(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Los slugs que pudo dar un título en Squarespace: sin acentos, y con o sin la ñ. */
export function stubKeys(title: string): string[] {
  const name = title.replace(/^(logro|metalogro|mazmorra)\s*:\s*/i, '')
  return [...new Set([slugOf(name), slugOf(name.replace(/ñ/gi, ''))])].filter(Boolean)
}

type Achievement = StubData['achievements'][number]

/** Cada clave con todos los logros que da: más de uno es una colisión, no una elección. */
function indexBy<T>(
  items: T[],
  keysOf: (item: T) => string[],
  achievementOf: (item: T) => Achievement | undefined,
): Map<string, Map<number, Achievement>> {
  const index = new Map<string, Map<number, Achievement>>()
  for (const item of items) {
    const achievement = achievementOf(item)
    if (!achievement) continue
    for (const key of keysOf(item)) {
      const found = index.get(key) ?? new Map<number, Achievement>()
      found.set(achievement.dofusId, achievement)
      index.set(key, found)
    }
  }
  return index
}

/** Los logros que dan las claves del esbozo, por dofusId: el orden de la API no cuenta. */
function candidates(index: Map<string, Map<number, Achievement>>, keys: string[]): Achievement[] {
  const found = new Map<number, Achievement>()
  for (const key of keys) for (const [id, a] of index.get(key) ?? []) found.set(id, a)
  return [...found.values()].sort((a, b) => a.dofusId - b.dofusId)
}

/** Lo que pasa con cada esbozo. `taken`: las URL que ya están en otra sección de la tabla. */
export function mapStubs(
  stubs: readonly LegacyStub[],
  data: StubData,
  { taken }: { taken: ReadonlySet<string> },
): StubOutcome[] {
  const byDofusId = new Map(data.achievements.map((a) => [a.dofusId, a]))
  const pageOf = new Map(data.pages.flatMap((p) => (p.achievement ? [[p.achievement, p]] : [])))
  const documents = new Map(data.documents.map((d) => [d.slug, d]))
  const achievementIndex = indexBy(
    data.achievements,
    (a) => stubKeys(a.name),
    (a) => a,
  )
  // Una misión por su ficha (su logro) y por la lista de cada logro. Una misión cuyo logro no
  // está en ta-web no cuenta.
  const questRows = [
    ...data.quests.map((q) => ({
      name: q.name,
      achievement: byDofusId.get(q.achievement?.dofusId ?? -1),
    })),
    ...data.achievements.flatMap((a) =>
      (a.quests ?? []).flatMap((row) => (row.name ? [{ name: row.name, achievement: a }] : [])),
    ),
  ]
  const questIndex = indexBy(
    questRows,
    (row) => stubKeys(row.name),
    (row) => row.achievement,
  )

  return stubs.map((stub): StubOutcome => {
    const { slug } = stub
    if (taken.has(`/${slug}`)) {
      return { slug, kind: 'skipped', reason: 'other-section', detail: 'legacy-urls.json' }
    }
    const document = documents.get(slug)
    if (document) return { slug, kind: 'skipped', reason: 'document', detail: document.collection }

    const override = STUB_OVERRIDES[slug]
    if (override) {
      return documents.get(override)?.page
        ? { slug, kind: 'moved', to: `/${override}`, via: 'override' }
        : { slug, kind: 'gone', reason: 'no-page' }
    }

    const keys = [slug, ...stubKeys(stub.title)]
    const named = candidates(achievementIndex, keys)
    const found = named.length ? named : candidates(questIndex, keys)
    if (!found.length) return { slug, kind: 'gone', reason: 'unmatched' }
    if (found.length > 1) {
      return { slug, kind: 'ambiguous', candidates: found.map((a) => `${a.name} (${a.dofusId})`) }
    }
    const [achievement] = found

    const page = pageOf.get(achievement.id)
    if (!page) return { slug, kind: 'gone', reason: 'no-page', achievement: achievement.name }
    if (page.state !== 'published' || !documents.get(page.slug)?.page) {
      return { slug, kind: 'pending', achievement: achievement.name, page: page.slug }
    }
    return {
      slug,
      kind: 'moved',
      to: `/${page.slug}`,
      via: named.length ? 'achievement' : 'quest',
      achievement: achievement.name,
    }
  })
}

/**
 * La sección `stubs` de legacy-urls.json, en el orden de los esbozos. Se regenera cuando Torre
 * publica, así que sus redirecciones son temporales (307, `permanent: false`) hasta el corte:
 * con `cutover`, 301.
 */
export function stubsSection(
  outcomes: StubOutcome[],
  { cutover = false }: { cutover?: boolean } = {},
): { permanent?: false; moved: Record<string, string>; gone: string[] } {
  const moved: Record<string, string> = {}
  const gone: string[] = []
  for (const outcome of outcomes) {
    if (outcome.kind === 'moved') moved[`/${outcome.slug}`] = outcome.to
    if (outcome.kind === 'gone') gone.push(`/${outcome.slug}`)
  }
  return cutover ? { moved, gone } : { permanent: false, moved, gone }
}

const GONE_REASONS = {
  'no-page': '410: su logro no tiene página',
  unmatched: '410: no casa con ningún logro ni misión',
} as const

/** El informe para Torre: qué esbozo fue adónde, cuáles esperan y cuáles no tienen página. */
export function stubReport(outcomes: StubOutcome[]): string {
  const moved = outcomes.filter((o) => o.kind === 'moved')
  const gone = outcomes.filter((o) => o.kind === 'gone')
  const pending = outcomes.filter((o) => o.kind === 'pending')
  const ambiguous = outcomes.filter((o) => o.kind === 'ambiguous')
  const skipped = outcomes.filter((o) => o.kind === 'skipped')
  const lines = [
    [
      `Esbozos: ${outcomes.length}.`,
      `Redirecciones: ${moved.length}.`,
      `410: ${gone.length}.`,
      `Pendientes: ${pending.length}.`,
      `Ambiguos: ${ambiguous.length}.`,
      `Fuera: ${skipped.length}.`,
    ].join(' '),
    '',
    `A su página (${moved.length}):`,
    ...moved.map((o) => `  /${o.slug} → ${o.to}${o.achievement ? ` (${o.achievement})` : ''}`),
  ]
  if (pending.length) {
    lines.push('', `Sin fila, 404 hasta que se publique su página de logro (${pending.length}):`)
    for (const o of pending) lines.push(`  /${o.slug} (${o.achievement}, /${o.page})`)
  }
  if (ambiguous.length) {
    lines.push(
      '',
      `Sin fila, casan con varios logros; elegir en STUB_OVERRIDES (${ambiguous.length}):`,
    )
    for (const o of ambiguous) lines.push(`  /${o.slug}: ${o.candidates.join(', ')}`)
  }
  for (const reason of Object.keys(GONE_REASONS) as (keyof typeof GONE_REASONS)[]) {
    const group = gone.filter((o) => o.reason === reason)
    if (!group.length) continue
    lines.push('', `${GONE_REASONS[reason]} (${group.length}):`)
    for (const o of group) lines.push(`  /${o.slug}${o.achievement ? ` (${o.achievement})` : ''}`)
  }
  if (skipped.length) {
    lines.push('', `Fuera de la sección (${skipped.length}):`)
    for (const o of skipped) {
      const why = o.reason === 'document' ? 'ya es un documento de' : 'ya está en'
      lines.push(`  /${o.slug}: ${why} ${o.detail}`)
    }
  }
  return lines.join('\n')
}
