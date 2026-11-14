// Las filas genéricas de silvestre-checklist: no son una misión, sino cualquiera de varias según
// la persona («Misión de clase», una por alineamiento en «Prólogo invernal», la de agricultor o
// la de alquimista en «Recolección en…»). Su id dice qué objetivo de logro las cuenta
// («alt:<logro>:<objetivo>»; la de clase, el objetivo 5371 de «Un ciudadano modelo», como
// CLASS_QUEST en .build/build_quests_js.py) y sus misiones salen de su criterio en DofusDB.
import type { DofusDbClient } from '@/lib/dofusdb/client'
import type { RawAchievement } from '@/lib/dofusdb/types'

const CLASS_ROW = 'clase'
/** «Un ciudadano modelo» y su objetivo «misión de clase». */
const CLASS_SOURCE = { achievement: 1678, objective: 5371 }
const ALT_ROW = /^alt:(\d+):(\d+)$/
const FINISHED = /Qf=(\d+)/g

/** El objetivo de logro que cuenta una fila genérica, o null si es una misión normal. */
export function genericSource(id: string): { achievement: number; objective: number } | null {
  if (id === CLASS_ROW) return CLASS_SOURCE
  const match = id.match(ALT_ROW)
  return match ? { achievement: Number(match[1]), objective: Number(match[2]) } : null
}

/** Las misiones de cada fila genérica, por su id antiguo; la que DofusDB no da no sale. */
export async function genericAlternatives(
  client: Pick<DofusDbClient, 'fetchByIds'>,
  ids: string[],
): Promise<Record<string, number[]>> {
  const sources = ids.flatMap((id) => {
    const source = genericSource(id)
    return source ? [{ id, ...source }] : []
  })
  if (sources.length === 0) return {}
  const achievements = await client.fetchByIds<RawAchievement>(
    'achievements',
    sources.map((source) => source.achievement),
  )
  const byId = new Map(achievements.map((row) => [row.id, row]))
  return Object.fromEntries(
    sources.flatMap(({ id, achievement, objective }) => {
      const found = byId
        .get(achievement)
        ?.objectives?.find((candidate) => candidate?.id === objective)
      const quests = [...(found?.criterion ?? '').matchAll(FINISHED)].map((m) => Number(m[1]))
      return quests.length > 0 ? [[id, quests]] : []
    }),
  )
}
