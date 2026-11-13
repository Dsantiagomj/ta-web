import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  fetchRelationTitle,
  relationId,
  segmentRowLabel,
  stepRowLabel,
  textRowLabel,
} from '@/lib/admin/row-labels'
import { pageAddress, rowLabelText, truncateLabel } from '@/lib/admin/strings'
import { metalogroHref } from '@/lib/achievements/page'

// Las etiquetas de las filas del panel: con 40 pasos, Torre encuentra «el de Ganymede» por
// su texto, no por «Paso 17».

describe('rowLabelText', () => {
  it('numera desde 1 la fila que Payload cuenta desde 0', () => {
    expect(rowLabelText('Paso', 0)).toBe('Paso 1')
    expect(rowLabelText('Paso', 16)).toBe('Paso 17')
  })

  it('añade el texto de la fila tras dos puntos, en una sola línea', () => {
    expect(rowLabelText('Paso', 2, 'Habla con\n  Ganymede')).toBe('Paso 3: Habla con Ganymede')
  })

  it('sin texto, o solo con espacios, queda el número', () => {
    expect(rowLabelText('Misión', 0, '   ')).toBe('Misión 1')
    expect(rowLabelText('Misión', undefined)).toBe('Misión 1')
  })
})

describe('truncateLabel', () => {
  it('deja entero un texto corto', () => {
    expect(truncateLabel('Habla con Ganymede')).toBe('Habla con Ganymede')
  })

  it('corta un texto largo en una palabra y añade «…», sin pasar de 60 caracteres', () => {
    const long =
      'Ve a Astrub y habla con Ganymede, que te pide tres plumas de jalató real para empezar'
    const label = truncateLabel(long)
    expect(label.length).toBeLessThanOrEqual(60)
    expect(label.endsWith('…')).toBe(true)
    expect(long.startsWith(label.slice(0, -1))).toBe(true)
    expect(label).not.toMatch(/\s…$/)
  })
})

describe('pageAddress', () => {
  it('enseña la dirección completa con el dominio de la web', () => {
    expect(pageAddress('aprendizaje-escudero')).toBe('torrentearcano.com/aprendizaje-escudero')
  })

  it('un metalogro no tiene página: se abre en su panel del índice', () => {
    expect(pageAddress('metalogro-astrub', 'metalogro')).toBe(
      `torrentearcano.com${metalogroHref('metalogro-astrub')}`,
    )
  })

  it('sin dirección no enseña nada', () => {
    expect(pageAddress('')).toBeNull()
    expect(pageAddress(null)).toBeNull()
    expect(pageAddress(undefined)).toBeNull()
  })
})

describe('stepRowLabel', () => {
  it('un paso se llama por el texto de su primer tramo', () => {
    expect(
      stepRowLabel({ segments: [{ kind: 'plain', text: 'Habla con Ganymede en Astrub.' }] }, 4),
    ).toBe('Paso 5: Habla con Ganymede en Astrub.')
  })

  it('salta los tramos vacíos', () => {
    expect(stepRowLabel({ segments: [{ text: '' }, { text: 'Sube a la torre.' }] }, 0)).toBe(
      'Paso 1: Sube a la torre.',
    )
  })

  it('sin texto, por su zona; sin zona, solo el número', () => {
    expect(stepRowLabel({ segments: [], zone: 'Anutropía' }, 1)).toBe('Paso 2: Anutropía')
    expect(stepRowLabel({}, 1)).toBe('Paso 2')
    expect(stepRowLabel(undefined, 1)).toBe('Paso 2')
  })
})

describe('segmentRowLabel', () => {
  it('un tramo normal se llama por su texto', () => {
    expect(segmentRowLabel({ kind: 'plain', text: 'Ve al zaap.' }, 0)).toBe('Tramo 1: Ve al zaap.')
  })

  it('un tramo especial dice su tipo', () => {
    expect(segmentRowLabel({ kind: 'stop', text: 'Para tras la pelea.' }, 1)).toBe(
      'Tramo 2 (Detente aquí): Para tras la pelea.',
    )
    expect(segmentRowLabel({ kind: 'resolve', text: '' }, 2)).toBe('Tramo 3 (Aquí se resuelve)')
  })
})

describe('textRowLabel', () => {
  it('usa el campo de texto que se le pide', () => {
    expect(textRowLabel('Grupo', 'name')({ name: 'Recursos' }, 0)).toBe('Grupo 1: Recursos')
    expect(textRowLabel('Grupo', 'title')({ name: 'Recursos' }, 0)).toBe('Grupo 1')
  })

  it('ignora lo que no es texto', () => {
    expect(textRowLabel('Fila', 'text')({ text: { root: {} } }, 0)).toBe('Fila 1')
  })
})

describe('relationId', () => {
  it('lee el id de una relación como la guarda el formulario', () => {
    expect(relationId(1976)).toBe(1976)
    expect(relationId('1976')).toBe(1976)
    expect(relationId({ id: 12 })).toBe(12)
    expect(relationId({ relationTo: 'quests', value: 7 })).toBe(7)
    expect(relationId([5, 6])).toBe(5)
  })

  it('sin relación devuelve null', () => {
    expect(relationId(null)).toBeNull()
    expect(relationId(undefined)).toBeNull()
    expect(relationId('')).toBeNull()
    expect(relationId([])).toBeNull()
  })
})

describe('fetchRelationTitle', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('pide solo el nombre del documento y lo devuelve', async () => {
    const fetchMock = vi.fn(async () => Response.json({ id: 1976, name: 'Seis pies bajo tierra' }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchRelationTitle('/api', 'quests', 1976)).resolves.toBe('Seis pies bajo tierra')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/quests/1976?depth=0&select[name]=true',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('pide cada documento una sola vez mientras la página siga abierta', async () => {
    const fetchMock = vi.fn(async () => Response.json({ name: 'Plumas de jalató' }))
    vi.stubGlobal('fetch', fetchMock)
    await fetchRelationTitle('/api', 'items', 31)
    await fetchRelationTitle('/api', 'items', 31)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('si falla devuelve null y la próxima vez lo vuelve a intentar', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 500 }))
      .mockResolvedValueOnce(Response.json({ name: 'Ganymede' }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchRelationTitle('/api', 'npcs', 8)).resolves.toBeNull()
    await expect(fetchRelationTitle('/api', 'npcs', 8)).resolves.toBe('Ganymede')
  })
})
