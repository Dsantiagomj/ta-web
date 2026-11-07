// Convierte los combates de las guías ya importadas (DESIGN.md, Monster chip and fight block):
// las listas «N x Monstruo» después de «lucha contra» pasan a un bloque Combate, como hace
// ahora el importador. Lo usa scripts/backfill-fights.ts (pnpm guides:fights).
import type { Payload } from 'payload'

import type { QuestGuide } from '../../payload-types'
import { type FetchImage, type GameImageCounts, refreshGameImages } from '../dofusdb/game-images'
import { comparableMonsterName, type FightListBlock, splitFightLists } from './fight-lists'

export interface BackfillFightsOptions {
  /** Sin apply solo cuenta: no escribe nada. */
  apply: boolean
  /** Solo estas guías (pruebas); sin ella, todas. */
  slugs?: string[]
  fetchImage?: FetchImage
  log?: (message: string) => void
}

export interface BackfillFightsResult {
  /** Guías leídas y guías con al menos una lista convertida (o que se convertiría). */
  guides: number
  changed: number
  /** Listas convertidas, que se quedan en texto por un nombre sin casar y sin la forma «N x Nombre». */
  converted: number
  unmatchedLists: number
  skipped: number
  /** Los nombres sin casar, con las veces que aparecen. */
  unmatched: Record<string, number>
  /** Guías guardadas: publicadas (lo último era lo publicado) y borradores (lo último era un borrador). */
  published: number
  drafts: number
  images?: GameImageCounts
}

type FightBlock = { blockType: string; monsters?: { monster: number }[]; body?: FightBlock[] }

function fightMonsterIds(blocks: FightBlock[]): number[] {
  return blocks.flatMap((block) =>
    block.blockType === 'fight'
      ? (block.monsters ?? []).map((row) => row.monster)
      : fightMonsterIds(block.body ?? []),
  )
}

/**
 * Recorre las guías por su última versión. En una guía cuya última versión es la publicada,
 * guarda la conversión publicada; si es un borrador, la guarda como borrador y no publica
 * nada (Torre lo publica cuando revise sus cambios). Con apply, importa también las imágenes
 * de los monstruos enlazados. Repetirlo no cambia nada: las listas convertidas ya no están.
 */
export async function backfillFightLists(
  payload: Payload,
  options: BackfillFightsOptions,
): Promise<BackfillFightsResult> {
  const log = options.log ?? (() => {})
  const result: BackfillFightsResult = {
    guides: 0,
    changed: 0,
    converted: 0,
    unmatchedLists: 0,
    skipped: 0,
    unmatched: {},
    published: 0,
    drafts: 0,
  }

  const monsters = await payload.find({
    collection: 'monsters',
    pagination: false,
    depth: 0,
    sort: 'dofusId',
    select: { name: true },
    overrideAccess: true,
  })
  const monsterByName = new Map<string, number>()
  for (const monster of monsters.docs) {
    const name = comparableMonsterName(monster.name)
    if (!monsterByName.has(name)) monsterByName.set(name, monster.id)
  }
  const lookup = (name: string) => monsterByName.get(comparableMonsterName(name))

  const ids = await payload.find({
    collection: 'quest-guides',
    pagination: false,
    depth: 0,
    draft: true,
    select: { slug: true },
    ...(options.slugs && { where: { slug: { in: options.slugs } } }),
    overrideAccess: true,
  })
  const linked = new Set<number>()

  for (const { id } of ids.docs) {
    // Una a una: con 1 272 guías, todas a la vez con sus cuerpos pesan demasiado.
    const guide: QuestGuide = await payload.findByID({
      collection: 'quest-guides',
      id,
      depth: 0,
      draft: true,
      overrideAccess: true,
    })
    result.guides += 1
    const split = splitFightLists((guide.body ?? []) as FightListBlock[], lookup)
    result.converted += split.converted
    result.unmatchedLists += split.unmatchedLists
    result.skipped += split.skipped
    for (const name of split.unmatched) result.unmatched[name] = (result.unmatched[name] ?? 0) + 1
    if (split.converted === 0) continue
    result.changed += 1
    for (const monster of fightMonsterIds(split.body as FightBlock[])) linked.add(monster)
    if (!options.apply) {
      log(`Guía ${guide.slug}: ${split.converted} combates por convertir`)
      continue
    }
    const published = guide._status === 'published'
    await payload.update({
      collection: 'quest-guides',
      id,
      data: { body: split.body as QuestGuide['body'], _status: published ? 'published' : 'draft' },
      draft: !published,
      depth: 0,
      overrideAccess: true,
    })
    if (published) result.published += 1
    else result.drafts += 1
    log(
      `Guía ${guide.slug}: ${split.converted} combates convertidos${published ? '' : ' (borrador)'}`,
    )
  }

  if (options.apply && linked.size > 0) {
    result.images = await refreshGameImages(payload, {
      monsters: [...linked],
      fetchImage: options.fetchImage,
      log,
    })
  }
  return result
}
