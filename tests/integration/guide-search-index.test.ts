import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { readSearchIndex } from '@/lib/search/read-index'

import { startPayload } from './payload'

// El índice de la búsqueda de la cabecera: lo que un visitante anónimo puede leer, nada más.
// La base es compartida con otras pruebas, así que se buscan los slugs propios.
describe('el índice de búsqueda de las guías', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await startPayload()
  })

  const quest = (dofusId: number, extra: Record<string, unknown> = {}) =>
    payload.create({
      collection: 'quests',
      data: { dofusId, name: `Misión ${dofusId}`, ...extra },
    })

  const bySlug = async () => {
    const { guides } = await readSearchIndex(payload)
    return new Map(guides.map((row) => [row[1], row]))
  }

  it('lleva las guías publicadas con su logro y su nivel', async () => {
    const q = await quest(970001, {
      levelMin: 42,
      achievement: { dofusId: 870001, name: 'Logro del índice' },
    })
    await payload.create({
      collection: 'quest-guides',
      data: {
        title: 'Índice publicada',
        slug: 'indice-publicada',
        quest: q.id,
        _status: 'published',
      },
    })
    await payload.create({
      collection: 'quest-guides',
      data: { title: 'Índice sin misión', slug: 'indice-sin-mision', _status: 'published' },
    })

    const rows = await bySlug()
    expect(rows.get('indice-publicada')).toEqual([
      'Índice publicada',
      'indice-publicada',
      'Logro del índice',
      42,
    ])
    expect(rows.get('indice-sin-mision')).toEqual([
      'Índice sin misión',
      'indice-sin-mision',
      null,
      null,
    ])
  })

  it('nunca lleva un borrador ni una guía despublicada', async () => {
    const q = await quest(970002)
    await payload.create({
      collection: 'quest-guides',
      data: { title: 'Índice borrador', slug: 'indice-borrador', quest: q.id, _status: 'draft' },
      draft: true,
    })
    const unpublished = await payload.create({
      collection: 'quest-guides',
      data: { title: 'Índice despublicada', slug: 'indice-despublicada', _status: 'published' },
    })
    await payload.update({
      collection: 'quest-guides',
      id: unpublished.id,
      data: { _status: 'draft' },
    })

    const rows = await bySlug()
    expect(rows.has('indice-borrador')).toBe(false)
    expect(rows.has('indice-despublicada')).toBe(false)
  })

  it('de una guía publicada con cambios sin publicar, lleva lo publicado', async () => {
    const guide = await payload.create({
      collection: 'quest-guides',
      data: { title: 'Índice título publicado', slug: 'indice-cambios', _status: 'published' },
    })
    await payload.update({
      collection: 'quest-guides',
      id: guide.id,
      data: { title: 'Índice título en borrador' },
      draft: true,
    })

    const rows = await bySlug()
    expect(rows.get('indice-cambios')?.[0]).toBe('Índice título publicado')
  })

  it('cada guía sale una vez, ordenadas por título', async () => {
    const { guides } = await readSearchIndex(payload)
    const slugs = guides.map((row) => row[1])
    expect(new Set(slugs).size).toBe(slugs.length)
    const titles = guides.map((row) => row[0])
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b, 'es')))
  })
})
