// El arte de las tarjetas del índice /checklists: el del hub de silvestre-checklist
// (src/embeds/hub/manifest.js). Sube a Media cada imagen una vez (art.ts, con su clave en
// media.gameAsset) y rellena la tarjeta de cada checklist (su escena, su PNJ y el encuadre) y la
// tarjeta «???» del global checklists-index (su escena y su huevo). El color no se trae: vacío,
// la tarjeta usa el de la guía de su Dofus.
//
// Al repetirla, un campo cambia solo si sigue como lo dejó la última importación: lo que
// escribió cada vez se guarda en importSnapshot (`card` en la checklist, `teaser` en el global),
// así que nunca deshace lo que Torre cambió en el panel.
//
// Una checklist con un borrador a medias (las portadas, que esperan la revisión de Torre)
// recibe la tarjeta en lo publicado, que es lo que enseña el índice, y en su borrador, que sigue
// siendo el último y sin publicar. Payload solo publica lo último guardado, así que se hace en
// tres pasos: se restaura lo publicado, se publica con la tarjeta y se guarda otra vez el
// borrador entero, con la tarjeta.
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
  card: CardArt
}

/** La tarjeta «???» del hub antiguo (SOON en manifest.js). */
export const TEASER_ART = {
  scene: { path: 'zones/krosmoz.jpg', alt: 'El Krosmoz' },
  egg: { path: 'hub/dofus-soon.png', alt: 'Un Dofus por descubrir' },
} satisfies Record<string, ArtRef>

export interface LoadChecklistCardsOptions {
  entries: CardImportEntry[]
  teaser: { scene: ArtRef; egg: ArtRef } | null
  /** Sin él solo cuenta y avisa de lo que haría. */
  apply: boolean
  /** El archivo de Media de una imagen de la checklist antigua; negativo si la subiría. */
  artFor: (art: ArtRef) => Promise<number | null>
  log?: (message: string) => void
}

export interface LoadChecklistCardsReport {
  updated: string[]
  unchanged: string[]
  /** Las checklists del catálogo que todavía no están en la base (pnpm import:checklists). */
  missing: string[]
  /** Las que tenían un borrador a medias: la tarjeta fue a lo publicado y al borrador. */
  withDraft: string[]
  /** Campos que Torre cambió en el panel y la importación respetó. */
  kept: { slug: string; field: string }[]
  /** Imágenes que no están en la copia de silvestre-checklist. */
  missingArt: string[]
  /** Imágenes que se subirían (en seco). */
  pendingArt: number
  teaser: 'updated' | 'unchanged' | 'skipped'
}

const CARD_FIELDS = ['scene', 'npc', 'npcHeight', 'npcRight', 'npcTop'] as const
const TEASER_FIELDS = ['scene', 'egg'] as const

type Values = Record<string, number | null>
type Snapshot = Record<string, unknown> & { card?: Values; teaser?: Values }

const idOf = (value: unknown): number | null =>
  typeof value === 'number'
    ? value
    : value && typeof value === 'object' && 'id' in value && typeof value.id === 'number'
      ? value.id
      : null

const valueOf = (value: unknown): number | null => (typeof value === 'number' ? value : idOf(value))

/**
 * Lo que cambia: cada campo que no está como lo importado y que sigue como lo dejó la última
 * importación (o que nunca se importó). Lo que Torre cambió va a `kept`.
 */
function diff(
  fields: readonly string[],
  stored: Record<string, unknown>,
  imported: Values,
  snapshot: Values | undefined,
) {
  const changes: Values = {}
  const kept: string[] = []
  const next: Values = { ...snapshot }
  for (const field of fields) {
    if (!(field in imported)) continue
    const current = valueOf(stored[field])
    const wanted = imported[field]
    if (current === wanted) {
      next[field] = wanted
      continue
    }
    if (snapshot && field in snapshot && current !== snapshot[field]) {
      kept.push(field)
      continue
    }
    changes[field] = wanted
    next[field] = wanted
  }
  return { changes, kept, next }
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? {}) === JSON.stringify(b ?? {})

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
    kept: [],
    missingArt: [],
    pendingArt: 0,
    teaser: 'skipped',
  }
  const pending = new Set<string>()
  const art = async (ref: ArtRef | undefined): Promise<number | null> => {
    if (!ref) return null
    const id = await options.artFor(ref)
    if (id === null) report.missingArt.push(ref.path)
    else if (id < 0) pending.add(ref.path)
    return id
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
      select: { card: true, importSnapshot: true, _status: true },
    })
    const current = found.docs[0] as Pick<Checklist, 'id' | 'card' | 'importSnapshot' | '_status'>
    if (!current) {
      report.missing.push(entry.slug)
      log(`${entry.slug}: no está en la base; importa antes las checklists`)
      continue
    }
    const imported: Values = {
      scene: await art(entry.card.scene),
      ...(entry.card.npc && { npc: await art(entry.card.npc) }),
      ...(entry.card.npcFit && {
        npcHeight: entry.card.npcFit.height,
        npcRight: entry.card.npcFit.right,
        npcTop: entry.card.npcFit.top,
      }),
    }
    // Una imagen que no está no borra la que hubiera.
    for (const field of ['scene', 'npc']) if (imported[field] === null) delete imported[field]
    const snapshot = (current.importSnapshot ?? {}) as Snapshot
    const { changes, kept, next } = diff(
      CARD_FIELDS,
      (current.card ?? {}) as Record<string, unknown>,
      imported,
      snapshot.card,
    )
    report.kept.push(...kept.map((field) => ({ slug: entry.slug, field })))
    if (!Object.keys(changes).length && same(next, snapshot.card)) {
      report.unchanged.push(entry.slug)
      continue
    }
    report.updated.push(entry.slug)
    const stored = Object.fromEntries(
      Object.entries(current.card ?? {}).map(([field, value]) => [field, valueOf(value) ?? value]),
    )
    const data = {
      card: { ...stored, ...changes },
      importSnapshot: { ...snapshot, card: next },
    }
    const withDraft = current._status === 'draft' && (await publishedVersion(payload, current.id))
    if (withDraft) report.withDraft.push(entry.slug)
    log(
      `${entry.slug}: ${options.apply ? 'tarjeta actualizada' : 'se actualizaría la tarjeta'} ` +
        `(${Object.keys(changes).join(', ') || 'importSnapshot'})` +
        (withDraft ? ', en lo publicado y en su borrador' : ''),
    )
    if (!options.apply) continue
    if (withDraft) await writeAroundDraft(payload, current.id, withDraft, data)
    else {
      await payload.update({
        collection: 'checklists',
        id: current.id,
        data: { ...data, _status: current._status ?? 'published' } as never,
        draft: current._status === 'draft',
        depth: 0,
        overrideAccess: true,
      })
    }
  }

  if (options.teaser) {
    const index = (await payload.findGlobal({
      slug: 'checklists-index',
      depth: 0,
      overrideAccess: true,
      showHiddenFields: true,
    })) as ChecklistsIndex
    const imported: Values = {
      scene: await art(options.teaser.scene),
      egg: await art(options.teaser.egg),
    }
    for (const field of TEASER_FIELDS) if (imported[field] === null) delete imported[field]
    const snapshot = (index.importSnapshot ?? {}) as Snapshot
    const { changes, kept, next } = diff(
      TEASER_FIELDS,
      (index.teaser ?? {}) as Record<string, unknown>,
      imported,
      snapshot.teaser,
    )
    report.kept.push(...kept.map((field) => ({ slug: 'checklists-index', field })))
    if (!Object.keys(changes).length && same(next, snapshot.teaser)) report.teaser = 'unchanged'
    else {
      report.teaser = 'updated'
      log(
        `checklists-index: ${options.apply ? 'tarjeta «???» actualizada' : 'se actualizaría la tarjeta «???»'} ` +
          `(${Object.keys(changes).join(', ') || 'importSnapshot'})`,
      )
      if (options.apply) {
        await payload.updateGlobal({
          slug: 'checklists-index',
          data: { teaser: changes, importSnapshot: { ...snapshot, teaser: next } },
          depth: 0,
          overrideAccess: true,
        })
      }
    }
  }

  report.pendingArt = pending.size
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
 * La tarjeta en lo publicado y en el borrador a medias, que queda el último y sin publicar.
 * Payload publica lo último guardado: primero vuelve lo publicado y se publica con la tarjeta;
 * luego se guarda otra vez el borrador, entero, con la tarjeta. (restoreVersion con draft
 * escribe el borrador también en la tabla de lo publicado: no sirve para esto.)
 */
async function writeAroundDraft(
  payload: Payload,
  id: number,
  publishedVersionId: string | number,
  data: Record<string, unknown>,
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
    data: { ...data, _status: 'published' } as never,
    depth: 0,
    overrideAccess: true,
  })
  await payload.update({
    collection: 'checklists',
    id,
    data: { ...draft, ...data } as never,
    draft: true,
    depth: 0,
    overrideAccess: true,
  })
}
