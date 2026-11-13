import type { Payload } from 'payload'
import { describe, expect, it } from 'vitest'

import { readQuestGraph } from '@/lib/checklists/queries'

// Lo que el progreso necesita de las misiones de una checklist y de las que estas piden, hasta
// el final de la cadena, con pocas consultas: una cadena larga no puede costar una consulta por
// nivel.

type Doc = { id: number; dofusId: number; prerequisites: number[]; stages?: unknown[] }

function fakePayload(docs: Doc[]) {
  const calls: unknown[] = []
  const payload = {
    find: async ({ where }: { where?: { id?: { in: number[] } } }) => {
      calls.push(where)
      const wanted = where?.id?.in
      return { docs: wanted ? docs.filter((doc) => wanted.includes(doc.id)) : docs }
    },
  } as unknown as Payload
  return { payload, calls }
}

describe('readQuestGraph', () => {
  // La 12 pide la 11, que pide la 10… hasta la 1: once niveles fuera de la checklist
  const docs: Doc[] = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    dofusId: 1000 + i + 1,
    prerequisites: i ? [i] : [],
  }))

  it('sigue la cadena entera con dos consultas como mucho', async () => {
    const { payload, calls } = fakePayload(docs)
    const graph = await readQuestGraph(payload, [12])
    expect(calls.length).toBeLessThanOrEqual(2)
    expect(graph[12].prerequisites).toEqual([1011])
    expect(graph[1].prerequisites).toEqual([])
    expect(Object.keys(graph)).toHaveLength(12)
  })

  it('sin nada que pedir fuera de la checklist, una sola consulta', async () => {
    const { payload, calls } = fakePayload(docs)
    await readQuestGraph(payload, [1])
    expect(calls).toHaveLength(1)
  })
})
