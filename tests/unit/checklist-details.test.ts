import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'

import { checklistDetailsResponse } from '@/endpoints/checklist-details'
import { checklistDetails } from '@/lib/checklists/details'

// Los detalles que la isla carga al abrir la página (GET /api/checklists/<slug>/details):
// quién da cada misión, dónde, y sus objetivos con sus coordenadas.

describe('checklistDetails', () => {
  it('da por cada misión el PNJ y la posición de inicio y sus objetivos aplanados, sin marcas de DofusDB', () => {
    const details = checklistDetails(
      [
        {
          dofusId: 1213,
          startPositions: [{ npcId: 1, npcName: 'Wello', x: -5, y: -5 }],
          stages: [
            {
              dofusId: 1,
              objectives: [{ dofusId: 1, kind: 'npc', text: 'Ve a ver a {npc,1}', x: -5, y: -5 }],
            },
            {
              dofusId: 2,
              objectives: [
                { dofusId: 2, kind: 'fight', text: 'Vence a 1 x Rey Nidas', x: null, y: null },
              ],
            },
          ],
        },
        { dofusId: 1300, startPositions: [], stages: [] },
      ],
      { npc: { 1: 'Wello' }, item: {}, monster: {} },
    )

    expect(details).toEqual({
      q: {
        1213: [
          'Wello',
          -5,
          -5,
          [
            ['npc', 'Ve a ver a Wello', -5, -5],
            ['fight', 'Vence a 1 x Rey Nidas', null, null],
          ],
        ],
        1300: [null, null, null, []],
      },
    })
  })
})

describe('checklistDetailsResponse', () => {
  const details = { q: { 1: [null, 1, 2, []] as [null, number, number, []] } }

  it('es JSON público que el navegador guarda cinco minutos, comprimido si lo acepta', () => {
    const response = checklistDetailsResponse(details, 'gzip, br', false)

    expect(response.headers.get('Content-Type')).toBe('application/json')
    expect(response.headers.get('Cache-Control')).toMatch(/^public, max-age=300\b/)
    expect(response.headers.get('Content-Encoding')).toBe('gzip')
    return response.arrayBuffer().then((body) => {
      expect(JSON.parse(gunzipSync(Buffer.from(body)).toString())).toEqual(details)
    })
  })

  it('sin gzip va sin comprimir', async () => {
    const response = checklistDetailsResponse(details, null, false)

    expect(response.headers.get('Content-Encoding')).toBeNull()
    expect(await response.json()).toEqual(details)
  })

  it('lo que lee un usuario del panel (un borrador) no se guarda en ninguna caché', () => {
    const response = checklistDetailsResponse(details, null, true)

    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  })
})
