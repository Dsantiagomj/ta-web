// El mapa de los esbozos vacíos de Squarespace (backlog B-04), en código puro: cada esbozo va
// con un 301 a la página de su logro cuando un visitante puede abrirla, y con un 410 si no.
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
  | {
      slug: string
      kind: 'gone'
      reason: 'unmatched' | 'no-page' | 'page-not-public'
      achievement?: string
      page?: string
    }
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

function firstBy<T>(items: T[], keysOf: (item: T) => string[]): Map<string, T> {
  const map = new Map<string, T>()
  for (const item of items) for (const key of keysOf(item)) if (!map.has(key)) map.set(key, item)
  return map
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
  const achievementByName = firstBy(data.achievements, (a) => stubKeys(a.name))
  // La misión con el logro de ID más bajo, como el logro de cada misión en map-quest.ts.
  const questRows = [
    ...data.quests.flatMap((q) => {
      const achievement = byDofusId.get(q.achievement?.dofusId ?? -1)
      return q.achievement?.dofusId ? [{ name: q.name, achievement }] : []
    }),
    ...data.achievements.flatMap((a) =>
      (a.quests ?? []).flatMap((row) => (row.name ? [{ name: row.name, achievement: a }] : [])),
    ),
  ].sort((a, b) => (a.achievement?.dofusId ?? Infinity) - (b.achievement?.dofusId ?? Infinity))
  const questByName = firstBy(questRows, (row) => stubKeys(row.name))

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
    const named = keys.map((key) => achievementByName.get(key)).find(Boolean)
    const quest = named ? null : keys.map((key) => questByName.get(key)).find(Boolean)
    const achievement = named ?? quest?.achievement
    if (!achievement) return { slug, kind: 'gone', reason: 'unmatched' }

    const page = pageOf.get(achievement.id)
    if (!page) return { slug, kind: 'gone', reason: 'no-page', achievement: achievement.name }
    if (page.state !== 'published' || !documents.get(page.slug)?.page) {
      return {
        slug,
        kind: 'gone',
        reason: 'page-not-public',
        achievement: achievement.name,
        page: page.slug,
      }
    }
    return {
      slug,
      kind: 'moved',
      to: `/${page.slug}`,
      via: named ? 'achievement' : 'quest',
      achievement: achievement.name,
    }
  })
}

/** La sección `stubs` de legacy-urls.json: los 301 y los 410, en el orden de los esbozos. */
export function stubsSection(outcomes: StubOutcome[]): {
  moved: Record<string, string>
  gone: string[]
} {
  const moved: Record<string, string> = {}
  const gone: string[] = []
  for (const outcome of outcomes) {
    if (outcome.kind === 'moved') moved[`/${outcome.slug}`] = outcome.to
    if (outcome.kind === 'gone') gone.push(`/${outcome.slug}`)
  }
  return { moved, gone }
}

const GONE_REASONS = {
  'page-not-public': '410 por ahora: su página de logro está En preparación o en borrador',
  'no-page': '410: su logro no tiene página',
  unmatched: '410: no casa con ningún logro ni misión',
} as const

/** El informe para Torre: qué esbozo fue adónde y cuáles no tienen página. */
export function stubReport(outcomes: StubOutcome[]): string {
  const moved = outcomes.filter((o) => o.kind === 'moved')
  const gone = outcomes.filter((o) => o.kind === 'gone')
  const skipped = outcomes.filter((o) => o.kind === 'skipped')
  const lines = [
    `Esbozos: ${outcomes.length}. 301: ${moved.length}. 410: ${gone.length}. Fuera: ${skipped.length}.`,
    '',
    `301 a su página (${moved.length}):`,
    ...moved.map((o) => `  /${o.slug} → ${o.to}${o.achievement ? ` (${o.achievement})` : ''}`),
  ]
  for (const reason of Object.keys(GONE_REASONS) as (keyof typeof GONE_REASONS)[]) {
    const group = gone.filter((o) => o.reason === reason)
    if (!group.length) continue
    lines.push('', `${GONE_REASONS[reason]} (${group.length}):`)
    for (const o of group) {
      const detail = [o.achievement, o.page && `/${o.page}`].filter(Boolean).join(', ')
      lines.push(`  /${o.slug}${detail ? ` (${detail})` : ''}`)
    }
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
