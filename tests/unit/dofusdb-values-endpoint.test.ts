import { describe, expect, it, vi } from 'vitest'

import { dofusDbValuesResponse } from '@/endpoints/dofusdb-values'

const values = { name: 'Astrub', order: 13, section: 'zones', npc: null }

describe('GET /api/dofusdb-values/:source/:id', () => {
  it('solo responde a una sesión del panel', async () => {
    const load = vi.fn()
    const response = await dofusDbValuesResponse({ user: null, source: 'group', id: '3', load })
    expect(response.status).toBe(401)
    expect(load).not.toHaveBeenCalled()
  })

  it('rechaza un origen o un ID que no son de una página de logro o un metalogro', async () => {
    const load = vi.fn()
    for (const [source, id] of [
      ['quests', '3'],
      ['group', 'tres'],
      ['group', '-1'],
    ]) {
      const response = await dofusDbValuesResponse({ user: { id: 1 }, source, id, load })
      expect(response.status).toBe(400)
    }
    expect(load).not.toHaveBeenCalled()
  })

  it('devuelve lo que da DofusDB, sin caché', async () => {
    const load = vi.fn().mockResolvedValue(values)
    const response = await dofusDbValuesResponse({
      user: { id: 1 },
      source: 'group',
      id: '3',
      load,
    })
    expect(load).toHaveBeenCalledWith('group', 3)
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual(values)
  })

  it('404 si el dato de DofusDB no existe', async () => {
    const load = vi.fn().mockResolvedValue(null)
    const response = await dofusDbValuesResponse({
      user: { id: 1 },
      source: 'achievement',
      id: '9',
      load,
    })
    expect(response.status).toBe(404)
  })
})
