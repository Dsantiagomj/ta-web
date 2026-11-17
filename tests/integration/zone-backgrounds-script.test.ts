import sharp from 'sharp'
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { refreshSubAreas } from '@/lib/dofusdb/refresh-subareas'
import { fillMissingZoneBackgrounds, zoneBackgroundReport } from '@/lib/zones/backfill'
import { zoneRenderKey } from '@/lib/zones/background'
import type { ZoneSource } from '@/lib/zones/fill'

import { startPayload, tinyPng } from './payload'

// `pnpm zones:backgrounds`: las subzonas de las guías y los logros publicados que aún no
// tienen fondo. En seco solo las lista; con apply las rellena; repetirlo no hace nada.
// DofusDB va simulado.

const BASE = 994_000
const GUIDED = BASE + 1 // subzona de una guía publicada
const ACHIEVED = BASE + 2 // subzona de la primera misión de un logro publicado
const DRAFT = BASE + 3 // solo la usa un borrador
const OWN = BASE + 4 // la guía que la usa lleva su propio fondo

let payload: Payload
const renders: number[] = []

const source: ZoneSource = {
  maps: async (subArea) => [{ id: subArea * 10, outdoor: true, worldMap: 1, posX: 0, posY: 0 }],
  render: async (mapId) => {
    renders.push(mapId)
    return sharp({
      create: { width: 400, height: 200, channels: 3, background: { r: 30, g: 90, b: 140 } },
    })
      .jpeg()
      .toBuffer()
  },
}

async function cleanup() {
  await payload.delete({ collection: 'quest-guides', where: { slug: { like: 'fondos-script' } } })
  await payload.delete({
    collection: 'achievement-pages',
    where: { slug: { like: 'fondos-script' } },
  })
  await payload.delete({ collection: 'quests', where: { dofusId: { greater_than: BASE } } })
  await payload.update({
    collection: 'subareas',
    where: { dofusId: { greater_than: BASE } },
    data: { background: null, backgroundMapId: null },
  })
  await payload.delete({ collection: 'media', where: { alt: { like: 'fondos-script' } } })
  await payload.delete({
    collection: 'media',
    where: {
      gameAsset: { in: [GUIDED, ACHIEVED, DRAFT, OWN].map((id) => zoneRenderKey(id * 10)) },
    },
  })
}

const quest = (dofusId: number, subAreaId: number) =>
  payload.create({
    collection: 'quests',
    data: {
      dofusId,
      name: `Misión ${dofusId}`,
      startPositions: [{ npcId: 1, mapId: subAreaId * 10, subAreaId }],
    },
  })

beforeAll(async () => {
  payload = await startPayload()
  await refreshSubAreas(payload, {
    subAreas: [GUIDED, ACHIEVED, DRAFT, OWN].map((id) => ({
      id,
      name: { es: `Zona ${id}` },
      areaId: null,
    })),
    areas: [],
  })
  await cleanup()

  const guided = await quest(BASE + 11, GUIDED)
  const achieved = await quest(BASE + 12, ACHIEVED)
  const drafted = await quest(BASE + 13, DRAFT)
  const owned = await quest(BASE + 14, OWN)
  const own = await payload.create({
    collection: 'media',
    data: { alt: 'fondos-script: fondo propio' },
    file: tinyPng(),
  })

  await payload.create({
    collection: 'quest-guides',
    data: {
      title: 'Guía publicada',
      slug: 'fondos-script-1',
      quest: guided.id,
      _status: 'published',
    },
  })
  await payload.create({
    collection: 'quest-guides',
    data: { title: 'Borrador', slug: 'fondos-script-2', quest: drafted.id, _status: 'draft' },
  })
  await payload.create({
    collection: 'quest-guides',
    data: {
      title: 'Con fondo propio',
      slug: 'fondos-script-3',
      quest: owned.id,
      background: own.id,
      _status: 'published',
    },
  })
  await payload.create({
    collection: 'achievement-pages',
    data: {
      name: 'Logro publicado',
      slug: 'fondos-script-4',
      state: 'published',
      quests: [{ quests: [achieved.id] }],
      _status: 'published',
    },
  })
})

afterAll(async () => {
  await cleanup()
  await payload.destroy()
})

const ours = (rows: { dofusId: number }[]) =>
  rows.filter((row) => row.dofusId > BASE).map((row) => row.dofusId)

describe('fillMissingZoneBackgrounds', () => {
  it('en seco lista las subzonas de lo publicado sin fondo y no trae nada', async () => {
    const result = await fillMissingZoneBackgrounds(payload, { apply: false, source })

    expect(ours(result.pending)).toEqual([GUIDED, ACHIEVED])
    expect(result.pending.find((row) => row.dofusId === GUIDED)?.pages).toEqual(['fondos-script-1'])
    expect(renders).toEqual([])
    expect(zoneBackgroundReport(result, false).at(-1)).toMatch(/--apply/)
  })

  it('con apply las rellena', async () => {
    const result = await fillMissingZoneBackgrounds(payload, { apply: true, source })

    expect(ours(result.filled)).toEqual([GUIDED, ACHIEVED])
    expect(result.failed).toEqual([])
    const { docs } = await payload.find({
      collection: 'subareas',
      where: { dofusId: { in: [GUIDED, ACHIEVED, DRAFT, OWN] } },
      sort: 'dofusId',
      depth: 0,
    })
    expect(docs.map((doc) => doc.backgroundMapId ?? null)).toEqual([
      GUIDED * 10,
      ACHIEVED * 10,
      null,
      null,
    ])
  })

  it('repetirlo no hace nada', async () => {
    const before = renders.length
    const result = await fillMissingZoneBackgrounds(payload, { apply: true, source })

    expect(ours(result.pending)).toEqual([])
    expect(ours(result.filled)).toEqual([])
    expect(renders.length).toBe(before)
  })
})
