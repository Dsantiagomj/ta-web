// Lo que imprimen `pnpm data:quests` y `pnpm data:dungeon-notes` de las filas de mazmorra de
// lo publicado: «Necesitarás en total» de las páginas de logro, Necesitarás de las guías de
// Dofus y la cabecera de las guías de misión. Cuáles llevan el jefe de su mazmorra, cuáles
// el icono genérico, y cómo casó cada nota (dungeon-report-lines.ts lo pone en texto).
// Clasifica por el mismo camino que cada página (achievementNeeds, readNoteItems,
// dungeonNoteLabels, guideDungeonNotes y las mazmorras elegidas a mano que use), así que
// dice exactamente lo que se ve: un jefe sin imagen en Media cuenta como icono genérico.
// Solo lee.
import type { Payload } from 'payload'

import { dungeonNoteLabels, type DofusGuideDoc } from '@/lib/dofus-guides/page'
import { chooseDungeonBosses, type NoteDungeon } from '@/lib/guides/dungeon-bosses'
import type { NoteMatch } from '@/lib/guides/dungeons'
import { guideDungeonNotes, type GuideDoc } from '@/lib/guides/page'

import {
  achievementNeeds,
  dungeonPicks,
  type GuideRef,
  isDungeonNote,
  needKey,
  noteLabels,
  type PageDoc,
} from './page'
import { readNoteItems } from './queries'

export interface DungeonRow {
  /** De qué página es la fila: de logro, guía de Dofus o guía de misión. */
  source: 'achievement' | 'dofus' | 'quest'
  /** El slug de la página: único entre las colecciones que comparten la raíz. */
  page: string
  label: string
  /** Cómo casó la nota: a mano, por nombre, por jefe o nada. */
  match: NoteMatch
}

export interface DungeonNoteReport {
  withBoss: DungeonRow[]
  generic: DungeonRow[]
}

const relationId = (value: number | { id: number } | null | undefined) =>
  value == null ? null : typeof value === 'number' ? value : value.id

export async function dungeonNoteReport(payload: Payload): Promise<DungeonNoteReport> {
  const pages = (
    await payload.find({
      collection: 'achievement-pages',
      where: { state: { equals: 'published' }, _status: { equals: 'published' } },
      // Sin select: con él, Payload no puebla las misiones de dentro del array.
      populate: { quests: { name: true } },
      depth: 1,
      pagination: false,
      draft: false,
      overrideAccess: true,
    })
  ).docs as unknown as (Pick<PageDoc, 'slug' | 'quests'> & { id: number })[]
  const questIds = [
    ...new Set(
      pages.flatMap((page) =>
        (page.quests ?? []).flatMap((row) =>
          (row.quests ?? []).flatMap((q) => relationId(q) ?? []),
        ),
      ),
    ),
  ]
  const guides: GuideRef[] = questIds.length
    ? (
        await payload.find({
          collection: 'quest-guides',
          where: { quest: { in: questIds }, _status: { equals: 'published' } },
          select: { slug: true, quest: true, summary: { needs: true } },
          populate: {
            items: { name: true, superTypeId: true, image: true },
            dungeons: { name: true },
          },
          depth: 2,
          pagination: false,
          draft: false,
          overrideAccess: true,
        })
      ).docs.flatMap((doc) => {
        const questId = relationId(doc.quest as number | { id: number } | null)
        return questId === null
          ? []
          : [{ questId, slug: doc.slug, needs: doc.summary?.needs ?? null }]
      })
    : []
  const labels = noteLabels(guides)
  const noteItems = await readNoteItems(payload, labels, { overrideAccess: true })
  const chosen = await chooseDungeonBosses(payload, labels.filter(isDungeonNote), {
    overrideAccess: true,
    picks: dungeonPicks(guides),
  })
  const dungeonBosses = new Map(
    [...chosen].flatMap(([key, { image }]) => (image ? [[key, image] as const] : [])),
  )

  const report: DungeonNoteReport = { withBoss: [], generic: [] }
  /** Una fila tal como la pinta su página: con jefe solo si su imagen está en Media. */
  const push = (
    source: DungeonRow['source'],
    page: string,
    label: string,
    chosen: Map<string, NoteDungeon>,
  ) => {
    const note = chosen.get(needKey(label))
    const row: DungeonRow = { source, page, label, match: note?.match ?? { how: 'none' } }
    if (note?.image) report.withBoss.push(row)
    else report.generic.push(row)
  }
  for (const page of pages) {
    const { tasks } = achievementNeeds({ page, guides, noteItems, dungeonBosses })
    for (const task of tasks) {
      if (task.kind !== 'dungeon') continue
      const match = chosen.get(needKey(task.label))?.match ?? { how: 'none' }
      const row: DungeonRow = { source: 'achievement', page: page.slug, label: task.label, match }
      if (task.boss) report.withBoss.push(row)
      else report.generic.push(row)
    }
  }

  // Las guías de Dofus: sus notas de mazmorra casan por nombre o jefe (no tienen elegidas a
  // mano), como en su página (readDungeonBosses en src/lib/dofus-guides/queries.ts).
  const dofusGuides = (
    await payload.find({
      collection: 'dofus-guides',
      where: { state: { equals: 'published' }, _status: { equals: 'published' } },
      select: { slug: true, needs: true },
      sort: 'slug',
      depth: 0,
      pagination: false,
      draft: false,
      overrideAccess: true,
    })
  ).docs as unknown as (Pick<DofusGuideDoc, 'needs'> & { slug: string })[]
  const dofusChosen = await chooseDungeonBosses(payload, dofusGuides.flatMap(dungeonNoteLabels), {
    overrideAccess: true,
  })
  for (const guide of dofusGuides) {
    for (const label of dungeonNoteLabels(guide)) push('dofus', guide.slug, label, dofusChosen)
  }

  // Las guías de misión: cada cabecera con las mazmorras que eligió esa guía. Las que no
  // eligieron ninguna casan juntas, en una sola lectura; las demás, cada una con las suyas.
  const questGuides = (
    await payload.find({
      collection: 'quest-guides',
      where: { _status: { equals: 'published' } },
      select: { slug: true, summary: { needs: true } },
      sort: 'slug',
      depth: 0,
      pagination: false,
      draft: false,
      overrideAccess: true,
    })
  ).docs as unknown as (Pick<GuideDoc, 'summary'> & {
    slug: string
    summary?: { needs?: Pick<GuideRef, 'needs'>['needs'] }
  })[]
  const picksOf = (guide: (typeof questGuides)[number]) =>
    dungeonPicks([{ needs: guide.summary?.needs ?? null }])
  const unpicked = questGuides.filter((guide) => picksOf(guide).size === 0)
  const sharedChosen = await chooseDungeonBosses(payload, unpicked.flatMap(guideDungeonNotes), {
    overrideAccess: true,
  })
  for (const guide of questGuides) {
    const picks = picksOf(guide)
    const chosen =
      picks.size === 0
        ? sharedChosen
        : await chooseDungeonBosses(payload, guideDungeonNotes(guide), {
            overrideAccess: true,
            picks,
          })
    for (const label of guideDungeonNotes(guide)) push('quest', guide.slug, label, chosen)
  }
  return report
}
