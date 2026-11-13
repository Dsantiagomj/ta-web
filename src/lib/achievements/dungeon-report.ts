// Lo que imprime `pnpm data:quests` de las notas de mazmorra de «Necesitarás en total»:
// cuáles se casan con una mazmorra de DofusDB, y así llevan su jefe, y cuáles se quedan con
// el icono genérico. Lee las guías publicadas, como la página.
import type { Payload } from 'payload'

import { matchDungeon } from './dungeons'
import { isDungeonNote, noteLabels } from './page'

export interface DungeonNoteReport {
  matched: { label: string; dungeon: string }[]
  unmatched: string[]
}

export async function dungeonNoteReport(payload: Payload): Promise<DungeonNoteReport> {
  const guides = await payload.find({
    collection: 'quest-guides',
    where: { _status: { equals: 'published' } },
    select: { summary: { needs: { notes: true } } },
    depth: 0,
    pagination: false,
    draft: false,
    overrideAccess: true,
  })
  const labels = noteLabels(
    guides.docs.map((doc) => ({ needs: { notes: doc.summary?.needs?.notes ?? null } })),
  ).filter(isDungeonNote)
  // Una nota que es el nombre exacto de un objeto («Llave de la mazmorra…») va con los objetos.
  const items = labels.length
    ? (
        await payload.find({
          collection: 'items',
          where: { name: { in: labels } },
          select: { name: true },
          depth: 0,
          pagination: false,
          overrideAccess: true,
        })
      ).docs
    : []
  const itemNames = new Set(items.map((item) => item.name))
  const dungeons = (
    await payload.find({
      collection: 'dungeons',
      select: { name: true, bosses: true },
      populate: { monsters: { name: true } },
      depth: 1,
      pagination: false,
      overrideAccess: true,
    })
  ).docs.map((doc) => ({
    name: doc.name,
    bosses: (doc.bosses ?? []).flatMap((boss) =>
      typeof boss === 'object' && boss.name ? [boss.name] : [],
    ),
  }))
  const report: DungeonNoteReport = { matched: [], unmatched: [] }
  for (const label of labels) {
    if (itemNames.has(label)) continue
    const dungeon = matchDungeon(label, dungeons)
    if (dungeon) report.matched.push({ label, dungeon: dungeon.name })
    else report.unmatched.push(label)
  }
  return report
}
