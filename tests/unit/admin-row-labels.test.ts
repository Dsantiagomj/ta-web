import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  fetchRelationTitle,
  RELATION_TITLE_TTL_MS,
  relationId,
  relationIds,
  relationRowLabel,
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
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  // Cada prueba usa su propia apiUrl: la caché de nombres es del módulo.
  const docs = (...rows: [number, string][]) =>
    Response.json({ docs: rows.map(([id, name]) => ({ id, name })) })

  it('una sola petición por colección trae los nombres de muchas filas a la vez', async () => {
    const fetchMock = vi.fn(async () =>
      docs([1976, 'Seis pies bajo tierra'], [1977, 'Esto hace aguas'], [12, 'Ganymede']),
    )
    vi.stubGlobal('fetch', fetchMock)
    const titles = await Promise.all([
      fetchRelationTitle('/api-lote', 'quests', 1976),
      fetchRelationTitle('/api-lote', 'quests', 1977),
      fetchRelationTitle('/api-lote', 'quests', 1976),
      fetchRelationTitle('/api-lote', 'quests', 12),
    ])
    expect(titles).toEqual([
      'Seis pies bajo tierra',
      'Esto hace aguas',
      'Seis pies bajo tierra',
      'Ganymede',
    ])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(
      '/api-lote/quests?where[id][in]=1976,1977,12&depth=0&limit=0&pagination=false&select[name]=true',
    )
    expect(init).toMatchObject({ credentials: 'include' })
  })

  it('una colección distinta va en su propia petición', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.includes('/items') ? docs([31, 'Pluma de jalató']) : docs([7, 'El rey y yo']),
    )
    vi.stubGlobal('fetch', fetchMock)
    const [quest, item] = await Promise.all([
      fetchRelationTitle('/api-dos', 'quests', 7),
      fetchRelationTitle('/api-dos', 'items', 31),
    ])
    expect([quest, item]).toEqual(['El rey y yo', 'Pluma de jalató'])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('pide cada documento una sola vez mientras el nombre está fresco', async () => {
    const fetchMock = vi.fn(async () => docs([31, 'Pluma de jalató']))
    vi.stubGlobal('fetch', fetchMock)
    await fetchRelationTitle('/api-cache', 'items', 31)
    await fetchRelationTitle('/api-cache', 'items', 31)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('un nombre caduca al minuto: si Torre lo cambió, la fila lo vuelve a leer', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(docs([31, 'Pluma de jalató']))
      .mockResolvedValueOnce(docs([31, 'Pluma de jalató real']))
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchRelationTitle('/api-ttl', 'items', 31)).resolves.toBe('Pluma de jalató')
    vi.setSystemTime(Date.now() + RELATION_TITLE_TTL_MS + 1)
    await expect(fetchRelationTitle('/api-ttl', 'items', 31)).resolves.toBe('Pluma de jalató real')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('si falla devuelve null y la próxima vez lo vuelve a intentar', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 500 }))
      .mockResolvedValueOnce(docs([8, 'Ganymede']))
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchRelationTitle('/api-fallo', 'npcs', 8)).resolves.toBeNull()
    await expect(fetchRelationTitle('/api-fallo', 'npcs', 8)).resolves.toBe('Ganymede')
  })

  it('un documento que no llega se queda sin nombre, sin tumbar a los demás', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => docs([1, 'Uno'])),
    )
    const [one, missing] = await Promise.all([
      fetchRelationTitle('/api-falta', 'quests', 1),
      fetchRelationTitle('/api-falta', 'quests', 2),
    ])
    expect([one, missing]).toEqual(['Uno', null])
  })

  it('reparte una lista muy larga en varias peticiones, para no pasar del largo de la URL', async () => {
    const fetchMock = vi.fn(async () => docs())
    vi.stubGlobal('fetch', fetchMock)
    const ids = Array.from({ length: 150 }, (_, index) => index + 1)
    await Promise.all(ids.map((id) => fetchRelationTitle('/api-largo', 'quests', id)))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('relationIds y la etiqueta con alternativas', () => {
  it('lee todos los ids de una relación con varias', () => {
    expect(relationIds([5, { id: 6 }, { relationTo: 'quests', value: 7 }])).toEqual([5, 6, 7])
    expect(relationIds(9)).toEqual([9])
    expect(relationIds(null)).toEqual([])
  })

  it('con varias misiones alternativas, dice cuántas más hay', () => {
    expect(relationRowLabel('Misión', 2, 'La forja', 18)).toBe('Misión 3: La forja (o 17 más)')
    expect(relationRowLabel('Misión', 0, 'La forja', 2)).toBe('Misión 1: La forja (o 1 más)')
    expect(relationRowLabel('Misión', 0, 'La forja', 1)).toBe('Misión 1: La forja')
  })

  it('aunque corte un nombre largo, conserva cuántas más hay', () => {
    const label = relationRowLabel('Misión', 0, 'x'.repeat(30) + ' ' + 'y'.repeat(40), 5)
    expect(label.endsWith('… (o 4 más)')).toBe(true)
  })
})
