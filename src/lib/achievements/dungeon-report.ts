// Lo que imprime `pnpm data:quests` de las filas de mazmorra de «Necesitarás en total»: cuáles
// llevan el jefe de su mazmorra y cuáles el icono genérico. Clasifica por el mismo camino que
// la página (achievementNeeds, readNoteItems, readDungeonBosses), página por página, así que
// dice exactamente lo que se ve: un jefe sin imagen en Media cuenta como icono genérico.
import type { Payload } from 'payload'

import { achievementNeeds, type GuideRef, noteLabels, type PageDoc } from './page'
import { readDungeonBosses, readNoteItems } from './queries'

export interface DungeonRow {
  /** El slug de la página de logro. */
  page: string
  label: string
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
          populate: { items: { name: true, superTypeId: true, image: true } },
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
  const dungeonBosses = await readDungeonBosses(payload, labels, { overrideAccess: true })

  const report: DungeonNoteReport = { withBoss: [], generic: [] }
  for (const page of pages) {
    const { tasks } = achievementNeeds({ page, guides, noteItems, dungeonBosses })
    for (const task of tasks) {
      if (task.kind !== 'dungeon') continue
      const row = { page: page.slug, label: task.label }
      if (task.boss) report.withBoss.push(row)
      else report.generic.push(row)
    }
  }
  return report
}
