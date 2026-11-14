// El arte de las tarjetas del índice /checklists: el del hub de silvestre-checklist
// (src/embeds/hub/manifest.js). Sube a Media cada imagen una vez (art.ts, con su clave en
// media.gameAsset) y rellena la tarjeta de cada checklist (su escena, su PNJ y el encuadre) y la
// tarjeta «???» del global checklists-index (su escena y su huevo). El color no se trae: vacío,
// la tarjeta usa el de la guía de su Dofus. También pone el nombre del hub («Dofus Ocre») si el
// guardado sigue siendo el que escribió la importación de las checklists.
//
// Un campo cambia solo si sigue como lo dejó la última importación: lo que escribió cada vez se
// guarda en importSnapshot (`card` en la checklist, `teaser` en el global, `name` compartido con
// pnpm import:checklists). Sin nada importado antes, un campo que ya tiene valor es de Torre y
// se queda. Se decide antes de subir nada: una imagen que no se va a usar no se sube.
//
// Una checklist con un borrador a medias (las portadas, que esperan la revisión de Torre) se
// decide dos veces: lo publicado, que es lo que enseña el índice, con lo publicado; y el
// borrador con el borrador, que sigue siendo el último y sin publicar. Así lo que Torre cambió
// en el borrador no se publica. Payload publica lo último guardado, así que se restaura lo
// publicado, se publica con sus cambios y se vuelve a guardar el borrador entero con los suyos.
import type { Payload } from 'payload'

import type { Checklist, ChecklistsIndex } from '@/payload-types'

import type { ArtRef } from './to-checklist'

/** La tarjeta de una checklist en el hub antiguo: su escena, su PNJ y su encuadre (npcFit). */
export interface CardArt {
  scene: ArtRef
  npc?: ArtRef
  /** En % de la tarjeta: alto, cuánto se sale por la derecha y desde arriba. */
  npcFit?: { height: number; right: number; top: number }
}

export interface CardImportEntry {
  slug: string
  /** Su nombre en el hub; solo cambia el que escribió la importación. */
  name?: string
  card: CardArt
}

/** La tarjeta «???» del hub antiguo (SOON en manifest.js). */
export const TEASER_ART = {
  scene: { path: 'zones/krosmoz.jpg', alt: 'El Krosmoz' },
  egg: { path: 'hub/dofus-soon.png', alt: 'Un Dofus por descubrir' },
} satisfies Record<string, ArtRef>

/** Las imágenes, como las da checklistArt (art.ts). */
export interface CardArtStore {
  /** El ID en Media, subiéndola si hace falta; en seco, -1 si la subiría. null si no existe. */
  media: (art: ArtRef) => Promise<number | null>
  /** El ID en Media sin subir nada; -1 si habría que subirla. null si no existe. */
  find: (art: ArtRef) => Promise<number | null>
}

export interface LoadChecklistCardsOptions {
  entries: CardImportEntry[]
  teaser: { scene: ArtRef; egg: ArtRef } | null
  /** Sin él solo cuenta y avisa de lo que haría. */
  apply: boolean
  art: CardArtStore
  log?: (message: string) => void
}

export interface LoadChecklistCardsReport {
  updated: string[]
  unchanged: string[]
  /** Las checklists del catálogo que todavía no están en la base (pnpm import:checklists). */
  missing: string[]
  /** Las que tenían un borrador a medias: se decidieron lo publicado y el borrador por separado. */
  withDraft: string[]
  /** Las que reciben el nombre del hub. */
  renamed: string[]
  /** Campos que Torre cambió en el panel y la importación respetó. */
  kept: { slug: string; field: string }[]
  /** Imágenes que no están en la copia de silvestre-checklist. */
  missingArt: string[]
  /** Imágenes que se subirían (en seco) o que se subieron. */
  pendingArt: number
  teaser: 'updated' | 'unchanged' | 'skipped'
}

type Value = number | string | null
type Values = Record<string, Value>
type Snapshot = Record<string, unknown> & { card?: Values; teaser?: Values; name?: string }

/** Lo importado de un campo: un valor, o una imagen que hay que buscar o subir. */
type Wanted = { value: Value } | { art: ArtRef }

const valueOf = (value: unknown): Value => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'number') {
    return value.id
  }
  return null
}

const empty = (value: Value) => value === null || value === ''

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? {}) === JSON.stringify(b ?? {})

/** Lo que pide cambiar una importación en unos campos. */
interface Plan {
  changes: Values
  kept: string[]
  /** El snapshot nuevo de esos campos. */
  next: Values
  /** Los campos con imagen por subir: solo se suben si de verdad cambian. */
  uploads: Record<string, ArtRef>
}

/**
 * Decide campo a campo, antes de subir nada. Con snapshot, cambia lo que sigue como lo dejó;
 * sin él, lo vacío. Lo demás es de Torre, y su imagen ni se busca.
 */
async function plan(
  wanted: Record<string, Wanted>,
  stored: Record<string, unknown>,
  snapshot: Values | undefined,
  art: CardArtStore,
  missingArt: Set<string>,
): Promise<Plan> {
  const result: Plan = { changes: {}, kept: [], next: { ...snapshot }, uploads: {} }
  for (const [field, want] of Object.entries(wanted)) {
    const current = valueOf(stored[field])
    const known = snapshot !== undefined && field in snapshot
    // Torre lo cambió desde la última importación.
    if (known && current !== snapshot[field]) {
      result.kept.push(field)
      continue
    }
    let value: Value
    if ('art' in want) {
      // Sin importación anterior y con valor: solo se busca para saber si es la misma imagen.
      const id = await art.find(want.art)
      // Una imagen que no está no borra la que hubiera.
      if (id === null) {
        missingArt.add(want.art.path)
        continue
      }
      value = id
    } else value = want.value
    if (current === value) {
      result.next[field] = value
      continue
    }
    // Sin importación anterior, lo que ya tiene valor es de Torre.
    if (!known && !empty(current)) {
      result.kept.push(field)
      continue
    }
    result.changes[field] = value
    result.next[field] = value
    if ('art' in want && value === -1) result.uploads[field] = want.art
  }
  return result
}

/** Sube las imágenes que de verdad cambian y pone su ID; en seco se quedan en -1. */
async function upload(target: Plan, art: CardArtStore, pending: Set<string>, apply: boolean) {
  for (const [field, ref] of Object.entries(target.uploads)) {
    pending.add(ref.path)
    if (!apply) continue
    const id = await art.media(ref)
    target.changes[field] = id
    target.next[field] = id
  }
}

type Version = Pick<Checklist, 'name' | 'card' | 'importSnapshot'>

const cardWanted = (entry: CardImportEntry): Record<string, Wanted> => ({
  scene: { art: entry.card.scene },
  ...(entry.card.npc && { npc: { art: entry.card.npc } }),
  ...(entry.card.npcFit && {
    npcHeight: { value: entry.card.npcFit.height },
    npcRight: { value: entry.card.npcFit.right },
    npcTop: { value: entry.card.npcFit.top },
  }),
})

/** Lo que cambia en una versión: su tarjeta y su nombre. */
async function planVersion(
  entry: CardImportEntry,
  version: Version,
  art: CardArtStore,
  missingArt: Set<string>,
) {
  const snapshot = (version.importSnapshot ?? {}) as Snapshot
  const card = await plan(
    cardWanted(entry),
    (version.card ?? {}) as Record<string, unknown>,
    snapshot.card,
    art,
    missingArt,
  )
  // El nombre comparte su snapshot con pnpm import:checklists: sin él, es de Torre.
  const name = entry.name
    ? await plan(
        { name: { value: entry.name } },
        { name: version.name },
        'name' in snapshot ? { name: snapshot.name ?? null } : {},
        art,
        missingArt,
      )
    : null
  return { snapshot, card, name }
}

type VersionPlan = Awaited<ReturnType<typeof planVersion>>

const hasChanges = (p: VersionPlan) =>
  Object.keys(p.card.changes).length > 0 || Object.keys(p.name?.changes ?? {}).length > 0
const snapshotChanged = (p: VersionPlan) =>
  !same(p.card.next, p.snapshot.card) ||
  (p.name !== null && (p.name.next.name ?? null) !== (p.snapshot.name ?? null))
const touches = (p: VersionPlan) => hasChanges(p) || snapshotChanged(p)

/** Lo que se escribe en una versión: su tarjeta con sus cambios, el nombre y el snapshot. */
function dataOf(version: Version, p: VersionPlan) {
  const stored = Object.fromEntries(
    Object.entries(version.card ?? {}).map(([field, value]) => [field, valueOf(value) ?? value]),
  )
  const name = p.name?.changes.name
  return {
    card: { ...stored, ...p.card.changes },
    ...(typeof name === 'string' && { name }),
    importSnapshot: {
      ...p.snapshot,
      card: p.card.next,
      ...(p.name && { name: p.name.next.name ?? p.snapshot.name }),
    },
  }
}

const SELECT = { name: true, card: true, importSnapshot: true, _status: true } as const

export async function loadChecklistCards(
  payload: Payload,
  options: LoadChecklistCardsOptions,
): Promise<LoadChecklistCardsReport> {
  const log = options.log ?? (() => {})
  const report: LoadChecklistCardsReport = {
    updated: [],
    unchanged: [],
    missing: [],
    withDraft: [],
    renamed: [],
    kept: [],
    missingArt: [],
    pendingArt: 0,
    teaser: 'skipped',
  }
  const pending = new Set<string>()
  const missingArt = new Set<string>()
  const keep = (slug: string, fields: string[]) => {
    for (const field of fields) {
      if (!report.kept.some((row) => row.slug === slug && row.field === field)) {
        report.kept.push({ slug, field })
      }
    }
  }

  for (const entry of options.entries) {
    const found = await payload.find({
      collection: 'checklists',
      where: { slug: { equals: entry.slug } },
      limit: 1,
      depth: 0,
      draft: true,
      overrideAccess: true,
      showHiddenFields: true,
      select: SELECT,
    })
    const latest = found.docs[0] as (Version & Pick<Checklist, 'id' | '_status'>) | undefined
    if (!latest) {
      report.missing.push(entry.slug)
      log(`${entry.slug}: no está en la base; importa antes las checklists`)
      continue
    }
    // Con un borrador a medias, lo publicado se decide aparte, con lo publicado.
    const publishedVersionId =
      latest._status === 'draft' ? await publishedVersion(payload, latest.id) : null
    const published = publishedVersionId
      ? ((await payload.findByID({
          collection: 'checklists',
          id: latest.id,
          depth: 0,
          draft: false,
          overrideAccess: true,
          showHiddenFields: true,
          select: SELECT,
        })) as Version)
      : null

    const draftPlan = await planVersion(entry, latest, options.art, missingArt)
    const pubPlan = published ? await planVersion(entry, published, options.art, missingArt) : null
    const plans = pubPlan ? [pubPlan, draftPlan] : [draftPlan]
    for (const p of plans) keep(entry.slug, [...p.card.kept, ...(p.name?.kept ?? [])])
    if (!plans.some(touches)) {
      report.unchanged.push(entry.slug)
      continue
    }
    for (const p of plans) await upload(p.card, options.art, pending, options.apply)
    report.updated.push(entry.slug)
    if (plans.some((p) => p.name && 'name' in p.name.changes)) report.renamed.push(entry.slug)
    if (published) report.withDraft.push(entry.slug)
    const fields = new Set(
      plans.flatMap((p) => [...Object.keys(p.card.changes), ...Object.keys(p.name?.changes ?? {})]),
    )
    log(
      `${entry.slug}: ${options.apply ? 'tarjeta actualizada' : 'se actualizaría la tarjeta'} ` +
        `(${[...fields].join(', ') || 'importSnapshot'})` +
        (published ? '; lo publicado y su borrador, cada uno con lo suyo' : ''),
    )
    if (!options.apply) continue

    if (!published || !pubPlan) {
      await payload.update({
        collection: 'checklists',
        id: latest.id,
        data: { ...dataOf(latest, draftPlan), _status: latest._status ?? 'published' } as never,
        draft: latest._status === 'draft',
        depth: 0,
        overrideAccess: true,
      })
    } else if (!touches(pubPlan)) {
      // Solo cambia el borrador: se guarda encima de él, sin tocar lo publicado.
      await payload.update({
        collection: 'checklists',
        id: latest.id,
        data: dataOf(latest, draftPlan) as never,
        draft: true,
        depth: 0,
        overrideAccess: true,
      })
    } else {
      await writeAroundDraft(
        payload,
        latest.id,
        publishedVersionId!,
        dataOf(published, pubPlan),
        dataOf(latest, draftPlan),
      )
    }
  }

  if (options.teaser) {
    const index = (await payload.findGlobal({
      slug: 'checklists-index',
      depth: 0,
      overrideAccess: true,
      showHiddenFields: true,
    })) as ChecklistsIndex
    const snapshot = (index.importSnapshot ?? {}) as Snapshot
    const teaser = await plan(
      { scene: { art: options.teaser.scene }, egg: { art: options.teaser.egg } },
      (index.teaser ?? {}) as Record<string, unknown>,
      snapshot.teaser,
      options.art,
      missingArt,
    )
    keep('checklists-index', teaser.kept)
    if (!Object.keys(teaser.changes).length && same(teaser.next, snapshot.teaser)) {
      report.teaser = 'unchanged'
    } else {
      await upload(teaser, options.art, pending, options.apply)
      report.teaser = 'updated'
      log(
        `checklists-index: ${options.apply ? 'tarjeta «???» actualizada' : 'se actualizaría la tarjeta «???»'} ` +
          `(${Object.keys(teaser.changes).join(', ') || 'importSnapshot'})`,
      )
      if (options.apply) {
        await payload.updateGlobal({
          slug: 'checklists-index',
          data: { teaser: teaser.changes, importSnapshot: { ...snapshot, teaser: teaser.next } },
          depth: 0,
          overrideAccess: true,
        })
      }
    }
  }

  report.pendingArt = pending.size
  report.missingArt = [...missingArt]
  return report
}

/** La última versión publicada de la checklist (su ID de versión), o null si nunca se publicó. */
async function publishedVersion(payload: Payload, id: number): Promise<string | number | null> {
  const { docs } = await payload.findVersions({
    collection: 'checklists',
    where: { parent: { equals: id }, 'version._status': { equals: 'published' } },
    sort: '-updatedAt',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return docs[0]?.id ?? null
}

/**
 * Lo publicado con sus cambios y el borrador a medias con los suyos, que queda el último y sin
 * publicar. Payload publica lo último guardado: primero vuelve lo publicado y se publica; luego
 * se guarda otra vez el borrador, entero. (restoreVersion con draft escribe el borrador también
 * en la tabla de lo publicado: no sirve para esto.)
 */
async function writeAroundDraft(
  payload: Payload,
  id: number,
  publishedVersionId: string | number,
  publishedData: Record<string, unknown>,
  draftData: Record<string, unknown>,
) {
  const latest = await payload.findVersions({
    collection: 'checklists',
    where: { parent: { equals: id } },
    sort: '-updatedAt',
    limit: 1,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
  })
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    _status: _draftStatus,
    ...draft
  } = latest.docs[0]!.version as unknown as Record<string, unknown>
  await payload.restoreVersion({
    collection: 'checklists',
    id: String(publishedVersionId),
    depth: 0,
    overrideAccess: true,
  })
  await payload.update({
    collection: 'checklists',
    id,
    data: { ...publishedData, _status: 'published' } as never,
    depth: 0,
    overrideAccess: true,
  })
  await payload.update({
    collection: 'checklists',
    id,
    data: { ...draft, ...draftData } as never,
    draft: true,
    depth: 0,
    overrideAccess: true,
  })
}
