import type { Payload } from 'payload'
import { describe, expect, it } from 'vitest'

import { MAX_ROW_FAILURES, refreshCatalog, rowGuard } from '@/lib/dofusdb/refresh-quests'

// Una fila que no se puede guardar no tira el refresco entero: se cuenta como fallida y
// las demás siguen. Muchas fallando a la vez es un problema de fondo (la base caída): el
// refresco se para.

type Row = { dofusId: number; name: string }

function fakePayload(failing: Set<number>) {
  const created: number[] = []
  let nextId = 1
  const payload = {
    find: async () => ({ docs: [] }),
    create: async ({ data }: { data: Row }) => {
      if (failing.has(data.dofusId)) throw new Error(`fila ${data.dofusId} no válida`)
      created.push(data.dofusId)
      return { id: nextId++, ...data }
    },
    update: async () => ({}),
  }
  return { payload: payload as unknown as Payload, created }
}

const rows = (count: number): Row[] =>
  Array.from({ length: count }, (_, index) => ({ dofusId: index + 1, name: `Fila ${index + 1}` }))

describe('refreshCatalog con filas que fallan', () => {
  it('cuenta la fila fallida, guarda las demás y dice cuál falló', async () => {
    const { payload, created } = fakePayload(new Set([2]))
    const log: string[] = []

    const { counts, ids } = await refreshCatalog<Row, Row & { id: number }>(
      payload,
      'items',
      rows(3),
      (doc) => ({ dofusId: doc.dofusId, name: doc.name }),
      '2026-11-15T00:00:00.000Z',
      2,
      (message) => log.push(message),
    )

    expect(counts).toEqual({ created: 2, updated: 0, unchanged: 0, failed: 1 })
    expect(created.sort()).toEqual([1, 3])
    expect(ids.has(2)).toBe(false)
    expect(log.join('\n')).toMatch(/Objetos.*2.*fila 2 no válida/)
  })

  it(`se para cuando fallan más de ${MAX_ROW_FAILURES} filas`, async () => {
    const all = rows(MAX_ROW_FAILURES + 5)
    const { payload } = fakePayload(new Set(all.map((row) => row.dofusId)))

    await expect(
      refreshCatalog<Row, Row & { id: number }>(
        payload,
        'items',
        all,
        (doc) => ({ dofusId: doc.dofusId, name: doc.name }),
        '2026-11-15T00:00:00.000Z',
        1,
        () => {},
      ),
    ).rejects.toThrow(/Objetos: más de \d+ filas no se pudieron guardar/)
  })
})

describe('rowGuard', () => {
  it('devuelve el resultado de la escritura o undefined si falla, y lleva la cuenta', async () => {
    const guard = rowGuard('Misiones', () => {})

    expect(await guard.run(1, async () => 'ok')).toBe('ok')
    expect(
      await guard.run(2, async () => {
        throw new Error('no')
      }),
    ).toBeUndefined()
    expect(guard.failed).toBe(1)
  })

  it('solo escribe en el registro los primeros fallos', async () => {
    const log: string[] = []
    const guard = rowGuard('Misiones', (message) => log.push(message))
    for (let id = 1; id <= 10; id += 1) {
      await guard.run(id, async () => {
        throw new Error('no')
      })
    }
    expect(guard.failed).toBe(10)
    expect(log.length).toBeLessThan(10)
  })
})
