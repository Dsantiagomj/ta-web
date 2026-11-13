import type { Payload } from 'payload'
import { describe, expect, it } from 'vitest'

import { readChecklistDetails } from '@/lib/checklists/queries'
import { SITE_LOCALE } from '@/lib/site/locale'

// La API de detalles lee los nombres de las subzonas en el idioma del sitio y solo las de las
// misiones donde para algún paso, que son las únicas con ruta en la página.

describe('readChecklistDetails: las subzonas', () => {
  it('solo las de las misiones donde para un paso, en el idioma del sitio', async () => {
    const calls: { collection: string; where?: unknown; locale?: string }[] = []
    const objectives = (subAreaId: number) => [{ dofusId: 1, kind: 'npc', text: 'Ve', subAreaId }]
    const payload = {
      find: async (args: { collection: string; where?: unknown; locale?: string }) => {
        calls.push(args)
        if (args.collection === 'checklists') {
          return {
            docs: [
              {
                id: 1,
                steps: [
                  {
                    segments: [{ kind: 'stop', quest: 10, stopObjective: 0 }],
                    quests: [{ quest: 10 }, { quest: 11 }],
                  },
                ],
              },
            ],
          }
        }
        if (args.collection === 'quests') {
          return {
            docs: [
              { id: 10, dofusId: 100, startPositions: [], stages: [{ objectives: objectives(7) }] },
              { id: 11, dofusId: 110, startPositions: [], stages: [{ objectives: objectives(8) }] },
            ],
          }
        }
        if (args.collection === 'subareas') return { docs: [{ dofusId: 7, name: 'Anutropía' }] }
        return { docs: [] }
      },
    } as unknown as Payload

    const details = await readChecklistDetails(payload, 'checklist-prueba')

    const subareas = calls.filter((call) => call.collection === 'subareas')
    expect(subareas).toHaveLength(1)
    expect(subareas[0].where).toEqual({ dofusId: { in: [7] } })
    expect(subareas[0].locale).toBe(SITE_LOCALE)
    expect(details?.q[100][3][0][4]).toBe('Anutropía')
    expect(details?.q[110][3][0][4]).toBeNull()
  })
})
