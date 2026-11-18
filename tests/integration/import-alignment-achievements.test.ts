import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { TorreAchievementLink } from '../../scripts/import/achievements/alignment'
import { loadAlignmentPages } from '../../scripts/import/achievements/load-alignment'

import { startPayload } from './payload'

// Las páginas de los logros de Alineamiento, que DofusDB da sin misiones: se crean con el
// slug de Torre, «En preparación», y lo demás lo rellena DofusDB. Nunca se toca una que ya
// existe, ni un slug que ya usa otra página.

const CATEGORY = 990_043
const ACHIEVEMENTS = [990_203, 990_204, 990_213, 990_394, 990_395]

let payload: Payload
let groupId: number
const ids = new Map<number, number>()

const link = (name: string, slug: string): TorreAchievementLink => ({ name, slug, note: '' })

const links = [
  link('En guardia', 'alin-prueba-en-guardia'),
  link('De cabo acabo', 'alin-prueba-de-cabo-acabo'),
  link('¡A sus órdenes!', 'alin-prueba-logro-a-sus-ordenes'),
  // Su slug ya es de una guía: no se crea, se avisa.
  link('Poner orden', 'alin-prueba-ocupado'),
  // Torre la tiene y DofusDB no.
  link('Logro inventado', 'alin-prueba-inventado'),
]

const load = (apply: boolean) =>
  loadAlignmentPages(payload, { links, apply, categoryDofusId: CATEGORY })

async function cleanUp() {
  await payload.delete({
    collection: 'achievement-pages',
    where: { slug: { like: 'alin-prueba' } },
  })
  await payload.delete({
    collection: 'achievement-pages',
    where: { name: { like: 'Prueba alin' } },
  })
  await payload.delete({ collection: 'quest-guides', where: { slug: { like: 'alin-prueba' } } })
  await payload.delete({
    collection: 'achievement-groups',
    where: { slug: { like: 'alin-prueba' } },
  })
  await payload.delete({ collection: 'achievements', where: { dofusId: { in: ACHIEVEMENTS } } })
  await payload.delete({
    collection: 'achievement-categories',
    where: { dofusId: { equals: CATEGORY } },
  })
}

const pages = async () =>
  (
    await payload.find({
      collection: 'achievement-pages',
      where: { achievement: { in: [...ids.values()] } },
      sort: 'slug',
      depth: 0,
      draft: true,
      pagination: false,
    })
  ).docs

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  const category = await payload.create({
    collection: 'achievement-categories',
    data: { dofusId: CATEGORY, name: 'Alineamiento de prueba' },
  })
  groupId = (
    await payload.create({
      collection: 'achievement-groups',
      data: {
        category: category.id,
        name: 'Alineamiento de prueba',
        slug: 'metalogro-alin-prueba',
        state: 'published',
        _status: 'published',
      } as never,
    })
  ).id
  const names = ['En guardia', 'De cabo acabo', '¡A sus órdenes!', 'Poner orden', 'Orden del día']
  for (const [index, name] of names.entries()) {
    const doc = await payload.create({
      collection: 'achievements',
      data: {
        dofusId: ACHIEVEMENTS[index]!,
        name,
        category: category.id,
        points: 10,
        order: index,
        description: `Alcanzar algo ${index}.`,
        objectives: [{ name: `Alineamiento ${index}` }],
        rewards: { experience: 1_000 * (index + 1), kamas: 100 },
      },
    })
    ids.set(ACHIEVEMENTS[index]!, doc.id)
  }
  // «De cabo acabo» ya tiene página, con otro slug y publicada: es de Torre.
  await payload.create({
    collection: 'achievement-pages',
    data: {
      achievement: ids.get(990_204)!,
      name: 'De cabo acabo',
      slug: 'alin-prueba-de-cabo',
      state: 'published',
      _status: 'published',
    },
  })
  await payload.create({
    collection: 'quest-guides',
    data: { title: 'Prueba alin ocupado', slug: 'alin-prueba-ocupado', _status: 'published' },
  })
})

afterAll(async () => {
  await cleanUp()
  await payload.destroy()
})

describe('loadAlignmentPages', () => {
  it('en seco dice lo que haría y no escribe nada', async () => {
    const report = await load(false)
    expect(report.category).toBe('Alineamiento de prueba')
    expect(report.achievements.map((row) => row.name)).toEqual([
      'En guardia',
      'De cabo acabo',
      '¡A sus órdenes!',
      'Poner orden',
      'Orden del día',
    ])
    expect(report.created).toEqual([
      { name: 'En guardia', slug: 'alin-prueba-en-guardia' },
      { name: '¡A sus órdenes!', slug: 'alin-prueba-logro-a-sus-ordenes' },
    ])
    expect(report.existing).toEqual([
      {
        name: 'De cabo acabo',
        slug: 'alin-prueba-de-cabo',
        torreSlug: 'alin-prueba-de-cabo-acabo',
      },
    ])
    expect(report.taken).toEqual([{ name: 'Poner orden', slug: 'alin-prueba-ocupado' }])
    expect(report.withoutTorrePage.map((row) => row.name)).toEqual(['Orden del día'])
    expect(report.withoutAchievement.map((row) => row.slug)).toEqual(['alin-prueba-inventado'])
    expect((await pages()).map((page) => page.slug)).toEqual(['alin-prueba-de-cabo'])
  })

  it('con apply crea las que faltan, En preparación, con el slug de Torre y lo de DofusDB', async () => {
    const report = await load(true)
    expect(report.created.map((row) => row.slug)).toEqual([
      'alin-prueba-en-guardia',
      'alin-prueba-logro-a-sus-ordenes',
    ])
    const created = (await pages()).find((page) => page.slug === 'alin-prueba-logro-a-sus-ordenes')
    expect(created).toMatchObject({
      achievement: ids.get(990_213),
      name: '¡A sus órdenes!',
      state: 'preparing',
      _status: 'published',
      group: groupId,
      order: 2,
      points: 10,
      rewards: { experience: 3_000, kamas: 100 },
    })
    expect(created!.quests ?? []).toEqual([])
    // La que ya existía sigue como Torre la dejó.
    expect((await pages()).find((page) => page.slug === 'alin-prueba-de-cabo')).toMatchObject({
      state: 'published',
    })
  })

  it('una segunda pasada no crea nada', async () => {
    const report = await load(true)
    expect(report.created).toEqual([])
    expect(report.existing.map((row) => row.slug)).toEqual([
      'alin-prueba-en-guardia',
      'alin-prueba-de-cabo',
      'alin-prueba-logro-a-sus-ordenes',
    ])
    expect(await pages()).toHaveLength(3)
  })

  it('sin la categoría guardada (falta el refresco), no crea nada y lo dice', async () => {
    const report = await loadAlignmentPages(payload, {
      links,
      apply: true,
      categoryDofusId: 990_999,
    })
    expect(report.category).toBeNull()
    expect(report.created).toEqual([])
    expect(report.withoutAchievement).toHaveLength(links.length)
  })
})
